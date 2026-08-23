import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";

const repositoryRoot = process.cwd();
const contract = JSON.parse(await readFile(join(repositoryRoot, ".ocp", "verification-contract.json"), "utf8"));

function environment(name, fallback = null) {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function git(args, fallback) {
  const result = spawnSync("git", args, { cwd: repositoryRoot, encoding: "utf8", timeout: 10_000 });
  return result.status === 0 ? result.stdout.trim() : fallback;
}

function optional(value) {
  return value === undefined || value === null || value === "" ? null : String(value);
}

function sanitize(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, "-");
}

function normalizeDigest(value) {
  const digest = optional(value);
  return digest && /^[0-9a-f]{64}$/i.test(digest) ? `sha256:${digest.toLowerCase()}` : digest;
}

const provider = environment("OCP_ATTESTATION_PROVIDER", process.env.GITHUB_ACTIONS ? "github_actions" : "local");
const executionRunId = environment("GITHUB_RUN_ID", environment("OCP_ATTESTATION_RUN_ID", `local-${Date.now()}`));
const runAttempt = Number(environment("GITHUB_RUN_ATTEMPT", environment("OCP_ATTESTATION_RUN_ATTEMPT", "1")));
const evidenceRunId = environment("OCP_EVIDENCE_RUN_ID", `RUN-GITHUB-${executionRunId}-${runAttempt}`);
const configuredVerificationPath = environment("OCP_VERIFICATION_PATH");
const verificationPath = configuredVerificationPath
  ? (isAbsolute(configuredVerificationPath) ? configuredVerificationPath : join(repositoryRoot, configuredVerificationPath))
  : join(repositoryRoot, ".ocp", "evidence", "runs", evidenceRunId, "verification.json");

let verification = null;
let verificationBytes = null;
try {
  verificationBytes = await readFile(verificationPath);
  verification = JSON.parse(verificationBytes.toString("utf8"));
} catch {
  verification = null;
}

const requestedOutcome = environment("OCP_VERIFICATION_OUTCOME")?.toLowerCase();
const executionResult = !verification
  ? "ERROR"
  : requestedOutcome === "failure" || requestedOutcome === "cancelled" || verification.result !== "PASS"
    ? "FAIL"
    : "PASS";
const requestedSubjectCommit = environment("OCP_ATTESTATION_SUBJECT_SHA", environment("GITHUB_SHA", git(["rev-parse", "HEAD"], "UNKNOWN")));
const verifiedSubjectCommit = optional(verification?.git_commit);
if (verifiedSubjectCommit && verifiedSubjectCommit !== requestedSubjectCommit) {
  throw new Error(`Attestation subject ${requestedSubjectCommit} does not match verified Git commit ${verifiedSubjectCommit}.`);
}
const subjectCommit = verifiedSubjectCommit ?? requestedSubjectCommit;
if (!/^[0-9a-f]{7,64}$/i.test(subjectCommit)) {
  throw new Error(`Attestation subject is not a Git commit SHA: ${subjectCommit}`);
}
if (!Number.isInteger(runAttempt) || runAttempt < 1) {
  throw new Error(`Run attempt must be a positive integer: ${runAttempt}`);
}

const browserRuns = verification?.browser_runs ?? [];
const recordedAt = new Date().toISOString();
const attestation = {
  schema: "ocp.verification-attestation/v1",
  attestation_id: `ATT-${sanitize(provider)}-${sanitize(executionRunId)}-${runAttempt}`,
  subject: {
    type: "git_commit",
    repository: environment("GITHUB_REPOSITORY", environment("OCP_ATTESTATION_REPOSITORY", "local/OCP")),
    commit: subjectCommit,
  },
  source_context: {
    trigger_ref: optional(environment("GITHUB_REF", environment("OCP_SOURCE_TRIGGER_REF"))),
    head_ref: optional(environment("OCP_SOURCE_HEAD_REF", environment("GITHUB_HEAD_REF", environment("GITHUB_REF_NAME")))),
    head_commit: optional(environment("OCP_SOURCE_HEAD_SHA", subjectCommit)),
    base_ref: optional(environment("OCP_SOURCE_BASE_REF", environment("GITHUB_BASE_REF"))),
    base_commit: optional(environment("OCP_SOURCE_BASE_SHA")),
  },
  contract: {
    id: contract.contract_id,
    version: contract.version,
    required_stage: "ACCEPTANCE_VERIFIED",
  },
  execution: {
    provider,
    workflow: environment("GITHUB_WORKFLOW", environment("OCP_ATTESTATION_WORKFLOW", "local-verification")),
    workflow_ref: optional(environment("GITHUB_WORKFLOW_REF")),
    run_id: executionRunId,
    run_attempt: runAttempt,
    event: environment("GITHUB_EVENT_NAME", environment("OCP_ATTESTATION_EVENT", "local")),
    result: executionResult,
    verified_at: verification?.finished_at ?? recordedAt,
  },
  evidence: {
    run_id: evidenceRunId,
    verification_path: verification ? relative(repositoryRoot, verificationPath) : null,
    verification_sha256: verificationBytes ? createHash("sha256").update(verificationBytes).digest("hex") : null,
    primary_artifact: {
      id: optional(environment("OCP_PRIMARY_EVIDENCE_ARTIFACT_ID")),
      name: optional(environment("OCP_PRIMARY_EVIDENCE_ARTIFACT_NAME")),
      digest: normalizeDigest(environment("OCP_PRIMARY_EVIDENCE_ARTIFACT_DIGEST")),
      url: optional(environment("OCP_PRIMARY_EVIDENCE_ARTIFACT_URL")),
    },
  },
  verification: {
    stages: verification?.stages ?? [],
    tests: verification?.expected ?? [],
    projects: browserRuns.map((run) => run.browser?.project).filter(Boolean),
    viewports: browserRuns.map((run) => run.viewport).filter(Boolean),
    browser_run_count: verification?.observed?.browser_run_count ?? 0,
    console_errors: verification?.observed?.console_errors ?? 0,
    network_failures: verification?.observed?.network_failures ?? 0,
    artifact_hashes: verification?.artifact_hashes ?? {},
  },
  verifier: {
    actor_class: contract.runtime.actor_class,
    environment: verification?.environment ?? {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
      ci: Boolean(process.env.CI),
    },
  },
  provenance: {
    generated_by: "scripts/create-verification-attestation.mjs",
    non_recursive: true,
  },
  recorded_at: recordedAt,
};

const outputRoot = environment("OCP_ATTESTATION_OUTPUT_DIR", join(repositoryRoot, ".ocp", "attestations", "runs"));
const resolvedOutputRoot = isAbsolute(outputRoot) ? outputRoot : join(repositoryRoot, outputRoot);
const outputPath = join(resolvedOutputRoot, `${sanitize(provider)}-${sanitize(executionRunId)}-attempt-${runAttempt}.json`);
await mkdir(resolvedOutputRoot, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(attestation, null, 2)}\n`, "utf8");

process.stdout.write(`Verification attestation ${executionResult}: ${relative(repositoryRoot, outputPath)}\n`);
if (executionResult !== "PASS") process.exitCode = 1;
