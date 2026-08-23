import { readFile } from "node:fs/promises";

const contractUrl = new URL("../.ocp/verification-contract.json", import.meta.url);
const contract = JSON.parse(await readFile(contractUrl, "utf8"));
const runtimeUrl = (process.env.OCP_RUNTIME_URL || contract.runtime.default_url).replace(/\/$/, "");
const paths = [contract.runtime.healthcheck_path, ...contract.required_routes.map((route) => route.path)];
const observations = [];

for (const path of paths) {
  const url = new URL(path, `${runtimeUrl}/`).href;
  const response = await fetch(url, { headers: { accept: path.startsWith("/api/") ? "application/json" : "text/html" } });
  observations.push({ path, status: response.status, content_type: response.headers.get("content-type") });
  if (!response.ok) throw new Error(`Healthcheck failed for ${path}: HTTP ${response.status}`);
}

process.stdout.write(`${JSON.stringify({ runtime_url: runtimeUrl, result: "PASS", observations }, null, 2)}\n`);
