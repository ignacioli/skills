# AGENTS.md section (append; adjust paths)

## Visual Work: Component-First

Every task that creates or changes user-visible UI follows `<design-root>/design-system/components.md` §1 before editing:

1. **Read before editing.** Read the affected approved screens, the relevant value-spec sections and the affected `components.md` entries. Tokens alone do not define layout; anatomy does.
2. **Classify by design delta, not by wording.** Per affected component: (A) 0→1 design, (B) revision of an approved design, (C) spec backfill for an unchanged approved design, or (D) implementation drift repair; then reuse, extend, new shared, or feature-owned. State the rationale yourself; routine confirmation is not required. A and B need owner review in the design file before code; C and D do not repeat visual approval. Never change the design to legitimize drifted code.
3. **Spec before code.** A component's `components.md` entry (or the milestone `implementation-map.md` entry for a feature-owned component) is final before code that depends on it. Feature views compose `DS-*` components and tokens only; repeated hand-built structure is a missing component — register it in `components.md` §5 instead of copying it again.
4. **Validate components first, then sample pages.** L0 token and L1 component-contract checks are automated and pass first (add a test for each automatable invariant you introduce). L2 relies on the raw-value scan plus an entry and layout map per checkpoint (screen, visible control, identifier, data mutation, width owner) instead of a human walkthrough. L3 human review is reserved for new design decisions, a spec's named core screens when first implemented, one consolidated walkthrough before the milestone acceptance gate, and specific doubts the agent names.
5. **Record the five-line execution record** (`components.md` §1.5) with actual results, not intentions.

Ask the owner one targeted question only for a real authority conflict, an undecidable design delta that changes the approach, or an unapproved substantive design decision; keep doing work that does not depend on the answer.

## Visual Work: Design Alignment and Screen Conformance

Add this section when the repo uses `<skill>/alignment.md` and `<skill>/screen-conformance.md`; replace every `<…>` with the repo's real path or command.

1. **One authority direction.** Rules define values and relations: `<design-root>/design-system/README.md` (tokens and the geometry contract) and `components.md` (anatomy, the page-flow table `DS-PAGE-FLOW`, registered exceptions). Boards in the design file are instances of the rules. A board that disagrees with a rule is fixed on the board, or the owner changes the rule; when a rule changes, the affected boards and main components change in the same round. Code follows the rules.
2. **Scan before a page task.** A task that implements or changes a page starts only when that page's approved boards scan clean — no findings outside the registered exceptions: `node <skill>/scripts/board-scan/board-scan.mjs build --config <repo>/<scan.config.json>`, run in the design tool, or `… scan --config <…> --extract <file>` (exit 0 = PASS). Rescan after any change to an approved board, a main component or a rule. Never widen a rule or tolerance to hide a finding; a deliberate deviation is registered as an exception with a reason and an owner decision id.
3. **Values are owner decisions.** The agent measures distributions and lists conflicts; the owner chooses each `DS-PAGE-FLOW` token and each exception. Record the decision id in the table.
4. **One owner layer per defect class.** Token checks own values and contrast; component contract tests own component structure and states (structural assertions, no PNG); core-screen geometry comparison owns page composition (`layers.json` / `map.json` / `capture.json` → `report.json`, MISSING 0, failed 0); the core-screen hash lock owns unapproved pixel changes; at most two component PNGs serve as environment canaries.
5. **Baselines are locked by a gate, not by a document.** The gate runs `node <skill>/scripts/baseline/baseline-check.mjs --manifest <repo>/<baselines.json> --decisions <repo>/<decision-log> --actual <render-1> --actual2 <render-2> --changed-out <render-1>/changed.json` and fails on any change. For an intended change, generate `compare-page.mjs --changed <…>/changed.json --out <…>/compare.html` for the changed screens only; the owner approves the batch once and records hash, date and decision id in the manifest. Agents never approve, edit manifest hashes or overwrite baseline PNGs.
6. **No screenshot loops.** Never iterate screenshot → judge → edit → screenshot with any tool; if you find yourself doing it, stop and run a retrospective. One checklist-based model review per core screen per change is allowed, each item answered with evidence from the report.

Gate commands live in `<gate script or CI file>`, not only in this document.
