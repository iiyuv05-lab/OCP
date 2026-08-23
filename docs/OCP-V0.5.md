# OCP v0.5 work-entry, perception-layer, and reproducibility contract

Status: supplied working product direction · not normative · Canonical Graph v0.1 remains normative

## Product centre

OCP is an operating environment that lets a person begin in any tool, continue with the required context, switch among humans, agents, and tools, and finish through governed state changes.

> Start anywhere. Continue with context. Finish in OCP.

The primary daily entry surface is a work conversation and capture home. Map, Feed, Dashboard, Schedule, Data, REP, and other surfaces remain presentations or adapters over shared state; they are not independent sources of truth. A conversation is an input interface, not a canonical entity kind and not permission to mutate a model.

The target flow is:

```text
Work conversation or capture
  → OCP Inbox
  → context recognition
  → classification
  → candidate assertion or state proposal
  → validation and required approval
  → event-backed state change
  → next action
```

The current interface may route a local draft into the existing governed input review. It must not present an assistant, context loader, import pipeline, or automated next action as connected until runtime evidence exists.

## Start-anywhere and assistant choice

Chat, browser, file, recorder, IDE, SaaS, mobile capture, and external agents may all be entry adapters. OCP preserves context and state continuity without requiring a single model or vendor.

GPT, Claude, Gemini, Codex, local models, company agents, and custom agents are candidate adapters. A model name in a selector is not evidence of installation, authentication, availability, permission, or successful execution. Those facts belong to the future Capability and Access registries.

## Perception and work-data grammar

The supplied L1–L8 perception model is adopted as a working data grammar, distinct from the v0.3 Context Loading levels L0–L5.

| Perception layer | Work-data counterpart | Boundary |
| --- | --- | --- |
| L1 sensory flux | W1 raw work event | Immutable source or event intake |
| L2 feature | W2 event metric | Derived feature or measurement with provenance |
| L3 percept | W3 work item | Identified item; state is not embedded in identity |
| L4 concept | W4 concept | Shared semantic concept |
| L5 identifier/label | W5 sign | Label, identifier, alias, or symbol |
| L6 proposition | W6 state proposition | Time-bound assertion about an object |
| L7 frame | W7 frame | View, selection, and interpretation rules |
| L8 world model/snapshot | W8 model/snapshot | Reproducible state cut with version and hash anchors |

Object identity and state remain separate. Owner, status, due date, blocked-by, health, and similar values are state propositions or relations, not fixed fields that redefine a W3 object. Observed, inferred, planned, forecast, hypothetical, and unknown states remain visibly distinct.

Map, Feed, and Dashboard should read the same eligible W6 propositions and W8 snapshots. Eligibility includes source, provenance, validity, recorded cutoff, permissions, freshness, and publication rules. Scenario output never flows back as observed fact without a separate observation and its normal gate.

`TopicSpec`, `PreviewSession`, `DeploymentTarget`, and named work items in this contract are product or interaction language until their schema proposals pass normal ontology governance.

## Topic and supporting views

A topic is a scoped presentation specification, not a second database. The intended `TopicSpec` may select sources, collections, concepts, entities, predicates, metrics, layers, filters, time, granularity, refresh rules, agents, and Map/Feed/Dashboard presentation rules.

- Map presents semantic and spatial relations.
- Feed presents recorded changes, evidence, and review gates as connected editorial cards.
- Dashboard combines verified operational summaries, trends, and REP state indicators.
- A product preview dock may compare Current/Goal, Before/After, Mobile/Desktop, or Production/Development only when real preview targets and snapshots exist.

No dashboard number may be shown as measured merely because a design specifies it. No preview may be labelled live without a real session or heartbeat source.

## Import and progressive parsing

Raw account exports, files, recordings, and other imports enter an immutable Raw Vault before normalization. Import preview and explicit application are separate. A user action equivalent to `Apply to OCP` is required before a proposed classification or state change becomes operational state; Current and Reference changes retain their normal gates.

Progressive parsing limits cost and exposure:

```text
Level 0  raw preservation
Level 1  metadata
Level 2  entity/topic candidates
Level 3  decision/work/state candidates
Level 4  evidence/claim/concept candidates
Level 5  REP analysis
```

`Unsorted` is an explicit routing state, not silent data loss and not a claim that classification succeeded. Plus Minus G. and 지영쌤 are the first intended real-world validation scopes, but neither is considered imported merely because it is named in this contract.

## Canonical implementation and operational planes

The Git repository is the Canonical Implementation Plane for code, schema, specifications, tests, and workflow definitions. It is not the whole OCP state.

| Plane | Canonical source |
| --- | --- |
| Code, schema, specification, workflow definition | Git repository |
| Project, actor, task-like workflow, and operational state | Operational database plus event log |
| Raw recordings, media, documents, and exports | Data Hub or object storage |
| Deployment targets, providers, and environments | Deployment Registry |
| Account, authority, and credential requirements | Access Registry |
| Secret values | Secret Manager, never the repository |
| Reproducible historical state | Snapshot plus Git commit plus database revision |

```text
Reproducible OCP state
= Git commit
+ schema version
+ operational-state snapshot
+ artifact manifest
+ deployment manifest
+ access and credential requirements
+ external dependency versions
```

An inaccessible dependency is not erased. It is recorded as `known + accessible`, `known + inaccessible`, `unknown access`, or `missing`, with the resulting reproduction risk.

## Reproducibility contract

Any approved human or AI actor should be able to identify the current system, load purpose-scoped context, configure the development environment, propose and test a change, obtain review, deploy through the authorized path, and recover through a later revision.

The deployed result must also satisfy `OCP-RC-002`: an approved independent actor can open, operate, and verify it without the builder's account, workspace, conversation session, or a human-mediated screenshot. A provider deployment is not runtime verification.

Required state must not exist only in one person's memory, one AI conversation, one ChatGPT Workspace, one local machine, or one browser session. Secret values remain external, while their requirements and supply locations are declared.

ChatGPT Sites, Claude Artifacts, Figma, local experiments, and similar tools may be prototype, preview, or lightweight delivery surfaces. They must not silently become the canonical implementation source. Site audience, source-edit authority, OCP workspace membership, model authority, and deployment ownership remain separate controls.

The parallel ChatGPT Sites v0.5 deployment is retained as a frozen prototype snapshot after `CASE-RUNTIME-001`. Maintained OCP products require a Git-canonical branch/preview/production path with independent browser evidence before promotion.

The integrity chain therefore contains six independent truths:

```text
Conversation → Specification → Implementation → Deployment → Runtime → Outcome
```

## Git and operational workflow

GitHub or another source host is an adapter for the implementation plane. Branch, commit, pull request, review, check, merge, release, and deployment events should map to one governed OCP workflow run without collapsing their meanings.

```text
Agent run
  → isolated branch or working state
  → commit and change proposal
  → test evidence
  → review and merge
  → deployment event
  → OCP operational-state update
```

A branch author is not automatically an OCP authority holder. CODEOWNERS, required reviewers, and status checks may implement parts of OCP responsibility and validation, but they do not replace OCP's ontology, identity, authority, or human gates.

## Delivery order

1. Work-entry Home that truthfully routes drafts into governed capture.
2. Immutable import intake, preview, and progressive parsing.
3. Purpose-scoped context recognition and project routing.
4. Verified assistant and tool adapters through Capability and Access registries.
5. W1–W8 promotion contracts and shared W6/W8 read eligibility.
6. Topic-driven Feed, Dashboard, and Map projections.
7. Deployment, access, and reproducibility registries connected to Git and runtime events.
8. Preview comparison backed by real targets and snapshots.

Implementation evidence is tracked separately in `docs/OCP-IMPLEMENTATION-STATUS.md`.
