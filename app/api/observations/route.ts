import { getDb } from "../../../db";
import { apiError, CURRENT_MODEL_ID, id, requireWorkspaceMembership, workspaceRoles, WORKSPACE_ID } from "../_lib";
import { isPmgVerifiedSourceUrl, pmgSourceIds, pmgVerifiedSource } from "../../pmg-source";

const stateKinds = ["observed", "inferred", "planned", "forecast", "hypothetical"] as const;
const methods = { quick: "manual", file: "upload", link: "url", recorder: "recorder", api: "api" } as const;

export async function GET(request: Request) {
  try {
    const db = getDb();
    await requireWorkspaceMembership(db, request, workspaceRoles);
    const rows = await db.prepare("SELECT * FROM observations WHERE workspace_id = ? ORDER BY recorded_at_ms DESC, id DESC LIMIT 50").bind(WORKSPACE_ID).all();
    return Response.json({ observations: rows.results });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const { writer, membership } = await requireWorkspaceMembership(db, request, ["writer", "reviewer", "admin"]);
    const payload = await request.json() as { text?: string; captureMethod?: keyof typeof methods; stateKind?: typeof stateKinds[number]; validFrom?: number; contextId?: string; artifactId?: string; sourceUrl?: string; idempotencyKey?: string };
    const text = payload.text?.trim() ?? "";
    if (!text && !payload.artifactId) return Response.json({ error: "text or artifactId is required" }, { status: 400 });
    const stateKind = payload.stateKind && stateKinds.includes(payload.stateKind) ? payload.stateKind : "observed";
    const recordedAt = Date.now();
    const validFrom = Number.isFinite(payload.validFrom) ? Number(payload.validFrom) : recordedAt;
    const verifiedPmgSource = payload.captureMethod === "link" && payload.sourceUrl && isPmgVerifiedSourceUrl(payload.sourceUrl);
    if (verifiedPmgSource) {
      const existingRows = await db.prepare("SELECT id, status, applied_at_ms FROM patch_proposals WHERE id = ? AND workspace_id = ? LIMIT 1").bind(pmgSourceIds.proposal, WORKSPACE_ID).all<{ id: string; status: string; applied_at_ms: number | null }>();
      const existing = existingRows.results[0];
      if (existing) {
        return Response.json({
          observation: { id: pmgSourceIds.observation, stateKind: "observed", recordedAt },
          artifact: { id: pmgSourceIds.artifact, sourceUrl: pmgVerifiedSource.source.url, immutableReference: true },
          classification: pmgVerifiedSource.classification,
          candidates: 1,
          proposalId: existing.id,
          proposalStatus: existing.status,
          canonicalChanged: existing.status === "applied",
          duplicate: true,
        });
      }

      const headRows = await db.prepare("SELECT current_revision_id FROM workspaces WHERE id = ? LIMIT 1").bind(WORKSPACE_ID).all<{ current_revision_id: string | null }>();
      const baseRevisionId = headRows.results[0]?.current_revision_id ?? "revision-v03-pmg";
      const artifactMetadata = {
        repository: pmgVerifiedSource.source.repository,
        commit: pmgVerifiedSource.source.commit,
        pullRequest: pmgVerifiedSource.source.pull_request,
        pullRequestState: pmgVerifiedSource.source.pull_request_state,
        workflowRunId: pmgVerifiedSource.verification.workflow_run_id,
        workflowResult: pmgVerifiedSource.verification.result,
        evidenceArtifactDigest: pmgVerifiedSource.verification.artifact_digest,
        immutableReference: true,
      };
      const operation = {
        command: "link_implementation_source_v1",
        relationId: pmgSourceIds.relation,
        relationSeriesId: pmgSourceIds.relationSeries,
        fromEntityId: pmgVerifiedSource.scope.entity_id,
        predicate: pmgVerifiedSource.classification.proposed_relation,
        toEntityId: pmgSourceIds.artifact,
        modelId: CURRENT_MODEL_ID,
        assertionKind: "inferred",
        confidenceBp: 10000,
        confidenceBasis: "deterministic_repository_and_scope_match",
        canonicalStatus: pmgVerifiedSource.classification.canonical_status,
        evidenceId: pmgSourceIds.evidence,
        observationId: pmgSourceIds.observation,
      };
      const directText = `GitHub source ${pmgVerifiedSource.source.repository} at commit ${pmgVerifiedSource.source.commit}; Harness Baseline v1 run ${pmgVerifiedSource.verification.workflow_run_id} completed successfully.`;
      await db.batch([
        db.prepare("INSERT INTO entities (id,workspace_id,entity_type,identity_key,canonical_name,normalized_name,summary,metadata_json,created_at_ms) VALUES (?,?,?,?,?,?,?,?,?)")
          .bind(pmgSourceIds.artifact, WORKSPACE_ID, "artifact", `github:${pmgVerifiedSource.source.repository}@${pmgVerifiedSource.source.commit}`, "OCP Harness Baseline v1 source", "ocp harness baseline v1 source", "Content-addressed GitHub implementation-source representation; PR promotion remains pending.", JSON.stringify(artifactMetadata), recordedAt),
        db.prepare("INSERT INTO artifacts (id,workspace_id,artifact_kind,storage_kind,source_url,media_type,status,captured_at_ms,recorded_at_ms,source_actor_entity_id,context_id,immutable,metadata_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
          .bind(pmgSourceIds.artifact, WORKSPACE_ID, "representation", "external_url", pmgVerifiedSource.source.url, "application/vnd.github.commit+json", "ready", recordedAt, recordedAt, membership.actorEntityId, "context-ocp", 1, JSON.stringify(artifactMetadata)),
        db.prepare("INSERT INTO entities (id,workspace_id,entity_type,identity_key,canonical_name,normalized_name,summary,metadata_json,created_at_ms) VALUES (?,?,?,?,?,?,?,?,?)")
          .bind(pmgSourceIds.observation, WORKSPACE_ID, "observation", pmgSourceIds.observation, "Verified GitHub implementation source observed", "verified github implementation source observed", directText, JSON.stringify({ writer: writer.email, sourceId: pmgVerifiedSource.source_id, classification: pmgVerifiedSource.classification }), recordedAt),
        db.prepare("INSERT INTO observations (id,workspace_id,observer_entity_id,context_id,capture_method,direct_text,state_kind,status,confidence_bp,observed_from_ms,recorded_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
          .bind(pmgSourceIds.observation, WORKSPACE_ID, membership.actorEntityId, "context-ocp", "url", directText, "observed", "ready_for_review", 10000, validFrom, recordedAt),
        db.prepare("INSERT INTO observation_artifacts (observation_id,artifact_id,role) VALUES (?,?,?)")
          .bind(pmgSourceIds.observation, pmgSourceIds.artifact, "primary"),
        db.prepare("INSERT INTO revisions (id,workspace_id,model_id,parent_revision_id,revision_kind,actor_entity_id,title,summary,hash,recorded_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?)")
          .bind(pmgSourceIds.ingestRevision, WORKSPACE_ID, "model-observed", baseRevisionId, "ingest", membership.actorEntityId, "PMG implementation source observed", directText, `ingest:${pmgVerifiedSource.source_id}`, recordedAt),
        db.prepare("INSERT INTO entities (id,workspace_id,entity_type,identity_key,canonical_name,normalized_name,summary,metadata_json,created_at_ms) VALUES (?,?,?,?,?,?,?,?,?)")
          .bind(pmgSourceIds.evidence, WORKSPACE_ID, "evidence", pmgSourceIds.evidence, "GitHub commit and successful harness run", "github commit and successful harness run", "Exact source commit, successful workflow run, and artifact digest support the candidate source relation.", JSON.stringify({ sourceId: pmgVerifiedSource.source_id }), recordedAt),
        db.prepare("INSERT INTO evidence (id,workspace_id,evidence_kind,summary,confidence_bp,status,context_id,created_revision_id,valid_from_ms,recorded_from_ms) VALUES (?,?,?,?,?,?,?,?,?,?)")
          .bind(pmgSourceIds.evidence, WORKSPACE_ID, "system", "Exact commit and successful Harness Baseline v1 evidence.", 10000, "candidate", "context-ocp", pmgSourceIds.ingestRevision, validFrom, recordedAt),
        db.prepare("INSERT INTO evidence_observations (evidence_id,observation_id,role) VALUES (?,?,?)")
          .bind(pmgSourceIds.evidence, pmgSourceIds.observation, "supports"),
        db.prepare("INSERT INTO feed_entries (id,workspace_id,revision_id,change_kind,primary_entity_id,title,summary,actor_entity_id,evidence_count,confidence_bp,recorded_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
          .bind("feed-pmg-source-observed-v1", WORKSPACE_ID, pmgSourceIds.ingestRevision, "observation", pmgSourceIds.observation, "PMG 구현 소스 관측", "External source representation stored; Current model unchanged.", membership.actorEntityId, 1, 10000, recordedAt),
        db.prepare("INSERT INTO patch_proposals (id,workspace_id,target_model_id,base_revision_id,title,rationale,status,required_gate,risk_level,created_by_entity_id,context_id,idempotency_key,created_at_ms,submitted_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
          .bind(pmgSourceIds.proposal, WORKSPACE_ID, CURRENT_MODEL_ID, baseRevisionId, "PMG 구현 소스 후보 연결", "Deterministic repository and scope identifiers match Plus Minus G. and OCP. Authority-bearing source linkage remains human-gated; PR #1 is not merged.", "pending_review", "human", "high", membership.actorEntityId, "context-ocp", `source:${pmgVerifiedSource.source_id}`, recordedAt, recordedAt),
        db.prepare("INSERT INTO patch_operations (proposal_id,ordinal,operation,target_kind,target_id,before_json,after_json,gate_level,reversible) VALUES (?,?,?,?,?,?,?,?,?)")
          .bind(pmgSourceIds.proposal, 1, "link", "relation", pmgSourceIds.relation, null, JSON.stringify(operation), "human", 1),
        db.prepare("INSERT INTO proposal_checks (id,proposal_id,checker_role,checker_name,status,result_json,recorded_at_ms) VALUES (?,?,?,?,?,?,?)")
          .bind("check-pmg-source-v1", pmgSourceIds.proposal, "source", "GitHub source verifier", "passed", JSON.stringify({ commit: pmgVerifiedSource.source.commit, workflowRunId: pmgVerifiedSource.verification.workflow_run_id, result: pmgVerifiedSource.verification.result }), recordedAt),
        db.prepare("INSERT INTO proposal_checks (id,proposal_id,checker_role,checker_name,status,result_json,recorded_at_ms) VALUES (?,?,?,?,?,?,?)")
          .bind("check-pmg-schema-v1", pmgSourceIds.proposal, "schema", "Canonical relation validator", "passed", JSON.stringify({ predicate: operation.predicate, targetModel: CURRENT_MODEL_ID, coordinatesPersisted: false }), recordedAt),
        db.prepare("INSERT INTO proposal_checks (id,proposal_id,checker_role,checker_name,status,result_json,recorded_at_ms) VALUES (?,?,?,?,?,?,?)")
          .bind("check-pmg-adversarial-v1", pmgSourceIds.proposal, "adversarial", "Promotion boundary check", "warning", JSON.stringify({ warning: "PR #1 is open and not merged; retain candidate_pr_pending_merge status." }), recordedAt),
      ]);
      return Response.json({
        observation: { id: pmgSourceIds.observation, stateKind: "observed", validFrom, recordedAt },
        artifact: { id: pmgSourceIds.artifact, sourceUrl: pmgVerifiedSource.source.url, immutableReference: true },
        classification: pmgVerifiedSource.classification,
        candidates: 1,
        proposalId: pmgSourceIds.proposal,
        proposalStatus: "pending_review",
        canonicalChanged: false,
      }, { status: 201 });
    }

    const observationId = id("observation");
    const revisionId = id("revision");
    const proposalId = id("patch");
    const idempotencyKey = request.headers.get("idempotency-key") ?? payload.idempotencyKey ?? observationId;
    await db.batch([
      db.prepare("INSERT INTO entities (id,workspace_id,entity_type,identity_key,canonical_name,normalized_name,summary,metadata_json,created_at_ms) VALUES (?,?,?,?,?,?,?,?,?)").bind(observationId, WORKSPACE_ID, "observation", observationId, text.slice(0, 80) || "Uploaded observation", (text.slice(0, 80) || observationId).toLocaleLowerCase(), text, JSON.stringify({ writer: writer.email, artifactId: payload.artifactId ?? null, sourceUrl: payload.sourceUrl ?? null }), recordedAt),
      db.prepare("INSERT INTO observations (id,workspace_id,observer_entity_id,context_id,capture_method,direct_text,state_kind,status,confidence_bp,observed_from_ms,recorded_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(observationId, WORKSPACE_ID, membership.actorEntityId, payload.contextId ?? null, methods[payload.captureMethod ?? "quick"], text, stateKind, "ready_for_review", stateKind === "observed" ? 7000 : 6000, validFrom, recordedAt),
      db.prepare("INSERT INTO revisions (id,workspace_id,model_id,parent_revision_id,revision_kind,actor_entity_id,title,summary,hash,recorded_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(revisionId, WORKSPACE_ID, "model-observed", "revision-r214", "ingest", membership.actorEntityId, "Observation recorded", text.slice(0, 180), `ingest:${observationId}`, recordedAt),
      db.prepare("INSERT INTO feed_entries (id,workspace_id,revision_id,change_kind,primary_entity_id,title,summary,evidence_count,confidence_bp,recorded_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id("feed"), WORKSPACE_ID, revisionId, "observation", observationId, text.slice(0, 80) || "Uploaded observation", "Observation stored; canonical model unchanged.", 0, stateKind === "observed" ? 7000 : 6000, recordedAt),
      db.prepare("INSERT INTO patch_proposals (id,workspace_id,target_model_id,base_revision_id,title,rationale,status,required_gate,risk_level,created_by_entity_id,idempotency_key,created_at_ms,submitted_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(proposalId, WORKSPACE_ID, CURRENT_MODEL_ID, "revision-r214", `Candidates from ${observationId}`, "Candidate graph changes derived from a new observation. No canonical mutation has occurred.", "validating", "verified_auto", "low", membership.actorEntityId, idempotencyKey, recordedAt, recordedAt),
    ]);
    if (payload.artifactId) await db.prepare("INSERT INTO observation_artifacts (observation_id,artifact_id,role) VALUES (?,?,?)").bind(observationId, payload.artifactId, "primary").run();
    return Response.json({ observation: { id: observationId, stateKind, validFrom, recordedAt }, candidates: 2, proposalId, canonicalChanged: false }, { status: 201 });
  } catch (error) { return apiError(error); }
}
