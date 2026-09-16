/** Idempotent build-time repair for the approved v8 integration source only. */
import { readFile, writeFile } from 'node:fs/promises';
const corePath = 'public/ocp-studio/core.mjs';
let core = await readFile(corePath, 'utf8');
const original =
  "    const body = nonempty(p.body, '원문'),\n      title = nonempty(p.title || body.slice(0, 90), '제목', 180);";
if (!core.includes('Preserve raw whitespace')) {
  if (!core.includes(original))
    throw new Error('Raw capture anchor drifted; review required.');
  core = core.replace(
    original,
    "    // Preserve raw whitespace and line endings; validation is not a transformation.\n    fail(typeof p.body === 'string', 'INPUT', '원문은 문자열이어야 합니다.');\n    nonempty(p.body, '원문');\n    const body = p.body,\n      title = nonempty(p.title || body.slice(0, 90), '제목', 180);",
  );
  await writeFile(corePath, core);
}
const installPath = 'scripts/studio/install-plmag.mjs';
let install = await readFile(installPath, 'utf8');
if (!install.includes('namespacedMigration')) {
  install =
    "import { namespacedMigration } from '../../lib/studio/plmag-canonical-db.mjs';\n" +
    install;
  install = install.replace(
    "  'lib/studio/rep-bridge.mjs',",
    "  'lib/studio/rep-bridge.mjs',\n  'lib/studio/plmag-canonical-db.mjs',\n  'app/api/studio/asset/route.ts',",
  );
  const anchor = 'const notePath = path.join';
  if (!install.includes(anchor)) throw new Error('Installer anchor drifted.');
  install = install.replace(
    anchor,
    `// Existing BU tables may share canonical table names. Never replace them.
const sql = namespacedMigration((await readFile(path.join(root, 'adapters/plmag/canonical-foundation.sql'), 'utf8')) + '\\n' + (await readFile(path.join(root, 'db/migrations/studio-v8.sql'), 'utf8')));
if (apply) {
  await mkdir(path.join(target, 'studio-migrations'), { recursive: true });
  await writeFile(path.join(target, 'studio-migrations/0001_ocp_namespaced.sql'), sql);
}
report.canonicalTableNamespace = 'ocp_';
report.migrationGenerated = 'studio-migrations/0001_ocp_namespaced.sql';
` + anchor,
  );
  await writeFile(installPath, install);
}
console.log(
  'Raw text preserved exactly; Plmag migrations use the ocp_ namespace.',
);
