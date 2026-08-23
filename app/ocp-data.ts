import { canonicalTimes } from "./canonical-model";
import { projectCanonicalGraph, type Difference, type EvidenceInfo, type GraphEdge, type GraphNode, type HistoryInfo, type ProjectionGraph, type RelationInfo } from "./projector";
import { projectionKeys, viewSpecs, type ProjectionKey, type RepLens } from "./view-specs";

export type ModelMode = "single" | "overlay" | "split" | "diff";
export type InspectorTab = "state" | "relations" | "history" | "evidence";
export type { Difference, EvidenceInfo, GraphEdge, GraphNode, HistoryInfo, ProjectionGraph, ProjectionKey, RelationInfo, RepLens };
export { projectionKeys, viewSpecs, projectCanonicalGraph };

export const timelinePoints = [
  { id: "aug18", day: "18", label: "18 Aug · baseline", kind: "past" as const, delta: "12 objects captured", validAt: canonicalTimes.AUG_18 + 14 * 60 * 60 * 1000 },
  { id: "aug19", day: "19", label: "19 Aug · workshop", kind: "past" as const, delta: "+8 observations", validAt: canonicalTimes.AUG_19 + 14 * 60 * 60 * 1000 },
  { id: "aug20", day: "20", label: "20 Aug · prototype review", kind: "past" as const, delta: "3 relations changed", validAt: canonicalTimes.AUG_20 + 14 * 60 * 60 * 1000 },
  { id: "latest", day: "LATEST", label: "21 Aug · recorded snapshot", kind: "now" as const, delta: "Latest fixture state", validAt: canonicalTimes.AUG_21 + 14.5 * 60 * 60 * 1000 },
  { id: "aug22", day: "22", label: "22 Aug · planned", kind: "future" as const, delta: "Compare validation", validAt: canonicalTimes.AUG_22 + 14 * 60 * 60 * 1000 },
  { id: "aug23", day: "23", label: "23 Aug · planned", kind: "future" as const, delta: "Internal release", validAt: canonicalTimes.AUG_23 + 14 * 60 * 60 * 1000 },
];

export const recordedTimeOptions = [
  { id: "aug19", label: "19 Aug · 당시 알려진 상태", recordedAt: canonicalTimes.AUG_19 + 23 * 60 * 60 * 1000 },
  { id: "aug20", label: "20 Aug · 당시 알려진 상태", recordedAt: canonicalTimes.AUG_20 + 23 * 60 * 60 * 1000 },
  { id: "latest", label: "Latest · 21 Aug 15:00", recordedAt: canonicalTimes.AUG_21 + 15 * 60 * 60 * 1000 },
];

export const projectionGraphs = Object.fromEntries(projectionKeys.map((key) => [key, projectCanonicalGraph(key, timelinePoints[3].validAt, recordedTimeOptions[2].recordedAt)])) as Record<ProjectionKey, ProjectionGraph>;

export type FeedEvent = {
  id: string;
  kind: "observation" | "state" | "relation" | "patch" | "decision";
  kindLabel: string;
  title: string;
  detail: string;
  time: string;
  actor: string;
  evidenceCount: number;
  confidence: number;
  nodeId: string;
  projection: ProjectionKey;
  gate: "auto" | "candidate" | "human";
  timelineIndex: number;
};

export const feedEvents: FeedEvent[] = [
  { id: "feed-1", kind: "state", kindLabel: "상태 갱신", title: "OCP Reality Map v0", detail: "진행률이 62%에서 68%로 변경되었습니다.", time: "14:32", actor: "REP Agent", evidenceCount: 3, confidence: .92, nodeId: "project-ocp-v0", projection: "product-project", gate: "candidate", timelineIndex: 3 },
  { id: "feed-2", kind: "relation", kindLabel: "관계 후보", title: "Recorder Evidence Bridge", detail: "OCP Reality Map v0의 의존성 후보로 추가되었습니다.", time: "13:54", actor: "Knowledge Engineer", evidenceCount: 2, confidence: .88, nodeId: "project-recorder", projection: "product-project", gate: "candidate", timelineIndex: 3 },
  { id: "feed-3", kind: "observation", kindLabel: "관측 기록", title: "설계 워크숍 전사", detail: "원본 관측과 파생 전사가 별도 계보로 보존되었습니다.", time: "11:08", actor: "REP Recorder", evidenceCount: 1, confidence: .91, nodeId: "observation-audio", projection: "workflow", gate: "auto", timelineIndex: 1 },
  { id: "feed-4", kind: "patch", kindLabel: "HUMAN GATE", title: "Reference Model Patch #014", detail: "Reference Model 변경은 Product Lead의 승인을 기다립니다.", time: "10:46", actor: "REP Agent", evidenceCount: 3, confidence: .79, nodeId: "decision-approve", projection: "workflow", gate: "human", timelineIndex: 2 },
];
