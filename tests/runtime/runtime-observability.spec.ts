import { expect, test, type ConsoleMessage, type Request, type TestInfo } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

type ConsoleEvidence = {
  type: string;
  text: string;
  location: ReturnType<ConsoleMessage["location"]>;
};

type NetworkEvidence = {
  method: string;
  resourceType: string;
  status: number | null;
  url: string;
  failure: string | null;
};

type ActionEvidence = {
  action: string;
  target: string;
  result: "PASS";
};

type ObservationEvidence = {
  check: string;
  expected: string;
  observed: string;
  result: "PASS";
};

const contractUrl = new URL("../../.ocp/verification-contract.json", import.meta.url);
const targetManifestUrl = new URL("../../.ocp/runtime/targets.json", import.meta.url);

function safeError(error: unknown) {
  const ansiSequence = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "g");
  const stripAnsi = (value: string) => value.replace(ansiSequence, "");
  return error instanceof Error
    ? { name: error.name, message: stripAnsi(error.message) }
    : { name: "Error", message: stripAnsi(String(error)) };
}

async function attachFile(testInfo: TestInfo, name: string, path: string, contentType: string) {
  await testInfo.attach(name, { path, contentType });
}

async function writeEvidence(path: string, value: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, "utf8");
}

test("an independent actor can execute the Harness Baseline v1 browser contract", async ({ page, browserName, browser }, testInfo) => {
  const startedAt = new Date().toISOString();
  const evidenceRunRoot = process.env.OCP_EVIDENCE_RUN_DIR?.trim();
  const projectRoot = evidenceRunRoot ? join(evidenceRunRoot, "browsers", testInfo.project.name) : testInfo.outputPath("evidence");
  const screenshotRoot = evidenceRunRoot ? join(evidenceRunRoot, "screenshots") : projectRoot;
  const domRoot = evidenceRunRoot ? join(evidenceRunRoot, "dom") : projectRoot;
  await Promise.all([mkdir(projectRoot, { recursive: true }), mkdir(screenshotRoot, { recursive: true }), mkdir(domRoot, { recursive: true })]);

  const actions: ActionEvidence[] = [];
  const observations: ObservationEvidence[] = [];
  const consoleEvidence: ConsoleEvidence[] = [];
  const networkEvidence: NetworkEvidence[] = [];
  const responseByRequest = new WeakMap<Request, NetworkEvidence>();
  const screenshots: string[] = [];
  const domSnapshots: string[] = [];
  let executionError: unknown = null;
  const safeLocalMutations = process.env.OCP_ALLOW_SAFE_LOCAL_MUTATIONS === "true";

  if (safeLocalMutations) {
    await page.setExtraHTTPHeaders({
      "oai-authenticated-user-id": "41e17d7f-4d8b-4166-8778-a9f3cc755a87",
      "oai-authenticated-user-email": "harness-owner@ocp.local",
      "oai-authenticated-user-full-name": "Harness%20Owner",
    });
  }

  page.on("console", (message) => {
    consoleEvidence.push({ type: message.type(), text: message.text(), location: message.location() });
  });
  page.on("response", (response) => {
    const request = response.request();
    const evidence: NetworkEvidence = {
      method: request.method(),
      resourceType: request.resourceType(),
      status: response.status(),
      url: response.url(),
      failure: null,
    };
    networkEvidence.push(evidence);
    responseByRequest.set(request, evidence);
  });
  page.on("requestfailed", (request) => {
    const existing = responseByRequest.get(request);
    const evidence = existing ?? {
      method: request.method(),
      resourceType: request.resourceType(),
      status: null,
      url: request.url(),
      failure: null,
    };
    evidence.failure = request.failure()?.errorText ?? "request failed";
    if (!existing) networkEvidence.push(evidence);
  });

  async function capture(label: string) {
    const path = join(screenshotRoot, `${testInfo.project.name}-${label}.png`);
    await page.screenshot({ path, fullPage: true });
    screenshots.push(path);
    await attachFile(testInfo, `${label}-screenshot`, path, "image/png");
  }

  async function captureDom(label: string) {
    const path = join(domRoot, `${testInfo.project.name}-${label}.html`);
    const dom = await page.locator("main").evaluate((element) => element.outerHTML);
    await writeEvidence(path, dom);
    domSnapshots.push(path);
    await attachFile(testInfo, `${label}-dom`, path, "text/html");
  }

  function record(check: string, expected: string, observed: string) {
    observations.push({ check, expected, observed, result: "PASS" });
  }

  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    actions.push({ action: "open", target: "/", result: "PASS" });
    await expect(page).toHaveTitle(/OCP — Work with context/);
    await expect(page.getByRole("heading", { name: /어디에서 시작했든|Begin anywhere/ })).toBeVisible();
    record("AC-ROUTES-001:/", "Work landmark visible", "Work landmark visible");

    const draft = page.getByRole("textbox", { name: /무엇을 이어서 할까요|What do you want to continue/ });
    await draft.fill("Harness Baseline v1 local draft — do not persist");
    actions.push({ action: "type", target: "work-entry-draft", result: "PASS" });
    await expect(page.getByRole("button", { name: /입력 검토로 이동|Move to input review/ })).toBeEnabled();
    record("AC-INPUT-001", "Local draft enables review without saving", "Review enabled; no submission performed");
    await capture("work");
    await captureDom("work");

    await page.goto("/map", { waitUntil: "domcontentloaded" });
    actions.push({ action: "open", target: "/map", result: "PASS" });
    await expect(page.getByRole("region", { name: /model map/i })).toBeVisible();
    record("AC-ROUTES-001:/map", "Map landmark visible", "Map landmark visible");
    await capture("map");
    await captureDom("map");

    const primaryNav = page.getByRole("navigation", { name: /주요 보기|Primary views/ });
    await primaryNav.getByRole("button", { name: /^(변경|Feed)\s*\d+$/ }).click();
    await expect(page.getByRole("heading", { name: /기준 그래프에서 무엇이 바뀌었나|What changed in the reference graph/ })).toBeVisible();
    actions.push({ action: "click", target: "primary-nav:feed", result: "PASS" });
    record("AC-NAV-001", "Map to Feed transition is visible", "Feed landmark visible after click");

    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    actions.push({ action: "open", target: "/feed", result: "PASS" });
    await expect(page.getByRole("heading", { name: /기준 그래프에서 무엇이 바뀌었나|What changed in the reference graph/ })).toBeVisible();
    record("AC-ROUTES-001:/feed", "Feed landmark visible", "Feed landmark visible");
    await capture("feed");
    await captureDom("feed");

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    actions.push({ action: "open", target: "/dashboard", result: "PASS" });
    await expect(page.getByRole("heading", { name: /추정 진척률이 아닌 운영 상태|Operational state, not a progress estimate/ })).toBeVisible();
    record("AC-ROUTES-001:/dashboard", "Dashboard landmark visible", "Dashboard D1 read-model landmark visible");
    await capture("dashboard-before");
    await captureDom("dashboard-before");

    if (safeLocalMutations) {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".membership-badge")).toHaveText(/소유자|Owner/);
      const sourceCard = page.locator(".verified-source-card");
      const startSource = sourceCard.getByRole("button", { name: /입력 검토|Review intake/ });
      if (await startSource.isVisible().catch(() => false)) {
        await startSource.click();
        actions.push({ action: "click", target: "pmg-verified-source:review-intake", result: "PASS" });
        await expect(page.getByLabel("SOURCE URL")).toHaveValue(/github\.com\/iiyuv05-lab\/OCP\/commit\/4ae35dd/);
        await page.getByRole("button", { name: /관측 기록 \+ 후보 생성/ }).click();
        actions.push({ action: "click", target: "pmg-verified-source:record-and-classify", result: "PASS" });
        await expect(page.getByRole("heading", { name: "PMG 구현 소스 후보 연결" })).toBeVisible();
        await expect(page.getByText(/결정 규칙 기반 분류|DETERMINISTIC CLASSIFICATION/)).toBeVisible();

        const beforeApproval = await page.evaluate(async () => (await fetch("/api/bootstrap")).json()) as { operationalState: { headRevisionId: string; counts: Record<string, number> } };
        expect(beforeApproval.operationalState.counts.appliedImplementationSources).toBe(0);
        expect(beforeApproval.operationalState.counts.proposalsPendingReview).toBe(1);
        const baseRevision = beforeApproval.operationalState.headRevisionId;
        record("AC-GP-INPUT-001", "Input creates a classified human-gated proposal without applying", `pending=${beforeApproval.operationalState.counts.proposalsPendingReview}; applied_sources=0`);

        await page.getByRole("button", { name: "Approve · do not apply" }).click();
        actions.push({ action: "click", target: "pmg-source-proposal:approve-without-apply", result: "PASS" });
        await expect(page.getByText(/승인됨 · 아직 미반영|Approved · not applied/)).toBeVisible();
        const afterApproval = await page.evaluate(async () => (await fetch("/api/bootstrap")).json()) as { operationalState: { headRevisionId: string; counts: Record<string, number> } };
        expect(afterApproval.operationalState.headRevisionId).toBe(baseRevision);
        expect(afterApproval.operationalState.counts.proposalsApprovedNotApplied).toBe(1);
        expect(afterApproval.operationalState.counts.appliedImplementationSources).toBe(0);
        record("AC-GP-GATE-001", "Approval is recorded while Current remains unchanged", `head=${baseRevision}; approved_not_applied=1; applied_sources=0`);
        await capture("golden-path-approved-not-applied");
        await captureDom("golden-path-approved-not-applied");

        await page.getByRole("button", { name: /승인된 변경 반영|Apply approved change/ }).click();
        actions.push({ action: "click", target: "pmg-source-proposal:apply", result: "PASS" });
        await expect(page.getByText(/반영됨 · 리비전 기록됨|Applied · revision recorded/)).toBeVisible();
        const afterApply = await page.evaluate(async () => (await fetch("/api/bootstrap")).json()) as { operationalState: { headRevisionId: string; counts: Record<string, number>; implementationSources: unknown[] } };
        expect(afterApply.operationalState.headRevisionId).not.toBe(baseRevision);
        expect(afterApply.operationalState.counts.appliedImplementationSources).toBe(1);
        expect(afterApply.operationalState.implementationSources).toHaveLength(1);
        record("AC-GP-APPLY-001", "Separate apply creates a revision and one source relation", `head=${afterApply.operationalState.headRevisionId}; applied_sources=1`);
      }

      await page.goto("/map", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".source-link-chip")).toBeVisible();
      await expect(page.locator(".source-link-chip")).toContainText(/반영된 소스 연결 1개|1 applied source link/);
      actions.push({ action: "open", target: "/map:applied-source", result: "PASS" });
      await capture("map-applied-source");
      await captureDom("map-applied-source");

      await page.goto("/feed", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "PMG 구현 소스 후보 연결" })).toBeVisible();
      actions.push({ action: "open", target: "/feed:applied-source-revision", result: "PASS" });
      await capture("feed-applied-source");
      await captureDom("feed-applied-source");

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".dashboard-metrics article").filter({ hasText: /반영된 소스 연결|APPLIED SOURCE LINKS/ }).getByText("1", { exact: true })).toBeVisible();
      await expect(page.getByText("TRACKS_IMPLEMENTATION_SOURCE", { exact: true })).toBeVisible();
      await expect(page.getByText("candidate_pr_pending_merge", { exact: true })).toBeVisible();
      actions.push({ action: "open", target: "/dashboard:applied-source", result: "PASS" });
      record("AC-GP-PROJECTION-001", "Map, Feed, and Dashboard expose the applied relation", "All three surfaces expose one applied source relation and pending-merge boundary");
      await capture("dashboard-applied-source");
      await captureDom("dashboard-applied-source");
    }

    await page.goto("/standards", { waitUntil: "domcontentloaded" });
    actions.push({ action: "open", target: "/standards", result: "PASS" });
    await expect(page.getByRole("heading", { name: /계약·구현 상태·운영 기준|Contracts, status, and operating rules/ })).toBeVisible();
    await expect(page.getByText("DEPLOYED ≠ RUNTIME VERIFIED", { exact: true })).toBeVisible();
    record("AC-ROUTES-001:/standards", "Standards landmark visible", "Standards landmark and runtime rule visible");
    const standardsWorkspace = page.locator(".standards-workspace");
    const scrollTop = await standardsWorkspace.evaluate((element) => {
      element.scrollTo({ top: element.scrollHeight, behavior: "instant" });
      return element.scrollTop;
    });
    expect(scrollTop).toBeGreaterThan(0);
    actions.push({ action: "scroll", target: "/standards:bottom", result: "PASS" });
    record("AC-SCROLL-001", "Standards scroll container advances", `scrollTop=${scrollTop}`);
    await capture("standards");
    await captureDom("standards");
  } catch (error) {
    executionError = error;
    const failurePath = join(screenshotRoot, `${testInfo.project.name}-failure.png`);
    await page.screenshot({ path: failurePath, fullPage: true }).catch(() => undefined);
    screenshots.push(failurePath);
  }

  const relevantNetworkFailures = networkEvidence.filter((entry) => {
    if (entry.url.endsWith("/favicon.ico") || entry.url.endsWith("/robots.txt")) return false;
    return entry.failure !== null || (entry.status !== null && entry.status >= 400);
  });
  const consoleErrors = consoleEvidence.filter((entry) => entry.type === "error");
  const contract = JSON.parse(await readFile(contractUrl, "utf8"));
  const targetManifest = JSON.parse(await readFile(targetManifestUrl, "utf8")) as { schema: string; policy_id: string };
  const result = executionError || consoleErrors.length || relevantNetworkFailures.length ? "FAIL" : "PASS";
  const consolePath = join(projectRoot, "console.json");
  const networkPath = join(projectRoot, "network.json");
  const verificationPath = join(projectRoot, "verification.json");
  const artifactHashes: Record<string, string> = {};

  await writeEvidence(consolePath, `${JSON.stringify(consoleEvidence, null, 2)}\n`);
  await writeEvidence(networkPath, `${JSON.stringify(networkEvidence, null, 2)}\n`);
  for (const path of [...screenshots, ...domSnapshots, consolePath, networkPath]) {
    try {
      artifactHashes[path.slice((evidenceRunRoot || projectRoot).length + 1)] = createHash("sha256").update(await readFile(path)).digest("hex");
    } catch {
      // A failed screenshot attempt is represented by the test failure itself.
    }
  }

  const browserEvidence = {
    schema: "ocp.browser-verification/v1",
    policy_id: targetManifest.policy_id,
    target_manifest_schema: targetManifest.schema,
    contract_id: contract.contract_id,
    run_id: process.env.OCP_RUN_ID || "ad-hoc-browser-run",
    target_id: process.env.OCP_RUNTIME_TARGET_ID || (process.env.OCP_RUNTIME_URL ? "external-runtime" : "ocp-local-runtime"),
    runtime_url: new URL(page.url()).origin,
    actor_class: contract.runtime.actor_class,
    browser: { name: browserName, version: browser.version(), project: testInfo.project.name },
    viewport: page.viewportSize(),
    test_version: `${contract.contract_id}@${contract.version}`,
    environment: { platform: process.platform, node: process.version, ci: Boolean(process.env.CI) },
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    actions,
    expected: contract.acceptance_checks,
    observed: observations,
    result,
    failure: executionError ? safeError(executionError) : null,
    evidence: {
      screenshots: screenshots.length,
      dom_snapshots: domSnapshots.length,
      console_events: consoleEvidence.length,
      console_errors: consoleErrors.length,
      network_events: networkEvidence.length,
      network_failures: relevantNetworkFailures.length,
      artifact_hashes: artifactHashes,
    },
  };
  await writeEvidence(verificationPath, `${JSON.stringify(browserEvidence, null, 2)}\n`);

  await Promise.all([
    attachFile(testInfo, "console", consolePath, "application/json"),
    attachFile(testInfo, "network", networkPath, "application/json"),
    attachFile(testInfo, "browser-verification", verificationPath, "application/json"),
  ]);

  if (executionError) throw executionError;
  expect(consoleErrors, "runtime console errors").toEqual([]);
  expect(relevantNetworkFailures, "unexpected runtime network failures").toEqual([]);
});
