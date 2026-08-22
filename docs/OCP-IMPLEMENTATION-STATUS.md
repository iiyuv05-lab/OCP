# OCP implementation status

Status: evidence-based inventory · 2026-08-23 KST

This ledger prevents an approved idea, a fixture, and working canonical behaviour from being presented as the same thing.

| Area | Status | Current evidence | Next boundary |
| --- | --- | --- | --- |
| Reality/Observation/Evidence/Model separation | Implemented foundation | Canonical schema, artifact lineage, observation and evidence tables, UI state contract | Server-backed evidence projections |
| Valid time and recorded time | Implemented foundation | Bitemporal states, relations, model membership, UI controls | Broader D1-backed read models |
| Canonical Graph → ViewSpec → projector | Implemented foundation | Eight ViewSpecs and ephemeral layout projector | Real timeline/calendar presentations |
| Model modes and REP lens | Implemented in fixture UI | Single, Overlay, Split, Diff; ALL, Chronology, Generation, Relevance | Replace remaining fixture facts with read models |
| Raw Vault | Partial | R2 upload, immutable flag, hash, lineage schema, member-only download | Browser, import queue, permission/sensitivity policy |
| Observation capture and patch gates | Partial | Member-only input, candidate proposal, reviewer/admin decision, approved ≠ applied | Command application service and graph refresh |
| Link participation | Deployed on the parallel Site; signed-in join not runtime-verified | Public parallel URL shows the anonymous sign-in path; source includes explicit writer self-join and reviewer/admin gate | Verify signed-in visitor → writer join and reviewer denial against the parallel D1 runtime |
| Plus Minus G. identity | Implemented locally | Stable enterprise ID renamed; aliases recorded; D1 migration and revision added | Apply migration in the target Site runtime |
| UI improvement pipeline | Implemented as repository policy | UI principles, state, motion, audit, QA, reusable skill | Automated browser regression and stable component extraction |
| v0.2 migration/capture/person/sensor/AI-run direction | Specification only | `docs/OCP-V0.2.md` | Consent, sensitivity, registry, and schema proposals |
| Source/Collection versus View/Layer | Partial | ViewSpec boundary exists; Source and Collection registries do not | Schema proposal without geometry persistence |
| Language system | Partial | Interface Locale offers Korean, English, and dual labels on the primary shell, timeline, map controls, feed, Standards, input metadata, and command palette; original content is not rewritten | Remaining dense detail-panel labels, display-translation provenance, and governed output-language settings |
| Contract/status discoverability | Deployed and runtime-verified on the parallel Site | The Standards view exposes v0.2–v0.5 contracts, the Integrity Harness module specification, this ledger, canonical foundation, UI rules, and QA paths | Governed Specification Registry and canonical requirement ingestion |
| Work-entry Home | Deployed and runtime-verified as a truthful routing surface on the parallel Site | Home is the default view; a local draft enables the existing input-review action, and assistant/context routing remains explicitly unconnected | Connected assistant adapter, inbox, context recognition, project matching, proposal preview, and next-action service |
| L1–L8/W1–W8 perception and work-data grammar | Specification only | `docs/OCP-V0.5.md` separates raw event, metric, work item, concept, sign, proposition, frame, and snapshot | Governed schema proposal, promotion events, provenance, and W6/W8 read eligibility |
| Topic-driven Map/Feed/Dashboard | Partial UI foundation | Map and Feed project the local canonical fixture; v0.5 records shared W6/W8 eligibility and TopicSpec direction | TopicSpec governance, server-backed propositions/snapshots, Dashboard, and connected cross-view navigation |
| Account export/import and progressive parsing | Not implemented | v0.5 working contract only; Raw Vault supports a narrow member upload but no archive importer or apply preview | Immutable archive intake, levels 0–5, deduplication, project candidates, Unsorted, approval, and import events |
| Assistant/model selection | Not implemented | Home states that no verified assistant adapter is connected | Capability/Access registry, authentication, permissions, invocation evidence, context handoff, and output provenance |
| Reproducibility contract and separated state planes | Local and GitHub PR acceptance verified | Machine contract/state/capability records, passing `RUN-20260823-001`, PR #1, successful Actions run `32598246321`, and artifact `9482159491` | Merge the reviewed PR, configure enforcement, then add dependency/access and recovery registries |
| Runtime Observability Independence | Harness Baseline v1 local and PR execution verified | Local three-viewport evidence plus GitHub Actions success and a retained 7.7MB artifact; external deployment remains separate | Connect an external D1/R2-compatible preview provider and verify its URL |
| Deployment Registry and Git event adapter | Not implemented | Repository commit history and a Sites project ID exist separately; no governed deployment object or event connector exists | Deployment/access schema, source-host adapter, workflow-run mapping, health, rollback target, and reproduction checks |
| Context Integrity & Runtime Verification Harness | Harness Baseline v1 local and PR execution verified | `OCP-MOD-INTEGRITY-001` separates six truth planes; local run and GitHub run `32598246321` verify the machine entry contract, feature ladder, runner, and evidence artifact | Verified conversation capture, immutable transcript manifest, atomic candidate ledger, external preview, and gated state proposal |
| Installable Skin package | Specification only | v0.3 contract; existing CSS tokens are not a package system | Package manifest and governed import flow |
| Topic State Indicator | Not implemented | Product contract only | Reference schema, missing-field state, agent/rule bindings |
| Refresh and Automation Center | Not implemented | Product contract only | Automation run/event/cost/error schema and commands |
| Agent Activity | Not implemented | Actor and revision fragments only | Agent Run schema and activity projection |
| First-class Delta | Not implemented | Derived UI differences and revision changes exist, but no canonical Delta record | Governed Delta schema and provenance links |
| Task state machine | Not implemented | Task remains interaction language, not a governed entity kind | Ontology proposal and command transitions |
| OCP Read/Command APIs | Partial | Bootstrap/graph/read routes and narrow observation/decision commands | General command envelope, validation, gate, event, apply |
| Context Loading/Manifest | Not implemented | Context table is not a Context Manifest protocol | Snapshot, cursor, scoped loader, omissions record |
| Capability and Adapter registries | First GitHub capability slice implemented | `.ocp/capability-registry.json` separates connection, target, operation availability, execution, and Canonical Source state | Promote write, PR, Actions, branch protection, provider, and adapter states only from actual execution evidence |
| Agent Entry Contract | Not implemented | v0.4 working contract only; the current `AGENTS.md` is repository guidance, not a generated `/.ocp` protocol | Governed manifest, shared OCP source, derived agent instructions, and drift checks |
| Agent read/work event stream and working state | Not implemented | Actor and revision fragments exist, but reads and isolated working sessions are not recorded | Event schema, purpose-scoped sessions, branch/base revision, and permissions |
| Commit/revert lifecycle | Partial foundation | Patch proposals, decisions, revisions, and events exist; no general commit command or event-backed revert flow | Command application service and revert-as-new-revision behavior |
| Data Hub and storage-provider abstraction | Not implemented | R2 Raw Vault is one partial storage path; there is no provider registry or unified intake pipeline | Provider contract, immutable intake, metadata, sensitivity, and candidate matching |
| Personal Context Sidecar | Not implemented | No separately permissioned user-context loader exists | Purpose-bound preference, role, vocabulary, history, and personal-model context |
| UX Edit Mode | Not implemented | UI specs and QA documents exist; rendered components are not directly editable or linked 1:1 to baselines | ComponentSpec, preview, visual evidence, governed patch and adapter evaluation |
| Subscription/API/manual agent bridges | Not implemented | No verified Codex, Claude Code, API, or manual-result adapter registry exists | Capability verification, auth boundary, command permissions, and run evidence |
| Product test toolkit | Harness baseline implemented | `npm run verify` covers lint, build, source tests, health, direct routes, click/type/scroll, desktop/tablet/mobile, console/network/DOM/screenshots, and artifact hashes | Component/story coverage, external preview execution, outcome feedback, and governed state-update proposals |
| Module ↔ Specification 1:1 | Not implemented | v0.3 contract only | Registry, canonical spec IDs, drift checks |
| Requirement ingestion itself | Not implemented | Requirements are preserved in versioned product contracts and this ledger, not canonical graph objects | Governed specification registry before automatic ingestion |

## Truthful answer

The previously entered content is not yet fully “inside OCP” as executable canonical data. The stable v0.1 foundation is implemented, the wider v0.2/v0.3 direction and supplied v0.4/v0.5 working directions are preserved in repository contracts, and Harness Baseline v1 now makes verification entry, feature state, and GitHub capability state machine-readable. Those repository records are still not Canonical Graph objects.

No specification-only item should appear in the interface as connected, live, measured, installed, or automated until its runtime evidence exists.
