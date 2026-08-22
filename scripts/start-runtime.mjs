import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const persistTo = process.env.OCP_RUNTIME_STATE?.trim() || join(tmpdir(), "ocp-runtime-state");
const wrangler = join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler");
const runtimeEnvironment = { ...process.env, OCP_RUNTIME_STATE: persistTo, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" };
const preparation = spawnSync(process.execPath, ["scripts/prepare-runtime.mjs"], { env: runtimeEnvironment, stdio: "inherit" });

if (preparation.status !== 0) process.exit(preparation.status ?? 1);

const runtime = spawn(wrangler, [
  "dev",
  "--config", "dist/server/wrangler.json",
  "--ip", "127.0.0.1",
  "--port", "4173",
  "--persist-to", persistTo,
  "--show-interactive-dev-session=false",
], { env: runtimeEnvironment, stdio: "inherit" });

process.on("SIGINT", () => runtime.kill("SIGINT"));
process.on("SIGTERM", () => runtime.kill("SIGTERM"));
runtime.on("exit", (code) => process.exit(code ?? 1));
