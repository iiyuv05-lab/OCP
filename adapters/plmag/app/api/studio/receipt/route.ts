import { env } from "cloudflare:workers";
import { database, files } from "@/db/runtime";
import { receiptService } from "@/lib/studio/service.mjs";
export async function POST(request: Request) {
  const bindings = env as unknown as { STUDIO_RECEIPT_SECRET?: string };
  return receiptService(request, {
    db: database(),
    bucket: files(),
    secret: bindings.STUDIO_RECEIPT_SECRET,
  });
}
