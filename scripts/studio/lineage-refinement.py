"""One-time, reviewable refinement of v8 source. No private data or runtime writes."""
from pathlib import Path


def replace(text, before, after):
    if after in text:
        return text
    if text.count(before) != 1:
        raise RuntimeError('Source anchor changed: ' + before[:100])
    return text.replace(before, after, 1)


root = Path.cwd()
path = root / 'public/ocp-studio/core.mjs'
text = path.read_text()
if "export const VERSION = '8.0.1';" not in text:
    text = replace(text, "export const VERSION = '8.0.0';", "export const VERSION = '8.0.1';")
    text = replace(text, "HIERARCHY.includes(p.targetKind) && p.targetKind !== 'company',", "HIERARCHY.includes(p.targetKind),")
    text = replace(text, """    const parent = node(g, p.parentId);
    fail(
      HIERARCHY.indexOf(parent.kind) + 1 === HIERARCHY.indexOf(p.targetKind),
      'HIERARCHY',
      '상위 객체와 구현 대상 서열이 맞지 않습니다.',
    );""", """    if (p.targetKind === 'company') {
      fail(!p.parentId, 'HIERARCHY', '컴퍼니는 최상위 객체입니다.');
    } else {
      const parent = node(g, p.parentId);
      fail(HIERARCHY.indexOf(parent.kind) + 1 === HIERARCHY.indexOf(p.targetKind),
        'HIERARCHY', '상위 객체와 구현 대상 서열이 맞지 않습니다.');
    }""")
    text = replace(text, "    edge(g, d.parentId, id, 'CONTAINS');", "    if (d.parentId) edge(g, d.parentId, id, 'CONTAINS');")
    text = replace(text, """    const spec = {
      heading: nonempty(p.heading, '제목', 180),""", """    const descendants = new Set([work.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const e of g.edges) if (e.predicate === 'CONTAINS' && descendants.has(e.from) && !descendants.has(e.to)) {
        descendants.add(e.to); grew = true;
      }
    }
    const sectionIds = p.sectionIds || [];
    fail(Array.isArray(sectionIds) && sectionIds.length <= 12, 'DESIGN_PARTS', '화면 모듈은 12개까지 연결하세요.');
    const sections = sectionIds.map(id => {
      const part = node(g, id);
      fail(id !== work.id && descendants.has(id) && part.decisionId, 'DESIGN_PARTS', '승격된 하위 모듈/에셋만 디자인에 연결할 수 있습니다.');
      return { entityId: part.id, title: part.title, body: String(part.body || part.requirement?.acceptance || '').slice(0, 1000), kind: part.kind };
    });
    const spec = {
      sections,
      heading: nonempty(p.heading, '제목', 180),""")
    text = replace(text, "    edge(g, work.id, d.id, 'DESIGNED_AS');", "    edge(g, work.id, d.id, 'DESIGNED_AS');\n    for (const part of sections) edge(g, part.entityId, d.id, 'REPRESENTED_IN');")
    text = replace(text, "  const d = design.spec;\n  return `", """  const d = design.spec;
  const sections = (d.sections || []).map((s) => `<section data-entity-id="${escapeHTML(s.entityId)}"><div class="eyebrow">${escapeHTML(s.kind)}</div><h2>${escapeHTML(s.title)}</h2><p>${escapeHTML(s.body)}</p></section>`).join('');
  return `""")
    text = replace(text, '<section id="details"><h2>다음 단계</h2>', '${sections}<section id="details"><h2>다음 단계</h2>')
    text = replace(text, "        ['raw', 'message'].includes(to.kind),", "        (['raw', 'message'].includes(to.kind) || HIERARCHY.includes(to.kind)),")
    text = replace(text, "'원문 간 참조 연결만 지원합니다.'", "'원문 참조 또는 구현 대상에 대한 문맥 연결만 지원합니다.'")
    path.write_text(text)

path = root / 'public/ocp-studio/projector.mjs'
text = path.read_text()
if "'REPRESENTED_IN'" not in text:
    text = text.replace('for (let i = 0; i < 3; i++)', 'for (let i = 0; i < 8; i++)', 1)
    text = replace(text, "          'APPLIES',", "          'APPLIES', 'CONTAINS', 'HAS_SURFACE', 'RECORDED_AT', 'HAS_SOURCE_ROOT', 'STORED_IN', 'HAS_VAULT', 'REFERENCES', 'STORES', 'REPRESENTED_IN',")
    text = replace(text, "(n) => !['folder', 'file', 'element'].includes(n.kind),", "(n) => n.kind !== 'folder' && (!['file', 'element'].includes(n.kind) || n.tiers.length > 0),")
    path.write_text(text)

path = root / 'public/ocp-studio/app.mjs'
text = path.read_text()
if 'recordNativeREPMessage' not in text:
    text = replace(text, 'emptyGraph, TIERS, HIERARCHY, escapeHTML as esc', 'emptyGraph, TIERS, HIERARCHY, digest, escapeHTML as esc')
    text = replace(text, 'select name="parentId">${state.graph.nodes', 'select name="parentId"><option value="">새 컴퍼니 · 최상위</option>${state.graph.nodes')
    text = replace(text, 'targetKind: HIERARCHY[HIERARCHY.indexOf(parent.kind) + 1],', "parentId: p.parentId || null,\n            targetKind: parent ? HIERARCHY[HIERARCHY.indexOf(parent.kind) + 1] : 'company',")
    text = replace(text, '<div id="scope-tree"></div>', '<div id="scope-tree"></div><div class="section-label">BU · SOURCE ROOTS</div><div id="source-roots"></div>')
    text = replace(text, '    const count = (kind) =>', """    $('#source-roots').innerHTML = state.graph.nodes.filter(n => n.id.startsWith('source:') || (n.kind === 'folder' && n.physicalHierarchy && !state.graph.edges.some(e => e.predicate === 'CONTAINS' && e.to === n.id))).map(n => `<button class="scope" data-source-root="${esc(n.id)}">▤ ${esc(n.title)}</button>`).join('');
    const count = (kind) =>""")
    text = replace(text, "      const scope = e.target.closest('[data-scope]');", """      const sourceRoot = e.target.closest('[data-source-root]');
      if (sourceRoot) {
        state.view = 'source';
        state.fileRoot = sourceRoot.dataset.sourceRoot;
        $('#detail-slot').innerHTML = '';
        renderScene();
        return;
      }
      const scope = e.target.closest('[data-scope]');""")
    text = replace(text, '<label>세부 내용</label><textarea name="detail"></textarea>`,', '<label>세부 내용</label><textarea name="detail"></textarea><label>같은 계층의 승인된 모듈·에셋·아톰 ID (쉼표 구분, 선택)</label><input name="sectionIds" placeholder="work-… , work-…"><small>선택한 기획 객체의 하위 요소만 화면 섹션으로 구성합니다.</small>`,')
    text = replace(text, "(p) => run('design', { id: n.id, ...p }),", "(p) => run('design', { id: n.id, ...p, sectionIds: String(p.sectionIds || '').split(',').map(x => x.trim()).filter(Boolean) }),")
    text = replace(text, '  async function commandUI(type) {', """  async function recordNativeREPMessage(target, payload) {
    const identity = await digest(state.actor.id + ':' + target.id);
    const token = identity.slice(0, 32);
    const channelId = [token.slice(0, 8), token.slice(8, 12), token.slice(12, 16), token.slice(16, 20), token.slice(20)].join('-');
    const messageId = crypto.randomUUID();
    const send = (body) => request('/api/messages', { method: 'POST', body: JSON.stringify(body) });
    await send({ action: 'channel.create', id: channelId, name: 'OCP · ' + target.id.slice(-60), category: 'OCP 구현' });
    await send({ action: 'message.send', id: messageId, channelId, text: (payload.agentRequest ? '[에이전트 작업 제안 · 아직 실행하지 않음]\\n' : '') + payload.body });
    await api.rep({ channelId, skipNotes: true });
    await load();
    const raw = state.graph.nodes.find(x => x.source?.system === 'rep-message' && x.source?.id === messageId);
    if (!raw) throw new Error('REP에는 기록됐으나 OCP 참조를 아직 확인하지 못했습니다. 같은 채널의 연결을 다시 확인하세요.');
    await run('relate', { from: raw.id, to: target.id, predicate: 'ABOUT' });
    await select(raw.id);
    toast('기존 REP 채널과 BU 보존, OCP 대상 연결을 확인했습니다. AI 실행은 별도입니다.');
  }
  async function commandUI(type) {""")
    text = replace(text, "(p) =>\n          run('message', {", "(p) => state.mode === 'plmag-native' ? recordNativeREPMessage(n, {body:p.body,agentRequest:!!p.agentRequest}) :\n          run('message', {")
    path.write_text(text)

path = root / 'lib/studio/rep-bridge.mjs'
text = path.read_text()
if 'selection.skipNotes' not in text:
    text = replace(text, 'const rows = (\n    await db', 'const rows = selection.skipNotes === true ? [] : (\n    await db')
    path.write_text(text)
print('v8.0.1: approved hierarchy, actual design bindings, original REP message workflow.')
