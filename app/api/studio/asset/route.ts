import { studioContext } from '../_context';
import { checkOrigin, errorResponse } from '../../../../lib/studio/service.mjs';
import { initialize, loadGraph, saveGraph, tenantFor } from '../../../../lib/studio/canonical-store.mjs';
import { digest, execute, DomainError } from '../../../../public/ocp-studio/core.mjs';

const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
export async function GET(request: Request) {
  try {
    const context = await studioContext(request);
    if (!context.bucket) throw new DomainError('STORAGE', 'BU 저장소가 연결되지 않았습니다.', 503);
    const sha = new URL(request.url).searchParams.get('sha') || '';
    if (!/^[a-f0-9]{64}$/.test(sha)) throw new DomainError('HASH', '유효한 이미지 해시가 필요합니다.');
    const workspace = await tenantFor(context.actor.id);
    const object = await context.bucket.get(`bu-v8/${workspace}/images/${sha}`);
    if (!object) return Response.json({ error: '이미지가 없거나 이 계정에서 접근할 수 없습니다.' }, { status: 404 });
    return new Response(object.body, { headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const context = await studioContext(request);
    if (!context.bucket) throw new DomainError('STORAGE', 'BU 저장소가 연결되지 않았습니다.', 503);
    if (!['reviewer', 'admin'].includes(context.actor.role)) throw new DomainError('ROLE', '검토자 권한이 필요합니다.', 403);
    const mime = request.headers.get('content-type')?.split(';')[0] || '';
    if (!allowed.has(mime)) throw new DomainError('MEDIA', 'PNG, JPEG, WEBP, GIF 이미지만 지원합니다.');
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 2000000) throw new DomainError('SIZE', '이미지는 2MB 이하로 저장하세요.', 413);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    const sha = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
    const workspace = await tenantFor(context.actor.id);
    await initialize(context.db, workspace, context.actor);
    const key = `bu-v8/${workspace}/images/${sha}`;
    const existing = await context.bucket.head(key);
    if (!existing) await context.bucket.put(key, bytes, { httpMetadata: { contentType: mime }, customMetadata: { sha256: sha } });
    const before = await loadGraph(context.db, workspace);
    const id = 'image:' + sha;
    if (!before.nodes.some((n: { id: string }) => n.id === id)) {
      const title = decodeURIComponent(request.headers.get('x-original-filename') || 'Screen image').slice(0, 180);
      const outcome = await execute(before, { id: 'image-import-' + sha, expectedRevision: before.revision, type: 'import', payload: { graph: {
        schema: 'ocp.studio.graph/8', nodes: [{ id, kind: 'file', title, tiers: ['02','05'], representations: ['GUI'], image: 'api/studio/asset?sha=' + sha, source: { system: 'user-supplied-image', sha256: sha, bytes: bytes.byteLength, mime, objectKey: key }, bu: { objectKey: key, state: 'object-stored;drive-pending' } }], edges: [],
      } } }, { actor: context.actor });
      await saveGraph(context.db, context.bucket, workspace, before, outcome);
    }
    return Response.json({ id, sha256: sha, bytes: bytes.byteLength, url: '/api/studio/asset?sha=' + sha, stored: true, driveSynced: false, receiptHash: await digest({ workspace, key, sha }) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
