import { getDb } from "../../../../../db";
import { apiError, authenticatedWriter, id as newId, WORKSPACE_ID } from "../../../_lib";

const decisions = ["approved", "rejected", "evidence", "deferred"] as const;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const writer = authenticatedWriter(request);
    if (!writer) return Response.json({ error: "Authenticated reviewer required" }, { status: 401 });
    const db = getDb();
    const membershipRows = await db.prepare("SELECT actor_entity_id, role FROM workspace_members WHERE workspace_id = ? AND auth_subject = ? LIMIT 1").bind(WORKSPACE_ID, writer.subject).all<{ actor_entity_id: string | null; role: string }>();
    const membership = membershipRows.results[0];
    if (!membership || !["reviewer", "admin"].includes(membership.role)) return Response.json({ error: "Reviewer or admin membership required" }, { status: 403 });
    const payload = await request.json() as { decision?: typeof decisions[number]; note?: string };
    if (!payload.decision || !decisions.includes(payload.decision)) return Response.json({ error: "Invalid decision" }, { status: 400 });
    const { id } = await context.params;
    const proposalRows = await db.prepare("SELECT id FROM patch_proposals WHERE id = ? AND workspace_id = ? LIMIT 1").bind(id, WORKSPACE_ID).all();
    if (!proposalRows.results[0]) return Response.json({ error: "Patch proposal not found" }, { status: 404 });
    const recordedAt = Date.now();
    const reviewDecision = payload.decision === "approved" ? "approve" : payload.decision === "rejected" ? "reject" : payload.decision === "evidence" ? "request_evidence" : "defer";
    const nextStatus = payload.decision === "approved" ? "approved" : payload.decision === "rejected" ? "rejected" : "pending_review";
    await db.batch([
      db.prepare("INSERT INTO proposal_reviews (id,proposal_id,reviewer_entity_id,reviewer_auth_subject,reviewer_kind,decision,note,recorded_at_ms) VALUES (?,?,?,?,?,?,?,?)").bind(newId("review"), id, membership.actor_entity_id, writer.subject, "human", reviewDecision, payload.note ?? "", recordedAt),
      db.prepare("UPDATE patch_proposals SET status = ?, decided_at_ms = ?, decision_note = ? WHERE id = ? AND workspace_id = ?").bind(nextStatus, ["approved", "rejected"].includes(payload.decision) ? recordedAt : null, payload.note ?? payload.decision, id, WORKSPACE_ID),
    ]);
    return Response.json({ proposalId: id, decision: payload.decision, status: nextStatus, applied: false });
  } catch (error) { return apiError(error); }
}
