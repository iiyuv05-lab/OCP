import { studioContext } from "../_context";
import { errorResponse } from "../../../../lib/studio/service.mjs";
export async function POST(request: Request) {
  try {
    await studioContext(request);
    return Response.json(
      {
        error:
          "이 OCP 호스트에는 REP 개인 원본 DB가 연결되지 않았습니다. 같은 Plmag 호스트 어댑터 또는 승인된 서버 브리지를 연결하세요.",
        connected: false,
      },
      { status: 503 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
