import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { connectSQLite, fileBucket } from '../../scripts/studio/sqlite-adapter.mjs';
import { namespaceSQL, namespacedMigration, canonicalDatabase } from '../../lib/studio/plmag-canonical-db.mjs';
import { initialize, loadGraph, saveGraph, tenantFor } from '../../lib/studio/canonical-store.mjs';
import { execute } from '../../public/ocp-studio/core.mjs';

test('namespace does not rewrite string values or REP source tables', () => {
  assert.equal(namespaceSQL("SELECT 'entities' FROM entities WHERE canonical_name='events'"), "SELECT 'entities' FROM ocp_entities WHERE canonical_name='events'");
  assert.equal(namespaceSQL('SELECT * FROM rep_notes WHERE owner=?'), 'SELECT * FROM rep_notes WHERE owner=?');
});

test('existing incompatible BU entities and revisions remain intact while OCP persists', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ocp-namespace-'));
  const db = connectSQLite(path.join(dir, 'store.sqlite'));
  try {
    db.sqlite.exec("CREATE TABLE entities(id TEXT PRIMARY KEY, legacy_title TEXT); INSERT INTO entities VALUES('original-bu','Keep original'); CREATE TABLE revisions(id TEXT PRIMARY KEY, legacy_version INTEGER); INSERT INTO revisions VALUES('bu-r1',1);");
    const schema = await readFile('adapters/plmag/canonical-foundation.sql', 'utf8');
    const extension = await readFile('db/migrations/studio-v8.sql', 'utf8');
    db.sqlite.exec(namespacedMigration(schema + '\n' + extension));
    const canonical = canonicalDatabase(db), actor = { id: 'isolated-author', role: 'admin' };
    const workspace = await tenantFor(actor.id);
    await initialize(canonical, workspace, actor);
    const before = await loadGraph(canonical, workspace);
    const outcome = await execute(before, { id: 'namespace-capture', expectedRevision: 0, type: 'capture', payload: { title: 'Original note', body: 'Namespace verification source', sourceSystem: 'rep-note', sourceId: 'note-01', sourceVersion: 1 } }, { actor });
    await saveGraph(canonical, fileBucket(path.join(dir, 'BU')), workspace, before, outcome);
    const after = await loadGraph(canonical, workspace);
    assert.equal(after.nodes.length, 1);
    assert.equal(after.journal.length, 1);
    assert.equal(db.sqlite.prepare("SELECT legacy_title FROM entities WHERE id='original-bu'").get().legacy_title, 'Keep original');
    assert.equal(db.sqlite.prepare("SELECT legacy_version FROM revisions WHERE id='bu-r1'").get().legacy_version, 1);
  } finally { db.sqlite.close(); await rm(dir, { recursive: true, force: true }); }
});
