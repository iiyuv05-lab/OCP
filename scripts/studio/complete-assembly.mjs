/** One-time source reconciliation. No runtime overrides and no private data access. */
import { readFile, writeFile } from 'node:fs/promises';
async function edit(name, transform) { const old=await readFile(name,'utf8'); const next=transform(old); if(next!==old) await writeFile(name,next); }
await edit('public/ocp-studio/core.mjs', text => {
  if(text.includes('assembly: assemble(g, work.id)')) return text;
  if(!text.includes('    const spec = {') || !text.includes('const sections =')) throw Error('Reviewed design source drifted');
  return "import { assemble, renderAssembly } from './assembly.mjs';\n" + text.replace("VERSION = '8.0.1'", "VERSION = '8.0.2'").replace('    const spec = {','    const spec = {\n      assembly: assemble(g, work.id),').replace('</section></main><footer>OCP',"</section>${sections ? '' : renderAssembly(d.assembly || [], escapeHTML)}</main><footer>OCP").replace('</style></head><body><header>', '.assembly-grid{display:grid;gap:20px}.assembly-part{border:1px solid #ccd5c6;border-radius:10px;padding:20px;background:#fff}.assembly-children{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:18px}.assembly-kind{font:10px monospace;letter-spacing:.14em;color:#526755}.assembly-part p{font-size:14px}.assembly-part h2,.assembly-part h3,.assembly-part h4{font-size:20px;margin:12px 0}</style></head><body><header>');
});
await edit('public/ocp-studio/app.mjs', text => {
  if(!text.includes('  designToHTML,')) text=text.replace('  digest,','  digest,\n  designToHTML,');
  text=text.replace("options.images?.[src] || '/' + src", "options.images?.[src] || (src.startsWith('/') ? src : '/' + src)");
  text=text.replace("${n.kind === 'code' ? '<iframe", "${['code', 'design'].includes(n.kind) ? '<iframe");
  if(!text.includes("if (n.kind === 'design') $('#detail-slot iframe').srcdoc")) text=text.replace("    $('#detail-slot').dataset.node = JSON.stringify(n);", "    if (n.kind === 'design') $('#detail-slot iframe').srcdoc = designToHTML(n);\n    $('#detail-slot').dataset.node = JSON.stringify(n);");
  // The collector uses the source: prefix for all files; only physical roots belong in this rail.
  text=text.replace("n.id.startsWith('source:') ||", "(n.kind === 'folder' && n.source?.path === '.') ||");
  return text;
});
await edit('public/ocp-studio/renderer.mjs', text => text.replace('      if (w < 75 || rw < 40) continue;', `      if (rw < 160 || rh < 85) {
        ctx.save(); ctx.beginPath(); ctx.rect(x+4,y+3,Math.max(0,rw-8),Math.max(0,rh-6)); ctx.clip();
        ctx.fillStyle='#e4eadf'; ctx.font='600 11px system-ui';
        wrapText(p.flowTitle || p.node.title,x+7,y+15,Math.max(10,rw-14),14,rh>=42?2:1);
        if(rh>=58){ctx.font='9px monospace';ctx.fillStyle=tint;ctx.fillText((p.node.kind||'canvas').toUpperCase(),x+7,y+rh-8);}
        ctx.restore(); continue;
      }`));
await edit('scripts/studio/install-plmag.mjs', text => {
  if(!text.includes("'assembly.mjs'"))text=text.replace("  'core.mjs',", "  'core.mjs',\n  'assembly.mjs',");
  if(text.includes('bind-native-OCP-entry'))return text;
  const anchor='if (apply)\n  await writeFile(\n    path.join(target, \'OCP-v8-INSTALL-REPORT.json\'),';
  if(!text.includes(anchor))throw Error('Installer source drifted');
  const block=`// Bind only the inspected OCP entry, with original bytes retained.
for (const name of ['lib/product-desk.js','lib/plmag-catalog.ts']) {
  const filename=path.join(target,name), old=await readFile(filename,'utf8');
  const previousURL='https://ocp-canvas.plum-tetra-3335.chatgpt.site/app/';
  const needle=name.endsWith('.js')?"url:'"+previousURL+"'":"url: '"+previousURL+"'";
  const replacement=name.endsWith('.js')?"url:'/studio',legacyURL:'"+previousURL+"'":"url: '/studio', legacyURL: '"+previousURL+"'";
  if(old.includes(needle)) {
    if(apply) {
      await mkdir(path.join(target,'.studio-backup'),{recursive:true});
      await writeFile(path.join(target,'.studio-backup/'+path.basename(name)),old,{flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});
      await writeFile(filename,old.replace(needle,replacement));
    }
    report.sourceChanged.push({path:name,operation:'bind-native-OCP-entry',legacyURL:previousURL});
  } else if(!old.includes("'/studio'"))throw Error('OCP entry changed; refusing unknown route: '+name);
}
`;
  return text.replace(anchor,block+anchor);
});
