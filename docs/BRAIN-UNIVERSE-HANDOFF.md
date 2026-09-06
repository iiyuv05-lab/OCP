# Brain Universe — product specification and Codex handoff

Status: implementation proposal / isolated prototype; canonical changes NOT approved.

## User goal

Build an actually working web app, not another static illustration. Explore the inner world of a person and that person's position in a wider ecosystem using a nested universe metaphor. Add an RTS-inspired working view: Terran = owned ideas, assets and modules; Zerg = errors, problems and bottlenecks; Protoss = external solutions, methods, providers and access routes. Use original visual primitives, not original game art, logos, voices or copied units.

## Two independent axes

A universe/galaxy/system/planet represents navigation scale and perspective. A faction represents the object's current role in a workflow. Neither is permission to add new canonical entity kinds. Preserve identity across projections. A person can be a planet as a recorded object and light as the current observer. A family-as-satellite arrangement is an observer-relative view, not a permanent hierarchy or permission to expose family information.

The company is a galaxy; projects are systems; modules and documents can be opened to reveal their internal relationships. Cross-cutting groups are constellations: references rather than destructive file moves.

## Source and privacy boundary

This repository is public. Commit only synthetic examples and generic application code. Do not publish private vault notes, source identifiers/URLs, people profiles, asset manifests or screenshots of private data. The user retains a separate, private, local standalone implementation and source package. GitHub/Codex cannot assume that private sandbox package is accessible here. The public starter in public/brain-universe.html is independently runnable and intentionally smaller; implement the complete target below within the existing OCP application.

Raw imports remain immutable. Changes made in a local view are explicitly local drafts/records, not canonical saves, approvals or applied patches. Original data is never silently overwritten. Export may contain private text and must warn accordingly. No automatic network transmission of imported notes. No AI execution claim without an actual successful connector result.

## Required behavior

1. Universe, tactical faction, list, problem/solution and audit views of the same underlying objects. Search by text; filter by scope, faction and explicit recorded date. Date filtering is not a complete historical/bitemporal reconstruction unless actual event histories support it.
2. Select an object to inspect its identity, evidence, source, source version, knowledge state, workflow state, valid time, recorded time and related objects. Open neighboring or internal subgraphs without changing source IDs. Keyboard and mobile alternatives are mandatory.
3. Add an idea/asset/module/problem/solution as a local proposal. Add typed, directed relations with evidence and proposal status. Existing wiki links imply references only, not containment, cause, ownership or successful resolution.
4. Choose a problem, connect an external solution as a candidate, create a separate internal adoption candidate linked back to the external original, then record verification evidence. Candidate linkage does not mean the tool was installed or the problem solved. Closing a problem preserves its history. Reopening and recording corrections append history.
5. Read user-selected local Markdown/TXT and file metadata. Preserve raw text; parse only supported fields; surface unsupported YAML. Distinguish missing, ambiguous and excluded targets. Never merge duplicate names or IDs without a decision. A selected-folder audit is not a global claim that a missing document does not exist.
6. File/JSON import must validate atomically before replacing the active workspace. Render imported text as text, not executable HTML. Cap import sizes and object counts; prevent dangerous protocols. Local session is the default; any browser persistence must be explicit, truthful on failure and described as neither encryption nor authentication.
7. Export/restore JSON, provide an import report, and show exact data coverage. Do not fabricate total vault counts or market statistics.

## Metrics and visual encoding

- Mass: explicit file bytes, unique source count or atomic-knowledge count, selected separately. Original/derivative/version/deduplication scope must be named. A source document's reported asset size is not a fresh binary measurement.
- Size: default equal size. Log-scaled bytes and local graph degree can be optional encodings, labeled precisely.
- Gravity: relation-specific strength/direction, source, scope, observation time and formula version. Unknown remains null. File size and graph degree are not causal influence.
- Distance: projector output for a named perspective; not a persisted objective fact.
- Orbit/rotation: defer until the user defines recurring review, collaboration, refresh or learning cycles. Do not invent physical periods.
- Light: selected observer/attention; never truth, personal worth or authority.
- Social users, research volume and search interest remain different dimensions with source, period, region, denominator and coverage. Do not sum them into an unsupported universal score.

## Epistemic and workflow distinctions

Unverified is not false. Uninvestigated is not absence. A hypothesis or as-if model is not automatically a problem/enemy. Never categorize a human as the problem faction. Reading a document verifies that the document says something, not that every claim is true. Prior-version reports remain prior-version reports; a recent copy/mtime does not promote them into current facts. Approval and application remain separate.

## Visual direction

Dark, readable universe exploration with original mechanical silhouettes for holdings, organic/spiky silhouettes for problems and crystalline silhouettes for external solutions. Quiet, precise inspection and forms. Labels/icons/shapes in addition to colors. Progressive disclosure, responsive list fallback, no forced animation and no decorative movement that delays work. Proposed relations are visibly distinct. Show semantic role labels (idea beacon, asset store, assembly module, unresolved issue, external route); do not pretend detailed game unit sprites already exist.

## Integration sequence for Codex

Read root AGENTS.md, docs/UI-PRINCIPLES.md, docs/UI-STATE-MODEL.md and, if adding motion, docs/UI-MOTION.md. Preserve React 19, vinext, custom CSS, D1/R2 and Canonical Graph -> ViewSpec -> projector. Do not replace the existing app with this prototype.

A. Run the public starter, identify its intentionally limited behavior, and implement an isolated /brain-universe view using existing components and canonical adapters.
B. Add the complete local interaction flow above, source inspector, scope/faction filters, typed relationships and the audit/import/export boundary.
C. Keep faction memberships and geometry in the projection layer. Reuse existing states, relations, events and provenance rather than inventing a second truth.
D. Implement authenticated private-data integration before any shared vault publishing. Keep synthetic examples conspicuously labeled. Never infer consent from having repository access.
E. Connect actual execution only through existing gated capabilities. Review-required changes go through the existing human gate.
F. Run npm run lint then npm test per repository instructions. Browser-test the changed desktop/mobile interactions and input safety. Record only actual evidence in docs/UI-QA.md. This prototype's isolated tests are not a substitute for root validation.
G. Use the existing preview/deployment workflow if available. Verify the returned URL and working interactions before reporting a deployment as complete. Do not merge into main or publish private data automatically.

## Acceptance checklist

- A user can add a problem, link an external candidate, create a separate internal adoption candidate, inspect original evidence and record a verification outcome.
- Raw source text remains unchanged across role edits and resolution records.
- Unknown metrics are not zero or fabricated numbers; failed saves are never successful toasts.
- Invalid import preserves the prior workspace; potentially active HTML remains inert text.
- Same-ID and same-name files are not silently merged; ambiguous links are not silently selected.
- The same selected canonical ID remains stable across map/list/inspector perspectives.
- 390px and desktop layouts support core tasks, accessible selection and text alternatives.
- Actual tests, NOT RUN checks, publication status and remaining blockers are reported separately.

## Decisions left open without blocking a prototype

First deployment privacy boundary: default to a private authenticated workspace or a public synthetic demo, never a public private-data seed. Orbit/rotation semantics, gravity formula, current company/project ownership, family display scope, and commercial faction naming remain explicit decisions. Keep them unset rather than making up answers.

## Handoff state

This file and a public starter constitute a concrete implementation request. A posted @codex comment is only a submitted request until the bot/session confirms execution. Do not report running, completed or deployed from the existence of this document alone.
