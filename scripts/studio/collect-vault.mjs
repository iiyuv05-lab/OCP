/** Read-only filesystem ingestion. Filesystem hierarchy is not a product ontology. */
import { readdir, lstat, readFile, writeFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export async function collect(root, label = 'Vault', maxTextBytes = 80000) {
  root = await realpath(root);
  const nodes = [], edges = [], omitted = [];
  const skip = new Set(['node_modules','.git','.next','.wrangler','dist','.studio-backup','private','.DS_Store']);
  const idFor = name => `source:${label}:${createHash('sha256').update(name).digest('hex').slice(0,20)}`;
  async function visit(rel, parent) {
    const full = path.join(root, rel), stat = await lstat(full);
    if (stat.isSymbolicLink()) { omitted.push({ path: rel, reason: 'symlink-not-followed' }); return; }
    const id = rel ? idFor(rel) : 'source:' + label;
    const isDir = stat.isDirectory();
    const n = { id, kind: isDir ? 'folder' : 'file', title: rel ? path.basename(rel) : label, tiers: [], representations: [], source: { system: 'filesystem-snapshot', rootLabel: label, path: rel || '.', bytes: stat.size }, status: 'source-observed' };
    if (!isDir) {
      const bytes = await readFile(full); n.source.sha256 = createHash('sha256').update(bytes).digest('hex');
      const ext = path.extname(rel).toLowerCase();
      n.representations = ['.md','.txt','.csv'].includes(ext) ? ['CUI'] : ['.png','.jpg','.jpeg','.webp','.gif','.svg'].includes(ext) ? ['GUI'] : ['.tsx','.jsx','.css','.html'].includes(ext) ? ['CLI','GUI'] : ['CLI'];
      const textExt = ['.md','.txt','.json','.mjs','.js','.ts','.tsx','.jsx','.css','.sql','.py','.yaml','.yml','.html','.csv','.toml','.jsonc'];
      if (textExt.includes(ext) && bytes.length <= maxTextBytes && !bytes.includes(0)) { n.body = bytes.toString('utf8'); n.source.bodyStatus = 'loaded'; }
      else n.source.bodyStatus = 'metadata-only-size-or-binary';
    }
    nodes.push(n);
    if (parent) edges.push({id:parent+'|CONTAINS|'+id,from:parent,to:id,predicate:'CONTAINS',source:{basis:'filesystem-parent'}});
    if (isDir) for (const item of (await readdir(full)).sort()) {
      if (skip.has(item) || /(^\.env|\.pem$|\.key$|credentials|secret|token\.json)/i.test(item)) { omitted.push({path:path.join(rel,item),reason:'private-or-generated-exclusion'});continue; }
      await visit(path.join(rel,item),id);
    }
  }
  await visit('',null);
  return {schema:'ocp.studio.graph/8',nodes,edges,coverage:[{source:label,scope:'selected filesystem root',fullRemoteVaultScan:false,semanticClassification:'unreviewed',files:nodes.filter(n=>n.kind==='file').length,omitted}]};
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [root, output, label] = process.argv.slice(2);
  if (!root || !output) throw Error('Usage: node collect-vault.mjs ROOT OUTPUT_JSON [LABEL]');
  const graph = await collect(root,label || path.basename(root));
  await writeFile(output,JSON.stringify(graph,null,2));
  console.log(JSON.stringify({nodes:graph.nodes.length,files:graph.coverage[0].files,scope:graph.coverage[0].scope}));
}
