import { env } from 'cloudflare:workers';
import { getDb } from '../../../db';
import { requireWorkspaceMembership, workspaceRoles } from '../_lib';
import { DomainError } from '../../../public/ocp-studio/core.mjs';

type StudioEnvironment = { RAW_ARTIFACTS?: R2Bucket; STUDIO_GATEWAY_SECRET?: string; STUDIO_RECEIPT_SECRET?: string };
export function studioEnvironment(): StudioEnvironment { return env as unknown as StudioEnvironment; }
export async function studioContext(request: Request) {
  const bindings=studioEnvironment();
  // Original header identity is usable only behind a trusted gateway that strips user headers.
  if(!bindings.STUDIO_GATEWAY_SECRET)throw new DomainError('AUTH_CONFIG','인증 게이트웨이 설정이 필요합니다. 개인 데이터 API는 닫혀 있습니다.',503);
  const supplied=request.headers.get('x-ocp-trusted-gateway');
  if(supplied!==bindings.STUDIO_GATEWAY_SECRET)throw new DomainError('AUTH','검증된 게이트웨이를 통해 로그인하세요.',401);
  const db=getDb();
  const {writer,membership}=await requireWorkspaceMembership(db,request,workspaceRoles);
  return {db,bucket:bindings.RAW_ARTIFACTS,actor:{id:writer.subject,role:membership.role},mode:'ocp-native'};
}
