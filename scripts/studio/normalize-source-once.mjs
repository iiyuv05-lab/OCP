/** Idempotent v8 source cleanup. Never reads or changes private source data. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const edits = {
  'public/ocp-studio/projector.mjs': [['HIERARCHY, TIERS, USER_FLOW, BUILDER_FLOW', 'USER_FLOW, BUILDER_FLOW']],
  'public/ocp-studio/app.mjs': [
    ['esc(n.url)', 'esc(safeURL(n.url))'],
    ['} catch {}', '} catch { /* The command already surfaced the server error in the toast. */ }'],
    ['api.rep({ mode: "snapshot" })', 'api.rep({ mode: "snapshot", includeCloud: true })']
  ],
  'scripts/studio/serve.mjs': [['readFile, writeFile, mkdir','readFile, mkdir']],
  'scripts/studio/sqlite-adapter.mjs': [[', realpath','']],
  'tests/studio/core.test.mjs': [
    ['names.map((kind, i) =>', 'names.map((kind) =>'],
    ['test("archive blocks traversal and immutable byte replacement", () =>\n  databaseTest(async (db, bucket, w) =>', 'test("archive blocks traversal and immutable byte replacement", () =>\n  databaseTest(async (db, bucket) =>']
  ]
};
for (const [name, replacements] of Object.entries(edits)) {
  let text = await readFile(name, 'utf8');
  for (const [from, to] of replacements) text = text.split(from).join(to);
  await writeFile(name, text);
}
const tsconfig = JSON.parse(await readFile('tsconfig.json', 'utf8'));
tsconfig.exclude = [...new Set([...(tsconfig.exclude || []), 'adapters'])];
await writeFile('tsconfig.json', JSON.stringify(tsconfig, null, 2) + '\n');
const manifest = JSON.parse(await readFile('docs/STUDIO-V8-SOURCE-MANIFEST.json', 'utf8'));
for (const name of Object.keys(manifest)) {
  manifest[name] = createHash('sha256').update(await readFile(name)).digest('hex');
}
await writeFile('docs/STUDIO-V8-SOURCE-MANIFEST.json', JSON.stringify(manifest, null, 2) + '\n');
