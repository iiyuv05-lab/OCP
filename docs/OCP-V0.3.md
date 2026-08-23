# OCP v0.3 product contract

Status: approved product direction · Canonical Graph v0.1 remains normative

## Organisation identity

The top-level organisation is `Plus Minus G.`. Its preserved aliases are `±G.`, `플러스 마이너스 지`, `PMG`, and `플마지`.

OCP, REP, REP Recorder, 오늘 제주, Trend Analyzer, 지영쌤, and later products are managed inside Plus Minus G. A managed capability may be both an OCP module and an independently delivered product. That product relationship does not create a new canonical entity kind by itself.

## Locked boundaries

```text
Reality
  ↓ observed only through consented World Windows
Raw Artifact → Representation → Translation → Interpretation
  ↓
Observation → Evidence → candidate graph change
  ↓
Canonical State Graph
  ↓
ViewSpec → Layer → Filter → Granularity → Skin
  ↓
Human · Agent · Tool workflow
  ↓
Permission → Validation → Gate → Event → State update
```

The following separations are mandatory:

- `DATA ≠ VIEW ≠ SKIN`.
- `SOURCE ≠ LAYER`.
- `STATE ≠ DELTA`.
- `RAW ≠ TRANSLATION ≠ INFERENCE`.
- `READ ≠ MUTATE`.
- `FULL CONTEXT ≠ REQUIRED CONTEXT`.
- every canonical state change records an event or revision;
- every module has exactly one canonical specification before it is treated as implemented.

## Data and View Engine

The data path is `Source → Collection → Entity → Relation/Property/State → Event`. The presentation path is `ViewSpec → Layer → Filter → Granularity → Skin`. Render coordinates and edge geometry remain projector output.

The reference projections remain Product/Project, Organization, Environment, Workflow, Timeline, Schedule, Team, and Custom. Map, Feed, Dashboard, Calendar, To-do, Report, Chat, desktop, mobile, agent, API, and MCP are presentations or adapters of the same canonical state.

## Language system

Language is split into interface locale, original content language, display translation, and output language. Canonical labels preserve `canonical_label`, Korean and English labels when known, aliases, and original language. Translation never replaces the original.

## Skin system

A Skin is an installable interface package, not a colour theme. It may contain design tokens, typography, icons, components, layout and view rules, motion, interactions, breakpoints, density, and accessibility rules. Import, export, duplicate, modify, share, and install are governed package operations.

DTCG-compatible tokens, platform transforms, and isolated component stories are preferred. Their adoption remains an implementation decision and does not weaken the existing dependency ladder.

## Operational modules

The approved module set includes:

- Topic State Indicator with AUTO and CUSTOM composition;
- scoped Refresh plus an Automation Center for manual, scheduled, event, change, and source-watch runs;
- Agent Activity from actor through runs, actions, state changes, artifacts, decisions, and outcomes;
- Delta records describing from/to state, change type, trigger, pressure, mechanism, result, evidence, confidence, and provenance;
- task state transitions recorded through commands rather than direct database writes;
- OCP Read API and OCP Command API;
- Context Loading Protocol and Context Manifest;
- Capability Registry and Platform Adapter Registry;
- product test toolkit with test results returning as evidence, issues, and tasks;
- Module ↔ Specification 1:1 registry with specification and implementation drift signals.

These names are product and interaction language until their schema proposals pass normal ontology governance.

## Context loading contract

Context loading uses bootstrap snapshot, delta sync, purpose-scoped load, on-demand expansion, and periodic rebase. Levels are L0 Core, L1 Enterprise, L2 Domain, L3 Workflow, L4 Task, and L5 Evidence.

Every agent run's Context Manifest records purpose, actor, snapshot version, delta cursor, included and excluded scope, entity IDs, relation depth, freshness, permissions, data budget, known missing information, and known unobserved information.

## Access contract

Site audience and OCP authority are separate controls. A public link may expose the interface, but a canonical write requires an authenticated actor and recorded workspace membership. Explicit self-enrolment may grant only `writer`; reviewer and admin authority never comes from possessing a link.

Writers may submit observations and artifacts. Submission does not update Current or Reference automatically. Human-gated identity, ontology, authority, retirement, deletion, and Reference Model changes remain reviewer/admin decisions, and approval remains separate from application.

## Module specification contract

Every implemented module must identify one `canonical_spec_id`. Its specification records purpose, boundary, inputs, outputs, schema, views, commands, events, permissions, dependencies, tests, known limitations, and revision.

Code ahead of its specification is `SPEC DRIFT`. A specification ahead of executable behaviour is `IMPLEMENTATION DRIFT`. Neither state may be labelled complete.

## Delivery order

Before adding more independent surfaces, prioritise:

1. Source/Collection/Entity versus View/Layer separation.
2. Skin package boundary.
3. Delta schema and projections.
4. Automation Center.
5. Context Loader and Manifest.
6. Command API.
7. Module-Spec 1:1 registry.

The implementation status of this contract is tracked separately in `docs/OCP-IMPLEMENTATION-STATUS.md`.
