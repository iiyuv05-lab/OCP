import { canonicalById, canonicalEntities, canonicalRelations, relationAsOf, stateAsOf, type CanonicalEntity, type CanonicalState, type EntityKind, type Health, type ModelLayer, type StateKind } from "./canonical-model";
import { viewSpecs, type ProjectionKey, type RepLens } from "./view-specs";

export type Difference = "agreement" | "actor" | "reference" | "conflict";
export type RelationInfo = { type: string; target: string; direction?: "in" | "out" };
export type HistoryInfo = CanonicalEntity["history"][number];
export type EvidenceInfo = CanonicalEntity["evidence"][number];
export type ProjectedLayerKey = "goal" | "current" | "reference" | "evidence";
export type ProjectedState = Pick<CanonicalState, "kind" | "lifecycle" | "health" | "progress" | "confidence"> & { recordedFrom: string };
export type ProjectedLayer = { presence: "present" | "absent" | "unknown"; state?: ProjectedState };
export type GraphNode = {
  id: string; canonicalId: string; label: string; kicker: string; subtitle: string; kind: EntityKind;
  x: number; y: number; health: Health; difference: Difference; progress?: number; owner: string;
  confidence: number; state: string; stateKind: StateKind; updated: string; validAt: string; recordedAt: string;
  lastDelta: string; layers: Record<ProjectedLayerKey, ProjectedLayer>;
  relations: RelationInfo[]; history: HistoryInfo[]; evidence: EvidenceInfo[];
};
export type GraphEdge = { id: string; fromId: string; toId: string; left: number; top: number; width: number; angle: number; relation: string; dashed?: boolean };
export type ProjectionGraph = { label: string; labelKo: string; title: string; breadcrumb: string; focusId: string; levels: string[]; nodes: GraphNode[]; edges: GraphEdge[] };

const kickerLabels: Record<EntityKind, string> = {
  enterprise: "ENTERPRISE", product: "PRODUCT", project: "PROJECT", goal: "GOAL", team: "TEAM", role: "ROLE", actor: "ACTOR · HUMAN", agent: "ACTOR · AI AGENT", trigger: "TRIGGER", observation: "OBSERVATION", derivation: "DERIVATION", gate: "GATE", decision: "DECISION", outcome: "OUTCOME",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
const relationsByEntity = new Map<string, typeof canonicalRelations>();
const ownerRelationByTarget = new Map<string, (typeof canonicalRelations)[number]>();
for (const relation of canonicalRelations) {
  relationsByEntity.set(relation.from, [...(relationsByEntity.get(relation.from) ?? []), relation]);
  relationsByEntity.set(relation.to, [...(relationsByEntity.get(relation.to) ?? []), relation]);
  if (["RESPONSIBLE_FOR", "ACCOUNTABLE_FOR"].includes(relation.predicate) && !ownerRelationByTarget.has(relation.to)) ownerRelationByTarget.set(relation.to, relation);
}

function differenceFor(entity: CanonicalEntity, validAt: number, recordedAt: number): Difference {
  const { current, reference } = entity.memberships;
  if (current === "present" && reference !== "present") return "actor";
  if (reference === "present" && current !== "present") return "reference";
  if (current !== "present" && reference !== "present") return "reference";
  const currentState = stateAsOf(entity, validAt, recordedAt, "current");
  const referenceState = stateAsOf(entity, validAt, recordedAt, "reference");
  if (currentState.model === "current" && referenceState.model === "reference" && (currentState.lifecycle !== referenceState.lifecycle || currentState.health !== referenceState.health)) return "conflict";
  return "agreement";
}

function ownerFor(entity: CanonicalEntity) {
  const owner = ownerRelationByTarget.get(entity.id);
  return owner ? canonicalById.get(owner.from)?.name ?? "OCP" : entity.kind === "enterprise" ? "Jiyoung" : "OCP";
}

function lensAllows(entity: CanonicalEntity, lens: RepLens) {
  if (lens === "all") return true;
  if (!entity.repGeneration) return true;
  if (lens === "chronology") return entity.repGeneration !== "alternative";
  if (lens === "generation") return ["current", "direct", "indirect"].includes(entity.repGeneration);
  return ["current", "direct", "complement"].includes(entity.repGeneration);
}

function fmt(value: number) {
  return dateFormatter.format(value).replace(",", " ·");
}

function exactStateAsOf(entity: CanonicalEntity, model: ModelLayer, validAt: number, recordedAt: number) {
  return entity.states.find((item) => item.model === model && item.validFrom <= validAt && (item.validTo === undefined || validAt < item.validTo) && item.recordedFrom <= recordedAt && (item.recordedTo === undefined || recordedAt < item.recordedTo));
}

function projectedState(item: CanonicalState | undefined): ProjectedState | undefined {
  if (!item) return undefined;
  return { kind: item.kind, lifecycle: item.lifecycle, health: item.health, progress: item.progress, confidence: item.confidence, recordedFrom: fmt(item.recordedFrom) };
}

export function projectCanonicalGraph(projection: ProjectionKey, validAt: number, recordedAt: number, repLens: RepLens = "all", preferredModel: ModelLayer = "current"): ProjectionGraph {
  const spec = viewSpecs[projection];
  const entities = canonicalEntities.filter((item) => spec.entityKinds.includes(item.kind) && lensAllows(item, repLens));
  const kindRank = new Map(spec.entityKinds.map((kind, index) => [kind, index]));
  const grouped = new Map<number, CanonicalEntity[]>();
  for (const item of entities) {
    const rank = kindRank.get(item.kind) ?? spec.entityKinds.length;
    grouped.set(rank, [...(grouped.get(rank) ?? []), item]);
  }

  const nodeById = new Map<string, GraphNode>();
  for (const [rank, members] of grouped) {
    const sorted = [...members].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((item, index) => {
      const current = stateAsOf(item, validAt, recordedAt, preferredModel);
      const observedState = exactStateAsOf(item, "observed", validAt, recordedAt);
      const layers: GraphNode["layers"] = {
        goal: { presence: item.memberships.goal, state: projectedState(exactStateAsOf(item, "goal", validAt, recordedAt)) },
        current: { presence: item.memberships.current, state: projectedState(exactStateAsOf(item, "current", validAt, recordedAt)) },
        reference: { presence: item.memberships.reference, state: projectedState(exactStateAsOf(item, "reference", validAt, recordedAt)) },
        evidence: { presence: observedState || item.evidence.length > 0 ? "present" : "unknown", state: projectedState(observedState) },
      };
      const x = 10 + ((index + 1) / (sorted.length + 1)) * 80;
      const y = 9 + (rank / Math.max(1, spec.entityKinds.length - 1)) * 70;
      const relations = (relationsByEntity.get(item.id) ?? []).filter((relation) => relationAsOf(relation, validAt, recordedAt)).map((relation) => ({
        type: relation.predicate.replaceAll("_", " "), target: canonicalById.get(relation.from === item.id ? relation.to : relation.from)?.name ?? "Unknown", direction: relation.to === item.id ? "in" as const : "out" as const,
      }));
      nodeById.set(item.id, {
        id: item.id, canonicalId: item.id, label: item.name, kicker: kickerLabels[item.kind], subtitle: item.subtitle, kind: item.kind,
        x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), health: current.health, difference: differenceFor(item, validAt, recordedAt), progress: current.progress,
        owner: ownerFor(item), confidence: current.confidence, state: current.lifecycle, stateKind: current.kind, updated: `recorded ${fmt(current.recordedFrom)}`,
        validAt: fmt(validAt), recordedAt: fmt(recordedAt), lastDelta: item.history[0]?.title ?? "No recorded change", layers, relations, history: item.history, evidence: item.evidence,
      });
    });
  }

  const nodes = [...nodeById.values()];
  const edges = canonicalRelations.filter((relation) => relationAsOf(relation, validAt, recordedAt) && nodeById.has(relation.from) && nodeById.has(relation.to) && (!spec.relationPredicates || spec.relationPredicates.includes(relation.predicate))).map((relation) => {
    const from = nodeById.get(relation.from)!;
    const to = nodeById.get(relation.to)!;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return { id: relation.id, fromId: relation.from, toId: relation.to, left: from.x, top: from.y, width: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) * 180 / Math.PI, relation: relation.predicate.replaceAll("_", " "), dashed: relation.kind !== "observed" };
  });
  return { label: spec.label, labelKo: spec.labelKo, title: spec.title, breadcrumb: spec.breadcrumb, focusId: spec.focusId, levels: spec.levels, nodes, edges };
}
