---
name: ig-design-system
description: >-
  Component-first visual workflow: classify every UI change by design delta,
  get each component right once against a written anatomy spec, then only
  assemble and sample pages. Use when creating or changing user-visible UI,
  when landing a design-system component spec on a repository, or when
  backfilling a spec and design-file annotations from approved designs.
---

# ig-design-system

A design system has two halves. **Tokens** fix values (color, type, spacing, radius, icons). **Anatomy** fixes structure: which parts a component has, in what order, which variants and states, which rules never break, which code implements it, and which check guards it. Tokens alone let an agent assemble correct colors into the wrong hierarchy; a screenshot shows one state and hides empty, disabled, error, long-text and large-type. So acceptance moves **left**, from every page to every component: a component is made right once and locked by checks; pages only compose components and are sampled.

The repository owns the facts (token values, component IDs, file paths, test names, design-file names). This skill owns the process and the templates. When the repo's own `components.md` exists, it is the authority; this skill tells you how to use and grow it. Component IDs are written `DS-*` here; use the repo's own prefix if it has one.

## Branch

| Branch | Trigger | Go to |
|---|---|---|
| **Task** (default) | Any work that creates or changes user-visible UI | Steps below |
| **Land** | The repo has no component spec yet, or the user asks to apply this workflow to a repo | [land.md](land.md) |
| **Backfill** | Approved designs exist but the anatomy spec, code mapping or design-file annotations are missing or stale | Task steps 1–3 with class C, then [tools/penpot.md](tools/penpot.md) §Annotate |

Tools: Penpot is the default **hi-fi** tool ([tools/penpot.md](tools/penpot.md)); Open Design is the default **lo-fi** tool ([tools/open-design.md](tools/open-design.md)). Both are optional: if the repo names another tool, or none, keep the same gates and record where the approved source lives instead.

## Authority order

1. Token and value spec (e.g. `<design-root>/design-system/README.md`): numbers win here.
2. Component spec `<design-root>/design-system/components.md`: anatomy, variants, states, invariants, code mapping, reuse boundaries.
3. Per-milestone design directory: approved screens plus its `implementation-map.md` (page composition and feature-owned components only).
4. Production code: where the implementation currently lives. When code disagrees with 1–3, **fix the code**. Never edit the design to legitimize drifted code.

The design file (Penpot) is the source of 1 and 3. Doc, exported screens and design file move together in the same round.

## Task steps

### 1. Read, then classify by design delta

Read the affected approved screens, the relevant token sections and the affected `components.md` entries before editing. Classify **per affected component** by whether the target design changes — not by request wording ("fix", "polish", "new feature") or file names. State the rationale yourself; routine human confirmation is not required.

| Class | Signal | Flow |
|---|---|---|
| **A** 0→1 | No applicable design base: new visual language, page type or core component | Requirements and key flows → lo-fi review → hi-fi (components first, then representative pages) → owner review → finalize spec + code mapping → implement |
| **B** Revision | Changes an approved layout, hierarchy, visual or interaction, even in one component | Check existing spec and constraints → local hi-fi revision → owner review → sync value spec / `components.md` / design file / exports → implement |
| **C** Backfill | Approved design unchanged; only written anatomy, states or code mapping missing | Extract spec from the approved design → verify sources agree → implement; **no repeat visual approval** |
| **D** Drift repair | Approved design unchanged; code does not follow it | Locate the deviation against design/spec → fix code → targeted component check; **design stays as is** |

A new feature is not automatically A. Most milestone work is "reuse + a little extend/new". A component spec is final before **code that depends on it**, not before hi-fi; a pre-design constraint draft is never presented as an approved design.

**Done when:** every affected component has a class and a one-line reason naming its approved source (path, board, design-file version).

### 2. Scope each component: reuse, extend, new

| Scope | Meaning | Requirement |
|---|---|---|
| Reuse | Existing anatomy, variants, states cover it; only data or allowed parameters change | Use the indexed component; never copy its styling into a page |
| Extend | Needs a new slot, variant, state or behavior | Update its `components.md` entry first, listing affected existing consumers (plus the design if class B); existing consumers must not change unintentionally |
| New shared | No existing component fits and at least two features need it | Add the entry first (stable ID, anatomy, states, invariants, source board), then the code in the design-system directory |
| New feature-owned | Only one feature uses it | Spec it in that milestone's `implementation-map.md`, referencing `DS-BASE` and sub-components; promote to shared when a second feature needs it |

Signals: the same hand-built "stack + font + color" structure appearing twice is a **missing component** — register it in the gap register (`CG-n`) instead of copying it again. Moving code into a new file is not a new component; reusing tokens does not prove the structure needs no extension; a similar name does not prove a component exists — the index decides.

When a gap touches code a past milestone already accepted, migrate **only** the pages the current milestone reads or changes, and cite the requirement that makes it touch them. Leave untouched accepted pages alone.

**Done when:** every component has a scope, every extend/new has its spec entry written before its code, and every newly observed repeated structure is in the gap register.

### 3. Verify bottom-up: components first, pages sampled, humans on triggers

Lower layers pass before higher ones run.

| Layer | Checks | How |
|---|---|---|
| **L0** tokens | Values, contrast, icon set | Automated value/contrast tests |
| **L1** component contract | Each invariant in the component entry | Pure-logic tests or static source assertions; the catalog test (index ↔ public component types, every ID has an anatomy heading — pattern in [templates/catalog-test.md](templates/catalog-test.md)) |
| **L2** page composition | Pages use only tokens and components; order, margins, one-screen rules | Static scan for raw values in feature code + the **entry and layout map** |
| **L3** human | Only facts structured evidence cannot settle | Owner, against approved screens, under the triggers below |

Each invariant is labelled `auto` (test exists), `automatable` (could be tested, isn't yet) or `manual` (looked at once when the **component** is introduced or changed, never again per page). New or extended components get a test for every automatable invariant they introduce, plus a preview/story covering representative states.

Route each acceptance fact to the **least visual** evidence source that can prove it: source and artifact inspection → semantic/accessibility automation → deterministic state, logs, files → existing tests → screenshots only for an inherently visual remainder. A screenshot → judge → edit → screenshot loop is never an acceptance mechanism; when a human must look, seed the environment and hand over control.

**Entry and layout map** — one line per new user-facing interaction, every line pointing at real code:

```text
screen → visible control (text or icon) → accessibility identifier → mutates data? → which component/container fills the width
```

A missing entry, a mutation reachable only by gesture/long-press/context menu, or a width no component or container fills is a defect to fix now. These three classes ship even with fully green logic tests, because unit tests do not render views.

**L3 triggers** — nothing else needs a human:
1. A or B introduced a new visual decision → owner reviews the **design file**, not code screenshots.
2. A spec-named core screen (1–3 per milestone, listed in `implementation-map.md`) is implemented for the first time → one look against the approved screen; again only after a later B revision.
3. Before the milestone acceptance gate → **one** consolidated walkthrough: seed data, list only new interactions + core screens.
4. The agent names a specific doubt structured evidence cannot settle (e.g. legibility at the largest type size).

Never report UI as "visually verified" unless a human actually looked; say so when it has not happened.

**Done when:** L0–L2 ran green with output cited, the entry and layout map is complete, and each L3 trigger is either queued with its reason or stated as not triggered.

### 4. Write the execution record

Five lines, inside the existing plan/tasks, the milestone `implementation-map.md`, or the round's notes — never a separate file set, never a copy of the authoritative spec:

```text
Class and basis: A/B/C/D; does the target design change; approved source (path / board / design-file version).
Scope: component IDs; reuse / extend / new; affected consumers and states; files to sync.
Design decisions: approved decisions reused; new decisions and their review status; real gaps or conflicts.
Implementation and checks: invariants and their tests; representative states; pages sampled; entry and layout map; L3 triggered or not, and why.
Result: actual PASS / FAIL / BLOCKED, evidence location, remaining items. Results, not intentions.
```

If the design changed, sync value spec, `components.md`, the design file (snapshot before and after) and exported screens in this same round.

**Done when:** all five lines hold actual results, and any design change is reflected in doc, design file and exports.

## Asking the owner

Ask one targeted question only for: a conflict between authoritative sources; a design delta you cannot classify and that changes the approach; or a substantive new design decision nobody approved. Keep doing the work that does not depend on the answer.

## Applicability

Built from small-team products where one owner approves designs. In a repo with a mature external design system, map its catalog to the index and keep the classification, verification layers and execution record; skip what duplicates its own governance.
