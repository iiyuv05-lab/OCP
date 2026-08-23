import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the OCP work-entry and operating-map surfaces", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>OCP — Work with context<\/title>/i);
  assert.match(html, /어디에서 시작했든|Begin anywhere/);
  assert.match(html, /검증된 어댑터 없음|No verified adapter/);
  assert.match(html, /승인 전 없음|None before approval/);
  assert.match(html, /Plus Minus G\./);
  assert.match(html, /작업 진입 · 로컬 초안|WORK ENTRY · LOCAL DRAFT/);
  assert.match(html, /입력 검토로 이동|Move to input review/);
  assert.match(html, /Canonical 모델을 바꾸지 않고|without changing a Canonical model/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps canonical persistence semantic and layout ephemeral", async () => {
  const [canonical, projector, schema, migration, hosting] = await Promise.all([
    readFile(new URL("../app/canonical-model.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/projector.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_canonical_v01.sql", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(canonical, /\bx:\s*\d|\by:\s*\d|left:\s*\d|angle:\s*\d/);
  assert.match(projector, /projectCanonicalGraph/);
  assert.match(projector, /Math\.atan2/);
  assert.match(schema, /validFromMs/);
  assert.match(schema, /recordedFromMs/);
  assert.match(migration, /CREATE TABLE `patch_proposals`/);
  assert.match(migration, /CHECK \(`state_kind` IN \('observed','inferred','planned','forecast','hypothetical'\)\)/);
  assert.doesNotMatch(migration, /`x`|`y`|`z`|`angle`|`left`|`top`|`width`/);
  assert.deepEqual(JSON.parse(hosting), { project_id: "appgprj_6a884a4039b0819197e60e42e332c279", d1: "DB", r2: "RAW_ARTIFACTS" });
});

test("keeps UI status truthful, operable, and free of starter metadata", async () => {
  const [page, styles, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /canonicalEntities/);
  assert.match(page, /InputDrawer/);
  assert.match(page, /MobileObjectList/);
  assert.match(page, /if \(!observationResponse\.ok\)/);
  assert.match(page, /if \(!response\.ok\)/);
  assert.match(page, /Search objects or run a command/);
  assert.doesNotMatch(page, /> LIVE</);
  assert.doesNotMatch(page, /ask OCP|3 collaborators viewing|System pulse/);
  assert.match(styles, /\.mobile-object-list/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(layout, /OCP — Work with context/);
  assert.match(layout, /\/og\.png/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview", templateRoot)));
});

test("opens participation only through confirmed writer membership", async () => {
  const [accessRoute, apiLib, observations, artifacts, artifactDownload, page, extensions, v03, statusLedger, stateModel, identityMigration] = await Promise.all([
    readFile(new URL("../app/api/workspace-members/me/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/_lib.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/observations/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/artifacts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/artifacts/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../docs/OCP-V0.2.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/OCP-V0.3.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/OCP-IMPLEMENTATION-STATUS.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/UI-STATE-MODEL.md", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0001_plus_minus_g_v03.sql", import.meta.url), "utf8"),
  ]);

  assert.match(accessRoute, /joinWorkspaceAsWriter/);
  assert.match(apiLib, /Explicit self-enrolment is intentionally limited to the writer role/);
  assert.match(apiLib, /"writer"/);
  assert.match(apiLib, /requireWorkspaceMembership/);
  assert.match(observations, /requireWorkspaceMembership\(db, request, \["writer", "reviewer", "admin"\]\)/);
  assert.doesNotMatch(observations, /local-preview/);
  assert.match(artifacts, /requireWorkspaceMembership\(db, request, \["writer", "reviewer", "admin"\]\)/);
  assert.match(artifactDownload, /requireWorkspaceMembership\(db, request, workspaceRoles\)/);
  assert.match(page, /Join to participate/);
  assert.match(page, /reviewer or owner can record a decision/);
  assert.match(stateModel, /Sites access policy \+ `workspace_members`/);
  assert.match(extensions, /Past — reconstruction/);
  assert.match(v03, /DATA ≠ VIEW ≠ SKIN/);
  assert.match(v03, /Module ↔ Specification 1:1/);
  assert.match(statusLedger, /Requirement ingestion itself \| Not implemented/);
  assert.match(identityMigration, /Plus Minus G\./);
  assert.match(identityMigration, /revision-v03-pmg/);
});

test("exposes language options and repository references without claiming canonical ingestion", async () => {
  const [page, referenceIndex, styles, statusLedger] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ocp-reference.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../docs/OCP-IMPLEMENTATION-STATUS.md", import.meta.url), "utf8"),
  ]);

  assert.match(page, /ocp\.interface-locale/);
  assert.match(page, /value="ko">한국어/);
  assert.match(page, /value="en">English/);
  assert.match(page, /value="dual">함께 · KO\+EN/);
  assert.match(page, /StandardsView/);
  assert.match(referenceIndex, /docs\/OCP-V0\.3\.md/);
  assert.match(referenceIndex, /docs\/OCP-V0\.2\.md/);
  assert.match(referenceIndex, /docs\/OCP-V0\.4\.md/);
  assert.match(referenceIndex, /docs\/OCP-V0\.5\.md/);
  assert.match(referenceIndex, /docs\/OCP-CONTEXT-INTEGRITY-HARNESS\.md/);
  assert.match(referenceIndex, /docs\/OCP-IMPLEMENTATION-STATUS\.md/);
  assert.match(referenceIndex, /deliberately not[\s\S]*canonical graph data/i);
  assert.match(styles, /\.standards-workspace/);
  assert.match(statusLedger, /Requirement ingestion itself \| Not implemented/);
});

test("registers the integrity harness and its first repository slice without claiming external runtime verification", async () => {
  const [specification, referenceIndex, statusLedger] = await Promise.all([
    readFile(new URL("../docs/OCP-CONTEXT-INTEGRITY-HARNESS.md", import.meta.url), "utf8"),
    readFile(new URL("../app/ocp-reference.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/OCP-IMPLEMENTATION-STATUS.md", import.meta.url), "utf8"),
  ]);

  assert.match(specification, /OCP-MOD-INTEGRITY-001/);
  assert.match(specification, /Conversation Truth[\s\S]*Specification Truth[\s\S]*Implementation Truth[\s\S]*Deployment Truth[\s\S]*Runtime Truth[\s\S]*Outcome Truth/);
  assert.match(specification, /first repository\/runtime-test slice implemented/i);
  assert.match(specification, /Coverage percentages are prohibited/);
  assert.match(referenceIndex, /Approved module specification/);
  assert.match(statusLedger, /Harness Baseline v1 local and PR execution verified/);
  assert.doesNotMatch(statusLedger, /Context Integrity & Runtime Verification Harness \| Implemented/);
});

test("records deployment truth and runs independent-browser evidence through OCP-RC-002", async () => {
  const [constraint, manifestText, runtimeTest, runtimePreparation, runtimeServer, playwrightConfig, packageJson, verifyWorkflow, deploymentWorkflow, referenceIndex, statusLedger] = await Promise.all([
    readFile(new URL("../docs/OCP-RUNTIME-OBSERVABILITY.md", import.meta.url), "utf8"),
    readFile(new URL("../.ocp/runtime/targets.json", import.meta.url), "utf8"),
    readFile(new URL("./runtime/runtime-observability.spec.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/prepare-runtime.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/start-runtime.mjs", import.meta.url), "utf8"),
    readFile(new URL("../playwright.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/verify.yml", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/runtime-verification.yml", import.meta.url), "utf8"),
    readFile(new URL("../app/ocp-reference.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/OCP-IMPLEMENTATION-STATUS.md", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.match(constraint, /OCP-RC-002/);
  assert.match(constraint, /DEPLOYED ≠ RUNTIME VERIFIED/);
  assert.match(constraint, /BUILD_VERIFIED[\s\S]*DEPLOYABLE[\s\S]*DEPLOYED[\s\S]*ACCESSIBLE[\s\S]*INTERACTABLE[\s\S]*RUNTIME_VERIFIED[\s\S]*ACCEPTANCE_VERIFIED/);
  assert.match(constraint, /CASE-RUNTIME-001/);
  assert.equal(manifest.policy_id, "OCP-RC-002");
  assert.equal(manifest.canonical_implementation.state, "github_pr_ci_verified_pending_merge");
  assert.equal(manifest.targets.find((target) => target.id === "ocp-local-runtime").verification.runtime_verified, "verified_local_actor");
  assert.equal(manifest.targets.find((target) => target.id === "ocp-local-runtime").latest_harness_run.result, "PASS");
  assert.equal(manifest.targets.find((target) => target.id === "ocp-sites-v05-snapshot").lifecycle, "frozen");
  assert.equal(manifest.targets.find((target) => target.id === "ocp-sites-v05-snapshot").verification.runtime_verified, "failed_implementation_deployment_drift");
  assert.equal(manifest.targets.find((target) => target.id === "ocp-sites-v05-snapshot").latest_harness_run.result, "FAIL");
  assert.match(runtimeTest, /captureDom/);
  assert.match(runtimeTest, /console\.json/);
  assert.match(runtimeTest, /network\.json/);
  assert.match(runtimeTest, /actor_class: contract\.runtime\.actor_class/);
  assert.match(runtimePreparation, /wrangler/);
  assert.match(runtimePreparation, /0000_canonical_v01\.sql/);
  assert.match(runtimePreparation, /tmpdir/);
  assert.match(runtimeServer, /--persist-to/);
  assert.match(packageJson, /scripts\/start-runtime\.mjs/);
  assert.match(playwrightConfig, /desktop-chromium/);
  assert.match(playwrightConfig, /tablet-chromium/);
  assert.match(playwrightConfig, /mobile-chromium/);
  assert.match(verifyWorkflow, /npm run verify/);
  assert.match(verifyWorkflow, /ocp-harness-/);
  assert.match(deploymentWorkflow, /deployment_status/);
  assert.match(deploymentWorkflow, /OCP_RUNTIME_URL/);
  assert.match(referenceIndex, /deploymentVerificationStages/);
  assert.match(referenceIndex, /environment-dependent/);
  assert.match(statusLedger, /Runtime Observability Independence \| Harness Baseline v1 local and PR execution verified/);
  assert.doesNotMatch(statusLedger, /Runtime Observability Independence \| Implemented/);
});

test("keeps the new work entry honest about unconnected capabilities", async () => {
  const [page, contract, statusLedger, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../docs/OCP-V0.5.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/OCP-IMPLEMENTATION-STATUS.md", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /initialView = "home"/);
  assert.match(page, /No verified adapter/);
  assert.match(page, /Move to input review/);
  assert.match(page, /Main LLM · general context recognition · account imports/);
  assert.doesNotMatch(page, /LLM CONNECTED|Context loaded successfully|Import complete/);
  assert.match(contract, /L1 sensory flux/);
  assert.match(contract, /Git repository is the Canonical Implementation Plane/);
  assert.match(contract, /known \+ inaccessible/);
  assert.match(statusLedger, /Assistant\/model selection \| Not implemented/);
  assert.match(statusLedger, /Deployment Registry and Git event adapter \| Not implemented/);
  assert.match(styles, /\.home-workspace/);
});

test("defines Harness Baseline v1 as a machine-readable and locally executable contract", async () => {
  const [manifestText, contractText, currentStateText, capabilitiesText, verifier, healthcheck, previewWorkflow, pullRequestTemplate, codeowners, harnessDocument] = await Promise.all([
    readFile(new URL("../.ocp/manifest.json", import.meta.url), "utf8"),
    readFile(new URL("../.ocp/verification-contract.json", import.meta.url), "utf8"),
    readFile(new URL("../.ocp/current-state.json", import.meta.url), "utf8"),
    readFile(new URL("../.ocp/capability-registry.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/verify.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/healthcheck.mjs", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/preview.yml", import.meta.url), "utf8"),
    readFile(new URL("../.github/pull_request_template.md", import.meta.url), "utf8"),
    readFile(new URL("../.github/CODEOWNERS", import.meta.url), "utf8"),
    readFile(new URL("../docs/OCP-HARNESS-BASELINE-V1.md", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  const contract = JSON.parse(contractText);
  const currentState = JSON.parse(currentStateText);
  const capabilities = JSON.parse(capabilitiesText);

  assert.equal(manifest.baseline_id, "OCP-HARNESS-BASELINE-V1");
  assert.deepEqual(manifest.state_ladder, ["DECLARED", "IMPLEMENTED", "BUILD_VERIFIED", "DEPLOYABLE", "DEPLOYED", "ACCESSIBLE", "INTERACTABLE", "RUNTIME_VERIFIED", "ACCEPTANCE_VERIFIED", "OUTCOME_OBSERVED"]);
  assert.deepEqual(contract.required_routes.map((route) => route.path), ["/", "/map", "/feed", "/dashboard", "/standards"]);
  assert.deepEqual(contract.required_viewports.map((viewport) => viewport.id), ["desktop", "tablet", "mobile"]);
  assert.ok(contract.evidence_requirements.includes("artifact_hashes"));
  assert.equal(currentState.features.find((feature) => feature.id === "main-llm").implementation, "PARTIAL");
  assert.equal(currentState.features.find((feature) => feature.id === "dashboard").implementation, "IMPLEMENTED");
  assert.equal(currentState.features.find((feature) => feature.id === "pmg-source-golden-path").latest_verified_stage, "ACCEPTANCE_VERIFIED");
  assert.equal(currentState.golden_path.latest_run_id, "RUN-20260823-PMG-001");
  assert.equal(currentState.golden_path.source_commit, "28ef14f9c124b5bd710bbb32a2ec555bf3c12ba3");
  assert.equal(currentState.baseline.latest_stage, "ACCEPTANCE_VERIFIED");
  assert.equal(currentState.baseline.latest_run_id, "RUN-20260823-001");
  assert.equal(capabilities.capabilities[0].targets.canonical_candidate, "iiyuv05-lab/OCP");
  assert.equal(capabilities.capabilities[0].operations.PULL_REQUEST.execution, "VERIFIED");
  assert.equal(capabilities.capabilities[0].operations.ACTIONS.execution, "VERIFIED");
  assert.match(verifier, /artifactHashes/);
  assert.match(verifier, /npmCommand, \["test"\]/);
  assert.match(healthcheck, /required_routes/);
  assert.match(previewWorkflow, /workflow_dispatch/);
  assert.match(pullRequestTemplate, /Approved and applied remain separate/);
  assert.match(codeowners, /@iiyuv05-lab/);
  assert.match(harnessDocument, /Connection existence ≠ Capability availability ≠ Execution verification/);
});

test("defines the PMG implementation-source Golden Path without collapsing approval into apply", async () => {
  const [sourceText, contractText, observationRoute, decisionRoute, applyRoute, operationalState, runtimeTest, page] = await Promise.all([
    readFile(new URL("../.ocp/sources/pmg-ocp-harness-v1.json", import.meta.url), "utf8"),
    readFile(new URL("../.ocp/golden-path-contract.json", import.meta.url), "utf8"),
    readFile(new URL("../app/api/observations/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/patch-proposals/[id]/decision/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/patch-proposals/[id]/apply/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/_operational-state.ts", import.meta.url), "utf8"),
    readFile(new URL("./runtime/runtime-observability.spec.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  const source = JSON.parse(sourceText);
  const contract = JSON.parse(contractText);

  assert.equal(source.source.commit, "4ae35dd0fd23c9c32356eef37a6da160fd37605a");
  assert.equal(source.source.pull_request_state, "open_mergeable_not_merged");
  assert.equal(source.classification.canonical_status, "candidate_pr_pending_merge");
  assert.deepEqual(contract.steps, ["input", "classify", "propose", "approve", "apply", "map_refresh", "feed_refresh", "dashboard_refresh", "runtime_verify"]);
  assert.equal(contract.required_gate, "human");
  assert.match(observationRoute, /canonicalChanged: false/);
  assert.match(observationRoute, /deterministic_repository_and_scope_match/);
  assert.match(decisionRoute, /applied: false/);
  assert.match(applyRoute, /link_implementation_source_v1/);
  assert.match(applyRoute, /TRACKS_IMPLEMENTATION_SOURCE/);
  assert.match(applyRoute, /candidate_pr_pending_merge/);
  assert.match(operationalState, /ocp\.operational-read-model\/v1/);
  assert.match(runtimeTest, /AC-GP-GATE-001/);
  assert.match(runtimeTest, /AC-GP-PROJECTION-001/);
  assert.match(page, /DashboardView/);
  assert.match(page, /Approval and application counts are read from D1/);
});
