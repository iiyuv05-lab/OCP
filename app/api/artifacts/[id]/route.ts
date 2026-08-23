import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { apiError, requireWorkspaceMembership, workspaceRoles, WORKSPACE_ID } from "../../_lib";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    await requireWorkspaceMembership(db, request, workspaceRoles);
    const { id } = await context.params;
    const rows = await db.prepare("SELECT object_key, original_filename, status FROM artifacts WHERE id = ? AND workspace_id = ? LIMIT 1").bind(id, WORKSPACE_ID).all<{ object_key: string | null; original_filename: string | null; status: string }>();
    const artifact = rows.results[0];
    if (!artifact?.object_key || artifact.status !== "ready") return Response.json({ error: "Artifact not found" }, { status: 404 });
    const object = await env.RAW_ARTIFACTS.get(artifact.object_key);
    if (!object) return Response.json({ error: "Artifact bytes unavailable" }, { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "private, no-store");
    headers.set("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(artifact.original_filename ?? "artifact")}`);
    return new Response(object.body, { headers });
  } catch (error) { return apiError(error); }
}
