import { HIERARCHY, TIERS, USER_FLOW, BUILDER_FLOW } from './core.mjs';
const kindTier={company:'01',brand:'01',product:'04',page:'05',module:'04',asset:'06',atom:'06',raw:'02',decision:'01',design:'05',code:'04',deployment:'03',endpoint:'03',message:'02',cloud:'02'};
export const flowLabels={'external-marketing':'외부 마케팅','landing':'랜딩 페이지','inflow':'유입 · 진입','published-web':'게시된 웹 · 주소','product-ui':'프로덕트 UI','product-information':'제품 내 정보 · 데이터','feature-execution':'기능 실행','outcome':'사용자 결과','pain-resolution':'Pain Point 해결','pain-point':'Pain Point · KBF','evidence':'조사 · 검증','goal':'Goal · 완료 기준','requirement':'승격된 기획','design':'디자인 데이터','implementation':'구현 코드','build':'검사 · 빌드','deployment':'프로덕트 서버 · 게시'};
const userTiers=['08','07','07','03','05','02','04','01','01'];
export function descendants(g,id,predicate='CONTAINS') {
 const set=new Set([id]), queue=[id];const adj=new Map();for(const e of g.edges)if(e.predicate===predicate){const list=adj.get(e.from)||[];list.push(e.to);adj.set(e.from,list);}
 while(queue.length){const next=queue.shift();for(const child of adj.get(next)||[])if(!set.has(child)){set.add(child);queue.push(child);}}return set;
}
export function breadcrumb(g,id) {
 const byId=new Map(g.nodes.map(n=>[n.id,n]));const out=[],seen=new Set();let current=id;
 while(current&&!seen.has(current)){seen.add(current);const n=byId.get(current);if(n)out.unshift(`${n.kind.toUpperCase()} · ${n.title}`);current=g.edges.find(e=>e.to===current&&e.predicate==='CONTAINS')?.from;}return out;
}
export function sourceRelations(g,id) {return g.edges.filter(e=>e.from===id||e.to===id);}
/** Layout is always derived; semantic graph is not modified by this function. */
export function project(g,opts={}) {
 const view=opts.view||'pipeline', scope=opts.scope||'company:pmg', tier=opts.tier||'', lens=opts.lens||'ALL';
 const scoped=descendants(g,scope), associations=new Set(scoped);
 for(let i=0;i<3;i++)for(const e of g.edges)if(associations.has(e.from)&&['SPECIFIES','DESIGNED_AS','IMPLEMENTS','BUILDS_TO','DEPLOYMENT_REQUEST','PUBLISHED_AT','HAS_REPRESENTATION','APPLIES'].includes(e.predicate))associations.add(e.to);
 let candidates=g.nodes.filter(n=>associations.has(n.id)||['raw','decision','message','cloud'].includes(n.kind));
 const placements=[], lines=[];
 const add=(n,x,y,z=0,extra={})=>placements.push({key:n.id+(extra.keySuffix||''),entityId:n.id,node:n,x,y,z,width:230,height:n.image?185:110,...extra});
 if(view==='journey') {
   const bw=310, centerY=0;
   BUILDER_FLOW.forEach((key,i)=>{
    const kind={requirement:'page',implementation:'code',build:'code'}[key]||key;
    const real=candidates.filter(n=>n.kind===kind).at(-1);
    const n=real||{id:'view:builder:'+key,title:flowLabels[key],kind:'planned-step',status:'근거 미연결',tiers:[['01','02','01','01','05','04','03','03'][i]],representations:i>=4?['CLI']:['CUI'],stateKind:'planned'};
    add(n,-(BUILDER_FLOW.length-i)*bw,centerY-Math.min(i,7-i)*105,0,{keySuffix:':builder',flowKey:key,side:'builder'});
    if(i)lines.push({from:placements[placements.length-2].key,to:placements.at(-1).key,predicate:'BUILD_SEQUENCE',stateKind:'planned'});
   });
   const central={id:'view:core',title:'게시 프로덕트 · BACKEND',kind:'core',status:'서버 검증 상태는 별도',tiers:['03','04'],representations:['CLI','GUI']};add(central,0,0,0,{width:290,height:145});
   lines.push({from:placements.at(-2).key,to:central.id,predicate:'PRODUCES',stateKind:'planned'});
   USER_FLOW.forEach((key,i)=>{
    const kind={'published-web':'endpoint','product-ui':'screen','product-information':'data','feature-execution':'module'}[key];const real=kind?candidates.filter(n=>n.kind===kind).at(-1):null;
    const n=real||{id:'view:user:'+key,title:flowLabels[key],kind:'planned-step',status:'여정 규칙 · 실측 미연결',tiers:[userTiers[i]],representations:['GUI'],stateKind:'planned'};
    add(n,(USER_FLOW.length-i)*bw,centerY+Math.min(i,8-i)*105,0,{keySuffix:':user',flowKey:key,side:'user',flowTitle:flowLabels[key]});
    if(i)lines.push({from:placements[placements.length-2].key,to:placements.at(-1).key,predicate:'USER_VALUE_SEQUENCE',stateKind:'planned'});
   });
   const data={id:'view:db',title:'DB · FILES · EVENT LOG',kind:'data',status:'가치의 종착점이 아닌 관측·학습 회로',tiers:['02'],representations:['CLI']};add(data,0,680,0,{width:330});
   lines.push({from:'view:user:outcome:user',to:data.id,predicate:'OBSERVED_AS',stateKind:'planned'},{from:data.id,to:'view:builder:evidence:builder',predicate:'FEEDS_BACK_TO',stateKind:'planned'});
 } else if(view==='hierarchy'||view==='source') {
   const root=view==='source'?(opts.fileRoot||'source:Plmag'):scope;
   const n=g.nodes.find(x=>x.id===root);if(n)add(n,0,0);
   const children=g.edges.filter(e=>e.from===root&&e.predicate==='CONTAINS').map(e=>g.nodes.find(n=>n.id===e.to)).filter(Boolean);
   children.forEach((n,i)=>{add(n,350, (i-(children.length-1)/2)*145);lines.push({from:root,to:n.id,predicate:'CONTAINS',stateKind:'observed'});});
   if(children.length<9)children.forEach((n,i)=>{
    const next=g.edges.filter(e=>e.from===n.id&&e.predicate==='CONTAINS').slice(0,5).map(e=>g.nodes.find(n=>n.id===e.to)).filter(Boolean);
    next.forEach((a,j)=>{add(a,700,(i-(children.length-1)/2)*Math.max(160,next.length*125)+(j-(next.length-1)/2)*125);lines.push({from:n.id,to:a.id,predicate:'CONTAINS',stateKind:'observed'});});
   });
 } else if(view==='lineage'&&opts.selected) {
   const ids=new Set([opts.selected]);for(let i=0;i<3;i++)for(const e of g.edges)if(ids.has(e.from)||ids.has(e.to)){ids.add(e.from);ids.add(e.to);}
   const list=g.nodes.filter(n=>ids.has(n.id)).slice(0,120);list.forEach((n,i)=>add(n,(i%6)*310,Math.floor(i/6)*165,0));
 } else {
   if(view==='inbox')candidates=g.nodes.filter(n=>['raw','decision','message','cloud'].includes(n.kind));
   candidates=candidates.filter(n=>!['folder','file','element'].includes(n.kind));
   const groups=new Map();
   for(const n of candidates){
    if(lens!=='ALL'&&!n.representations.includes(lens))continue;
    const tiers=n.tiers.length?n.tiers:[kindTier[n.kind]||'02'];
    for(const t of tiers){if(tier&&t!==tier)continue;const arr=groups.get(t)||[];arr.push(n);groups.set(t,arr);}
   }
   for(const [t,list] of groups)list.forEach((n,i)=>{
    const reps=n.representations.length?n.representations:['CUI'];const rep=lens==='ALL'?reps[0]:lens;
    const z=({CUI:-180,CLI:0,GUI:180})[rep]*(opts.gap??1);
    add(n,(i-(list.length-1)/2)*285, -(Number(t)-4.5)*260,z,{keySuffix:`@${t}`,tier:t,secondary:n.tiers.indexOf(t)>0});
   });
 }
 const keys=new Map();for(const p of placements){const arr=keys.get(p.entityId)||[];arr.push(p.key);keys.set(p.entityId,arr);}
 for(const e of g.edges){const a=keys.get(e.from),b=keys.get(e.to);if(a&&b)lines.push({...e,from:a[0],to:b[0]});}
 const existing=new Set(placements.map(p=>p.key));
 return {placements,lines:lines.filter(e=>existing.has(e.from)&&existing.has(e.to)),view,scope,sourceRevision:g.revision};
}
