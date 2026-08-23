# OCP UI audit

Status: Harness Baseline v1 locally and in GitHub PR acceptance-verified · Sites v0.5 frozen with recorded deployment drift

| Field | Value |
| --- | --- |
| Audited source | `codex/harness-baseline-v1` · source commit `9b687d2` |
| Audit date | 2026-08-23 KST |
| Runtime | built Worker with local D1/R2 + frozen Sites version 1 from deployment snapshot `bdb4236` |
| Runtime viewport | 390 × 844, 768 × 1024, and 1440 × 900; prior audit boundaries retained in Git history |
| Evidence | `RUN-20260823-001`: committed source, source/build tests, health checks, independent DOM/console/network records, twelve screenshots, 91 artifact hashes; frozen deployment failure bundle retained separately |

## Surface inventory

| Surface | Purpose | Current strengths |
| --- | --- | --- |
| App shell | Work-entry Home plus Map/Feed/Standards navigation, input, search | Makes the daily work entry primary while retaining graph and revision inspection. |
| Work-entry Home | Local scope selection and draft routing into governed input | Clearly separates a local draft from connected assistant/context behavior and names unavailable capabilities. |
| Time bar | Valid and recorded cutoffs | Correctly separates two time axes. |
| Control rail | ViewSpec, mode, layers, perspective, REP lens | Exposes eight projections and four model modes. |
| Map | Spatial semantic projection | Distinctive grid, relation lines, canonical identity continuity. |
| Inspector | State, relations, history, evidence | Strong object-first context and provenance chain. |
| Feed | Recorded changes and review queue | Clear editorial card structure and gate labels. |
| Input drawer | Captured input and provenance | Separates raw artifact language from interpretation. |
| Patch drawer | Human-gated model change | Shows graph diff, evidence, adversarial check, and risk. |
| Command palette | Object discovery | Fast entry point and useful search result structure. |
| Standards | Repository contract and implementation-ledger discovery | Includes the v0.5 work-entry/reproducibility direction without presenting repository documents as canonical objects. |
| Deployment Truth | Repository-recorded verification ladder and target evidence | Distinguishes build, deployment, accessibility, interaction, runtime, and acceptance states without presenting the panel as a live registry. |

## Finding ledger

| ID | Severity | Surface | Observed fact | User impact | Smallest remedy | Status |
| --- | --- | --- | --- | --- | --- | --- |
| T-01 | P0 | Input | Network and non-2xx failures are swallowed before a local success event/toast is created. | A failed observation can look persisted. | Update UI only after a confirmed response; retain draft and show an error otherwise. | Resolved · runtime verified |
| T-02 | P0 | Patch | A local decision is set before authorization and server confirmation. | A rejected request can look approved. | Wait for the response and distinguish approved from applied. | Resolved · runtime verified |
| T-03 | P0 | Shell/Feed | `LIVE`, `NOW`, collaborator presence, score deltas, and active recorder copy are hard-coded fixtures. | Recorded data looks realtime. | Label the baseline as a snapshot and show connected status only after a real bootstrap response. | Resolved |
| R-01 | P0 | Mobile Map | At 375 px the workspace retains a 560 px canvas and requires horizontal page scrolling. | Core objects and relations are difficult to read or operate. | Provide a semantic object-list fallback and a horizontal compact control strip. | Resolved · 375 px verified |
| K-01 | P0 | Command | The palette promises arrow navigation and Enter but implements only open, click, and Escape. It also promises an unsupported `ask OCP`. | Keyboard guidance is false and discovery is slower. | Implement active-result keyboard behavior and real commands; correct the copy. | Resolved · runtime verified |
| T-04 | P1 | Layers | Layer toggles change decorative planes, not visible object membership or primary state. Perspective changes only a label. | Controls imply a semantic query that did not occur. | Derive visible objects and displayed state from active layer/perspective snapshots. | Resolved · runtime verified |
| A-01 | P1 | Dialogs | Focus trap and focus restoration are incomplete; many compact controls are below 44 px on mobile. | Keyboard and touch use are unreliable. | Add modal focus management and mobile target sizing. | Resolved · runtime verified |
| S-01 | P1 | First viewport | Human gate and active actor state are secondary to decorative collaborator avatars and badges. | Intervention is not discoverable within a quick scan. | Use recorded actor/gate status in the toolbar. | Resolved |
| T-05 | P1 | Data refresh | The primary graph remains an in-memory projection after writes. | A persisted observation is not automatically reflected in the canonical projection. | State this boundary; refresh server-backed read models in a later data-integration slice. | Deferred |
| M-01 | P2 | Motion | Durations are scattered; reduced-motion exists but transitions are not tokenized. | Motion is harder to audit and tune. | Add motion tokens and remove continuous fixture pulses. | Resolved · reduced motion verified |
| C-01 | P2 | Maintainability | `page.tsx` and `globals.css` contain broad, layered responsibilities. | Cross-surface changes are costly. | Extract only after a component has a stable boundary; avoid a cosmetic rewrite. | Deferred |
| Q-01 | P2 | QA | The previous suite covered SSR copy and canonical persistence but not interactions or responsive runtime. | Keyboard and mobile regressions could pass. | Add pure behavior invariants and browser evidence for changed surfaces. | Improved · first automated desktop/mobile traversal implemented and passed locally |
| A-02 | P0 | Participation and raw access | The seed contains only the owner as a member; observation ingestion previously accepted an unauthenticated `local-preview` writer, while raw artifacts were readable by any signed-in visitor. | Opening access beyond the owner could create untrusted observations or expose immutable raw data without workspace membership. | Require trusted membership for reading/writing raw and observations; allow an explicit signed-in self-join to the writer role only; retain reviewer/admin-only human gates. | Implemented · source-checked; deployment verification pending |
| A-03 | P0 | Public deployment | The original public URL returns the earlier UI and `/api/workspace-members/me` returns 404. | The original link cannot use the new authenticated writer flow. | Preserve the original URL and publish a parallel current version, then test anonymous → sign-in → writer join and reviewer denial there. | Partially resolved · parallel current version deployed; signed-in join pending |
| L-01 | P1 | App shell | Korean and English UI copy is mixed without a user-controlled locale. | Korean-first users must parse English operational labels across primary controls. | Add Korean, English, and dual interface options as a local display preference; preserve original content independently. | Improved locally · primary surfaces covered; dense detail panels remain mixed |
| D-01 | P1 | Product governance | The v0.3 contract and implementation ledger existed only as repository files and had no discoverable location in the interface. | Approved direction could be mistaken for missing work or implemented behavior. | Add a repository-reference surface with explicit paths and a non-canonical boundary notice. | Resolved in current source/local runtime · canonical ingestion remains unimplemented |
| H-01 | P1 | Product entry | The application defaults to Map even though the supplied v0.5 direction makes work conversation and capture the primary daily entry. | Users begin in a specialist projection instead of a familiar work-entry flow. | Default to a truthful Home that routes a local draft into existing input review and marks assistant/context/import capabilities as unconnected. | Resolved · desktop and 375 px runtime verified on parallel deployment |
| Q-02 | P0 | Deployment/runtime | A successful provider deployment could be treated as proof that an independent actor can fetch, render, and use the same implementation. | Inaccessible or stale deployments can be reported as working, and validation falls back to manual screenshots. | Adopt `OCP-RC-002`, insert Deployment Truth, require independent browser evidence, and preserve target-specific failures. | Improved · machine contract and one-command local evidence pipeline implemented; frozen Sites drift retained; external preview pending |
| Q-03 | P1 | Verification entry | Commands, routes, viewports, acceptance checks, and artifact requirements were distributed across scripts and prose. | A new actor could not know the complete verification contract without reconstructing it manually. | Add the Harness Baseline v1 manifest, contract, state ladder, capability registry, and hashed evidence bundle. | Resolved locally and in PR · `RUN-20260823-001` and Actions run `32598246321` passed |

## Baseline visual critic

| Criterion | Score / 5 |
| --- | ---: |
| Hierarchy | 3.5 |
| Density | 3.5 |
| Consistency | 4.0 |
| Motion | 2.0 |
| Clarity | 3.0 |
| Discoverability | 2.5 |
| Responsiveness | 1.5 |
| Accessibility | 2.0 |
| Brand character | 4.0 |
| Trend relevance | 3.5 |

The selected slice is truthful async state → recorded operational status → mobile semantic fallback → real keyboard commands → semantic layer behavior → restrained motion/accessibility. The existing Map, Inspector, provenance, and gate visual language remains in place.

## Post-pass visual critic

| Criterion | Score / 5 |
| --- | ---: |
| Hierarchy | 4.1 |
| Density | 3.9 |
| Consistency | 4.2 |
| Motion | 4.0 |
| Clarity | 4.2 |
| Discoverability | 4.2 |
| Responsiveness | 4.3 |
| Accessibility | 4.1 |
| Brand character | 4.2 |
| Trend relevance | 4.0 |

These scores describe the verified implementation, not final brand approval. Remaining work includes server-backed graph refresh, broader interaction coverage, a GitHub-canonical external preview, production acceptance evidence, and a later stable component extraction.
