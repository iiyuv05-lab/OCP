import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyGraph, execute } from '../../public/ocp-studio/core.mjs';
const actor={id:'isolated-owner',role:'admin'};
test('cloud contains original raw IDs and does not promote members',async()=>{
 let result=await execute(emptyGraph(),{id:'capture-cloud01',expectedRevision:0,type:'capture',payload:{title:'Source',body:'  exact\r\n'}},{actor});
 const raw=result.result.id;
 result=await execute(result.graph,{id:'make-cloud001',expectedRevision:1,type:'cloud',payload:{title:'Group',members:[raw]}},{actor});
 assert.equal(result.graph.nodes.find(n=>n.id===raw).status,'classified-first');
 assert.equal(result.graph.edges[0].to,raw);
 assert.equal(result.graph.nodes.some(n=>n.decisionId),false);
});
test('empty or unknown cloud membership fails without mutation',async()=>{
 const before=emptyGraph();
 await assert.rejects(()=>execute(before,{id:'bad-cloud001',expectedRevision:0,type:'cloud',payload:{title:'Bad',members:[]}},{actor}));
 assert.equal(before.revision,0);assert.equal(before.nodes.length,0);
});
