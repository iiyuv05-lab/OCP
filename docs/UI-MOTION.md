# OCP motion system

Status: normative · Canonical Graph v0.1

## Meaning contract

Motion must explain at least one of:

- appearance;
- disappearance;
- movement;
- relationship;
- hierarchy;
- a confirmed state transition;
- causality backed by an Event or Revision.

If it explains none of these, remove it.

## Tokens

The CSS custom properties in `app/globals.css` are the implementation source of truth.

| Token | Range | Use |
| --- | --- | --- |
| instant | about 80 ms | direct acknowledgement |
| fast | 120–160 ms | hover, focus, pressed, small selection |
| standard | 180–240 ms | panels, sheets, list insertion |
| slow | 280–360 ms | a rare large spatial re-projection |

Use a spring only for direct manipulation or meaningful shared-layout continuity. Prefer transform and opacity. Avoid animating large shadows, blur, filters, or hundreds of graph nodes at once.

## Patterns

- A selected object may visually continue into its Inspector identity.
- A drawer or sheet may enter and exit to explain containment.
- A ViewSpec change may move the same canonical object, provided the canonical ID stays stable.
- A list insertion may animate only after the server confirms the new record.
- Pulse is reserved for a fresh, verified running signal. A fixture, stale signal, unknown connection, or recorded snapshot is static.

Motion for React is justified only when shared layout, gesture, or exit lifecycle cannot be expressed cleanly with the current CSS. React Flow and Rive require a separate demonstrated need.

## Reduced motion

Honor `prefers-reduced-motion: reduce`.

- Remove continuous movement, parallax, large transforms, and pulsing.
- Make structural changes immediate or use a short opacity change.
- Preserve visible focus and semantic status feedback.
- Verify rapid repeated actions do not leave panels or selection in an intermediate state.

