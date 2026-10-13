# skills

Personal agent skills, shared as-is. Each skill is a self-contained directory with a `SKILL.md` (plus optional `agents/openai.yaml` for Codex-style metadata and supporting files).

## Skills

### [ig-design-system](ig-design-system/SKILL.md)

A component-first visual workflow for UI work. Tokens fix values; a written component **anatomy** fixes structure. The skill classifies every UI change by design delta (0→1, revision, spec backfill, drift repair), requires a component spec before dependent code, and verifies bottom-up (tokens, component contract, page composition) so humans only review where judgment is needed.

- **Triggers when**: creating or changing user-visible UI, landing a component spec on a repository, or backfilling a spec and design-file annotations from approved designs.
- **Contents**: workflow in `SKILL.md`; [land.md](ig-design-system/land.md) for putting the spec on a repo; [templates/](ig-design-system/templates) (component spec, implementation map, catalog test, `AGENTS.md` pointer); [tools/](ig-design-system/tools) for the hi-fi and lo-fi tools.
- **Dependencies** (all optional): [Penpot](https://penpot.app) MCP server as the default hi-fi tool, [Open Design](ig-design-system/tools/open-design.md) MCP server as the default lo-fi tool. Without them, keep the same gates and record where the approved source lives. `land.md` mentions `ig-worktree-gate` as an optional first step if you also install it.

### [ig-handoff](ig-handoff/SKILL.md)

Writes one session-end handoff note to `.handoff/` in the workspace, so the next session (human or agent) knows where the work stands: workspace snapshot (repo, branch, HEAD, worktree/submodule/symlink topology), what was solved, AI proposals versus human decisions, real blockers, and what to pick up first.

- **Triggers when**: you explicitly name `ig-handoff` at the end of a session. It is user-invoked only (`disable-model-invocation: true`, no implicit invocation in `agents/openai.yaml`). It never resumes work from an existing handoff file.
- **Language**: the note is written in Chinese by default; if the invoking prompt is 100% English it writes English, and "in English" overrides.
- **Dependencies**: none. Add `.handoff/` to your `.gitignore` (the skill assumes these notes are not committed).

### [ig-worktree-gate](ig-worktree-gate/SKILL.md)

A gate that runs before tracked-file edits. It keeps primary branches (`main`/`master`) clean by requiring a topic branch in its own worktree, and keeps gitignored toolchain directories (skills, agents, `.handoff`, SpecKit runtime subtrees) consistent across worktrees by relative-symlinking them from the primary checkout. It prints a `GATE: PASS | BLOCKED` status block and a next action.

- **Triggers when**: starting or resuming work in a git repository or worktree, after `git worktree add`, or when asked to check the git environment, keep main clean, bootstrap a worktree, or land the policy on a new repository (`Land` branch copies the bootstrap script and an `AGENTS.md` pointer into that repo).
- **Contents**: workflow in `SKILL.md`; [scripts/audit.sh](ig-worktree-gate/scripts/audit.sh) (facts-only audit); [scripts/bootstrap-local-worktree.sh](ig-worktree-gate/scripts/bootstrap-local-worktree.sh) (idempotent linker, supports `--dry-run` and `--force`); [repo-pointer.md](ig-worktree-gate/repo-pointer.md) (text to append to a repo's `AGENTS.md`).
- **Dependencies**: `bash`, `git`, `python3` (used for `realpath`/`relpath`). Optional: `ig-handoff` for topology snapshots.
- **Opinionated defaults**: the list of linked paths is hard-coded in both scripts (`.handoff`, `.agents/skills`, `.cursor/{skills,agents}`, `.claude/{skills,agents}`, `.codex/agents`, `.specify/{scripts,templates,workflows,integrations}`, and `specs`). Missing sources are skipped. `specs` is the author's convention of a symlink to a separate private specs repository; edit the list in `audit.sh` and `bootstrap-local-worktree.sh` together if your layout differs, or skip this skill entirely.

### [spec-adversarial-review](spec-adversarial-review/SKILL.md)

A thresholded adversarial review of a spec / plan / task decomposition. It critiques the **proof architecture**, not the feature: every claim should be proved once, at the right layer, by a deterministic mechanism, without re-proving it through expensive end-to-end, screenshot or manual-visual loops. Findings must be reachable and mechanically evidenced, carry a severity and a remediation target, and the review is read-only unless you authorize spec edits. Repeat runs are gated (`INITIAL` / `DELTA` / `INCIDENT`) so the skill does not cause spec churn.

- **Triggers when**: you ask for an adversarial / red-team spec review, a proof-ownership review, or validation-harness design; best run after the task breakdown exists and before implementation, or after a material change to the proof architecture.
- **Dependencies**: none. It complements cross-artifact consistency tools such as SpecKit's `analyze` (spec/plan/tasks agreement), which you can run first if you use them. Platform-agnostic: web, mobile, desktop, CLI, service.

## Install

Clone once, then link (or copy) the skill directories you want into each tool's skills directory.

```bash
git clone https://github.com/ignacioli/skills.git ~/src/ignacioli-skills
```

Symlinks are recommended: a `git pull` then updates every tool at once. Copy instead if your tool or filesystem does not follow symlinks (you then re-copy after each update).

| Tool | Skills directory | Method |
|---|---|---|
| Claude Code | `~/.claude/skills/` | symlink (or copy) |
| Codex | `~/.codex/skills/` | symlink (or copy) |
| Cursor | `~/.cursor/skills/` | symlink (or copy) |

Example for one skill and one tool:

```bash
mkdir -p ~/.claude/skills
ln -s ~/src/ignacioli-skills/ig-design-system ~/.claude/skills/ig-design-system
# or: cp -R ~/src/ignacioli-skills/ig-design-system ~/.claude/skills/
```

Repeat per tool and per skill. If you keep one canonical directory (for example `~/.agents/skills/`), link the repo's skills there and symlink the tool directories to it.

## License

See [LICENSE](LICENSE).
