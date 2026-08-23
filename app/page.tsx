"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  feedEvents,
  projectCanonicalGraph,
  projectionKeys,
  recordedTimeOptions,
  timelinePoints,
  viewSpecs,
  type FeedEvent,
  type GraphNode,
  type InspectorTab,
  type ModelMode,
  type ProjectionGraph,
  type ProjectionKey,
  type RepLens,
} from "./ocp-data";
import { canonicalEntities, type EntityKind, type ModelLayer, type StateKind } from "./canonical-model";
import { deploymentVerificationStages, languageDimensions, referenceDocuments, type DeploymentVerificationState } from "./ocp-reference";
import { pmgSourceIds, pmgVerifiedSource } from "./pmg-source";

type LayerKey = "goal" | "current" | "reference" | "evidence";
type PerspectiveKey = "team" | "reference" | "human-ai";
type AppView = "home" | "map" | "feed" | "dashboard" | "standards";
type InterfaceLocale = "ko" | "en" | "dual";
type RequestState = "idle" | "saving" | "error";
type ConnectionState = "checking" | "connected" | "snapshot";
type WorkspaceRole = "viewer" | "writer" | "reviewer" | "admin";
type ParticipationState = "checking" | "anonymous" | "visitor" | "unavailable" | WorkspaceRole;
type OperationalState = {
  schema: string;
  source: string;
  asOf: { validAt: number; recordedAt: number };
  headRevisionId: string | null;
  counts: {
    observations: number;
    proposalsPendingReview: number;
    proposalsApprovedNotApplied: number;
    proposalsApplied: number;
    appliedImplementationSources: number;
  };
  implementationSources: Array<{
    relationId: string;
    predicate: string;
    assertionKind: string;
    recordedFrom: number;
    properties: Record<string, unknown>;
    artifact: {
      id: string;
      name: string;
      summary: string;
      sourceUrl: string;
      mediaType: string;
      status: string;
      metadata: Record<string, unknown>;
    };
  }>;
  feedEntries: Array<Record<string, unknown>>;
};
type PatchProposalDetail = {
  id: string;
  title: string;
  rationale: string;
  status: string;
  required_gate: string;
  risk_level: string;
  base_revision_id: string;
  applied_at_ms?: number | null;
  operations: Array<Record<string, unknown>>;
  checks: Array<Record<string, unknown>>;
  reviews: Array<Record<string, unknown>>;
  appliedRevision?: { id?: string; recorded_at_ms?: number } | null;
};
type DisplayFeedEvent = FeedEvent & { evidenceBasis?: string };
const deploymentStateLabels: Record<DeploymentVerificationState, { en: string; ko: string }> = {
  verified: { en: "Verified", ko: "검증됨" },
  observed: { en: "Observed", ko: "관측됨" },
  "environment-dependent": { en: "Environment-dependent", ko: "환경 의존" },
  failed: { en: "Failed", ko: "실패" },
  "not-run": { en: "Not run", ko: "미실행" },
};
const modelModes: ModelMode[] = ["single", "overlay", "split", "diff"];
const modeLabels: Record<ModelMode, { en: string; ko: string; symbol: string }> = {
  single: { en: "Single", ko: "단일", symbol: "●" },
  overlay: { en: "Overlay", ko: "중첩", symbol: "◎" },
  split: { en: "Split", ko: "분할", symbol: "◐" },
  diff: { en: "Diff", ko: "차이", symbol: "∆" },
};
const layerLabels: Record<LayerKey, { en: string; ko: string; z: string; opacity: string }> = {
  goal: { en: "Goal", ko: "목표", z: "Z2", opacity: "30%" },
  current: { en: "Current", ko: "현재", z: "Z1", opacity: "70%" },
  reference: { en: "Reference", ko: "REP 기준", z: "Z0", opacity: "20%" },
  evidence: { en: "Evidence", ko: "관측·근거", z: "Z−1", opacity: "—" },
};
const repLensLabels: Record<RepLens, { en: string; ko: string }> = {
  all: { en: "ALL", ko: "전체 구조" },
  chronology: { en: "CHRONOLOGY", ko: "연대기" },
  generation: { en: "GENERATION", ko: "세대" },
  relevance: { en: "RELEVANCE", ko: "연관성" },
};
const stateKindLabels: Record<StateKind, { en: string; ko: string }> = {
  observed: { en: "Observed", ko: "관측" },
  inferred: { en: "Inferred", ko: "추론" },
  planned: { en: "Planned", ko: "계획" },
  forecast: { en: "Forecast", ko: "예측" },
  hypothetical: { en: "Hypothetical", ko: "가정" },
};
const tabLabels: Record<InspectorTab, string> = {
  state: "State",
  relations: "Relations",
  history: "History",
  evidence: "Evidence",
};
const differenceLabels = {
  agreement: "Agreement",
  actor: "Actor-only",
  reference: "Reference-only",
  conflict: "Conflict",
};
const participationLabels: Record<ParticipationState, string> = {
  checking: "Checking access",
  anonymous: "Sign in required",
  visitor: "Join to participate",
  unavailable: "Access unavailable",
  viewer: "Read-only member",
  writer: "Participant",
  reviewer: "Reviewer",
  admin: "Owner",
};
const participationLabelsKo: Record<ParticipationState, string> = {
  checking: "접근 확인 중",
  anonymous: "로그인 필요",
  visitor: "참여 신청 가능",
  unavailable: "접근 확인 불가",
  viewer: "읽기 전용 멤버",
  writer: "참여자",
  reviewer: "검토자",
  admin: "소유자",
};

function uiText(locale: InterfaceLocale, en: string, ko: string) {
  if (locale === "ko") return ko;
  if (locale === "en") return en;
  return `${ko} · ${en}`;
}

function interfaceLabel(locale: InterfaceLocale, label: Readonly<{ en: string; ko: string }>) {
  return uiText(locale, label.en, label.ko);
}

function participationLabel(locale: InterfaceLocale, state: ParticipationState) {
  return uiText(locale, participationLabels[state], participationLabelsKo[state]);
}

function canContribute(state: ParticipationState) {
  return state === "writer" || state === "reviewer" || state === "admin";
}

function canReviewPatches(state: ParticipationState) {
  return state === "reviewer" || state === "admin";
}

function operationalFeedEvents(state: OperationalState | null): DisplayFeedEvent[] {
  if (!state) return [];
  const knownEntityIds = new Set(canonicalEntities.map((entity) => entity.id));
  return state.feedEntries.map((row) => {
    const changeKind = String(row.change_kind ?? "state");
    const kind: FeedEvent["kind"] = changeKind === "observation" ? "observation" : changeKind === "relation" ? "relation" : changeKind === "patch" ? "patch" : changeKind === "decision" ? "decision" : "state";
    const primaryEntityId = String(row.primary_entity_id ?? "enterprise-nexus");
    const recordedAt = Number(row.recorded_at_ms ?? 0);
    return {
      id: String(row.id),
      kind,
      kindLabel: kind === "observation" ? "관측 기록" : kind === "relation" ? "적용된 관계" : kind === "decision" ? "결정" : kind === "patch" ? "변경안" : "상태 갱신",
      title: String(row.title ?? "Recorded change"),
      detail: String(row.summary ?? ""),
      time: Number.isFinite(recordedAt) && recordedAt > 0 ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(recordedAt) : "recorded",
      actor: String(row.actor_name ?? "OCP"),
      evidenceCount: Number(row.evidence_count ?? 0),
      confidence: Number(row.confidence_bp ?? 0) / 10000,
      evidenceBasis: kind === "relation" ? "deterministic source rule" : undefined,
      nodeId: knownEntityIds.has(primaryEntityId) ? primaryEntityId : "enterprise-nexus",
      projection: primaryEntityId === "enterprise-nexus" ? "organization" : "workflow",
      gate: kind === "relation" || kind === "patch" || kind === "decision" ? "human" : "auto",
      timelineIndex: 3,
    };
  });
}

type SearchRecord = { projection: ProjectionKey; nodeId: string; label: string; kicker: string; subtitle: string; kind: EntityKind };
const searchableNodes: SearchRecord[] = canonicalEntities.map((entity) => {
  const projection = projectionKeys.find((key) => viewSpecs[key].entityKinds.includes(entity.kind)) ?? "custom";
  return { projection, nodeId: entity.id, label: entity.name, kicker: entity.kind.replaceAll("_", " ").toUpperCase(), subtitle: entity.subtitle, kind: entity.kind };
});

function glyphFor(node: Pick<GraphNode, "kind" | "label">) {
  const glyphs: Record<GraphNode["kind"], string> = {
    enterprise: "N",
    product: node.label === "REP" ? "R" : "O",
    project: "▣",
    goal: "◎",
    team: "◉",
    role: "◇",
    actor: "●",
    agent: "AI",
    trigger: "↯",
    observation: "◌",
    derivation: "≋",
    gate: "◆",
    decision: "✓",
    outcome: "↗",
  };
  return glyphs[node.kind];
}

function preferredModelFor(perspective: PerspectiveKey): ModelLayer {
  return perspective === "reference" ? "reference" : "current";
}

function primaryLayerFor(modelMode: ModelMode, layers: Record<LayerKey, boolean>, perspective: PerspectiveKey): LayerKey {
  if (modelMode === "single") return (Object.keys(layers) as LayerKey[]).find((layer) => layers[layer]) ?? "current";
  if (perspective === "reference" && layers.reference) return "reference";
  if (layers.current) return "current";
  return (Object.keys(layers) as LayerKey[]).find((layer) => layers[layer]) ?? "current";
}

function displayedState(node: GraphNode, primaryLayer: LayerKey, layers: Record<LayerKey, boolean>) {
  const orderedLayers = [primaryLayer, ...(Object.keys(layers) as LayerKey[]).filter((layer) => layer !== primaryLayer && layers[layer])];
  const layer = orderedLayers.find((item) => node.layers[item].state) ?? primaryLayer;
  const state = node.layers[layer].state;
  return state
    ? { layer, ...state }
    : { layer, kind: "inferred" as StateKind, lifecycle: "State not recorded", health: "neutral" as const, progress: undefined, confidence: 0, recordedFrom: node.recordedAt };
}

function graphForLayers(graph: ProjectionGraph, layers: Record<LayerKey, boolean>, modelMode: ModelMode): ProjectionGraph {
  if (modelMode === "split" || modelMode === "diff") return graph;
  const activeLayers = (Object.keys(layers) as LayerKey[]).filter((layer) => layers[layer]);
  const nodes = graph.nodes.filter((node) => activeLayers.some((layer) => node.layers[layer].presence === "present"));
  const visible = new Set(nodes.map((node) => node.id));
  return { ...graph, nodes, edges: graph.edges.filter((edge) => visible.has(edge.fromId) && visible.has(edge.toId)) };
}

function useModalFocus<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const rootRef = useRef<T>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = rootRef.current;
    const overlay = root?.closest<HTMLElement>(".drawer-layer, .search-layer");
    const background = overlay?.parentElement
      ? Array.from(overlay.parentElement.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlay && !element.classList.contains("toast"))
      : [];
    const previouslyInert = background.map((element) => element.hasAttribute("inert"));
    background.forEach((element) => element.setAttribute("inert", ""));
    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    window.requestAnimationFrame(() => (root?.querySelector<HTMLElement>("[data-autofocus]") ?? root?.querySelector<HTMLElement>(focusableSelector))?.focus());

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const focusable = Array.from(root.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      background.forEach((element, index) => {
        if (!previouslyInert[index]) element.removeAttribute("inert");
      });
      returnFocusRef.current?.focus();
    };
  }, [open]);

  return rootRef;
}

const GraphNodeButton = memo(function GraphNodeButton({
  node,
  selected,
  onSelect,
  overlay = false,
  layers,
  primaryLayer,
}: {
  node: GraphNode;
  selected: boolean;
  onSelect: (node: GraphNode) => void;
  overlay?: boolean;
  layers: Record<LayerKey, boolean>;
  primaryLayer: LayerKey;
}) {
  const state = displayedState(node, primaryLayer, layers);
  const progress = state.progress;
  const style = {
    "--node-x": `${node.x}%`,
    "--node-y": `${node.y}%`,
  } as CSSProperties;

  return (
    <button
      className={`node graph-node kind-${node.kind} diff-${node.difference} state-${state.health} ${selected ? "selected" : ""} ${overlay ? "overlay-node" : ""}`}
      style={style}
      type="button"
      aria-label={`${node.kicker}: ${node.label}. ${state.lifecycle}. ${node.relations.length} relations. ${differenceLabels[node.difference]}.`}
      aria-current={selected ? "true" : undefined}
      aria-controls="object-inspector"
      onClick={() => onSelect(node)}
    >
      <i className={`node-icon kind-${node.kind}`} aria-hidden="true">{glyphFor(node)}</i>
      <span className="node-main">
        <small>{node.kicker}</small>
        <b>{node.label}</b>
        <em>{node.subtitle}</em>
      </span>
      <i className={`health ${state.health}`} aria-hidden="true" />
      <span className="node-layer-signals" aria-label={`Visible layers: ${(Object.keys(layers) as LayerKey[]).filter((layer) => layers[layer] && node.layers[layer].presence === "present").map((layer) => layerLabels[layer].en).join(", ") || "none"}`}>
        {(Object.keys(layers) as LayerKey[]).filter((layer) => layers[layer] && node.layers[layer].presence === "present").map((layer) => <i className={`layer-${layer}`} key={layer} title={layerLabels[layer].en} />)}
      </span>
      {progress !== undefined && (
        <>
          <i className="progress" aria-hidden="true"><b style={{ width: `${progress}%` }} /></i>
          <strong className="progress-value">{progress}%</strong>
        </>
      )}
      {overlay && <span className="difference-tag">{differenceLabels[node.difference]}</span>}
    </button>
  );
});

function MapEdges({ graph }: { graph: ProjectionGraph }) {
  return (
    <>
      {graph.edges.map((edge) => (
        <span
          className={`edge ${edge.dashed ? "dashed" : ""}`}
          aria-hidden="true"
          key={edge.id}
          title={edge.relation}
          style={{
            left: `${edge.left}%`,
            top: `${edge.top}%`,
            width: `${edge.width}%`,
            transform: `rotate(${edge.angle}deg)`,
          }}
        />
      ))}
    </>
  );
}

function RelationSummary({ graph }: { graph: ProjectionGraph }) {
  return (
    <ul className="sr-only" aria-label="Visible relations">
      {graph.edges.map((edge) => {
        const from = graph.nodes.find((node) => node.id === edge.fromId)?.label ?? edge.fromId;
        const to = graph.nodes.find((node) => node.id === edge.toId)?.label ?? edge.toId;
        return <li key={edge.id}>{from} {edge.relation} {to}</li>;
      })}
    </ul>
  );
}

function AxisLabels({ graph }: { graph: ProjectionGraph }) {
  return (
    <div className="semantic-axis" aria-hidden="true">
      {graph.levels.map((level) => <span key={level}>{level}</span>)}
    </div>
  );
}

function TimelineBar({
  value,
  onChange,
  recordedIndex,
  onRecordedChange,
  locale,
}: {
  value: number;
  onChange: (index: number) => void;
  recordedIndex: number;
  onRecordedChange: (index: number) => void;
  locale: InterfaceLocale;
}) {
  const selected = timelinePoints[value];
  return (
    <section className="timebar" aria-label={uiText(locale, "Valid time and recorded time controls", "유효 시간과 기록 시간 제어")}>
      <div className="time-context">
        <small>{uiText(locale, "VALID TIME", "유효 시간")}</small>
        <strong>{selected.label}</strong>
        <span>{selected.delta}</span>
      </div>
      <div className="timeline-control" role="group" aria-label={uiText(locale, "Select state time", "상태 시간 선택")}>
        <span className="timeline-base" aria-hidden="true" />
        {timelinePoints.map((point, index) => (
          <button
            className={`time-point ${point.kind} ${value === index ? "active" : ""}`}
            key={point.id}
            style={{ left: `${8 + index * 16.8}%` }}
            type="button"
            aria-label={point.label}
            aria-pressed={value === index}
            onClick={() => onChange(index)}
          >
            <i />
            <span>{point.day}</span>
          </button>
        ))}
      </div>
      <label className="recorded-time">
        <small>{uiText(locale, "RECORDED AS OF", "기록 기준")}</small>
        <select value={recordedIndex} onChange={(event) => onRecordedChange(Number(event.target.value))} aria-label={uiText(locale, "Recorded time knowledge cutoff", "기록 시점 지식 기준")}>
          {recordedTimeOptions.map((option, index) => <option key={option.id} value={index}>{option.label}</option>)}
        </select>
        {recordedIndex !== recordedTimeOptions.length - 1 && <em>{uiText(locale, "Knowledge snapshot", "지식 스냅샷")}</em>}
      </label>
      <button className="return-now" type="button" disabled={value === 3} onClick={() => onChange(3)}>
        ↺ {uiText(locale, "Return to latest", "최신으로 돌아가기")}
      </button>
    </section>
  );
}

function MapToolbar({
  graph,
  projection,
  modelMode,
  connection,
  revision,
  operationalState,
  onSelectAgent,
  onOpenPatch,
  onFit,
  locale,
}: {
  graph: ProjectionGraph;
  projection: ProjectionKey;
  modelMode: ModelMode;
  connection: ConnectionState;
  revision: string;
  operationalState: OperationalState | null;
  onSelectAgent: () => void;
  onOpenPatch: () => void;
  onFit: () => void;
  locale: InterfaceLocale;
}) {
  const goldenGateCount = operationalState
    ? operationalState.counts.proposalsPendingReview + operationalState.counts.proposalsApprovedNotApplied
    : 1;
  return (
    <header className="map-toolbar">
      <div>
        <p className="breadcrumb">PLUS MINUS G. <i>/</i> {projection.toUpperCase()} <i>/</i> <b>{graph.breadcrumb}</b></p>
        <h1>{graph.title}</h1>
      </div>
      <div className="map-context">
        <span className={`canonical-badge source-${connection}`}><i /> {connection === "connected" ? uiText(locale, "DATA CONNECTED", "데이터 연결됨") : connection === "checking" ? uiText(locale, "CHECKING SOURCE", "소스 확인 중") : uiText(locale, "RECORDED SNAPSHOT", "기록 스냅샷")}</span>
        <span className={`source-link-chip ${operationalState?.counts.appliedImplementationSources ? "applied" : "none"}`}><i>{operationalState?.counts.appliedImplementationSources ? "✓" : "◇"}</i>{operationalState ? uiText(locale, `${operationalState.counts.appliedImplementationSources} applied source link`, `반영된 소스 연결 ${operationalState.counts.appliedImplementationSources}개`) : uiText(locale, "Source links unknown", "소스 연결 미확인")}</span>
        <span className="mode-context"><i>{modeLabels[modelMode].symbol}</i>{interfaceLabel(locale, modeLabels[modelMode])}</span>
        <div className="operational-strip" aria-label={uiText(locale, "Recorded work status", "기록된 작업 상태")}>
          <button type="button" onClick={onSelectAgent} aria-label={uiText(locale, "Open REP Agent, working, recorded state", "작업 중으로 기록된 REP Agent 열기")}><i>AI</i><span><b>REP Agent</b><em>{uiText(locale, "Working", "작업 중")}</em></span></button>
          <button className="human-gate" type="button" disabled={goldenGateCount === 0} onClick={onOpenPatch} aria-label={uiText(locale, `Open ${goldenGateCount} human-required patches`, `사람 검토가 필요한 패치 ${goldenGateCount}개 열기`)}><i>!</i><span><b>{uiText(locale, "Human gate", "사람 승인")}</b><em>{uiText(locale, `${goldenGateCount} waiting`, `${goldenGateCount}개 대기`)}</em></span></button>
          <span className="revision-chip">{revision}</span>
        </div>
        <button type="button" aria-label={uiText(locale, "Fit map", "지도 맞춤")} onClick={onFit}>⌗</button>
      </div>
    </header>
  );
}

function CanvasFooter({
  zoom,
  setZoom,
}: {
  zoom: number;
  setZoom: (zoom: number) => void;
}) {
  return (
    <>
      <div className="legend">
        <span><i className="observed" /> Observed</span>
        <span><i className="inferred" /> Inferred</span>
        <span><i className="relation" /> Relation</span>
      </div>
      <div className="zoom" aria-label="Map zoom">
        <button type="button" aria-label="Zoom in" onClick={() => setZoom(Math.min(120, zoom + 5))}>＋</button>
        <span>{zoom}%</span>
        <button type="button" aria-label="Zoom out" onClick={() => setZoom(Math.max(60, zoom - 5))}>−</button>
      </div>
    </>
  );
}

function TimeNotice({ timeIndex }: { timeIndex: number }) {
  if (timeIndex === 3) return null;
  const point = timelinePoints[timeIndex];
  return (
    <div className={`time-notice ${point.kind}`}>
      <i aria-hidden="true">{point.kind === "future" ? "◇" : "↶"}</i>
      <span>
        <b>{point.kind === "future" ? "예정 상태 Planned state" : "과거 상태 Historical state"}</b>
        {point.label}
      </span>
      <em>{point.kind === "future" ? "Forecast, not observation" : "Read-only snapshot"}</em>
    </div>
  );
}

function StrataCanvas({
  graph,
  selectedId,
  timeIndex,
  zoom,
  onSelect,
  setZoom,
  layers,
  primaryLayer,
}: {
  graph: ProjectionGraph;
  selectedId: string;
  timeIndex: number;
  zoom: number;
  onSelect: (node: GraphNode) => void;
  setZoom: (zoom: number) => void;
  layers: Record<LayerKey, boolean>;
  primaryLayer: LayerKey;
}) {
  return (
    <div className="canvas strata-canvas">
      <AxisLabels graph={graph} />
      <div className="strata-planes" aria-hidden="true"><i /><i /><i /></div>
      <div className="depth">Z · SELECTED MODEL LAYER <b>SINGLE</b></div>
      <TimeNotice timeIndex={timeIndex} />
      <div className="map-scale" style={{ transform: `scale(${zoom / 86})` }}>
        <MapEdges graph={graph} />
        <RelationSummary graph={graph} />
        {graph.nodes.map((node) => (
          <GraphNodeButton key={node.id} node={node} selected={node.id === selectedId} onSelect={onSelect} layers={layers} primaryLayer={primaryLayer} />
        ))}
      </div>
      <div className="reality-boundary" title="Reality is accessible only through observations and evidence">
        <span>REALITY · 현실</span>
        <b>is not stored</b>
        <em>accessible only through observation → evidence</em>
      </div>
      <CanvasFooter zoom={zoom} setZoom={setZoom} />
    </div>
  );
}

function CompareCanvas({
  graph,
  selectedId,
  timeIndex,
  onSelect,
}: {
  graph: ProjectionGraph;
  selectedId: string;
  timeIndex: number;
  onSelect: (node: GraphNode) => void;
}) {
  return (
    <div className="canvas compare-canvas">
      <TimeNotice timeIndex={timeIndex} />
      <div className="difference-summary" aria-label="Model differences">
        <span className="agreement"><i /> Agreement <b>12</b></span>
        <span className="actor"><i /> Actor-only <b>2</b></span>
        <span className="reference"><i /> Missing <b>3</b></span>
        <span className="conflict"><i /> Conflict <b>1</b></span>
      </div>
      <div className="compare-grid">
        {(["actor", "reference"] as const).map((side) => (
          <section className={`compare-plane ${side}`} key={side}>
            <header>
              <span>{side === "actor" ? "ACTOR MODEL · 행위자 모델" : "CURRENT REFERENCE · 현재 기준 모델"}</span>
              <b>{side === "actor" ? "OCP 제품팀" : "Shared v0.14"}</b>
            </header>
            <div className="compare-node-list">
              {graph.nodes.slice(0, 6).map((node) => {
                const layer = side === "actor" ? "current" : "reference";
                const sideLayers: Record<LayerKey, boolean> = { goal: false, current: layer === "current", reference: layer === "reference", evidence: false };
                const state = displayedState(node, layer, sideLayers);
                const missing = node.layers[layer].presence !== "present";
                return (
                  <button
                    className={`compare-node diff-${node.difference} ${missing ? "missing" : ""} ${selectedId === node.id ? "selected" : ""}`}
                    key={node.id}
                    type="button"
                    aria-label={`${node.label}, ${missing ? `not present in ${layer}` : state.lifecycle}`}
                    onClick={() => onSelect(node)}
                  >
                    <i className={`mini-node kind-${node.kind}`}>{glyphFor(node)}</i>
                    <span><small>{node.kicker}</small><b>{node.label}</b><em>{missing ? "Not present in this model" : state.lifecycle}</em></span>
                    <strong>{missing ? "—" : state.progress !== undefined ? `${state.progress}%` : "●"}</strong>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="comparison-boundary"><i /> Models are compared through shared evidence — never directly against Reality.</div>
    </div>
  );
}

function OverlayCanvas({
  graph,
  selectedId,
  timeIndex,
  balance,
  zoom,
  onSelect,
  setBalance,
  setZoom,
  layers,
  primaryLayer,
}: {
  graph: ProjectionGraph;
  selectedId: string;
  timeIndex: number;
  balance: number;
  zoom: number;
  onSelect: (node: GraphNode) => void;
  setBalance: (value: number) => void;
  setZoom: (zoom: number) => void;
  layers: Record<LayerKey, boolean>;
  primaryLayer: LayerKey;
}) {
  return (
    <div className="canvas overlay-canvas" style={{ "--overlay-balance": `${balance}%` } as CSSProperties}>
      <AxisLabels graph={graph} />
      <TimeNotice timeIndex={timeIndex} />
      <div className="z-layer-planes" aria-hidden="true">
        {(Object.keys(layerLabels) as LayerKey[]).map((layer) => (
          <i className={`${layer} ${layers[layer] ? "visible" : "hidden"}`} key={layer}><span>{layerLabels[layer].z}</span></i>
        ))}
      </div>
      <div className="overlay-control">
        <span>ACTOR MODEL</span>
        <input aria-label="Actor and reference model emphasis" type="range" min="10" max="90" value={balance} onChange={(event) => setBalance(Number(event.target.value))} />
        <span>REFERENCE MODEL</span>
      </div>
      <div className="overlay-legend">
        {Object.entries(differenceLabels).map(([key, label]) => <span className={key} key={key}><i />{label}</span>)}
      </div>
      <div className="map-scale" style={{ transform: `scale(${zoom / 86})` }}>
        <MapEdges graph={graph} />
        <RelationSummary graph={graph} />
        {graph.nodes.map((node) => (
          <GraphNodeButton key={node.id} node={node} selected={node.id === selectedId} onSelect={onSelect} overlay layers={layers} primaryLayer={primaryLayer} />
        ))}
      </div>
      <CanvasFooter zoom={zoom} setZoom={setZoom} />
    </div>
  );
}

function DiffCanvas({
  graph,
  selectedId,
  timeIndex,
  onSelect,
}: {
  graph: ProjectionGraph;
  selectedId: string;
  timeIndex: number;
  onSelect: (node: GraphNode) => void;
}) {
  const differences = graph.nodes.filter((node) => node.difference !== "agreement");
  return (
    <div className="canvas diff-canvas">
      <TimeNotice timeIndex={timeIndex} />
      <header>
        <div><small>MODEL DELTA · 모델 차이</small><h2>Only what does not align</h2><p>Goal ↔ Current ↔ Reference</p></div>
        <div className="diff-total"><strong>{differences.length}</strong><span>open differences</span></div>
      </header>
      <div className="diff-grid">
        {differences.map((node) => (
          <button className={`diff-card ${node.difference} ${selectedId === node.id ? "selected" : ""}`} key={node.id} type="button" onClick={() => onSelect(node)}>
            <i className={`mini-node kind-${node.kind}`}>{glyphFor(node)}</i>
            <span><small>{differenceLabels[node.difference]} · {node.kicker}</small><b>{node.label}</b><em>{node.subtitle}</em></span>
            <strong>{node.difference === "conflict" ? "Review" : node.difference === "actor" ? "Extra" : "Missing"}</strong>
          </button>
        ))}
      </div>
      <div className="diff-rule"><i>i</i><span>Reality is excluded. Differences are calculated between model layers and observed state.</span></div>
    </div>
  );
}

function MobileObjectList({
  graph,
  selectedId,
  modelMode,
  layers,
  primaryLayer,
  onSelect,
}: {
  graph: ProjectionGraph;
  selectedId: string;
  modelMode: ModelMode;
  layers: Record<LayerKey, boolean>;
  primaryLayer: LayerKey;
  onSelect: (node: GraphNode) => void;
}) {
  const nodes = modelMode === "diff" ? graph.nodes.filter((node) => node.difference !== "agreement") : graph.nodes;
  const groups = Array.from(new Set(nodes.map((node) => node.kicker)));
  return (
    <section className="mobile-object-list" aria-label={`${graph.label} readable object list`}>
      <header>
        <div><small>SEMANTIC LIST · 모바일 표현</small><strong>{graph.label}</strong></div>
        <span>{nodes.length} objects · {graph.edges.length} relations</span>
      </header>
      {groups.map((group) => (
        <section className="mobile-object-group" key={group}>
          <h2>{group}</h2>
          {nodes.filter((node) => node.kicker === group).map((node) => {
            const state = displayedState(node, primaryLayer, layers);
            return (
              <button className={`${selectedId === node.id ? "selected" : ""} diff-${node.difference}`} key={node.id} type="button" aria-current={selectedId === node.id ? "true" : undefined} aria-controls="object-inspector" onClick={() => onSelect(node)}>
                <i className={`mini-node kind-${node.kind}`} aria-hidden="true">{glyphFor(node)}</i>
                <span className="mobile-object-copy"><b>{node.label}</b><em>{state.lifecycle} · {layerLabels[state.layer].en}</em><small>{node.lastDelta} · {node.relations.length} relations</small></span>
                <span className={`mobile-object-state ${state.health}`}><i />{state.kind}</span>
              </button>
            );
          })}
        </section>
      ))}
      {nodes.length === 0 && <div className="mobile-empty"><b>No objects in the selected layers</b><span>Turn on another model layer to continue.</span></div>}
      <footer><b>REALITY IS NOT STORED</b><span>Objects are model projections supported by observations and evidence.</span></footer>
    </section>
  );
}

function ControlRail({
  projection,
  modelMode,
  perspective,
  onProjection,
  onMode,
  onPerspective,
  layers,
  onLayer,
  repLens,
  onRepLens,
  locale,
}: {
  projection: ProjectionKey;
  modelMode: ModelMode;
  perspective: PerspectiveKey;
  onProjection: (value: ProjectionKey) => void;
  onMode: (value: ModelMode) => void;
  onPerspective: (value: PerspectiveKey) => void;
  layers: Record<LayerKey, boolean>;
  onLayer: (layer: LayerKey) => void;
  repLens: RepLens;
  onRepLens: (lens: RepLens) => void;
  locale: InterfaceLocale;
}) {
  const spec = viewSpecs[projection];
  const comparisonLocked = modelMode === "split" || modelMode === "diff";
  return (
    <aside className="controls" aria-label={uiText(locale, "Map view controls", "지도 보기 제어")}>
      <section className="viewspec-control">
        <p>{uiText(locale, "VIEW SPEC", "투영 규칙")} <span className="control-help" title={uiText(locale, "The same canonical graph is recomputed through a ViewSpec.", "동일한 Canonical Graph를 ViewSpec으로 다시 계산합니다.")}>?</span></p>
        <label>
          <span aria-hidden="true">◇</span>
          <select value={projection} onChange={(event) => onProjection(event.target.value as ProjectionKey)} aria-label={uiText(locale, "Select ViewSpec", "ViewSpec 선택")}>
            {projectionKeys.map((item) => <option key={item} value={item}>{uiText(locale, viewSpecs[item].label, viewSpecs[item].labelKo)}</option>)}
          </select>
        </label>
        <small className="viewspec-note">{uiText(locale, "Same Canonical Graph · position recomputed", "동일한 Canonical Graph · 위치 재계산")}</small>
      </section>
      <section>
        <p>{uiText(locale, "MODEL MODE", "모델 모드")} <span className="control-help" title={uiText(locale, "Choose one layer, overlay layers, compare side by side, or show only differences.", "한 레이어, 중첩, 나란히 비교, 차이만 보기 중에서 선택합니다.")}>?</span></p>
        {modelModes.map((item) => (
          <button className={modelMode === item ? "active" : ""} key={item} type="button" aria-pressed={modelMode === item} onClick={() => onMode(item)}>
            <span aria-hidden="true">{modeLabels[item].symbol}</span>
            <b>{interfaceLabel(locale, modeLabels[item])}</b>
            {locale === "dual" && <small>{modeLabels[item].en}</small>}
          </button>
        ))}
      </section>
      <section className="layer-control">
        <p>{uiText(locale, "MODEL LAYERS", "모델 레이어")} · Z <span className="control-help" title={comparisonLocked ? uiText(locale, "Split and Diff compare Current with Reference.", "분할과 차이는 현재 모델과 기준 모델을 비교합니다.") : uiText(locale, "Layer choices filter visible model membership and displayed state.", "레이어 선택이 보이는 모델 구성과 표시 상태를 필터링합니다.")}>?</span></p>
        {(Object.keys(layerLabels) as LayerKey[]).map((layer) => (
          <button className={`layer-${layer} ${layers[layer] ? "active" : ""}`} key={layer} type="button" aria-label={`${interfaceLabel(locale, layerLabels[layer])} ${layers[layer] ? uiText(locale, "shown", "표시") : uiText(locale, "hidden", "숨김")}`} aria-pressed={layers[layer]} disabled={comparisonLocked} onClick={() => onLayer(layer)}>
            <span aria-hidden="true"><i /></span>
            <b>{interfaceLabel(locale, layerLabels[layer])}</b>
            <small>{layerLabels[layer].z} · {layerLabels[layer].opacity}</small>
          </button>
        ))}
      </section>
      <section className="perspective-control">
        <p>{uiText(locale, "PERSPECTIVE", "관점")}</p>
        <label>
          <span className="plane-dot" />
          <select aria-label={uiText(locale, "Model perspective", "모델 관점")} value={perspective} disabled={comparisonLocked} onChange={(event) => onPerspective(event.target.value as PerspectiveKey)}>
            <option value="team">{uiText(locale, "Current · OCP product team", "현재 · OCP 제품팀")}</option>
            <option value="reference">{uiText(locale, "Shared · REP reference", "공유 · REP 기준")}</option>
            <option value="human-ai">{uiText(locale, "Current · Human + AI actors", "현재 · 사람 + AI 행위자")}</option>
          </select>
        </label>
      </section>
      {layers.reference && (
        <section className="rep-lens-control">
          <p>{uiText(locale, "REP LENS", "REP 기준 필터")}</p>
          <div role="group" aria-label={uiText(locale, "REP view filter", "REP 보기 필터")}>
            {(Object.keys(repLensLabels) as RepLens[]).map((lens) => (
              <button className={repLens === lens ? "active" : ""} key={lens} type="button" aria-pressed={repLens === lens} onClick={() => onRepLens(lens)}>
                <b>{interfaceLabel(locale, repLensLabels[lens])}</b>{locale === "dual" && <small>{repLensLabels[lens].en}</small>}
              </button>
            ))}
          </div>
        </section>
      )}
      <dl>
        <div><dt>X</dt><dd>{spec.xRule}</dd></div>
        <div><dt>Y</dt><dd>{spec.yRule}</dd></div>
        <div><dt>Z</dt><dd>{uiText(locale, "Layer + perspective", "레이어 + 관점")}</dd></div>
        <div><dt>T</dt><dd>{uiText(locale, "Valid + recorded time", "유효 + 기록 시간")}</dd></div>
      </dl>
    </aside>
  );
}

function Inspector({
  node,
  open,
  tab,
  projection,
  perspective,
  layers,
  primaryLayer,
  mobileEngaged,
  onClose,
  onTab,
  onPropose,
}: {
  node: GraphNode;
  open: boolean;
  tab: InspectorTab;
  projection: ProjectionKey;
  perspective: PerspectiveKey;
  layers: Record<LayerKey, boolean>;
  primaryLayer: LayerKey;
  mobileEngaged: boolean;
  onClose: () => void;
  onTab: (tab: InspectorTab) => void;
  onPropose: () => void;
}) {
  const state = displayedState(node, primaryLayer, layers);
  const progress = state.progress;
  const tabs = Object.keys(tabLabels) as InspectorTab[];
  const handleTabKey = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!(["ArrowLeft", "ArrowRight", "Home", "End"] as string[]).includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    onTab(tabs[nextIndex]);
    window.requestAnimationFrame(() => document.getElementById(`inspector-tab-${tabs[nextIndex]}`)?.focus());
  };
  return (
    <aside className={`inspector ${open ? "open" : "closed"} ${mobileEngaged ? "mobile-engaged" : ""}`} id="object-inspector" aria-label={`${node.label} inspector`} aria-live="polite">
      <header><small>SELECTED OBJECT</small><button type="button" aria-label="Close inspector" onClick={onClose}>×</button></header>
      <div className="object-title">
        <i className={`object-icon kind-${node.kind}`} aria-hidden="true">{glyphFor(node)}</i>
        <div><small>{node.kicker}</small><h2>{node.label}</h2><p>{node.subtitle}</p></div>
      </div>
      <div className="status"><span className={state.health}><i /> {state.lifecycle}</span><small>{layerLabels[state.layer].en} · recorded {state.recordedFrom}</small></div>
      <div className="inspector-tabs" role="tablist" aria-label="Inspector detail">
        {tabs.map((item, index) => (
          <button className={tab === item ? "active" : ""} id={`inspector-tab-${item}`} key={item} role="tab" aria-controls="inspector-panel" aria-selected={tab === item} tabIndex={tab === item ? 0 : -1} type="button" onKeyDown={(event) => handleTabKey(event, index)} onClick={() => onTab(item)}>
            {tabLabels[item]}
            {item === "relations" && <i>{node.relations.length}</i>}
            {item === "evidence" && <i>{node.evidence.length}</i>}
          </button>
        ))}
      </div>
      <div className="details" id="inspector-panel" role="tabpanel" aria-labelledby={`inspector-tab-${tab}`}>
        {tab === "state" && (
          <>
            <section>
              <p><b>CURRENT STATE</b><button type="button" onClick={onPropose}>Propose change</button></p>
              <dl className="state">
                <div><dt>Lifecycle</dt><dd><i className="green" /> {state.lifecycle}</dd></div>
                <div><dt>Confidence</dt><dd>{state.confidence > 0 ? `${Math.round(state.confidence * 100)}% · ${state.confidence > .86 ? "High" : "Medium"}` : "Unknown"}</dd></div>
                <div><dt>Progress</dt><dd>{progress === undefined ? "—" : <><span><i style={{ width: `${progress}%` }} /></span>{progress}%</>}</dd></div>
                <div><dt>Owner</dt><dd><em>{node.owner.slice(0, 2).toUpperCase()}</em>{node.owner}</dd></div>
              </dl>
            </section>
            <section className="coordinate-card render-context-card">
              <p><b>RENDER CONTEXT · 투영 맥락</b><i>VIEW SPEC</i></p>
              <div><span><b>VIEW</b>{viewSpecs[projection].label}</span><span><b>LAYER</b>{layerLabels[state.layer].z} {layerLabels[state.layer].en}</span><span><b>VALID</b>{node.validAt}</span><span><b>RECORDED</b>{node.recordedAt}</span></div>
              <small>X · {viewSpecs[projection].xRule} · Y · {viewSpecs[projection].yRule} · Perspective · {perspective}</small>
              <em>Position computed by ViewSpec · 위치는 저장되지 않음</em>
            </section>
            <section>
              <p><b>ACTIVE SIGNALS</b><i>2</i></p>
              <article><i>!</i><div><b>Evidence freshness</b><span>2 recorded claims need newer observations.</span></div><time>recorded</time></article>
              <article className="success"><i>↗</i><div><b>Last recorded change</b><span>{node.lastDelta}</span></div><time>r214</time></article>
            </section>
            <section className="difference-card">
              <p><b>MODEL STATUS</b></p>
              <div className={node.difference}><i />{differenceLabels[node.difference]}<span>{node.difference === "agreement" ? "Models align on this object." : "Review the difference before updating the reference model."}</span></div>
            </section>
          </>
        )}
        {tab === "relations" && (
          <section className="relation-detail">
            <p><b>PRIMARY RELATIONS</b><span>Visible in map</span></p>
            {node.relations.map((relation, index) => (
              <div key={`${relation.type}-${relation.target}-${index}`}>
                <small>{relation.type}</small><b>{relation.target}</b><span>{relation.direction === "in" ? "←" : "→"}</span>
              </div>
            ))}
            <div className="relation-note"><i>↳</i><span>Relations are temporal. Changes are preserved in History.</span></div>
          </section>
        )}
        {tab === "history" && (
          <section className="history-detail">
            <p><b>STATE HISTORY</b><span>Read-only</span></p>
            {node.history.map((item, index) => (
              <article key={`${item.time}-${item.title}`}>
                <time>{item.time}</time><i className={index === 0 ? "latest" : ""} />
                <div><b>{item.title}</b><p>{item.detail}</p><span>{item.revision} · Valid {item.validAt} · Recorded {item.recordedAt} · {item.actor}</span></div>
              </article>
            ))}
          </section>
        )}
        {tab === "evidence" && (
          <section className="evidence-detail">
            <p><b>EVIDENCE CHAIN</b><span>근거 → 원관측</span></p>
            <div className="claim-card"><small>CLAIM</small><b>“{node.label} is {state.lifecycle.toLowerCase()}.”</b><span>{layerLabels[state.layer].en} model · confidence {Math.round(state.confidence * 100)}%</span></div>
            <div className="chain-arrow">↓ supported by</div>
            {node.evidence.map((evidence) => (
              <article className="evidence-row" key={evidence.id}>
                <i>EV</i><span><small>{evidence.id} · EVIDENCE</small><b>{evidence.title}</b><em>{evidence.source} · {evidence.observedAt}</em></span><strong>{Math.round(evidence.confidence * 100)}%</strong>
              </article>
            ))}
            <div className="chain-arrow">↓ derived from</div>
            <div className="raw-card"><i>◉</i><div><small>RAW OBSERVATION</small><b>Workshop audio · 48m 12s</b><span>Original source · captured by REP Recorder</span></div><em>IMMUTABLE</em></div>
            <p className="epistemic-note"><i>i</i><span><b>Reality is not a data object.</b> This chain preserves the gap between a real event, its observation, and our interpretation.</span></p>
          </section>
        )}
      </div>
      <footer className="inspector-identity"><span>CANONICAL ID</span><code>{node.canonicalId}</code></footer>
    </aside>
  );
}

function FeedView({
  events,
  filter,
  onFilter,
  onOpenEvent,
  onOpenPatch,
  operationalState,
  revision,
  locale,
}: {
  events: DisplayFeedEvent[];
  filter: string;
  onFilter: (filter: string) => void;
  onOpenEvent: (event: FeedEvent) => void;
  onOpenPatch: () => void;
  operationalState: OperationalState | null;
  revision: string;
  locale: InterfaceLocale;
}) {
  const filters = [
    ["all", uiText(locale, "All", "전체")],
    ["observation", uiText(locale, "Observation", "관측")],
    ["state", uiText(locale, "State", "상태")],
    ["relation", uiText(locale, "Relation", "관계")],
    ["patch", uiText(locale, "Patch", "패치")],
    ["decision", uiText(locale, "Decision", "결정")],
  ];
  const visible = filter === "all" ? events : events.filter((event) => event.kind === filter);
  const autoApplied = events.filter((event) => event.gate === "auto").length;
  const reviewCount = operationalState
    ? operationalState.counts.proposalsPendingReview + operationalState.counts.proposalsApprovedNotApplied
    : events.filter((event) => event.gate === "candidate" || event.gate === "human").length;
  const humanCount = operationalState ? reviewCount : events.filter((event) => event.gate === "human").length;
  const recordedDate = operationalState
    ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" }).format(operationalState.asOf.recordedAt)
    : uiText(locale, "21 August", "8월 21일");
  const appliedSource = operationalState?.implementationSources[0];
  const pendingLabel = operationalState?.counts.proposalsApprovedNotApplied
    ? uiText(locale, "Approved · not applied", "승인됨 · 아직 미반영")
    : uiText(locale, "Pending human review", "사람 승인 대기");
  return (
    <div className="feed-workspace">
      <aside className="feed-rail">
        <p>{uiText(locale, "CHANGE TYPE", "변경 유형")}</p>
        {filters.map(([key, label]) => <button className={filter === key ? "active" : ""} key={key} type="button" aria-pressed={filter === key} onClick={() => onFilter(key)}><i className={key} />{label}<span>{key === "all" ? events.length : events.filter((event) => event.kind === key).length}</span></button>)}
        <section><p>{uiText(locale, "TIME RANGE", "시간 범위")}</p><div className="range active">{uiText(locale, "Recorded snapshot", "기록 스냅샷")}</div></section>
      </aside>
      <section className="feed-list">
        <header><div><p>CANONICAL GRAPH · {uiText(locale, "SNAPSHOT", "스냅샷")} {revision}</p><h1>{uiText(locale, "What changed in the graph?", "기준 그래프에서 무엇이 바뀌었나?")}</h1></div></header>
        <div className="feed-date"><span>{operationalState ? uiText(locale, `Recorded · ${recordedDate}`, `기록됨 · ${recordedDate}`) : uiText(locale, "Recorded snapshot · 21 August", "기록 스냅샷 · 8월 21일")}</span><i /></div>
        {visible.length === 0 ? <div className="empty-feed"><b>{uiText(locale, "No recorded changes in this filter", "이 필터에 기록된 변경이 없습니다")}</b><span>{uiText(locale, "Choose another change type to continue.", "다른 변경 유형을 선택하세요.")}</span></div> : visible.map((event) => (
          <article className={`feed-card kind-${event.kind}`} key={event.id}>
            <div className="feed-glyph"><i>{event.kind === "state" ? "↗" : event.kind === "relation" ? "↔" : event.kind === "observation" ? "OB" : event.kind === "patch" ? "∆" : "✓"}</i><span /></div>
            <div className="feed-copy">
              <p><span>{event.kindLabel}</span><time>{event.time}</time><em className={`gate-badge ${event.gate}`}>{event.gate === "auto" ? uiText(locale, "AUTO · REVERSIBLE", "자동 · 되돌릴 수 있음") : event.gate === "human" ? uiText(locale, "HUMAN GATE", "사람 승인") : uiText(locale, "REVIEW CANDIDATE", "검토 후보")}</em></p>
              <h2>{event.title}</h2>
              <strong>{event.detail}</strong>
              <div><span><i>{event.actor === "REP Agent" ? "AI" : event.actor.slice(0, 2).toUpperCase()}</i>{event.actor}</span><span>근거 {event.evidenceCount}개</span><span>{event.evidenceBasis ? uiText(locale, "Basis: deterministic rule", "근거: 결정 규칙 일치") : uiText(locale, `Confidence ${Math.round(event.confidence * 100)}%`, `신뢰도 ${Math.round(event.confidence * 100)}%`)}</span></div>
            </div>
            <button type="button" onClick={() => event.kind === "patch" ? onOpenPatch() : onOpenEvent(event)}>{event.kind === "patch" ? uiText(locale, "Review patch", "패치 검토") : uiText(locale, "View on map", "지도에서 보기")} <span>→</span></button>
          </article>
        ))}
      </section>
      <aside className="feed-summary">
        <p>{operationalState ? uiText(locale, "D1 RECORDED STATE", "D1 기록 상태") : uiText(locale, "RECORDED SNAPSHOT · 21 AUG", "기록 스냅샷 · 8월 21일")}</p>
        <h2>{uiText(locale, "Review queue", "검토 대기열")}</h2>
        <div className="queue-summary"><strong>{reviewCount}</strong><span>{uiText(locale, "recorded changes need attention", "개의 기록된 변경에 확인이 필요합니다")}</span></div>
        <dl><div><dt>{uiText(locale, "Graph revision", "그래프 리비전")}</dt><dd>{revision}</dd></div><div><dt>{uiText(locale, "Recorded auto", "자동 기록")}</dt><dd>{autoApplied}</dd></div><div><dt>{uiText(locale, "Needs review", "검토 필요")}</dt><dd className="amber">{reviewCount}</dd></div><div><dt>{uiText(locale, "Human gate", "사람 승인")}</dt><dd className="red">{humanCount}</dd></div></dl>
        <section><p>{uiText(locale, "WAITING ON YOU", "확인 대기")}</p>{reviewCount > 0 ? <article><i>!</i><div><b>{uiText(locale, "PMG implementation source", "PMG 구현 소스")}</b><span>{pendingLabel}</span></div><button type="button" aria-label={uiText(locale, "Review PMG implementation source", "PMG 구현 소스 검토")} onClick={onOpenPatch}>→</button></article> : <div className="feed-summary-empty"><b>{uiText(locale, "No proposal waiting", "대기 중인 변경안 없음")}</b><span>{uiText(locale, "Approval and application counts are read from D1.", "승인과 반영 수치는 D1에서 읽습니다.")}</span></div>}</section>
        <section className="sensor-card"><p>{uiText(locale, "APPLIED SOURCE RELATION", "반영된 소스 관계")}</p><div><i className="recorded-source">◌</i><span><b>{appliedSource ? "GitHub commit" : uiText(locale, "No applied relation", "반영된 관계 없음")}</b><em>{appliedSource ? String(appliedSource.artifact.metadata.commit ?? appliedSource.artifact.sourceUrl).slice(0, 12) : uiText(locale, "No value is inferred from the fixture map.", "fixture 지도에서 값을 추정하지 않습니다.")}</em></span></div></section>
      </aside>
    </div>
  );
}

function DashboardView({
  state,
  connection,
  locale,
  onOpenPatch,
  onStartSource,
}: {
  state: OperationalState | null;
  connection: ConnectionState;
  locale: InterfaceLocale;
  onOpenPatch: () => void;
  onStartSource: () => void;
}) {
  if (!state) {
    return (
      <section className="dashboard-workspace dashboard-empty" id="main-content" aria-labelledby="dashboard-title">
        <header><small>D1 OPERATIONAL READ MODEL</small><h1 id="dashboard-title">{uiText(locale, "Loading recorded state…", "기록된 상태를 불러오는 중…")}</h1></header>
        <p>{connection === "snapshot" ? uiText(locale, "The server read model is unavailable. No values are inferred from the fixture map.", "서버 읽기 모델을 사용할 수 없습니다. fixture 지도에서 값을 추정하지 않습니다.") : uiText(locale, "Waiting for the server-confirmed read model.", "서버가 확인한 읽기 모델을 기다리고 있습니다.")}</p>
      </section>
    );
  }

  const counts = state.counts;
  const source = state.implementationSources[0];
  const nextAction = counts.proposalsApprovedNotApplied > 0
    ? { label: uiText(locale, "Apply the approved proposal", "승인된 변경안 반영"), action: onOpenPatch }
    : counts.proposalsPendingReview > 0
      ? { label: uiText(locale, "Review the human gate", "사람 승인 검토"), action: onOpenPatch }
      : source
        ? { label: uiText(locale, "Review PR merge separately", "PR 병합은 별도로 검토"), action: () => window.open(pmgVerifiedSource.source.pull_request, "_blank", "noopener,noreferrer") }
        : { label: uiText(locale, "Start the verified PMG source", "PMG 검증 소스 시작"), action: onStartSource };

  return (
    <section className="dashboard-workspace" id="main-content" aria-labelledby="dashboard-title">
      <header className="dashboard-hero">
        <div><small>PLUS MINUS G. · D1 READ MODEL</small><h1 id="dashboard-title">{uiText(locale, "Operational state, not a progress estimate", "추정 진척률이 아닌 운영 상태")}</h1><p>{uiText(locale, "Every value below is read from the same server state used by the applied source link and change feed.", "아래 값은 적용된 소스 연결과 변경 피드가 사용하는 동일한 서버 상태에서 읽습니다.")}</p></div>
        <span className="dashboard-asof"><small>{uiText(locale, "RECORDED AS OF", "기록 기준")}</small><b>{new Date(state.asOf.recordedAt).toLocaleString(locale === "en" ? "en-GB" : "ko-KR", { timeZone: "Asia/Seoul" })}</b></span>
      </header>

      <div className="dashboard-metrics" aria-label={uiText(locale, "Recorded operational counts", "기록된 운영 수치") }>
        <article><small>{uiText(locale, "OBSERVATIONS", "관측")}</small><strong>{counts.observations}</strong><span>{uiText(locale, "stored inputs", "저장된 입력")}</span></article>
        <article><small>{uiText(locale, "PENDING REVIEW", "검토 대기")}</small><strong>{counts.proposalsPendingReview}</strong><span>{uiText(locale, "human-gated proposals", "사람 승인 변경안")}</span></article>
        <article><small>{uiText(locale, "APPROVED / NOT APPLIED", "승인 / 미반영")}</small><strong>{counts.proposalsApprovedNotApplied}</strong><span>{uiText(locale, "separate apply required", "별도 반영 필요")}</span></article>
        <article><small>{uiText(locale, "APPLIED SOURCE LINKS", "반영된 소스 연결")}</small><strong>{counts.appliedImplementationSources}</strong><span>{uiText(locale, "Current-model relations", "Current 모델 관계")}</span></article>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-source">
          <header><small>{uiText(locale, "IMPLEMENTATION SOURCE", "구현 소스")}</small><span className={source ? "applied" : "absent"}>{source ? uiText(locale, "APPLIED", "반영됨") : uiText(locale, "NOT APPLIED", "미반영")}</span></header>
          {source ? <>
            <h2>{source.artifact.name}</h2>
            <p>{source.artifact.summary}</p>
            <dl><div><dt>{uiText(locale, "Relation", "관계")}</dt><dd>{source.predicate}</dd></div><div><dt>{uiText(locale, "Promotion state", "승격 상태")}</dt><dd>{String(source.properties.canonicalStatus ?? "unknown")}</dd></div><div><dt>{uiText(locale, "Revision", "리비전")}</dt><dd>{state.headRevisionId}</dd></div></dl>
            <a href={source.artifact.sourceUrl} target="_blank" rel="noreferrer">{uiText(locale, "Open exact commit", "정확한 커밋 열기")} ↗</a>
          </> : <div className="dashboard-source-empty"><i>◇</i><b>{uiText(locale, "No applied implementation source", "반영된 구현 소스가 없습니다")}</b><span>{uiText(locale, "A captured observation or an approval alone does not create this relation.", "관측 기록이나 승인만으로는 이 관계가 생기지 않습니다.")}</span></div>}
        </article>

        <article className="dashboard-integrity">
          <header><small>{uiText(locale, "INTEGRITY", "무결성")}</small><span>{state.source}</span></header>
          <ul>
            <li><i>✓</i><span><b>{uiText(locale, "Valid and recorded time", "유효 시간과 기록 시간")}</b><small>{uiText(locale, "Independent cutoffs preserved", "독립 기준 유지")}</small></span></li>
            <li><i>✓</i><span><b>{uiText(locale, "Approval ≠ application", "승인 ≠ 반영")}</b><small>{counts.proposalsApprovedNotApplied} {uiText(locale, "currently waiting after approval", "개가 승인 후 대기 중")}</small></span></li>
            <li><i>✓</i><span><b>{uiText(locale, "Source status remains bounded", "소스 상태 경계 유지")}</b><small>{uiText(locale, "PR pending merge is not main promotion", "PR 병합 대기는 main 승격이 아님")}</small></span></li>
          </ul>
        </article>

        <article className="dashboard-next">
          <small>{uiText(locale, "NEXT VALID ACTION", "다음 유효 동작")}</small><h2>{nextAction.label}</h2><p>{uiText(locale, "The action is derived from recorded proposal and source-link states, not from a completion score.", "이 동작은 완료율이 아니라 기록된 변경안과 소스 연결 상태에서 결정됩니다.")}</p><button type="button" onClick={nextAction.action}>{nextAction.label} <span>→</span></button>
        </article>
      </div>
    </section>
  );
}

function WorkEntryHome({
  locale,
  connection,
  revision,
  operationalState,
  onCapture,
  onVerifiedSource,
  onOpenDashboard,
}: {
  locale: InterfaceLocale;
  connection: ConnectionState;
  revision: string;
  operationalState: OperationalState | null;
  onCapture: (type: "quick" | "file" | "link" | "recorder", draft?: string) => void;
  onVerifiedSource: () => void;
  onOpenDashboard: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [scope, setScope] = useState<"pmg" | "ocp" | "rep">("pmg");
  const scopeLabels = {
    pmg: "Plus Minus G.",
    ocp: "OCP Reality Map v0",
    rep: "REP",
  } as const;
  const sourceStatus = connection === "connected"
    ? uiText(locale, "Source connected", "소스 연결됨")
    : connection === "checking"
      ? uiText(locale, "Checking source", "소스 확인 중")
      : uiText(locale, "Recorded snapshot", "기록 스냅샷");
  const appliedSource = operationalState?.implementationSources.some((source) => source.artifact.id === pmgSourceIds.artifact) ?? false;

  return (
    <section className="home-workspace" id="main-content" aria-labelledby="work-entry-title">
      <aside className="work-scope-rail" aria-label={uiText(locale, "Work scopes", "작업 범위")}>
        <header><small>{uiText(locale, "WORK SCOPE", "작업 범위")}</small><h2>±G. OCP</h2></header>
        <nav aria-label={uiText(locale, "Local context selection", "로컬 컨텍스트 선택")}>
          {(Object.keys(scopeLabels) as Array<keyof typeof scopeLabels>).map((key) => (
            <button key={key} className={scope === key ? "active" : ""} type="button" aria-pressed={scope === key} onClick={() => setScope(key)}>
              <i aria-hidden="true">{key === "pmg" ? "±" : key === "ocp" ? "O" : "R"}</i>
              <span><b>{scopeLabels[key]}</b><small>{uiText(locale, "Local selection", "로컬 선택")}</small></span>
            </button>
          ))}
        </nav>
        <section>
          <small>{uiText(locale, "INTENDED IMPORTS", "예정된 가져오기")}</small>
          <p><span>지영쌤</span><em>{uiText(locale, "Not imported", "미가져옴")}</em></p>
          <p><span>{uiText(locale, "Unsorted", "미분류")}</span><em>{uiText(locale, "Not connected", "미연결")}</em></p>
        </section>
        <footer><i>i</i><span>{uiText(locale, "Scope selection is a local display preference. No assistant context has been loaded.", "범위 선택은 로컬 화면 설정입니다. 에이전트 컨텍스트는 아직 불러오지 않았습니다.")}</span></footer>
      </aside>

      <div className="work-entry-main">
        <header>
          <span><i />{uiText(locale, "WORK ENTRY · LOCAL DRAFT", "작업 진입 · 로컬 초안")}</span>
          <h1 id="work-entry-title">{uiText(locale, "Begin anywhere. Continue here with context.", "어디에서 시작했든, 여기서 맥락과 함께 이어가세요.")}</h1>
          <p>{uiText(locale, "The assistant and context loader are not connected yet. Your draft can move into the existing governed input review without changing a Canonical model.", "에이전트와 컨텍스트 로더는 아직 연결되지 않았습니다. 초안은 Canonical 모델을 바꾸지 않고 기존의 거버넌스된 입력 검토 단계로 이동할 수 있습니다.")}</p>
        </header>

        <div className="work-composer">
          <label htmlFor="work-entry-draft">{uiText(locale, "What do you want to continue?", "무엇을 이어서 할까요?")}</label>
          <textarea id="work-entry-draft" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={uiText(locale, "Describe a direct observation, plan, forecast, hypothesis, or paste a note…", "직접 관측, 계획, 예측, 가정을 설명하거나 메모를 붙여 넣으세요…")} />
          <div className="capture-options" aria-label={uiText(locale, "Capture routes", "입력 경로")}>
            <button type="button" onClick={() => onCapture("file")}><i>▱</i>{uiText(locale, "File", "파일")}</button>
            <button type="button" onClick={() => onCapture("link")}><i>↗</i>{uiText(locale, "Link", "링크")}</button>
            <button type="button" onClick={() => onCapture("recorder")}><i>◌</i>{uiText(locale, "Recorder setup", "녹음 연결")}</button>
          </div>
          <footer>
            <label><small>{uiText(locale, "ASSISTANT", "에이전트")}</small><select disabled aria-label={uiText(locale, "Assistant adapter", "에이전트 어댑터")}><option>{uiText(locale, "No verified adapter", "검증된 어댑터 없음")}</option></select></label>
            <span className="adapter-status"><i />{uiText(locale, "NOT CONNECTED", "미연결")}</span>
            <button className="review-input" disabled={!draft.trim()} type="button" onClick={() => onCapture("quick", draft)}>{uiText(locale, "Move to input review", "입력 검토로 이동")} <span>→</span></button>
          </footer>
        </div>

        <div className="work-context-bar">
          <span><small>{uiText(locale, "LOCAL SCOPE", "로컬 범위")}</small><b>{scopeLabels[scope]}</b></span>
          <span><small>{uiText(locale, "SOURCE STATE", "소스 상태")}</small><b>{sourceStatus}</b></span>
          <span><small>{uiText(locale, "REVISION", "리비전")}</small><b>{revision}</b></span>
          <span><small>{uiText(locale, "MODEL EFFECT", "모델 영향")}</small><b>{uiText(locale, "None before approval", "승인 전 없음")}</b></span>
        </div>

        <article className={`verified-source-card ${appliedSource ? "applied" : "ready"}`}>
          <div className="verified-source-mark"><i>GH</i><span /></div>
          <div><small>{uiText(locale, "PMG REAL SOURCE · VERIFIED SNAPSHOT", "PMG 실자료 · 검증된 스냅샷")}</small><h2>OCP Harness Baseline v1</h2><p><code>{pmgVerifiedSource.source.commit.slice(0, 7)}</code> · Actions #{pmgVerifiedSource.verification.workflow_run_id} {pmgVerifiedSource.verification.result} · PR #1 {uiText(locale, "not merged", "미병합")}</p></div>
          <span className="verified-source-state">{appliedSource ? uiText(locale, "SOURCE LINK APPLIED", "소스 연결 반영됨") : uiText(locale, "READY FOR INTAKE", "입력 준비됨")}</span>
          <button type="button" onClick={appliedSource ? onOpenDashboard : onVerifiedSource}>{appliedSource ? uiText(locale, "Open dashboard", "대시보드 열기") : uiText(locale, "Review intake", "입력 검토")} <span>→</span></button>
        </article>
      </div>

      <aside className="work-boundary-panel" aria-label={uiText(locale, "Implementation boundary", "구현 경계")}>
        <header><small>{uiText(locale, "CURRENT BOUNDARY", "현재 구현 경계")}</small><h2>{uiText(locale, "What works now", "지금 가능한 것")}</h2></header>
        <section className="boundary-ready">
          <p><i>✓</i><span><b>{uiText(locale, "Governed input review", "거버넌스된 입력 검토")}</b><small>{uiText(locale, "Observation or candidate assertion", "관측 또는 후보 주장")}</small></span></p>
          <p><i>✓</i><span><b>{uiText(locale, "Immutable raw upload", "불변 원본 업로드")}</b><small>{uiText(locale, "Available to confirmed participants", "확인된 참여자에게 제공")}</small></span></p>
          <p><i>✓</i><span><b>{uiText(locale, "Human-gated model review", "사람 승인 모델 검토")}</b><small>{uiText(locale, "Approval stays separate from apply", "승인과 반영은 분리")}</small></span></p>
        </section>
        <section className="boundary-missing">
          <small>{uiText(locale, "NOT CONNECTED", "미연결")}</small>
          <p>{uiText(locale, "Main LLM · general context recognition · account imports · deployment registry", "Main LLM · 일반 컨텍스트 인식 · 계정 가져오기 · 배포 등록부")}</p>
        </section>
        <footer><b>{uiText(locale, "Target path", "목표 경로")}</b><span>{uiText(locale, "External tool → OCP input → candidate → review → event-backed state", "외부 도구 → OCP 입력 → 후보 → 검토 → 이벤트 기반 상태")}</span></footer>
      </aside>
    </section>
  );
}

function StandardsView({ locale }: { locale: InterfaceLocale }) {
  return (
    <section className="standards-workspace" id="main-content" aria-labelledby="standards-title">
      <header className="standards-hero">
        <div>
          <p>{uiText(locale, "OCP REFERENCE INDEX", "OCP 기준 문서 인덱스")}</p>
          <h1 id="standards-title">{uiText(locale, "Contracts, status, and operating rules", "계약·구현 상태·운영 기준")}</h1>
          <span>{uiText(locale, "Find the current source of truth and see what is actually implemented.", "현재 기준의 위치와 실제 구현 범위를 한곳에서 확인합니다.")}</span>
        </div>
        <span className="reference-boundary"><i>i</i>{uiText(locale, "Repository index · not canonical graph data", "저장소 문서 인덱스 · Canonical Graph 데이터 아님")}</span>
      </header>

      <div className="standards-notice" role="note">
        <i>!</i>
        <div>
          <b>{uiText(locale, "These documents are not inside OCP as governed objects yet.", "이 문서들은 아직 OCP 안의 거버넌스된 객체가 아닙니다.")}</b>
          <p>{uiText(locale, "They are versioned repository documents. This screen makes their locations discoverable without claiming that requirement ingestion or a Specification Registry exists.", "현재는 버전 관리되는 저장소 문서입니다. 이 화면은 위치를 찾게 해주지만, 요구사항 수집이나 Specification Registry가 구현된 것처럼 표시하지 않습니다.")}</p>
        </div>
      </div>

      <div className="standards-grid">
        <section className="reference-list" aria-labelledby="reference-documents-title">
          <header>
            <div><small>{uiText(locale, "SOURCE OF TRUTH", "현재 기준")}</small><h2 id="reference-documents-title">{uiText(locale, "Where each contract lives", "계약과 상태표가 있는 곳")}</h2></div>
            <span>{referenceDocuments.length} {uiText(locale, "references", "개 문서")}</span>
          </header>
          {referenceDocuments.map((document) => (
            <article className={`reference-card kind-${document.kind}`} key={document.id}>
              <i aria-hidden="true">{document.kind === "product-contract" ? "§" : document.kind === "implementation-ledger" ? "✓" : document.kind === "qa-record" ? "QA" : "◇"}</i>
              <div>
                <p><span>{interfaceLabel(locale, document.status)}</span><em>{uiText(locale, "REPOSITORY DOCUMENT", "저장소 문서")}</em></p>
                <h3>{interfaceLabel(locale, document.title)}</h3>
                <strong>{interfaceLabel(locale, document.summary)}</strong>
                <code>{document.path}</code>
              </div>
            </article>
          ))}
        </section>

        <div className="standards-side">
          <section className="runtime-status" aria-labelledby="runtime-status-title">
            <header><small>DEPLOYMENT TRUTH</small><h2 id="runtime-status-title">{uiText(locale, "Frozen Sites v0.5 snapshot", "동결된 Sites v0.5 스냅샷")}</h2></header>
            <p className="runtime-rule">DEPLOYED ≠ RUNTIME VERIFIED</p>
            <p>{uiText(locale, "Repository-recorded evidence, not a live Deployment Registry.", "저장소에 기록된 증거이며 실시간 Deployment Registry가 아닙니다.")}</p>
            <ol>
              {deploymentVerificationStages.map((stage) => (
                <li className={`state-${stage.state}`} key={stage.id}>
                  <i aria-hidden="true" />
                  <div>
                    <span><b>{interfaceLabel(locale, stage.label)}</b><em>{interfaceLabel(locale, deploymentStateLabels[stage.state])}</em></span>
                    <p>{interfaceLabel(locale, stage.detail)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <footer><b>CASE-RUNTIME-001</b><span>{uiText(locale, "Independent agent verification failed in one environment. This snapshot is not acceptance verified.", "한 환경에서 독립 에이전트 검증이 실패했습니다. 이 스냅샷은 인수 검증 상태가 아닙니다.")}</span></footer>
          </section>

          <aside className="language-status" aria-labelledby="language-status-title">
            <header><small>{uiText(locale, "LANGUAGE SYSTEM", "언어 체계")}</small><h2 id="language-status-title">{uiText(locale, "Four separate language controls", "서로 다른 네 가지 언어 제어")}</h2></header>
            <p>{uiText(locale, "Interface language changes labels only. It does not translate or overwrite stored content.", "인터페이스 언어는 화면 문구만 바꿉니다. 저장된 콘텐츠를 번역하거나 덮어쓰지 않습니다.")}</p>
            <div>
              {languageDimensions.map((dimension) => (
                <article className={dimension.available ? "available" : "unavailable"} key={dimension.id}>
                  <span><i />{interfaceLabel(locale, dimension.status)}</span>
                  <h3>{interfaceLabel(locale, dimension.title)}</h3>
                  <p>{interfaceLabel(locale, dimension.detail)}</p>
                </article>
              ))}
            </div>
            <footer>
              <b>{uiText(locale, "Current implementation boundary", "현재 구현 경계")}</b>
              <span>{uiText(locale, "Interface Locale is active on primary surfaces; dense detail panels remain partially localized. Translation and governed output language remain specification-only.", "인터페이스 언어는 핵심 화면에 우선 적용됐고 일부 상세 패널은 부분 한글화 상태입니다. 표시 번역과 거버넌스된 출력 언어는 아직 명세 단계입니다.")}</span>
            </footer>
          </aside>
        </div>
      </div>
    </section>
  );
}

function InputDrawer({
  open,
  type,
  observation,
  stateKind,
  validTime,
  sourceFile,
  sourceLink,
  onType,
  onObservation,
  onStateKind,
  onValidTime,
  onSourceFile,
  onSourceLink,
  onClose,
  onSubmit,
  requestState,
  error,
  actorLabel,
  locale,
}: {
  open: boolean;
  type: string;
  observation: string;
  stateKind: StateKind;
  validTime: string;
  sourceFile: File | null;
  sourceLink: string;
  onType: (type: string) => void;
  onObservation: (value: string) => void;
  onStateKind: (value: StateKind) => void;
  onValidTime: (value: string) => void;
  onSourceFile: (value: File | null) => void;
  onSourceLink: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  requestState: RequestState;
  error: string;
  actorLabel: string;
  locale: InterfaceLocale;
}) {
  const dialogRef = useModalFocus<HTMLElement>(open, onClose);
  if (!open) return null;
  const types = [["quick", "Quick observation", "✎"], ["file", "File", "▱"], ["link", "Link", "↗"], ["recorder", "REP Recorder", "●"]];
  const isDirectObservation = stateKind === "observed";
  const canSubmit = type === "recorder" || (type === "quick" && observation.trim().length > 0) || (type === "file" && sourceFile !== null) || (type === "link" && sourceLink.trim().length > 0);
  return (
    <div className="drawer-layer">
      <button className="drawer-backdrop" type="button" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <aside className="input-drawer" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="input-title" aria-busy={requestState === "saving"}>
        <header><div><small>{isDirectObservation ? "REALITY WINDOW" : "CANDIDATE ASSERTION"}</small><h2 id="input-title">{isDirectObservation ? "새 관측 기록" : "새 입력 제안"} <span>New input</span></h2></div><button data-autofocus type="button" aria-label="Close input" onClick={onClose}>×</button></header>
        <div className="input-principle"><i>◌</i><p><b>{isDirectObservation ? "현실 자체가 아니라 관측을 기록합니다." : "이 입력은 직접 관측이 아닌 모델 후보로 분리됩니다."}</b><span>{isDirectObservation ? "원본은 보존되고, 전사·구조화·해석은 별도 파생물로 저장됩니다." : "추론·계획·예측·가정은 근거와 함께 검토되며 제출만으로 기준 그래프를 바꾸지 않습니다."}</span></p></div>
        <nav aria-label="Input type">{types.map(([key, label, icon]) => <button className={type === key ? "active" : ""} key={key} type="button" aria-pressed={type === key} onClick={() => onType(key)}><i>{icon}</i><span>{label}</span></button>)}</nav>
        <form onSubmit={onSubmit}>
          {type === "quick" && (
            <section className="quick-input">
              <label htmlFor="observation">{isDirectObservation ? "OBSERVATION · 직접 관측" : "CANDIDATE ASSERTION · 모델 후보"}</label>
              <textarea id="observation" value={observation} onChange={(event) => onObservation(event.target.value)} placeholder={isDirectObservation ? "What did you directly observe? Keep interpretation separate…" : "Describe the inference, plan, forecast, or hypothesis and its basis…"} />
              <div className="interpretation-warning"><i>i</i><span>“The meeting ended at 11:02” is an observation. “The team is disengaged” is an interpretation.</span></div>
            </section>
          )}
          {type === "file" && <section className="file-input"><i>⇧</i><h3>{sourceFile ? sourceFile.name : "원본 파일 놓기"}</h3><p>{sourceFile ? `${Math.ceil(sourceFile.size / 1024)} KB · immutable raw artifact` : "Audio, image, document, or structured data"}</p><label htmlFor="file-input">Choose file</label><input id="file-input" type="file" onChange={(event) => onSourceFile(event.target.files?.[0] ?? null)} /></section>}
          {type === "link" && <section className="link-input"><label htmlFor="source-link">SOURCE URL</label><input id="source-link" type="url" value={sourceLink} onChange={(event) => onSourceLink(event.target.value)} placeholder="https://…" /><p>The URL and capture context are preserved; derived claims remain separate.</p></section>}
          {type === "recorder" && <section className="recorder-input"><div className="recorder-orbit"><i>◌</i><span /></div><small>SENSOR CONNECTION</small><h3>REP Recorder</h3><p>Recorder에서 이 OCP Workspace를 선택하면 원음, 타임스탬프, 기기 메타데이터가 원본으로 들어옵니다.</p><span className="connection-state"><i /> Connection required</span><span className="setup-note">Setup is completed in REP Recorder.</span></section>}
          {type !== "recorder" && (
            <section className="metadata-block">
              <p><b>BITEMPORAL METADATA</b><span>Captured with provenance</span></p>
              <div><label><small>Valid time · 언제 유효했나?</small><input aria-label="Valid time" type="datetime-local" value={validTime} onChange={(event) => onValidTime(event.target.value)} /></label><span><small>Recorded time · 언제 기록했나?</small><b>System generated on save</b></span><span><small>Actor</small><b>{actorLabel}</b></span><span><small>Capture</small><b>{type === "quick" ? "Manual" : type}</b></span></div>
              <label>{uiText(locale, "STATE TYPE", "상태 유형")}<select value={stateKind} onChange={(event) => onStateKind(event.target.value as StateKind)}>{(Object.keys(stateKindLabels) as StateKind[]).map((kind) => <option key={kind} value={kind}>{interfaceLabel(locale, stateKindLabels[kind])}</option>)}</select></label>
              <label>CONTEXT · OPTIONAL<select defaultValue="ocp"><option value="ocp">OCP Reality Map v0</option><option value="rep">Recorder Evidence Bridge</option><option value="none">No project</option></select></label>
            </section>
          )}
          {error && <div className="request-error" role="alert"><i>!</i><span><b>Not saved · 저장되지 않음</b>{error}<small>Your draft remains available for retry.</small></span></div>}
          <footer><span><i>✓</i> Raw source remains immutable</span><button disabled={!canSubmit || requestState === "saving"} type="submit">{requestState === "saving" ? "Saving input…" : type === "recorder" ? "Done" : isDirectObservation ? "관측 기록 + 후보 생성" : "후보 입력 제출"} <i>→</i></button></footer>
        </form>
      </aside>
    </div>
  );
}

function PatchReviewDrawer({
  open,
  proposal,
  decision,
  onClose,
  onDecision,
  onApply,
  requestState,
  error,
  applied,
  canReview,
  applyAvailable,
  locale,
}: {
  open: boolean;
  proposal: PatchProposalDetail | null;
  decision: "pending" | "approved" | "rejected" | "evidence" | "deferred";
  onClose: () => void;
  onDecision: (decision: "approved" | "rejected" | "evidence" | "deferred") => void;
  onApply: () => void;
  requestState: RequestState;
  error: string;
  applied: boolean;
  canReview: boolean;
  applyAvailable: boolean;
  locale: InterfaceLocale;
}) {
  const dialogRef = useModalFocus<HTMLElement>(open, onClose);
  if (!open) return null;
  const dynamic = proposal?.id === pmgSourceIds.proposal;
  const title = proposal?.title ?? "Reference Model Patch #014";
  const baseRevision = proposal?.base_revision_id?.replace(/^revision-/, "") ?? "r214";
  const currentStatus = proposal?.status ?? (decision === "pending" ? "pending_review" : decision);
  const dynamicOperation = dynamic && proposal?.operations[0]?.after_json ? (() => { try { return JSON.parse(String(proposal.operations[0].after_json)) as Record<string, unknown>; } catch { return null; } })() : null;
  return (
    <div className="drawer-layer">
      <button className="drawer-backdrop" type="button" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <aside className="patch-drawer" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="patch-title" aria-busy={requestState === "saving"}>
        <header><div><small>HUMAN GATE · {dynamic ? "CURRENT MODEL SOURCE LINK" : "REFERENCE MODEL"}</small><h2 id="patch-title">{title}</h2><p>Base revision {baseRevision} · {uiText(locale, "approval does not apply the patch", "승인만으로 변경안은 반영되지 않습니다")}</p></div><button data-autofocus type="button" aria-label="Close patch review" onClick={onClose}>×</button></header>
        <div className="pipeline" aria-label="Validation pipeline">
          <span className="done">{uiText(locale, "Input", "입력")}<i>✓</i></span><b>→</b><span className="done">{uiText(locale, "Classified", "분류") }<i>✓</i></span><b>→</b><span className="done">{uiText(locale, "Evidence", "근거")}<i>✓</i></span><b>→</b><span className={currentStatus === "pending_review" ? "active" : "done"}>{uiText(locale, "Human gate", "사람 승인")}<i>{currentStatus === "pending_review" ? "!" : "✓"}</i></span><b>→</b><span className={currentStatus === "applied" ? "done" : currentStatus === "approved" ? "active" : "waiting"}>{uiText(locale, "Apply", "반영")}<i>{currentStatus === "applied" ? "✓" : "·"}</i></span>
        </div>
        {dynamic ? <section className="patch-summary dynamic-patch-summary">
          <p><b>{uiText(locale, "DETERMINISTIC CLASSIFICATION", "결정 규칙 기반 분류")}</b><em>1 operation · reversible</em></p>
          <article><i>↗</i><div><small>SOURCE · GITHUB COMMIT</small><b>{pmgVerifiedSource.source.repository} @ {pmgVerifiedSource.source.commit.slice(0, 7)}</b><span>Actions #{pmgVerifiedSource.verification.workflow_run_id} {pmgVerifiedSource.verification.result} · artifact digest preserved</span></div></article>
          <article><i>◇</i><div><small>SCOPE · EXACT IDENTIFIER MATCH</small><b>Plus Minus G. → OCP</b><span>No probability invented · repository and scope rule recorded</span></div></article>
          <article><i>＋</i><div><small>RELATION · LINK</small><b>Plus Minus G. → {String(dynamicOperation?.predicate ?? "TRACKS_IMPLEMENTATION_SOURCE")} → verified source</b><span>Current model · candidate_pr_pending_merge · HUMAN gate</span></div></article>
        </section> : <section className="patch-summary">
          <p><b>GRAPH DIFF</b><em>3 operations · reversible</em></p>
          <article><i>＋</i><div><small>RELATION · INSERT</small><b>Recorder Evidence Bridge → DEPENDS ON → OCP v0</b><span>Confidence 88% · 2 supporting evidence items</span></div></article>
          <article><i>↗</i><div><small>STATE · SUPERSEDE</small><b>Evidence review: Reviewing → Accepted candidate</b><span>Valid 21 Aug 13:40 · Recorded 21 Aug 13:54</span></div></article>
          <article><i>◇</i><div><small>REFERENCE MODEL · LINK</small><b>REP generation: Current → Direct predecessor</b><span>This operation raises the gate to HUMAN.</span></div></article>
        </section>}
        {dynamic ? <section className="verification-grid dynamic-verification-grid">
          {(proposal?.checks ?? []).map((check) => <article key={String(check.id)}><small>{String(check.checker_role ?? "CHECK").toUpperCase()} · {String(check.status ?? "unknown").toUpperCase()}</small><b>{String(check.checker_name ?? "Validation check")}</b><span>{String(check.status) === "warning" ? "PR #1 is not merged; source stays a candidate." : "Recorded check passed against the exact source manifest."}</span></article>)}
          <article><small>{uiText(locale, "RISK", "위험")}</small><b>{String(proposal?.risk_level ?? "high").toUpperCase()} · authority-bearing link</b><span>{uiText(locale, "No deletion. A later unlink revision can reverse this relation.", "삭제 없음. 이후 unlink 리비전으로 관계를 되돌릴 수 있습니다.")}</span></article>
        </section> : <section className="verification-grid">
          <article><small>PROVENANCE</small><b>Workshop audio → Transcript v1 → EV-029</b><span>Raw artifact immutable · lineage intact</span></article>
          <article><small>ADVERSARIAL CHECK</small><b>1 ambiguity, no identity collision</b><span>Claude challenge recommends explicit valid time.</span></article>
          <article><small>RISK</small><b>Medium · structural reference change</b><span>No deletion. Rollback patch can restore r214.</span></article>
          <article><small>CONSTITUTIONAL RULE</small><b>Reference changes require a human</b><span>Client requests cannot lower this gate.</span></article>
        </section>}
        {error && <div className="request-error patch-error" role="alert"><i>!</i><span><b>{uiText(locale, "Command not recorded", "명령이 기록되지 않았습니다")}</b>{error}</span></div>}
        {(decision !== "pending" || ["approved", "applied", "rejected"].includes(currentStatus)) && <div className={`patch-decision ${currentStatus}`}>{currentStatus === "approved" ? uiText(locale, "Approved · not applied", "승인됨 · 아직 미반영") : currentStatus === "applied" || applied ? uiText(locale, "Applied · revision recorded", "반영됨 · 리비전 기록됨") : `${uiText(locale, "Decision recorded", "결정 기록됨")}: ${currentStatus}`}</div>}
        <footer>{canReview ? currentStatus === "approved" && dynamic && applyAvailable ? <><span className="apply-separation-note">{uiText(locale, "Approval is recorded. Apply is a separate Current-model command.", "승인이 기록되었습니다. 반영은 별도의 Current 모델 명령입니다.")}</span><button className="apply-command" disabled={requestState === "saving"} type="button" onClick={onApply}>{requestState === "saving" ? uiText(locale, "Applying…", "반영 중…") : uiText(locale, "Apply approved change", "승인된 변경 반영")}</button></> : currentStatus === "applied" ? <p className="patch-read-only">{uiText(locale, "Applied. The resulting revision is now available to Map, Feed, and Dashboard.", "반영되었습니다. 생성된 리비전을 지도·변경·대시보드에서 함께 읽습니다.")}</p> : <><button disabled={requestState === "saving"} type="button" onClick={() => onDecision("rejected")}>Reject</button><button disabled={requestState === "saving"} type="button" onClick={() => onDecision("evidence")}>Request evidence</button><button disabled={requestState === "saving"} type="button" onClick={() => onDecision("deferred")}>Defer</button><button className="approve" disabled={requestState === "saving"} type="button" onClick={() => onDecision("approved")}>{requestState === "saving" ? "Recording…" : "Approve · do not apply"}</button></> : <p className="patch-read-only">This is a human gate. A reviewer or owner can record a decision; participants can inspect the evidence and add observations.</p>}</footer>
      </aside>
    </div>
  );
}

type CommandItem = { id: string; label: string; description: string; keywords: string; glyph: string; run: () => void };

function localDateTimeValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

async function apiErrorMessage(response: Response) {
  try {
    const payload = await response.json() as { error?: string };
    return payload.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

function CommandPalette({
  open,
  commands,
  onOpenObject,
  onClose,
  locale,
}: {
  open: boolean;
  commands: CommandItem[];
  onOpenObject: (record: SearchRecord) => void;
  onClose: () => void;
  locale: InterfaceLocale;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const closePalette = useCallback(() => {
    setQuery("");
    setActiveIndex(0);
    onClose();
  }, [onClose]);
  const dialogRef = useModalFocus<HTMLElement>(open, closePalette);
  const normalized = query.trim().toLowerCase();
  const matchingCommands = commands.filter((item) => !normalized || `${item.label} ${item.description} ${item.keywords}`.toLowerCase().includes(normalized));
  const matchingObjects = searchableNodes.filter((item) => !normalized || `${item.label} ${item.kicker} ${item.subtitle}`.toLowerCase().includes(normalized)).slice(0, 7);
  const results = [
    ...matchingCommands.map((item) => ({ kind: "command" as const, id: `command-${item.id}`, item })),
    ...matchingObjects.map((item) => ({ kind: "object" as const, id: `object-${item.nodeId}`, item })),
  ];

  if (!open) return null;
  const runResult = (index: number) => {
    const result = results[index];
    if (!result) return;
    if (result.kind === "command") result.item.run();
    else onOpenObject(result.item);
    closePalette();
  };
  const handleKey = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => results.length ? (current + 1) % results.length : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => results.length ? (current - 1 + results.length) % results.length : 0);
    } else if (event.key === "Enter") {
      event.preventDefault();
      runResult(activeIndex);
    }
  };

  return (
    <div className="search-layer">
      <button className="drawer-backdrop" type="button" tabIndex={-1} aria-hidden="true" onClick={closePalette} />
      <section className="command-palette" ref={dialogRef} role="dialog" aria-modal="true" aria-label={uiText(locale, "Find OCP objects and commands", "OCP 객체와 명령 찾기")}>
        <header className="command-input"><span aria-hidden="true">⌕</span><input data-autofocus value={query} onKeyDown={handleKey} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} placeholder={uiText(locale, "Search objects or run a command…", "객체를 찾거나 명령을 실행하세요…")} role="combobox" aria-expanded="true" aria-controls="command-results" aria-activedescendant={results[activeIndex]?.id} /><button type="button" aria-label={uiText(locale, "Close command palette", "명령 팔레트 닫기")} onClick={closePalette}>×</button></header>
        <p>{uiText(locale, "COMMANDS & OBJECTS", "명령과 객체")} · {results.length} {uiText(locale, "RESULTS", "개 결과")}</p>
        <div id="command-results" role="listbox" aria-label={uiText(locale, "Command results", "명령 결과")}>
          {results.map((result, index) => (
            <button className={activeIndex === index ? "active" : ""} id={result.id} key={result.id} type="button" role="option" aria-selected={activeIndex === index} onMouseEnter={() => setActiveIndex(index)} onClick={() => runResult(index)}>
              {result.kind === "command" ? <i className="command-glyph">{result.item.glyph}</i> : <i className={`mini-node kind-${result.item.kind}`}>{glyphFor({ kind: result.item.kind, label: result.item.label })}</i>}
              <span><b>{result.item.label}</b><small>{result.kind === "command" ? result.item.description : `${viewSpecs[result.item.projection].label} · ${result.item.kicker}`}</small></span><em>↵</em>
            </button>
          ))}
          {results.length === 0 && <div className="command-empty"><b>{uiText(locale, "No matching object or command", "일치하는 객체나 명령이 없습니다")}</b><span>{uiText(locale, "Try a canonical name, view, or action.", "Canonical 이름, 보기, 동작으로 검색해 보세요.")}</span></div>}
        </div>
        <footer><span><kbd>↑↓</kbd> {uiText(locale, "Navigate", "이동")}</span><span><kbd>↵</kbd> {uiText(locale, "Run", "실행")}</span><span><kbd>ESC</kbd> {uiText(locale, "Close", "닫기")}</span></footer>
      </section>
    </div>
  );
}

export function OcpApp({ initialView = "home" }: { initialView?: AppView }) {
  const [view, setView] = useState<AppView>(initialView);
  const [interfaceLocale, setInterfaceLocale] = useState<InterfaceLocale>("ko");
  const [localeReady, setLocaleReady] = useState(false);
  const [projection, setProjection] = useState<ProjectionKey>("product-project");
  const [modelMode, setModelMode] = useState<ModelMode>("overlay");
  const [perspective, setPerspective] = useState<PerspectiveKey>("team");
  const [repLens, setRepLens] = useState<RepLens>("all");
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ goal: true, current: true, reference: true, evidence: false });
  const [selectedId, setSelectedId] = useState("project-ocp-v0");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [mobileInspectorEngaged, setMobileInspectorEngaged] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("state");
  const [timeIndex, setTimeIndex] = useState(3);
  const [recordedIndex, setRecordedIndex] = useState(recordedTimeOptions.length - 1);
  const [zoom, setZoom] = useState(86);
  const [overlayBalance, setOverlayBalance] = useState(50);
  const [inputOpen, setInputOpen] = useState(false);
  const [inputType, setInputType] = useState("quick");
  const [observation, setObservation] = useState("");
  const [observationKind, setObservationKind] = useState<StateKind>("observed");
  const [observationValidTime, setObservationValidTime] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceLink, setSourceLink] = useState("");
  const [inputRequest, setInputRequest] = useState<RequestState>("idle");
  const [inputError, setInputError] = useState("");
  const [feedFilter, setFeedFilter] = useState("all");
  const [extraEvents, setExtraEvents] = useState<FeedEvent[]>([]);
  const [toast, setToast] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [patchOpen, setPatchOpen] = useState(false);
  const [patchDecision, setPatchDecision] = useState<"pending" | "approved" | "rejected" | "evidence" | "deferred">("pending");
  const [patchRequest, setPatchRequest] = useState<RequestState>("idle");
  const [patchError, setPatchError] = useState("");
  const [patchApplied, setPatchApplied] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>("checking");
  const [revision, setRevision] = useState("r214");
  const [operationalState, setOperationalState] = useState<OperationalState | null>(null);
  const [participation, setParticipation] = useState<ParticipationState>("checking");
  const [participationError, setParticipationError] = useState("");
  const [activeProposalId, setActiveProposalId] = useState("patch-reference-014");
  const [activeProposal, setActiveProposal] = useState<PatchProposalDetail | null>(null);

  const graph = useMemo(() => projectCanonicalGraph(projection, timelinePoints[timeIndex].validAt, recordedTimeOptions[recordedIndex].recordedAt, repLens, preferredModelFor(perspective)), [projection, timeIndex, recordedIndex, repLens, perspective]);
  const primaryLayer = primaryLayerFor(modelMode, layers, perspective);
  const visibleGraph = useMemo(() => graphForLayers(graph, layers, modelMode), [graph, layers, modelMode]);
  const selectedNode = visibleGraph.nodes.find((node) => node.id === selectedId) ?? visibleGraph.nodes.find((node) => node.id === visibleGraph.focusId) ?? graph.nodes[0];
  const serverEvents = useMemo(() => operationalFeedEvents(operationalState), [operationalState]);
  const events = useMemo<DisplayFeedEvent[]>(() => {
    const source = operationalState ? [...extraEvents, ...serverEvents] : [...extraEvents, ...feedEvents];
    return source.filter((event, index) => source.findIndex((candidate) => candidate.id === event.id) === index).slice(0, 50);
  }, [extraEvents, operationalState, serverEvents]);

  const refreshOperationalState = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/bootstrap", { signal, headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Source returned ${response.status}`);
    const payload = await response.json() as { headRevision?: { id?: string } | null; operationalState?: OperationalState };
    const id = payload.operationalState?.headRevisionId ?? payload.headRevision?.id;
    if (id) setRevision(id.replace(/^revision-/, ""));
    if (payload.operationalState) setOperationalState(payload.operationalState);
    setConnection("connected");
    return payload.operationalState ?? null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const storedLocale = window.localStorage.getItem("ocp.interface-locale");
        if (storedLocale === "ko" || storedLocale === "en" || storedLocale === "dual") setInterfaceLocale(storedLocale);
      } catch {
        // The default Korean locale remains usable when storage is unavailable.
      }
      setLocaleReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = interfaceLocale === "dual" ? "ko" : interfaceLocale;
    if (!localeReady) return;
    try {
      window.localStorage.setItem("ocp.interface-locale", interfaceLocale);
    } catch {
      // Locale still works for the current session when storage is unavailable.
    }
  }, [interfaceLocale, localeReady]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      refreshOperationalState(controller.signal)
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setConnection("snapshot");
        });
    });
    return () => controller.abort();
  }, [refreshOperationalState]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workspace-members/me", { signal: controller.signal, headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error(await apiErrorMessage(response));
        return response.json() as Promise<{ authenticated?: boolean; membership?: { role?: WorkspaceRole } | null }>;
      })
      .then((payload) => {
        if (!payload.authenticated) {
          setParticipation("anonymous");
          return;
        }
        const role = payload.membership?.role;
        setParticipation(role === "viewer" || role === "writer" || role === "reviewer" || role === "admin" ? role : "visitor");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setParticipation("unavailable");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape" && !searchOpen && !patchOpen && !inputOpen) setInspectorOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [inputOpen, patchOpen, searchOpen]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const chooseProjection = useCallback((next: ProjectionKey) => {
    setProjection(next);
    if (!viewSpecs[next].entityKinds.includes(selectedNode.kind)) setSelectedId(viewSpecs[next].focusId);
    setInspectorOpen(true);
  }, [selectedNode.kind]);

  const selectNode = useCallback((node: GraphNode) => {
    setSelectedId(node.id);
    setInspectorOpen(true);
    setMobileInspectorEngaged(true);
  }, []);

  const toggleLayer = useCallback((layer: LayerKey) => {
    setLayers((current) => {
      if (modelMode === "single") return { goal: false, current: false, reference: false, evidence: false, [layer]: true };
      if (current[layer] && Object.values(current).filter(Boolean).length === 1) return current;
      return { ...current, [layer]: !current[layer] };
    });
  }, [modelMode]);

  const chooseMode = useCallback((next: ModelMode) => {
    setModelMode(next);
    if (next === "single") setLayers({ goal: false, current: true, reference: false, evidence: false });
    else if (next === "split" || next === "diff") setLayers({ goal: false, current: true, reference: true, evidence: false });
    else setLayers({ goal: true, current: true, reference: true, evidence: false });
  }, []);

  const joinWorkspace = useCallback(async () => {
    if (participation === "anonymous") {
      window.location.assign("/signin-with-chatgpt?return_to=%2F");
      return;
    }
    if (participation !== "visitor") return;
    setParticipation("checking");
    setParticipationError("");
    try {
      const response = await fetch("/api/workspace-members/me", { method: "POST", headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(await apiErrorMessage(response));
      const payload = await response.json() as { membership?: { role?: WorkspaceRole } };
      const role = payload.membership?.role;
      if (role !== "writer" && role !== "reviewer" && role !== "admin") throw new Error("The server did not grant a participation role.");
      setParticipation(role);
      setToast("Participation enabled. You can record observations; model approvals remain gated.");
    } catch (error) {
      setParticipation("visitor");
      setParticipationError(error instanceof Error ? error.message : "Participation was not enabled.");
    }
  }, [participation]);

  const openInput = useCallback(() => {
    if (!canContribute(participation)) {
      void joinWorkspace();
      return;
    }
    if (!observationValidTime) setObservationValidTime(localDateTimeValue(new Date()));
    setInputError("");
    setInputRequest("idle");
    setInputOpen(true);
  }, [joinWorkspace, observationValidTime, participation]);

  const beginWorkCapture = useCallback((type: "quick" | "file" | "link" | "recorder", draft = "") => {
    setInputType(type);
    if (draft) setObservation(draft);
    openInput();
  }, [openInput]);

  const beginVerifiedPmgSource = useCallback(() => {
    setInputType("link");
    setSourceLink(pmgVerifiedSource.source.url);
    setObservation("OCP Harness Baseline v1 verified implementation source");
    setObservationKind("observed");
    openInput();
  }, [openInput]);

  const loadPatchProposal = useCallback(async (proposalId: string) => {
    const response = await fetch(`/api/patch-proposals/${encodeURIComponent(proposalId)}`, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(await apiErrorMessage(response));
    const payload = await response.json() as { proposal?: PatchProposalDetail };
    if (!payload.proposal?.id) throw new Error("The server returned no patch proposal.");
    setActiveProposal(payload.proposal);
    setActiveProposalId(payload.proposal.id);
    setPatchApplied(payload.proposal.status === "applied");
    setPatchDecision(payload.proposal.status === "approved" || payload.proposal.status === "applied" ? "approved" : payload.proposal.status === "rejected" ? "rejected" : "pending");
    return payload.proposal;
  }, []);

  const openPatchReview = useCallback((proposalId = "patch-reference-014") => {
    setPatchError("");
    setPatchRequest("idle");
    setActiveProposalId(proposalId);
    void loadPatchProposal(proposalId).catch((error) => {
      setActiveProposal(null);
      setPatchError(error instanceof Error ? error.message : "The proposal could not be loaded.");
    });
    setPatchOpen(true);
  }, [loadPatchProposal]);

  const openAgent = useCallback(() => {
    setProjection("team");
    setSelectedId("agent-rep");
    setInspectorTab("state");
    setInspectorOpen(true);
    setMobileInspectorEngaged(true);
    setView("map");
  }, []);

  const openEvent = (event: FeedEvent) => {
    setProjection(event.projection);
    setSelectedId(event.nodeId);
    setInspectorTab("history");
    setInspectorOpen(true);
    setMobileInspectorEngaged(true);
    setTimeIndex(event.timelineIndex);
    setView("map");
  };

  const saveObservation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inputRequest === "saving") return;
    if (inputType === "recorder") {
      setInputOpen(false);
      return;
    }
    const title = observation.trim() || (inputType === "file" ? sourceFile?.name ?? "새 원본 파일" : sourceLink.trim() || "새 링크 관측");
    let artifactId: string | undefined;
    setInputRequest("saving");
    setInputError("");
    try {
      const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `input-${Date.now()}`;
      if (inputType === "file" && sourceFile) {
        const artifactResponse = await fetch("/api/artifacts", { method: "POST", headers: { "content-type": sourceFile.type || "application/octet-stream", "x-original-filename": sourceFile.name }, body: sourceFile });
        if (!artifactResponse.ok) throw new Error(await apiErrorMessage(artifactResponse));
        artifactId = ((await artifactResponse.json()) as { artifact?: { id?: string } }).artifact?.id;
        if (!artifactId) throw new Error("The source upload returned no artifact ID.");
      }
      const observationResponse = await fetch("/api/observations", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey }, body: JSON.stringify({ text: title, captureMethod: inputType, stateKind: observationKind, validFrom: new Date(observationValidTime).getTime(), contextId: "context-ocp", artifactId, sourceUrl: inputType === "link" ? sourceLink.trim() : undefined, idempotencyKey }) });
      if (!observationResponse.ok) throw new Error(await apiErrorMessage(observationResponse));
      const payload = await observationResponse.json() as { observation?: { id?: string }; candidates?: number; canonicalChanged?: boolean; proposalId?: string; proposalStatus?: string; classification?: { basis?: string; scope_entity_id?: string; canonical_status?: string } };
      if (!payload.observation?.id) throw new Error("The server confirmed no observation ID.");
      const candidateCount = payload.candidates ?? 0;
      setExtraEvents((current) => [{
        id: payload.observation!.id!,
        kind: "observation",
        kindLabel: observationKind === "observed" ? "관측 기록" : "후보 입력",
        title: title.slice(0, 46),
        detail: `${candidateCount} graph candidates created. Canonical models remain unchanged.`,
        time: "recorded",
        actor: participationLabel(interfaceLocale, participation),
        evidenceCount: artifactId ? 1 : 0,
        confidence: observationKind === "observed" ? 0.7 : 0.6,
        nodeId: viewSpecs["product-project"].focusId,
        projection: "product-project",
        gate: "auto",
        timelineIndex: 3,
      }, ...current].slice(0, 50));
      setObservation("");
      setSourceFile(null);
      setSourceLink("");
      setInputRequest("idle");
      setInputOpen(false);
      await refreshOperationalState();
      if (payload.proposalId === pmgSourceIds.proposal) {
        await loadPatchProposal(payload.proposalId);
        setPatchOpen(true);
        setToast(uiText(interfaceLocale, "Source recorded and classified. A human-gated change was proposed; the Current model is unchanged.", "소스가 기록·분류되었습니다. 사람 승인이 필요한 변경안이 생성됐고 Current 모델은 바뀌지 않았습니다."));
      } else {
        setToast(uiText(interfaceLocale, `Input recorded. ${candidateCount} candidates created; Canonical models were not changed.`, `입력이 기록되었습니다. 후보 ${candidateCount}개가 생성되었고 Canonical 모델은 변경되지 않았습니다.`));
      }
    } catch (error) {
      setInputRequest("error");
      setInputError(error instanceof Error ? error.message : "Connection unavailable. The input was not saved.");
    }
  };

  const decidePatch = async (decision: "approved" | "rejected" | "evidence" | "deferred") => {
    if (patchRequest === "saving") return;
    setPatchRequest("saving");
    setPatchError("");
    try {
      const response = await fetch(`/api/patch-proposals/${encodeURIComponent(activeProposalId)}/decision`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision }) });
      if (!response.ok) throw new Error(await apiErrorMessage(response));
      const payload = await response.json() as { decision?: typeof decision; applied?: boolean };
      if (payload.decision !== decision) throw new Error("The server did not confirm this decision.");
      setPatchDecision(decision);
      setPatchApplied(payload.applied === true);
      setPatchRequest("idle");
      await loadPatchProposal(activeProposalId);
      await refreshOperationalState();
      setToast(decision === "approved" ? `Patch approved · ${payload.applied ? "applied" : "not applied"}` : `Patch decision recorded: ${decision}`);
    } catch (error) {
      setPatchRequest("error");
      setPatchError(error instanceof Error ? error.message : "Connection unavailable. The decision was not recorded.");
    }
  };

  const applyPatch = async () => {
    if (patchRequest === "saving") return;
    setPatchRequest("saving");
    setPatchError("");
    try {
      const response = await fetch(`/api/patch-proposals/${encodeURIComponent(activeProposalId)}/apply`, { method: "POST", headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(await apiErrorMessage(response));
      const payload = await response.json() as { applied?: boolean; revisionId?: string; status?: string };
      if (!payload.applied || payload.status !== "applied" || !payload.revisionId) throw new Error("The server did not confirm an applied revision.");
      setPatchApplied(true);
      setPatchDecision("approved");
      setPatchRequest("idle");
      await loadPatchProposal(activeProposalId);
      await refreshOperationalState();
      setToast(uiText(interfaceLocale, "Applied. Map, Feed, and Dashboard now read the new revision.", "반영되었습니다. 지도·변경·대시보드가 새 리비전을 함께 읽습니다."));
    } catch (error) {
      setPatchRequest("error");
      setPatchError(error instanceof Error ? error.message : "The approved change was not applied.");
    }
  };

  const openSearchResult = (result: SearchRecord) => {
    setProjection(result.projection);
    setSelectedId(result.nodeId);
    setInspectorOpen(true);
    setMobileInspectorEngaged(true);
    setView("map");
  };

  const commands: CommandItem[] = [
    { id: "home", label: uiText(interfaceLocale, "Open work entry", "작업 진입 열기"), description: uiText(interfaceLocale, "Continue a draft through the governed input path", "초안을 거버넌스된 입력 경로로 이어가기"), keywords: "home work chat context 작업 홈 대화", glyph: "＋", run: () => setView("home") },
    { id: "map", label: uiText(interfaceLocale, "Open operating map", "운영 지도 열기"), description: uiText(interfaceLocale, "Inspect the recorded graph projection", "기록된 그래프 투영 확인"), keywords: "map graph 지도 그래프", glyph: "⌘", run: () => setView("map") },
    { id: "feed", label: uiText(interfaceLocale, "Open change feed", "변경 피드 열기"), description: uiText(interfaceLocale, "Review recorded revisions and gates", "기록된 리비전과 게이트 검토"), keywords: "feed changes revisions 변경 피드", glyph: "↗", run: () => setView("feed") },
    { id: "dashboard", label: uiText(interfaceLocale, "Open operational dashboard", "운영 대시보드 열기"), description: uiText(interfaceLocale, "Read D1 counts, source links, integrity, and next action", "D1 수치·소스 연결·무결성·다음 동작 확인"), keywords: "dashboard state source 대시보드 상태 소스", glyph: "▦", run: () => setView("dashboard") },
    { id: "standards", label: uiText(interfaceLocale, "Open OCP standards", "OCP 기준 열기"), description: uiText(interfaceLocale, "Find contracts, status, and language boundaries", "계약·구현 상태·언어 경계 확인"), keywords: "standards contract status 기준 계약 상태", glyph: "§", run: () => setView("standards") },
    { id: "input", label: uiText(interfaceLocale, "Record an input", "입력 기록"), description: uiText(interfaceLocale, "Capture an observation or candidate assertion", "관측 또는 후보 주장 기록"), keywords: "observation input evidence 관측 입력 근거", glyph: "＋", run: openInput },
    { id: "human-gate", label: uiText(interfaceLocale, "Open human-required patch", "사람 승인이 필요한 패치 열기"), description: uiText(interfaceLocale, "Review Reference Model Patch #014", "Reference Model Patch #014 검토"), keywords: "approve review gate 승인 검토", glyph: "!", run: openPatchReview },
    { id: "blocked", label: uiText(interfaceLocale, "Show blocked evidence gate", "중단된 근거 게이트 보기"), description: uiText(interfaceLocale, "Open the workflow gate object", "워크플로 게이트 객체 열기"), keywords: "blocked human required 중단 사람", glyph: "◆", run: () => { setProjection("workflow"); setSelectedId("gate-evidence"); setInspectorOpen(true); setMobileInspectorEngaged(true); setView("map"); } },
    { id: "team", label: uiText(interfaceLocale, "Switch to Team ViewSpec", "팀 ViewSpec으로 전환"), description: uiText(interfaceLocale, "People, agents, responsibility, and work", "사람·에이전트·책임·작업"), keywords: "view team agents 팀 에이전트", glyph: "◇", run: () => chooseProjection("team") },
    { id: "workflow", label: uiText(interfaceLocale, "Switch to Workflow ViewSpec", "워크플로 ViewSpec으로 전환"), description: uiText(interfaceLocale, "Observation through revision gates", "관측에서 리비전 게이트까지"), keywords: "view workflow pipeline 워크플로", glyph: "≋", run: () => chooseProjection("workflow") },
    { id: "latest", label: uiText(interfaceLocale, "Return to latest snapshot", "최신 스냅샷으로 돌아가기"), description: uiText(interfaceLocale, "Reset valid and recorded cutoffs", "유효·기록 기준 초기화"), keywords: "time latest reset 시간 최신", glyph: "↺", run: () => { setTimeIndex(3); setRecordedIndex(recordedTimeOptions.length - 1); } },
  ];

  return (
    <main className={`ocp-app ${view === "standards" ? "standards-mode" : view === "home" ? "home-mode" : view === "dashboard" ? "dashboard-mode" : ""}`} lang={interfaceLocale === "dual" ? "ko" : interfaceLocale}>
      <header className="topbar">
        <a className="brand" href="#main-content" aria-label={uiText(interfaceLocale, "OCP work entry home", "OCP 작업 진입 홈")} onClick={() => setView("home")}>
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <b>OCP</b><span className="brand-rule" /><span>Work Context</span>
          <em className={`connection-${connection}`}><i /> {connection === "connected" ? uiText(interfaceLocale, "CONNECTED", "연결됨") : connection === "checking" ? uiText(interfaceLocale, "CHECKING", "확인 중") : uiText(interfaceLocale, "SNAPSHOT", "스냅샷")}</em>
        </a>
        <nav className="view-switch" aria-label={uiText(interfaceLocale, "Primary views", "주요 보기")}>
          <button className={view === "home" ? "active" : ""} type="button" aria-pressed={view === "home"} onClick={() => setView("home")}>{interfaceLocale === "en" ? "Work" : "작업"}{interfaceLocale === "dual" && <small>Work</small>}</button>
          <button className={view === "map" ? "active" : ""} type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>{interfaceLocale === "en" ? "Map" : "지도"}{interfaceLocale === "dual" && <small>Map</small>}</button>
          <button className={view === "feed" ? "active" : ""} type="button" aria-pressed={view === "feed"} onClick={() => setView("feed")}>{interfaceLocale === "en" ? "Feed" : "변경"}{interfaceLocale === "dual" && <small>Feed</small>}<i>{events.length}</i></button>
          <button className={view === "dashboard" ? "active" : ""} type="button" aria-pressed={view === "dashboard"} onClick={() => setView("dashboard")}>{interfaceLocale === "en" ? "Dashboard" : "대시보드"}{interfaceLocale === "dual" && <small>Dashboard</small>}</button>
          <button className={view === "standards" ? "active" : ""} type="button" aria-pressed={view === "standards"} onClick={() => setView("standards")}>{interfaceLocale === "en" ? "Standards" : "기준"}{interfaceLocale === "dual" && <small>Standards</small>}</button>
        </nav>
        <button className="search" type="button" onClick={() => setSearchOpen(true)}><span aria-hidden="true">⌕</span> {uiText(interfaceLocale, "Find objects, views, and actions", "객체·보기·동작 찾기")} <kbd>⌘ K</kbd></button>
        <nav className="top-actions" aria-label={uiText(interfaceLocale, "Actions and language", "동작과 언어")}>
          <label className="locale-picker" title={uiText(interfaceLocale, "Interface language", "인터페이스 언어")}>
            <span className="sr-only">{uiText(interfaceLocale, "Interface language", "인터페이스 언어")}</span>
            <select value={interfaceLocale} onChange={(event) => setInterfaceLocale(event.target.value as InterfaceLocale)} aria-label={uiText(interfaceLocale, "Interface language", "인터페이스 언어")}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="dual">함께 · KO+EN</option>
            </select>
          </label>
          {participation === "anonymous" ? (
            <a className="input participation-action" href="/signin-with-chatgpt?return_to=%2F">{uiText(interfaceLocale, "Sign in", "로그인")} <small>{uiText(interfaceLocale, "Join", "참여")}</small></a>
          ) : (
            <button className="input" type="button" disabled={participation === "checking" || participation === "unavailable"} onClick={canContribute(participation) ? openInput : joinWorkspace}>
              {canContribute(participation) ? uiText(interfaceLocale, "＋ Input", "＋ 입력") : participation === "visitor" ? uiText(interfaceLocale, "＋ Join", "＋ 참여") : uiText(interfaceLocale, "Checking…", "확인 중…")} <small>{canContribute(participation) ? uiText(interfaceLocale, "Observe", "관측") : uiText(interfaceLocale, "Join", "참여")}</small>
            </button>
          )}
          <span className={`membership-badge ${participation}`} aria-live="polite">{participationLabel(interfaceLocale, participation)}</span>
        </nav>
      </header>

      {(view === "map" || view === "feed") && <TimelineBar value={timeIndex} onChange={setTimeIndex} recordedIndex={recordedIndex} onRecordedChange={setRecordedIndex} locale={interfaceLocale} />}

      {view === "home" ? (
        <WorkEntryHome locale={interfaceLocale} connection={connection} revision={revision} operationalState={operationalState} onCapture={beginWorkCapture} onVerifiedSource={beginVerifiedPmgSource} onOpenDashboard={() => setView("dashboard")} />
      ) : view === "map" ? (
        <div className={`workspace ${inspectorOpen ? "" : "inspector-hidden"}`} id="main-content">
          <ControlRail projection={projection} modelMode={modelMode} perspective={perspective} layers={layers} repLens={repLens} onProjection={chooseProjection} onMode={chooseMode} onPerspective={setPerspective} onLayer={toggleLayer} onRepLens={setRepLens} locale={interfaceLocale} />
          <section className="map" aria-label={`${graph.label} model map in ${modelMode} mode`}>
            <MapToolbar graph={visibleGraph} projection={projection} modelMode={modelMode} connection={connection} revision={revision} operationalState={operationalState} onSelectAgent={openAgent} onOpenPatch={() => openPatchReview(operationalState ? pmgSourceIds.proposal : "patch-reference-014")} onFit={() => setZoom(86)} locale={interfaceLocale} />
            {modelMode === "single" && <StrataCanvas graph={visibleGraph} selectedId={selectedNode.id} timeIndex={timeIndex} zoom={zoom} onSelect={selectNode} setZoom={setZoom} layers={layers} primaryLayer={primaryLayer} />}
            {modelMode === "split" && <CompareCanvas graph={visibleGraph} selectedId={selectedNode.id} timeIndex={timeIndex} onSelect={selectNode} />}
            {modelMode === "overlay" && <OverlayCanvas graph={visibleGraph} selectedId={selectedNode.id} timeIndex={timeIndex} balance={overlayBalance} zoom={zoom} onSelect={selectNode} setBalance={setOverlayBalance} setZoom={setZoom} layers={layers} primaryLayer={primaryLayer} />}
            {modelMode === "diff" && <DiffCanvas graph={visibleGraph} selectedId={selectedNode.id} timeIndex={timeIndex} onSelect={selectNode} />}
            <MobileObjectList graph={visibleGraph} selectedId={selectedNode.id} modelMode={modelMode} layers={layers} primaryLayer={primaryLayer} onSelect={selectNode} />
          </section>
          <Inspector node={selectedNode} open={inspectorOpen} tab={inspectorTab} projection={projection} perspective={perspective} layers={layers} primaryLayer={primaryLayer} mobileEngaged={mobileInspectorEngaged} onClose={() => { setInspectorOpen(false); setMobileInspectorEngaged(false); }} onTab={setInspectorTab} onPropose={openPatchReview} />
          {!inspectorOpen && <button className="reopen-inspector" type="button" onClick={() => { setInspectorOpen(true); setMobileInspectorEngaged(true); }}>Object details <span>←</span></button>}
        </div>
      ) : view === "feed" ? (
        <FeedView events={events} filter={feedFilter} onFilter={setFeedFilter} onOpenEvent={openEvent} onOpenPatch={() => openPatchReview(operationalState ? pmgSourceIds.proposal : "patch-reference-014")} operationalState={operationalState} revision={revision} locale={interfaceLocale} />
      ) : view === "dashboard" ? (
        <DashboardView state={operationalState} connection={connection} locale={interfaceLocale} onOpenPatch={() => openPatchReview(pmgSourceIds.proposal)} onStartSource={beginVerifiedPmgSource} />
      ) : <StandardsView locale={interfaceLocale} />}

      <InputDrawer open={inputOpen} type={inputType} observation={observation} stateKind={observationKind} validTime={observationValidTime} sourceFile={sourceFile} sourceLink={sourceLink} onType={setInputType} onObservation={setObservation} onStateKind={setObservationKind} onValidTime={setObservationValidTime} onSourceFile={setSourceFile} onSourceLink={setSourceLink} onClose={() => setInputOpen(false)} onSubmit={saveObservation} requestState={inputRequest} error={inputError} actorLabel={participationLabel(interfaceLocale, participation)} locale={interfaceLocale} />
      <PatchReviewDrawer open={patchOpen} proposal={activeProposal} decision={patchDecision} onClose={() => setPatchOpen(false)} onDecision={decidePatch} onApply={applyPatch} requestState={patchRequest} error={patchError} applied={patchApplied} canReview={canReviewPatches(participation)} applyAvailable={activeProposalId === pmgSourceIds.proposal} locale={interfaceLocale} />
      <CommandPalette open={searchOpen} commands={commands} onOpenObject={openSearchResult} onClose={() => setSearchOpen(false)} locale={interfaceLocale} />

      <div className="sr-only" aria-live="polite">{viewSpecs[projection].label} projection, {modeLabels[modelMode].en} mode, valid {timelinePoints[timeIndex].label}, recorded {recordedTimeOptions[recordedIndex].label}</div>
      {participationError && <div className="access-notice" role="alert"><b>{uiText(interfaceLocale, "Participation not enabled.", "참여가 활성화되지 않았습니다.")}</b> {participationError}</div>}
      {toast && <div className="toast" role="status"><i>✓</i>{toast}</div>}
    </main>
  );
}

export default function Home() {
  return <OcpApp />;
}
