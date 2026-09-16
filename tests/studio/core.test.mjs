import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  emptyGraph,
  execute,
  validateGraph,
  USER_FLOW,
  digest,
} from '../../public/ocp-studio/core.mjs';
import { project } from '../../public/ocp-studio/projector.mjs';
import {
  connectSQLite,
  fileBucket,
} from '../../scripts/studio/sqlite-adapter.mjs';
import {
  initialize,
  saveGraph,
  loadGraph,
  tenantFor,
} from '../../lib/studio/canonical-store.mjs';
const admin = { id: 'test-reviewer', role: 'admin' },
  writer = { id: 'test-writer', role: 'writer' };
function seed() {
  const g = emptyGraph();
  const names = ['company', 'brand', 'product'];
  g.nodes = names.map((kind) => ({
    id: kind,
    kind,
    title: kind,
    tiers: ['01'],
    representations: ['CUI'],
    status: 'registered',
    model: 'observed',
    stateKind: 'observed',
  }));
  g.edges = [
    { id: 'a', from: 'company', to: 'brand', predicate: 'CONTAINS' },
    { id: 'b', from: 'brand', to: 'product', predicate: 'CONTAINS' },
  ];
  return g;
}
let id = 0;
const command = (g, type, payload) => ({
  id: 'test-command-' + ++id,
  expectedRevision: g.revision,
  type,
  payload,
});
async function run(g, type, payload, actor = admin, extra = {}) {
  return execute(g, command(g, type, payload), {
    actor,
    now: new Date(1800000000000 + ++id * 1000).toISOString(),
    ...extra,
  });
}
async function raw() {
  let g = seed();
  let out = await run(g, 'capture', {
    title: '검증 기획',
    body: '메모를 구현 대상으로 연결한다.',
  });
  return { g: out.graph, id: out.result.id };
}
async function classified() {
  let { g, id } = await raw();
  g = (
    await run(g, 'classify', {
      id,
      tiers: ['01', '05'],
      rationale: '화면 기획 원문',
    })
  ).graph;
  return { g, id };
}
async function approved() {
  let { g, id } = await classified();
  const out = await run(g, 'review', {
    id,
    rationale: '요구사항 확인',
    acceptance: '저장 후 새로고침해도 동일 ID',
    evidenceIds: [id],
    parentId: 'product',
    targetKind: 'page',
    targetTitle: '연결 화면',
    approve: true,
  });
  return { g: out.graph, id: out.result.id };
}
async function applied() {
  const a = await approved();
  const out = await run(a.g, 'apply', { id: a.id });
  return { g: out.graph, id: out.result.id };
}
async function coded() {
  const a = await applied();
  const d = await run(a.g, 'design', {
    id: a.id,
    heading: '메모를 제품으로',
    body: '원본과 화면을 연결합니다.',
    cta: '설계 확인',
  });
  const c = await run(d.graph, 'code', { id: d.result.id });
  return { g: c.graph, id: c.result.id };
}
test('raw capture remains observed and does not create a current implementation', async () => {
  const { g, id } = await raw();
  assert.equal(g.nodes.find((n) => n.id === id).model, 'observed');
  assert.equal(
    g.nodes.some((n) => n.decisionId),
    false,
  );
  assert.equal(g.nodes.find((n) => n.id === id).status, 'classified-first');
});
test('raw input validation rejects empty body without mutating source graph', async () => {
  const g = seed(),
    original = JSON.stringify(g);
  await assert.rejects(run(g, 'capture', { body: '' }), /원문/);
  assert.equal(JSON.stringify(g), original);
});
test('immutable source version cannot be changed with new command id', async () => {
  let g = seed();
  const p = {
    title: 'A',
    body: 'Original',
    sourceSystem: 'rep-note',
    sourceId: 'note-1',
    sourceVersion: 3,
  };
  g = (await run(g, 'capture', p)).graph;
  await assert.rejects(
    run(g, 'capture', { ...p, body: 'Changed' }),
    (e) => e.code === 'SOURCE_CONFLICT',
  );
});
test('same source id/version/content is not duplicated', async () => {
  let g = seed();
  const p = {
    body: 'Same',
    sourceSystem: 'rep-note',
    sourceId: 'note-1',
    sourceVersion: 3,
  };
  g = (await run(g, 'capture', p)).graph;
  g = (await run(g, 'capture', p)).graph;
  assert.equal(g.nodes.filter((n) => n.kind === 'raw').length, 1);
});
test('writer cannot approve a human gate', async () => {
  const { g, id } = await classified();
  await assert.rejects(
    run(g, 'review', { id }, writer),
    (e) => e.status === 403,
  );
});
test('primary classification is insufficient for promotion', async () => {
  const { g, id } = await raw();
  await assert.rejects(run(g, 'review', { id }), (e) => e.code === 'GATE');
});
test('review requires evidence and acceptance', async () => {
  const { g, id } = await classified();
  await assert.rejects(
    run(g, 'review', { id, rationale: 'x', acceptance: 'x', evidenceIds: [] }),
    (e) => e.code === 'EVIDENCE',
  );
});
test('approved is not applied; separate apply creates specified target', async () => {
  const { g, id } = await approved();
  assert.equal(
    g.nodes.some((n) => n.decisionId),
    false,
  );
  const out = await run(g, 'apply', { id });
  assert.equal(out.graph.nodes.find((n) => n.id === id).status, 'applied');
  assert.equal(
    out.graph.nodes.find((n) => n.id === out.result.id).kind,
    'page',
  );
  assert.equal(
    out.graph.nodes.find((n) => n.id === out.result.id).requirement.acceptance,
    '저장 후 새로고침해도 동일 ID',
  );
});
test('hierarchy does not skip parent ranks', () => {
  const g = seed();
  g.edges[0].to = 'product';
  assert.throws(() => validateGraph(g), /서열/);
});
test('cycles in folder containment are rejected', () => {
  const g = emptyGraph();
  g.nodes = ['a', 'b'].map((id) => ({
    id,
    title: id,
    kind: 'folder',
    tiers: [],
    representations: [],
  }));
  g.edges = [
    { from: 'a', to: 'b', predicate: 'CONTAINS' },
    { from: 'b', to: 'a', predicate: 'CONTAINS' },
  ];
  assert.throws(() => validateGraph(g), /순환/);
});
test('canonical graph never stores render coordinates', () => {
  const g = seed();
  g.nodes[0].x = 10;
  assert.throws(() => validateGraph(g), /좌표/);
});
test('same command retry is idempotent and divergent payload is rejected', async () => {
  const g = seed(),
    cmd = command(g, 'capture', { body: 'hi' }),
    first = await execute(g, cmd, { actor: admin });
  const second = await execute(first.graph, cmd, { actor: admin });
  assert.equal(second.duplicate, true);
  assert.equal(second.graph.events.length, 1);
  await assert.rejects(
    execute(first.graph, { ...cmd, payload: { body: 'no' } }, { actor: admin }),
    (e) => e.code === 'IDEMPOTENCY_CONFLICT',
  );
});
test('stale revisions cannot silently overwrite', async () => {
  const { g } = await raw();
  await assert.rejects(
    execute(
      g,
      {
        id: 'stale-command',
        expectedRevision: 0,
        type: 'capture',
        payload: { body: 'x' },
      },
      { actor: admin },
    ),
    (e) => e.status === 409,
  );
});
test('CUI specifies GUI and CLI implements the same design lineage', async () => {
  const { g, id } = await coded();
  const c = g.nodes.find((n) => n.id === id),
    d = g.nodes.find((n) => n.id === c.designId);
  assert.ok(
    g.edges.some(
      (e) => e.from === d.id && e.to === id && e.predicate === 'IMPLEMENTS',
    ),
  );
  assert.ok(g.edges.some((e) => e.to === d.id && e.predicate === 'SPECIFIES'));
  assert.equal(c.sha256, await digest(c.body));
});
test('design compiler escapes code injection', async () => {
  const { g, id } = await applied();
  let out = await run(g, 'design', {
    id,
    heading: '<script>alert(1)</script>',
    body: '<img onerror=x>',
    cta: 'A',
  });
  out = await run(out.graph, 'code', { id: out.result.id });
  const html = out.graph.nodes.find((n) => n.id === out.result.id).body;
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
test('publication request does not create a URL or server success', async () => {
  const { g, id } = await coded();
  const out = await run(g, 'request-release', { id, channel: 'preview' });
  const d = out.graph.nodes.find((n) => n.id === out.result.id);
  assert.equal(d.status, 'queued');
  assert.equal(d.url, undefined);
  assert.equal(d.server, 'unverified');
});
test('ordinary user cannot forge a publication receipt', async () => {
  const { g, id } = await coded();
  const q = await run(g, 'request-release', { id, channel: 'preview' });
  await assert.rejects(
    run(q.graph, 'receipt', { id: q.result.id }),
    (e) => e.code === 'RECEIPT_AUTH',
  );
});
test('signed executor receipt must match exact run and source hash', async () => {
  const { g, id } = await coded();
  const q = await run(g, 'request-release', { id, channel: 'preview' });
  await assert.rejects(
    run(
      q.graph,
      'receipt',
      { id: q.result.id, runId: q.result.runId, sourceSha256: 'wrong' },
      admin,
      { verifiedReceipt: true },
    ),
    (e) => e.code === 'SOURCE_MISMATCH',
  );
});
test('user journey follows marketing to pain resolution; DB is a separate feedback path', () => {
  const g = seed(),
    s = project(g, { view: 'journey', scope: 'company' });
  const order = s.placements
    .filter((n) => n.side === 'user')
    .map((n) => n.flowKey);
  assert.deepEqual(order, USER_FLOW);
  assert.notEqual(
    s.placements.find((n) => n.flowKey === 'landing').entityId,
    s.placements.find((n) => n.flowKey === 'published-web').entityId,
  );
  assert.ok(!order.includes('db'));
  assert.ok(s.lines.some((e) => e.predicate === 'FEEDS_BACK_TO'));
});
test('projection does not mutate canonical state and reuses identity for secondary tiers', async () => {
  const { g, id } = await classified(),
    copy = JSON.stringify(g),
    p = project(g, { view: 'pipeline', scope: 'company' });
  assert.equal(copy, JSON.stringify(g));
  assert.equal(p.placements.filter((n) => n.entityId === id).length, 2);
});
test('agent message records a proposal, never claims model execution', async () => {
  const { g, id } = await applied();
  const out = await run(g, 'message', {
    targetId: id,
    body: '이 모듈의 디자인을 검토해 주세요.',
    agentRequest: true,
  });
  assert.equal(out.result.executed, false);
  assert.equal(out.graph.nodes.at(-1).status, 'proposed');
});
async function databaseTest(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'ocp-v8-')),
    db = connectSQLite(path.join(dir, 'db.sqlite'));
  db.sqlite.exec(
    await readFile(
      new URL('./canonical-baseline.sql', import.meta.url),
      'utf8',
    ),
  );
  db.sqlite.exec(
    await readFile(
      new URL('../../db/migrations/studio-v8.sql', import.meta.url),
      'utf8',
    ),
  );
  const w = await tenantFor(admin.id);
  await initialize(db, w, admin);
  try {
    await fn(db, fileBucket(path.join(dir, 'vault')), w, dir);
  } finally {
    db.sqlite.close();
    await rm(dir, { recursive: true, force: true });
  }
}
test('real SQLite canonical tables persist graph and immutable BU event', () =>
  databaseTest(async (db, bucket, w) => {
    const before = await loadGraph(db, w),
      out = await run(before, 'capture', { body: 'Persistent' });
    await saveGraph(db, bucket, w, before, out);
    const after = await loadGraph(db, w);
    assert.equal(after.revision, 1);
    assert.equal(after.nodes[0].body, 'Persistent');
    assert.equal(after.journal[0].status, 'object-stored;drive-pending');
    assert.ok(await bucket.get(after.journal[0].path));
    assert.equal(
      db.sqlite
        .prepare(
          "SELECT COUNT(*) n FROM entities WHERE entity_type='observation'",
        )
        .get().n,
      1,
    );
    assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM states').get().n, 1);
  }));
test('different private tenants cannot see each others raw data', () =>
  databaseTest(async (db, bucket, w) => {
    const before = await loadGraph(db, w),
      out = await run(before, 'capture', { body: 'Private' });
    await saveGraph(db, bucket, w, before, out);
    const w2 = await tenantFor('other');
    await initialize(db, w2, { id: 'other', role: 'writer' });
    assert.equal((await loadGraph(db, w2)).nodes.length, 0);
  }));
test('D1-compatible compare-and-swap rolls back concurrent writes', () =>
  databaseTest(async (db, bucket, w) => {
    const before = await loadGraph(db, w),
      a = await run(before, 'capture', { body: 'A' }),
      b = await run(before, 'capture', { body: 'B' });
    await saveGraph(db, bucket, w, before, a);
    await assert.rejects(
      saveGraph(db, bucket, w, before, b),
      (e) => e.status === 409,
    );
    const loaded = await loadGraph(db, w);
    assert.equal(loaded.nodes.length, 1);
    assert.equal(loaded.nodes[0].body, 'A');
    assert.equal(loaded.revision, 1);
  }));
test('archive failure leaves canonical DB unchanged', () =>
  databaseTest(async (db, bucket, w) => {
    const before = await loadGraph(db, w),
      out = await run(before, 'capture', { body: 'Failure' });
    await assert.rejects(
      saveGraph(
        db,
        {
          put: async () => {
            throw Error('Object store down');
          },
        },
        w,
        before,
        out,
      ),
      /Object store down/,
    );
    assert.equal((await loadGraph(db, w)).revision, 0);
  }));
test('archive blocks traversal and immutable byte replacement', () =>
  databaseTest(async (db, bucket) => {
    await assert.rejects(bucket.put('../escape', 'x'), /Unsafe/);
    await bucket.put('same', 'one');
    await assert.rejects(bucket.put('same', 'two'), /Immutable/);
  }));

test('superseding a REP source marks previous implementation for explicit re-review', async () => {
  let { g, id } = await classified();
  const n = g.nodes.find((n) => n.id === id);
  n.source.system = 'rep-note';
  n.source.id = 'upstream-note';
  n.source.version = '1';
  let d = await run(g, 'review', {
    id,
    rationale: 'checked',
    acceptance: 'works',
    evidenceIds: [id],
    parentId: 'product',
    targetKind: 'page',
    targetTitle: 'Page',
    approve: true,
  });
  let a = await run(d.graph, 'apply', { id: d.result.id });
  const newer = await run(a.graph, 'capture', {
    body: 'Updated source',
    sourceSystem: 'rep-note',
    sourceId: 'upstream-note',
    sourceVersion: '2',
  });
  assert.ok(
    newer.graph.edges.some((e) => e.predicate === 'SUPERSEDES' && e.to === id),
  );
  assert.equal(
    newer.graph.nodes.find((n) => n.id === a.result.id).sourceAlert
      .approvalRecheckRequired,
    true,
  );
});

test('native service denies missing identity and cross-origin writes without changes', () =>
  databaseTest(async (db, bucket, w) => {
    const { studioService } = await import('../../lib/studio/service.mjs');
    assert.equal(
      (
        await studioService(new Request('https://ocp.test/api/studio'), {
          db,
          bucket,
        })
      ).status,
      401,
    );
    const req = new Request('https://ocp.test/api/studio', {
      method: 'POST',
      headers: { origin: 'https://bad.test' },
      body: JSON.stringify({}),
    });
    assert.equal(
      (await studioService(req, { db, bucket, actor: admin })).status,
      403,
    );
    assert.equal((await loadGraph(db, w)).revision, 0);
  }));

test('REP notes/cloud bridge uses existing tables, preserves IDs, rejects cross-account reads and is idempotent', () =>
  databaseTest(async (db, bucket) => {
    const { syncREP } = await import('../../lib/studio/rep-bridge.mjs');
    db.sqlite
      .exec(`CREATE TABLE rep_notes(id TEXT PRIMARY KEY,owner TEXT,title TEXT,body TEXT,version INTEGER,updated TEXT,folder_id TEXT,vault_id TEXT,project_id TEXT,blocks_json TEXT);
 CREATE TABLE rep_note_canvas(owner TEXT PRIMARY KEY,content TEXT,version INTEGER);
 CREATE TABLE rep_message_members(channel_id TEXT,actor TEXT);
 CREATE TABLE rep_messages(id TEXT,channel_id TEXT,text TEXT,created TEXT,label TEXT,kind TEXT,source TEXT);`);
    db.sqlite
      .prepare('INSERT INTO rep_notes VALUES(?,?,?,?,?,?,?,?,?,?)')
      .run(
        'actual-note',
        'account:fixture-a',
        'Reviewable note',
        'Persistent REP source',
        4,
        '2026-09-17',
        null,
        null,
        null,
        null,
      );
    db.sqlite
      .prepare('INSERT INTO rep_notes VALUES(?,?,?,?,?,?,?,?,?,?)')
      .run(
        'private-note',
        'account:fixture-b',
        'Private',
        'Do not import',
        1,
        '2026-09-17',
        null,
        null,
        null,
        null,
      );
    db.sqlite
      .prepare('INSERT INTO rep_note_canvas VALUES(?,?,?)')
      .run(
        'account:fixture-a',
        JSON.stringify({ nodes: [{ noteId: 'actual-note', x: 17, y: 23 }] }),
        2,
      );
    const options = {
      db,
      bucket,
      accountId: 'fixture-a',
      actor: admin,
      selection: { noteIds: ['actual-note'], includeCloud: true },
    };
    const first = await syncREP(options);
    assert.equal(first.imported, 2);
    const graph = await loadGraph(db, await tenantFor(admin.id));
    const note = graph.nodes.find((n) => n.source?.system === 'rep-note');
    assert.equal(note.source.id, 'actual-note');
    assert.equal(note.source.version, '4');
    assert.equal(note.status, 'classified-first');
    assert.ok(
      graph.edges.some((e) => e.predicate === 'REFERS_TO' && e.to === note.id),
    );
    const again = await syncREP(options);
    assert.equal(again.imported, 0);
    assert.equal(again.unchanged, 2);
    await assert.rejects(
      syncREP({ ...options, selection: { noteIds: ['private-note'] } }),
      (e) => e.status === 403,
    );
    assert.equal(
      db.sqlite
        .prepare('SELECT body FROM rep_notes WHERE id=?')
        .get('actual-note').body,
      'Persistent REP source',
    );
  }));
