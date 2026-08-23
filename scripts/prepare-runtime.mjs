import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const wrangler = join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler");
const config = "dist/server/wrangler.json";
const persistTo = process.env.OCP_RUNTIME_STATE?.trim() || join(tmpdir(), "ocp-runtime-state");
const database = "site-creator-d1";
const common = ["d1", "execute", database, "--local", "--config", config, "--persist-to", persistTo];

function executeJson(sql) {
  const output = execFileSync(wrangler, [...common, "--command", sql, "--json"], { encoding: "utf8" });
  return JSON.parse(output);
}

function firstRow(result) {
  return result?.[0]?.results?.[0] ?? null;
}

const baseline = firstRow(executeJson("SELECT name FROM sqlite_schema WHERE type='table' AND name='workspaces'"));
if (!baseline) {
  execFileSync(wrangler, [...common, "--file", "drizzle/0000_canonical_v01.sql"], { stdio: "inherit" });
}

const workspace = firstRow(executeJson("SELECT name FROM workspaces WHERE id='workspace-nexus'"));
if (workspace?.name !== "Plus Minus G.") {
  execFileSync(wrangler, [...common, "--file", "drizzle/0001_plus_minus_g_v03.sql"], { stdio: "inherit" });
}

process.stdout.write("Local D1 runtime is prepared.\n");
