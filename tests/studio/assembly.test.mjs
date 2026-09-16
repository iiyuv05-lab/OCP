import test from 'node:test';
import assert from 'node:assert/strict';
import { assemble, renderAssembly } from '../../public/ocp-studio/assembly.mjs';
import { escapeHTML } from '../../public/ocp-studio/core.mjs';
test('approved page/module/asset/atom identities survive GUI/CLI assembly; unapproved parts do not', () => {
  const nodes = ['page', 'module', 'asset', 'atom'].map((kind) => ({
    id: kind,
    kind,
    decisionId: 'reviewed-' + kind,
    title: kind + ' <script>',
    requirement: { acceptance: '대상 검증' },
  }));
  const edges = nodes
    .slice(1)
    .map((n, i) => ({ from: nodes[i].id, to: n.id, predicate: 'CONTAINS' }));
  nodes.push({ id: 'unreviewed', kind: 'module', title: 'unreviewed' });
  edges.push({ from: 'page', to: 'unreviewed', predicate: 'CONTAINS' });
  const result = assemble({ nodes, edges }, 'page');
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'module');
  assert.equal(result[0].children[0].children[0].id, 'atom');
  const html = renderAssembly(result, escapeHTML);
  assert.ok(html.includes('data-canonical-id="atom"'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
