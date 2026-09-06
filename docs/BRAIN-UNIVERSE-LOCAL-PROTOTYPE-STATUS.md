# Brain Universe — local prototype delivery status

Date: 2026-09-07. This is a delivery record, not proof of integrated OCP implementation or deployment.

## Existing handoff

Continue draft PR #4 and branch `codex/brain-universe-rts-20260907`. The implementation contract is `docs/BRAIN-UNIVERSE-CODEX-HANDOFF.md`. Do not create another planning-only PR.

The Codex connector bot responded to the existing implementation requests with: "To use Codex here, create an environment for this repo." No accepted/running/completed implementation was observed. The environment prerequisite must be resolved before retrying cloud execution. Do not send repeated mentions while that prerequisite remains unresolved.

## Runnable implementation delivered separately

A self-contained local HTML/CSS/JavaScript prototype and its source ZIP have been created and delivered in the user conversation. They are NOT committed in this repository by this status update. The archive is `Brain-Universe-Source-v0.1.zip` and contains:

- `app/index.html`: dependency-free local app with synthetic examples only.
- `server.mjs`: optional loopback-only Node HTTP server.
- `tests/test_app.py`: offline Chromium interaction tests.
- `README.md`, `PLAN.md`, `CODEX-NEXT.md`, `QA.md`, `test-results.json`.

Public app SHA-256: `39a5649a1c48b0380661ae65a9db7bb6144eb675ec6cd315f6ace49c3b79f20d`.
Archive SHA-256: `f529306b35c9f5ab29062951526e48b6959b10cbc9ff589ab5a263d83abf155c`.

Use the archive when it is attached to the Codex task or made available in its local workspace. Do not assume that chat sandbox links are accessible from another agent. If the source archive is unavailable, request it rather than pretending to have inspected it.

## Implemented in the local prototype

Universe/tactical/list/problem/audit/history views; stable object identity across views; search, project/faction filters and one-hop inspection; pan/zoom; original mechanical/organic/crystalline vector motifs; local candidate creation; typed relation proposals with evidence; adoption as a separate internal module candidate preserving its external source; evidence-required verification reports and reopening; read-only Markdown/TXT and Canvas file-reference import; asset metadata; restricted frontmatter extraction with diagnostics; unresolved/ambiguous links and duplicate source-ID detection; immutable raw text; independent source valid/recorded times and app receive time; validated JSON backup/restore; opt-in browser persistence with explicit failures; no network requests.

These are local overlay DTOs, not new approved canonical entity kinds. No original vault files were changed. A separate private-data example was delivered only to the user and is NOT part of the public source ZIP. Never publish the private HTML/JSON or its screenshots.

## Actual verification

33 offline Chromium checks passed, including imports, raw preservation, malformed JSON rejection, candidate adoption, verification evidence, reopening, keyboard selection, 390px layout, reduced-motion and zero application network requests. HTML was injected into the browser renderer with `set_content`; managed browser policy blocked file/HTTP URL navigation and was not changed.

Additional checks confirmed that the optional Node server returns the exact public HTML, serves HEAD, and returns 404 for unlisted/private paths.

NOT RUN: normal-origin persistent-storage success; full OCP `npm run lint` / `npm test`; integrated canonical graph, authorization and deployment; browser navigation to an actual hosted URL. Repository cloning in the local runtime failed due DNS restrictions. None of the local results substitutes for integrated OCP validation.

## Next executable work

Once the environment and archive are available, inspect existing OCP instructions and components, then port the working interactions to an isolated `/brain-universe` route using React 19/vinext/custom CSS and Canonical Graph -> ViewSpec -> projector. Preserve the original raw sources, independent state/time axes, human approval gates and private-data boundaries. Add actual graph adapters and authorized persistence rather than declaring the standalone DTO canonical.

Run the repository's real lint/tests and URL-based browser checks. Keep the PR draft until the integrated changes are ready. Do not claim deployment without a returned and verified URL.
