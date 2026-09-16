import { studioContext } from "../_context";
import { errorResponse, readJSON, checkOrigin } from "@/lib/studio/service.mjs";
import { syncREP } from "@/lib/studio/rep-bridge.mjs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const context = await studioContext(request),
      selection = await readJSON(request, 16000);
    return Response.json(await syncREP({ ...context, selection }), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
