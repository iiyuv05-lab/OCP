/** Native OCP / Plmag route service. Every caller must provide verified server identity. */
import { execute, DomainError } from '../../public/ocp-studio/core.mjs';
import { initialize, loadGraph, saveGraph, tenantFor } from './canonical-store.mjs';
const response = (value,status=200) => Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export function errorResponse(error) {
  const storage = /no such table|binding|D1|R2/i.test(String(error));
  return response({error:storage?'Canonical DB 또는 BU 저장소가 준비되지 않았습니다.':error.message || '요청 실패',code:error.code || 'UNAVAILABLE'},storage?503:error.status || 500);
}
export async function readJSON(request,max=1000000) {
  if (Number(request.headers.get('content-length')) > max) throw new DomainError('SIZE','요청 크기를 줄여 주세요.',413);
  const text=await request.text(); if(text.length>max)throw new DomainError('SIZE','요청 크기를 줄여 주세요.',413);
  try{return JSON.parse(text);}catch{throw new DomainError('JSON','JSON 형식이 아닙니다.');}
}
export function checkOrigin(request) {
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin)throw new DomainError('ORIGIN','다른 사이트의 쓰기 요청을 허용하지 않습니다.',403);
  if(request.headers.get('sec-fetch-site')==='cross-site')throw new DomainError('ORIGIN','동일 출처에서 실행하세요.',403);
}
export async function studioService(request,{db,bucket,actor,mode='native'}) {
  try {
    if(!actor || !['viewer','writer','reviewer','admin'].includes(actor.role))throw new DomainError('AUTH','확인된 계정과 작업공간 권한이 필요합니다.',401);
    if(!bucket)throw new DomainError('BU_STORAGE','BU 불변 저장소가 연결되지 않았습니다.',503);
    const workspace=await tenantFor(actor.id); await initialize(db,workspace,actor);
    const url=new URL(request.url), before=await loadGraph(db,workspace);
    if(request.method==='GET' && url.searchParams.has('id')) {
      const n=before.nodes.find(n=>n.id===url.searchParams.get('id'));
      return n?response({node:n}):response({error:'이 계정에서 해당 항목을 찾을 수 없습니다.'},404);
    }
    let result=null;
    if(request.method==='POST') {
      checkOrigin(request); const command=await readJSON(request);
      if(command.type==='receipt')throw new DomainError('EXECUTOR','서명된 실행기 전용 API를 사용하세요.',403);
      if(command.type==='import' && (command.payload?.graph?.nodes?.length>4 || command.payload?.graph?.edges?.length>8))
        throw new DomainError('IMPORT_CHUNK','원본 가져오기는 4개 객체·8개 관계 단위로 나눠 실행하세요.',413);
      const outcome=await execute(before,command,{actor});
      result=await saveGraph(db,bucket,workspace,before,outcome);
    } else if(request.method!=='GET')return response({error:'Method not allowed'},405);
    const graph=result?await loadGraph(db,workspace):before;
    for(const n of graph.nodes)if(n.body && n.body.length>500){n.bodyOmitted=true;delete n.body;}
    return response({graph,actor,mode,label:'OCP Canonical DB · BU Object 저장 / Drive 동기화 별도',result:result?.result || null,archive:result?.archive || null});
  } catch(error) { return errorResponse(error); }
}
/** No client-supplied role and no arbitrary URL fetching. The original provider authenticates identity. */
export async function receiptService(request,{db,bucket,secret}) {
  try {
    if(!secret)throw new DomainError('EXECUTOR_CONFIG','런칭 빔 서명 키가 연결되지 않았습니다.',503);
    const body=await request.text(); if(body.length>20000)throw new DomainError('SIZE','응답 크기 초과',413);
    const timestamp=request.headers.get('x-studio-timestamp'), signature=request.headers.get('x-studio-signature');
    if(!timestamp || Math.abs(Date.now()-Number(timestamp))>300000 || !/^[a-f0-9]{64}$/.test(signature||''))throw new DomainError('SIGNATURE','유효한 서명 시각이 필요합니다.',401);
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
    const sig=Uint8Array.from(signature.match(/../g),s=>parseInt(s,16));
    if(!await crypto.subtle.verify('HMAC',key,sig,new TextEncoder().encode(timestamp+'.'+body)))throw new DomainError('SIGNATURE','실행기 서명이 맞지 않습니다.',401);
    const p=JSON.parse(body);if(!/^studio-[a-f0-9]{24}$/.test(p.workspace))throw new DomainError('WORKSPACE','작업공간을 확인하세요.');
    const before=await loadGraph(db,p.workspace);
    const outcome=await execute(before,{id:p.commandId,expectedRevision:before.revision,type:'receipt',payload:p.receipt},{actor:{id:'service:launching-beam',role:'admin'},verifiedReceipt:true,receiptScope:'external'});
    const saved=await saveGraph(db,bucket,p.workspace,before,outcome);return response({result:saved.result,archive:saved.archive});
  }catch(error){return errorResponse(error);}
}
