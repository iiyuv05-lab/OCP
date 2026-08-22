# OCP UI state model

Status: normative · Canonical Graph v0.1

## Source-of-truth contract

| UI concept | Canonical source | UI rule |
| --- | --- | --- |
| Object identity | `entities` | Preserve the canonical ID across projections. |
| Model presence | `model_entities` | Distinguish present, explicit absent, unknown, and not loaded. |
| Lifecycle, health, progress, confidence | bitemporal `states` | Show the selected model layer and as-of cutoffs. |
| Ownership, responsibility, authority | active `relations` | Never duplicate ownership as an unrelated state truth. |
| Relations | bitemporal `relations` | Preserve direction and expose a text alternative to the map. |
| History | `events`, transitions, `revisions` | A timeline is read-only evidence of recorded change. |
| Provenance | Evidence → Observation → Artifact | Keep interpretation separate from the immutable raw source. |
| Model difference | membership, relation, and state signatures | Derive agreement, only-in-one-model, and conflict. Never persist UI diff flags. |
| X/Y/Z and edge geometry | ViewSpec + projector | Treat layout as ephemeral output. |
| Live or presence | a real heartbeat/session source | Otherwise label the view as a recorded snapshot. |
| Participation and authority | Sites access policy + `workspace_members` | Sign-in is not membership; a writer can record inputs, while only a reviewer or admin can decide a human-gated patch. |

Reality is a boundary outside this table. It is accessible only through observations and evidence.

## Independent state axes

Operational state: `idle`, `queued`, `working`, `blocked`, `human-required`, `completed`, `failed`.

Epistemic state: `observed`, `inferred`, `planned`, `forecast`, `hypothetical`, `unknown`.

Model layer: `observed`, `reference`, `current`, `goal`.

Health: `healthy`, `attention`, `risk`, `neutral`.

Confidence expresses support for an assertion. Progress is allowed only when a real numerator, denominator, or measured source exists.

## Bitemporal presentation

The active assertion satisfies both half-open intervals:

```text
valid_from <= validAt < valid_to
recorded_from <= recordedAt < recorded_to
```

The UI always names both dimensions:

- Valid time: when the assertion applies in the modeled world.
- Recorded time: the knowledge cutoff used to reconstruct what the system knew.

A historical knowledge snapshot is read-only. A late record should read like `Valid 1 Aug · recorded 21 Aug`, not as if the event happened on the recording date.

## Write and gate transitions

1. A save is successful only after a 2xx response and a returned observation or proposal identifier.
2. A failed or non-2xx request creates no success toast, canonical feed entry, or approved state.
3. A local draft must be labelled `local draft` and must never masquerade as persisted data.
4. Observation ingestion may update the observed feed and create candidates; it does not mutate Current or Reference models.
5. A patch decision is not a patch application. `approved` and `applied` remain visibly distinct.
6. Optimistic updates are allowed only for reversible local preferences such as open panels, selected projection, or zoom.
7. The server determines identity, recorded time, authorization, and the highest required gate.
8. Explicit self-enrolment may grant only the `writer` role. It creates a provenance actor and enables observation capture; it must not self-grant reviewer or admin authority.

## Input language

Direct observations use direct-observation language. Inferred, planned, forecast, and hypothetical inputs are candidate assertions captured with provenance; the UI must not describe them as direct observations. No input becomes canonical merely because it was submitted.

## Async states

- `loading`: name the operation, for example `Saving observation…`.
- `empty`: say what is absent and offer the next real action.
- `error`: say what did not happen; keep the user's draft available for retry.
- `unknown`: do not replace it with absent, zero, or the current model's value.
