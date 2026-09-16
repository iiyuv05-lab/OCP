-- Additive only. Run AFTER the existing OCP canonical migrations. No DROP or seed.
CREATE TABLE IF NOT EXISTS studio_heads (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),
  version INTEGER NOT NULL DEFAULT 0,
  coverage_json TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS studio_events (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  revision INTEGER NOT NULL,
  command_id TEXT NOT NULL,
  command_hash TEXT NOT NULL,
  event_json TEXT NOT NULL,
  PRIMARY KEY(workspace_id,revision),
  UNIQUE(workspace_id,command_id)
);
CREATE TABLE IF NOT EXISTS studio_cas_guard (id TEXT PRIMARY KEY, ok INTEGER NOT NULL CHECK(ok=1));
CREATE TABLE IF NOT EXISTS studio_outbox (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  event_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  drive_file_id TEXT,
  PRIMARY KEY(workspace_id,event_id)
);
