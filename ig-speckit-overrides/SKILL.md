---
name: ig-speckit-overrides
description: >-
  Local SpecKit enhancements as an on-demand workflow: every checkpoint gets
  Done when / Proven by, every checkpoint phase ends with one evidence task,
  facts are cited not copied, and analyze checks reference integrity. Use to
  land these overrides in a repository, to re-sync them after a specify
  upgrade, to check whether they are active, or when writing or checking
  tasks.md / plan.md and the checkpoint rules matter. Skip for repositories
  without .specify/, for plain spec writing, for one-off questions about
  SpecKit, and for adversarial proof review (use spec-adversarial-review).
---

# ig-speckit-overrides

Three rules on top of default SpecKit (`specify` CLI), delivered as two template overrides plus patches to three integration `SKILL.md` files. Baseline: **specify 1.1.3**. A newer CLI may change the surrounding text; `apply.sh` then reports `FAIL` instead of guessing.

`<skill-dir>` is the directory containing this `SKILL.md`; resolve it from where this file was loaded. `$REPO` is `git rev-parse --show-toplevel`. Do not special-case a product name.

## Branch

**Check** (default): "are the overrides active", "check speckit", or any task that touches tasks.md / plan.md where the rules matter.
**Land**: the repository has no `.specify/templates/overrides/` and the user asks to add them.
**Upgrade**: `specify` was upgraded (or is about to be) and the overrides must be re-synced.

Land and Upgrade edit files: do them on a topic branch, never on `main`/`master` (run `ig-worktree-gate` first if installed). Do not commit, push, or open a PR unless asked.

## Check (read-only)

```bash
bash "<skill-dir>/scripts/check.sh" "$REPO"
```

It prints `KEY=value` facts, `ISSUE=` lines, and a final `CHECK: OK | ISSUES (n)`. It writes nothing. What it covers:

| Fact | Expected |
|---|---|
| `RESOLVE_tasks-template`, `RESOLVE_plan-template` | `project override` (from `specify preset resolve`) |
| `PATCH …` for `.claude/skills`, `.agents/skills`, `.cursor/skills` (those that exist) | every line `ok … (already applied)` |
| `OVERRIDE_FILE_*` | all `present` |
| `FEATURE_JSON` / `FEATURE_DIR_EXISTS` / `FEATURE_MATCHES_BRANCH` | points at the feature you are working on |
| `PROJECT_PROOF` | `declared` |
| `SKILL_COPY_*` | informational: `differs` means the landed copy was edited locally or this skill moved on |

Known pitfall: `.specify/feature.json` can stay on an old feature, so `check-prerequisites.sh` silently resolves to the wrong directory. `SPECIFY_FEATURE_DIRECTORY` overrides it. The script only reports the mismatch; fix it by pointing `feature_directory` at the right `specs/` directory (ask first if unsure which one is current).

Report the output, then the next action per `ISSUE=` line: missing files → **Land**; `needed`/`FAIL` patches or wrong resolve layer after an upgrade → **Upgrade**.

## Land

1. Confirm `.specify/` exists and `specify --version` is available. If not, stop: this skill does not install SpecKit.
2. Ask where the **Project proof** lives (gate commands, execution record path, extra proof by change type). Do not assume values from another project. Put the answer in the target's `.specify/templates/overrides/README.md` (and optionally a pointer in `AGENTS.md`).
3. Copy, never overwriting an existing file without asking:

```bash
OV="$REPO/.specify/templates/overrides"
mkdir -p "$OV/skill-patches"
cp "<skill-dir>/templates/tasks-template.md" "<skill-dir>/templates/plan-template.md" "$OV/"
cp "<skill-dir>/templates/README.md" "$OV/README.md"            # then fill Project proof + <BASELINE_VERSION>
cp "<skill-dir>/skill-patches/"* "$OV/skill-patches/"
chmod +x "$OV/skill-patches/apply.sh"
```

4. Snapshot the pre-patch upstream originals so later upgrades can regenerate diffs: copy each integration's three `SKILL.md` (`speckit-{tasks,plan,analyze}`) from `.claude/skills` and the core `.specify/templates/{tasks,plan}-template.md` into `$OV/baselines/v<specify version>/{skills/<s>/SKILL.md,templates/}`. Do this before step 5.
5. Replay: `"$OV/skill-patches/apply.sh" .claude/skills .agents/skills .cursor/skills` (roots that do not exist are skipped). Already applied → `ok`; conflict → `FAIL`, exit non-zero. Never force a patch; on `FAIL` merge the `.diff` by hand and regenerate it (Upgrade step 5).
6. Verify with **Check**. Tell the user the overrides directory may be gitignored in their repo; whether to track it is their call.

## Upgrade

Run from `$REPO`, in order. Stop and report at any unexpected result.

1. `specify integration status`: only the 3 patched `SKILL.md` per integration may be reported modified. Anything else: explain it before upgrading.
2. `specify self upgrade`, then `specify integration upgrade <name> --force` for **each** installed integration (they do not follow the default one). `--force` resets the `SKILL.md` files to upstream; the patches live in the overrides directory and are not lost.
3. Snapshot the fresh upstream `SKILL.md` and core templates into `$OV/baselines/v<new version>/` (as in Land step 4) **before** replaying.
4. `apply.sh .claude/skills .agents/skills .cursor/skills`. All `applied`/`ok` → continue. `FAIL` → open the `.diff`, merge the new paragraph into the new `SKILL.md` by hand.
5. Merge templates: overrides replace core templates whole, so upstream template changes do not arrive on their own. `diff -u <old baseline>/templates/tasks-template.md .specify/templates/tasks-template.md` (and `plan-template.md`), carry changes into the override files, keep `- [ ] T### [P?] [US#?]` and `## Phase N:` formats. Regenerate any hand-merged patch against the new baseline:
   `diff -u --label .claude/skills/<s>/SKILL.md --label .claude/skills/<s>/SKILL.md <baseline SKILL.md> .claude/skills/<s>/SKILL.md > skill-patches/<s>.diff`
6. Update `<BASELINE_VERSION>` in the overrides README, then run **Check**. `specify integration status` must again report only the patched files.
7. Worktrees: linked/bootstrapped worktrees that symlink the toolchain directories see the change; others need their bootstrap re-run.

## The rules (points only)

Source of truth is the landed templates; read them rather than this summary when writing artifacts.

1. **Done when / Proven by.** Every `**Checkpoint**` in tasks.md is followed by *Done when* (observable outcome citing FR/SC/AC IDs) and *Proven by* (command, test file, or recorded artifact). "Works", "verified", or a task ID is not a proof.
2. **One evidence task per checkpoint phase.** The last task of each phase with a Checkpoint is `- [ ] T### [US#?] Phase N checkpoint evidence in <execution record path>`: it runs the proof, records the result, adds no implementation or tests. Setup and Polish phases have no checkpoint and no evidence task. plan.md **Checkpoint Evidence** names the gate commands and record path.
3. **References, not copies.** A fact lives in one artifact (requirements → spec; fields/validation → data-model; interfaces → contracts; decisions → research/plan). Others cite it (`per data-model.md §3`, `spec FR-012`). data-model.md and contracts/ number their sections (§N). Sources that are wrong or silent get flagged, not patched inside a task.
4. **analyze category G (Reference Integrity).** Reports *broken reference*, *restatement*, *restatement drift* (HIGH), and *checkpoint proof* (missing Done when/Proven by, proof that is only "works" or a task ID, checkpoint phase without evidence task), with matching Metrics counts. It also loads data-model.md and contracts/ when present.

No phase or task caps and no test-first gate are added.

## Project proof (declared per repository)

What counts as proof differs per repository (build, test suites, UI or entry checklists). This skill ships no default. The target declares it in the **Project proof** section of `.specify/templates/overrides/README.md` and/or `AGENTS.md`; the patched `speckit-tasks` and the templates point there. If undeclared, `check.sh` reports `PROJECT_PROOF=not declared`; ask the user rather than inventing commands.

## Relation to other tools

- `speckit-analyze` (patched) checks spec/plan/tasks agreement including category G. The `spec-adversarial-review` skill (if installed) reviews the proof architecture itself (duplicate proofs, subjective DONE, wrong validation layer); run analyze first, it complements rather than replaces it.
- `ig-worktree-gate` keeps `main` clean and links gitignored `.specify` subtrees into worktrees; the overrides directory is one of them.
