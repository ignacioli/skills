#!/usr/bin/env bash
# Facts-only check for ig-speckit-overrides. Prints KEY=value lines and a final
# CHECK line. Never writes files. Exit 0 unless the path is not a git checkout (exit 1).
#
# Usage: check.sh [repo-root]

set -euo pipefail
unset GIT_DIR GIT_WORK_TREE GIT_COMMON_DIR 2>/dev/null || true

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="${1:-}"
if [[ -z "$ROOT" ]]; then
  ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "ERROR: not a git checkout" >&2; exit 1; }
fi
ROOT="$(cd "$ROOT" && git rev-parse --show-toplevel)" || { echo "ERROR: not a git checkout" >&2; exit 1; }
cd "$ROOT"

issues=0
issue() { issues=$((issues + 1)); echo "ISSUE=$1"; }

OV=.specify/templates/overrides
echo "ROOT=$ROOT"
echo "BRANCH=$(git branch --show-current 2>/dev/null || true)"

# 1. specify and baseline version
if command -v specify >/dev/null 2>&1; then
  echo "SPECIFY_CLI=$(specify --version 2>&1 | head -1)"
else
  echo "SPECIFY_CLI=missing"; issue "specify CLI not on PATH"
fi
if [[ -f .specify/init-options.json ]]; then
  echo "SPECIFY_PROJECT_VERSION=$(sed -n 's/.*"speckit_version"[^"]*"\([^"]*\)".*/\1/p' .specify/init-options.json | head -1)"
fi
echo "SKILL_BASELINE=1.1.3"

# 2. override files present
for f in tasks-template.md plan-template.md README.md skill-patches/apply.sh; do
  if [[ -e "$OV/$f" ]]; then echo "OVERRIDE_FILE_$f=present"; else echo "OVERRIDE_FILE_$f=missing"; issue "$OV/$f missing (Land not done?)"; fi
done

# 3. template resolution must come from the project override
if command -v specify >/dev/null 2>&1; then
  for t in tasks-template plan-template; do
    out="$(COLUMNS=500 specify preset resolve "$t" 2>&1 || true)"
    layer="$(printf '%s\n' "$out" | sed -n 's/.*(top layer from: \(.*\)).*/\1/p' | head -1)"
    echo "RESOLVE_$t=${layer:-unknown}"
    [[ "$layer" == "project override" ]] || issue "$t resolves to '${layer:-unknown}', expected 'project override'"
  done
fi

# 4. skill patches on every integration root that exists
APPLY="$OV/skill-patches/apply.sh"
if [[ -x "$APPLY" ]]; then
  roots=()
  for r in .claude/skills .agents/skills .cursor/skills; do [[ -d "$r" ]] && roots+=("$r"); done
  if [[ ${#roots[@]} -eq 0 ]]; then
    echo "PATCH_ROOTS=none"; issue "no integration skills directory found"
  else
    echo "PATCH_ROOTS=${roots[*]}"
    while IFS= read -r line; do
      echo "PATCH $line"
      case "$line" in ok*|skip*) ;; *) issue "patch not ok: $line" ;; esac
    done < <("$APPLY" --check "${roots[@]}" 2>&1 || true)
  fi
fi

# 5. landed copy vs this skill's copy (informational)
for f in tasks-template.md plan-template.md skill-patches/speckit-tasks.diff skill-patches/speckit-plan.diff skill-patches/speckit-analyze.diff skill-patches/apply.sh; do
  src="$SKILL_DIR/templates/$f"; [[ -e "$src" ]] || src="$SKILL_DIR/$f"
  if [[ -e "$OV/$f" && -e "$src" ]]; then
    if cmp -s "$src" "$OV/$f"; then echo "SKILL_COPY_$f=same"; else echo "SKILL_COPY_$f=differs"; fi
  fi
done

# 6. project proof declared
if grep -qs "Project proof" "$OV/README.md" AGENTS.md 2>/dev/null; then
  echo "PROJECT_PROOF=declared"
else
  echo "PROJECT_PROOF=not declared"; issue "no 'Project proof' section in $OV/README.md or AGENTS.md"
fi

# 7. feature.json
FJ=.specify/feature.json
if [[ -f "$FJ" ]]; then
  fd="$(sed -n 's/.*"feature_directory"[^"]*"\([^"]*\)".*/\1/p' "$FJ" | head -1)"
  echo "FEATURE_JSON=${fd:-unreadable}"
  if [[ -n "$fd" && -d "$fd" ]]; then echo "FEATURE_DIR_EXISTS=yes"; else echo "FEATURE_DIR_EXISTS=no"; issue "feature.json points at a missing directory: ${fd:-?}"; fi
  [[ -n "${SPECIFY_FEATURE_DIRECTORY:-}" ]] && echo "FEATURE_ENV_OVERRIDE=$SPECIFY_FEATURE_DIRECTORY"
  base="$(basename "${fd:-}")"; br="$(git branch --show-current 2>/dev/null || true)"
  if [[ -n "$base" && -n "$br" ]] && grep -qF -- "$base" <<<"$br"; then
    echo "FEATURE_MATCHES_BRANCH=yes"
  else
    echo "FEATURE_MATCHES_BRANCH=no (branch '$br' does not contain '$base'; confirm this is the feature you are working on)"
  fi
else
  echo "FEATURE_JSON=absent"
fi

if [[ $issues -eq 0 ]]; then echo "CHECK: OK"; else echo "CHECK: ISSUES ($issues)"; fi
