import { getDb } from "../../../../db";
import { receiptService } from "../../../../lib/studio/service.mjs";
import { studioEnvironment } from "../_context";
export async function POST(request: Request) {
  const bindings = studioEnvironment();
  return receiptService(request, {
    db: getDb(),
    bucket: bindings.RAW_ARTIFACTS,
    secret: bindings.STUDIO_RECEIPT_SECRET,
  });
}
