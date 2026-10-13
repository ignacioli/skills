# Penpot — default hi-fi tool

Penpot holds the approved hi-fi boards: the source of the value spec's visuals and of each milestone's screens. Reach it through the Penpot MCP server: read `high_level_overview` once per session, then `penpot_api_info` for any API you are about to call — confirm signatures there rather than from memory.

## Before any write

1. **Confirm the file.** Check `penpot.currentFile` name and pages match the repo's recorded design file. If the user has another file open, stop and ask them to switch; never write into it.
2. **Snapshot.** `penpot.currentFile.saveVersion("before-<change> <date>")`.

## Hi-fi drafting (class A / B)

- Draw components first (and register library components/colors/typographies from the value spec), then representative pages. New boards go on a new page or a clearly labelled area; existing approved boards stay untouched until the owner approves a revision.
- Use only values from the value spec. A new value is a new design decision: list it for owner review.
- Tag layers as you draw (§Annotate), using shared IDs from `components.md` or feature-owned IDs from the milestone `implementation-map.md`.
- Mark drafts in the snapshot label (`… (pending approval)`), and save a final labelled version when the owner approves (`… approved <date>`).
- The owner reviews boards in Penpot. Do not substitute code screenshots for this review.

## Annotate (backfill and new boards)

Tags let an agent reading the design file jump from a layer to its spec.

- **Layer name**: `DS-<ID> · <part>` (e.g. `DS-BUTTON · label`). Rename only generic names (`Rectangle`, `Ellipse`, `Group`…); keep meaningful ones.
- **Shared plugin data**, namespace = the project slug: `component` (ID), `part`, `spec` (doc path + section), `status` (`approved` / `deprecated` / `draft`). Write with `shape.setSharedPluginData(ns, key, value)`, read back with `getSharedPluginData`.
- **Identification**: match by geometry and fill taken from the value spec's component values (size, radius, fill token). Tag only confident matches. Components that cannot be identified from single-layer geometry (composites, icons, row patterns) are listed as "not auto-tagged" in the design-file record, not guessed.
- **Watch for false positives** that collide with a deprecated pattern: verify against the board's context before tagging `deprecated`.
- **Comments** for dead or superseded designs and for page-level notes: `page.addCommentThread(content, position)`, positioned on or beside the board.
- Annotation changes names, metadata and comments only — no visual change, so no re-export.

## After any write

1. Run the file validation (`validate()` per `penpot_api_info`); require zero errors.
2. Snapshot again with a descriptive label: `<change> <date> (<what changed>)`.
3. Record both snapshot labels (and revision numbers if shown), counts tagged, and anything not tagged in the value spec's design-file record section.

## Export

- Exports go to `<design-root>/<milestone>-hifi/screens/` at the scale the repo records (typically 2×).
- MCP `export_shape` exports at 1× only. For 2× batches: set export presets on the boards, ask the user to export the zip from the Penpot UI, then import it into the repo with a script. Keep file names stable across re-exports.
- Temporarily remove presentation-only effects (e.g. board shadows) if they would pad the export, and restore them immediately after; note it in the record.
- Re-export only boards whose visuals changed.
