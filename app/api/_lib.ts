export const WORKSPACE_ID = "workspace-nexus";
export const CURRENT_MODEL_ID = "model-current";
export const REFERENCE_MODEL_ID = "model-reference";

export type AuthenticatedWriter = { subject: string; email: string; name: string };
export const workspaceRoles = ["viewer", "writer", "reviewer", "admin"] as const;
export type WorkspaceRole = (typeof workspaceRoles)[number];
export type WorkspaceMembership = { actorEntityId: string | null; role: WorkspaceRole };

export class ApiAccessError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message);
  }
}

export function authenticatedWriter(request: Request): AuthenticatedWriter | null {
  const subject = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");
  if (!subject || !email) return null;
  const encoded = request.headers.get("oai-authenticated-user-full-name");
  let name = email;
  if (encoded) {
    try { name = decodeURIComponent(encoded); } catch { name = email; }
  }
  return { subject, email, name };
}

export async function findWorkspaceMembership(
  db: D1Database,
  subject: string,
): Promise<WorkspaceMembership | null> {
  const rows = await db
    .prepare("SELECT actor_entity_id, role FROM workspace_members WHERE workspace_id = ? AND auth_subject = ? LIMIT 1")
    .bind(WORKSPACE_ID, subject)
    .all<{ actor_entity_id: string | null; role: string }>();
  const row = rows.results[0];
  if (!row || !workspaceRoles.includes(row.role as WorkspaceRole)) return null;
  return { actorEntityId: row.actor_entity_id, role: row.role as WorkspaceRole };
}

export async function requireWorkspaceMembership(
  db: D1Database,
  request: Request,
  allowedRoles: readonly WorkspaceRole[],
): Promise<{ writer: AuthenticatedWriter; membership: WorkspaceMembership }> {
  const writer = authenticatedWriter(request);
  if (!writer) throw new ApiAccessError(401, "Authenticated workspace member required");
  const membership = await findWorkspaceMembership(db, writer.subject);
  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new ApiAccessError(403, "Workspace membership does not permit this action");
  }
  return { writer, membership };
}

async function participantActorId(subject: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(subject));
  const token = [...new Uint8Array(digest)].slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `actor-participant-${token}`;
}

/**
 * Explicit self-enrolment is intentionally limited to the writer role. It is
 * suitable for recording observations, but cannot approve or apply gated
 * model changes.
 */
export async function joinWorkspaceAsWriter(
  db: D1Database,
  request: Request,
): Promise<{ writer: AuthenticatedWriter; membership: WorkspaceMembership; joined: boolean }> {
  const writer = authenticatedWriter(request);
  if (!writer) throw new ApiAccessError(401, "Sign in to join this workspace");

  const existing = await findWorkspaceMembership(db, writer.subject);
  if (existing) return { writer, membership: existing, joined: false };

  const actorEntityId = await participantActorId(writer.subject);
  const recordedAt = Date.now();
  const displayName = writer.name.slice(0, 160) || "Workspace participant";
  const identityKey = `chatgpt:${writer.subject}`;
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO entities (id,workspace_id,entity_type,identity_key,canonical_name,normalized_name,summary,metadata_json,created_at_ms) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(actorEntityId, WORKSPACE_ID, "actor", identityKey, displayName, displayName.toLocaleLowerCase(), "Workspace participant. Authorization is maintained separately from the semantic graph.", JSON.stringify({ identityProvider: "chatgpt" }), recordedAt),
    db.prepare("INSERT OR IGNORE INTO workspace_members (workspace_id,auth_subject,actor_entity_id,role,created_at_ms) VALUES (?,?,?,?,?)")
      .bind(WORKSPACE_ID, writer.subject, actorEntityId, "writer", recordedAt),
  ]);

  const membership = await findWorkspaceMembership(db, writer.subject);
  if (!membership) throw new Error("The workspace did not confirm the new membership");
  return { writer, membership, joined: membership.role === "writer" };
}

export function apiError(error: unknown) {
  if (error instanceof ApiAccessError) return Response.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : "Unexpected error";
  const unavailable = /binding|no such table|D1/i.test(message);
  return Response.json({ error: unavailable ? "Canonical storage is not ready yet." : message }, { status: unavailable ? 503 : 500 });
}

export function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
