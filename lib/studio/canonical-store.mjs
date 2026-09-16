/** Uses the existing OCP entities/models/states/relations tables, not a scene-node DB. */
import {
  emptyGraph,
  digest,
  DomainError,
} from "../../public/ocp-studio/core.mjs";
export async function tenantFor(subject) {
  return `studio-${(await digest(subject)).slice(0, 24)}`;
}
const dbid = (workspace, id) => `${workspace}/${id}`;
const baseKind = (n) =>
  ({
    company: "enterprise",
    brand: "product",
    product: "product",
    page: "artifact",
    module: "artifact",
    asset: "artifact",
    atom: "artifact",
    raw: "observation",
    file: "artifact",
    folder: "artifact",
    design: "artifact",
    code: "artifact",
    decision: "decision",
    deployment: "outcome",
    message: "observation",
    endpoint: "artifact",
    cloud: "artifact",
  })[n.kind] || "artifact";
const layer = (n) =>
  ["current", "reference", "goal", "observed"].includes(n.model)
    ? n.model
    : "observed";
export async function initialize(db, workspace, actor) {
  if (
    await db
      .prepare("SELECT version FROM studio_heads WHERE workspace_id=?")
      .bind(workspace)
      .first()
  )
    return;
  const now = Date.now();
  await db.batch([
    db
      .prepare(
        "INSERT OR IGNORE INTO workspaces(id,name,created_at_ms) VALUES(?,?,?)",
      )
      .bind(workspace, "OCP private studio", now),
    db
      .prepare(
        "INSERT OR IGNORE INTO studio_heads(workspace_id,version) VALUES(?,0)",
      )
      .bind(workspace),
    db
      .prepare(
        "INSERT OR IGNORE INTO workspace_members(workspace_id,auth_subject,role,created_at_ms) VALUES(?,?,?,?)",
      )
      .bind(workspace, actor.id, actor.role, now),
    db
      .prepare(
        "INSERT OR IGNORE INTO entities(id,workspace_id,entity_type,identity_key,canonical_name,normalized_name,created_at_ms) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        dbid(workspace, "actor"),
        workspace,
        "actor",
        "studio-actor",
        actor.id,
        actor.id,
        now,
      ),
    ...["observed", "current", "reference", "goal"].flatMap((l) => [
      db
        .prepare(
          "INSERT OR IGNORE INTO entities(id,workspace_id,entity_type,identity_key,canonical_name,normalized_name,created_at_ms) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          dbid(workspace, `model:${l}`),
          workspace,
          "model",
          `studio-model:${l}`,
          l,
          l,
          now,
        ),
      db
        .prepare(
          "INSERT OR IGNORE INTO models(id,workspace_id,model_key,layer,perspective_kind,status,created_at_ms) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          dbid(workspace, `model:${l}`),
          workspace,
          l,
          l,
          "person",
          "active",
          now,
        ),
    ]),
    db
      .prepare(
        "INSERT OR IGNORE INTO revisions(id,workspace_id,revision_kind,title,summary,hash,recorded_at_ms) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        dbid(workspace, "revision:0"),
        workspace,
        "seed",
        "Studio initialized",
        "Empty private workspace; no source fixture is production truth.",
        "studio-empty-v8",
        now,
      ),
    db
      .prepare(
        "INSERT OR IGNORE INTO view_specs(id,workspace_id,key,name,projection,presentation,model_mode,owner_scope,axis_rules_json,layer_rules_json,time_rules_json,version,created_at_ms,updated_at_ms) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        dbid(workspace, "view:pipeline"),
        workspace,
        "studio-pipeline-v8",
        "REP → BU → OCP",
        "custom",
        "map",
        "overlay",
        "person",
        JSON.stringify({
          x: "value-flow",
          y: "workflow-01-08",
          z: "representation-CUI-CLI-GUI",
          hierarchy: "separate-CONTAINS",
          persistedCoordinates: false,
        }),
        JSON.stringify(["observed", "current", "reference", "goal"]),
        JSON.stringify({
          validTime: "independent",
          recordedTime: "independent",
        }),
        8,
        now,
        now,
      ),
  ]);
}
export async function loadGraph(db, workspace) {
  const g = emptyGraph(workspace);
  const [head, nodes, edges, events, journals] = await Promise.all([
    db
      .prepare(
        "SELECT version,coverage_json FROM studio_heads WHERE workspace_id=?",
      )
      .bind(workspace)
      .first(),
    db
      .prepare(
        "SELECT metadata_json FROM entities WHERE workspace_id=? AND identity_key LIKE 'studio-node:%' ORDER BY created_at_ms,id",
      )
      .bind(workspace)
      .all(),
    db
      .prepare(
        "SELECT properties_json FROM relations WHERE workspace_id=? AND recorded_to_ms IS NULL",
      )
      .bind(workspace)
      .all(),
    db
      .prepare(
        "SELECT event_json,command_hash,command_id FROM studio_events WHERE workspace_id=? ORDER BY revision",
      )
      .bind(workspace)
      .all(),
    db
      .prepare(
        "SELECT event_id,object_key,status,sha256 FROM studio_outbox WHERE workspace_id=? ORDER BY event_id",
      )
      .bind(workspace)
      .all(),
  ]);
  g.revision = head?.version || 0;
  g.coverage = JSON.parse(head?.coverage_json || "[]");
  g.nodes = nodes.results.map(
    (row) => JSON.parse(row.metadata_json).studioNode,
  );
  g.edges = edges.results
    .map((row) => JSON.parse(row.properties_json).studioEdge)
    .filter(Boolean);
  g.events = events.results.map((row) => JSON.parse(row.event_json));
  g.commands = events.results.map((row) => ({
    id: row.command_id,
    hash: row.command_hash,
    result: JSON.parse(row.event_json).result,
  }));
  g.journal = journals.results.map((j) => ({
    id: j.event_id,
    path: j.object_key,
    status: j.status,
    sha256: j.sha256,
  }));
  return g;
}
export async function saveGraph(db, bucket, workspace, before, outcome) {
  if (outcome.duplicate) return outcome;
  const { graph: g, event } = outcome,
    now = Date.parse(event.recordedAt),
    revId = dbid(workspace, `revision:${g.revision}`);
  for (const item of g.nodes.filter((n) => event.changedIds.includes(n.id))) {
    if (item.body && item.bu?.key) {
      const objectKey = `bu-v8/${workspace}/${item.bu.key}`;
      const bodyHash = await digest(item.body);
      await bucket.put(objectKey, item.body, {
        customMetadata: { sha256: bodyHash },
      });
      item.bu = {
        ...item.bu,
        objectKey,
        sha256: bodyHash,
        state: "object-stored;drive-pending",
      };
    }
  }
  // Immutable archive writes may leave harmless orphans if CAS fails; no source bytes are overwritten.
  const eventBody = JSON.stringify(
    {
      schema: "bu.studio.event/8",
      workspace,
      event,
      changed: g.nodes.filter((n) => event.changedIds.includes(n.id)),
    },
    null,
    2,
  );
  const sha = await digest(eventBody),
    key = `bu-v8/${workspace}/events/${String(g.revision).padStart(8, "0")}-${event.commandId}-${sha}.json`;
  await bucket.put(key, eventBody, {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { sha256: sha },
  });
  const old = new Map(before.nodes.map((n) => [n.id, JSON.stringify(n)]));
  const changes = g.nodes.filter((n) => old.get(n.id) !== JSON.stringify(n));
  const oldEdges = new Set(before.edges.map((e) => e.id)),
    additions = g.edges.filter((e) => !oldEdges.has(e.id));
  const eventActorId = dbid(
    workspace,
    `actor:${(await digest(event.actor)).slice(0, 24)}`,
  );
  const statements = [
    db
      .prepare(
        "UPDATE studio_heads SET version=?,coverage_json=? WHERE workspace_id=? AND version=?",
      )
      .bind(g.revision, JSON.stringify(g.coverage), workspace, before.revision),
    // CHECK(ok=1) makes stale revision updates abort the entire D1 batch.
    db
      .prepare("INSERT INTO studio_cas_guard(id,ok) VALUES(?,changes())")
      .bind(dbid(workspace, event.commandId)),
    db
      .prepare(
        "INSERT OR IGNORE INTO entities(id,workspace_id,entity_type,identity_key,canonical_name,normalized_name,created_at_ms) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        eventActorId,
        workspace,
        "actor",
        `studio-actor:${event.actor}`,
        event.actor,
        event.actor,
        now,
      ),
    db
      .prepare(
        "INSERT INTO revisions(id,workspace_id,model_id,parent_revision_id,revision_kind,actor_entity_id,title,summary,hash,recorded_at_ms) VALUES(?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        revId,
        workspace,
        dbid(
          workspace,
          `model:${event.type === "apply" ? "current" : "observed"}`,
        ),
        dbid(workspace, `revision:${before.revision}`),
        ["capture", "import"].includes(event.type) ? "ingest" : "manual",
        eventActorId,
        event.type,
        JSON.stringify(event.result),
        sha,
        now,
      ),
    db
      .prepare("UPDATE workspaces SET current_revision_id=? WHERE id=?")
      .bind(revId, workspace),
  ];
  for (const n of changes) {
    const id = dbid(workspace, n.id),
      model = dbid(workspace, `model:${layer(n)}`);
    statements.push(
      db
        .prepare(
          "INSERT INTO entities(id,workspace_id,entity_type,identity_key,canonical_name,normalized_name,summary,metadata_json,created_at_ms) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET canonical_name=excluded.canonical_name,normalized_name=excluded.normalized_name,summary=excluded.summary,metadata_json=excluded.metadata_json",
        )
        .bind(
          id,
          workspace,
          baseKind(n),
          `studio-node:${n.id}`,
          n.title,
          n.title.toLowerCase(),
          String(n.body || n.status || "").slice(0, 180),
          JSON.stringify({
            studioNode: n,
            subtype: n.kind,
            source: n.source || null,
          }),
          Date.parse(n.recordedFrom) || now,
        ),
    );
    statements.push(
      db
        .prepare(
          "UPDATE states SET recorded_to_ms=?,superseded_revision_id=? WHERE workspace_id=? AND entity_id=? AND recorded_to_ms IS NULL",
        )
        .bind(now, revId, workspace, id),
    );
    statements.push(
      db
        .prepare(
          "INSERT INTO states(id,workspace_id,state_series_id,entity_id,model_id,state_kind,lifecycle_key,health,confidence_bp,headline,properties_json,created_revision_id,valid_from_ms,recorded_from_ms) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          `${id}/state/${g.revision}`,
          workspace,
          id,
          id,
          model,
          n.stateKind || "observed",
          n.status || "unknown",
          "neutral",
          0,
          n.status || "unknown",
          JSON.stringify({
            status: n.status,
            readiness: n.readiness || null,
            confidenceKnown: false,
            studioNode: n,
          }),
          revId,
          Date.parse(n.validFrom) || now,
          now,
        ),
    );
    if (n.kind === "raw" && !old.has(n.id)) {
      const artifactId = dbid(workspace, `raw-artifact:${n.id}`);
      statements.push(
        db
          .prepare(
            "INSERT INTO entities(id,workspace_id,entity_type,identity_key,canonical_name,normalized_name,created_at_ms) VALUES(?,?,?,?,?,?,?)",
          )
          .bind(
            artifactId,
            workspace,
            "artifact",
            `raw-artifact:${n.id}`,
            n.title,
            n.title.toLowerCase(),
            now,
          ),
        db
          .prepare(
            "INSERT INTO artifacts(id,workspace_id,artifact_kind,storage_kind,object_key,media_type,byte_size,status,captured_at_ms,recorded_at_ms,immutable,metadata_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            artifactId,
            workspace,
            "raw",
            "r2",
            n.bu?.objectKey || null,
            "text/plain",
            new TextEncoder().encode(n.body || "").length,
            "ready",
            now,
            now,
            1,
            JSON.stringify({
              source: n.source,
              sha256: n.source?.sha256,
              studioNodeId: n.id,
            }),
          ),
        db
          .prepare(
            "INSERT INTO observations(id,workspace_id,observer_entity_id,capture_method,direct_text,state_kind,status,confidence_bp,observed_from_ms,recorded_at_ms) VALUES(?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            id,
            workspace,
            eventActorId,
            "api",
            n.body || "",
            "observed",
            "ready_for_review",
            0,
            Date.parse(n.validFrom) || now,
            now,
          ),
        db
          .prepare(
            "INSERT INTO observation_artifacts(observation_id,artifact_id,role) VALUES(?,?,?)",
          )
          .bind(id, artifactId, "primary"),
      );
    }
    if (n.kind === "decision") {
      if (!old.has(n.id))
        statements.push(
          db
            .prepare(
              "INSERT INTO patch_proposals(id,workspace_id,target_model_id,base_revision_id,title,rationale,status,required_gate,risk_level,created_by_entity_id,idempotency_key,created_at_ms,decided_at_ms,decision_note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            )
            .bind(
              id,
              workspace,
              dbid(workspace, "model:current"),
              dbid(workspace, `revision:${before.revision}`),
              n.title,
              n.rationale,
              n.status,
              "human",
              "high",
              eventActorId,
              event.commandId,
              now,
              now,
              n.rationale,
            ),
          db
            .prepare(
              "INSERT INTO patch_operations(proposal_id,ordinal,operation,target_kind,target_id,after_json,gate_level,reversible) VALUES(?,?,?,?,?,?,?,?)",
            )
            .bind(
              id,
              1,
              "insert",
              "entity",
              n.appliedId || null,
              JSON.stringify({
                targetKind: n.targetKind,
                parentId: n.parentId,
                sourceRaw: n.sourceRaw,
                acceptance: n.acceptance,
                evidenceIds: n.evidenceIds,
              }),
              "human",
              1,
            ),
        );
      else
        statements.push(
          db
            .prepare(
              "UPDATE patch_proposals SET status=?,applied_at_ms=? WHERE id=? AND workspace_id=?",
            )
            .bind(n.status, n.status === "applied" ? now : null, id, workspace),
        );
    }
    statements.push(
      db
        .prepare(
          "INSERT INTO revision_changes(revision_id,ordinal,object_kind,object_id,change_kind,primary_entity_id,before_json,after_json) VALUES(?,?,?,?,?,?,?,?)",
        )
        .bind(
          revId,
          changes.indexOf(n) + 1,
          "entity",
          id,
          old.has(n.id) ? "update" : "insert",
          id,
          old.get(n.id) || null,
          JSON.stringify(n),
        ),
    );
    if (!old.has(n.id))
      statements.push(
        db
          .prepare(
            "INSERT INTO model_entities(id,workspace_id,model_id,entity_id,presence,confidence_bp,created_revision_id,valid_from_ms,recorded_from_ms) VALUES(?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            `${id}/membership`,
            workspace,
            model,
            id,
            "present",
            0,
            revId,
            Date.parse(n.validFrom) || now,
            now,
          ),
      );
  }
  for (const e of additions) {
    const id = dbid(workspace, `edge:${await digest(e.id)}`),
      target = g.nodes.find((n) => n.id === e.to);
    statements.push(
      db
        .prepare(
          "INSERT INTO relations(id,workspace_id,relation_series_id,model_id,from_entity_id,predicate,to_entity_id,assertion_kind,confidence_bp,properties_json,created_revision_id,valid_from_ms,recorded_from_ms) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          workspace,
          id,
          dbid(workspace, `model:${layer(target || {})}`),
          dbid(workspace, e.from),
          e.predicate,
          dbid(workspace, e.to),
          e.stateKind || "observed",
          0,
          JSON.stringify({ studioEdge: e, confidenceKnown: false }),
          revId,
          now,
          now,
        ),
    );
  }
  statements.push(
    db
      .prepare(
        "INSERT INTO studio_events(workspace_id,revision,command_id,command_hash,event_json) VALUES(?,?,?,?,?)",
      )
      .bind(
        workspace,
        g.revision,
        event.commandId,
        event.payloadHash,
        JSON.stringify(event),
      ),
    db
      .prepare(
        "INSERT INTO studio_outbox(workspace_id,event_id,object_key,sha256,status) VALUES(?,?,?,?,?)",
      )
      .bind(workspace, event.id, key, sha, "object-stored;drive-pending"),
    db
      .prepare("DELETE FROM studio_cas_guard WHERE id=?")
      .bind(dbid(workspace, event.commandId)),
  );
  try {
    await db.batch(statements);
  } catch (error) {
    if (/CHECK|UNIQUE|studio_cas_guard/i.test(String(error)))
      throw new DomainError(
        "REVISION_CONFLICT",
        "동시 변경이 감지되었습니다. 새로 불러오세요.",
        409,
      );
    throw error;
  }
  g.journal = g.journal.map((j) =>
    j.id === event.id
      ? { ...j, path: key, status: "object-stored;drive-pending", sha256: sha }
      : j,
  );
  return {
    ...outcome,
    archive: { objectKey: key, sha256: sha, drive: "pending" },
  };
}
