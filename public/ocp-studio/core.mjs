/** OCP v8: canonical commands. No coordinates, browser state or network calls. */
export const VERSION = '8.0.1';
export const HIERARCHY = [
  'company',
  'brand',
  'product',
  'page',
  'module',
  'asset',
  'atom',
];
export const TIERS = [
  ['01', '기획 · 비전', 'STRATEGY'],
  ['02', '데이터 · 근거', 'DATA & EVIDENCE'],
  ['03', '운영 · 배포', 'OPERATIONS'],
  ['04', '기능 · 서비스', 'PRODUCT LOGIC'],
  ['05', 'UI · 사용자 경험', 'INTERFACE'],
  ['06', '스킨 · 브랜드', 'BRAND & SKIN'],
  ['07', '랜딩 · 전환', 'LANDING'],
  ['08', '마케팅 · 유입', 'REACH & GROWTH'],
];
export const USER_FLOW = [
  'external-marketing',
  'landing',
  'inflow',
  'published-web',
  'product-ui',
  'product-information',
  'feature-execution',
  'outcome',
  'pain-resolution',
];
export const BUILDER_FLOW = [
  'pain-point',
  'evidence',
  'goal',
  'requirement',
  'design',
  'implementation',
  'build',
  'deployment',
];
export class DomainError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
const fail = (condition, code, text, status = 400) => {
  if (!condition) throw new DomainError(code, text, status);
};
export const escapeHTML = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
export async function digest(value) {
  const bytes = new TextEncoder().encode(
    typeof value === 'string' ? value : JSON.stringify(value),
  );
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
export function emptyGraph(workspace = 'private') {
  return {
    schema: 'ocp.studio.graph/8',
    workspace,
    revision: 0,
    nodes: [],
    edges: [],
    events: [],
    commands: [],
    coverage: [],
    journal: [],
  };
}
export function node(g, id) {
  const found = g.nodes.find((n) => n.id === id);
  fail(found, 'NOT_FOUND', '해당 객체를 찾을 수 없습니다.', 404);
  return found;
}
export function edge(g, from, to, predicate, extra = {}) {
  const id = `${from}|${predicate}|${to}`;
  if (!g.edges.some((e) => e.id === id))
    g.edges.push({ id, from, to, predicate, stateKind: 'observed', ...extra });
}
export function validateGraph(g) {
  fail(
    g?.schema === 'ocp.studio.graph/8' &&
      Array.isArray(g.nodes) &&
      Array.isArray(g.edges),
    'SCHEMA',
    'v8 그래프 형식이 아닙니다.',
  );
  fail(
    g.nodes.length <= 100000 && g.edges.length <= 250000,
    'LIMIT',
    '한 번에 가져올 수 있는 그래프 크기를 초과했습니다.',
    413,
  );
  const ids = new Set();
  for (const n of g.nodes) {
    fail(
      typeof n.id === 'string' && n.id.length <= 600 && !ids.has(n.id),
      'IDENTITY',
      '객체 ID가 잘못되었거나 중복되었습니다.',
    );
    ids.add(n.id);
    fail(
      typeof n.title === 'string' && n.title.length <= 1000,
      'TITLE',
      '객체 제목을 확인하세요.',
    );
    fail(
      !['x', 'y', 'z', 'screenX', 'screenY'].some((key) =>
        Object.hasOwn(n, key),
      ),
      'COORDINATES',
      '정본에는 화면 좌표를 저장하지 않습니다.',
    );
    fail(
      Array.isArray(n.tiers) &&
        n.tiers.every((t) => TIERS.some((row) => row[0] === t)),
      'TIER',
      '업무 분류를 확인하세요.',
    );
    fail(
      Array.isArray(n.representations) &&
        n.representations.every((t) => ['CUI', 'CLI', 'GUI'].includes(t)),
      'REPRESENTATION',
      '표현 형식을 확인하세요.',
    );
  }
  const adjacency = new Map();
  for (const e of g.edges) {
    fail(
      ids.has(e.from) && ids.has(e.to),
      'DANGLING',
      '연결선의 원본 또는 대상이 없습니다.',
    );
    if (e.predicate === 'CONTAINS') {
      const a = node(g, e.from),
        b = node(g, e.to);
      if (HIERARCHY.includes(a.kind) && HIERARCHY.includes(b.kind))
        fail(
          HIERARCHY.indexOf(b.kind) === HIERARCHY.indexOf(a.kind) + 1,
          'HIERARCHY',
          '서열 단계를 건너뛸 수 없습니다.',
        );
      const list = adjacency.get(e.from) || [];
      list.push(e.to);
      adjacency.set(e.from, list);
    }
  }
  const done = new Set(),
    active = new Set();
  function visit(id) {
    fail(!active.has(id), 'CYCLE', '포함 관계에 순환이 있습니다.');
    if (done.has(id)) return;
    active.add(id);
    for (const next of adjacency.get(id) || []) visit(next);
    active.delete(id);
    done.add(id);
  }
  for (const id of ids) visit(id);
  return true;
}
function put(g, n) {
  fail(
    !g.nodes.some((x) => x.id === n.id),
    'DUPLICATE',
    '이미 존재하는 객체입니다.',
    409,
  );
  g.nodes.push(n);
  return n;
}
function make(id, kind, title, context, extra = {}) {
  return {
    id,
    kind,
    title,
    model: 'observed',
    stateKind: 'observed',
    status: 'captured',
    tiers: ['02'],
    representations: ['CUI'],
    validFrom: context.now,
    recordedFrom: context.now,
    source: null,
    ...extra,
  };
}
function requireRole(actor, roles) {
  fail(
    actor && roles.includes(actor.role),
    'FORBIDDEN',
    '이 작업을 수행할 권한이 없습니다.',
    actor ? 403 : 401,
  );
}
function nonempty(value, name, max = 100000) {
  fail(
    typeof value === 'string' && value.trim().length > 0 && value.length <= max,
    'VALIDATION',
    `${name}을(를) 확인해 주세요.`,
  );
  return value.trim();
}
function hierarchyPath(g, id) {
  const result = [],
    seen = new Set();
  let current = id;
  while (current && !seen.has(current)) {
    seen.add(current);
    result.unshift(node(g, current).title);
    current = g.edges.find(
      (e) => e.to === current && e.predicate === 'CONTAINS',
    )?.from;
  }
  return result;
}
export function designToHTML(design) {
  const d = design.spec;
  const sections = (d.sections || [])
    .map(
      (s) =>
        `<section data-entity-id="${escapeHTML(s.entityId)}"><div class="eyebrow">${escapeHTML(s.kind)}</div><h2>${escapeHTML(s.title)}</h2><p>${escapeHTML(s.body)}</p></section>`,
    )
    .join('');
  return `<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHTML(d.heading)}</title>\n<style>*{box-sizing:border-box}body{margin:0;background:#f5f4ef;color:#151914;font:16px/1.7 system-ui,sans-serif}header,main,footer{max-width:1050px;margin:auto;padding:36px 24px}header{border-bottom:1px solid #cbd2c5;font-weight:700;letter-spacing:.1em}main{min-height:65vh;padding-top:80px}.eyebrow{font-size:12px;letter-spacing:.18em}h1{font-size:clamp(32px,6vw,70px);line-height:1.14;max-width:850px}p{max-width:650px;white-space:pre-line}a{display:inline-block;background:#233629;color:#fff;padding:14px 22px;border-radius:6px;text-decoration:none}section{margin:52px 0 20px;padding:24px;border:1px solid #cbd2c5;border-radius:12px}footer{font-size:12px;color:#53614f}@media(max-width:600px){main{padding-top:34px}}
</style></head><body><header>${escapeHTML(d.brand || 'Plus Minus G.')}</header><main><div class="eyebrow">${escapeHTML(d.eyebrow || 'PRODUCT / WORKING DESIGN')}</div><h1>${escapeHTML(d.heading)}</h1><p>${escapeHTML(d.body)}</p><a href="#details">${escapeHTML(d.cta)}</a>${sections}<section id="details"><h2>다음 단계</h2><p>${escapeHTML(d.detail || '이 화면은 승인된 기획과 디자인에서 생성된 실행 가능한 산출물입니다.')}</p></section></main><footer>OCP · ${escapeHTML(design.id)} · 게시 환경의 인증·서버 검증은 별도입니다.</footer></body></html>`;
}
/** Every command is applied on a clone. Failed checks never mutate the caller. */
export async function execute(before, command, context) {
  requireRole(context.actor, ['writer', 'reviewer', 'admin']);
  fail(
    command &&
      typeof command.id === 'string' &&
      /^[A-Za-z0-9_-]{6,100}$/.test(command.id),
    'COMMAND_ID',
    '요청 ID가 필요합니다.',
  );
  const payloadHash = await digest({
    type: command.type,
    payload: command.payload || {},
  });
  const old = before.commands.find((c) => c.id === command.id);
  if (old) {
    fail(
      old.hash === payloadHash,
      'IDEMPOTENCY_CONFLICT',
      '같은 요청 ID에 다른 내용이 들어왔습니다.',
      409,
    );
    return { graph: before, result: old.result, duplicate: true };
  }
  fail(
    command.expectedRevision === before.revision,
    'REVISION_CONFLICT',
    '다른 작업이 먼저 저장되었습니다. 새로 불러온 뒤 이어서 작업하세요.',
    409,
  );
  const g = structuredClone(before),
    p = command.payload || {};
  const clock = Date.parse(context.now || new Date().toISOString());
  fail(Number.isFinite(clock), 'CLOCK', '유효한 서버 시각이 필요합니다.');
  const previous = Date.parse(before.events.at(-1)?.recordedAt || 0) || 0;
  const ctx = {
    ...context,
    now: new Date(Math.max(clock, previous + 1)).toISOString(),
  };
  let result = {},
    changed = [];
  if (command.type === 'capture') {
    // Preserve raw whitespace and line endings; validation is not a transformation.
    fail(typeof p.body === 'string', 'INPUT', '원문은 문자열이어야 합니다.');
    nonempty(p.body, '원문');
    const body = p.body,
      title = nonempty(p.title || body.slice(0, 90), '제목', 180);
    const sha = await digest(body),
      sourceSystem = [
        'rep-note',
        'rep-message',
        'rep-cloud',
        'document',
        'recording',
        'call-recording',
        'research',
        'manual',
      ].includes(p.sourceSystem)
        ? p.sourceSystem
        : 'manual';
    const source = {
      system: sourceSystem,
      id: String(p.sourceId || command.id),
      version: String(p.sourceVersion ?? 1),
      url: p.sourceUrl || null,
      sha256: sha,
    };
    const same = g.nodes.find(
      (n) =>
        n.source?.system === source.system &&
        n.source?.id === source.id &&
        n.source?.version === source.version,
    );
    if (same) {
      fail(
        same.source.sha256 === sha,
        'SOURCE_CONFLICT',
        '같은 원본 버전의 내용이 달라졌습니다.',
        409,
      );
      result = { id: same.id, sourceDuplicate: true };
    } else {
      const id = `raw:${command.id}`,
        n = put(
          g,
          make(id, 'raw', title, ctx, {
            body,
            source,
            immutable: true,
            status: 'classified-first',
            classification: {
              primary: ['02'],
              method: 'capture provenance only',
              semanticReview: 'pending',
            },
            bu: { key: `raw/${sha}.txt`, state: 'pending' },
            nativeRef: p.nativeRef || null,
          }),
        );
      if (p.parentId) {
        node(g, p.parentId);
        edge(g, p.parentId, id, 'STORES');
      }
      const previousSource = g.nodes
        .filter(
          (x) =>
            x.id !== id &&
            x.source?.system === source.system &&
            x.source?.id === source.id,
        )
        .at(-1);
      if (previousSource) {
        edge(g, id, previousSource.id, 'SUPERSEDES');
        for (const work of g.nodes.filter(
          (x) => x.requirement?.sourceId === previousSource.id,
        )) {
          work.sourceAlert = { latestRawId: id, approvalRecheckRequired: true };
          changed.push(work.id);
        }
      }
      changed.push(n.id);
      result = {
        id,
        sha256: sha,
        canonicalChanged: false,
        primaryClassification: '02',
        semanticReview: 'pending',
      };
    }
  } else if (command.type === 'classify') {
    const n = node(g, p.id);
    fail(n.kind === 'raw', 'TARGET', '원문 캔버스만 2차 분류할 수 있습니다.');
    fail(
      Array.isArray(p.tiers) &&
        p.tiers.length &&
        p.tiers.every((t) => TIERS.some((row) => row[0] === t)),
      'TIER',
      '업무 단계를 선택하세요.',
    );
    const rationale = nonempty(p.rationale, '분류 근거', 4000);
    n.classification = {
      primary: [...new Set(p.tiers)],
      method: 'human-reviewed',
      rationale,
      reviewer: ctx.actor.id,
      reviewedAt: ctx.now,
    };
    n.tiers = n.classification.primary;
    n.status = 'classified';
    changed.push(n.id);
    result = { id: n.id };
  } else if (command.type === 'review') {
    requireRole(ctx.actor, ['reviewer', 'admin']);
    const raw = node(g, p.id);
    fail(
      raw.kind === 'raw' && raw.status === 'classified',
      'GATE',
      '2차 분류를 완료한 원문만 검토할 수 있습니다.',
      409,
    );
    nonempty(p.rationale, '승격 판정 근거', 5000);
    nonempty(p.acceptance, '완료 판정 기준', 5000);
    fail(
      Array.isArray(p.evidenceIds) &&
        p.evidenceIds.length &&
        p.evidenceIds.every((id) =>
          g.nodes.some(
            (n) => n.id === id && ['raw', 'file', 'evidence'].includes(n.kind),
          ),
        ),
      'EVIDENCE',
      '검토한 원문/근거 ID가 필요합니다.',
    );
    fail(
      HIERARCHY.includes(p.targetKind),
      'HIERARCHY',
      '구현 대상의 서열을 지정하세요.',
    );
    if (p.targetKind === 'company') {
      fail(!p.parentId, 'HIERARCHY', '컴퍼니는 최상위 객체입니다.');
    } else {
      const parent = node(g, p.parentId);
      fail(
        HIERARCHY.indexOf(parent.kind) + 1 === HIERARCHY.indexOf(p.targetKind),
        'HIERARCHY',
        '상위 객체와 구현 대상 서열이 맞지 않습니다.',
      );
    }
    const decision = put(
      g,
      make(
        `decision:${command.id}`,
        'decision',
        `승격 판정 · ${raw.title}`,
        ctx,
        {
          status: p.approve === true ? 'approved' : 'rejected',
          tiers: raw.tiers,
          sourceRaw: raw.id,
          rationale: p.rationale,
          acceptance: p.acceptance,
          evidenceIds: p.evidenceIds,
          targetKind: p.targetKind,
          parentId: p.parentId,
          targetTitle: nonempty(p.targetTitle, '구현 대상 이름', 180),
          reviewer: ctx.actor.id,
        },
      ),
    );
    edge(g, raw.id, decision.id, 'REVIEWED_BY');
    for (const id of p.evidenceIds) edge(g, decision.id, id, 'EVIDENCED_BY');
    changed.push(decision.id);
    result = {
      id: decision.id,
      approved: decision.status === 'approved',
      applied: false,
    };
  } else if (command.type === 'apply') {
    requireRole(ctx.actor, ['reviewer', 'admin']);
    const d = node(g, p.id);
    fail(
      d.kind === 'decision' && d.status === 'approved',
      'GATE',
      '승인된 판정만 별도로 적용할 수 있습니다.',
      409,
    );
    const raw = node(g, d.sourceRaw),
      id = `work:${d.id.slice(9)}`;
    const item = put(
      g,
      make(id, d.targetKind, d.targetTitle, ctx, {
        model: 'current',
        stateKind: 'planned',
        status: 'specified',
        tiers: [...new Set(['01', ...raw.tiers])],
        body: raw.body,
        requirement: {
          painPoint: p.painPoint || null,
          goal: p.goal || d.targetTitle,
          acceptance: d.acceptance,
          sourceId: raw.id,
        },
        decisionId: d.id,
        readiness: {
          source: 'observed',
          frontend: 'missing',
          publication: 'not-requested',
          server: 'unverified',
        },
      }),
    );
    if (d.parentId) edge(g, d.parentId, id, 'CONTAINS');
    edge(g, raw.id, id, 'SPECIFIES');
    edge(g, d.id, id, 'APPLIES');
    d.status = 'applied';
    d.appliedId = id;
    changed.push(id, d.id);
    result = {
      id: item.id,
      applied: true,
      buPath: hierarchyPath(g, item.id).join('/'),
    };
  } else if (command.type === 'design') {
    const work = node(g, p.id);
    fail(
      HIERARCHY.includes(work.kind) && work.decisionId,
      'GATE',
      '승격 적용된 구현 대상이 필요합니다.',
      409,
    );
    const descendants = new Set([work.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const e of g.edges)
        if (
          e.predicate === 'CONTAINS' &&
          descendants.has(e.from) &&
          !descendants.has(e.to)
        ) {
          descendants.add(e.to);
          grew = true;
        }
    }
    const sectionIds = p.sectionIds || [];
    fail(
      Array.isArray(sectionIds) && sectionIds.length <= 12,
      'DESIGN_PARTS',
      '화면 모듈은 12개까지 연결하세요.',
    );
    const sections = sectionIds.map((id) => {
      const part = node(g, id);
      fail(
        id !== work.id && descendants.has(id) && part.decisionId,
        'DESIGN_PARTS',
        '승격된 하위 모듈/에셋만 디자인에 연결할 수 있습니다.',
      );
      return {
        entityId: part.id,
        title: part.title,
        body: String(part.body || part.requirement?.acceptance || '').slice(
          0,
          1000,
        ),
        kind: part.kind,
      };
    });
    const spec = {
      sections,
      heading: nonempty(p.heading, '제목', 180),
      body: nonempty(p.body, '본문', 12000),
      cta: nonempty(p.cta, 'CTA', 80),
      brand: String(p.brand || 'Plus Minus G.').slice(0, 100),
      detail: String(p.detail || '').slice(0, 6000),
    };
    const d = put(
      g,
      make(`design:${command.id}`, 'design', `${work.title} · GUI`, ctx, {
        model: 'current',
        stateKind: 'planned',
        status: 'designed',
        tiers: ['05', '06'],
        representations: ['GUI', 'CUI'],
        spec,
        workId: work.id,
        requirementId: work.requirement.sourceId,
        sourceRevision: g.revision + 1,
      }),
    );
    edge(g, work.id, d.id, 'DESIGNED_AS');
    for (const part of sections) edge(g, part.entityId, d.id, 'REPRESENTED_IN');
    edge(g, work.requirement.sourceId, d.id, 'SPECIFIES');
    work.readiness.frontend = 'design-only';
    work.status = 'designed';
    changed.push(d.id, work.id);
    result = { id: d.id };
  } else if (command.type === 'code') {
    const d = node(g, p.id);
    fail(d.kind === 'design', 'TARGET', '디자인을 먼저 선택하세요.');
    const work = node(g, d.workId);
    fail(
      !work.sourceAlert?.approvalRecheckRequired,
      'SOURCE_CHANGED',
      '원본 기획이 변경되었습니다. 새 원문을 검토·승격하세요.',
      409,
    );
    const html = designToHTML(d),
      sha = await digest(html);
    const code = put(
      g,
      make(`code:${command.id}`, 'code', `${work.title} · index.html`, ctx, {
        model: 'current',
        status: 'built-local',
        tiers: ['04', '05'],
        representations: ['CLI', 'GUI'],
        body: html,
        sha256: sha,
        language: 'html',
        designId: d.id,
        workId: work.id,
        qa: {
          parser: 'generated-safe-template',
          ctaTarget: true,
          execution: 'not-yet-browser-tested',
        },
        bu: { key: `builds/${sha}/index.html`, state: 'pending' },
      }),
    );
    edge(g, d.id, code.id, 'IMPLEMENTS');
    edge(g, work.id, code.id, 'BUILDS_TO');
    work.status = 'implemented';
    work.readiness.frontend = 'generated';
    changed.push(code.id, work.id);
    result = { id: code.id, sha256: sha };
  } else if (command.type === 'request-release') {
    const code = node(g, p.id);
    fail(code.kind === 'code', 'GATE', '빌드된 코드가 필요합니다.');
    const work = node(g, code.workId);
    fail(
      ['preview', 'production'].includes(p.channel),
      'CHANNEL',
      'preview 또는 production 채널을 선택하세요.',
    );
    if (p.channel === 'production')
      requireRole(ctx.actor, ['reviewer', 'admin']);
    const deployment = put(
      g,
      make(
        `release:${command.id}`,
        'deployment',
        `런칭 빔 · ${work.title}`,
        ctx,
        {
          model: 'current',
          stateKind: 'planned',
          status: 'queued',
          tiers: ['03'],
          representations: ['CLI'],
          workId: work.id,
          codeId: code.id,
          sourceSha256: code.sha256,
          channel: p.channel,
          requestedBy: ctx.actor.id,
          publication: 'not-published',
          server: 'unverified',
          runId: `run-${command.id}`,
          authority: 'launching-beam-receipt-required',
        },
      ),
    );
    edge(g, code.id, deployment.id, 'DEPLOYMENT_REQUEST');
    work.readiness.publication = 'queued';
    changed.push(work.id, deployment.id);
    result = { id: deployment.id, runId: deployment.runId, published: false };
  } else if (command.type === 'receipt') {
    fail(
      ctx.verifiedReceipt === true,
      'RECEIPT_AUTH',
      '게시 결과는 검증된 실행기만 기록할 수 있습니다.',
      403,
    );
    const d = node(g, p.id);
    fail(
      d.kind === 'deployment' && d.status === 'queued',
      'STATE',
      '대기 중인 실행을 찾을 수 없습니다.',
      409,
    );
    fail(
      d.sourceSha256 === p.sourceSha256 && d.runId === p.runId,
      'SOURCE_MISMATCH',
      '빌드 해시 또는 runId가 일치하지 않습니다.',
      409,
    );
    const url = new URL(p.url);
    fail(
      ['https:', 'http:'].includes(url.protocol),
      'URL',
      '웹 주소를 확인하세요.',
    );
    fail(
      p.evidenceSha256 && p.outcome === 'passed',
      'EVIDENCE',
      '검증 증거가 있는 성공 결과만 완료 처리합니다.',
    );
    d.status = 'published';
    d.publication =
      ctx.receiptScope === 'local'
        ? 'local-preview-verified'
        : 'published-verified';
    d.url = url.href;
    d.evidenceSha256 = p.evidenceSha256;
    d.server = p.serverVerified ? 'verified' : 'unverified';
    const work = node(g, d.workId);
    work.readiness.publication = d.publication;
    work.readiness.server = d.server;
    const endpoint = put(
      g,
      make(`endpoint:${command.id}`, 'endpoint', url.href, ctx, {
        model: 'current',
        status: d.publication,
        tiers: ['03', '05'],
        representations: ['GUI'],
        url: url.href,
        workId: work.id,
        sourceSha256: d.sourceSha256,
      }),
    );
    edge(g, d.id, endpoint.id, 'PUBLISHED_AT');
    changed.push(d.id, work.id, endpoint.id);
    result = {
      id: endpoint.id,
      url: url.href,
      scope: ctx.receiptScope || 'external',
    };
  } else if (command.type === 'message') {
    const target = node(g, p.targetId);
    const text = nonempty(p.body, '에이전트 메시지', 12000);
    const n = put(
      g,
      make(`message:${command.id}`, 'message', text.slice(0, 80), ctx, {
        body: text,
        tiers: target.tiers,
        source: { system: 'rep-message', id: command.id, version: '1' },
        author: ctx.actor.id,
        agentRequest: p.agentRequest === true,
        status: p.agentRequest ? 'proposed' : 'recorded',
        bu: { state: 'pending' },
      }),
    );
    edge(g, n.id, target.id, 'ABOUT');
    changed.push(n.id);
    result = { id: n.id, executed: false };
  } else if (command.type === 'relate') {
    const from = node(g, p.from),
      to = node(g, p.to);
    fail(
      ['raw', 'message'].includes(from.kind) &&
        (['raw', 'message'].includes(to.kind) || HIERARCHY.includes(to.kind)),
      'RELATION',
      '원문 참조 또는 구현 대상에 대한 문맥 연결만 지원합니다.',
    );
    fail(
      ['REFERS_TO', 'ABOUT'].includes(p.predicate),
      'RELATION',
      '승인·구현 관계로 사용할 수 없습니다.',
    );
    edge(g, from.id, to.id, p.predicate, { stateKind: 'inferred' });
    result = { from: from.id, to: to.id };
  } else if (command.type === 'import') {
    requireRole(ctx.actor, ['reviewer', 'admin']);
    fail(
      p.graph?.schema === 'ocp.studio.graph/8' &&
        Array.isArray(p.graph.nodes) &&
        Array.isArray(p.graph.edges),
      'SCHEMA',
      'v8 그래프 형식이 아닙니다.',
    );
    const incomingIds = new Set(p.graph.nodes.map((n) => n.id));
    validateGraph({
      ...g,
      nodes: [
        ...g.nodes.filter((n) => !incomingIds.has(n.id)),
        ...p.graph.nodes,
      ],
      edges: [...g.edges, ...p.graph.edges],
    });
    for (const n of p.graph.nodes) {
      fail(
        !['decision', 'deployment', 'code', 'design'].includes(n.kind),
        'IMPORT_AUTHORITY',
        '외부 가져오기로 승인·게시·실행 상태를 만들 수 없습니다.',
      );
      fail(
        ![
          'decisionId',
          'appliedId',
          'reviewer',
          'workId',
          'runId',
          'authority',
          'readiness',
        ].some((k) => Object.hasOwn(n, k)),
        'IMPORT_AUTHORITY',
        '외부 자료의 실행 권한 필드는 가져올 수 없습니다.',
      );
      const clean = structuredClone(n);
      clean.model = 'observed';
      clean.stateKind = 'observed';
      clean.status =
        clean.kind === 'raw' ? 'classified-first' : 'source-snapshot';
      clean.importedAt = ctx.now;
      clean.importStatus = 'observed-source-snapshot';
      if (g.nodes.some((x) => x.id === n.id)) {
        const previous = structuredClone(node(g, n.id));
        delete previous.importedAt;
        const compare = structuredClone(clean);
        delete compare.importedAt;
        fail(
          JSON.stringify(previous) === JSON.stringify(compare),
          'IMPORT_CONFLICT',
          '동일 ID의 다른 내용을 덮어쓰지 않습니다.',
          409,
        );
        continue;
      }
      g.nodes.push(clean);
      changed.push(clean.id);
    }
    const forbidden = [
      'APPLIES',
      'PUBLISHED_AT',
      'DEPLOYMENT_REQUEST',
      'BUILDS_TO',
      'DESIGNED_AS',
      'IMPLEMENTS',
    ];
    for (const e of p.graph.edges) {
      fail(
        !forbidden.includes(e.predicate),
        'IMPORT_AUTHORITY',
        '실행·승인 관계는 해당 서버 명령으로만 만들 수 있습니다.',
      );
      edge(g, e.from, e.to, e.predicate, {
        stateKind: 'observed',
        source: e.source || null,
      });
    }
    g.coverage.push(...(p.graph.coverage || []));
    result = { count: changed.length };
  } else throw new DomainError('COMMAND', '지원하지 않는 작업입니다.');
  g.revision++;
  const event = {
    id: `event:${command.id}`,
    commandId: command.id,
    type: command.type,
    actor: ctx.actor.id,
    role: ctx.actor.role,
    recordedAt: ctx.now,
    validAt: p.validAt || ctx.now,
    revision: g.revision,
    changedIds: changed,
    result,
    payloadHash,
  };
  g.events.push(event);
  g.commands.push({
    id: command.id,
    hash: payloadHash,
    result,
    revision: g.revision,
  });
  g.journal.push({
    id: event.id,
    path: `events/${String(g.revision).padStart(8, '0')}-${command.id}.json`,
    status: 'pending',
    recordedAt: ctx.now,
  });
  validateGraph(g);
  return { graph: g, result, event, duplicate: false };
}
