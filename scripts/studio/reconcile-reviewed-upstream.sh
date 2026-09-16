#!/usr/bin/env bash
set -euo pipefail
# Exact upstream inspected in this task. Never substitutes a moving branch tip.
upstream=3a815454377aa077cdd78633b6cec9e314b77889
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
if git merge-base --is-ancestor "$upstream" HEAD; then
  exit 0
fi
set +e
git merge --no-commit --no-ff "$upstream"
result=$?
set -e
if [ "$result" -ne 0 ]; then
  while IFS= read -r file; do
    case "$file" in
      .github/workflows/studio-v8.yml|docs/STUDIO-V8-SOURCE-MANIFEST.json|public/ocp-studio/app.mjs)
        # Retain new lineage controls. The reviewed upstream script reapplies
        # its hierarchy ordering to app.mjs below.
        git checkout --ours -- "$file"
        git add "$file"
        ;;
      *)
        printf 'Unreviewed merge conflict: %s\n' "$file" >&2
        git merge --abort
        exit 1
        ;;
    esac
  done < <(git diff --name-only --diff-filter=U)
fi
node scripts/studio/finalize-ui.mjs
node scripts/studio/normalize-source-once.mjs
git add public/ocp-studio scripts/studio/finalize-ui.mjs docs/STUDIO-V8-SOURCE-MANIFEST.json
git commit -m 'merge: preserve reviewed upstream viewport fixes and v8 hierarchy lineage [skip ci]'
