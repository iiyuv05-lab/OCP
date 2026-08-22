# OCP v0.4 agent-readable and agent-mutable contract

Status: supplied working product direction · not normative · Canonical Graph v0.1 remains normative

## Purpose

OCP should become its own first managed subject. A human or agent can enter, load only the context required for a purpose, perform work in an isolated working state, propose a patch, pass validation and approval, commit an event-backed revision, and create a later revert revision when necessary.

Reading context and changing canonical state are different operations. Reading may create operational access events, but it never changes a Current or Reference model by itself.

## Target lifecycle

```text
Agent entry
  → purpose-scoped context load
  → recorded read/work session
  → isolated working state
  → patch proposal
  → validation and gate
  → approval
  → commit event and revision
  → later revert event when required
```

Past events are never deleted to simulate rollback. Reverting revision 184 creates a new revision 185 that records the reversal.

## Entry contract

The intended machine-readable entry surface is:

```text
/.ocp/
  manifest.json
  state.json
  modules.json
  context-policy.json
  permissions.json
  revisions.jsonl
  specs/
  snapshots/
  events/
  pending-patches/
  tests/

OCP.md
AGENTS.md
CLAUDE.md
README.md
```

`OCP.md` is the shared source for human and agent entry guidance. Tool-specific instructions should be derived from it or checked for drift; they must not silently become competing product contracts.

The file names above are a protocol proposal, not evidence that these files, loaders, registries, or event streams exist today.

## Read and work events

The intended operational sequence includes `AGENT_ENTERED`, `CONTEXT_REQUESTED`, `CONTEXT_LOADED`, `MODULE_READ`, and `WORK_STARTED`. Access telemetry may record actor, time, context version, loaded module scope, work session, and current attention.

These are operational events. They do not authorize an ontology, identity, authority, deletion, retirement, Current-model, or Reference-model change.

## Patch contract

Agent and human changes begin from a recorded base revision and produce an isolated working state. A patch proposal records actor, subject, reason, context manifest, before and after state, evidence, impact, risk, validation results, required gate, and proposed operations.

The lifecycle remains:

```text
PROPOSE → VALIDATE → APPROVE → COMMIT
```

Approval and application remain separate states. Automatic approval rules may exist only for bounded low-risk commands. Existing human gates cannot be lowered by a client or adapter.

## Agent adapters

OCP distinguishes three integration shapes:

- subscription agent bridges for user-operated local tools;
- API agent adapters for stable services and automation;
- manual app bridges for importing user-provided results.

Consumer chat UI automation is not a standard OCP integration path. Adapter availability, authentication, permissions, cost, and last verification belong in a future Capability Registry.

## Personal context sidecar

User preferences, roles, projects, recent context, decision history, vocabulary, permissions, and personal models may be loaded through a separate personal context sidecar. It must remain scoped, permission-aware, purpose-bound, and separable from the shared canonical graph.

## Data Hub

Raw storage and the canonical index remain separate. Files may live in local, cloud, repository, or self-hosted providers, while structured OCP state records their identifiers, hashes, ownership, permissions, provenance, context, sensitivity, retention, and derivation.

A drag-and-drop ingestion flow may identify actor and context, preserve the raw artifact, extract metadata, propose graph matches and candidate changes, preview impact, and commit only after the required gate. Dropping a file never mutates a canonical model by itself.

## UX Edit Mode

The intended UX editing loop is:

```text
Select rendered component
  → inspect ComponentSpec, current render, tokens, behavior, motion, and baseline
  → natural-language or direct edit
  → component patch
  → preview and visual checks
  → approval
  → commit
```

Layout, typography, spacing, surface, motion, and interaction behaviors stay explicit. Animation specifications include trigger, duration, delay, easing, property, values or keyframes, looping, responsive behavior, and reduced-motion behavior.

Puck, Figma, Storybook, and Playwright are candidate adapters or tools, not required OCP core dependencies and not evidence of an installed capability.

## Capability Registry

The future registry describes what a capability can do, inputs, outputs, installation and authentication state, permissions, interface type, last verification, cost, alternatives, and current status. Newly discovered tools enter as candidates and are not labelled available until verified.

## Delivery order

1. OCP Entry Contract.
2. Event-sourced operational state.
3. Patch → approval → commit → revert lifecycle.
4. Data Hub and storage-provider abstraction.
5. Purpose-scoped Context Loader.
6. UX Edit Mode and component/spec/render evidence loop.
7. Capability Registry.

Implementation evidence is tracked separately in `docs/OCP-IMPLEMENTATION-STATUS.md`.
