# Land: put the component spec on a repository

Run on a topic branch or worktree, never on the primary branch (`ig-worktree-gate` first if the repo uses it). Write the documents in the repo's own documentation language; the templates are English skeletons.

## 1. Inventory what exists

Locate, without creating anything yet:

- the value/token spec and its code (token types, font helpers);
- approved screens and the design file (Penpot file name, pages, boards; version history);
- lo-fi prototypes, if any, and whether they were approved as discovery input;
- the design-system code directory and every public component type in it;
- existing automated checks for tokens, contrast, icons, raw values in feature code;
- `AGENTS.md`, `CLAUDE.md`, constitution or equivalent charter.

**Done when:** each item is a real path or explicitly "none".

## 2. Write `components.md`

Copy [templates/components.md](templates/components.md) to `<design-root>/design-system/components.md` and fill it:

- §1 workflow: keep the tables; replace placeholders with the repo's real paths, check names and milestone gate names.
- §2 `DS-BASE`: the rules every component and page shares (token-only values, page margins, touch target, dynamic type, status = text + icon, visible mutation entry, accessibility of decorative parts). Cite the value spec, do not copy numbers.
- §3 index: one row per component ID → **every** public design-system type, source section/boards, consumer count (from a search, dated), status.
- §4 anatomy: one entry per ID, extracted from approved boards (class C — no new visual decisions). Parts in reading order → variants/states → invariants labelled `auto` / `automatable` / `manual` → reuse boundary.
- §5 gap register `CG-n`: dead components, hand-built repeats, hard-coded copy, undefined long-content rules, components without previews. Use a prefix that cannot collide with roadmap gate names.
- §6 per-milestone `implementation-map.md` convention.

Dead components or dead designs found here are reported to the owner with evidence (no consumers, superseded board); delete only on their decision.

**Done when:** the catalog test (step 4) would pass against the index, every ID has an anatomy heading, and nothing in §4 is a new design decision.

## 3. Wire the charter

Append [templates/agents-pointer.md](templates/agents-pointer.md) to `AGENTS.md` (and mirror into `CLAUDE.md` / constitution if the repo keeps them). If the repo has a "checkpoint done" rule requiring a human walkthrough per checkpoint, replace it with: automated gate + entry and layout map per checkpoint, human walkthrough only under the L3 triggers. Bump the constitution version if it has one.

**Done when:** the charter points at `components.md` and the per-checkpoint rule matches L0–L3.

## 4. Add the catalog test

Implement [templates/catalog-test.md](templates/catalog-test.md) in the repo's unit-test target with its own language and runner. Register the file in the project if the build system needs it.

**Done when:** the test runs green in the normal unit-test command, and fails if you temporarily add an unindexed public component (revert after).

## 5. Annotate the design file

Follow [tools/penpot.md](tools/penpot.md) §Annotate. Record the snapshot names, counts and the components that could not be identified automatically in the value spec's design-file record section.

**Done when:** before/after snapshots exist, validation reports no errors, and the record lists what is tagged and what is not.

## 6. Report

List files changed, checks run with results, owner decisions needed (dead code, gap priorities), and gaps the next milestone must handle first (its Phase 0). Commit only if asked.
