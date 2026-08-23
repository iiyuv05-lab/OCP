# OCP UI principles

Status: normative · Canonical Graph v0.1

## Identity

OCP combines an operational workspace, a human/AI coordination interface, and a knowledge-state interface. Its character can feel as precise as modern developer tools, but it must not copy fashionable SaaS patterns that obscure OCP's domain.

The interface exists to make these things legible:

- what object is selected;
- what state is asserted and by which model;
- who is responsible or waiting;
- what evidence supports the assertion;
- what changed, when it was valid, and when it became known;
- what the user can safely do next.

## Priority ladder

1. Preserve functionality.
2. Preserve truthfulness of state.
3. Improve comprehension.
4. Improve interaction speed.
5. Improve consistency.
6. Improve responsiveness.
7. Improve accessibility.
8. Add meaningful motion.
9. Improve visual polish.
10. Add delight.

## Object-first interaction

Prefer selection, contextual inspection, relations, history, evidence, and commands over unnecessary page changes. Goal, Task, Agent, Human, Artifact, Evidence, and Decision are interaction concepts; use only the canonical types and relations that actually exist. A missing Task entity kind is an ontology decision, not a UI shortcut.

The Map, mobile list, Feed, command palette, and Inspector are projections of the same facts. A surface may reveal or group information differently, but it must not create a second truth.

## Hierarchy and density

- Put the selected object, active model context, human intervention, and latest verified change above secondary controls.
- Use progressive disclosure for projection details and specialist REP filters.
- Dense does not mean tiny. Keep decision-bearing labels readable and preserve a clear scan path.
- Reduce cards when grouping or a relation is clearer than another container.
- Empty states explain what is absent and the next valid action.
- Loading states name the real operation without inventing a percentage.
- Errors state what did not happen and offer a safe retry or local-draft path.

## Semantic state

Never rely on color alone. Pair a state color with a label and at least one of icon, shape, pattern, or position.

Operational state and epistemic state are separate. `Working` is not `Observed`; `Blocked` is not `Conflicted`; `Confidence` is not `Progress`.

## Contemporary quality

Trend relevance means contemporary typography and density, responsive interaction, spatial continuity, progressive disclosure, fast command access, and high information clarity. It does not mean arbitrary gradients, glass, blur, glow, or animation.

## Dependency ladder

1. Reuse the existing component.
2. Extend the existing component.
3. Create a reusable OCP component.
4. Adopt an external component.
5. Add a dependency.

Motion for React, React Flow, and Rive are conditional tools, not defaults.

## Prohibited shortcuts

- Do not rewrite the whole application for aesthetics.
- Do not hide core operations to look minimal.
- Do not fabricate live presence, history, progress, evidence, or realtime updates.
- Do not make animation wait for work or conceal latency.
- Do not sacrifice keyboard, touch, reduced-motion, or mobile behavior.
- Do not mutate canonical state optimistically when server confirmation or a gate is required.

