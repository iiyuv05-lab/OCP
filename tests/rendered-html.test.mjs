import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

function containsKey(value, forbiddenKeys) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => containsKey(item, forbiddenKeys));
  return Object.entries(value).some(([key, nested]) => forbiddenKeys.has(key) || containsKey(nested, forbiddenKeys));
}

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
  assert.match(statusLedger, /External-attestation producer implemented/);
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
  assert.equal(manifest.schema, "ocp.runtime-target-declarations/v2");
  assert.equal(manifest.canonical_implementation.embedded_latest_state, false);
  assert.equal(manifest.canonical_implementation.state_authority, "external_operational_state");
  assert.equal(manifest.targets.find((target) => target.id === "ocp-local-runtime").expected_verification.attestation_required, true);
  assert.equal(manifest.targets.find((target) => target.id === "ocp-sites-v05-snapshot").lifecycle, "frozen");
  assert.equal(manifest.targets.find((target) => target.id === "ocp-sites-v05-snapshot").observed_state.runtime_verified, "failed_implementation_deployment_drift");
  assert.equal(manifest.targets.find((target) => target.id === "ocp-sites-v05-snapshot").historical_verification_snapshot.result, "FAIL");
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
  assert.match(statusLedger, /Runtime Observability Independence \| Baseline and PMG Golden Path harness implemented; execution is subject-scoped/);
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

test("defines Harness Baseline v1 as declared state with external verification attestations", async () => {
  const [manifestText, contractText, currentStateText, capabilitiesText, attestationSchemaText, attestationGenerator, verifier, healthcheck, verifyWorkflow, previewWorkflow, pullRequestTemplate, codeowners, harnessDocument, attestationDocument] = await Promise.all([
    readFile(new URL("../.ocp/manifest.json", import.meta.url), "utf8"),
    readFile(new URL("../.ocp/verification-contract.json", import.meta.url), "utf8"),
    readFile(new URL("../.ocp/current-state.json", import.meta.url), "utf8"),
    readFile(new URL("../.ocp/capability-registry.json", import.meta.url), "utf8"),
    readFile(new URL("../.ocp/verification-attestation.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/create-verification-attestation.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/verify.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/healthcheck.mjs", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/verify.yml", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/preview.yml", import.meta.url), "utf8"),
    readFile(new URL("../.github/pull_request_template.md", import.meta.url), "utf8"),
    readFile(new URL("../.github/CODEOWNERS", import.meta.url), "utf8"),
    readFile(new URL("../docs/OCP-HARNESS-BASELINE-V1.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/OCP-VERIFICATION-ATTESTATION.md", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  const contract = JSON.parse(contractText);
  const currentState = JSON.parse(currentStateText);
  const capabilities = JSON.parse(capabilitiesText);
  const attestationSchema = JSON.parse(attestationSchemaText);

  assert.equal(manifest.baseline_id, "OCP-HARNESS-BASELINE-V1");
  assert.deepEqual(manifest.state_ladder, ["DECLARED", "IMPLEMENTED", "BUILD_VERIFIED", "DEPLOYABLE", "DEPLOYED", "ACCESSIBLE", "INTERACTABLE", "RUNTIME_VERIFIED", "ACCEPTANCE_VERIFIED", "OUTCOME_OBSERVED"]);
  assert.deepEqual(contract.required_routes.map((route) => route.path), ["/", "/map", "/feed", "/dashboard", "/standards"]);
  assert.deepEqual(contract.required_viewports.map((viewport) => viewport.id), ["desktop", "tablet", "mobile"]);
  assert.ok(contract.evidence_requirements.includes("artifact_hashes"));
  assert.ok(contract.attestation_requirements.includes("subject.commit"));
  assert.equal(currentState.schema, "ocp.declared-state/v2");
  assert.equal(currentState.attestation_resolution.latest_pointer_embedded, false);
  assert.equal(currentState.features.find((feature) => feature.id === "main-llm").implementation_state, "PARTIAL");
  assert.equal(currentState.features.find((feature) => feature.id === "dashboard").implementation_state, "IMPLEMENTED");
  assert.equal(currentState.features.find((feature) => feature.id === "pmg-source-golden-path").expected_verification.stage, "ACCEPTANCE_VERIFIED");
  assert.equal(currentState.golden_path.expected_verification.attestation_required, true);
  assert.equal(currentState.baseline.expected_verification.required_result, "PASS");
  assert.equal(containsKey(currentState, new Set(["latest_run_id", "workflow_run_id", "artifact_id", "artifact_digest", "github_execution"])), false);
  assert.equal(attestationSchema.properties.subject.properties.commit.pattern, "^[0-9a-fA-F]{7,64}$");
  assert.equal(capabilities.embedded_latest_execution, false);
  assert.equal(capabilities.capabilities[0].targets.canonical_repository, "iiyuv05-lab/OCP");
  assert.equal(capabilities.capabilities[0].operations.PULL_REQUEST.execution_resolution, "provider_observation");
  assert.equal(capabilities.capabilities[0].operations.ACTIONS.execution_resolution, "exact_subject_verification_attestation");
  assert.equal(containsKey(capabilities, new Set(["workflow_run_id", "artifact_id", "artifact_digest", "head_commit"])), false);
  assert.match(verifier, /artifactHashes/);
  assert.match(verifier, /npmCommand, \["test"\]/);
  assert.match(attestationGenerator, /attestation_verifies_subject|non_recursive|OCP_ATTESTATION_SUBJECT_SHA/);
  assert.match(healthcheck, /required_routes/);
  assert.match(verifyWorkflow, /OCP_PRIMARY_EVIDENCE_ARTIFACT_DIGEST/);
  assert.match(verifyWorkflow, /ocp-attestation-/);
  assert.match(verifyWorkflow, /Preserve verification failure/);
  assert.match(previewWorkflow, /workflow_dispatch/);
  assert.match(pullRequestTemplate, /Approved and applied remain separate/);
  assert.match(codeowners, /@iiyuv05-lab/);
  assert.match(harnessDocument, /Connection existence ≠ Capability availability ≠ Execution verification/);
  assert.match(attestationDocument, /V verifies A/);
  assert.match(attestationDocument, /Latest verified pointer/);
});

test("creates a non-recursive attestation for an exact verification subject", async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "ocp-attestation-test-"));
  const verificationPath = join(temporaryRoot, "verification.json");
  const outputRoot = join(temporaryRoot, "attestations");
  await writeFile(verificationPath, `${JSON.stringify({
    run_id: "RUN-TEST-001",
    git_commit: "1234567890abcdef1234567890abcdef12345678",
    finished_at: "2026-08-23T00:00:00.000Z",
    result: "PASS",
    stages: [{ id: "test", result: "PASS" }],
    browser_runs: [{ browser: { project: "desktop-chromium" }, viewport: { width: 1440, height: 900 } }],
    observed: { browser_run_count: 1, console_errors: 0, network_failures: 0 },
    artifact_hashes: { "build.log": "abc123" },
    environment: { platform: "test", ci: true },
  }, null, 2)}\n`, "utf8");

  try {
    const result = spawnSync(process.execPath, [new URL("../scripts/create-verification-attestation.mjs", import.meta.url).pathname], {
      cwd: new URL("../", import.meta.url),
      encoding: "utf8",
      env: {
        ...process.env,
        OCP_VERIFICATION_PATH: verificationPath,
        OCP_ATTESTATION_OUTPUT_DIR: outputRoot,
        OCP_ATTESTATION_PROVIDER: "github_actions",
        OCP_ATTESTATION_REPOSITORY: "iiyuv05-lab/OCP",
        OCP_ATTESTATION_SUBJECT_SHA: "1234567890abcdef1234567890abcdef12345678",
        OCP_ATTESTATION_RUN_ID: "42",
        OCP_ATTESTATION_RUN_ATTEMPT: "1",
        OCP_EVIDENCE_RUN_ID: "RUN-TEST-001",
        OCP_SOURCE_HEAD_REF: "codex/test",
        OCP_SOURCE_HEAD_SHA: "1234567890abcdef1234567890abcdef12345678",
        OCP_SOURCE_BASE_REF: "main",
        OCP_SOURCE_BASE_SHA: "abcdef1234567890abcdef1234567890abcdef12",
        OCP_VERIFICATION_OUTCOME: "success",
        OCP_PRIMARY_EVIDENCE_ARTIFACT_ID: "99",
        OCP_PRIMARY_EVIDENCE_ARTIFACT_DIGEST: "sha256:evidence",
      },
    });
    assert.equal(result.status, 0, result.stderr);
    const [file] = await readdir(outputRoot);
    const attestation = JSON.parse(await readFile(join(outputRoot, file), "utf8"));
    assert.equal(attestation.schema, "ocp.verification-attestation/v1");
    assert.equal(attestation.subject.commit, "1234567890abcdef1234567890abcdef12345678");
    assert.equal(attestation.execution.result, "PASS");
    assert.equal(attestation.source_context.head_ref, "codex/test");
    assert.equal(attestation.source_context.base_ref, "main");
    assert.equal(attestation.evidence.primary_artifact.id, "99");
    assert.equal(attestation.provenance.non_recursive, true);
    assert.equal(containsKey(attestation.subject, new Set(["attestation_id", "artifact_id", "run_id"])), false);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
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
