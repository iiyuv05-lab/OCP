# OCP Runtime Observability Independence

Constraint ID: `OCP-RC-002`

Status: approved runtime constraint · first repository harness slice implemented · Canonical Graph v0.1 remains normative

## Rule

An approved independent human or agent must be able to open, operate, and verify a deployed product without depending on the builder's account, workspace, conversation session, or manual screenshot capture.

```text
DEPLOYED ≠ RUNTIME VERIFIED
```

A screenshot remains valid runtime evidence only when an identified harness or reviewer produces it from the named runtime. Asking a user to relay a screenshot does not establish independent runtime observability.

## Six separate truths

```text
Conversation Truth
  → Specification Truth
  → Implementation Truth
  → Deployment Truth
  → Runtime Truth
  → Outcome Truth
```

Deployment Truth records what source was built, by which provider and workflow, for which target, under which access policy, and at which URL. It does not prove that an independent actor could fetch or operate the result.

Runtime Truth requires an executed, identifiable check against the deployed target. Outcome Truth requires a separate real-use observation or assessment. No truth stage inherits success from the previous stage.

## Feature and deployment verification ladder

| State | Required evidence |
| --- | --- |
| `DECLARED` | Versioned requirement or contract with an identified owner and boundary |
| `IMPLEMENTED` | Executable source exists; partial implementation remains explicitly partial |
| `BUILD_VERIFIED` | Reproducible build command, source commit, dependency lock, and successful build result |
| `DEPLOYABLE` | Target configuration, required bindings/secrets declaration, and provider eligibility |
| `DEPLOYED` | Provider deployment ID, immutable source/version reference, URL, and successful provider outcome |
| `ACCESSIBLE` | A named actor class fetched the URL without builder-session mediation |
| `INTERACTABLE` | The actor completed declared click, type, scroll, navigation, and viewport actions |
| `RUNTIME_VERIFIED` | DOM, console, network, screenshot, and test-result evidence was preserved for an executed run |
| `ACCEPTANCE_VERIFIED` | Approved acceptance criteria passed against that runtime evidence |
| `OUTCOME_OBSERVED` | Separate real-use observation tied to the implemented and deployed state |

Each state can also be `failed`, `blocked`, `unknown`, `stale`, or `not_run`. `ACCESSIBLE` is actor-scoped: user access, anonymous access, reviewer access, and independent-agent access are not interchangeable.

## Provider roles

Prototype generators and workspace-bound hosting may remain experiment adapters. They are not the Canonical Implementation Plane and do not become a production target merely because a URL exists.

```text
experiment or prototype
  → governed promotion
  → Git canonical implementation
  → branch or pull-request preview
  → independent runtime harness
  → review
  → production
```

OCP, Plus Minus G., 지영쌤, 오늘 제주, and other maintained products use this same promotion rule. Provider choice may vary, but the independent verification contract does not.

## Runtime evidence bundle

Every executed browser run should emit a self-describing bundle:

```text
.ocp/evidence/runs/<run-id>/
  manifest.json
  build.log
  verification.json
  dom/
  console.json
  network.json
  screenshots/
  playwright-report/
  playwright-test-results/
```

`run.json` names the runtime URL, source commit when known, deployment ID when known, actor class, viewport, actions, timestamps, result, failure reason, and hashes or paths for the attached artifacts. Secret values and session credentials never enter the bundle.

## Failure case

Case ID: `CASE-RUNTIME-001`

Observation: the parallel OCP v0.5 ChatGPT Sites deployment was visible in a user/browser context, while another verification path reported a cache miss and could not fetch or index the rendered content.

Previous assumption: a published URL is sufficient evidence that an independent agent can verify the product.

Result: `REFUTED · ENVIRONMENT DEPENDENT`.

Recorded deployment assessment:

| Dimension | State |
| --- | --- |
| Source present | verified |
| Provider deployment | verified |
| User/browser visibility | observed |
| Independent-agent accessibility | environment-dependent: failed in one path, passed in this harness environment |
| Reproducible automated runtime evidence | attached with a failing implementation-parity assertion |
| Acceptance verification | not run |

The ChatGPT Sites v0.5 deployment is therefore a frozen prototype snapshot. It may remain available for comparison, but it is not the canonical production path and must not be reported as `RUNTIME_VERIFIED`.

## Repository implementation boundary

Harness Baseline v1 extends the first repository slice with:

- this approved constraint;
- a machine-readable target and verification-state manifest;
- a reproducible Playwright browser harness;
- GitHub Actions entry points for local and external deployment verification;
- preserved browser artifacts on every run;
- a machine-readable verification contract, feature state ladder, and capability registry;
- direct Work, Map, Feed, and Standards route checks across desktop, tablet, and mobile;
- one `npm run verify` entry point and hashed evidence bundles;
- a truthful Standards status projection.

The GitHub repository now exists and is visible to the connected account. That connection does not prove that a branch was pushed, a pull request opened, Actions executed, a protected branch enforced, or an external preview verified; each remains at its separately observed state.
