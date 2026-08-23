/**
 * Canonical Graph v0.1 logical contract.
 *
 * The executable D1 schema, constraints, indexes and seed are versioned in
 * drizzle/0000_canonical_v01.sql. Route code intentionally uses D1 prepared
 * statements so the bitemporal predicates and approval gates stay explicit.
 */
export const canonicalTableNames = [
  "workspaces", "workspace_members", "entities", "models", "model_entities",
  "states", "relations", "contexts", "events", "artifacts",
  "artifact_lineage", "observations", "observation_artifacts", "evidence",
  "evidence_observations", "revisions", "revision_changes", "view_specs",
  "patch_proposals", "patch_operations", "proposal_checks",
  "proposal_reviews", "feed_entries",
] as const;

export type ModelLayer = "observed" | "reference" | "current" | "goal";
export type StateKind = "observed" | "inferred" | "planned" | "forecast" | "hypothetical";
export type ModelMode = "single" | "overlay" | "split" | "diff";
export type RequiredGate = "auto" | "verified_auto" | "human";
export type PatchStatus = "draft" | "validating" | "pending_review" | "approved" | "rejected" | "applying" | "applied" | "failed" | "withdrawn";

export type BitemporalInterval = {
  validFromMs: number;
  validToMs: number | null;
  recordedFromMs: number;
  recordedToMs: number | null;
};

export type ObservationRow = {
  id: string;
  workspace_id: string;
  observer_entity_id: string | null;
  context_id: string | null;
  capture_method: "manual" | "upload" | "url" | "recorder" | "api";
  direct_text: string;
  state_kind: StateKind;
  status: "captured" | "processing" | "ready_for_review" | "retracted";
  confidence_bp: number;
  observed_from_ms: number;
  observed_to_ms: number | null;
  recorded_at_ms: number;
};

export type PatchProposalRow = {
  id: string;
  workspace_id: string;
  target_model_id: string;
  base_revision_id: string;
  title: string;
  rationale: string;
  status: PatchStatus;
  required_gate: RequiredGate;
  risk_level: "low" | "medium" | "high" | "constitutional";
  created_at_ms: number;
};

export const asOfSql = `
  valid_from_ms <= ?
  AND (valid_to_ms IS NULL OR valid_to_ms > ?)
  AND recorded_from_ms <= ?
  AND (recorded_to_ms IS NULL OR recorded_to_ms > ?)
`;
