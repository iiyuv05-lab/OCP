# OCP Harness Baseline v1

Contract ID: `OCP-VERIFY-001`

Status: local acceptance verified by `RUN-20260823-001` · GitHub PR execution pending

## Purpose

An independent human or agent can determine how to build, start, inspect, and verify OCP without asking the builder for commands or screenshots. GitHub is an external collaboration and merge adapter for this same local verification unit; it is not a prerequisite for running the unit.

```text
Contract → State Ladder → Build → Runtime → Browser Test
         → Evidence Artifact → Verification Report → OCP State Proposal
```

Verification never mutates a Canonical model directly. A passed run is evidence for a later state update, not an automatic product-state promotion.

## Machine entry points

| Purpose | Path |
| --- | --- |
| Harness manifest | `.ocp/manifest.json` |
| Verification contract | `.ocp/verification-contract.json` |
| Current implementation state | `.ocp/current-state.json` |
| Capability registry | `.ocp/capability-registry.json` |
| Runtime targets | `.ocp/runtime/targets.json` |
| Executed run evidence | `.ocp/evidence/runs/<run_id>/` |

The single local entry point is `npm run verify`. It runs lint, the production build and source tests, a built Worker with isolated D1/R2 state, a health check, and the browser acceptance suite.

## Feature-level state ladder

```text
DECLARED
→ IMPLEMENTED
→ BUILD_VERIFIED
→ DEPLOYABLE
→ DEPLOYED
→ ACCESSIBLE
→ INTERACTABLE
→ RUNTIME_VERIFIED
→ ACCEPTANCE_VERIFIED
→ OUTCOME_OBSERVED
```

Each feature owns its own state. Partial implementation is not runtime verification. Local runtime verification is not external deployment verification. Outcome observation requires separate real-use evidence.

## Evidence bundle

```text
.ocp/evidence/runs/RUN-.../
├─ manifest.json
├─ build.log
├─ playwright-report/
├─ playwright-report.json
├─ screenshots/
├─ dom/
├─ browsers/
├─ console.json
├─ network.json
└─ verification.json
```

The bundle records run ID, Git commit and dirty state, timestamps, runtime URL, browser, viewport, test version, environment, actions, expected and observed results, final result, and SHA-256 hashes. A failure remains evidence and exits the command unsuccessfully.

## GitHub boundary

The repository can carry workflow files, a PR template, and CODEOWNERS before the workflow has ever run. Those files make the workflow specification `IMPLEMENTED`; only an actual PR and Actions run can make GitHub execution verified.

```text
Connection existence ≠ Capability availability ≠ Execution verification
```

Branch protection, required checks, CODEOWNERS enforcement, preview deployment, and production promotion remain separate capabilities and retain `NOT RUN` or `BLOCKED` until independently observed.

## Failure and rollback

A failed test is an OCP verification event candidate. A later event adapter may propose a revert, but the harness does not silently reset or mutate source. The intended timeline is change → build → runtime check → failure evidence → repair or revert proposal → new verification run.
