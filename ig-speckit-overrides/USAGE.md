# Using ig-speckit-overrides

A worked example for a new project, `acme-notes`, already initialised with `specify init` (claude and codex integrations). `SKILL.md` is the agent-facing procedure; this page is for humans.

## 1. Install the skill (once)

```bash
ln -s ~/src/ignacioli-skills/ig-speckit-overrides ~/.claude/skills/ig-speckit-overrides
```

## 2. Land: enable the overrides in the project

Say "land the SpecKit overrides in this repo", or name `$ig-speckit-overrides`. The agent will:

1. Work on a topic branch (never `main`).
2. Confirm `.specify/` and `specify --version` exist.
3. **Ask you for the Project proof**, for example:
   - automated gate: `npm test && npm run build`
   - execution record: `specs/<feature>/validation.md`
   - extra proof by change type: route checklist for new pages, otherwise "no new UI"
4. Copy templates, README and patches into `.specify/templates/overrides/`, and write your answers into the README's **Project proof** section.
5. Snapshot the upstream originals into `baselines/v<version>/`, then run `apply.sh .claude/skills .agents/skills`.
6. Run Check; `CHECK: OK` means done.

You only name the skill for Land. After that the overrides live in the repository.

## 3. Daily use: no extra invocation

Run `/speckit-specify`, `/speckit-plan`, `/speckit-tasks` as usual. The patched skills and templates produce:

```markdown
- [ ] T012 [US1] Validate note title per data-model.md §2 in src/notes/service.ts
- [ ] T015 [US1] Phase 3 checkpoint evidence in specs/001-notes/validation.md

**Checkpoint**: notes can be created and searched
- **Done when**: a created note is found by title search (FR-003, SC-001)
- **Proven by**: `npm test` (notes.search.test.ts) and the validation.md record
```

Tasks cite `§2` instead of copying the field constraint.

## 4. `/speckit-analyze`

The report gains category G findings (broken reference, restatement, restatement drift, checkpoint proof) and matching Metrics counts.

## 5. Check: quick self-test

Say "check the speckit overrides", or run:

```bash
bash <skill-dir>/scripts/check.sh "$(git rev-parse --show-toplevel)"
```

Useful before starting a new feature (`FEATURE_MATCHES_BRANCH=no` means `.specify/feature.json` may still point at an old feature) and whenever tasks.md does not look like it follows the rules (template not resolving to `project override`, patches not `ok`).

## 6. Upgrade: after `specify` is upgraded

Say "specify was upgraded, re-sync the overrides". The agent follows the 7 steps in `SKILL.md`: upgrade every integration, snapshot the new upstream files, replay the patches, merge template changes, then Check. A `FAIL` from `apply.sh` means upstream changed the surrounding text and the diff needs a manual merge.

## When it applies

| Situation | What happens |
|---|---|
| New project, you ask to land | Land runs once; later specs follow the rules automatically |
| Overrides landed, you ask for a check or upgrade | Check / Upgrade |
| Agent writes or checks tasks.md / plan.md and the rules matter | It may load the skill implicitly (`allow_implicit_invocation: true`) and run Check; it does not land by itself |
| Repository already carries its own older copy of the patches | Not migrated by this skill; `apply.sh` may report `FAIL` for the changed patch. Existing specs are not rewritten |
| No `.specify/`, plain spec writing, adversarial proof review | Not triggered (use `spec-adversarial-review` for the last) |
