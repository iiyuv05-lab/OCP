import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyGraph, execute } from '../../public/ocp-studio/core.mjs';
const actor = { id: 'lineage-fixture-owner', role: 'admin' };
let sequence = 0;
async function run(graph, type, payload) {
  return execute(
    graph,
    {
      id: 'lineage-command-' + ++sequence,
      expectedRevision: graph.revision,
      type,
      payload,
    },
    { actor },
  );
}
async function seed() {
  let graph = emptyGraph();
  graph.nodes = ['company', 'brand', 'product'].map((kind) => ({
    id: kind,
    kind,
    title: kind,
    tiers: ['01'],
    representations: ['CUI'],
    status: 'source-snapshot',
    model: 'observed',
    stateKind: 'observed',
  }));
  graph.edges = [
    { id: 'a', from: 'company', to: 'brand', predicate: 'CONTAINS' },
    { id: 'b', from: 'brand', to: 'product', predicate: 'CONTAINS' },
  ];
  const raw = await run(graph, 'capture', {
    title: 'Lineage fixture',
    body: 'One requirement becomes a traceable screen.',
  });
  graph = (
    await run(raw.graph, 'classify', {
      id: raw.result.id,
      tiers: ['01', '05'],
      rationale: 'Reviewed fixture requirement',
    })
  ).graph;
  return { graph, rawId: raw.result.id };
}
async function promote(graph, rawId, parentId, targetKind) {
  const review = await run(graph, 'review', {
    id: rawId,
    parentId,
    targetKind,
    targetTitle: targetKind,
    rationale: 'Explicit hierarchy review',
    acceptance: 'Preserve requirement and parent',
    evidenceIds: [rawId],
    approve: true,
  });
  return run(review.graph, 'apply', { id: review.result.id });
}
test('Root company promotion has no invented parent', async () => {
  const { graph, rawId } = await seed();
  const out = await promote(graph, rawId, null, 'company');
  assert.equal(
    out.graph.nodes.find((n) => n.id === out.result.id).kind,
    'company',
  );
  assert.equal(
    out.graph.edges.some(
      (e) => e.to === out.result.id && e.predicate === 'CONTAINS',
    ),
    false,
  );
});
test('Approved descendant parts bind to design and generated HTML using their original IDs', async () => {
  let { graph, rawId } = await seed();
  let parentId = 'product';
  const parts = [];
  for (const kind of ['page', 'module', 'asset', 'atom']) {
    const out = await promote(graph, rawId, parentId, kind);
    graph = out.graph;
    parentId = out.result.id;
    parts.push(parentId);
  }
  const design = await run(graph, 'design', {
    id: parts[0],
    heading: 'Traceable screen',
    body: 'Approved design',
    cta: 'Details',
    sectionIds: parts.slice(1),
  });
  const code = await run(design.graph, 'code', { id: design.result.id });
  const output = code.graph.nodes.find((n) => n.id === code.result.id);
  for (const id of parts.slice(1))
    assert.ok(output.body.includes('data-entity-id="' + id + '"'));
  await assert.rejects(
    () =>
      run(graph, 'design', {
        id: parts[0],
        heading: 'Bad',
        body: 'Bad',
        cta: 'Bad',
        sectionIds: ['product'],
      }),
    (e) => e.code === 'DESIGN_PARTS',
  );
});
test('A raw REP message can reference work without applying or publishing it', async () => {
  const { graph, rawId } = await seed();
  const work = await promote(graph, rawId, 'product', 'page');
  const out = await run(work.graph, 'relate', {
    from: rawId,
    to: work.result.id,
    predicate: 'ABOUT',
  });
  assert.ok(
    out.graph.edges.some(
      (e) =>
        e.from === rawId && e.to === work.result.id && e.predicate === 'ABOUT',
    ),
  );
  assert.equal(
    out.graph.nodes.find((n) => n.id === work.result.id).status,
    'specified',
  );
});
