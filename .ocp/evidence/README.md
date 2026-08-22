# OCP verification evidence

`npm run verify` creates one self-describing run under `runs/RUN-<UTC timestamp>/`.

Run directories are intentionally ignored by Git. They remain available in the local workspace and are uploaded as immutable GitHub Actions artifacts. A committed state record may point to a run, but a run never promotes product state by itself.

Each completed bundle contains the machine manifest, build/runtime log, Playwright report, screenshots, DOM snapshots, aggregated console and network records, per-browser observations, final verification result, and SHA-256 artifact hashes. Secrets and session credentials must never enter a bundle.
