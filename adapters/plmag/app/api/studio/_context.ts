import { database, files } from "@/db/runtime";
import { createAccounts } from "@/lib/account/core.mjs";
import { DomainError } from "@/public/ocp-studio/core.mjs";
export async function studioContext(request: Request) {
  const db = database();
  const account = await createAccounts(db).session(request.headers);
  if (!account)
    throw new DomainError(
      "AUTH",
      "기존 Plmag 계정으로 로그인하세요. 개인 원문은 공개하지 않습니다.",
      401,
    );
  // Admin only within this account's private studio, never workspace-nexus or another account.
  return {
    db,
    bucket: files(),
    actor: { id: "account:" + account.id, role: "admin" },
    accountId: account.id,
    mode: "plmag-native",
  };
}
