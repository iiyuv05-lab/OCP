# Brain Universe — Codex implementation brief

Date: 2026-09-07. Status: implementation request. This document does not authorize changing canonical ontology, publishing private vault data, deleting raw artifacts, or bypassing approval gates.

## User request

Build an actually working web application, not a mockup. The experience is a personal knowledge universe: the inner world of thought and the user's position in the outside world. Use cosmic navigation together with three RTS-inspired role groups:

- Terran / 테란: internal ideas, assets, reusable modules, and projects.
- Zerg / 저그: actual errors, problems, missing dependencies, and bottlenecks.
- Protoss / 프로토스: external solutions, tools, methodologies, providers, and access routes.

Use original mechanical, organic and crystalline visual designs. Do not bundle game logos, original unit images, audio, or copied game assets. These are homage role aliases, not an official affiliation. Never classify a person, culture, academic discipline, or unverified hypothesis as an enemy.

## Read first

Read root AGENTS.md, docs/UI-PRINCIPLES.md, docs/UI-STATE-MODEL.md, and docs/UI-MOTION.md before implementing. Preserve React 19, vinext, custom CSS, D1/R2, and Canonical Graph -> ViewSpec -> projector. This feature is a new projection of existing data, not a replacement database or a license to invent canonical entity kinds. Inspect narrower instructions under changed directories.

## Product definition

Name: Brain Universe. Korean tagline: 내 안의 세계, 세계 속의 나.

A vault is the data storage boundary. A universe is a view of permitted data and relationships. A galaxy can represent an organization or field, a planetary system a project, a planet an entity, and a satellite a close relationship from a chosen perspective. The person is a planet as a recorded object and light as the current observer. Changing perspective must not duplicate or change canonical identity.

Cosmic scale and RTS faction are different axes. A project may be an entire planetary system while its contents are internal modules, issues, or external solutions. A person can participate in multiple projects without being copied. Family satellite membership is optional, private by default, and must not be inferred.

## First working route

Add a non-destructive route such as /brain-universe. Do not replace existing OCP routes or change the existing home by default. Include:

1. Universe view: group by organization/project/domain, pan, zoom, select, search, and inspect.
2. Tactical view: rearrange the same objects by internal holdings / problems / external solutions. Faction is a perspective role, not canonical kind.
3. List view: an accessible alternative to the visual map, with search, scope and state filters.
4. Problem/solution view: select an issue, inspect its evidence and reproduction conditions, attach candidate solutions, and record verification without automatically claiming success.
5. Read-only vault import: user-selected Markdown/TXT/Canvas and asset metadata, provenance, frontmatter, wiki links, exact preserved raw text, diagnostics for unresolved or ambiguous links and duplicate IDs.
6. Local export/import: validated JSON backup and restoration. Default to session-only storage. Browser persistence is opt-in, must report failures truthfully, and is not authentication or encryption.
7. New object and relationship proposals: add ideas/assets/modules/issues/solutions to an overlay, not to raw artifacts or the reference model.
8. Adoption: create a new internal module candidate linked to the original external solution. Do not convert or delete the external source. Actual copying, external connection, installation, spending and data transmission are separate actions and gates.
9. Provenance inspector: source, content-read versus metadata-only, recorded time, valid time, exposure, evidence status, proposed versus observed relationships, and raw read-only text.
10. Keyboard access, visible focus, responsive layout around 390px, reduced-motion support, no color-only status meaning.

## Measurement and truthfulness

Do not invent market counts, organization sizes, search volume, influence, rankings, gravity, orbital periods, or personal knowledge coverage.

- Mass: file bytes when known, or an explicitly selected count metric. Raw, derivative, duplicate and version counts must remain distinguishable. Unknown is null, never zero.
- Size: equal by default, or a disclosed metric/scale. Social users, research volume and search interest are separate lenses, not one mixed score.
- Gravity: a directed relationship measurement with declared type, evidence, context, time and formula version. Link count is not causal influence.
- Distance: projector output. Aesthetic layout coordinates are not measured semantic distance.
- Orbit: not configured until its work meaning and period are known. Do not create decorative movement that appears measured.
- Rotation: similarly distinguish refresh/review/learning cycles from arbitrary animation.
- Light: observer attention/selection, not knowledge truth or human value.
- Time: valid and recorded remain independent. File mtime is neither event time nor first knowledge acquisition.

Observed, inferred, planned, forecast and hypothetical remain visibly distinct. Reading a document confirms its contents were read, not that its claims are true. Uninvestigated is not nonexistent; unverified is not refuted; as-if is not an error. Proposed solution links do not prove causal success. A solved issue keeps its history and can be reopened.

## Data boundaries

Use existing canonical entity/relation/evidence models and ViewSpec first. Any temporary UI DTO should retain entity ID, perspective role, grouping, source references, independent state dimensions and null-valued measurements. Coordinates and edge geometry stay outside canonical persistence.

Raw imports are immutable. Detect ambiguous names and duplicate IDs without silent merges. Resolve links relative to the selected import scope and disclose unselected/missing files. Unsupported YAML must be preserved and reported rather than silently reinterpreted. Never execute imported HTML/JavaScript. Do not treat hidden-by-UI as access control.

This repository is public. Commit only generic source code and clearly labeled synthetic examples. Do not commit personal vault contents, private Drive IDs/URLs, real-person graphs, private export JSON or screenshots of private data. A public demo can support client-side user-selected files without embedding or transmitting them. Shared/server storage requires proper authorization and data isolation before use.

## Implementation sequence

A. Inventory existing components, projector contracts and graph adapters. Create a mapping table rather than a new ontology.
B. Implement a working client-side prototype using clearly labeled synthetic fixtures; provide the local import path for actual data. Make core controls functional instead of decorative.
C. Integrate the read-only graph adapter and truthful state model, then proposal/approval boundaries.
D. Add the visual layer: original vector mechanical/organic/crystalline unit icons, stable cosmic grouping, semantic zoom or one-hop inspection, and optional clearly labeled motion.
E. Test and fix actual interactions. Then prepare an authenticated personal deployment, or a public synthetic-only demo if already supported. Do not invent a preview URL. Do not change billing, access, secrets or production settings without the normal gate.

## Acceptance tests

- Search, faction/scope/state filters and all views return consistent objects.
- Selection opens correct details and provenance; keyboard selection works.
- Pan/zoom does not alter canonical state.
- Adding objects/edges records proposals, not approval or application.
- External adoption preserves the original object and creates a separate internal candidate.
- Resolution requires a recorded verification result and preserves the issue.
- Raw text is identical before and after UI operations.
- Malformed JSON/duplicate IDs/unknown edge targets do not corrupt the current workspace.
- Unresolved/ambiguous wiki links are reported, not guessed.
- Unknown dates remain unknown; time filters do not fabricate timestamps.
- Imported markup cannot execute.
- Save/export/network failures are visible and never reported as success.
- Public fixture and bundle contain no private data.
- Mobile 390px and desktop workflows are usable without horizontal overflow.

Run npm run lint then npm test as the root instructions require. Browser-check the changed interactions. Write only actual results to docs/UI-QA.md, marking unavailable checks NOT RUN. A standalone prototype test is not a substitute for integrated OCP tests.

## Delivery and delegation state

This file is a concrete implementation handoff, not proof that Codex has started or completed work. Return changed files, actual test output, remaining gaps, approval-sensitive changes, and only a deployment URL actually returned and opened. Do not stop at another planning document or another generated image.
