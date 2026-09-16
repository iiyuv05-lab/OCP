/** Deterministic last-mile integration repairs; changes no canonical data. */
import { readFile, writeFile } from 'node:fs/promises';
let path = 'public/ocp-studio/renderer.mjs';
let text = await readFile(path, 'utf8');
if (!text.includes('pendingInitialFit')) {
  text = text.replace(
    'let width = 100,',
    'let pendingInitialFit = false;\n  let width = 100,',
  );
  text = text.replace(
    '    canvas.height = height * devicePixelRatio;\n    dirty = true;',
    '    canvas.height = height * devicePixelRatio;\n    if (pendingInitialFit) fit();\n    dirty = true;',
  );
  text = text.replace(
    '  function fit() {\n    if (!scene.placements.length) return;',
    `  function fit() {
    if (!scene.placements.length) return;
    // A synchronous adapter can resolve before ResizeObserver runs.
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width < 120 || bounds.height < 120) {
      pendingInitialFit = true;
      return;
    }
    pendingInitialFit = false;
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * devicePixelRatio);
    canvas.height = Math.round(height * devicePixelRatio);`,
  );
  await writeFile(path, text);
}
path = 'public/ocp-studio/app.mjs';
text = await readFile(path, 'utf8');
if (!text.includes('const hierarchyRows')) {
  const anchor = "    $('#scope-tree').innerHTML = list\n      .map(";
  if (!text.includes(anchor)) throw new Error('Scope tree anchor changed.');
  text = text.replace(
    anchor,
    `    const known = new Set(list.map(n => n.id));
    const children = new Map();
    const parented = new Set();
    for (const e of state.graph.edges) {
      if (e.predicate !== 'CONTAINS' || !known.has(e.from) || !known.has(e.to)) continue;
      if (!children.has(e.from)) children.set(e.from, []);
      children.get(e.from).push(e.to);
      parented.add(e.to);
    }
    const byId = new Map(list.map(n => [n.id, n]));
    const hierarchyRows = [], seen = new Set();
    function append(id) {
      if (seen.has(id)) return;
      seen.add(id);
      hierarchyRows.push(byId.get(id));
      for (const child of children.get(id) || []) append(child);
    }
    for (const n of list.filter(n => !parented.has(n.id)).sort((a,b) => Number(b.kind === 'company') - Number(a.kind === 'company'))) append(n.id);
    for (const n of list) append(n.id);
    $('#scope-tree').innerHTML = hierarchyRows
      .map(`,
  );
  await writeFile(path, text);
}
path = 'public/ocp-studio/style.css';
text = await readFile(path, 'utf8');
if (!text.includes('Native host status-class isolation')) {
  text += `\n/* Native host status-class isolation: legacy OCP also styles .status. */
.ocp-studio .status {
  display: block; background: transparent; color: var(--text);
  padding: 12px 0; box-shadow: none; border: 0; border-radius: 0;
  text-align: left; font-size: 12px; line-height: 1.7; height: auto; width: auto;
}
`;
  await writeFile(path, text);
}
console.log(
  'Initial viewport measured, logical scope tree ordered, legacy CSS isolated.',
);
