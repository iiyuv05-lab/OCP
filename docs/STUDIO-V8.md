# OCP Studio v8 — REP / BU / OCP integration

Status: source integration candidate. No production migration is implied.

## Ownership and identity
- Product hierarchy: Company → Brand → Product → Page → Module → Asset / Molecule → Component / Atom.
- Folder containment, workflow tier (01–08), perspective and CUI/CLI/GUI representation are separate axes.
- Canvas geometry is ephemeral projector output. The same entity ID may have multiple tier placements.
- Imported sources are observations, not approvals or deployments.

## Native entry points
- Existing OCP: `/studio`, `/api/studio`, `/api/studio/receipt`.
- Apply additive `db/migrations/studio-v8.sql` to the existing canonical database.
- `RAW_ARTIFACTS` is the OCP object binding. Existing Plmag uses `FILES`.
- Standalone OCP private access fails closed until `STUDIO_GATEWAY_SECRET` is configured in the runtime secret manager. A trusted gateway must strip inbound identity headers, authenticate the user, and insert verified identity plus gateway proof. Do not send this secret to browsers.
- Existing Plmag uses its signed account session instead. The installer never replaces authentication.
- User-entered fields cannot grant actor roles. Reviewer/admin approval and application remain distinct.

## Lifecycle
REP input → BU immutable object → first classification → REP secondary classification → evidence/acceptance review → approval → apply → GUI design → CLI build → Launching Beam request → signed executor receipt.

Every committed operation creates a canonical revision and BU outbox/event object. `object-stored;drive-pending` does not mean Drive synchronization has completed. Original raw bodies remain immutable. A new source version marks dependent implementation for re-review.

`request-release` does not publish. `/api/studio/receipt` requires a timestamped HMAC, exact run ID, exact build hash, and evidence digest. Server verification remains independent of publication. A signed receipt alone is a provider assertion, not independent end-to-end verification of every feature.

## REP source integration
`adapters/plmag/` and `scripts/studio/install-plmag.mjs` add native `/studio` and API routes to the preserved Plmag source, preserving its signed-cookie account boundary. The existing REP cloud toolbar receives an OCP connection action. Selected notes, cloud layout and channel messages retain native IDs and versions; reads are owner/member scoped and bounded. This does not turn the separate public REP Engine into the private REP account server.

Agent messages currently record implementation proposals. They do not execute an LLM or send messages into an unconnected third-party conversation.

## Safe installation
```
node scripts/studio/install-plmag.mjs /absolute/path/to/Plmag
node scripts/studio/install-plmag.mjs /absolute/path/to/Plmag --apply
```
The dry run is default. Existing differing target files are not silently overwritten. Exact older preserved Plmag integration is not proof that a newer unpublished REP branch has been merged.

## Local execution
Node 22.13+:
```
node --test tests/studio/core.test.mjs
node scripts/studio/serve.mjs
```
Open `http://127.0.0.1:8788/studio`. Local session is explicitly a loopback verification identity, not a cloud login. Private SQLite and BU files are under `private/runtime`, excluded from Git. The standalone compatibility host is not the native Worker runtime.

## Boundaries
- v8 provides a deterministic editable responsive page compiler, not general autonomous app development.
- Audio and call recordings may be linked as raw source references; recording upload/ASR is not implemented here.
- Private raw data must not be committed to the public OCP repository.
- Public previews must not bundle private source graphs or secrets.
- Legacy URLs, runtime DBs and original vault folders are unchanged until an independently verified release/migration is applied.
- Graph read-model currently reads the current workspace snapshot. Bitemporal versions are stored; historical UI is not implemented in this slice.
