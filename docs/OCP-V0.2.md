# OCP v0.2 extension boundary

Status: approved product direction · does not supersede Canonical Graph v0.1

## Core statement

OCP is not a database-shaped product. It is a View Architecture: one Canonical OCP State projected through a View Engine and presentation adapters for desktop, mobile, web, agent, and MCP/API use. The canonical graph remains the single source of identity, time, provenance, evidence, model membership, and authority.

OCP inherits familiar interface grammars when they improve comprehension:

| Grammar | OCP projection |
| --- | --- |
| Map | spatial structure, zoom, layers, selection, overlay and split comparison |
| Timeline and calendar | chronology, valid-time commitments, and recorded-time reconstruction |
| Organisation chart | responsibility, authority, and accountability |
| Kanban and flow | operational state and bounded workflow transitions |
| Feed | recorded revisions and review queue |
| Search and file browser | direct object access and provenance exploration |
| Dashboard and table | concise summary and dense review |

The grammar changes presentation only. It never creates an alternate truth, persists coordinates, or collapses observation, evidence, model, state, and revision into one object.

## Approved extensions

### Granularity Registry

OCP needs a Registry of human-useful recognition scales, rather than one universal hierarchy. A reference sequence can be `Model → Module → Schema → Concept → Symbol → Representation/Signal → Sense/Raw`; an enterprise view may instead use `Enterprise → Business → Product/Project → Workflow → Task → Decision → Evidence → Raw`.

This is a future Reference Model and ViewSpec concern. It is not permission to add `Task`, `Module`, or `Schema` entity kinds without ontology governance.

### Representation language and provenance

Every input records its expression language when available: natural language, mathematical notation, diagram, map, image, video, audio, music, code, table, graph, gesture/behaviour, or sensor signal. A derivative may extract frames, a transcript, a scene description, or events, but the chain stays explicit:

```text
Raw original ≠ representation ≠ translation ≠ interpretation
```

The existing immutable Raw Artifact → derived Artifact → Observation → Evidence flow is the basis. A later metadata extension may add a controlled representation-language registry; it must preserve raw hashes, source/capture times, permission, sensitivity, and lineage.

### Map reference grammar

The OCP Map recognises viewport, zoom, scale, layers, feature/object, region, marker, boundary, route, legend, filter, search, selection, overlay, split comparison, timeline, and inspector as interaction grammar. OCP extends this with bitemporal controls and model comparison. `X = lateral relation`, `Y = semantic hierarchy`, `Z = model layer/perspective`, and `T = time` remain projector rules, not stored geometry.

### Knowledge as an installable module

Models, methods, frameworks, workflows, person models, agents, and tools can be saved, compared, or proposed for use in work. “Add to my model”, “apply to work”, “insert into Flow”, and “attach to Agent” create bounded proposals or relations; they never silently copy a model into Current or Reference. REP discovers and verifies candidates; OCP installs only accepted, governed changes and records the outcome.

### Migration and Raw Vault

Existing files, notes, AI conversations, recordings, cloud files, projects, code, databases, and other legacy material flow through import:

```text
Import → immutable Raw Vault → metadata + context → candidate entities/relations/events/states → OCP Graph
```

Raw bytes belong in the Raw Vault/R2, while the canonical database stores immutable metadata, ownership, permission, sensitivity, source, hashes, and lineage. Import and decomposition produce candidates; they do not manufacture Canonical Definitions.

### Capture and consent boundary

Browser, document, communication, recorder, AI use, and sensor input are possible World Windows only when the user has explicitly consented. Capture writes raw signal/artifact, timestamp, and context first. Extraction, claims, and definitions proceed through the existing evidence and patch gates. Health, body, environment, and personal sensor data require a stricter sensitivity, retention, and consent policy before implementation.

### Daily Tacit Delta

OCP may offer a review projection of recorded decisions, outputs, workflow changes, newly found rules, exceptions, explanations, unresolved AI gaps, and evidence. The measure is `known tacit gap`, not a fabricated claim of zero tacit knowledge. It is a derived read model backed by source revisions and evidence.

### Person and agent records

A person can be both an actor and a modelled entity over time. Public or permitted material must preserve its source, permission, and observed-versus-inferred distinction. An AI run is an auditable operational record of prompt/input, supplied context, model, tools, output, human revision, decision, outcome, cost, and latency. Both additions need canonical schema and governance design before implementation.

### Past, present, and future

OCP operates through three distinct modes:

- Past — reconstruction: why the current state emerged.
- Present — observation: what state is currently supported.
- Future — projection: goals, plans, scenarios, forecasts, and decision options.

These modes use the same bitemporal contract. Projection is not an observation, and a forecast never becomes current truth because it appears in a map.

## Delivery sequence

1. Preserve the fixed meta-model and improve real ViewSpec adapters, beginning with a true timeline/calendar presentation rather than another map skin.
2. Add a Raw Vault browser and a safe import flow with explicit artifact-to-observation status.
3. Define registry schemas and consent/sensitivity policy before capture, sensor, person-model, or AI-run ingestion.
4. Add install/apply operations only as server-checked proposal flows with model and human gates intact.
5. Generalise from a real workflow only after its failures are recorded and reviewed.

This is deliberately neither a complete top-down ontology nor unbounded feature accumulation. OCP keeps a stable meta-model and evolves Views, Modules, and Workflows from observed use.
