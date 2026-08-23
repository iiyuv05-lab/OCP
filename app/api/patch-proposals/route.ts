import { getDb } from "../../../db";
import type { PatchProposalRow } from "../../../db/schema";
import { apiError, WORKSPACE_ID } from "../_lib";

export async function GET() {
  try {
    const db = getDb();
    const proposalRows = await db.prepare("SELECT * FROM patch_proposals WHERE workspace_id = ? ORDER BY created_at_ms DESC LIMIT 30").bind(WORKSPACE_ID).all<PatchProposalRow>();
    const result = await Promise.all(proposalRows.results.map(async (proposal) => ({
      ...proposal,
      operations: (await db.prepare("SELECT * FROM patch_operations WHERE proposal_id = ? ORDER BY ordinal").bind(proposal.id).all()).results,
      checks: (await db.prepare("SELECT * FROM proposal_checks WHERE proposal_id = ? ORDER BY recorded_at_ms").bind(proposal.id).all()).results,
    })));
    return Response.json({ proposals: result });
  } catch (error) { return apiError(error); }
}
