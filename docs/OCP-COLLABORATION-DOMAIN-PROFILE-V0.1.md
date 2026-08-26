# OCP Collaboration Domain Profile v0.1

> Turn heterogeneous work traces into a reviewable flow without turning proposals into facts.

**Status:** schema proposal · non-normative  
**Recorded:** 2026-08-27 KST  
**Depends on:** `OCP-FEDERATED-WORK-CAPABILITY-PLATFORM.md`, `OCP-V0.5.md`, Canonical Graph v0.1  
**Scope:** collaboration-centred intake, flow reconstruction, diagnosis, and Obsidian-compatible projection  
**Korean-first extension:** `OCP-INTAKE-DISPLAY-ISOLATION-PROFILE-V0.2.md`

## 1. Purpose

This profile defines the first narrow OCP workflow:

```text
file / document / app description / web app / conversation
  → immutable or externally anchored source
  → metadata and privacy classification
  → candidate objects, propositions, relations, and flow steps
  → focused questions for missing decisions or access
  → human review
  → separately applied operational change
  → Canvas and Graph projections
  → workflow diagnosis and next-action proposal
```

The first goal is not autonomous execution. It is to make an existing human workflow reproducible enough that another approved human or AI can inspect its inputs, steps, dependencies, outputs, uncertainties, and authority gates.

## 2. Architectural boundary

This profile does **not** add `Person`, `Project`, `Pain`, `Goal`, or `Task` as new canonical entity kinds. They remain domain and interaction labels over the existing Canonical Graph boundary until ontology governance approves otherwise.

| Collaboration language | Canonical interpretation |
| --- | --- |
| Person, organization, project, product, tool | W3 identified Object with a domain label |
| Pain / problem | W6 time-bound proposition about a bearer or workflow |
| Need | W6 normative proposition describing a required condition |
| Goal / benefit | W6 planned target proposition with an acceptance condition |
| Doing / praxis | Flow step, execution event, or proposed activity |
| Capability | Existing OCP Capability |
| Provider | Existing OCP Provider: human, AI, SaaS, or custom app |
| Account | Access Registry reference; never a secret value |
| Source | Immutable artifact or stable external source reference |
| Evidence | Evidence that supports or contradicts a proposition |
| Canvas / Graph / Board / Table | Surface projections, never canonical geometry |

`Pain → Need → Goal` and `Praxis → Qualia → Idea` are accepted as user-supplied framing lenses. They are not universal psychological facts and do not change canonical ontology by themselves.

## 3. Required distinctions

The importer and every Surface must preserve these distinctions:

1. raw source ≠ extracted representation ≠ translated representation ≠ inference;
2. identity ≠ state proposition;
3. observed ≠ reported ≠ quoted ≠ inferred ≠ planned ≠ forecast ≠ hypothetical ≠ unknown;
4. proposal ≠ approval ≠ application;
5. work completion ≠ knowledge verification;
6. source existence ≠ connector availability ≠ successful execution;
7. Canvas coordinates and edge geometry ≠ canonical persistence;
8. private operational data ≠ publishable projection.

## 4. Collaboration packet

One intake becomes an `OCP Collaboration Packet`. The packet is a transfer envelope, not canonical state.

Minimum sections:

| Section | Required content |
| --- | --- |
| `packet` | version, packet ID, recorded time, producer, processing status |
| `source` | stable source reference, media type, source-of-truth location, content hash when available |
| `privacy` | isolation segment, consent/access state, publication eligibility, redactions |
| `candidates` | candidate objects, propositions, relations, flow steps, capabilities, access requirements |
| `questions` | missing decisions, identity conflicts, login/access blockers, missing sources |
| `review` | reviewer, decision, rationale, approved candidate IDs |
| `application` | separate command/run reference and resulting revision |
| `projection` | derived Canvas/Graph/Table output references |
| `diagnosis` | observed bottleneck candidates and evidence; never silent recommendations |

Every candidate requires at least one `sourceRef`. Missing source becomes `KNOWN_MISSING`; it is not repaired with model memory.

## 5. Collaboration state profile

The profile projects the Vault's current four axes without replacing canonical bitemporal state.

| Axis | Values |
| --- | --- |
| Operational | `idle`, `queued`, `working`, `blocked`, `human_required`, `completed`, `failed` |
| Epistemic mode | `observed`, `reported`, `quoted`, `inferred`, `planned`, `forecast`, `hypothetical`, `unknown` |
| Model layer | `observation`, `reference`, `current`, `goal` |
| Health | `healthy`, `attention`, `risk`, `neutral` |

Confidence labels (`unverified`, `weak`, `probable`, `confirmed`) apply to individual propositions. They are not progress values. A percentage is permitted only when numerator, denominator, and measurement source exist.

Review state and application state remain separate:

```text
candidate → under_review → approved | rejected
approved → not_applied → applied | apply_failed
```

## 6. Relations

Use existing relations where possible:

`belongs_to`, `depends_on`, `created_by`, `executed_by`, `reviewed_by`, `supports`, `contradicts`, `derived_from`, `produces`, `blocks`.

This profile proposes the following relation labels only as domain aliases pending governance:

| Alias | Meaning | Safe canonical mapping |
| --- | --- | --- |
| `has_pain` | bearer has a sourced pain proposition | proposition subject relation |
| `requires` | workflow or goal requires a condition/capability | `depends_on` |
| `targets` | flow targets a goal proposition | model membership or typed relation |
| `uses_provider` | capability is supplied by a provider | provider binding |
| `needs_access` | execution requires an account/authority | Access Registry dependency |
| `supersedes` | a later representation replaces an earlier active one | revision lineage; never deletion |

## 7. Progressive intake

### Level 0 — Preserve or anchor

- Preserve the exact file when authorized and technically available.
- Otherwise store a stable external reference and explicit accessibility state.
- Never store password, token, OTP, recovery code, or secret value in Git, Vault notes, Canvas, logs, or packets.

### Level 1 — Metadata

Record media type, source location, owner, valid time, recorded time, device/app, size/hash when available, isolation segment, consent, and access state.

### Level 2 — Candidate map

Extract candidate actors, work scopes, tools, projects, pains, needs, goals, sources, and relations. The output remains a candidate set.

### Level 3 — Candidate flow

Extract inputs, ordered steps, decisions, dependencies, providers, connectors, outputs, failure states, and human gates.

### Level 4 — Review questions

Ask only questions whose answers change identity, privacy, authority, step order, provider choice, acceptance criteria, or publishability. Bundle low-impact unknowns as `KNOWN_MISSING` instead of creating interview friction.

### Level 5 — Apply and project

Apply only approved candidate IDs through a separate command or recorded manual action. Generate Canvas, Graph, Table, Board, and Timeline as projections of the applied state.

### Level 6 — Diagnose and propose

Diagnose from traceable evidence. A diagnosis must identify the blocked node or relation, observed symptom, source, responsible position, and a falsification check. A proposal must state whether it is `Connect`, `Build`, or `Human`, with cost/risk assumptions visible.

## 8. Manual capture form

The same packet must be fillable without AI.

```markdown
# Flow capture

## Identity and boundary
- Who or what is this flow for?
- What can its owner change?
- What is outside its authority?

## Source
- Where did this information originate?
- What exact file, conversation, app, or event can be revisited?

## Pain / current state
- What current state causes cost, delay, risk, or distress?

## Need
- What condition or capability must exist to change that state?

## Goal
- What observable result will count as success?
- Where and when will it be measured?

## Flow
| Order | Input | Action or decision | Capability | Provider | Connector/tool | Output | Failure state | Human gate |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |

## Access requirements
- Service/account reference only; secret location is external.

## Unknowns and conflicts
- KNOWN_MISSING:
- KNOWN_INACCESSIBLE:
- AUTH_CONTEXT_REQUIRED:
- CONFLICT:

## Review
- Candidate IDs approved:
- Candidate IDs rejected:
- Rationale:
```

## 9. MVP acceptance set

The private operational dataset contains one owner baseline and six acceptance targets. Public implementation fixtures use pseudonymous case IDs and contain no private account identifiers or personal pain details.

| Case | Required evidence before “represented” |
| --- | --- |
| Owner baseline | input→step→output flow, providers/connectors, at least one observed bottleneck, source trace |
| Collaborator workflow A | real work sample, current flow, desired flow, owner confirmation |
| Collaborator workflow B | teaching/content source, step extraction, human-required boundary, owner confirmation |
| Adviser/governance workflow | decisions, authority scope, review/approval path |
| External benchmark A | accessible source and extracted flow with provenance |
| External benchmark B | accessible source and extracted flow with provenance |
| External benchmark C | accessible source and extracted flow with provenance |

The MVP passes only when every case can be expressed without inventing facts, losing source paths, or changing the canonical schema for each new workflow. `KNOWN_MISSING` is a valid representation but not a passed case.

## 10. Surface contract

- **Canvas:** proposed or applied execution order and branching.
- **Graph:** actual object, proposition, source, and dependency relations.
- **Table:** exact fields, filters, missing values, and review queues.
- **Board:** operational state only.
- **Timeline:** valid time and recorded time; never a single collapsed date.
- **Document:** source and interpretation readable together without merging them.
- **REP:** claim/evidence/coverage/verification state.

Obsidian Canvas is the initial authoring and inspection Surface. Web OCP must implement its own projection/runtime over the same logical graph rather than treating `.canvas` coordinates as canonical data.

## 11. Privacy and publication

The private Vault may index personal collaboration data when authorized. The public Git repository must contain only the schema, synthetic fixtures, implementation code, and non-sensitive evidence.

Publication eligibility is deny-by-default unless an applied policy classifies the source and every derived candidate as publishable. A redacted derivative must declare the redaction and must never be labelled verbatim raw.

## 12. Acceptance criteria for this proposal

This profile is ready for governance review when:

1. its JSON Schema validates the supplied synthetic packet;
2. the Obsidian Canvas parses and every file node resolves in the candidate Vault package;
3. no secret-like value or private account identifier exists in the public fixture;
4. each candidate has provenance and independent review/application states;
5. existing canonical entity kinds and invariants remain unchanged;
6. sources that require the owner's authenticated browser remain `AUTH_CONTEXT_REQUIRED`; verified access failure may use `KNOWN_INACCESSIBLE`; neither state is summarized from titles;
7. no implementation, runtime, deployment, or outcome success is claimed without evidence.

## 13. Not implemented by this proposal

- automatic file/app/web ingestion runtime;
- OAuth or account login;
- Claude, GPT, Gemini, Notion, Kakao, or device adapters;
- Canonical Graph ontology changes;
- workflow execution from Obsidian Canvas;
- web publication runtime;
- automatic diagnosis accuracy;
- human approval UI;
- six-case MVP completion.

These remain next boundaries rather than implied capabilities.
