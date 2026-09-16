/** Editable delivery surface. Reuses OCP's mount + execute; no fake cloud API. */
import { mount } from './app.mjs';
import { emptyGraph, escapeHTML as esc } from './core.mjs';
import { openBrowserStore } from './browser-store.mjs';

export function sourceOnly(graph) {
  if (!graph || graph.schema !== 'ocp.studio.graph/8') throw Error('OCP v8 그래프 형식이 아닙니다.');
  const authorityKinds = new Set(['decision', 'deployment', 'design', 'code']);
  const forbidden = new Set(['APPLIES', 'PUBLISHED_AT', 'DEPLOYMENT_REQUEST', 'BUILDS_TO', 'DESIGNED_AS', 'IMPLEMENTS']);
  const nodes = graph.nodes.filter(n => !authorityKinds.has(n.kind)).map(item => {
    const n = structuredClone(item);
    for (const key of ['decisionId', 'appliedId', 'reviewer', 'workId', 'runId', 'authority', 'readiness', 'bu']) delete n[key];
    n.model = 'observed'; n.stateKind = 'observed';
    n.status = n.kind === 'raw' ? 'classified-first' : 'source-snapshot';
    n.importStatus = 'observed-source-snapshot';
    n.tiers ||= []; n.representations ||= [];
    return n;
  });
  const ids = new Set(nodes.map(n => n.id));
  return { ...emptyGraph('browser-personal'), nodes,
    edges: graph.edges.filter(e => ids.has(e.from) && ids.has(e.to) && !forbidden.has(e.predicate)),
    coverage: [{ source: 'provided-v8-source-snapshot', scope: 'loaded records only', originalRevision: graph.revision,
      approvedStateImported: false, remoteSync: false }, ...(graph.coverage || [])] };
}
const download = (name, content, mime = 'application/json') => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
};
export async function mountWorkbench(host, options = {}) {
  const store = options.adapter || await openBrowserStore({ name: options.storageName, seed: options.seed ? sourceOnly(options.seed) : null });
  const app = await mount(host, { ...options, adapter: store });
  const bar = document.createElement('div');
  bar.className = 'workbench-tools';
  const actions = [
    ['start', '기획 시작', 'Pain·Goal·KBF를 원문으로 저장합니다. 승격 승인은 별도입니다.'],
    ['file', '파일 입력', '문서·이미지·녹음 파일의 실제 바이트를 이 브라우저에 저장합니다. 자동 전사는 하지 않습니다.'],
    ['cloud', '구름 묶기', '여러 원문과 메시지를 같은 ID를 유지한 구름 캔버스로 묶습니다.'],
    ['backup', 'BU 백업', '정본·원문·첨부·이벤트를 내려받습니다. Drive 동기화와 다릅니다.'],
    ['import', '가져오기', '백업 복원 또는 v8 그래프를 관측 자료로 가져옵니다. 권한을 자동 수입하지 않습니다.'],
  ];
  bar.innerHTML = actions.map(([id, title, help]) => `<span><button data-workbench="${id}" title="${esc(help)}">${title}</button><button class="help" data-workhelp="${id}" title="${esc(title)} 도움말" aria-label="${esc(title)} 도움말">?</button></span>`).join('');
  host.querySelector('aside').prepend(bar);
  const dialog = document.createElement('dialog');
  dialog.className = 'workbench-dialog'; host.append(dialog);
  const note = document.createElement('div'); note.className = 'workbench-alert'; note.setAttribute('role', 'status'); host.append(note);
  const status = message => { note.textContent = message; note.hidden = false; setTimeout(() => { note.hidden = true; }, 7000); };
  let destroyed = false;
  function modal(title, content, submit) {
    dialog.innerHTML = `<form><h2>${esc(title)}</h2>${content}<p class="form-error" role="alert"></p><div class="buttons"><button type="button" data-dismiss>닫기</button>${submit ? '<button type="submit" class="primary">확인 · 저장</button>' : ''}</div></form>`;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('[data-dismiss]').onclick = () => dialog.close();
    dialog.querySelector('form').onsubmit = async event => {
      event.preventDefault();
      const button = dialog.querySelector('[type="submit"]'); button.disabled = true;
      try { await submit(new FormData(event.target)); dialog.close(); }
      catch (error) { dialog.querySelector('.form-error').textContent = error.message; button.disabled = false; }
    };
  }
  async function issue(type, payload) {
    const graph = (await store.snapshot()).graph;
    const result = await store.command({ id: 'wb-' + crypto.randomUUID(), expectedRevision: graph.revision, type, payload });
    await app.refresh(); if (result.result?.id) await app.inspect(result.result.id);
    status('저장 완료 · r' + result.graph.revision + ' · 이 브라우저');
    return result;
  }
  async function importFiles(files) {
    for (const file of files) {
      const attachment = await store.putFile(file);
      const textFile = /\.(md|txt|json|csv|html?|m?js|tsx?|jsx|css|sql|py|ya?ml|xml|log)$/i.test(file.name) || file.type.startsWith('text/');
      const body = textFile && file.size <= 300000 ? await file.text() :
        `첨부 원본: ${file.name}\n크기: ${file.size} bytes\nSHA-256: ${attachment.sha256}\n이미지 해석·음성 전사: 미실행. 실제 원본 파일을 보존했습니다.`;
      if (!body.trim()) throw Error(file.name + ': 빈 문서는 원문으로 등록할 수 없습니다.');
      await issue('capture', { title: file.name, body, sourceSystem: file.type.startsWith('audio/') ? 'recording' : 'document',
        sourceId: 'file:' + attachment.sha256, sourceVersion: 1, nativeRef: { attachment } });
    }
  }
  const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.hidden = true; host.append(input);
  input.onchange = async () => { try { await importFiles([...input.files]); } catch (error) { status(error.message); } finally { input.value = ''; } };
  bar.onclick = async event => {
    const help = event.target.closest('[data-workhelp]');
    if (help) { const data = actions.find(row => row[0] === help.dataset.workhelp); return modal(data[1], `<p>${esc(data[2])}</p>`); }
    const id = event.target.closest('[data-workbench]')?.dataset.workbench;
    if (!id) return;
    if (id === 'file') return input.click();
    if (id === 'start') return modal('기획을 원문부터 시작하기',
      '<p>이 입력은 CUI 원문입니다. 저장 후 2차 분류 → 승격 검토 → 승인 적용을 진행합니다.</p><label>제목</label><input name="title" required><label>Pain Point · 해결할 불편</label><textarea name="pain" required></textarea><label>Goal · 사용자 결과</label><textarea name="goal" required></textarea><label>Key Buying Factor · 선택 기준</label><textarea name="kbf"></textarea><label>기획 내용</label><textarea name="description" required></textarea>', async form => {
        const title = form.get('title');
        const body = `# ${title}\n\n## Pain Point\n${form.get('pain')}\n\n## Goal\n${form.get('goal')}\n\n## Key Buying Factor\n${form.get('kbf')}\n\n## 기획\n${form.get('description')}`;
        await issue('capture', { title, body, sourceSystem: 'manual' });
      });
    if (id === 'cloud') {
      const sources = (await store.snapshot()).graph.nodes.filter(n => ['raw', 'message'].includes(n.kind));
      return modal('REP 구름 캔버스', `<p>묶기만으로 분류·승격되지는 않습니다.</p><label>구름 이름</label><input name="title" required><fieldset><legend>포함할 원문</legend>${sources.map(n => `<label class="cloud-choice"><input type="checkbox" name="member" value="${esc(n.id)}">${esc(n.title)} <small>${esc(n.kind)}</small></label>`).join('') || '<p>먼저 원문을 입력하세요.</p>'}</fieldset>`, async form => {
        await issue('cloud', { title: form.get('title'), members: form.getAll('member') });
      });
    }
    if (id === 'backup') {
      try { const bundle = await store.backup(); download('OCP-v8.1-BU-Backup.json', JSON.stringify(bundle)); status(`BU 백업 · ${bundle.graph.nodes.length}개 객체 · ${bundle.objects.length}개 저장 기록`); }
      catch (error) { status(error.message); }
    }
    if (id === 'import') return modal('OCP 데이터 가져오기', '<label>백업 JSON 또는 Canonical Graph JSON</label><input type="file" name="source" accept=".json,application/json" required><p>정본 그래프는 관측 자료로 추가합니다. 자체 백업 복원은 이 브라우저 작업공간을 바꾸며 이전 상태를 복구용으로 남깁니다. 서버나 Drive는 변경하지 않습니다.</p><label class="inline"><input type="checkbox" name="confirm" required>범위와 저장 위치를 확인했습니다.</label>', async form => {
      const file = form.get('source'); if (file.size > 60 * 1024 * 1024) throw Error('한 번에 60MB까지 가져옵니다.');
      const data = JSON.parse(await file.text());
      if (data.format === 'ocp.browser.backup/1') { await store.restore(data); await app.refresh(); status('이 브라우저의 백업 복원 완료 · 원격 변경 없음'); }
      else await issue('import', { graph: sourceOnly(data) });
    });
  };
  async function augmentPanel() {
    const slot = host.querySelector('#detail-slot');
    const panel = slot.querySelector('.panel');
    if (!panel || panel.querySelector('.workbench-node-tools')) return;
    let n;
    try { n = JSON.parse(slot.dataset.node); } catch { return; }
    if (!n) return;
    const tools = document.createElement('div'); tools.className = 'workbench-node-tools';
    tools.innerHTML = [
      n.kind === 'raw' ? '<button data-extra="revision" title="원문을 바꾸지 않고 새 버전을 저장">새 버전 작성</button>' : '',
      n.nativeRef?.attachment ? '<button data-extra="attachment">첨부 원본 열기</button>' : '',
      n.kind === 'cloud' ? '<button data-extra="members">구름 펼치기</button>' : '',
      n.kind === 'code' ? '<button data-extra="download">HTML 내려받기</button><button data-extra="run">화면 실행</button>' : '',
      n.kind === 'design' ? '<button data-extra="revise-design">디자인 새 버전</button>' : '',
    ].join('');
    panel.querySelector('.actions')?.append(tools);
    if (n.kind === 'cloud') {
      const graph = (await store.snapshot()).graph;
      const members = graph.edges.filter(e => e.from === n.id && e.predicate === 'CONTAINS').map(e => graph.nodes.find(x => x.id === e.to)).filter(Boolean);
      const group = document.createElement('div'); group.className = 'cloud-nodes';
      group.innerHTML = '<h3>동일 원문 ID로 연결된 구름</h3>' + members.map(m => `<button data-cloudnode="${esc(m.id)}"><strong>${esc(m.title)}</strong><small>${esc(m.status)}</small><p>${esc((m.body || '').slice(0, 120))}</p></button>`).join('');
      group.onclick = event => { const id = event.target.closest('[data-cloudnode]')?.dataset.cloudnode; if (id) app.inspect(id); };
      panel.append(group);
    }
    tools.onclick = async event => {
      const id = event.target.closest('[data-extra]')?.dataset.extra;
      if (!id) return;
      if (id === 'revision') return modal('원문 새 버전', `<p>이전 원문은 보존합니다. 기존 구현에는 재검토 필요 표시가 붙습니다.</p><label>제목</label><input name="title" required value="${esc(n.title)}"><label>수정된 원문</label><textarea name="body" required rows="10">${esc(n.body)}</textarea>`, async form => issue('capture', {
        title: form.get('title'), body: form.get('body'), sourceSystem: n.source?.system || 'manual', sourceId: n.source?.id || n.id,
        sourceVersion: String(Number(n.source?.version) + 1 || Date.now()),
      }));
      if (id === 'revise-design') { await app.inspect(n.workId); host.querySelector('[data-command="design"]')?.click(); return; }
      if (id === 'members') { app.setView('inbox'); return; }
      if (id === 'download') { download('OCP-' + n.id.replace(/[^A-Za-z0-9_-]/g, '_') + '.html', n.body, 'text/html'); return; }
      if (id === 'run') {
        // Open a sandboxed viewer; generated user content never gains the workspace origin.
        modal('생성한 화면 실행', '<p>생성 HTML의 브라우저 실행입니다. 외부 서버 게시가 아닙니다.</p><iframe sandbox title="HTML 실행 화면" class="generated-preview"></iframe>');
        dialog.querySelector('iframe').srcdoc = n.body; return;
      }
      if (id === 'attachment') {
        const file = await store.getObject(n.nativeRef.attachment.key);
        if (!file?.blob) return status('이 브라우저에 첨부 바이트가 없습니다. 원본이 포함된 BU 백업을 복원하세요.');
        download(file.name, file.blob);
      }
    };
  }
  const observer = new MutationObserver(() => queueMicrotask(() => { if (!destroyed) augmentPanel(); }));
  observer.observe(host.querySelector('#detail-slot'), { childList: true, subtree: false, attributes: true, attributeFilter: ['data-node'] });
  const changed = () => { if (!host.querySelector('dialog[open]')) app.refresh(); else status('다른 탭에서 변경됐습니다. 현재 입력은 유지하며, 저장 시 버전을 다시 확인합니다.'); };
  store.events?.addEventListener('external-change', changed);
  // Source reads remain separate from generated forms. Selecting a module never self-approves it.
  await augmentPanel();
  return { app, store, issue, destroy() { destroyed = true; observer.disconnect(); store.events?.removeEventListener('external-change', changed); app.destroy(); store.close?.(); } };
}
