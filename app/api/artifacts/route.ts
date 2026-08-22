import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { apiError, id, requireWorkspaceMembership, WORKSPACE_ID } from "../_lib";

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const db = getDb();
    const { writer, membership } = await requireWorkspaceMembership(db, request, ["writer", "reviewer", "admin"]);
    const declaredSize = Number(request.headers.get("content-length") ?? 0);
    if (declaredSize > MAX_BYTES) return Response.json({ error: "Artifact exceeds the 12 MB prototype limit" }, { status: 413 });
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) return Response.json({ error: "Artifact body is empty or too large" }, { status: 400 });
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const artifactId = id("artifact");
    const recordedAt = Date.now();
    const originalFilename = request.headers.get("x-original-filename")?.slice(0, 240) ?? "upload.bin";
    const mediaType = request.headers.get("content-type") ?? "application/octet-stream";
    const objectKey = `${WORKSPACE_ID}/${recordedAt}/${crypto.randomUUID()}`;
    await db.batch([
      db.prepare("INSERT INTO entities (id,workspace_id,entity_type,identity_key,canonical_name,normalized_name,summary,metadata_json,created_at_ms) VALUES (?,?,?,?,?,?,?,?,?)").bind(artifactId, WORKSPACE_ID, "artifact", artifactId, originalFilename, originalFilename.toLocaleLowerCase(), "Immutable raw artifact", JSON.stringify({ uploadedBy: writer.email, uploadedByActorId: membership.actorEntityId }), recordedAt),
      db.prepare("INSERT INTO artifacts (id,workspace_id,artifact_kind,storage_kind,object_key,original_filename,media_type,byte_size,sha256,status,captured_at_ms,recorded_at_ms,immutable,metadata_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(artifactId, WORKSPACE_ID, "raw", "r2", objectKey, originalFilename, mediaType, bytes.byteLength, sha256, "pending", recordedAt, recordedAt, 1, "{}"),
    ]);
    try {
      await env.RAW_ARTIFACTS.put(objectKey, bytes, { httpMetadata: { contentType: mediaType }, customMetadata: { artifactId, sha256, originalFilename } });
      await db.prepare("UPDATE artifacts SET status = 'ready' WHERE id = ?").bind(artifactId).run();
    } catch (storageError) {
      await db.prepare("UPDATE artifacts SET status = 'failed' WHERE id = ?").bind(artifactId).run();
      throw storageError;
    }
    return Response.json({ artifact: { id: artifactId, originalFilename, mediaType, byteSize: bytes.byteLength, sha256, status: "ready" } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
