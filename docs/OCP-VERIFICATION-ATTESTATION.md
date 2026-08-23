# OCP Verification Attestation

Contract extension: `OCP-VERIFY-001@1.2.0`

Status: implemented contract and CI producer; execution state is resolved externally for each exact subject commit

## Purpose

OCP separates the state a repository declares from the event that proves a particular revision. A commit cannot canonically contain the final workflow run that verifies that same commit because adding the run record creates a different commit and therefore a different verification subject.

```text
Subject commit A
      │
      │ verified by
      ▼
Attestation V ──→ evidence bundle, workflow run, artifact digest
```

The allowed relationship is `V verifies A`. The recursive relationship `A contains V where V verifies A` is prohibited.

## State ownership

| Plane | Owner | Contains |
| --- | --- | --- |
| Declared/Expected state | Git repository | contracts, implementation declarations, required stage and result, target declarations |
| Observed verification | CI attestation | exact subject commit, run, result, timestamps, verifier, test observations, evidence and artifact digests |
| Latest verified pointer | External operational state | the newest acceptable attestation reference for a branch or deployment target |

`.ocp/current-state.json` and `.ocp/runtime/targets.json` therefore do not carry a latest run ID, artifact ID, or final result for their own commit. Historical observations about a different frozen deployment may remain when their subject and provenance are explicit.

## Machine contract

The attestation schema is `.ocp/verification-attestation.schema.json`. `scripts/create-verification-attestation.mjs` reads one completed `verification.json` and produces an immutable JSON attestation under `.ocp/attestations/runs/`.

Each attestation binds at least:

- exact repository and Git commit;
- trigger ref plus PR head/base refs and commits, when applicable;
- contract ID and version;
- workflow, run ID, attempt, event, result, and verification time;
- evidence run, verification-file hash, and primary artifact identity/digest;
- stages, browser projects, viewports, console errors, network failures, and evidence hashes;
- verifier class, environment, generator, and recorded time.

The attestation artifact does not contain its own artifact ID or digest. Its primary artifact reference points to the evidence bundle, so the attestation can be uploaded after it is generated without another recursive identity problem.

For a pull-request workflow, GitHub normally checks out a synthetic merge ref. That checked-out merge commit is the verification `subject`; the PR branch head and base remain separate `source_context`. The generator rejects an attestation when its requested subject differs from the Git commit recorded by the harness.

## GitHub Actions protocol

The verification workflow runs the harness with `continue-on-error`, uploads whatever evidence was produced, generates either a `PASS`, `FAIL`, or `ERROR` attestation, uploads that attestation independently, and finally restores the harness failure as the job result. Failed verification is therefore retained as evidence and is never presented as a pass.

For a branch to be promoted to Canonical Implementation:

1. resolve the exact current branch-head commit;
2. locate an external attestation whose subject equals that commit;
3. require the expected contract version and `ACCEPTANCE_VERIFIED` stage;
4. require `execution.result = PASS` and valid evidence references;
5. record the chosen attestation pointer in external operational state.

For the current adapter, GitHub Actions artifacts are the external store. A future D1 event adapter may index the immutable attestation and maintain the latest pointer, but it must not rewrite the subject commit or collapse observed verification into declared state.
