#!/usr/bin/env bash
# Facts-only gate for ig-worktree-gate. Prints KEY=value lines. Exit 0 always
# unless the path is not a git checkout (exit 1).
#
# Usage: audit.sh [repo-root]

set -euo pipefail
unset GIT_DIR GIT_WORK_TREE GIT_COMMON_DIR 2>/dev/null || true

ROOT="${1:-}"
if [[ -z "$ROOT" ]]; then
  ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "ERROR: not a git checkout" >&2
    exit 1
  }
fi
ROOT="$(cd "$ROOT" && git rev-parse --show-toplevel)"

CANDIDATES=(
  .handoff
  .agents/skills
  .cursor/skills
  .cursor/agents
  .claude/skills
  .claude/agents
  .codex/agents
  specs
  .specify/scripts
  .specify/templates
  .specify/workflows
  .specify/integrations
)

is_ignored() {
  local path="$1"
  git -C "$ROOT" check-ignore -q "$path" 2>/dev/null
}

PRIMARY="$(git -C "$ROOT" worktree list --porcelain | awk '/^worktree / { print $2; exit }')"
BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"
PROTECTED=no
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  PROTECTED=yes
fi

IS_PRIMARY=no
if [[ "$ROOT" == "$PRIMARY" ]]; then
  IS_PRIMARY=yes
fi

BOOTSTRAP=missing
for cand in \
  "$ROOT/scripts/bootstrap-local-worktree.sh" \
  "$PRIMARY/scripts/bootstrap-local-worktree.sh"
do
  if [[ -f "$cand" ]]; then
    BOOTSTRAP="$cand"
    break
  fi
done

MISSING=()
if [[ "$IS_PRIMARY" == "no" ]]; then
  for rel in "${CANDIDATES[@]}"; do
    src="$PRIMARY/$rel"
    dest="$ROOT/$rel"
    if [[ ! -e "$src" && ! -L "$src" ]]; then
      continue
    fi
    if ! is_ignored "$rel"; then
      continue
    fi
    if [[ -L "$dest" ]]; then
      dest_real="$(python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$dest")"
      src_real="$(python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$src")"
      if [[ "$dest_real" == "$src_real" ]]; then
        continue
      fi
      MISSING+=("$rel (wrong symlink)")
    elif [[ -e "$dest" ]]; then
      MISSING+=("$rel (real path, not symlink)")
    else
      MISSING+=("$rel")
    fi
  done
fi

missing_out="(none)"
if ((${#MISSING[@]})); then
  missing_out="$(IFS=', '; echo "${MISSING[*]}")"
fi

echo "GATE_ROOT=$ROOT"
echo "GATE_PRIMARY=$PRIMARY"
echo "GATE_IS_PRIMARY=$IS_PRIMARY"
echo "GATE_BRANCH=$BRANCH"
echo "GATE_PROTECTED=$PROTECTED"
echo "GATE_BOOTSTRAP=$BOOTSTRAP"
echo "GATE_MISSING=$missing_out"
