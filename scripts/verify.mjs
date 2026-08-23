import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";

const repositoryRoot = process.cwd();
const contract = JSON.parse(await readFile(join(repositoryRoot, ".ocp", "verification-contract.json"), "utf8"));
const startedAt = new Date();
const timestamp = startedAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const requestedRunId = process.env.OCP_RUN_ID?.trim();
const runId = requestedRunId || `RUN-${timestamp}`;
const runRoot = join(repositoryRoot, ".ocp", "evidence", "runs", runId);
const buildLog = join(runRoot, "build.log");
const runtimeUrl = (process.env.OCP_RUNTIME_URL || contract.runtime.default_url).replace(/\/$/, "");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const stages = [];
let runtime = null;

await mkdir(runRoot, { recursive: true });
await writeFile(buildLog, `OCP Harness Baseline v1\nrun_id=${runId}\nstarted_at=${startedAt.toISOString()}\n\n`, "utf8");

function git(args, fallback = null) {
  const result = spawnSync("git", args, { cwd: repositoryRoot, encoding: "utf8", timeout: 10_000 });
  return result.status === 0 ? result.stdout.trim() : fallback;
}

const gitCommit = git(["rev-parse", "HEAD"], "UNKNOWN");
const gitBranch = git(["branch", "--show-current"], "UNKNOWN");
const trackedChanges = git(["status", "--porcelain", "--untracked-files=no"], "UNKNOWN");
const untrackedChanges = git(["status", "--porcelain", "--untracked-files=normal"], "UNKNOWN");
const dirtyState = {
  tracked: trackedChanges === "UNKNOWN" ? "UNKNOWN" : trackedChanges.length > 0,
  any: untrackedChanges === "UNKNOWN" ? "UNKNOWN" : untrackedChanges.length > 0,
  status_lines: untrackedChanges === "UNKNOWN" || !untrackedChanges ? [] : untrackedChanges.split("\n"),
};

async function appendLog(value) {
  await writeFile(buildLog, value, { encoding: "utf8", flag: "a" });
}

async function runCommand(id, command, args, extraEnvironment = {}) {
  const stageStartedAt = new Date().toISOString();
  await appendLog(`\n[${id}] ${command} ${args.join(" ")}\n`);
  const child = spawn(command, args, {
    cwd: repositoryRoot,
    env: { ...process.env, ...extraEnvironment },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    void appendLog(chunk.toString());
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    void appendLog(chunk.toString());
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
  const stage = {
    id,
    command: `${command} ${args.join(" ")}`,
    started_at: stageStartedAt,
    finished_at: new Date().toISOString(),
    result: exitCode === 0 ? "PASS" : "FAIL",
    exit_code: exitCode,
  };
  stages.push(stage);
  return stage;
}

function startRuntime() {
  const stageStartedAt = new Date().toISOString();
  const child = spawn(process.execPath, ["scripts/start-runtime.mjs"], {
    cwd: repositoryRoot,
    env: { ...process.env, OCP_RUNTIME_URL: runtimeUrl, OCP_RUNTIME_STATE: join(runRoot, "runtime-state") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    void appendLog(chunk.toString());
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    void appendLog(chunk.toString());
  });
  runtime = { child, stageStartedAt };
}

async function waitForRuntime() {
  const deadline = Date.now() + contract.runtime.startup_timeout_ms;
  const healthUrl = new URL(contract.runtime.healthcheck_path, `${runtimeUrl}/`).href;
  while (Date.now() < deadline) {
    if (runtime.child.exitCode !== null) throw new Error(`Runtime exited before healthcheck with code ${runtime.child.exitCode}.`);
    try {
      const response = await fetch(healthUrl, { headers: { accept: "application/json" } });
      if (response.ok) {
        stages.push({
          id: "start",
          command: contract.commands.start,
          started_at: runtime.stageStartedAt,
          finished_at: new Date().toISOString(),
          result: "PASS",
          exit_code: null,
        });
        return;
      }
    } catch {
      // The built Worker is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Runtime did not become healthy within ${contract.runtime.startup_timeout_ms}ms.`);
}

async function stopRuntime() {
  if (!runtime?.child || runtime.child.exitCode !== null) return;
  runtime.child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => runtime.child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 4_000)),
  ]);
  if (runtime.child.exitCode === null) runtime.child.kill("SIGKILL");
}

async function findFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await findFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

async function readJsonIfPresent(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

let executionError = null;
try {
  const lint = await runCommand("lint", npmCommand, ["run", "lint"]);
  if (lint.result !== "PASS") throw new Error("Lint failed.");

  const tests = await runCommand("test", npmCommand, ["test"]);
  if (tests.result !== "PASS") throw new Error("Build or source tests failed.");

  startRuntime();
  await waitForRuntime();

  const health = await runCommand("healthcheck", npmCommand, ["run", "runtime:healthcheck"], { OCP_RUNTIME_URL: runtimeUrl });
  if (health.result !== "PASS") throw new Error("Runtime healthcheck failed.");

  const browser = await runCommand("browser_test", npmCommand, ["run", "test:runtime:external"], {
    OCP_RUNTIME_URL: runtimeUrl,
    OCP_RUNTIME_TARGET_ID: "ocp-local-runtime",
    OCP_EVIDENCE_RUN_DIR: runRoot,
    OCP_RUN_ID: runId,
    OCP_ALLOW_SAFE_LOCAL_MUTATIONS: "true",
  });
  if (browser.result !== "PASS") throw new Error("Browser acceptance failed.");
} catch (error) {
  executionError = error instanceof Error ? { name: error.name, message: error.message } : { name: "Error", message: String(error) };
} finally {
  await stopRuntime();
}

const browserRoot = join(runRoot, "browsers");
let browserFiles = [];
try {
  browserFiles = await readdir(browserRoot, { withFileTypes: true });
} catch {
  browserFiles = [];
}
const browserRuns = [];
const allConsole = [];
const allNetwork = [];
for (const entry of browserFiles.filter((item) => item.isDirectory())) {
  const projectRoot = join(browserRoot, entry.name);
  const verification = await readJsonIfPresent(join(projectRoot, "verification.json"), null);
  if (verification) browserRuns.push(verification);
  const consoleEntries = await readJsonIfPresent(join(projectRoot, "console.json"), []);
  const networkEntries = await readJsonIfPresent(join(projectRoot, "network.json"), []);
  allConsole.push(...consoleEntries.map((item) => ({ project: entry.name, ...item })));
  allNetwork.push(...networkEntries.map((item) => ({ project: entry.name, ...item })));
}
await writeFile(join(runRoot, "console.json"), `${JSON.stringify(allConsole, null, 2)}\n`, "utf8");
await writeFile(join(runRoot, "network.json"), `${JSON.stringify(allNetwork, null, 2)}\n`, "utf8");

const failedStages = stages.filter((stage) => stage.result === "FAIL");
const failedBrowserRuns = browserRuns.filter((run) => run.result !== "PASS");
const result = executionError || failedStages.length || failedBrowserRuns.length || browserRuns.length !== contract.required_viewports.length ? "FAIL" : "PASS";
const finishedAt = new Date().toISOString();
const verificationPath = join(runRoot, "verification.json");
const verification = {
  schema: "ocp.verification-result/v1",
  contract_id: contract.contract_id,
  baseline_id: contract.baseline_id,
  run_id: runId,
  git_commit: gitCommit,
  git_branch: gitBranch,
  dirty_state: dirtyState,
  started_at: startedAt.toISOString(),
  finished_at: finishedAt,
  runtime_url: runtimeUrl,
  test_version: `${contract.contract_id}@${contract.version}`,
  environment: { platform: process.platform, architecture: process.arch, node: process.version, ci: Boolean(process.env.CI) },
  stages,
  browser_runs: browserRuns,
  expected: contract.acceptance_checks.map((check) => ({ id: check.id, requirement: check.requirement })),
  observed: {
    browser_run_count: browserRuns.length,
    required_browser_run_count: contract.required_viewports.length,
    console_events: allConsole.length,
    console_errors: allConsole.filter((entry) => entry.type === "error").length,
    network_events: allNetwork.length,
    network_failures: allNetwork.filter((entry) => entry.failure || (entry.status !== null && entry.status >= 400)).length,
  },
  result,
  failure: executionError,
};
await writeFile(verificationPath, `${JSON.stringify(verification, null, 2)}\n`, "utf8");

const evidenceFiles = (await findFiles(runRoot)).filter((path) => !["manifest.json", "verification.json"].includes(basename(path)));
const artifactHashes = {};
for (const path of evidenceFiles) {
  const fileStat = await stat(path);
  if (!fileStat.isFile()) continue;
  artifactHashes[relative(runRoot, path)] = createHash("sha256").update(await readFile(path)).digest("hex");
}
verification.artifact_hashes = artifactHashes;
await writeFile(verificationPath, `${JSON.stringify(verification, null, 2)}\n`, "utf8");
await writeFile(join(runRoot, "manifest.json"), `${JSON.stringify({
  schema: "ocp.evidence-run-manifest/v1",
  contract_id: contract.contract_id,
  baseline_id: contract.baseline_id,
  run_id: runId,
  git_commit: gitCommit,
  dirty_state: dirtyState,
  started_at: startedAt.toISOString(),
  finished_at: finishedAt,
  runtime_url: runtimeUrl,
  browsers: browserRuns.map((run) => run.browser),
  viewports: browserRuns.map((run) => run.viewport),
  test_version: `${contract.contract_id}@${contract.version}`,
  environment: verification.environment,
  actions: browserRuns.flatMap((run) => run.actions ?? []),
  expected: verification.expected,
  observed: verification.observed,
  result,
  artifact_hashes: artifactHashes,
}, null, 2)}\n`, "utf8");

process.stdout.write(`\nHarness ${result}: ${relative(repositoryRoot, runRoot)}\n`);
if (result !== "PASS") process.exitCode = 1;
