/** Resume interrupted integration without replacing private data or operational settings. */
import { readFile, writeFile } from 'node:fs/promises';
const file = 'app/page.tsx';
let text = await readFile(file, 'utf8');
const original = '}, ...current].slice(0, 50));';
const replacement = '} satisfies FeedEvent, ...current].slice(0, 50));';
if (!text.includes(replacement)) {
  if (!text.includes(original)) throw new Error('The baseline FeedEvent anchor changed; review before applying.');
  text = text.replace(original, replacement);
  await writeFile(file, text);
}
const config = JSON.parse(await readFile('tsconfig.json', 'utf8'));
config.compilerOptions.types = [...new Set([...(config.compilerOptions.types || []), 'node', './worker-configuration.d.ts'])];
await writeFile('tsconfig.json', JSON.stringify(config, null, 2) + '\n');
const gitignore = await readFile('.gitignore', 'utf8');
if (!gitignore.includes('worker-configuration.d.ts')) await writeFile('.gitignore', gitignore + '\n# Generated from the exact built Worker configuration\nworker-configuration.d.ts\n');
const testFile = 'tests/studio/native-runtime.mjs';
let test = await readFile(testFile, 'utf8');
if (!test.includes("schema: 'ocp.studio.graph/8'")) {
  const anchor = 'graph: {\n      nodes,';
  if (!test.includes(anchor)) throw new Error('Native fixture import anchor changed.');
  test = test.replace(anchor, "graph: {\n      schema: 'ocp.studio.graph/8',\n      nodes,");
  await writeFile(testFile, test);
}
console.log('v8 resume: source typing and versioned fixture contract repaired.');
