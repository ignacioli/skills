# skills

Personal agent skills, shared as-is. Each skill is a self-contained directory with a `SKILL.md` (plus optional `agents/openai.yaml` for Codex-style metadata and supporting files).

## Skills

### [ig-agent-watch](ig-agent-watch/SKILL.md)

A read-only patrol for an AI agent (Codex, Cursor, OpenCode, a Claude sub-session, any CLI agent) running a long task in a git worktree. A script reports facts only: progress since a base commit, log growth and repeated errors, files outside `--scope` or matching `--forbid`, test-versus-source size, new test infrastructure, deleted or modified assertions, added skip markers, and whether the agent process is alive. `SKILL.md` maps each fact to normal / watch / needs-human with default thresholds and known false alarms, and gives a recurring-patrol prompt and report format. It never stops the agent.

- **Triggers when**: an agent is mid-run and you want to know whether it drifted, is looping, is over-building tests or has stalled (one-off or on a timer), or right after it exits.
- **Contents**: workflow and reading table in `SKILL.md`; worked examples in [USAGE.md](ig-agent-watch/USAGE.md); [scripts/watch.sh](ig-agent-watch/scripts/watch.sh) (wrapper) and [scripts/watch.py](ig-agent-watch/scripts/watch.py) (facts, `key=value` output).
- **Dependencies**: `bash`, `git`, `python3` (standard library only), `ps`. Project specifics (scope, forbidden paths, test and log patterns) are passed as options or a `.long-task-watch.conf` file; defaults cover common test file names for Swift, Go, TypeScript/JavaScript, Python, Java/Kotlin and Ruby.
- **Writes**: nothing, except a `--state` snapshot at a path you give outside the worktree.

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

### [ig-speckit-overrides](ig-speckit-overrides/SKILL.md)

Local enhancements for [SpecKit](https://github.com/github/spec-kit) as an on-demand workflow: every checkpoint in `tasks.md` carries **Done when / Proven by**, every checkpoint phase ends with one evidence task, facts are cited instead of copied between spec/plan/data-model/tasks, and `analyze` gains a Reference Integrity check, reported as a new section G after upstream's A–F (broken reference, restatement, restatement drift, checkpoint proof). Delivered as two template overrides plus patches to the `speckit-{tasks,plan,analyze}` `SKILL.md` files.

- **Triggers when**: landing the overrides in a repository (`Land`), re-syncing them after a `specify` upgrade (`Upgrade`), checking that they are active (`Check`, the default), or writing/checking `tasks.md` and `plan.md` where the checkpoint rules matter.
- **Contents**: workflow in `SKILL.md`; a worked example in [USAGE.md](ig-speckit-overrides/USAGE.md); [scripts/check.sh](ig-speckit-overrides/scripts/check.sh) (read-only facts: template resolution, patch status per integration, `feature.json`); [templates/](ig-speckit-overrides/templates) (tasks/plan overrides, overrides README); [skill-patches/](ig-speckit-overrides/skill-patches) (three `.diff` files and an idempotent `apply.sh` that reports `FAIL` on conflict).
- **Dependencies**: SpecKit `specify` CLI (patches are generated against the 1.1.3 skill text; other versions may report `FAIL` and need a manual merge), `bash`, `patch`, `git`. Optional: `ig-worktree-gate`, `spec-adversarial-review`.
- **Per-repository setting**: what counts as proof (build, tests, UI checklists) is declared by the target repository in a **Project proof** section; the skill ships no default.

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

### [obsidian-notes](obsidian-notes/SKILL.md)

Distills significant, reusable knowledge from ongoing work (major findings, cross-project lessons, architecture or technology choices, decisions, open questions) into a personal Obsidian vault as a short, focused note. It is deliberately conservative: it writes only on an explicit capture request, reads zero existing notes by default, never scans the vault, never logs routine progress, and redacts credentials and personal identifiers.

- **Triggers when**: you ask to capture something to Obsidian (the trigger phrases are Chinese: 记录到 Obsidian / 记到笔记 / 沉淀一下, plus "obsidian note"), or have explicitly asked for noteworthy findings to be captured during the current work.
- **Configuration**: set the `OBSIDIAN_VAULT` environment variable to your vault root (for example in Claude Code's `settings.json` under `env`). Without it, the skill uses a connected Obsidian connector's vault or asks once.
- **Dependencies**: an Obsidian connector / MCP is optional; otherwise the skill reads and writes plain Markdown files. The folder map in the Placement section and the Chinese note headings are the author's defaults; edit them to fit your vault.

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
