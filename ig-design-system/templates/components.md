# <Product> Component Anatomy Spec

> Status: v<x.y> (<date>, <who approved>). Type: <spec backfill of approved designs | …>. This document approves no new visual decision unless a section says so.
> Role: the single entry for component structure. [`README.md`](README.md) stays the single authority for token and component values; this document defines **which parts each component has, in what order, which variants and states, which rules never break, which code implements it, and which check guards it**.

## 0. Why this document exists

Tokens fix values, not structure; a screenshot shows one state; per-page acceptance repeats the same component error on every page. Acceptance therefore moves from every page to every component: build a component right once, lock it with checks, then only compose and sample pages. Humans step in only where judgment is needed (§1.4).

## 1. Visual workflow (mandatory for agents)

### 1.1 Authority order

1. `README.md` <sections>: tokens, type, spacing, radius, icons, component values. Numbers win here.
2. This document: anatomy, variants, states, invariants, code mapping, reuse boundaries.
3. Per-milestone design directories (`<design-root>/<milestone>-hifi/`): approved screens and the feature `implementation-map.md` (§6).
4. Production code `<design-system code dir>`: where the implementation lives. When it disagrees with 1–3, fix the code.

Design file: <Penpot file name>; layers tagged by ID (README §<n>). Doc, exports and design file stay in sync in the same round.

### 1.2 Step 1 — classify by design delta (agent decides)

| Class | Signal | Flow |
|---|---|---|
| A. 0→1 | No applicable design base | Requirements → lo-fi review → hi-fi (components, then representative pages) → owner review → finalize spec + mapping → implement |
| B. Revision | Changes an approved layout, hierarchy, visual or interaction | Check spec → local hi-fi revision → owner review → sync README / this doc / design file / exports → implement |
| C. Backfill | Approved design unchanged; written spec or mapping missing | Extract from approved design → verify sources → implement; no repeat approval |
| D. Drift repair | Approved design unchanged; code deviates | Locate deviation → fix code → targeted component check; design unchanged |

Classify per component, from the design delta — not from request wording or file names. A spec is final before dependent code, not before hi-fi.

### 1.3 Step 2 — reuse, extend, new

| Scope | Meaning | Requirement |
|---|---|---|
| Reuse | Existing anatomy/variants/states cover it | Use the component; never copy its styling |
| Extend | New slot, variant, state or behavior | Update the entry first, list affected consumers; consumers must not change unintentionally |
| New (shared) | Nothing fits and ≥2 features need it | Entry first (ID, anatomy, states, invariants, source board), then code |
| New (feature-owned) | One feature only | Spec in that milestone's `implementation-map.md`; promote when a second feature needs it |

Two identical hand-built structures in pages = a missing component → register in §5.

### 1.4 Step 3 — verify: components first, pages sampled, humans on triggers

| Layer | Object | Method | Checks in this repo |
|---|---|---|---|
| L0 tokens | Values, contrast, icons | Automated | <test names> |
| L1 component contract | Invariants in §4 | Logic tests / static source assertions; catalog test | <test names>, `<CatalogTest>` |
| L2 page composition | Token/component-only pages | Raw-value scan + entry and layout map | <scan test name> |
| L3 human | Facts structure cannot settle | Owner against `<design-root>/*/screens/*` | Triggers below |

Entry and layout map — per checkpoint, one line per new interaction, every line pointing at real code:

```text
screen → visible control → accessibility identifier → mutates data? → width owner
```

Missing entry, gesture-only mutation, or unfilled width = defect, fixed before the checkpoint closes.

L3 triggers: (1) new visual decision in A/B — reviewed in the design file; (2) a spec-named core screen first implemented; (3) one consolidated walkthrough before the milestone acceptance gate (<gate name>), with seeded data and a list of new interactions + core screens; (4) a specific doubt the agent names. No other human walkthrough. Never claim "visually verified" without a human look. No screenshot loops.

### 1.5 Minimal execution record

```text
Class and basis: …
Scope: …
Design decisions: …
Implementation and checks: …
Result: …
```

Ask the owner only for: authority conflict; unclassifiable delta that changes the approach; unapproved substantive design decision.

## 2. Shared baseline `DS-BASE`

- Values only from <token types>; raw values in feature code fail <scan test>.
- Page background, margins, elevation, hero limits: README §<n>.
- Status = text + icon, never color alone.
- Touch target ≥ <44×44>; grow the hit area, not the visual.
- Text scales with dynamic type; every fixed-width container states its long-content rule.
- Data-mutating actions have a visible entry, never only a long-press / context menu.
- Decorative parts are hidden from accessibility; the adjacent text or row carries the name.

## 3. Component index

Consumers counted by search on <date>; they indicate impact only, not visual acceptance. `<CatalogTest>` enforces that the code column equals the public types in `<design-system code dir>`.

| ID | Code | Source | Consumers | Status |
|---|---|---|---|---|
| `DS-BASE` | `<tokens…>` | README §<n> | all | L0 automated |
| `DS-BUTTON` | `<…>` | README §<n>; boards <n> | <n files> | stable |

Composition patterns (no shared code, assembled by features): `DS-PAGE-…`, `DS-EMPTY-STATE` — §4.<n>.

## 4. Component anatomy

Entry format: **Parts** (visual and reading order) → **Variants / states** → **Invariants** (`auto` / `automatable` / `manual`) → **Reuse boundary**. Only numbers the anatomy needs; the rest by reference to README.

#### `DS-BUTTON` Button

- **Parts**: …
- **Variants / states**: default / pressed / disabled / …
- **Invariants**: hit area ≥ 44 (auto: `<test>`); …
- **Page rules**: …
- **Reuse boundary**: …

## 5. Gap and deviation register

`CG-n` numbering is local to this document (prefix avoids clashing with roadmap gates). Handle each by §1.2 class.

| # | Gap | Evidence | Status / handling |
|---|---|---|---|
| CG-1 | | | |

## 6. Feature implementation map (one per milestone)

Each milestone keeps `implementation-map.md` in its hi-fi directory, with only that feature's content: design sources; class per component; page → component lists; feature-owned anatomy; representative states per page; core screens (L3 trigger 2) and why; execution records and results. It never copies README values or shared anatomy — it references IDs.

New boards are tagged in the design file the same way (layer name `DS-xxx · part`, shared plugin data `<namespace>.component` / `part`); feature-owned components use the map's IDs.
