import { studioService, errorResponse } from "@/lib/studio/service.mjs";
import { studioContext } from "./_context";
async function handle(request: Request) {
  try {
    return await studioService(request, await studioContext(request));
  } catch (error) {
    return errorResponse(error);
  }
}
export const GET = handle;
export const POST = handle;
