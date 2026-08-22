# OCP — Operational Context Protocol

OCP is an operational map of observations, evidence, models, responsibility, and state transitions. The Canonical Graph, its bitemporal state, and immutable evidence lineage remain separate from every rendered view.

## Local development

Requirements: Node.js `>=22.13.0` and npm.

```bash
npm ci
npm run dev
```

The current vinext/Cloudflare runtime expects the D1 binding `DB` and R2 binding `RAW_ARTIFACTS` declared in `.openai/hosting.json`. Local development uses project-local Wrangler state.

## Verification

```bash
npm run verify
```

The one command runs lint, the production build and source tests, a built Worker with isolated local D1/R2 state, direct health checks, and the desktop/tablet/mobile browser contract. `npm test` includes the production build, so the harness does not run a duplicate build.

To verify a deployed preview or production target independently:

```bash
OCP_RUNTIME_URL=https://preview.example.test \
OCP_RUNTIME_TARGET_ID=preview-123 \
npm run test:runtime:external
```

The harness stores its self-describing evidence bundle under `.ocp/evidence/runs/<run_id>/`. Generated runs are ignored by Git and uploaded by the GitHub workflows.

Machine entry points:

- [`.ocp/manifest.json`](.ocp/manifest.json) — commands and baseline routing
- [`.ocp/verification-contract.json`](.ocp/verification-contract.json) — routes, viewports, acceptance checks, and required evidence
- [`.ocp/current-state.json`](.ocp/current-state.json) — feature-level verification state
- [`.ocp/capability-registry.json`](.ocp/capability-registry.json) — connection, capability, and execution state
- [`docs/OCP-HARNESS-BASELINE-V1.md`](docs/OCP-HARNESS-BASELINE-V1.md) — human-readable contract

## Runtime truth

`DEPLOYED ≠ RUNTIME VERIFIED`.

- [`docs/OCP-RUNTIME-OBSERVABILITY.md`](docs/OCP-RUNTIME-OBSERVABILITY.md) defines `OCP-RC-002`, Deployment Truth, the verification ladder, and `CASE-RUNTIME-001`.
- [`.ocp/runtime/targets.json`](.ocp/runtime/targets.json) records real and missing runtime targets without claiming a canonical Deployment Registry.
- [`docs/OCP-DEPLOYMENT-TRANSITION.md`](docs/OCP-DEPLOYMENT-TRANSITION.md) records the transition from a frozen ChatGPT Sites prototype to Git-canonical preview and production paths.

## Repository map

- `app/` — React 19/vinext product and route handlers
- `db/`, `drizzle/` — Canonical Graph foundation and migrations
- `tests/` — source/render invariants and browser runtime tests
- `docs/` — product contracts, implementation status, UI governance, and executed QA evidence
- `.github/workflows/` — PR, local-runtime, and declared-preview verification entry points

ChatGPT Sites is retained only as a frozen v0.5 prototype snapshot. A maintained release requires a Git canonical source, a compatible external preview target, and an independent passing runtime evidence bundle.
