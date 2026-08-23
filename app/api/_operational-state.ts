import { WORKSPACE_ID } from "./_lib";

type CountRow = { count: number };

export async function readOperationalState(db: D1Database) {
  const now = Date.now();
  const [observationRows, proposalRows, sourceRows, feedRows, headRows] = await db.batch([
    db.prepare("SELECT COUNT(*) AS count FROM observations WHERE workspace_id = ?").bind(WORKSPACE_ID),
    db.prepare("SELECT status, COUNT(*) AS count FROM patch_proposals WHERE workspace_id = ? AND id <> 'patch-reference-014' GROUP BY status").bind(WORKSPACE_ID),
    db.prepare(`
      SELECT
        r.id AS relation_id,
        r.predicate,
        r.assertion_kind,
        r.recorded_from_ms,
        r.properties_json,
        a.id AS artifact_id,
        a.source_url,
        a.media_type,
        a.status AS artifact_status,
        e.canonical_name,
        e.summary,
        e.metadata_json
      FROM relations r
      JOIN artifacts a ON a.id = r.to_entity_id AND a.workspace_id = r.workspace_id
      JOIN entities e ON e.id = a.id AND e.workspace_id = a.workspace_id
      WHERE r.workspace_id = ?
        AND r.model_id = 'model-current'
        AND r.predicate = 'TRACKS_IMPLEMENTATION_SOURCE'
        AND r.valid_from_ms <= ?
        AND (r.valid_to_ms IS NULL OR r.valid_to_ms > ?)
        AND r.recorded_from_ms <= ?
        AND (r.recorded_to_ms IS NULL OR r.recorded_to_ms > ?)
      ORDER BY r.recorded_from_ms DESC
    `).bind(WORKSPACE_ID, now, now, now, now),
    db.prepare(`
      SELECT f.*, COALESCE(actor.canonical_name, 'OCP') AS actor_name
      FROM feed_entries f
      LEFT JOIN entities actor ON actor.id = f.actor_entity_id
      WHERE f.workspace_id = ?
        AND f.recorded_at_ms >= 1787345574000
      ORDER BY f.recorded_at_ms DESC, f.id DESC
      LIMIT 30
    `).bind(WORKSPACE_ID),
    db.prepare("SELECT current_revision_id FROM workspaces WHERE id = ? LIMIT 1").bind(WORKSPACE_ID),
  ]);

  const proposalCounts = Object.fromEntries(
    (proposalRows.results as Array<{ status: string; count: number }>).map((row) => [row.status, Number(row.count)]),
  );
  const count = (status: string) => Number(proposalCounts[status] ?? 0);
  const observations = Number((observationRows.results[0] as CountRow | undefined)?.count ?? 0);
  const sources = sourceRows.results.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      relationId: String(item.relation_id),
      predicate: String(item.predicate),
      assertionKind: String(item.assertion_kind),
      recordedFrom: Number(item.recorded_from_ms),
      properties: JSON.parse(String(item.properties_json || "{}")),
      artifact: {
        id: String(item.artifact_id),
        name: String(item.canonical_name),
        summary: String(item.summary),
        sourceUrl: String(item.source_url),
        mediaType: String(item.media_type),
        status: String(item.artifact_status),
        metadata: JSON.parse(String(item.metadata_json || "{}")),
      },
    };
  });

  return {
    schema: "ocp.operational-read-model/v1",
    source: "d1-canonical-graph",
    asOf: { validAt: now, recordedAt: now },
    headRevisionId: (headRows.results[0] as { current_revision_id?: string } | undefined)?.current_revision_id ?? null,
    counts: {
      observations,
      proposalsPendingReview: count("pending_review"),
      proposalsApprovedNotApplied: count("approved"),
      proposalsApplied: count("applied"),
      appliedImplementationSources: sources.length,
    },
    implementationSources: sources,
    feedEntries: feedRows.results,
  };
}
