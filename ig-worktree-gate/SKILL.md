---
name: ig-worktree-gate
description: >-
  Gates git work before edits: keep primary branches (main/master) clean and
  keep gitignored toolchain dirs consistent in worktrees. Use when starting
  or resuming work in any git repository or worktree, after git worktree add,
  or when the user asks to check the git environment, keep main clean,
  bootstrap a worktree, or land this policy on a new repository. Skip for
  read-only questions, non-git directories, ignored-file-only edits, or when
  this session already printed GATE: PASS for the same worktree and branch.
---

# ig-worktree-gate

This skill is a **gate**. Tracked-file edits start only after it prints `GATE: PASS`. It applies to **any git repository** (`$REPO`). Do not special-case a product name.

Two invariants:

1. **Clean primary** — do not modify, stage, or commit tracked files on `main` or `master` (or another name the repo's `AGENTS.md` calls primary). Prefer a topic branch in its own worktree.
2. **Ignored dirs in worktrees** — `git worktree add` does not copy gitignored trees. Skills, agents, `.codex/agents`, `.handoff`, SpecKit runtime subtrees, and similar must come from the **primary checkout** via the repo bootstrap script — not copied into git, not the whole of `.specify/`, `.cursor/`, or `.codex/`.

`ig-handoff` snapshots topology. This skill **audits and repairs** it. Cheap when already green: run the audit script, print the status block, continue the user's task.

## When not to run

Do not run the audit, and do not print a status block, when any of these holds:

- The task is a read-only question, explanation, or code reading that will not modify, stage, or commit any file.
- The target is not inside a git checkout (the audit would only report `not a git checkout`).
- The task only edits gitignored files (`.handoff/`, local skills, scratch notes). These are allowed on the primary checkout.
- This session already printed `GATE: PASS` for the same worktree, and the branch and `cwd` have not changed since. Re-run only after `git worktree add`, a branch switch, a new checkout, or a change to the link set.
- The repository's own `AGENTS.md` or contributor docs already define an equivalent or stricter worktree policy and the user wants that followed. Follow the repository; do not stack this gate on top.
- The checkout is a separate repository linked into the current one (for example a private specs repository). Do not run this gate's bootstrap there.

When skipped, say nothing about the gate and continue the task.

## Branch

**Audit** (default): starting/resuming work, `git worktree add`, "check git environment", "keep main clean".

**Land**: the user asks to apply this policy to a repository that has no bootstrap script yet.

## Audit (every run)

Unset `GIT_DIR` `GIT_WORK_TREE` `GIT_COMMON_DIR`. Resolve `$REPO` with `git rev-parse --show-toplevel` (or `git -C <path>` when the session root is the wrong checkout). `<skill-dir>` below is the directory that contains this `SKILL.md`; resolve it from where this file was loaded, not from a fixed install path. Then:

```bash
bash "<skill-dir>/scripts/audit.sh" "$REPO"
```

**Completion criterion:** the script printed a status block, and the next action below matches that block.

| Fact | Next action |
|------|-------------|
| `GATE_PROTECTED=yes` and the user task needs tracked-file edits | **BLOCKED.** Create a topic worktree from up-to-date `origin/main` (or the repo's primary). Do not edit the primary checkout. `cwd` for later commands is the new worktree. Cursor `move_agent_to_root` may fail; use absolute paths. Then re-run audit. |
| `GATE_PROTECTED=yes` and the task is read-only | `GATE: PASS` with note: primary is read-only this turn. |
| Not primary, `GATE_BOOTSTRAP` is a path | `cd` that worktree, run `bash "$GATE_BOOTSTRAP"` (idempotent), re-run audit. |
| Not primary, `GATE_BOOTSTRAP=missing`, and `GATE_MISSING` is non-empty | **BLOCKED** unless the user asked to **land**. Do not invent a link list. |
| Not primary, bootstrap present or nothing to link, `GATE_MISSING` empty | `GATE: PASS`. Continue the user's task in this worktree. |

Gitignored-only edits on the primary checkout (`.handoff/`, local skills) are allowed. Tracked files are not.

Do not `git push` or open a PR as part of this gate.

### Status block

Print this (fill from the script). Then stop if blocked; otherwise do the user's actual request.

```
GATE: PASS | BLOCKED
root: …
primary: …
worktree: primary | linked
branch: …
protected: yes | no
bootstrap: path | missing
missing links: (none) | …
next: …
```

## Land (only when asked)

Copy the template into `$REPO` **on a topic branch / worktree**, never on primary:

```bash
mkdir -p "$REPO/scripts"
cp "<skill-dir>/scripts/bootstrap-local-worktree.sh" \
   "$REPO/scripts/bootstrap-local-worktree.sh"
chmod +x "$REPO/scripts/bootstrap-local-worktree.sh"
```

A repo may add an identity check (so the script refuses a sibling git repo). Do not copy another machine's `.agents`, `.cursor`, or `.codex` into git or into a worktree.

Append the pointer in [repo-pointer.md](repo-pointer.md) to `$REPO/AGENTS.md` (and a `*.zh.md` sibling if that repo already keeps one). Do not paste this whole skill into `AGENTS.md`.

Then run bootstrap from the worktree to wire and re-audit. Commit only if the user asked.

## Hard guards

- Relative symlinks from the current worktree to the primary checkout. Skip missing sources.
- If the destination exists and is a real directory, stop and report; `--force` backs it up. `--force` is invalid on the primary checkout.
- Link listed **runtime subtrees** only (for example `.codex/agents`, not all of `.codex/`).
- A separate repository linked into this one (for example `specs` symlinked to another repo) is a **different git repo**; do not run this bootstrap there.
- `git push` updates a remote branch. It does not open a pull request.
