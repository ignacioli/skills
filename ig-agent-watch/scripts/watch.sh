#!/usr/bin/env bash
# Read-only facts for ig-agent-watch. Prints key=value lines; draws no conclusions.
# The only write is the --state snapshot, and only to a path you pass explicitly.
# Usage: watch.sh --worktree <dir> --base <commit> [options]   (see --help)

set -euo pipefail
unset GIT_DIR GIT_WORK_TREE GIT_COMMON_DIR 2>/dev/null || true
export GIT_OPTIONAL_LOCKS=0

command -v git >/dev/null 2>&1 || { echo "ERROR: git not found" >&2; exit 2; }
command -v python3 >/dev/null 2>&1 || { echo "ERROR: python3 not found" >&2; exit 2; }

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 -I "$DIR/watch.py" "$@"
