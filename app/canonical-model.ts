export type EntityKind =
  | "enterprise"
  | "product"
  | "project"
  | "goal"
  | "team"
  | "role"
  | "actor"
  | "agent"
  | "trigger"
  | "observation"
  | "derivation"
  | "gate"
  | "decision"
  | "outcome";

export type ModelLayer = "observed" | "reference" | "current" | "goal";
export type StateKind = "observed" | "inferred" | "planned" | "forecast" | "hypothetical";
export type Health = "healthy" | "attention" | "risk" | "neutral";

export type CanonicalState = {
  id: string;
  model: ModelLayer;
  kind: StateKind;
  lifecycle: string;
  health: Health;
  progress?: number;
  confidence: number;
  validFrom: number;
  validTo?: number;
  recordedFrom: number;
  recordedTo?: number;
};

export type CanonicalEvidence = { id: string; title: string; source: string; confidence: number; observedAt: string };
export type CanonicalHistory = { time: string; title: string; detail: string; actor: string; revision: string; validAt: string; recordedAt: string };
export type ModelMembership = { current: "present" | "absent" | "unknown"; reference: "present" | "absent" | "unknown"; goal: "present" | "absent" | "unknown" };

export type CanonicalEntity = {
  id: string;
  name: string;
  subtitle: string;
  kind: EntityKind;
  memberships: ModelMembership;
  states: CanonicalState[];
  evidence: CanonicalEvidence[];
  history: CanonicalHistory[];
  repGeneration?: "current" | "direct" | "indirect" | "alternative" | "complement" | "retired";
};

export type CanonicalRelation = {
  id: string;
  from: string;
  predicate: string;
  to: string;
  model: ModelLayer;
  kind: StateKind;
  confidence: number;
  validFrom: number;
  validTo?: number;
  recordedFrom: number;
  recordedTo?: number;
};

const at = (value: string) => Date.parse(value);
const AUG_18 = at("2026-08-18T00:00:00+09:00");
const AUG_19 = at("2026-08-19T00:00:00+09:00");
const AUG_20 = at("2026-08-20T00:00:00+09:00");
const AUG_21 = at("2026-08-21T00:00:00+09:00");
const AUG_22 = at("2026-08-22T00:00:00+09:00");
const AUG_23 = at("2026-08-23T00:00:00+09:00");

const commonEvidence: CanonicalEvidence[] = [
  { id: "EV-032", title: "Task 32개 중 22개 완료", source: "Project work log", confidence: .96, observedAt: "21 Aug · 14:28" },
  { id: "EV-029", title: "설계 워크숍 전사", source: "REP Recorder", confidence: .91, observedAt: "21 Aug · 11:02" },
];
const commonHistory: CanonicalHistory[] = [
  { time: "14:32", title: "62% → 68%", detail: "완료된 작업 3개가 기준 상태에 반영되었습니다.", actor: "REP Agent", revision: "r214", validAt: "21 Aug · 14:30", recordedAt: "21 Aug · 14:32" },
  { time: "13:54", title: "의존 관계 추가", detail: "Recorder Evidence Bridge가 새 의존성 후보로 연결되었습니다.", actor: "Knowledge Engineer", revision: "r213", validAt: "21 Aug · 13:40", recordedAt: "21 Aug · 13:54" },
];

const state = (id: string, model: ModelLayer, kind: StateKind, lifecycle: string, health: Health, progress: number | undefined, confidence: number, validFrom = AUG_18, recordedFrom = AUG_18, validTo?: number, recordedTo?: number): CanonicalState => ({ id, model, kind, lifecycle, health, progress, confidence, validFrom, recordedFrom, validTo, recordedTo });
const entity = (id: string, name: string, subtitle: string, kind: EntityKind, memberships: ModelMembership, states: CanonicalState[], options: Partial<Pick<CanonicalEntity, "evidence" | "history" | "repGeneration">> = {}): CanonicalEntity => ({ id, name, subtitle, kind, memberships, states, evidence: options.evidence ?? commonEvidence, history: options.history ?? commonHistory, repGeneration: options.repGeneration });

export const canonicalEntities: CanonicalEntity[] = [
  entity("enterprise-nexus", "Plus Minus G.", "±G. · PMG · 플러스 마이너스 지 · 플마지", "enterprise", { current: "present", reference: "present", goal: "present" }, [state("st-nexus", "current", "observed", "Operating", "healthy", undefined, .94)]),
  entity("product-ocp", "OCP Reality Map", "Operational Context Protocol", "product", { current: "present", reference: "present", goal: "present" }, [state("st-ocp-past", "current", "observed", "Discovery", "healthy", 44, .9, AUG_18, AUG_18, AUG_20, AUG_20), state("st-ocp", "current", "observed", "Active build", "healthy", 72, .92, AUG_20, AUG_20), state("st-ocp-ref", "reference", "inferred", "Active build", "healthy", 72, .88, AUG_20, AUG_20), state("st-ocp-goal", "goal", "planned", "Validated v0", "neutral", 100, .78, AUG_23, AUG_21)]),
  entity("product-rep", "REP", "Reality Evidence Protocol", "product", { current: "present", reference: "present", goal: "present" }, [state("st-rep", "current", "observed", "Evidence review", "attention", 81, .88), state("st-rep-ref", "reference", "inferred", "Stable protocol", "healthy", 84, .91)], { repGeneration: "current" }),
  entity("project-ocp-v0", "OCP Reality Map v0", "View engine & operating map", "project", { current: "present", reference: "absent", goal: "present" }, [state("st-project-past", "current", "observed", "In progress", "attention", 62, .84, AUG_18, AUG_18, AUG_21, AUG_21), state("st-project", "current", "observed", "In progress", "attention", 68, .88, AUG_21, AUG_21), state("st-project-plan", "goal", "planned", "Internal release", "neutral", 100, .76, AUG_23, AUG_21)]),
  entity("project-recorder", "Recorder Evidence Bridge", "Capturing observations now", "project", { current: "present", reference: "present", goal: "present" }, [state("st-recorder", "current", "observed", "Observing", "healthy", 54, .89, AUG_19, AUG_19), state("st-recorder-ref", "reference", "inferred", "Connected", "attention", 48, .83, AUG_19, AUG_20)], { repGeneration: "direct" }),
  entity("goal-operating-map", "Operating map v0", "Due in 12 days", "goal", { current: "present", reference: "present", goal: "present" }, [state("st-goal", "current", "inferred", "At risk", "risk", 68, .78, AUG_20, AUG_21), state("st-goal-ref", "reference", "inferred", "On track", "healthy", 72, .81, AUG_20, AUG_20), state("st-goal-future", "goal", "forecast", "Likely complete", "neutral", 92, .7, AUG_23, AUG_21)]),
  entity("team-ocp", "OCP 제품팀", "Owns operating map", "team", { current: "present", reference: "present", goal: "present" }, [state("st-team-ocp", "current", "observed", "Focused", "attention", 74, .9)]),
  entity("team-evidence", "Evidence Systems", "Evidence integrity", "team", { current: "present", reference: "present", goal: "present" }, [state("st-team-ev", "current", "observed", "Observing", "healthy", 82, .93)]),
  entity("role-product-lead", "Product Lead", "Prioritization & release", "role", { current: "present", reference: "present", goal: "present" }, [state("st-role-lead", "current", "observed", "Available", "healthy", undefined, .9)]),
  entity("actor-knowledge", "Knowledge Engineer", "Reference model steward", "actor", { current: "present", reference: "present", goal: "present" }, [state("st-actor-ke", "current", "observed", "Reviewing", "healthy", undefined, .92)]),
  entity("agent-rep", "REP Agent", "3 updates awaiting review", "agent", { current: "present", reference: "absent", goal: "present" }, [state("st-agent-rep", "current", "inferred", "Working", "attention", undefined, .81)]),
  entity("trigger-workshop", "Workshop ends", "Capture process starts", "trigger", { current: "present", reference: "present", goal: "unknown" }, [state("st-trigger", "observed", "observed", "Complete", "healthy", 100, .98, AUG_19, AUG_19)]),
  entity("observation-audio", "Original audio", "48m 12s · immutable", "observation", { current: "present", reference: "present", goal: "unknown" }, [state("st-audio", "observed", "observed", "Preserved", "healthy", 100, .99, AUG_19, AUG_19)]),
  entity("derivation-transcript", "Transcript v1", "32 claims extracted", "derivation", { current: "present", reference: "absent", goal: "unknown" }, [state("st-transcript", "current", "inferred", "Ready for review", "attention", 86, .87, AUG_19, AUG_19)]),
  entity("gate-evidence", "Evidence review", "Human validation required", "gate", { current: "present", reference: "present", goal: "present" }, [state("st-gate", "current", "inferred", "Blocked", "risk", 63, .79, AUG_20, AUG_20)]),
  entity("decision-approve", "Reference Model Patch #014", "Product Lead decision right", "decision", { current: "present", reference: "present", goal: "present" }, [state("st-decision", "current", "inferred", "Waiting", "attention", undefined, .86, AUG_20, AUG_20)]),
  entity("outcome-publish", "Canonical Graph revision r215", "Reference model candidate", "outcome", { current: "absent", reference: "present", goal: "present" }, [state("st-outcome", "goal", "planned", "Planned", "neutral", undefined, .72, AUG_22, AUG_21)]),
  entity("context-market", "Market signal context", "Competitor and user evidence", "observation", { current: "present", reference: "unknown", goal: "unknown" }, [state("st-market-late", "observed", "observed", "Captured", "healthy", undefined, .85, at("2026-08-01T09:00:00+09:00"), AUG_21)], { repGeneration: "alternative" }),
];

const relation = (id: string, from: string, predicate: string, to: string, model: ModelLayer = "current", kind: StateKind = "observed", confidence = .9): CanonicalRelation => ({ id, from, predicate, to, model, kind, confidence, validFrom: AUG_18, recordedFrom: AUG_18 });
export const canonicalRelations: CanonicalRelation[] = [
  relation("rel-01", "enterprise-nexus", "OPERATES", "product-ocp"), relation("rel-02", "enterprise-nexus", "OPERATES", "product-rep"), relation("rel-03", "product-ocp", "REQUIRES", "product-rep", "reference", "inferred", .84), relation("rel-04", "project-ocp-v0", "MODIFIES", "product-ocp"), relation("rel-05", "project-ocp-v0", "DEPENDS_ON", "project-recorder", "current", "inferred", .82), relation("rel-06", "project-ocp-v0", "SUPPORTS", "goal-operating-map"),
  relation("rel-07", "team-ocp", "ACCOUNTABLE_FOR", "project-ocp-v0"), relation("rel-08", "team-evidence", "ACCOUNTABLE_FOR", "project-recorder"), relation("rel-09", "team-ocp", "COLLABORATES_WITH", "team-evidence"), relation("rel-10", "role-product-lead", "HAS_AUTHORITY_OVER", "decision-approve"), relation("rel-11", "actor-knowledge", "RESPONSIBLE_FOR", "gate-evidence"), relation("rel-12", "agent-rep", "PROPOSES", "decision-approve", "current", "inferred", .81),
  relation("rel-13", "trigger-workshop", "TRIGGERS", "observation-audio"), relation("rel-14", "observation-audio", "DERIVES", "derivation-transcript"), relation("rel-15", "derivation-transcript", "ENTERS", "gate-evidence", "current", "inferred", .87), relation("rel-16", "gate-evidence", "GATES", "decision-approve"), relation("rel-17", "decision-approve", "PUBLISHES", "outcome-publish", "goal", "planned", .72), relation("rel-18", "team-ocp", "RESPONSIBLE_FOR", "product-ocp"), relation("rel-19", "team-evidence", "RESPONSIBLE_FOR", "product-rep"),
];

export const canonicalById = new Map(canonicalEntities.map((item) => [item.id, item]));
export function stateAsOf(entity: CanonicalEntity, validAt: number, recordedAt: number, preferredModel: ModelLayer = "current") {
  const visible = entity.states.filter((item) => item.validFrom <= validAt && (item.validTo === undefined || validAt < item.validTo) && item.recordedFrom <= recordedAt && (item.recordedTo === undefined || recordedAt < item.recordedTo));
  return visible.find((item) => item.model === preferredModel)
    ?? visible.find((item) => item.model === "observed")
    ?? visible.find((item) => item.model === "reference")
    ?? visible.find((item) => item.model === "goal")
    ?? state(`unknown-${entity.id}`, preferredModel, "inferred", "Not yet recorded", "neutral", undefined, 0, validAt, recordedAt);
}
export function relationAsOf(relation: CanonicalRelation, validAt: number, recordedAt: number) { return relation.validFrom <= validAt && (relation.validTo === undefined || validAt < relation.validTo) && relation.recordedFrom <= recordedAt && (relation.recordedTo === undefined || recordedAt < relation.recordedTo); }
export const canonicalTimes = { AUG_18, AUG_19, AUG_20, AUG_21, AUG_22, AUG_23 };
