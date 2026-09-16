/** Snapshot approved semantic parts without persisting rendering coordinates. */
export function assemble(g, workId) {
  const byId = new Map(g.nodes.map(n => [n.id, n]));
  const children = id => g.edges.filter(e => e.predicate === 'CONTAINS' && e.from === id).map(e => byId.get(e.to)).filter(n => n && n.decisionId && ['module','asset','atom'].includes(n.kind));
  const pack = (n, depth = 0) => {
    if (depth > 6) throw new Error('Assembly hierarchy exceeds the approved product structure.');
    return { id: n.id, kind: n.kind, title: n.title, acceptance: n.requirement?.acceptance || '', children: children(n.id).map(c => pack(c, depth + 1)) };
  };
  return children(workId).map(n => pack(n));
}
export function renderAssembly(assembly, escape) {
  const render = (n, depth) => `<article class="assembly-part assembly-${escape(n.kind)}" data-canonical-id="${escape(n.id)}" data-kind="${escape(n.kind)}"><div class="assembly-kind">${escape({module:'MODULE',asset:'ASSET / MOLECULE',atom:'COMPONENT / ATOM'}[n.kind] || n.kind)}</div><h${Math.min(depth + 2, 6)}>${escape(n.title)}</h${Math.min(depth + 2, 6)}>${n.acceptance ? `<p>${escape(n.acceptance)}</p>` : ''}${n.children.length ? `<div class="assembly-children">${n.children.map(c => render(c, depth + 1)).join('')}</div>` : ''}</article>`;
  return assembly.length ? `<section id="assembly" aria-label="기획에서 연결한 페이지 구성"><h2>페이지 구성</h2><div class="assembly-grid">${assembly.map(n => render(n, 0)).join('')}</div></section>` : '';
}
