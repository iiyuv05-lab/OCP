import { emptyGraph, TIERS, HIERARCHY, escapeHTML as esc } from './core.mjs';
import { project, breadcrumb, sourceRelations } from './projector.mjs';
import { createRenderer } from './renderer.mjs';
const safeURL = (value) => {
  try {
    const u = new URL(value, location.href);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
};
const helpText = {
  pipeline:
    '01–08은 업무 좌표입니다. 같은 ID가 여러 티어에 참조될 수 있습니다. 볼트 폴더의 부모·자식 관계와는 별개입니다.',
  journey:
    '빌더: 근거→기획→디자인·코드→게시. 사용자: 외부 마케팅→랜딩→유입→게시 웹→UI→정보·기능→결과→Pain Point 해결. DB는 별도의 환류 회로입니다. 점선은 실제 측정이 아닌 여정 규칙입니다.',
  hierarchy:
    '컴퍼니→브랜드→프로덕트→페이지→모듈→에셋/분자→컴포넌트/아톰. 실제 폴더 포함 관계는 원본 탐색에서 별도로 보존합니다.',
  source:
    '본문을 확보한 파일만 정확한 줄 범위로 분해합니다. 분해는 의미 판정이 아닙니다. 미분류 파일을 임의로 특정 업무 티어에 넣지 않습니다.',
  inbox:
    'REP 입력은 BU에 원문으로 기록됩니다. 1차 분류→2차 검토→승격 승인→별도 적용을 거쳐야 구현 대상이 됩니다.',
  lens: 'CUI는 자연어, CLI는 코드·설정, GUI는 시각 표현입니다. 빌더·사용자 관점과 혼동하지 않고 같은 객체의 표현을 선택합니다.',
  archive:
    '모든 서버 명령은 Canonical DB와 불변 BU 이벤트 파일에 기록됩니다. Object 저장과 Google Drive 원격 동기화는 다른 상태입니다.',
  capture:
    '메모·메시지·문서 원문을 수집합니다. 제목과 본문을 저장해도 현재 구현 모델로 자동 승격되지 않습니다.',
  sync: '통합 Plmag 호스트에서는 현재 로그인 계정의 실제 REP 노트/구름/메시지 저장소를 읽습니다. 별도 Git OCP 서버는 원본 서버와 인증된 브리지를 연결해야 합니다. 연결 안 됨을 빈 데이터 성공으로 표시하지 않습니다.',
  grab: '드래그로 화면을 잡아 이동합니다. H, Space+드래그, Shift+드래그, WASD·방향키를 사용할 수 있습니다.',
  rotate:
    '드래그로 3D 방향을 바꿉니다. V: 회전 / H: 그랩 / R: 전체 맞춤. 캔버스를 클릭하면 키보드 포커스가 연결됩니다.',
  gap: 'CUI·CLI·GUI의 깊이 간격입니다. 0은 같은 평면입니다. 업무 단계나 원본 계층은 바꾸지 않습니다.',
  opacity:
    '캔버스와 연결선 투명도입니다. 데이터·상태·권한을 변경하지 않습니다.',
  billboard:
    '항상 정면은 카메라를 향해 읽기 쉽게 표시합니다. 끄면 원래 3D 평면에 고정되어 측면과 두께가 드러납니다.',
  export:
    '개인 그래프와 증거를 로컬 파일로 내보냅니다. 내보내기는 운영 반영이나 원격 동기화가 아닙니다.',
};
export async function mount(host, options = {}) {
  host.classList.add('ocp-studio');
  const state = {
    graph: emptyGraph(),
    view: 'pipeline',
    scope: 'company:pmg',
    selected: null,
    tier: '',
    lens: 'ALL',
    gap: 1,
    actor: null,
    mode: 'unknown',
    fileRoot: 'source:Plmag',
    busy: false,
  };
  let api = options.adapter;
  if (!api) {
    const base = options.api || '/api/studio';
    api = {
      async snapshot() {
        return request(base);
      },
      async command(command) {
        return request(base, { method: 'POST', body: JSON.stringify(command) });
      },
      async detail(id) {
        return request(base + '?id=' + encodeURIComponent(id));
      },
      async source(id) {
        return request(base + '?source=' + encodeURIComponent(id));
      },
      async rep(payload) {
        return request(base + '/rep', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      },
      async localRelease(id) {
        return request(base + '/local-release', {
          method: 'POST',
          body: JSON.stringify({ id }),
        });
      },
      async localSession() {
        return request(base + '/session', { method: 'POST', body: '{}' });
      },
    };
  }
  async function request(url, init = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw Error('서버가 JSON 대신 다른 응답을 반환했습니다.');
    }
    if (!response.ok)
      throw Object.assign(Error(data.error || '요청을 완료하지 못했습니다.'), {
        status: response.status,
      });
    return data;
  }
  const ctl = (id, label, tip, extra = '') =>
    `<span class="hint-control"><button data-action="${id}" data-tip="${esc(tip)}" ${extra}>${label}</button><button class="help" data-help="${id}" aria-label="${esc(tip)} 도움말">?</button></span>`;
  host.innerHTML = `<header><button class="mobile-menu" data-action="menu" aria-label="구조 메뉴">☰</button><i class="logo-line" aria-hidden="true"></i><div class="wordmark">OCP <small>PRODUCT STUDIO / 08</small></div><span class="env" id="env">정본 연결 확인 중</span>${ctl('capture', '＋ 원문', 'REP 원문 입력')}<button data-action="sync" data-tip="현재 REP 노트·구름 캔버스 연결">REP 연결</button><button class="help" data-help="sync" aria-label="REP 연결 도움말">?</button></header>
 <div class="workspace"><aside><div class="section-label">ONE GRAPH · THREE SYSTEMS</div><div class="row"><span class="pill">REP · 판단</span><span class="pill">BU · 보존</span><span class="pill">OCP · 구현</span></div><input class="tree-search" aria-label="캔버스 검색" placeholder="파일 · 문서 · 객체 검색"><div id="scope-tree"></div><div class="section-label">WORK COORDINATE</div><select id="tier" aria-label="업무 단계"><option value="">모든 업무 단계</option>${[
   ...TIERS,
 ]
   .reverse()
   .map((t) => `<option value="${t[0]}">${t[0]} ${t[1]}</option>`)
   .join(
     '',
   )}</select><div class="row"><select id="lens" aria-label="표현 언어"><option value="ALL">CUI + CLI + GUI</option><option>CUI</option><option>CLI</option><option>GUI</option></select><button class="help" data-help="lens" aria-label="표현 언어 도움말">?</button></div><div class="status" id="status"></div><div class="section-label">SOURCE BOUNDARY</div><p class="subtle">폴더·파일·진행 상태는 확보한 원본과 실행 증거만 표시합니다. 빈 근거를 구현 완료로 채우지 않습니다.</p></aside>
 <main><canvas class="stage" tabindex="0" aria-label="OCP 3D 정본 캔버스"></canvas><nav class="viewbar">${[
   ['pipeline', '통합 3D', '업무 좌표'],
   ['journey', '대칭 여정 ③', '빌더와 사용자 가치 여정'],
   ['hierarchy', '서열', '컴퍼니부터 아톰까지'],
   ['source', '원본', '볼트·파일 내부 탐색'],
   ['inbox', 'REP 수신함', '입력과 승격 대기열'],
 ]
   .map((x) => ctl(...x))
   .join(
     '',
   )}</nav><div class="stats" id="stats"></div><div class="stage-label">CANONICAL GRAPH → PROJECTION → CANVAS<br><span id="key-status">캔버스 클릭 · WASD 이동 · 1/2/3 뷰 · R 맞춤</span></div><div class="dock">${ctl('archive', '▤ BU 기록', '이벤트와 원격 보존 상태')}${ctl('list', '☷ 목록', '캔버스의 텍스트 대안')}${ctl('export', '↥ 내보내기', '정본 JSON 내려받기')}</div><div id="detail-slot"></div><div id="empty-slot"></div><div id="toast-slot" aria-live="polite"></div></main></div>
 <footer>${ctl('rotate', '↻ 회전', '회전 모드 V')}${ctl('grab', '✋ 이동', '그랩 모드 H')}<button data-action="fit" title="전체 맞춤 R">맞춤</button><label>확대 <input id="zoom" type="range" min="-3" max="2.70927" step=".01" value="0" aria-label="확대 배율"><output id="zoom-value">100%</output></label><label>간격 <input id="gap" type="range" min="0" max="2" step=".01" value="1" aria-label="캔버스 깊이 간격"><button class="help" data-help="gap" aria-label="간격 도움말">?</button></label><label>투시 <input id="opacity" type="range" min=".05" max="1" step=".01" value="1" aria-label="투명도"><button class="help" data-help="opacity" aria-label="투시 도움말">?</button></label><label><input id="guides" type="checkbox" checked>업무선</label><label><input id="billboard" type="checkbox" checked>항상 정면<button class="help" data-help="billboard" aria-label="방향 도움말">?</button></label></footer><dialog></dialog>`;
  const $ = (s) => host.querySelector(s),
    canvas = $('canvas'),
    dialog = $('dialog');
  const renderer = createRenderer(canvas, {
    select: (id) => select(id),
    view: (v) => setView(v),
    key: (key) => ($('#key-status').textContent = '키 수신: ' + key),
    mode: (m) => toast(m === 'grab' ? '그랩 이동' : '회전'),
    onFrame: (info) => {
      $('#zoom-value').textContent =
        (info.zoom * 100).toFixed(info.zoom < 0.01 ? 2 : 0) + '%';
      $('#stats').textContent =
        `r${state.graph.revision} · 화면 ${info.visible} / 투영 ${info.total} · 정본 ${state.graph.nodes.length}개`;
    },
    resolveImage: (src) => options.images?.[src] || '/' + src,
  });
  function toast(text, error = false) {
    $('#toast-slot').innerHTML =
      `<div class="toast ${error ? 'error' : ''}">${esc(text)}</div>`;
    setTimeout(() => ($('#toast-slot').innerHTML = ''), 6500);
  }
  function setView(view) {
    state.view = view;
    $('#detail-slot').innerHTML = '';
    renderScene();
  }
  function renderScene(refit = true) {
    renderer.setScene(project(state.graph, state), refit);
    host
      .querySelectorAll('[data-action]')
      .forEach((b) =>
        b.classList.toggle('active', b.dataset.action === state.view),
      );
  }
  function renderTree() {
    const list = state.graph.nodes.filter((n) =>
      ['company', 'brand', 'product'].includes(n.kind),
    );
    const known = new Set(list.map((n) => n.id));
    const children = new Map();
    const parented = new Set();
    for (const e of state.graph.edges) {
      if (e.predicate !== 'CONTAINS' || !known.has(e.from) || !known.has(e.to))
        continue;
      if (!children.has(e.from)) children.set(e.from, []);
      children.get(e.from).push(e.to);
      parented.add(e.to);
    }
    const byId = new Map(list.map((n) => [n.id, n]));
    const hierarchyRows = [],
      seen = new Set();
    function append(id) {
      if (seen.has(id)) return;
      seen.add(id);
      hierarchyRows.push(byId.get(id));
      for (const child of children.get(id) || []) append(child);
    }
    for (const n of list
      .filter((n) => !parented.has(n.id))
      .sort(
        (a, b) => Number(b.kind === 'company') - Number(a.kind === 'company'),
      ))
      append(n.id);
    for (const n of list) append(n.id);
    $('#scope-tree').innerHTML = hierarchyRows
      .map(
        (n) =>
          `<button class="scope ${n.kind} ${n.id === state.scope ? 'active' : ''}" data-scope="${esc(n.id)}">${n.kind === 'company' ? '◇ ' : n.kind === 'brand' ? '▧ ' : '↳ '}${esc(n.title)}</button>`,
      )
      .join('');
    const count = (kind) =>
      state.graph.nodes.filter((n) => n.kind === kind).length;
    $('#status').innerHTML =
      `<b>${count('raw')} 원문</b> · ${count('decision')} 판정<br>${state.graph.nodes.filter((n) => n.decisionId).length} 구현 대상 · ${count('code')} 코드<br><small>BU 기록 ${state.graph.journal.length}건 / 원격 Drive는 별도 확인</small>`;
  }
  async function load() {
    try {
      const data = await api.snapshot();
      state.graph = data.graph;
      state.actor = data.actor;
      state.mode = data.mode || 'server';
      $('#env').textContent = data.label || 'OCP 인증 서버 · 저장소 응답 확인';
      $('#empty-slot').innerHTML = '';
      renderTree();
      renderScene();
    } catch (e) {
      $('#env').textContent = '연결 미완료 · 저장 성공 아님';
      $('#empty-slot').innerHTML =
        `<div class="empty"><h2>인증된 원본을 연결하세요.</h2><p>${esc(e.message)}</p><p class="subtle">기존 OCP 호스트는 로그인·멤버 권한이 필요합니다. 로컬 검증 서버에서만 아래 세션이 제공됩니다.</p><button data-action="local-session">로컬 검증 세션 시작</button></div>`;
    }
  }
  async function run(type, payload) {
    if (state.busy) return;
    state.busy = true;
    try {
      const result = await api.command({
        id: 'cmd-' + crypto.randomUUID(),
        expectedRevision: state.graph.revision,
        type,
        payload,
      });
      state.graph = result.graph;
      renderTree();
      renderScene(false);
      toast(
        `저장 확인 · r${state.graph.revision} · ${result.result?.id || type}`,
      );
      if (result.result?.id) await select(result.result.id);
      return result;
    } catch (e) {
      toast(e.message, true);
      if (e.status === 409) await load();
      throw e;
    } finally {
      state.busy = false;
    }
  }
  function modal(title, body, onSubmit) {
    dialog.innerHTML = `<form><h2>${esc(title)}</h2>${body}<div class="buttons"><button type="button" data-action="close-dialog">닫기</button>${onSubmit ? '<button class="primary" type="submit">확인 · 기록</button>' : ''}</div></form>`;
    dialog.showModal();
    const form = dialog.querySelector('form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submit = form.querySelector('[type=submit]');
      submit.disabled = true;
      try {
        await onSubmit(Object.fromEntries(new FormData(form)));
        dialog.close();
      } catch {
        submit.disabled = false;
      }
    };
  }
  async function select(id) {
    state.selected = id;
    renderer.select(id);
    let n = state.graph.nodes.find((x) => x.id === id);
    if (!n) {
      toast(
        '이 표지는 실제 데이터가 아니라 여정의 표준 단계입니다. 원본·실측 연결이 필요합니다.',
      );
      return;
    }
    if (n.bodyOmitted) {
      try {
        n = (await api.detail(id)).node;
      } catch (e) {
        toast(e.message, true);
        return;
      }
    }
    let actions = '';
    if (n.kind === 'raw')
      actions += `<button data-command="classify">2차 분류</button><button data-command="review" ${n.status !== 'classified' ? 'disabled' : ''}>승격 검토</button>`;
    if (n.kind === 'decision' && n.status === 'approved')
      actions +=
        '<button class="primary" data-command="apply">승인 적용</button>';
    if (n.decisionId)
      actions +=
        '<button class="primary" data-command="design">디자인 설계</button>';
    if (n.kind === 'design')
      actions +=
        '<button class="primary" data-command="code">디자인 → 코드</button>';
    if (n.kind === 'code')
      actions +=
        '<button class="primary" data-command="request-release">런칭 빔 게시 요청</button>';
    if (
      n.kind === 'deployment' &&
      n.status === 'queued' &&
      state.mode === 'local'
    )
      actions +=
        '<button class="primary" data-command="local-release">로컬 주소에 게시·검증</button>';
    if (
      [
        'folder',
        'file',
        'element',
        'company',
        'brand',
        'product',
        'page',
        'module',
        'asset',
      ].includes(n.kind)
    )
      actions += '<button data-command="children">내부 캔버스 열기</button>';
    const relations = sourceRelations(state.graph, id);
    $('#detail-slot').innerHTML =
      `<section class="panel"><button class="close" data-action="close-panel" aria-label="상세 닫기">×</button><div class="section-label">${esc(n.kind.toUpperCase())} · ${esc(n.id)}</div><h2>${esc(n.title)}</h2><div class="lineage">${esc(breadcrumb(state.graph, id).join(' / '))}</div><p>${esc(n.status)} <span class="pill">${esc(n.model || 'observed')} / ${esc(n.stateKind || 'unknown')}</span></p>${n.readiness ? '<pre>' + esc(JSON.stringify(n.readiness, null, 2)) + '</pre>' : ''}<div>${n.tiers.map((t) => '<span class="pill">' + esc(t) + ' ' + esc(TIERS.find((x) => x[0] === t)?.[1]) + '</span>').join('') || '<span class="pill">업무 분류 미검토</span>'}</div>${n.body ? '<pre>' + esc(n.body.slice(0, 9000)) + '</pre>' : ''}${n.spec ? '<pre>' + esc(JSON.stringify(n.spec, null, 2)) + '</pre>' : ''}${n.kind === 'code' ? '<iframe title="생성된 실제 화면" sandbox></iframe>' : ''}${n.url ? '<p><a href="' + esc(safeURL(n.url)) + '" target="_blank" rel="noopener noreferrer">' + esc(safeURL(n.url)) + '</a></p>' : ''}<div class="actions">${actions}<button data-command="message">REP 메시지</button><button data-command="lineage">관련 연결</button></div><h3>출처 · 상태</h3><pre>${esc(JSON.stringify(n.source || { note: '이 작업에서 생성된 산출물' }, null, 2))}</pre><h3>관계 ${relations.length}개</h3><div class="lineage">${relations
        .slice(0, 14)
        .map(
          (e) => esc(e.predicate) + ' → ' + esc(e.from === id ? e.to : e.from),
        )
        .join('<br>')}</div></section>`;
    if (n.kind === 'code') $('#detail-slot iframe').srcdoc = n.body;
    $('#detail-slot').dataset.node = JSON.stringify(n);
  }
  async function commandUI(type) {
    const n = JSON.parse($('#detail-slot').dataset.node || 'null');
    if (!n) return;
    if (type === 'children') {
      state.view = 'source';
      state.fileRoot = n.id;
      renderScene();
      $('#detail-slot').innerHTML = '';
      return;
    }
    if (type === 'lineage') {
      state.view = 'lineage';
      renderScene();
      return;
    }
    if (type === 'classify')
      modal(
        'REP · 2차 분류',
        `<p>현재 원문을 어떤 업무의 근거로 사용하는지 직접 확인합니다. 분류는 승격이 아닙니다.</p><label>업무 단계</label><select name="tier">${TIERS.map((t) => `<option value="${t[0]}">${t[0]} ${t[1]}</option>`).join('')}</select><label>분류 근거</label><textarea name="rationale" required></textarea>`,
        (p) =>
          run('classify', {
            id: n.id,
            tiers: [p.tier],
            rationale: p.rationale,
          }),
      );
    if (type === 'review')
      modal(
        'REP · 승격 판정',
        `<p>자동 승격하지 않습니다. 원문과 완료 기준을 검토해 승인하고, 적용은 다음 단계에서 별도로 실행합니다.</p><label>상위 객체</label><select name="parentId">${state.graph.nodes
          .filter((x) => HIERARCHY.includes(x.kind) && x.kind !== 'atom')
          .map(
            (x) =>
              `<option value="${esc(x.id)}" ${x.id === 'product:ocp' ? 'selected' : ''}>${esc(x.kind + ' / ' + x.title)}</option>`,
          )
          .join(
            '',
          )}</select><label>구현 대상 이름</label><input name="targetTitle" value="${esc(n.title)}" required><label>승격 근거</label><textarea name="rationale" required></textarea><label>완료 판정 기준</label><textarea name="acceptance" required></textarea><label class="inline"><input type="checkbox" name="approve" required>원문과 완료 기준을 검토했습니다.</label>`,
        (p) => {
          const parent = state.graph.nodes.find((x) => x.id === p.parentId);
          return run('review', {
            id: n.id,
            ...p,
            approve: !!p.approve,
            targetKind: HIERARCHY[HIERARCHY.indexOf(parent.kind) + 1],
            evidenceIds: [n.id],
          });
        },
      );
    if (type === 'apply') await run('apply', { id: n.id });
    if (type === 'design')
      modal(
        'OCP · GUI 화면 설계',
        `<p>승격 기획: ${esc(n.title)}. 디자인 데이터와 생성 코드는 같은 ID의 요구사항에 연결됩니다.</p><label>화면 헤드라인</label><input name="heading" value="${esc(n.title)}" required><label>본문</label><textarea name="body" required>${esc(n.body || '')}</textarea><label>CTA 버튼</label><input name="cta" value="시작하기" required><label>세부 내용</label><textarea name="detail"></textarea>`,
        (p) => run('design', { id: n.id, ...p }),
      );
    if (type === 'code') await run('code', { id: n.id });
    if (type === 'request-release')
      modal(
        '런칭 빔 · 게시 요청',
        `<p>빌드 해시: ${esc(n.sha256)}<br>요청 생성은 게시 성공이 아닙니다. 실제 실행기 결과가 있어야 주소가 생성됩니다.</p><label>채널</label><select name="channel"><option value="preview">검증용 preview</option><option value="production">운영 production · 별도 권한 필요</option></select>`,
        (p) => run('request-release', { id: n.id, ...p }),
      );
    if (type === 'local-release') {
      try {
        const data = await api.localRelease(n.id);
        await load();
        toast('로컬 HTTP 게시와 응답 해시 확인 완료. 운영 게시가 아닙니다.');
        if (data.result?.id) await select(data.result.id);
      } catch (e) {
        toast(e.message, true);
      }
    }
    if (type === 'message')
      modal(
        'REP · 작업 메시지',
        `<p>${esc(n.title)}에 연결할 메시지입니다. 에이전트 실행으로 자동 처리하지 않습니다.</p><label>메시지</label><textarea name="body" required></textarea><label class="inline"><input type="checkbox" name="agentRequest">에이전트 작업 제안으로 기록</label>`,
        (p) =>
          run('message', {
            targetId: n.id,
            body: p.body,
            agentRequest: !!p.agentRequest,
          }),
      );
  }
  const abort = new AbortController();
  host.addEventListener(
    'click',
    async (e) => {
      const help = e.target.closest('[data-help]');
      if (help) {
        modal(
          '조작 가이드',
          `<p>${esc(helpText[help.dataset.help] || '원본 ID와 저장 상태를 유지하며 해당 화면의 조작을 실행합니다.')}</p>`,
        );
        return;
      }
      const scope = e.target.closest('[data-scope]');
      if (scope) {
        state.scope = scope.dataset.scope;
        state.view = 'pipeline';
        $('#detail-slot').innerHTML = '';
        renderTree();
        renderScene();
        return;
      }
      const cmd = e.target.closest('[data-command]');
      if (cmd) {
        try {
          await commandUI(cmd.dataset.command);
        } catch {
          /* The command already surfaced the server error in the toast. */
        }
        return;
      }
      const b = e.target.closest('[data-action]');
      if (!b) return;
      const action = b.dataset.action;
      if (
        ['pipeline', 'journey', 'hierarchy', 'source', 'inbox'].includes(action)
      )
        return setView(action);
      if (action === 'menu') $('aside').classList.toggle('open');
      if (action === 'close-panel') $('#detail-slot').innerHTML = '';
      if (action === 'close-dialog') dialog.close();
      if (action === 'fit') renderer.fit();
      if (action === 'grab' || action === 'rotate') {
        renderer.configure({ grab: action === 'grab' });
        canvas.focus();
      }
      if (action === 'local-session') {
        try {
          await api.localSession();
          await load();
        } catch (error) {
          toast(error.message, true);
        }
      }
      if (action === 'capture')
        modal(
          'REP → BU · 원문 입력',
          `<p>원문을 불변 자료로 저장하고, BU 1차 분류 대기열에 넣습니다.</p><label>제목</label><input name="title" required><label>유형</label><select name="sourceSystem"><option value="manual">직접 메모</option><option value="document">문서</option><option value="research">조사서</option><option value="recording">녹음의 텍스트 기록</option><option value="call-recording">통화녹음의 텍스트 기록</option></select><label>원문</label><textarea name="body" required rows="8"></textarea>`,
          (p) => run('capture', p),
        );
      if (action === 'sync') {
        try {
          const data = await api.rep({ mode: 'snapshot', includeCloud: true });
          await load();
          toast(
            `REP 원본 ${data.imported || 0}개 연결. 원본을 이동·삭제하지 않았습니다.`,
          );
        } catch (error) {
          toast(error.message, true);
        }
      }
      if (action === 'archive')
        modal(
          'BU · 불변 이벤트 기록',
          `<p>DB에 기록된 이벤트와 별도 저장소의 확인 상태입니다. Drive pending은 원격 동기화 완료가 아닙니다.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(JSON.stringify(state.graph.journal.slice(-20), null, 2))}</pre><p>확보 범위</p><pre style="white-space:pre-wrap">${esc(JSON.stringify(state.graph.coverage, null, 2))}</pre>`,
        );
      if (action === 'export') {
        const blob = new Blob([JSON.stringify(state.graph, null, 2)], {
            type: 'application/json',
          }),
          url = URL.createObjectURL(blob),
          a = document.createElement('a');
        a.href = url;
        a.download = 'OCP-v8-Canonical-Graph.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('로컬 JSON 내보내기. 외부 게시·동기화 아님.');
      }
      if (action === 'list')
        showList(
          state.graph.nodes
            .filter((n) => !['element', 'file', 'folder'].includes(n.kind))
            .slice(0, 100),
        );
    },
    { signal: abort.signal },
  );
  function showList(nodes) {
    $('#detail-slot').innerHTML =
      `<div class="list"><button data-action="close-panel">목록 닫기</button>${nodes.map((n) => `<button data-select="${esc(n.id)}"><b>${esc(n.title)}</b><small>${esc(n.kind)} · ${esc(n.status)} · ${esc(n.id)}</small></button>`).join('')}</div>`;
    $('#detail-slot')
      .querySelectorAll('[data-select]')
      .forEach((b) => (b.onclick = () => select(b.dataset.select)));
  }
  $('.tree-search').oninput = (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) {
      $('#detail-slot').innerHTML = '';
      return;
    }
    showList(
      state.graph.nodes
        .filter((n) => (n.title + ' ' + n.id).toLowerCase().includes(q))
        .slice(0, 60),
    );
  };
  $('#tier').onchange = (e) => {
    state.tier = e.target.value;
    renderScene();
  };
  $('#lens').onchange = (e) => {
    state.lens = e.target.value;
    renderScene();
  };
  $('#gap').oninput = (e) => {
    state.gap = Number(e.target.value);
    renderer.configure({ gap: state.gap });
    renderScene(false);
  };
  $('#opacity').oninput = (e) =>
    renderer.configure({ opacity: Number(e.target.value) });
  $('#zoom').oninput = (e) => renderer.zoom(10 ** Number(e.target.value));
  $('#guides').onchange = (e) =>
    renderer.configure({ guides: e.target.checked });
  $('#billboard').onchange = (e) =>
    renderer.configure({ billboard: e.target.checked });
  let tip;
  host.addEventListener(
    'pointerover',
    (e) => {
      const b = e.target.closest('[data-tip]');
      if (!b) return;
      tip?.remove();
      tip = document.createElement('div');
      tip.className = 'hover-tip';
      tip.textContent = b.dataset.tip;
      host.append(tip);
      const r = b.getBoundingClientRect();
      tip.style.left = Math.min(innerWidth - 220, r.left) + 'px';
      tip.style.top = Math.min(innerHeight - 50, r.bottom + 6) + 'px';
    },
    { signal: abort.signal },
  );
  host.addEventListener(
    'pointerout',
    (e) => {
      if (e.target.closest('[data-tip]')) {
        tip?.remove();
        tip = null;
      }
    },
    { signal: abort.signal },
  );
  await load();
  return {
    getState: () => state,
    refresh: load,
    destroy() {
      renderer.destroy();
      abort.abort();
      host.innerHTML = '';
    },
  };
}
