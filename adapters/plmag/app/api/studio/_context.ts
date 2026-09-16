import { database, files } from '@/db/runtime';
import { createAccounts } from '@/lib/account/core.mjs';
import { canonicalDatabase } from '@/lib/studio/plmag-canonical-db.mjs';
import { DomainError } from '@/public/ocp-studio/core.mjs';
export async function studioContext(request: Request) {
  const originalDB = database();
  const account = await createAccounts(originalDB).session(request.headers);
  if (!account) throw new DomainError('AUTH', '기존 Plmag 계정으로 로그인하세요. 개인 원문은 공개하지 않습니다.', 401);
  // This role is restricted to the account's private studio, not a shared team or other account.
  return {
    db: canonicalDatabase(originalDB),
    bucket: files(),
    actor: { id: 'account:' + account.id, role: 'admin' },
    accountId: account.id,
    mode: 'plmag-native',
  };
}
