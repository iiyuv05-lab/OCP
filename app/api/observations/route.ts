import { getDb } from "../../../db";
import { apiError, CURRENT_MODEL_ID, id, requireWorkspaceMembership, workspaceRoles, WORKSPACE_ID } from "../_lib";

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
