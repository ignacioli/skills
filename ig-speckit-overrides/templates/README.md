# SpecKit local overrides

Landed by the `ig-speckit-overrides` skill. Baseline: SpecKit (`specify` CLI) <BASELINE_VERSION> default templates
plus three rules (Done when + Proven by, one evidence task per checkpoint, references not copies) and an `analyze`
reference-integrity check (category G).

## Project proof

<!-- Fill in when landing. The skill never assumes a default. -->

- **Automated gate** (commands every checkpoint runs): <e.g. `make test`, `npm test && npm run build`>
- **Execution record path** (where evidence tasks write results): <e.g. `specs/<feature>/validation.md`>
- **Extra proof by change type** (optional): <e.g. entry/layout checklist for new UI, "no new UI" otherwise>

## Contents

| File | Role | After `specify` upgrade |
|---|---|---|
| `tasks-template.md`, `plan-template.md` | Highest-priority template layer (project override replaces the core template whole) | Not touched, but merge upstream template changes by hand (step 4) |
| `skill-patches/speckit-{tasks,plan,analyze}.diff` | Incremental patches to each integration's `SKILL.md` | `upgrade --force` resets `SKILL.md` to upstream; replay required (step 3) |
| `skill-patches/apply.sh` | Replays patches; skips if applied, prints `FAIL` and exits non-zero on conflict | — |
| `baselines/v<version>/` | Upstream originals (templates + claude `SKILL.md`) the current diffs were generated against | Add a new directory per upgrade (step 5) |

`README.md` is not resolved as a template (template names are `[a-z0-9-]` only).

## Sync after upgrading specify

1. Before: `specify integration status` should report only the 3 patched `SKILL.md` per integration as modified.
2. Upgrade: `specify self upgrade`, then `specify integration upgrade <name> --force` for **each** installed integration.
3. Replay: `.specify/templates/overrides/skill-patches/apply.sh .claude/skills .agents/skills .cursor/skills`.
   `FAIL` means upstream changed the surrounding text: merge the `.diff` by hand, then regenerate it (step 5).
4. Merge templates: `diff -u <old baseline>/templates/tasks-template.md .specify/templates/tasks-template.md`
   (and `plan-template.md`); carry upstream changes into the files here, keeping `- [ ] T### [P?] [US#?]` and `## Phase N:`.
5. Refresh the baseline: copy the new upstream `SKILL.md` (taken right after step 2, before step 3) and core templates into
   `baselines/v<new>/`, then regenerate:
   `diff -u --label .claude/skills/<s>/SKILL.md --label .claude/skills/<s>/SKILL.md baselines/v<new>/skills/<s>/SKILL.md .claude/skills/<s>/SKILL.md > skill-patches/<s>.diff`
6. Verify: `specify preset resolve tasks-template` says `project override`; `apply.sh --check` is all `ok`;
   `specify integration status` reports only the patched `SKILL.md`.
7. Worktrees: if gitignored toolchain directories are symlinked from the primary checkout, they see the new files; otherwise re-run your bootstrap.
