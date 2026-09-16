/** Isolated built OCP Worker + D1/R2 + browser. Never targets production. */
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes, createHash, createHmac } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const root = process.cwd();
const state = await mkdtemp(path.join(tmpdir(), 'ocp-v8-native-'));
const evidence = path.join(root, '.studio-evidence/native');
await mkdir(evidence, { recursive: true });
const wrangler = path.join(root, 'node_modules/.bin/wrangler');
const config = 'dist/server/wrangler.json';
const env = {
  ...process.env,
  OCP_RUNTIME_STATE: state,
  WRANGLER_LOG_PATH: path.join(state, 'wrangler.log'),
};
execFileSync(process.execPath, ['scripts/prepare-runtime.mjs'], {
  env,
  stdio: 'pipe',
});
const args = [
  'd1',
  'execute',
  'site-creator-d1',
  '--local',
  '--config',
  config,
  '--persist-to',
  state,
];
execFileSync(wrangler, [...args, '--file', 'db/migrations/studio-v8.sql'], {
  env,
  stdio: 'pipe',
});
execFileSync(
  wrangler,
  [
    ...args,
    '--command',
    "INSERT INTO workspace_members(workspace_id,auth_subject,actor_entity_id,role,created_at_ms) VALUES ('workspace-nexus','studio-ci-admin',NULL,'admin',1),('workspace-nexus','studio-ci-other',NULL,'writer',1)",
  ],
  { env, stdio: 'pipe' },
);
const secret = randomBytes(32).toString('hex');
const receiptSecret = randomBytes(32).toString('hex');
const origin = 'http://127.0.0.1:4183';
const runner = spawn(
  wrangler,
  [
    'dev',
    '--config',
    config,
    '--ip',
    '127.0.0.1',
    '--port',
    '4183',
    '--persist-to',
    state,
    '--show-interactive-dev-session=false',
    '--var',
    `STUDIO_GATEWAY_SECRET:${secret}`,
    '--var',
    `STUDIO_RECEIPT_SECRET:${receiptSecret}`,
  ],
  { env, stdio: ['ignore', 'pipe', 'pipe'] },
);
let output = '';
const collect = (b) => {
  output += b
    .toString()
    .replaceAll(secret, '[fixture-secret]')
    .replaceAll(receiptSecret, '[fixture-receipt-secret]');
};
runner.stdout.on('data', collect);
runner.stderr.on('data', collect);
const results = [];
let browser;
const record = (name, detail = {}) =>
  results.push({ name, status: 'passed', ...detail });
let revision = 0;
const headers = {
  'x-ocp-trusted-gateway': secret,
  'oai-authenticated-user-id': 'studio-ci-admin',
  'oai-authenticated-user-email': 'fixture-admin@example.invalid',
  'Content-Type': 'application/json',
};
async function command(type, payload) {
  const r = await fetch(origin + '/api/studio', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'ci-' + randomBytes(10).toString('hex'),
      expectedRevision: revision,
      type,
      payload,
    }),
  });
  const data = await r.json();
  assert.equal(r.status, 200, JSON.stringify(data));
  revision = data.graph.revision;
  return data;
}
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + '/studio')).status === 200) break;
    } catch {
      /* Runtime startup, not an accepted test result. */
    }
    await new Promise((r) => setTimeout(r, 300));
    if (i === 99) throw Error('Native Worker did not start');
  }
  const html = await (await fetch(origin + '/studio')).text();
  assert.ok(html.includes('OCP'));
  record('Actual native /studio route renders in built OCP Worker');
  assert.equal((await fetch(origin + '/api/studio')).status, 401);
  record('Anonymous private API denied');
  assert.equal(
    (
      await fetch(origin + '/api/studio', {
        headers: {
          'oai-authenticated-user-id': 'studio-ci-admin',
          'oai-authenticated-user-email': 'fixture-admin@example.invalid',
        },
      })
    ).status,
    401,
  );
  record('Untrusted identity headers cannot enter private API');
  const r = await fetch(origin + '/api/studio', { headers });
  let snapshot = await r.json();
  assert.equal(r.status, 200, JSON.stringify(snapshot));
  assert.equal(snapshot.graph.revision, 0);
  record('Verified fixture member opens isolated canonical workspace');
  const nodes = ['company', 'brand', 'product'].map((kind, i) => ({
    id: 'ci-' + kind,
    kind,
    title:
      i === 0
        ? 'Integration fixture company'
        : i === 1
          ? 'Integration fixture brand'
          : 'Integration fixture product',
    tiers: ['01'],
    representations: ['CUI'],
    status: 'source-observed',
  }));
  await command('import', {
    graph: {
      nodes,
      edges: [
        {
          id: 'ci-edge-1',
          from: 'ci-company',
          to: 'ci-brand',
          predicate: 'CONTAINS',
        },
        {
          id: 'ci-edge-2',
          from: 'ci-brand',
          to: 'ci-product',
          predicate: 'CONTAINS',
        },
      ],
    },
  });
  const cap = await command('capture', {
    title: 'Native fixture brief',
    body: '원문을 검토하여 디자인과 코드로 연결합니다.',
    sourceSystem: 'fixture-rep-note',
    sourceId: 'fixture-note',
    sourceVersion: 1,
  });
  const rawId = cap.result.id;
  record('Raw source and BU archive persist through native D1 and R2');
  await command('classify', {
    id: rawId,
    tiers: ['01', '05'],
    rationale: '테스트용 기획 원문과 화면 기준',
  });
  const decision = await command('review', {
    id: rawId,
    parentId: 'ci-product',
    targetKind: 'page',
    targetTitle: 'Native fixture screen',
    rationale: '격리된 통합 테스트 승인',
    acceptance: 'CTA 이동 및 소스-코드 해시 일치',
    evidenceIds: [rawId],
    approve: true,
  });
  assert.equal(
    decision.graph.nodes.some((n) => n.decisionId === decision.result.id),
    false,
  );
  record('Review approval does not silently apply');
  const work = await command('apply', { id: decision.result.id });
  const design = await command('design', {
    id: work.result.id,
    heading: '원문에서 제품으로',
    body: 'Canonical Graph와 실제 디자인·코드 연결',
    cta: '상세 확인',
    detail: '이 화면은 격리 통합 검증 결과입니다.',
  });
  const code = await command('code', { id: design.result.id });
  const detail = await (
    await fetch(
      origin + '/api/studio?id=' + encodeURIComponent(code.result.id),
      { headers },
    )
  ).json();
  const generated = detail.node.body;
  assert.equal(
    createHash('sha256').update(generated).digest('hex'),
    detail.node.sha256,
  );
  record('Design compiler produces exact linked HTML bytes');
  const queued = await command('request-release', {
    id: code.result.id,
    channel: 'preview',
  });
  assert.equal(
    queued.graph.nodes.find((n) => n.id === queued.result.id).status,
    'queued',
  );
  record('Launch request remains queued without an executor');
  const forged = await fetch(origin + '/api/studio', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'ci-forged',
      expectedRevision: revision,
      type: 'receipt',
      payload: {},
    }),
  });
  assert.equal(forged.status, 403);
  record('Browser cannot forge publication');
  const body = JSON.stringify({
    workspace: code.graph.workspace,
    commandId: 'ci-signed-fixture',
    receipt: {
      id: queued.result.id,
      runId: queued.result.runId,
      sourceSha256: detail.node.sha256,
      evidenceSha256: createHash('sha256')
        .update('isolated-provider-fixture')
        .digest('hex'),
      url: 'https://fixture.invalid/not-an-actual-deployment',
      outcome: 'passed',
      serverVerified: false,
    },
  });
  const ts = String(Date.now());
  const signature = createHmac('sha256', receiptSecret)
    .update(ts + '.' + body)
    .digest('hex');
  const receipt = await fetch(origin + '/api/studio/receipt', {
    method: 'POST',
    headers: { 'x-studio-timestamp': ts, 'x-studio-signature': signature },
    body,
  });
  assert.equal(receipt.status, 200, await receipt.text());
  record(
    'Signed receipt contract verified using explicit fixture; no real public deployment claimed',
  );
  snapshot = await (await fetch(origin + '/api/studio', { headers })).json();
  assert.ok(snapshot.graph.journal.length >= 8);
  assert.equal(
    snapshot.graph.journal.every(
      (j) => j.status === 'object-stored;drive-pending',
    ),
    true,
  );
  record('BU outbox does not claim unperformed Drive synchronization');
  const other = await (
    await fetch(origin + '/api/studio', {
      headers: { ...headers, 'oai-authenticated-user-id': 'studio-ci-other' },
    })
  ).json();
  assert.equal(other.graph.nodes.length, 0);
  record('Second account cannot see first account source');
  browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    extraHTTPHeaders: headers,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(origin + '/studio', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '＋ 원문', exact: true }).waitFor();
  await page.locator('.stage').click({ position: { x: 500, y: 250 } });
  await page.keyboard.press('3');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-action="journey"]')
      ?.classList.contains('active'),
  );
  record('Digit3 works in actual native browser route');
  await page.screenshot({ path: path.join(evidence, 'native-journey.png') });
  await page.getByRole('button', { name: '＋ 원문', exact: true }).click();
  await page.locator('input[name="title"]').fill('Browser persistent note');
  await page
    .locator('textarea[name="body"]')
    .fill('브라우저에서 실제 Canonical API로 저장한 원문입니다.');
  await page.getByRole('button', { name: '확인 · 기록', exact: true }).click();
  await page.locator('dialog').waitFor({ state: 'hidden' });
  await page.reload({ waitUntil: 'networkidle' });
  await page
    .getByRole('textbox', { name: '캔버스 검색' })
    .fill('Browser persistent note');
  await page.locator('[data-select]').first().click();
  await page
    .getByRole('heading', { name: 'Browser persistent note', exact: true })
    .waitFor();
  record('Actual browser capture survives page reload');
  await page.screenshot({ path: path.join(evidence, 'native-studio.png') });
  await page.getByRole('button', { name: '상세 닫기', exact: true }).click();
  await page
    .getByRole('button', { name: '표현 언어 도움말', exact: true })
    .click();
  await page.locator('dialog').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  record('Contextual guide next to control opens');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(evidence, 'native-mobile.png') });
  assert.equal(errors.length, 0, errors.join('\n'));
  record('Native browser has no uncaught JavaScript errors');
  const preview = await ctx.newPage();
  await preview.setContent(generated);
  await preview.getByRole('link', { name: '상세 확인', exact: true }).click();
  assert.equal(await preview.locator('#details').count(), 1);
  await preview.screenshot({
    path: path.join(evidence, 'generated-screen.png'),
  });
  record('Generated HTML CTA targets its actual detail section');
  await ctx.close();
  await writeFile(
    path.join(evidence, 'report.json'),
    JSON.stringify(
      {
        scope:
          'Built native OCP Worker / isolated local D1+R2 on CI; fixtures only; not production',
        results,
        errors: [],
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      nativeChecks: results.length,
      passed: true,
      scope: 'isolated-native-runtime',
    }),
  );
} catch (error) {
  await writeFile(
    path.join(evidence, 'report.json'),
    JSON.stringify(
      { scope: 'isolated-native-runtime', results, error: String(error) },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser?.close();
  runner.kill('SIGTERM');
  await writeFile(path.join(evidence, 'worker.log'), output);
  await rm(state, { recursive: true, force: true });
}
