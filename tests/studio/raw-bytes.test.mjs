import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyGraph, execute, digest } from '../../public/ocp-studio/core.mjs';

test('REP raw capture preserves leading spaces, CRLF and trailing newlines byte-for-byte', async () => {
  const body = '  기획 원문\r\n디자인과 코드\r\n\n';
  const actor = { id: 'isolated-raw-author', role: 'admin' };
  const payload = {
    title: '원문 무결성',
    body,
    sourceSystem: 'rep-note',
    sourceId: 'note-whitespace',
    sourceVersion: 1,
  };
  const first = await execute(
    emptyGraph(),
    { id: 'exact-first', expectedRevision: 0, type: 'capture', payload },
    { actor },
  );
  assert.equal(first.graph.nodes[0].body, body);
  assert.equal(first.graph.nodes[0].source.sha256, await digest(body));
  const second = await execute(
    first.graph,
    {
      id: 'exact-repeat',
      expectedRevision: first.graph.revision,
      type: 'capture',
      payload,
    },
    { actor },
  );
  assert.equal(second.graph.nodes.length, 1);
  assert.equal(second.result.sourceDuplicate, true);
});
