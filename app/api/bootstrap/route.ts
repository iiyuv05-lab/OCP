import { getDb } from "../../../db";
import { apiError, WORKSPACE_ID } from "../_lib";
import { readOperationalState } from "../_operational-state";

export async function GET() {
  try {
    const db = getDb();
    const [modelRows, specRows, revisionRows, proposalRows] = await db.batch([
      db.prepare("SELECT * FROM models WHERE workspace_id = ? ORDER BY layer").bind(WORKSPACE_ID),
      db.prepare("SELECT * FROM view_specs WHERE workspace_id = ? AND active = 1 ORDER BY id").bind(WORKSPACE_ID),
      db.prepare("SELECT * FROM revisions WHERE workspace_id = ? ORDER BY recorded_at_ms DESC, id DESC LIMIT 1").bind(WORKSPACE_ID),
      db.prepare("SELECT * FROM patch_proposals WHERE workspace_id = ? ORDER BY created_at_ms DESC LIMIT 20").bind(WORKSPACE_ID),
    ]);
    const operationalState = await readOperationalState(db);
    return Response.json({ workspaceId: WORKSPACE_ID, models: modelRows.results, viewSpecs: specRows.results, headRevision: revisionRows.results[0] ?? null, proposals: proposalRows.results, operationalState, serverNow: Date.now() });
  } catch (error) {
    return apiError(error);
  }
}
