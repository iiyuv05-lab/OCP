# OCP deployment transition

Status: GitHub repository identified and local origin connected · push, PR execution, and external preview not yet verified

## Frozen prototype

The parallel ChatGPT Sites v0.5 deployment is retained as an immutable comparison snapshot. No subsequent OCP release should treat that project as the Canonical Implementation Plane or as acceptance-verified production.

## Target topology

```text
GitHub main
  ├─ protected production path
  └─ agent branch or pull request
       → provider preview URL
       → runtime-observability workflow
       → DOM + console + network + screenshot + trace
       → acceptance decision
```

The current vinext application depends on Cloudflare-compatible D1 and R2 bindings. A preview provider must preserve those bindings or supply an explicitly tested adapter; moving only the front end to a provider that cannot reproduce them would create a different product state.

## Prepared repository controls

- `codex/` is the default agent branch prefix.
- `.github/workflows/verify.yml` runs lint, source tests, and a local browser runtime check.
- `.github/workflows/preview.yml` defines the explicit preview URL verification adapter.
- `.github/pull_request_template.md` and `.github/CODEOWNERS` define review expectations; enforcement is not yet verified.
- `.github/workflows/runtime-verification.yml` accepts a provider deployment event or an explicit runtime URL and archives runtime evidence.
- `playwright.config.ts` and `tests/runtime/` implement the first independent browser harness.
- `.ocp/runtime/targets.json` records actual and missing targets without inventing a Deployment Registry.

## External blockers

1. Push `main` and this branch to `iiyuv05-lab/OCP`, then open the first pull request and observe Actions.
2. Enable branch protection, required checks, and CODEOWNERS review separately; file presence is not enforcement.
3. Select a preview provider compatible with the D1/R2 runtime and connect it to GitHub deployment events.
4. Declare provider bindings and secrets outside Git; record only their requirements and locations.
5. Run the external URL workflow and preserve its first passing evidence bundle before promoting production.

Until these occur, the correct state is `external preview: blocked_missing_provider`, not deployed or verified.
