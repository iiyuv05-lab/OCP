import { getDb } from "../../../../db";
import { apiError, WORKSPACE_ID } from "../../_lib";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    const { id } = await context.params;
    const proposalRows = await db.prepare("SELECT * FROM patch_proposals WHERE id = ? AND workspace_id = ? LIMIT 1").bind(id, WORKSPACE_ID).all();
    const proposal = proposalRows.results[0];
    if (!proposal) return Response.json({ error: "Patch proposal not found" }, { status: 404 });
    const [operations, checks, reviews, revisionRows] = await db.batch([
      db.prepare("SELECT * FROM patch_operations WHERE proposal_id = ? ORDER BY ordinal").bind(id),
      db.prepare("SELECT * FROM proposal_checks WHERE proposal_id = ? ORDER BY recorded_at_ms, id").bind(id),
      db.prepare("SELECT * FROM proposal_reviews WHERE proposal_id = ? ORDER BY recorded_at_ms, id").bind(id),
      db.prepare("SELECT id, recorded_at_ms FROM revisions WHERE source_proposal_id = ? ORDER BY recorded_at_ms DESC LIMIT 1").bind(id),
    ]);
    return Response.json({ proposal: { ...proposal, operations: operations.results, checks: checks.results, reviews: reviews.results, appliedRevision: revisionRows.results[0] ?? null } });
  } catch (error) { return apiError(error); }
}
