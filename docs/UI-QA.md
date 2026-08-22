# OCP UI QA

Status: Harness Baseline v1 locally and in GitHub PR acceptance-verified; merge enforcement and external preview pending; frozen Sites snapshot remains a recorded parity failure

This file records the latest executed checks only. Git history is the audit history.

| Field | Value |
| --- | --- |
| Date | 2026-08-23 KST |
| Source under test | committed `codex/harness-baseline-v1` source `9b687d2` · frozen Sites snapshot `bdb4236` retained separately |
| Changed surfaces | Harness manifest/contract/state/capability files, direct Work/Map/Feed/Standards routes, three-viewport evidence runner, PR/preview workflow scaffolding, Standards reference index |
| Runtime | built Worker with isolated local D1/R2 at `http://127.0.0.1:4173`; frozen Sites v0.5 at `https://ocp-work-context-jiyoung-v05.iiyuv05.chatgpt.site/` |

## Results

| Criterion | Status | Evidence | Issue |
| --- | --- | --- | --- |
| Harness Baseline v1 single command | PASS | `RUN-20260823-001` executed `npm run verify` from commit `9b687d2`; lint, build, nine source tests, built-Worker start, healthcheck, and browser acceptance all passed. | GitHub execution is a separate state and was not yet run at this record. |
| Direct route health | PASS | `/`, `/map`, `/feed`, `/standards`, and `/api/bootstrap` returned HTTP 200 from the built Worker. | This is the isolated local D1/R2 runtime, not an external deployment. |
| Required interactions and viewports | PASS | Chromium completed direct open, local type, primary-nav click, and real Standards scroll at 1440 × 900, 768 × 1024, and 390 × 844; all three browser runs passed. | Observation submission was intentionally not performed. |
| Evidence completeness | PASS | The bundle contains build log, manifests, final and per-browser results, twelve DOM snapshots, twelve screenshots, aggregate/per-browser console and network records, Playwright HTML/JSON reports, and 91 SHA-256 hashes. | Run evidence is ignored by Git and intended for local retention plus CI artifact upload. |
| Runtime errors | PASS | Three browser actors recorded 0 console errors and 0 failed or HTTP 4xx/5xx product requests across 108 network events. | — |
| GitHub repository discovery | PASS | Connected account `iiyuv05-lab` exposed public repository `iiyuv05-lab/OCP` with admin/push permissions; local `origin` is configured. | Ordinary local HTTPS push is unavailable because this checkout has no GitHub credential; connector-backed write execution is recorded separately below. |
| GitHub PR and Actions execution | PASS | Git Data write created branch `codex/harness-baseline-v1`; [PR #1](https://github.com/iiyuv05-lab/OCP/pull/1) opened; Actions run `32598246321` completed successfully; artifact `9482159491` (`ocp-harness-32598246321`, 7,698,600 bytes, SHA-256 digest recorded) uploaded. | PR merge, branch protection, required-check enforcement, CODEOWNERS enforcement, and an external preview remain NOT RUN. |
| Diff integrity | PASS | `git diff --check` completed with no whitespace errors. | — |
| Work-entry truth invariant | PASS | A targeted Node source test confirmed Home is the default, no verified assistant is claimed, the draft routes to input review, unconnected capabilities are named, and v0.5/status boundaries exist. | Source-level coverage only. |
| Integrity Harness registration invariant | PASS | The source tests confirmed `OCP-MOD-INTEGRITY-001`, six separate truth records including Deployment Truth, the unmeasured-coverage rule, Standards discovery, and the first implemented repository/runtime-test slice. | Broader ingestion, scenario, and production acceptance coverage remains unimplemented. |
| TypeScript syntax | PASS | Isolated TypeScript transpilation reported `app/page.tsx`, `app/ocp-reference.ts`, and `app/layout.tsx` syntactically valid. | This is not a full typecheck. |
| Interface-language and reference invariant | PASS | A targeted Node test confirmed Korean, English, and dual options; persisted locale key; Standards view; v0.3/v0.4/status paths; and the explicit non-canonical ingestion boundary. | Source-level coverage only. |
| Participation authorization invariant | PASS | The targeted source tests confirmed an explicit writer-only join route, member-only observation/artifact access, no `local-preview` fallback, reviewer/admin-only gate controls, and truthful specification status. | This is source-level coverage, not a deployed D1 integration test. |
| Canonical/layout invariant | PASS | Existing targeted test passed: bitemporal schema and ephemeral projector geometry remain intact. | — |
| Existing UI truth invariant | PASS | Existing targeted test passed: no fabricated live status or starter UI returned to the source. | — |
| Plus Minus G. migration | PASS | Baseline and v0.3 migrations applied to a temporary SQLite database; workspace name, aliases, current revision, and revision record were queried successfully. | Target D1 application remains pending. |
| Public parallel link availability | PASS | Sites deployment `appgdep_6a88db4987688191bad1c5c6401141e6` succeeded, access revision 2 is `public`, and an unauthenticated browser loaded the OCP Home. | Public visibility does not grant OCP writer or Sites source-editor authority. |
| Original deployment participation API | FAIL | Both GET and POST to the original live `/api/workspace-members/me` returned 404 on 2026-08-22 KST. | The original URL remains on the older build by design. |
| `npm run lint` | PASS | ESLint completed with no errors after generated Playwright reports were excluded from source linting. | — |
| Production build and full `npm test` | PASS | vinext production build completed and all eight Node tests passed. | The build result does not imply a deployment or runtime pass. |
| Local built-Worker runtime harness | PASS | Playwright independently traversed Home → Map → Feed → Standards at 1440 × 900 and 390 × 844. Both runs recorded zero console errors and zero failed/non-2xx network requests against local D1/R2 bindings. | Local runtime verification is not production acceptance. |
| Frozen Sites runtime harness | FAIL | Both viewport actors fetched and traversed the deployment without console or network errors, then failed because snapshot `bdb4236` lacks the `OCP-RC-002` Standards marker. Evidence is preserved under `.ocp/runtime/evidence/CASE-RUNTIME-001/`. | The deployed snapshot and current implementation have drifted; Sites v0.5 remains frozen rather than being silently redeployed. |
| GitHub canonical repository | NOT RUN | The connected GitHub account reported no accessible repository, and the connector exposes no repository-creation operation. | Create or select the canonical repository and grant the GitHub app access before the workflow can execute externally. |
| External preview runtime | NOT RUN | No D1/R2-compatible preview provider is connected to the repository. | Connect a provider and emit a deployment URL to the runtime-verification workflow. |
| Remote Sites build and deployment | PASS | Remote build advanced through building and publishing to `succeeded`; version 1 serves deployment snapshot `bdb4236`. | Local production build remains unavailable as recorded above. |
| Sites access connector | PASS | A separate Site project was created without changing the original persisted project ID; version 1 was saved, deployed, and set to `public`. | Source-editor sharing was not changed. |
| Anonymous participation UI in browser | PASS | The parallel Site shows `로그인 · 참여` and `로그인 필요`; no anonymous writer state is presented. | Signed-in visitor → writer join and reviewer denial are still NOT RUN. |
| Signed-in participation flow | NOT RUN | Browser verification remained unauthenticated. | Verify visitor → writer join, raw access, and reviewer/admin denial with an authenticated test actor. |
| Language and Standards UI in browser | PASS | The local built Worker displays the new Deployment Truth ladder, `DEPLOYED ≠ RUNTIME VERIFIED`, ten repository references, and the explicit non-canonical document boundary. | Locale persistence and English/dual switching were not re-exercised in this pass. |
| Work-entry Home in browser | PASS | The parallel URL opens `OCP — Work with context` with Work pressed, Map available separately, no verified assistant, no model effect before approval, and a disabled empty-draft review action that enables after local text entry. | Submitting an input was intentionally not exercised without a signed-in writer. |
| Existing Map entry in browser | PASS | Selecting Map preserves the existing timeline, ViewSpec, model layers, projected nodes, relations, and Inspector; returning to Work restores Home. | The graph remains the recorded fixture projection, not newly mapped real project data. |
| Mobile boundary | PASS | At 390 × 844 the independent actor traversed Home, Map, Feed, and Standards; generated screenshots were visually inspected and the new Standards content retained a readable single-column order. | Mobile input submission was not exercised. |

## Remaining conditions

- The parallel Site audience is public and the v0.5 snapshot is frozen. Public access permits opening the interface; it does not imply anonymous canonical writes, raw-artifact access, source-edit authority, or parity with the current repository implementation.
- GitHub canonical source and an external preview remain blocked until a repository and a D1/R2-compatible provider are connected. Neither state is presented as deployed.
- Self-join intentionally grants `writer` only. Reviewer and admin promotion remains a server-managed governance action.
- ChatGPT Sites source-edit access is separate from OCP writer membership and is not granted by a public link.
- The v0.2/v0.3 documents are approved extension boundaries, not claims that sensor, capture, person, agent-run, Delta, Automation, Context Loader, Skin, or registry workflows already exist.
- The v0.4 agent architecture is a supplied working direction. Entry manifests, read events, working states, general commit/revert, Data Hub, UX Edit Mode, personal sidecar, and capability bridges remain unimplemented unless the status ledger says otherwise.
- The v0.5 work-entry, perception-layer, import, assistant-choice, and reproducibility architecture is a supplied working direction. Only the local Home-to-input-review routing surface is implemented; Main LLM, context recognition, account imports, W1–W8 promotion, Dashboard, Deployment Registry, Access Registry, and source-host event adapters remain unimplemented.
- Interface Locale currently covers primary surfaces. Some dense detail panels remain mixed-language, and display translation/output language are not implemented.
