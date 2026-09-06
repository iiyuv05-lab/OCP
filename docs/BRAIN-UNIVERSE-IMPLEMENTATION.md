# Brain Universe — implementation brief

Date: 2026-09-07. Status: feature proposal and Codex implementation handoff; not an approved canonical ontology change.

## Product

Brain Universe lets a user explore their inner knowledge and their position in an external world. A vault remains a storage/provenance boundary. A universe is a projection of connected objects. A company/community can be a galaxy, a project a star system, an individual or concept a planet, and close relationships satellites in a selected perspective. The user is both a recorded object (Earth) and the observer (light). Zoom must not create new identities or duplicate source records.

Provide two projections of the SAME graph: a cosmic exploration map and an RTS-inspired tactical map. The user's requested role aliases are Terran / Zerg / Protoss, displayed together with functional Korean names. These are roles in a view, not canonical entity kinds and not intrinsic labels for people.

## Three factions

- Terran / 테란 / 보유: individual ideas, assets, reusable modules, workflows, projects. Use original mechanical/scouting/construction silhouettes. Differentiate an idea beacon, asset container, worker/scout, reusable module and production hub. Do not include copied game art, logos, sounds, characters or unit assets.
- Zerg / 저그 / 문제: bugs, errors, blockers, conflicting records, missing required inputs. Use original organic warning silhouettes. Never classify a person as an enemy, or treat unverified, uninvestigated, hypothetical or as-if knowledge as an error by default. Resolution preserves the issue and its history.
- Protoss / 프로토스 / 외부 해결책: external services, methods, research, providers and access routes. Use original crystalline/portal silhouettes. External does not imply superior or verified. A route is not the knowledge it leads to; a provider is not the capability.

## Primary workflow

Select an issue -> inspect evidence and scope -> find internal capabilities and external candidates -> connect a candidate -> optionally propose an internal module derived from the external solution -> execute only through an authorized connector -> record verification -> mark user-reported resolution or reopen. Candidate connection is not approval, execution or resolution. Adoption creates a separate internal candidate linked back to the external original; it never converts or overwrites that original.

## Measurement contract

Data mass, social scale, relationship strength, epistemic state and workflow state are independent. Missing is null, not zero.

- Default glyph sizes are equal. Optional byte sizing measures only known local file sizes and must disclose the scale transform. Do not infer knowledge value or market scale from file bytes.
- User counts, research volume and search interest are separate selectable measures with units, source, scope, as-of time and coverage. Never fabricate numbers, rankings, totals or percentages.
- Gravity requires a typed, directional relationship and an explicitly defined strength measure. Link count is not causality or influence.
- Coordinates are layout output. Distance is not evidence of similarity unless an explicit metric is selected.
- Orbit and rotation periods remain unset until their operational meanings and data are specified. Decorative light animation must be labeled as an effect, not a measured cycle.
- Valid time, recorded time and file modification time remain independent. Never backfill recorded time from file modification time without labeling the inference.

## Required first working slice

1. Universe, tactical, searchable list, issue/solution board and vault-audit views.
2. Keyboard/touch object selection, inspector, source links, one-hop focus, zoom/pan, scope/faction/time filters. Consistent identity across projections.
3. Explicit separation of source-observed, user-reported, proposed and synthetic-fixture data; source-observed means a document was read, not all its claims verified.
4. Local read-only vault import: Markdown/text with immutable raw content, bounded YAML handling, wiki links, Canvas file references, and asset metadata. Exclude hidden/credential/account/security folders by default and disclose that this is not exhaustive PII detection.
5. Import diagnostics: missing/duplicate source IDs, duplicate names, unresolved and ambiguous links, unknown timestamps, unsupported YAML. Never silently merge same-name files or connect ambiguous references.
6. Local overlay create/edit roles, typed relationship proposals, resolution evidence, adoption candidates, JSON export/restore with schema validation. Failed import preserves the previous workspace.
7. Session-only default. Any persistent local storage is opt-in and must disclose that it is not authentication or encryption. Do not show failed saves as saved.
8. Exported or imported text must not execute HTML/JavaScript. Validate all fields used in rendering, including audit metadata and source URLs.

## Preserve this repository

Read AGENTS.md, docs/UI-PRINCIPLES.md, docs/UI-STATE-MODEL.md and docs/UI-MOTION.md before implementation. Preserve React 19, vinext, custom CSS, D1/R2 and Canonical Graph -> ViewSpec -> projector. Reuse existing components and schema first. Goal/Task/Agent/Human/Artifact/Evidence/Decision and the prototype role words do not authorize new canonical kinds. Raw artifacts remain immutable. Observations do not automatically change Current/Reference models. Approved and applied remain distinct, with human gates for reference model, identity, ontology, authority, retirement and deletion.

A suggested isolated route is /brain-universe; retain existing screens. A broad cosmic exploration surface is an intentional view extension, not justification to replace quiet decision/input panels or hide core actions. Respect reduced motion, keyboard navigation, mobile layout, and labels in addition to color.

## Privacy and deployment

This repository is public. Commit only generic code and clearly synthetic examples. Do not commit vault notes, private Drive URLs, personal/family/team profiles, private screenshots, private exports, access tokens, or automatically captured raw data. Real vault data is loaded locally or through a separately authorized private data path. Existing public repository access does not authorize publishing private vault contents.

Do not merge to main or change production sharing/authentication merely to demonstrate the feature. Deploy a synthetic preview only when the existing project has a working authorized deployment path. Do not invent a URL or report deployment before opening and checking the actual URL. Do not claim live Drive sync, remote agent execution, measured gravity or full-vault coverage unless implemented and verified.

## Validation and completion

Run npm run lint, then npm test as required by AGENTS.md. The test already includes the production build. Test changed browser interactions and desktop/mobile boundaries. Include raw immutability, import rollback, ambiguous links, XSS-like text, unknown measurements, external-original preservation, issue history, storage failure, and private-data exclusion. Record unavailable checks as NOT RUN in docs/UI-QA.md. Screenshots alone are not functional tests.

Completion report: changed files, implemented interactions, exact test commands/results, unavailable checks, canonical/private-data changes (expected none), actual preview URL if deployed, and remaining blockers.

## Nonblocking open decisions

Orbit = review/revisit/collaboration cadence? Rotation = refresh/self-check/rehearsal? Gravity = interaction frequency/dependency/goal impact? Keep unset rather than choose silently. Family exposure and real company/project membership must be user-scoped. Commercial naming and final unit designs remain configurable. None of these should block building the read-only functional slice.
