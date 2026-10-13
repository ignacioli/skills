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
