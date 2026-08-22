export type ReferenceDocument = {
  id: string;
  title: { en: string; ko: string };
  path: string;
  status: { en: string; ko: string };
  summary: { en: string; ko: string };
  kind: "product-contract" | "implementation-ledger" | "governance" | "qa-record";
};

export type DeploymentVerificationState = "verified" | "observed" | "environment-dependent" | "failed" | "not-run";

export type DeploymentVerificationStage = {
  id: string;
  label: { en: string; ko: string };
  state: DeploymentVerificationState;
  detail: { en: string; ko: string };
};

// This is a repository-document index for UI discovery. It is deliberately not
// canonical graph data; governed specification ingestion does not exist yet.
export const referenceDocuments: ReferenceDocument[] = [
  {
    id: "harness-baseline-v1",
    title: { en: "Harness Baseline v1", ko: "검증 하네스 기준선 v1" },
    path: "docs/OCP-HARNESS-BASELINE-V1.md · .ocp/manifest.json",
    status: { en: "Local acceptance verified", ko: "로컬 인수 검증됨" },
    summary: {
      en: "Defines the one-command local production line, feature state ladder, evidence bundle, and the GitHub capability boundary.",
      ko: "단일 명령 로컬 검증 공정, 기능별 상태 사다리, 증거 번들, GitHub 기능 경계를 정의합니다.",
    },
    kind: "governance",
  },
  {
    id: "runtime-observability",
    title: { en: "Runtime Observability Independence", ko: "독립 실행 관측성 규칙" },
    path: "docs/OCP-RUNTIME-OBSERVABILITY.md",
    status: { en: "Approved runtime constraint", ko: "승인된 실행 제약" },
    summary: {
      en: "Defines OCP-RC-002, Deployment Truth, the verification ladder, and CASE-RUNTIME-001 without equating deployment with runtime verification.",
      ko: "OCP-RC-002, Deployment Truth, 검증 상태 사다리, CASE-RUNTIME-001을 정의하며 배포를 실행 검증으로 간주하지 않습니다.",
    },
    kind: "governance",
  },
  {
    id: "ocp-integrity-harness",
    title: { en: "Context Integrity & Runtime Verification Harness", ko: "컨텍스트 무결성·실행 검증 하네스" },
    path: "docs/OCP-CONTEXT-INTEGRITY-HARNESS.md",
    status: { en: "Approved module specification", ko: "승인된 모듈 명세" },
    summary: {
      en: "Defines OCP-MOD-INTEGRITY-001 and the separate conversation, specification, implementation, deployment, runtime, and outcome truth chain.",
      ko: "OCP-MOD-INTEGRITY-001과 대화·명세·구현·배포·실행·결과 진실을 분리한 검증 사슬을 정의합니다.",
    },
    kind: "product-contract",
  },
  {
    id: "ocp-v05-contract",
    title: { en: "OCP v0.5 work-entry and reproducibility", ko: "OCP v0.5 작업 진입·재현 계약" },
    path: "docs/OCP-V0.5.md",
    status: { en: "Working product direction", ko: "작업 중인 제품 방향" },
    summary: {
      en: "Defines the LLM-first work entry, L1–L8/W1–W8 grammar, progressive imports, and separated implementation, operational, raw-data, access, and deployment planes.",
      ko: "대화형 작업 진입, L1–L8/W1–W8 문법, 점진적 가져오기, 구현·운영·원본·접근·배포 계층의 분리를 정의합니다.",
    },
    kind: "product-contract",
  },
  {
    id: "ocp-v04-contract",
    title: { en: "OCP v0.4 agent architecture", ko: "OCP v0.4 에이전트 구조" },
    path: "docs/OCP-V0.4.md",
    status: { en: "Working product direction", ko: "작업 중인 제품 방향" },
    summary: {
      en: "Defines the intended agent entry, scoped context, working state, patch, commit, revert, Data Hub, UX edit, and capability-registry architecture.",
      ko: "에이전트 진입·범위형 컨텍스트·작업 상태·패치·반영·되돌리기·Data Hub·UX 수정·기능 등록부 방향을 정의합니다.",
    },
    kind: "product-contract",
  },
  {
    id: "ocp-v03-contract",
    title: { en: "OCP v0.3 product contract", ko: "OCP v0.3 제품 계약" },
    path: "docs/OCP-V0.3.md",
    status: { en: "Approved product direction", ko: "승인된 제품 방향" },
    summary: {
      en: "Locks product boundaries for data, views, language, skins, operational modules, access, and module specifications.",
      ko: "데이터·뷰·언어·스킨·운영 모듈·접근·모듈 명세의 제품 경계를 고정합니다.",
    },
    kind: "product-contract",
  },
  {
    id: "ocp-v02-contract",
    title: { en: "OCP v0.2 extension boundary", ko: "OCP v0.2 확장 경계" },
    path: "docs/OCP-V0.2.md",
    status: { en: "Approved product direction", ko: "승인된 제품 방향" },
    summary: {
      en: "Defines View Architecture, representation provenance, migration, consented capture, installable knowledge, and past/present/future boundaries.",
      ko: "View Architecture·표현 출처·마이그레이션·동의 기반 수집·설치형 지식·과거/현재/미래 경계를 정의합니다.",
    },
    kind: "product-contract",
  },
  {
    id: "implementation-status",
    title: { en: "OCP implementation status", ko: "OCP 구현 상태표" },
    path: "docs/OCP-IMPLEMENTATION-STATUS.md",
    status: { en: "Evidence ledger", ko: "증거 기반 상태 기록" },
    summary: {
      en: "Separates implemented foundations, partial behavior, specification-only direction, and work that does not exist yet.",
      ko: "구현된 기반, 부분 구현, 명세만 있는 방향, 아직 존재하지 않는 작업을 구분합니다.",
    },
    kind: "implementation-ledger",
  },
  {
    id: "canonical-v01",
    title: { en: "Canonical Graph v0.1", ko: "Canonical Graph v0.1 기준" },
    path: "db/schema.ts · drizzle/0000_canonical_v01.sql",
    status: { en: "Normative foundation", ko: "규범 기반" },
    summary: {
      en: "The executable semantic foundation for observations, evidence, states, relations, revisions, and patch gates.",
      ko: "관측·근거·상태·관계·리비전·패치 게이트의 실행 가능한 의미론적 기반입니다.",
    },
    kind: "governance",
  },
  {
    id: "ui-contract",
    title: { en: "UI principles and state model", ko: "UI 원칙과 상태 모델" },
    path: "docs/UI-PRINCIPLES.md · docs/UI-STATE-MODEL.md",
    status: { en: "UI governance", ko: "UI 거버넌스" },
    summary: {
      en: "Defines truthful interface state, object continuity, responsive behavior, accessibility, and interaction boundaries.",
      ko: "정직한 화면 상태, 객체 연속성, 반응형 동작, 접근성, 상호작용 경계를 정의합니다.",
    },
    kind: "governance",
  },
  {
    id: "ui-qa",
    title: { en: "UI QA evidence", ko: "UI QA 증거 기록" },
    path: "docs/UI-QA.md",
    status: { en: "Executed-check ledger", ko: "실행된 검사 기록" },
    summary: {
      en: "Records only checks that were actually run and keeps unavailable runtime checks visible as NOT RUN.",
      ko: "실제로 실행한 검사만 기록하고, 실행하지 못한 런타임 검사는 NOT RUN으로 남깁니다.",
    },
    kind: "qa-record",
  },
];

// Repository-recorded evidence for the frozen ChatGPT Sites v0.5 snapshot.
// This is not a live Deployment Registry or a canonical graph projection.
export const deploymentVerificationStages: DeploymentVerificationStage[] = [
  {
    id: "build-verified",
    label: { en: "Build verified", ko: "빌드 검증" },
    state: "verified",
    detail: { en: "Sites provider build succeeded for snapshot bdb4236.", ko: "Sites 제공자 빌드가 스냅샷 bdb4236에 대해 성공했습니다." },
  },
  {
    id: "deployable",
    label: { en: "Deployable", ko: "배포 가능" },
    state: "verified",
    detail: { en: "Provider accepted the declared D1/R2-bound source.", ko: "제공자가 선언된 D1/R2 바인딩 소스를 수락했습니다." },
  },
  {
    id: "deployed",
    label: { en: "Deployed", ko: "배포됨" },
    state: "verified",
    detail: { en: "Sites version 1 and its public URL were published.", ko: "Sites 버전 1과 공개 URL이 게시되었습니다." },
  },
  {
    id: "accessible",
    label: { en: "Accessible", ko: "접근 가능" },
    state: "environment-dependent",
    detail: { en: "User/browser access was observed, while another agent fetch path failed.", ko: "사용자 브라우저 접근은 관측됐지만 다른 에이전트 fetch 경로는 실패했습니다." },
  },
  {
    id: "interactable",
    label: { en: "Interactable", ko: "조작 가능" },
    state: "environment-dependent",
    detail: { en: "The independent harness traversed Home, Map, Feed, and Standards here; another environment could not fetch it.", ko: "이 환경의 독립 Harness는 홈·지도·Feed·기준을 조작했지만 다른 환경에서는 fetch하지 못했습니다." },
  },
  {
    id: "runtime-verified",
    label: { en: "Runtime verified", ko: "실행 검증" },
    state: "failed",
    detail: { en: "The first portable run failed because deployment lacks the tested OCP-RC-002 implementation.", ko: "첫 이식 가능 실행은 배포본에 테스트 대상 OCP-RC-002 구현이 없어 실패했습니다." },
  },
  {
    id: "acceptance-verified",
    label: { en: "Acceptance verified", ko: "인수 검증" },
    state: "not-run",
    detail: { en: "Acceptance remains unverified for this frozen snapshot.", ko: "이 동결 스냅샷의 인수 검증은 실행되지 않았습니다." },
  },
];

export const languageDimensions = [
  {
    id: "interface-locale",
    title: { en: "Interface locale", ko: "인터페이스 언어" },
    status: { en: "Primary surfaces available", ko: "핵심 화면 우선 적용" },
    detail: { en: "Korean, English, or both. Stored locally; some dense detail panels still contain untranslated labels.", ko: "한국어, 영어, 함께 보기. 로컬 설정으로 저장되며 일부 상세 패널 문구는 아직 한글화 중입니다." },
    available: true,
  },
  {
    id: "original-language",
    title: { en: "Original content language", ko: "콘텐츠 원문 언어" },
    status: { en: "Original preserved", ko: "원문 보존" },
    detail: { en: "Changing the interface never rewrites stored source content.", ko: "인터페이스 언어를 바꿔도 저장된 원문은 변경하지 않습니다." },
    available: true,
  },
  {
    id: "display-translation",
    title: { en: "Display translation", ko: "표시 번역" },
    status: { en: "Not implemented", ko: "미구현" },
    detail: { en: "Translated content and its provenance are not generated yet.", ko: "번역 콘텐츠와 번역 출처는 아직 생성하지 않습니다." },
    available: false,
  },
  {
    id: "output-language",
    title: { en: "Output language", ko: "출력 언어" },
    status: { en: "Not implemented", ko: "미구현" },
    detail: { en: "Agent and report output language is not yet a governed workspace setting.", ko: "에이전트와 보고서의 출력 언어는 아직 거버넌스된 워크스페이스 설정이 아닙니다." },
    available: false,
  },
] as const;
