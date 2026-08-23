# OCP Context Integrity & Runtime Verification Harness

Canonical specification ID: `OCP-MOD-INTEGRITY-001`

Status: approved OCP Core module specification · first repository/runtime-test slice implemented · conversation capture and governed registries not implemented · Canonical Graph v0.1 remains normative

## Purpose

The Integrity Harness preserves and verifies the chain from what was said to what produced a real outcome. REP supplies epistemic rules and verification language; OCP executes the module across projects, agents, specifications, code, runtime, and observed outcomes.

```text
Conversation Truth
  ↕
Specification Truth
  ↕
Implementation Truth
  ↕
Deployment Truth
  ↕
Runtime Truth
  ↕
Outcome Truth
```

These truths remain separate. A captured request is not a specification, a specification is not implementation evidence, source presence is not deployment evidence, deployment is not runtime verification, and a working interface is not proof of the intended outcome.

## Boundary

The module may:

- preserve immutable conversation and session artifacts;
- extract candidate requirements, decisions, corrections, constraints, rationales, rejected options, open questions, and terminology;
- map conversation atoms to specifications, implementation locations, tests, runtime evidence, and outcomes;
- report missing, contradictory, unsupported, or stale links;
- create acceptance-test candidates from approved requirements;
- ingest actual static, test, browser, console, network, performance, and outcome evidence;
- propose an event-backed OCP state update through the normal validation and gate path.

The module may not:

- treat a model summary as the immutable conversation source;
- mark extraction agreement as human approval;
- infer runtime success from source-code presence;
- convert a test estimate into a measured result;
- mutate Current or Reference models merely because a requirement, test, or run was captured;
- lower identity, ontology, authority, deletion, retirement, or Reference-model gates;
- present a provider adapter, hook, CLI, browser bridge, or model as installed until verified.

## Six-truth records

Each truth record keeps its own source, scope, valid time, recorded time, revision, and verification state.

| Truth | Minimum evidence |
| --- | --- |
| Conversation | Immutable transcript or imported conversation artifact plus turn references |
| Specification | Versioned specification ID, revision, status, acceptance criteria, and approval state |
| Implementation | Exact repository, commit, branch, and file or symbol references |
| Deployment | Provider, deployment and target IDs, immutable source/version reference, URL, access policy, bindings declaration, and provider result |
| Runtime | Executed test/run identity, environment, observed result, timestamps, and artifacts |
| Outcome | Consented real-use observation, metric source, or human assessment with provenance |

Mappings are directional records rather than collapsed truth:

```text
conversation ↔ specification
specification ↔ implementation
implementation ↔ deployment
deployment ↔ runtime
implementation ↔ runtime
runtime ↔ outcome
```

The direct `implementation ↔ runtime` mapping remains available for local execution. A deployed target must use the two deployment mappings and comply with `OCP-RC-002`.

## Ledger contract

The target repository-side entry is:

```text
.ocp/integrity/
  raw/conversations/
  ledger/
    requirements.jsonl
    decisions.jsonl
    corrections.jsonl
    constraints.jsonl
    rationales.jsonl
    rejected-options.jsonl
    open-questions.jsonl
    terminology.jsonl
  mappings/
    conversation-spec.jsonl
    spec-code.jsonl
    code-deployment.jsonl
    deployment-runtime.jsonl
    code-runtime.jsonl
    runtime-outcome.jsonl
  snapshots/
  audits/
    compression-loss/
    omission/
    unsupported-addition/
    contradiction/
    runtime/
```

This path is a protocol target, not evidence that the directories or event stores exist today. Raw artifacts remain immutable and may live in object storage; repository records may contain manifests and content hashes instead of private payloads.

An atomic ledger record includes:

- stable ID and atom type;
- exact statement and lifecycle state;
- valid and recorded times;
- immutable source references;
- rationale and supersession links;
- specification, implementation, test, runtime, and outcome references where known;
- extractor identity, model/version, prompt/spec version, source scope, and output hash for machine extraction;
- verification state and required gate.

## Context compression integrity

Compression is an operational event with before and after evidence:

```text
proactive capture
  → pre-compression transcript and ledger snapshot
  → coverage audit
  → compression
  → post-compression summary capture
  → summary-to-ledger comparison
  → loss report
```

Proactive capture should run before a context limit. A failed final capture may block compression only when the adapter verifies that blocking is safe. When emergency recovery cannot be blocked, the adapter preserves the best available transcript snapshot and records an explicit integrity risk. No provider-specific hook behavior is assumed across adapters.

## Loss and divergence

Loss, contradiction, and unsupported addition are governed findings with source and target references, severity, status, owner, and resolution evidence. Example classes include:

- requirement omission;
- decision or rationale loss;
- constraint loss;
- rejected option resurfacing;
- conversation/specification contradiction;
- specification/implementation drift;
- implementation/runtime failure;
- runtime/outcome mismatch.

Coverage percentages are prohibited until their numerator, denominator, inclusion rules, weighting, freshness, and missing-data policy are defined and the underlying records exist. Until then, the interface reports counts or `not measured`.

## Extractor ensemble

Multiple extractors may independently inspect the same immutable source and produce candidate ledgers. Their output is compared as `match`, `disagree`, `extractor-only`, or `unresolved`. Resolver output remains a candidate until the required validation and approval are recorded.

Both extractors must receive the declared source scope independently. Comparing one model against another model's summary does not verify source coverage.

## Conversation adapters

All adapters implement a shared Capture Contract while preserving provider differences:

- live transcript adapter when a tool exposes verified session and transcript events;
- session/repository/artifact adapter for coding agents;
- export or connected-capture adapter for consumer chat products;
- generic immutable conversation importer for other providers.

Adapter status records availability, authentication, permissions, capture scope, last verification, known gaps, and failure behavior. A candidate provider name is not an installed capability.

## Specification-to-acceptance chain

An accepted conversational requirement may produce a specification and acceptance-test candidate:

```text
Conversation source
  → requirement atom
  → approved specification criterion
  → implementation mapping
  → acceptance test
  → executed runtime evidence
  → outcome observation
```

Generated tests remain candidates until reviewed or accepted according to module policy. Test execution must name the actual environment and distinguish static, build, unit, integration, browser, accessibility, performance, and real-use evidence.

## Verification adapters

The target verification stack may include reproducible test runners, browser automation, interactive agent exploration, and browser diagnostics. Playwright Test, Playwright CLI, Playwright MCP, browser extensions, CDP, and DevTools integrations are candidate adapters, not mandatory dependencies or installed capabilities.

Canonical runtime evidence comes from an executed, identifiable run. Interactive exploration can create evidence and test candidates but does not replace reproducible acceptance tests when those are required.

## Work-state lifecycle

The module exposes distinct completion states:

```text
REQUESTED
  → CAPTURED
  → SPECIFIED
  → IMPLEMENTED
  → STATIC_VERIFIED
  → BUILD_VERIFIED
  → DEPLOYABLE
  → DEPLOYED
  → ACCESSIBLE
  → INTERACTABLE
  → RUNTIME_VERIFIED
  → ACCEPTANCE_VERIFIED
  → OUTCOME_OBSERVED
```

Transitions require their own evidence and may move to blocked, failed, contradicted, superseded, or human-required states. `DONE` is not a substitute for the chain.

## First application

OCP itself is the first subject:

```text
OCP development conversation
  → Integrity Harness capture
  → OCP specification
  → implementation commit
  → executed verification
  → runtime evidence
  → governed OCP state proposal
```

The first complete executable slice remains:

1. one verified conversation/session capture adapter;
2. immutable transcript manifest;
3. atomic requirement, decision, constraint, rationale, and open-question extraction candidates;
4. conversation-to-specification audit;
5. one generated acceptance-test candidate;
6. one executed runtime result with stored evidence;
7. a proposed, gated OCP state update.

The repository/runtime-test subset now exists: `OCP-RC-002`, `.ocp/runtime/targets.json`, the Playwright harness, CI entry points, and repository-index projection. It does not complete the conversation adapter, atomic ledger, Deployment Registry, external preview, or governed state proposal.

## Acceptance criteria for the first slice

- A replacement agent can reconstruct current requirements, decisions, rationales, constraints, rejected options, open questions, implementation references, and verification state without reading the entire transcript.
- Every reconstructed atom can trace back to immutable source references.
- Missing source, incomplete capture, extractor disagreement, unavailable runtime, and failed verification remain visible.
- No summary, specification, implementation, runtime, or outcome state is collapsed into another.
- A failed capture or test cannot produce a success state.
- Approval and state application remain separate.

Implementation evidence is tracked in `docs/OCP-IMPLEMENTATION-STATUS.md`.
