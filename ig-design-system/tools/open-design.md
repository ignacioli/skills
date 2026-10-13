# Open Design — default lo-fi tool

Lo-fi prototypes settle flows, information architecture and state coverage before any hi-fi work (class A, sometimes large B). They are **discovery input**, not approval of visuals: hi-fi in Penpot still needs its own owner review.

## Make

- Create one Open Design project per milestone or module group; one artifact per module (a coherent flow), not one per screen.
- Form: structured grey-box wireframes with margin notes. No brand colors, no product type ramp — fidelity is deliberately low so review stays on structure.
- Target the real device frame and locale of the product (e.g. phone portrait, light mode, product language).
- Data: invented names and records only. Never real user data.
- Self-contained HTML: no external links, CDNs, remote fonts or remote images.
- System surfaces (share sheet, file picker, permission prompts) are drawn only as call boundaries, never as fake system UI.
- Stage isolation: a prototype for one milestone does not show capabilities of a later one. Exits to other modules show only a destination label.
- Each module header states: stage, module, version, coverage, data, network, review status.

## Bring into the repo

Copy finished artifacts into `<design-root>/prototypes/<stage>/<module>/prototype.html`, with:

- `<design-root>/prototypes/manifest.json` — product, version, `authority: "discovery-input"`, source documents, visual conventions, and per module `id`, `stage`, `title`, `path`, `version`, `coverage`, `review`.
- `<design-root>/prototypes/shared/` — cross-module glossary (UI wording), privacy/sharing boundaries, cross-module states.
- `<design-root>/prototypes/README.md` — conventions above and a suggested walkthrough order.

## Review and hand-off to hi-fi

- The owner walks through the prototype; record the outcome in the manifest `review` field and in the milestone's decisions.
- Hi-fi starts from the reviewed prototype plus the existing design system: classify each hi-fi component per `SKILL.md` step 1 — most should be reuse/extend, not new.
- Changing a reviewed prototype after hi-fi has started means the flow changed: revisit the affected hi-fi boards rather than letting them drift apart.
