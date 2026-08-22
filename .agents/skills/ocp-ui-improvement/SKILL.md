---
name: ocp-ui-improvement
description: Audit or improve the OCP interface—visual hierarchy, object interactions, responsive behavior, accessibility, motion, and runtime UI QA—while preserving Canonical Graph truth, bitemporal state, evidence provenance, and patch gates. Use for OCP front-end work; not backend-only schema or ingestion changes.
---

# OCP UI improvement

Choose the scope before acting: audit-only, targeted improvement, or a cross-surface improvement pass. Do not implement when the request is review-only.

## Load the relevant contract

For every implementation, read `../../../docs/UI-PRINCIPLES.md` and `../../../docs/UI-STATE-MODEL.md`. Read `../../../docs/UI-MOTION.md` when motion changes. Read `../../../docs/UI-AUDIT.md` for audits, cross-surface work, or baseline findings.

## Workflow

1. Observe the current repository and runnable UI before visual mutation. Identify actual data sources, available states, and working interaction patterns.
2. Within the requested scope, rank evidence-backed findings P0 truth/usability, P1 comprehension, P2 consistency, P3 polish, P4 delight.
3. Select the smallest coherent slice that satisfies the request and fixes the highest-priority in-scope finding. Do not expand a targeted request to unrelated findings; report them separately unless they block a truthful or safe implementation. Preserve the Canonical Graph → ViewSpec → projector boundary and working components.
4. Do not invent data, realtime presence, progress, ontology, schema, permissions, or history. Do not add a dependency without a demonstrated gap.
5. Make async success server-confirmed. Preserve human gates and distinguish approved from applied.
6. Test only safe local or fixture mutations. Never exercise a destructive or gated production write merely for UI QA.
7. Run `npm run lint`, then `npm test`. Browser-check the changed interaction and relevant responsive boundary.
8. Update `../../../docs/UI-AUDIT.md` only when the baseline or finding status materially changes. Update `../../../docs/UI-QA.md` with actual PASS, FAIL, or NOT RUN evidence.
9. Repair failed acceptance criteria. Three visual, two accessibility, and two performance corrections are ceilings, not quotas; stop earlier when the criteria pass.
10. Hand off objective results, remaining risk, and only genuine brand or aesthetic choices. Authorization, security, ontology, and canonical gates are not deferred aesthetic decisions.

Use independent reviewers for substantial UX, accessibility, or performance risk. Do not require a fixed number of agents for small changes.
