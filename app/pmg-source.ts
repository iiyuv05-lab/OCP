import manifest from "../.ocp/sources/pmg-ocp-harness-v1.json";

export const pmgVerifiedSource = manifest;

export type PmgVerifiedSource = typeof pmgVerifiedSource;

export function isPmgVerifiedSourceUrl(value: string) {
  try {
    const candidate = new URL(value);
    const expected = new URL(pmgVerifiedSource.source.url);
    return candidate.origin === expected.origin && candidate.pathname.replace(/\/$/, "") === expected.pathname;
  } catch {
    return false;
  }
}

export const pmgSourceIds = {
  artifact: "artifact-pmg-ocp-harness-v1",
  observation: "observation-pmg-ocp-harness-v1",
  evidence: "evidence-pmg-ocp-harness-v1",
  ingestRevision: "revision-ingest-pmg-ocp-harness-v1",
  proposal: "patch-pmg-ocp-source-v1",
  relation: "relation-pmg-ocp-source-v1",
  relationSeries: "relation-series-pmg-ocp-source",
  state: "state-pmg-ocp-source-v1",
  stateSeries: "state-series-pmg-ocp-source",
} as const;
