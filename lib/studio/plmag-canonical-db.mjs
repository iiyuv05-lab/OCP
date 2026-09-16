/** Preserve Plmag's existing tables while using the identical canonical contract.
 * SQL is application-owned; values always remain prepared parameters.
 * Quoted string literals are deliberately never rewritten.
 */
export const canonicalTables = [
  'workspaces', 'workspace_members', 'entities', 'models', 'model_entities',
  'states', 'relations', 'contexts', 'events', 'artifacts', 'artifact_lineage',
  'observations', 'observation_artifacts', 'evidence', 'evidence_observations',
  'revisions', 'revision_changes', 'view_specs', 'patch_proposals',
  'patch_operations', 'proposal_checks', 'proposal_reviews', 'feed_entries',
];
const tables = new Map(canonicalTables.map(name => [name, 'ocp_' + name]));
export function namespaceSQL(sql, identifiers = tables) {
  return sql.replace(/'(?:''|[^'])*'|`[^`]*`|"(?:""|[^"])*"|\b[A-Za-z_][A-Za-z_0-9]*\b/g, token => {
    if (token.startsWith("'")) return token;
    const quoted = token.startsWith('`') || token.startsWith('"');
    const name = quoted ? token.slice(1, -1) : token;
    const mapped = identifiers.get(name);
    return mapped ? (quoted ? token[0] + mapped + token[0] : mapped) : token;
  });
}
export function namespacedMigration(sql) {
  const identifiers = new Map(tables);
  for (const match of sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)/gi)) {
    identifiers.set(match[1], 'ocp_' + match[1]);
  }
  return namespaceSQL(sql, identifiers);
}
export function canonicalDatabase(db) {
  return {
    prepare(sql) { return db.prepare(namespaceSQL(sql)); },
    batch(statements) { return db.batch(statements); },
    exec(sql) { return db.exec(namespaceSQL(sql)); },
  };
}
