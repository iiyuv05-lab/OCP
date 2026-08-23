import { getDb } from "../../../../../db";
import { apiError, CURRENT_MODEL_ID, id as newId, requireWorkspaceMembership, WORKSPACE_ID } from "../../../_lib";

type SourceLinkCommand = {
  command: "link_implementation_source_v1";
  relationId: string;
  relationSeriesId: string;
  fromEntityId: string;
  predicate: "TRACKS_IMPLEMENTATION_SOURCE";
  toEntityId: string;
  modelId: typeof CURRENT_MODEL_ID;
  assertionKind: "inferred";
  confidenceBp: number;
  confidenceBasis: string;
  canonicalStatus: "candidate_pr_pending_merge";
  evidenceId: string;
  observationId: string;
};

function isSourceLinkCommand(value: unknown): value is SourceLinkCommand {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SourceLinkCommand>;
  return item.command === "link_implementation_source_v1"
    && item.predicate === "TRACKS_IMPLEMENTATION_SOURCE"
    && item.modelId === CURRENT_MODEL_ID
    && item.canonicalStatus === "candidate_pr_pending_merge"
    && typeof item.relationId === "string"
    && typeof item.relationSeriesId === "string"
    && typeof item.fromEntityId === "string"
    && typeof item.toEntityId === "string"
    && typeof item.evidenceId === "string"
    && typeof item.observationId === "string"
    && Number.isInteger(item.confidenceBp)
    && Number(item.confidenceBp) >= 0
    && Number(item.confidenceBp) <= 10000;
}

async function revisionHash(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    const { writer, membership } = await requireWorkspaceMembership(db, request, ["reviewer", "admin"]);
    const { id } = await context.params;
    const proposalRows = await db.prepare("SELECT * FROM patch_proposals WHERE id = ? AND workspace_id = ? LIMIT 1").bind(id, WORKSPACE_ID).all<Record<string, unknown>>();
    const proposal = proposalRows.results[0];
    if (!proposal) return Response.json({ error: "Patch proposal not found" }, { status: 404 });

    if (proposal.status === "applied") {
      const revisionRows = await db.prepare("SELECT id FROM revisions WHERE source_proposal_id = ? ORDER BY recorded_at_ms DESC LIMIT 1").bind(id).all<{ id: string }>();
      return Response.json({ proposalId: id, status: "applied", applied: true, revisionId: revisionRows.results[0]?.id ?? null, duplicate: true });
    }
    if (proposal.status !== "approved") return Response.json({ error: "The proposal must be approved before apply" }, { status: 409 });
    if (proposal.required_gate !== "human") return Response.json({ error: "This command expects a human-gated source proposal" }, { status: 409 });

    const headRows = await db.prepare("SELECT current_revision_id FROM workspaces WHERE id = ? LIMIT 1").bind(WORKSPACE_ID).all<{ current_revision_id: string | null }>();
    const currentRevisionId = headRows.results[0]?.current_revision_id;
    if (!currentRevisionId || currentRevisionId !== proposal.base_revision_id) {
      return Response.json({ error: "The proposal base revision is stale; reclassification is required" }, { status: 409 });
    }

    const operationRows = await db.prepare("SELECT * FROM patch_operations WHERE proposal_id = ? ORDER BY ordinal").bind(id).all<Record<string, unknown>>();
    if (operationRows.results.length !== 1 || operationRows.results[0].operation !== "link" || operationRows.results[0].target_kind !== "relation") {
      return Response.json({ error: "Unsupported patch operation set" }, { status: 422 });
    }
    let command: unknown;
    try { command = JSON.parse(String(operationRows.results[0].after_json)); } catch { return Response.json({ error: "Patch operation payload is invalid" }, { status: 422 }); }
    if (!isSourceLinkCommand(command)) return Response.json({ error: "Patch operation violates the implementation-source contract" }, { status: 422 });

    const recordedAt = Date.now();
    const revisionId = newId("revision");
    const stateId = `state-${revisionId}`;
    const feedId = `feed-${revisionId}`;
    const relationProperties = {
      canonicalStatus: command.canonicalStatus,
      confidenceBasis: command.confidenceBasis,
      approvedBy: writer.email,
      approvalIsNotMerge: true,
    };
    const hash = await revisionHash({ proposalId: id, operation: command, parent: currentRevisionId, recordedAt });
    await db.batch([
      db.prepare("UPDATE patch_proposals SET status = 'applying' WHERE id = ? AND workspace_id = ? AND status = 'approved'").bind(id, WORKSPACE_ID),
      db.prepare("INSERT INTO revisions (id,workspace_id,model_id,parent_revision_id,source_proposal_id,revision_kind,actor_entity_id,title,summary,hash,recorded_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .bind(revisionId, WORKSPACE_ID, CURRENT_MODEL_ID, currentRevisionId, id, "patch", membership.actorEntityId, "PMG implementation source linked", "An approved source-candidate relation was applied. PR merge and main promotion remain separate.", hash, recordedAt),
      db.prepare("INSERT INTO model_entities (id,workspace_id,model_id,entity_id,presence,confidence_bp,context_id,created_revision_id,valid_from_ms,recorded_from_ms) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .bind(`membership-${revisionId}`, WORKSPACE_ID, CURRENT_MODEL_ID, command.toEntityId, "present", command.confidenceBp, "context-ocp", revisionId, recordedAt, recordedAt),
      db.prepare("INSERT INTO relations (id,workspace_id,relation_series_id,model_id,from_entity_id,predicate,to_entity_id,assertion_kind,confidence_bp,context_id,source_event_id,properties_json,created_revision_id,valid_from_ms,recorded_from_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(command.relationId, WORKSPACE_ID, command.relationSeriesId, CURRENT_MODEL_ID, command.fromEntityId, command.predicate, command.toEntityId, command.assertionKind, command.confidenceBp, "context-ocp", command.observationId, JSON.stringify(relationProperties), revisionId, recordedAt, recordedAt),
      db.prepare("INSERT INTO states (id,workspace_id,state_series_id,entity_id,model_id,state_kind,lifecycle_key,health,progress_bp,confidence_bp,headline,properties_json,context_id,source_event_id,created_revision_id,valid_from_ms,recorded_from_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(stateId, WORKSPACE_ID, `state-series-${command.toEntityId}`, command.toEntityId, CURRENT_MODEL_ID, "inferred", "linked_source_candidate", "neutral", null, command.confidenceBp, "Tracked implementation source; PR merge pending", JSON.stringify(relationProperties), "context-ocp", command.observationId, revisionId, recordedAt, recordedAt),
      db.prepare("UPDATE evidence SET status = 'accepted' WHERE id = ? AND workspace_id = ? AND status = 'candidate'").bind(command.evidenceId, WORKSPACE_ID),
      db.prepare("INSERT INTO revision_changes (revision_id,ordinal,object_kind,object_id,change_kind,primary_entity_id,before_json,after_json) VALUES (?,?,?,?,?,?,?,?)")
        .bind(revisionId, 1, "relation", command.relationId, "link", command.fromEntityId, null, JSON.stringify(command)),
      db.prepare("INSERT INTO feed_entries (id,workspace_id,revision_id,change_kind,primary_entity_id,title,summary,actor_entity_id,evidence_count,confidence_bp,recorded_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .bind(feedId, WORKSPACE_ID, revisionId, "relation", command.fromEntityId, "PMG 구현 소스 후보 연결", "OCP PR #1의 검증된 커밋을 구현 소스 후보로 연결했습니다. main 병합은 아직 일어나지 않았습니다.", membership.actorEntityId, 1, command.confidenceBp, recordedAt),
      db.prepare("UPDATE workspaces SET current_revision_id = ? WHERE id = ? AND current_revision_id = ?").bind(revisionId, WORKSPACE_ID, currentRevisionId),
      db.prepare("UPDATE patch_proposals SET status = 'applied', applied_at_ms = ? WHERE id = ? AND workspace_id = ? AND status = 'applying'").bind(recordedAt, id, WORKSPACE_ID),
    ]);

    return Response.json({ proposalId: id, status: "applied", applied: true, revisionId, recordedAt, canonicalStatus: command.canonicalStatus });
  } catch (error) { return apiError(error); }
}
