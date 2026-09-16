/** Private loopback compatibility host. Does NOT impersonate an OCP cloud session. */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { connectSQLite, fileBucket } from './sqlite-adapter.mjs';
import { initialize, loadGraph, saveGraph, tenantFor } from '../../lib/studio/canonical-store.mjs';
import { execute, digest } from '../../public/ocp-studio/core.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),port=Number(process.env.PORT||8788),origin=`http://127.0.0.1:${port}`;
const statePath=process.env.STUDIO_DATA_DIR||path.join(root,'private/runtime');await mkdir(statePath,{recursive:true});
const db=connectSQLite(path.join(statePath,'canonical.sqlite'));db.sqlite.exec(await readFile(path.join(root,'tests/studio/canonical-baseline.sql'),'utf8'));db.sqlite.exec(await readFile(path.join(root,'db/migrations/studio-v8.sql'),'utf8'));
const bucket=fileBucket(path.join(statePath,'BU-Vault')),actor={id:'local-owner',role:'admin'},workspace=await tenantFor(actor.id);await initialize(db,workspace,actor);
let session=randomBytes(32).toString('hex');
function authorized(req){return(req.headers.cookie||'').split(';').map(s=>s.trim()).includes(`studio_local=${session}`);}
function json(res,value,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>2000000)throw Object.assign(Error('요청 크기 초과'),{status:413});}return JSON.parse(text||'{}');}
async function snapshot(){const graph=await loadGraph(db,workspace);const clean=structuredClone(graph);for(const n of clean.nodes)if(n.body&&n.body.length>500){n.bodyOmitted=true;delete n.body;}return{graph:clean,actor,mode:'local',label:'로컬 Canonical DB + BU 파일 · 운영 서버 미연결'};}
async function apply(command,context={}){const before=await loadGraph(db,workspace),result=await execute(before,command,{actor,...context});const saved=await saveGraph(db,bucket,workspace,before,result);return{...saved,...await snapshot()};}
async function seed(){const before=await loadGraph(db,workspace);if(before.revision)return;let graph;try{graph=JSON.parse(await readFile(path.join(root,'private/source-graph.json'),'utf8'));}catch{return;}
 await apply({id:'seed-source-snapshot-v8',expectedRevision:before.revision,type:'import',payload:{graph}});
}
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,origin),pathname=url.pathname;
 if(req.method==='POST' && req.headers.origin && req.headers.origin!==origin) return json(res,{error:'다른 origin의 쓰기를 허용하지 않습니다.'},403);
 if(pathname==='/api/studio/session'&&req.method==='POST') {await seed();res.setHeader('Set-Cookie',`studio_local=${session}; HttpOnly; SameSite=Strict; Path=/`);return json(res,{actor,scope:'loopback-local-only'});}
 if(pathname.startsWith('/api/studio')||pathname.startsWith('/published/')||pathname.startsWith('/private/'))if(!authorized(req))return json(res,{error:'로컬 검증 세션을 먼저 시작하세요.'},401);
 if(pathname==='/api/studio'&&req.method==='GET'){
  if(url.searchParams.has('id')){const g=await loadGraph(db,workspace),node=g.nodes.find(n=>n.id===url.searchParams.get('id'));return node?json(res,{node}):json(res,{error:'Not found'},404);}
  return json(res,await snapshot());
 }
 if(pathname==='/api/studio'&&req.method==='POST'){const command=await body(req);if(command.type==='receipt')return json(res,{error:'서명된 실행기 전용'},403);return json(res,await apply(command));}
 if(pathname==='/api/studio/rep')return json(res,{error:'이 로컬 호스트에는 개인 REP 운영 DB가 연결되어 있지 않습니다. 통합 Plmag 어댑터의 /api/studio/rep를 사용해야 합니다.'},503);
 if(pathname==='/api/studio/local-release'&&req.method==='POST') {
  const input=await body(req),g=await loadGraph(db,workspace),d=g.nodes.find(n=>n.id===input.id);if(!d||d.kind!=='deployment'||d.status!=='queued'||d.channel!=='preview')return json(res,{error:'preview 대기 요청만 로컬에서 검증할 수 있습니다.'},409);
  const code=g.nodes.find(n=>n.id===d.codeId),sha=await digest(code.body);if(sha!==d.sourceSha256)throw Error('빌드 해시 불일치');
  const key=`published/${workspace}/${sha}.html`;await bucket.put(key,code.body);const target=`${origin}/published/${sha}/`;
  const response=await fetch(target,{headers:{cookie:`studio_local=${session}`}}),html=await response.text(),actual=await digest(html);
  if(!response.ok||actual!==sha||!html.includes('id="details"'))throw Error('로컬 게시 검증 실패');
  const evidence={target,status:response.status,expectedSha256:sha,actualSha256:actual,checkedAt:new Date().toISOString(),scope:'private-loopback-http-not-production'};const evidenceSha=await digest(evidence);await bucket.put(`qa/${evidenceSha}.json`,JSON.stringify(evidence,null,2));
  return json(res,await apply({id:'local-receipt-'+randomBytes(10).toString('hex'),expectedRevision:g.revision,type:'receipt',payload:{id:d.id,runId:d.runId,sourceSha256:sha,evidenceSha256:evidenceSha,url:target,outcome:'passed',serverVerified:false}},{verifiedReceipt:true,receiptScope:'local'}));
 }
 if(pathname.startsWith('/published/')){
  const sha=pathname.split('/')[2];if(!/^[a-f0-9]{64}$/.test(sha))return json(res,{error:'Not found'},404);const object=await bucket.get(`published/${workspace}/${sha}.html`);if(!object)return json(res,{error:'Not found'},404);
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private,no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'"});return res.end(await object.text());
 }
 if(['/','/studio','/studio/','/ocp/studio'].includes(pathname)){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(await readFile(path.join(root,'public/ocp-studio/index.html')));}
 const allowed=pathname.startsWith('/ocp-studio/')?path.join(root,'public',pathname):pathname.startsWith('/private/screens/')?path.join(root,pathname):null;
 if(!allowed||!path.resolve(allowed).startsWith(root))return json(res,{error:'Not found'},404);
 const file=await readFile(allowed);const ext=path.extname(allowed),mime={'.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.html':'text/html'}[ext]||'application/octet-stream';res.writeHead(200,{'Content-Type':mime,'X-Content-Type-Options':'nosniff'});res.end(file);
 }catch(e){json(res,{error:e.message,code:e.code||'ERROR'},e.status||500);}});
server.listen(port,'127.0.0.1',()=>console.log(`OCP v8 compatibility host: ${origin}/studio | SQLite + BU files | NOT production`));
