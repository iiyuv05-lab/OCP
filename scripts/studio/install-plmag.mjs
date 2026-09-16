/** Explicit additive source installation; never runs migrations or deploys. */
import { readFile, writeFile, mkdir, access, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = fileURLToPath(new URL("../../", import.meta.url)),
  target = process.argv[2],
  apply = process.argv.includes("--apply");
if (!target)
  throw Error(
    "Usage: node scripts/studio/install-plmag.mjs /path/to/Plmag [--apply]",
  );
await access(path.join(target, "app/rep-notes-canvas.tsx"));
await access(path.join(target, "lib/note-canvas.ts"));
const files = [
  "core.mjs",
  "projector.mjs",
  "renderer.mjs",
  "app.mjs",
  "style.css",
].map((n) => "public/ocp-studio/" + n);
files.push(
  "lib/studio/canonical-store.mjs",
  "lib/studio/service.mjs",
  "lib/studio/rep-bridge.mjs",
  "app/studio/page.tsx",
  "app/studio/studio-client.tsx",
);
const adapters = [
  "_context.ts",
  "route.ts",
  "rep/route.ts",
  "receipt/route.ts",
].map((p) => "app/api/studio/" + p);
const report = {
  schema: "ocp.plmag.install/8",
  mode: apply ? "apply-source-only" : "dry-run",
  sourceChanged: [],
  productionChanged: false,
  migrationsApplied: false,
};
for (const name of [...files, ...adapters]) {
  const src = path.join(
      root,
      adapters.includes(name) ? "adapters/plmag/" + name : name,
    ),
    dest = path.join(target, name),
    bytes = await readFile(src);
  try {
    await access(dest);
    const old = await readFile(dest);
    if (!old.equals(bytes))
      throw Error("Conflict: existing target differs: " + name);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (apply) {
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(src, dest);
  }
  report.sourceChanged.push({
    path: name,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
const notePath = path.join(target, "app/rep-notes-canvas.tsx"),
  original = await readFile(notePath, "utf8");
if (!original.includes("ocp-v8-open-selected")) {
  const marker = "<strong>구름 캔버스</strong>";
  if (!original.includes(marker))
    throw Error("REP toolbar anchor drifted; refusing guessed patch.");
  const addition = `<button className="ocp-v8-open-selected" disabled={!ready||!selected.length} title="선택한 원문을 보존하고 OCP 기획 캔버스로 연결" onClick={async()=>{const noteIds=[...new Set(nodes.filter(n=>selected.includes(n.id)).flatMap(leafIds))];if(queue.current&&!await queue.current.flush())return;if(!noteIds.length){alert('노트 또는 구름을 선택하세요.');return;}try{const response=await fetch('/api/studio/rep',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({noteIds,includeCloud:true})});const data=await response.json();if(!response.ok)throw Error(data.error||'연결 실패');window.location.assign('/studio');}catch(error){alert((error as Error).message);}}}>OCP로 연결</button>`;
  if (apply) {
    await mkdir(path.join(target, ".studio-backup"), { recursive: true });
    await writeFile(
      path.join(target, ".studio-backup/rep-notes-canvas.tsx"),
      original,
    );
    await writeFile(notePath, original.replace(marker, addition + marker));
  }
  report.sourceChanged.push({
    path: "app/rep-notes-canvas.tsx",
    originalSha256: createHash("sha256").update(original).digest("hex"),
    operation: "add-toolbar-command",
  });
}
if (apply)
  await writeFile(
    path.join(target, "OCP-v8-INSTALL-REPORT.json"),
    JSON.stringify(report, null, 2),
  );
console.log(JSON.stringify(report, null, 2));
