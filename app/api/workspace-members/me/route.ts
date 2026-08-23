import { getDb } from "../../../../db";
import {
  apiError,
  authenticatedWriter,
  findWorkspaceMembership,
  joinWorkspaceAsWriter,
} from "../../_lib";

export async function GET(request: Request) {
  try {
    const writer = authenticatedWriter(request);
    if (!writer) return Response.json({ authenticated: false, membership: null });
    const membership = await findWorkspaceMembership(getDb(), writer.subject);
    return Response.json({
      authenticated: true,
      membership: membership && { role: membership.role, actorEntityId: membership.actorEntityId },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = await joinWorkspaceAsWriter(getDb(), request);
    return Response.json({
      authenticated: true,
      joined: result.joined,
      membership: { role: result.membership.role, actorEntityId: result.membership.actorEntityId },
    }, { status: result.joined ? 201 : 200 });
  } catch (error) {
    return apiError(error);
  }
}
