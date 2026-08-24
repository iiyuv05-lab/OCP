# OCP — Federated Work & Capability Platform

> **Connect what exists. Build what’s missing. Compose the flow. Execute anywhere. Keep one state. Verify the result.**

**Status:** Concept Architecture  
**Published:** 2026-08-25  
**Scope:** OCP 통합 업무 플랫폼의 상위 개념 정의. 확정된 개념과 향후 설계 대상을 구분한다.

## 0. 문서 목적

OCP는 새로운 단일 협업 SaaS를 만드는 프로젝트가 아니다.

OCP는 **이미 존재하는 서비스, AI, 인간, 데이터와 새로 생성한 소프트웨어를 조립하여 하나의 실행 가능한 업무 Flow를 구성하고, 그 전체를 하나의 논리적 데이터 상태로 관찰·운영하는 플랫폼**이다.

사용자는 Notion, Asana, Trello, Figma, Photoshop, GitHub 등 기존 전문 서비스를 계속 사용할 수 있다. 동시에 OCP 안에서도 이들을 하나의 프로젝트와 업무 흐름으로 관찰하고 실행할 수 있다. 필요한 기능이 기존 서비스에 없다면 Lovable류의 바이브 코딩 또는 AI 개발 에이전트를 이용해 새로운 앱·도구·인터페이스를 만들고 기존 Flow에 결합한다.

---

## 1. 문제 정의

현재 디지털 업무 환경은 기능 부족보다 **분절(fragmentation)** 문제가 크다.

하나의 프로젝트가 기획(Notion), 업무 관리(Asana/Trello), 디자인(Figma), 이미지(Photoshop), 개발(GitHub/Coding Agent), 커뮤니케이션(Slack/Gmail), 파일(Drive), 일정(Calendar) 등 여러 서비스에 분산된다. 각 서비스에는 자체 데이터 모델, UI, 권한, 검색, 상태 체계가 있다.

OCP는 이들을 모두 대체하지 않고 **서비스 위의 운영 계층(Operating Layer)**을 만든다.

## 2. 핵심 철학

### 2.1 Replace가 아니라 Compose

각 분야에서 이미 잘 만들어진 전문 서비스를 **Capability Provider**로 사용하고 필요한 기능을 조립한다.

### 2.2 Flow와 Service를 분리

업무 목적과 특정 SaaS를 동일시하지 않는다.

`Goal → Flow → Step → Capability → Provider → Connector`

예를 들어 `시장 조사`라는 Capability는 Web Search, ChatGPT, 다른 AI, Reddit, 사내 데이터 또는 인간 조사자가 제공할 수 있다. 특정 Provider가 없어져도 Flow는 유지되고 다른 Provider로 교체할 수 있다.

## 3. Federated Work Graph

OCP의 중심에는 **Unified/Federated Work Graph**가 존재한다.

Notion Page, Asana Task, Trello Card, GitHub Issue, Figma File 등 서로 다른 서비스의 객체를 공통 객체와 관계로 연결한다.

대표 객체:

- Project
- Goal
- Task / Work Item
- Document
- Design
- Code
- Issue
- Person
- AI Agent
- Decision
- Claim
- Evidence
- Test
- Artifact
- Deployment
- Run
- Event
- Version
- Source

대표 관계:

- belongs_to
- depends_on
- created_by
- executed_by
- reviewed_by
- supports
- contradicts
- derived_from
- produces
- blocks

예를 들어 `Notion 요구사항 → GitHub Issue → Coding Agent 작업 → PR → Test → Human Approval → Deploy`를 하나의 연결된 실행 그래프로 표현한다.

## 4. One Data의 의미

**하나의 데이터**는 모든 원본 파일을 OCP DB에 복사한다는 뜻이 아니다. 물리적 저장 위치가 달라도 **논리적으로 하나의 상태 공간**으로 관리한다는 뜻이다.

예:

`PROJECT-001 → Notion Page / Figma File / Photoshop Asset / GitHub Repository / Asana Tasks / Custom App / Deployment / Test Results / Decisions / Evidence`

각 데이터는 가장 적절한 원본 시스템에 남아 있을 수 있다.

- Design → Figma
- Document → Notion
- Code → GitHub
- File → Drive
- Task → OCP 또는 외부 PM 서비스
- Decision → OCP
- Evidence → REP

OCP는 공통 ID, 관계, 상태, 변경 이력, 출처와 Provenance를 관리한다.

## 5. Source of Truth와 System of Observation

초기 OCP는 모든 서비스의 새로운 원본 DB가 되지 않는다. 우선 **System of Observation**으로 시작한다.

각 객체마다 Source of Truth를 지정하고, OCP에서 수정한 경우 가능한 Connector를 통해 원본 서비스에도 반영한다.

`OCP → Connector → 원본 서비스 수정 → 변경 이벤트 → OCP Graph 갱신`

## 6. Connector Layer

외부 서비스 연결 방식을 하나로 강제하지 않는다.

- MCP
- REST API
- GraphQL
- Webhook
- Filesystem
- Git
- Browser automation
- 기타 공식 integration

공식 MCP가 적절하면 MCP를 사용하고, MCP가 없지만 API가 충분하면 API Adapter를 사용한다. 로컬 파일 기반이면 Filesystem/Git Adapter를 사용할 수 있다. OCP 내부에서는 이 차이를 Connector 인터페이스로 추상화한다.

## 7. Capability Layer

OCP는 Service보다 Capability를 우선한다.

예: Research, Search, Write, Design, Image Edit, Code, Test, Deploy, Communicate, Approve, Analyze, Store, Publish.

각 Capability는 여러 Provider를 가질 수 있다. 예를 들어 CODE Capability는 Coding Agent, 다른 AI, 인간 개발자, 자체 개발 서비스 등이 제공할 수 있다.

## 8. Build What’s Missing

필요한 Capability가 존재하지 않으면 OCP는 새로운 소프트웨어를 만들 수 있다. Lovable류 바이브 코딩 서비스, Coding Agent 또는 자체 생성 환경도 Capability Provider가 된다.

예:

`이미지 승인 인터페이스 필요 → 기존 Capability 검색 → 적합한 서비스 확인 → 없으면 Build → AI 앱 생성 → Schema 연결 → Test → Flow Node 등록 → 사용`

따라서 OCP는 외부 서비스를 연결하는 플랫폼인 동시에 **필요한 부품을 생산하는 플랫폼**이다.

## 9. Build vs Connect vs Human

새 요구가 발생하면 Capability Resolver가 선택할 수 있다.

- **Connect:** 기존 서비스가 더 적합하면 연결한다.
- **Build:** 작거나 특수한 기능이고 생성 비용이 낮으면 AI로 만든다.
- **Human:** 전문적 인간 판단이나 실행이 적합하면 인간에게 할당한다.

이 선택 자체도 Decision 객체로 기록할 수 있다.

## 10. Custom Capability Library

한 번 생성한 앱을 일회용으로 버리지 않고 Capability로 등록한다. 예를 들어 이미지 승인기를 한 번 만들면 여러 프로젝트와 Flow에서 재사용한다.

반복될수록 OCP 내부에 **Capability Library**가 축적되고 새로운 업무 시스템을 만드는 비용을 줄일 수 있다.

## 11. Embedded + External

OCP는 사용자를 내부 UI에 가두지 않는다.

### Embedded Surface

OCP 안에서 Preview하거나 직접 실행·조작한다.

### Native / External Surface

원래 전문 앱에서 작업한다.

예를 들어 Figma 객체는 OCP에서 상태·관계·Preview를 확인하면서 `Open in Figma`로 원본 앱에 진입할 수 있다. 자체 생성 앱도 OCP Embedded App과 독립 Web App 두 형태를 지원할 수 있다.

## 12. 데이터와 View의 분리

동일한 객체를 목적에 따라 여러 UI 문법으로 표현한다.

- **Graph View (Obsidian 계열):** 전체 관계와 구조
- **Canvas View (Obsidian Canvas 계열):** 자유 배치와 Flow 설계
- **Board View (Trello 계열):** 현재 진행 상태
- **List / Task View (Asana 계열):** 해야 할 업무
- **Table / Database View (Notion/Airtable 계열):** 구조화 데이터
- **Timeline / Gantt View:** 일정과 Dependency
- **Document View:** 문서와 지식
- **Feed View:** 변경 사항과 Agent 실행 로그
- **REP Evidence View:** 주장, 근거, 검증 상태, Coverage

특정 제품의 디자인을 복제하는 것이 아니라 검증된 **Interaction Pattern**을 OCP 데이터에 적용한다.

## 13. Canvas = 실행 가능한 Flow Editor

Canvas는 단순 화이트보드가 아니다. 각 Node가 실제 Capability 또는 객체를 의미할 수 있다.

`Web Search → AI Analysis → Notion → Figma → Coding Agent → GitHub → Test → Deploy`

사용자가 Node를 연결하면 그 그림 자체가 실행 가능한 Workflow가 될 수 있다.

- **Canvas:** 어떻게 작동하게 할 것인가
- **Graph:** 실제 무엇이 어떻게 연결되어 있는가
- **Board:** 지금 무엇이 진행 중인가
- **Timeline:** 언제 무엇이 일어나는가
- **Document:** 무엇을 알고 있는가
- **REP View:** 그것을 왜 믿을 수 있는가

## 14. AI Agent + Human + SaaS

Flow의 실행자는 소프트웨어만이 아니다. 동일한 실행 그래프에 AI Agent, Human, SaaS, API, Custom App, Automation이 함께 들어갈 수 있다.

예:

`Research(AI) → Review(Human) → Design(Figma) → Implementation(Coding Agent) → Repository(GitHub) → QA(Browser Agent) → Approval(Human) → Deploy(Automation)`

## 15. 앱·웹·홈페이지 제작

OCP 내부에서 홈페이지, 앱, 사내 도구 등을 생성하는 Flow를 구성할 수 있다.

`Requirement → Specification → Design → Build → Run → Test → Review → Deploy`

생성 결과는 OCP 안에서 Preview할 수도 있고 독립 웹사이트/앱으로 사용할 수도 있다.

## 16. Figma·Photoshop 등 전문 프로그램

전문 프로그램 전체를 OCP에서 재구현하지 않는다.

1. **Connect:** 기존 전문 앱을 그대로 사용한다.
2. **Embedded Capability:** Crop, Annotation, Preview, Approve, Reject, Compare 등 Flow에서 자주 필요한 작은 기능만 OCP에 제공한다.
3. **Custom Build:** 기존 앱으로 해결하기 어려운 특수 기능은 AI로 직접 생성한다.

## 17. 실행 환경과 테스트

OCP의 핵심 Capability 중 하나는 **실제 실행과 테스트**다. 코드 또는 앱이 생성됐다는 사실과 실제로 작동한다는 사실을 구분한다.

`Requirement → Build → Run → Browser Test → Visual Test → Functional Test → Human Review → Evidence → Deploy`

Browser Agent가 실제 앱을 조작하여 로그인, 검색, 상품 선택, 장바구니, Checkout 등의 흐름을 테스트할 수 있어야 한다.

실패하면 `Test Result → Evidence → Issue → Agent 할당 → 수정 → Retest`로 이어진다.

## 18. 실행 과정도 데이터

최종 산출물만 저장하지 않는다. Run, Test, Error, Screenshot, Console Log, Network Log, Human Review, Agent Action, Deployment, Version 등 실행 과정 자체도 객체로 관리해 계보를 추적할 수 있게 한다.

## 19. 업무 상태와 지식 상태 분리

업무 진행 상태와 결과의 신뢰 상태는 다르다.

업무 상태 예:

`BACKLOG → READY → EXECUTING → REVIEW → DONE`

지식 상태 예:

`UNVERIFIED → WEAK → PROBABLE → CONFIRMED`

따라서 `Task = DONE`이면서 `Knowledge State = WEAK`일 수 있다. “조사를 완료했다”와 “충분히 믿을 만한 시장 상태를 확보했다”는 서로 다른 주장이다.

## 20. REP Layer

REP는 OCP 위의 검증·인식 상태 계층으로 결합한다.

대표 객체/속성:

- Evidence
- Claim
- Decision
- Provenance
- Knowledge State
- Confidence
- Coverage
- Source
- Human Approval
- Agent Execution
- Dependency
- Reproduction / Test Result

OCP가 **무엇을 하고 있는가**를 관리한다면 REP는 **그 결과를 왜 믿어야 하는가, 현재 무엇까지 알고 있는가**를 관리한다.

## 21. Cross-Service Automation

서비스 경계를 넘어 Workflow를 실행할 수 있다.

`Notion Requirement Approved → GitHub Issue → Coding Agent → PR → Browser Test → Human Review → Merge → Deploy → Asana Done → Notion Update → REP Evidence`

전체가 하나의 Execution Graph가 된다.

## 22. 핵심 객체 모델

현재 개념 단계의 최소 핵심 객체는 다음 8개다.

1. **Object** — 업무 세계에 존재하는 대상
2. **Capability** — 무엇을 할 수 있는가
3. **Provider** — 누가/무엇이 Capability를 제공하는가
4. **Connector** — Provider와 어떻게 통신하는가
5. **Flow** — Capability들이 어떤 순서와 조건으로 실행되는가
6. **Surface** — 동일 객체를 어떤 UI로 보여주는가
7. **State** — 현재 어떤 상태인가
8. **Evidence** — 상태와 결과를 무엇으로 뒷받침하는가

보조 객체 후보: Actor, Event, Run, Decision, Claim, Version, Dependency, Source, Test, Artifact, Project, Goal.

## 23. 전체 아키텍처

```text
USER / AI
   ↓
EXPERIENCE
Graph / Canvas / Board / Table / Timeline / Document / Evidence / Feed
   ↓
FLOW
Goal → Workflow → Step → Dependency
   ↓
CAPABILITY
Search / Design / Code / Test / Deploy / ...
   ↓
PROVIDER
SaaS / AI / Human / Custom Application
   ↓
CONNECTOR
MCP / API / Webhook / Git / Files / Browser / ...
   ↓
UNIFIED / FEDERATED GRAPH
Object / Relation / State / Event / Version / Provenance
   ↓
REP
Evidence / Claim / Knowledge State / Coverage / Confidence / Verification
```

## 24. 발전 단계

### Phase 1 — Observe
기존 서비스를 연결하고 Read 중심으로 여러 서비스에 흩어진 업무를 하나의 Graph에서 본다.

### Phase 2 — Interact
OCP에서 외부 객체를 수정하고 원본 서비스에 반영한다.

### Phase 3 — Automate
서비스 사이의 Workflow를 자동 실행한다.

### Phase 4 — Compose
Canvas에서 Capability를 조립하여 새로운 Flow를 만든다.

### Phase 5 — Generate
없는 Capability를 AI/Vibe Coding으로 생성한다.

### Phase 6 — Execute & Test
생성된 앱과 기존 서비스를 실제 실행하고 테스트한다.

### Phase 7 — Verify
REP를 통해 Evidence, Provenance, Coverage, Knowledge State를 관리한다.

### Phase 8 — Learn / Reuse
성공한 Flow와 Capability를 재사용 가능한 Library로 축적한다.

## 25. OCP가 하지 않아야 할 것

- 초기부터 모든 SaaS 기능을 직접 구현하지 않는다.
- 모든 외부 데이터를 무조건 자체 DB로 이전하지 않는다.
- 모든 Provider를 MCP 하나로 강제하지 않는다.
- 전문 앱 전체를 단순 복제하지 않는다.
- 업무 완료와 결과 검증을 동일시하지 않는다.
- 특정 AI나 특정 SaaS에 Flow를 종속시키지 않는다.
- OCP 내부 사용만 강제하지 않는다.

## 26. 제품의 핵심 차별점

일반 협업툴은 사람이 특정 SaaS 안에서 업무를 관리한다. OCP는 **여러 SaaS·AI·인간·데이터·자체 생성 앱을 하나의 Flow로 조립**한다.

일반 Automation이 `A 서비스 이벤트 → B 서비스 실행`에 집중한다면, OCP는 Goal과 Capability를 중심으로 Provider를 선택하고 실행 결과와 관계·상태·근거까지 Graph에 축적한다.

일반 Vibe Coding이 앱을 생성하는 데 집중한다면 OCP는 **필요한 Capability를 생성하고 기존 업무 시스템에 즉시 조립한다.**

## 27. 최종 제품 정의

> **OCP는 기존 SaaS, AI Agent, 인간, 데이터 및 AI로 새롭게 생성한 소프트웨어를 Capability 단위로 조립하여 실행 가능한 업무 Flow를 구성하고, 그 전체의 객체·관계·상태·실행·근거를 하나의 Federated Graph에서 관리하는 운영 플랫폼이다.**

사용자는 필요한 경우 OCP 내부에서 작업하고 전문 작업은 원래 앱으로 나가서 수행할 수 있다. 데이터의 물리적 저장 위치가 서로 다르더라도 OCP에서는 하나의 논리적 업무 상태로 관리한다.

필요한 기능이 존재하면 연결하고, 존재하지 않으면 만들고, AI가 적합하면 AI가 실행하고, 인간이 적합하면 인간에게 할당하고, 실행 결과는 테스트하며, 결과의 근거와 신뢰 상태는 REP가 관리한다.

## 28. 미확정 / Open Questions

아래는 현재 확정 기능으로 간주하지 않고 후속 설계 대상으로 유지한다.

- Canonical Object Schema 상세
- 외부 서비스별 Source of Truth 정책
- Conflict Resolution
- Sync 전략 및 동기화 지연 정책
- 권한/인증 모델
- OAuth 및 Secret 관리
- MCP/API Connector 표준
- Event Schema
- Versioning
- 실시간 협업
- Sandbox 격리
- AI 생성 코드 보안
- Browser Agent 권한
- 외부 앱 Embedded 방식
- 데이터 Residency
- 비용 및 Provider Routing
- Capability Resolver 알고리즘
- Build vs Buy/Connect 판단 기준
- Flow Runtime
- 실패/재시도/롤백
- Human Approval 정책
- REP와 OCP 객체 모델의 정확한 경계
- 공개/비공개 Graph 정책
- Multi-tenant 구조
- Capability Marketplace 가능성

## 29. 다른 인간/AI를 위한 해석 규칙

1. 이 문서는 **Concept Architecture**이며 구현 완료 상태를 주장하지 않는다.
2. `미확정 / Open Questions` 항목을 확정 사양으로 추론하지 않는다.
3. 특정 서비스 이름은 Capability Provider의 예시이며 OCP의 필수 종속성을 의미하지 않는다.
4. “One Data”는 모든 원본의 물리적 중앙집중 저장을 의미하지 않는다.
5. OCP의 핵심은 개별 UI 복제가 아니라 **공통 객체/관계/상태를 여러 Surface로 표현하는 것**이다.
6. 외부 앱 사용과 OCP Embedded 사용은 상호 배타적이지 않다.
7. 업무 완료 상태와 REP의 지식/검증 상태를 혼동하지 않는다.
8. 향후 변경 시 확정 사항, 가설, 구현 상태, 검증 상태를 구분해 기록한다.

---

### Canonical one-liner

**Connect what exists. Build what’s missing. Compose the flow. Execute anywhere. Keep one state. Verify the result.**
