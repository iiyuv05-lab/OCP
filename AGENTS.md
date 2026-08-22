# OCP repository instructions

## Product contract

OCP is an operational map of observations, evidence, models, responsibility, and state transitions. Reality itself is never stored or rendered as a canonical object.

Preserve these invariants in every change:

- Observation, Evidence, Model, State, and Revision remain distinct.
- Valid time and recorded time remain independent.
- Observed, inferred, planned, forecast, and hypothetical states stay visibly distinct.
- Observation ingestion never implies a Current or Reference model change.
- Approved and applied are different patch states. Reference-model, identity, ontology, authority, retirement, and deletion changes keep their human gate.
- Raw artifacts remain immutable.
- Render coordinates and edge geometry are projector output, never canonical persistence.
- Never present a failed request as saved, polling as live, a fixture as presence, confidence as progress, or an estimate as measured state.

## Priority order

1. Preserve functionality and truthful state.
2. Improve comprehension and decision speed.
3. Improve consistency and object continuity.
4. Improve responsive behavior and accessibility.
5. Add meaningful motion and visual polish.

Never trade a higher priority for a lower one without explicit justification.

## Existing architecture

Preserve React 19, vinext, the custom CSS system, D1/R2 bindings, and the Canonical Graph → ViewSpec → projector boundary. Prefer an existing component, then extend it, then create a reusable OCP component. Add a dependency only when the current stack cannot satisfy a demonstrated requirement.

Goal, Task, Agent, Human, Artifact, Evidence, and Decision are interaction language, not permission to invent new canonical entity kinds. Ontology changes require their normal governance path.

## UI documentation router

- For any UI change, read `docs/UI-PRINCIPLES.md` and `docs/UI-STATE-MODEL.md`.
- For motion changes, also read `docs/UI-MOTION.md`.
- For a cross-surface audit or refactor, also read `docs/UI-AUDIT.md`.
- After implementation, record only actual evidence in `docs/UI-QA.md`.

## Validation

Run `npm run lint`, then `npm test`. The test command already includes the production build, so do not run a duplicate build unless diagnosing a build-specific failure. Browser-check only the changed interactions and relevant responsive boundaries. Record unavailable checks as `NOT RUN`, never as a guessed pass.

