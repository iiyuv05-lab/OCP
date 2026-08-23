# CASE-RUNTIME-001 evidence

Recorded at: 2026-08-22T08:56:43Z–08:57:06Z

Target: frozen ChatGPT Sites v0.5 snapshot

Actor: `independent-browser-harness`

Projects: `desktop-chromium` at 1440×900 and `mobile-chromium` at 390×844

## Observed result

- Root document and required assets fetched.
- `/api/bootstrap` and `/api/workspace-members/me` returned 200.
- Home, Map, Feed, and Standards navigation was operable in both projects.
- Console errors: 0.
- Relevant network failures: 0.
- Harness result: `FAIL` in both projects.
- Failure reason: the frozen deployment does not contain the `OCP-RC-002` Standards marker implemented in the tested repository branch.

This run proves accessibility and interaction in this harness environment. It does not refute the separately observed cache-miss failure in another agent environment; accessibility remains environment-dependent. The run also proves implementation/deployment drift, so the target is not `RUNTIME_VERIFIED`. Product acceptance was not run.

Each project directory preserves `run.json`, DOM, console, network, home screenshot, and failure screenshot. The full local Playwright report, video, and trace remain under ignored `outputs/runtime/` and are uploaded automatically in CI.
