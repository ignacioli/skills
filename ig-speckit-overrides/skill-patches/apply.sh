#!/usr/bin/env bash
# Replay the local SpecKit skill patches (ig-speckit-overrides) after `specify integration upgrade`.
# Usage (repo root): .specify/templates/overrides/skill-patches/apply.sh [--check] [skills-root ...]
# Default skills root: .claude/skills. Exits non-zero if any patch does not apply cleanly.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
DIR=.specify/templates/overrides/skill-patches
CHECK=false
[ "${1:-}" = "--check" ] && { CHECK=true; shift; }
ROOTS=("${@:-.claude/skills}")
status=0
for root in "${ROOTS[@]}"; do
  for p in "$DIR"/*.diff; do
    s=$(basename "$p" .diff)
    target="$root/$s/SKILL.md"
    [ -f "$target" ] || { echo "skip   $target (missing)"; continue; }
    if patch --dry-run -R -s -f "$target" < "$p" >/dev/null 2>&1; then
      echo "ok     $target (already applied)"
    elif patch --dry-run -s -f "$target" < "$p" >/dev/null 2>&1; then
      if $CHECK; then echo "needed $target"; else patch -s -f --no-backup-if-mismatch "$target" < "$p"; echo "applied $target"; fi
    else
      echo "FAIL   $target (upstream changed; merge $p by hand)"; status=1
    fi
  done
done
exit $status
