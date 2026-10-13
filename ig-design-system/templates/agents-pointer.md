# AGENTS.md section (append; adjust paths)

## Visual Work: Component-First

Every task that creates or changes user-visible UI follows `<design-root>/design-system/components.md` §1 before editing:

1. **Read before editing.** Read the affected approved screens, the relevant value-spec sections and the affected `components.md` entries. Tokens alone do not define layout; anatomy does.
2. **Classify by design delta, not by wording.** Per affected component: (A) 0→1 design, (B) revision of an approved design, (C) spec backfill for an unchanged approved design, or (D) implementation drift repair; then reuse, extend, new shared, or feature-owned. State the rationale yourself; routine confirmation is not required. A and B need owner review in the design file before code; C and D do not repeat visual approval. Never change the design to legitimize drifted code.
3. **Spec before code.** A component's `components.md` entry (or the milestone `implementation-map.md` entry for a feature-owned component) is final before code that depends on it. Feature views compose `DS-*` components and tokens only; repeated hand-built structure is a missing component — register it in `components.md` §5 instead of copying it again.
4. **Validate components first, then sample pages.** L0 token and L1 component-contract checks are automated and pass first (add a test for each automatable invariant you introduce). L2 relies on the raw-value scan plus an entry and layout map per checkpoint (screen, visible control, identifier, data mutation, width owner) instead of a human walkthrough. L3 human review is reserved for new design decisions, a spec's named core screens when first implemented, one consolidated walkthrough before the milestone acceptance gate, and specific doubts the agent names.
5. **Record the five-line execution record** (`components.md` §1.5) with actual results, not intentions.

Ask the owner one targeted question only for a real authority conflict, an undecidable design delta that changes the approach, or an unapproved substantive design decision; keep doing work that does not depend on the answer.
