---
name: obsidian-notes
description: >-
  Distill significant, reusable knowledge from ongoing work into the user's
  Obsidian vault: major discoveries, cross-project lessons, architecture or
  technology choices, decisions, open questions, and options awaiting a
  decision. Use when the user says 记录到 Obsidian / 记到笔记 / 沉淀一下 /
  obsidian note, or has explicitly asked for noteworthy reusable findings to
  be captured during the current work. Do not use for routine progress logs,
  project status, transcripts, or facts that belong only in repository docs.
---

# Obsidian Notes

Distill durable knowledge from the current work into the user's personal
Obsidian vault. The note should remain useful outside the current project or
conversation. Capturing a note is a small side activity: do it at a natural
pause and then return to the main task.

## Capture boundary

Capture only material with lasting value, such as:

- a major finding or failure mode that is likely to recur;
- a reusable engineering, design, or AI-workflow method;
- an architecture or technology choice and its tradeoffs;
- a decision, including the evidence and constraints behind it;
- an unresolved question, candidate options, or a choice awaiting a decision;
- a reusable heuristic, checklist, or validation approach.

Do not turn the vault into a work log. Skip routine progress, transient command
output, repository-specific implementation detail, chat transcripts, and
material already better maintained in the repository. Project context may be
included as provenance or an example, but it must not become the note's scope.

Writing to the vault requires either an explicit capture request or an explicit
standing request for the current work. A merely interesting observation is not
permission to write; when no such request exists, briefly suggest capturing it
instead.

## Vault and read budget

- Vault root: the `OBSIDIAN_VAULT` environment variable; otherwise the vault of
  the connected Obsidian connector; otherwise ask the user once. Never guess a
  path and never scan the disk to find a vault.
- The vault is private and contains unrelated personal material.
- Default to **zero existing-note content reads**. The current conversation
  should provide the substance of the new note.
- Never recursively scan, inventory, summarize, or broadly search `Tech/` or
  any other vault subtree merely to choose a destination or look for related
  notes.
- A shallow directory-name listing is allowed only when the destination cannot
  be inferred from the known folders below.
- Duplicate checking is optional, not a prerequisite. When it would materially
  help, search filenames or metadata only inside the single candidate folder;
  inspect at most a few strong matches and read no more than one existing note
  unless the user asks for broader research.
- Read an existing note only to append/update that exact note, or after a narrow
  search identifies it as a likely duplicate. Do not follow its links unless
  required by the user's request.
- Never modify or delete an existing note unless the user explicitly asked to
  update that note. If safe placement remains unclear, create a new note in the
  nearest known folder instead of exploring the vault.

## Placement

Choose by the reusable subject, not by the current project or technology.
The folder map below is the author's vault layout; adjust it to yours. If a
listed folder does not exist, use the nearest existing folder instead of
creating a new tree:

- engineering principles, architecture choices, technical decision methods →
  `Tech/SoftwareEngineering/`
- AI-agent practice, development workflow, design methodology, SDD, tool use →
  `Tech/Workflow/`
- material primarily being learned or studied → the relevant folder under
  `Study/`
- work practice that is not general technical knowledge → `Work/`
- personal or life knowledge → `Life/`
- draft article material → `Blog/`
- externally sourced material kept mainly as a reference → `Clippings/`

Prefer an existing folder. Do not create a project-named folder by default.
Create a topic subfolder only when the user asks or when several notes already
form a clear reusable topic; otherwise write directly into the selected folder.

## Note format

Use a short, descriptive filename. Prefer a concept or decision name over a
project-prefixed name; Chinese filenames are fine.

```yaml
---
created: YYYY-MM-DD
source: <project or conversation, for provenance only>
status: evergreen | decided | pending | needs-validation
tags: [<2-4 subject tags>]
---
```

Write the smallest structure that fits the content. A useful default is:

1. `结论` or `问题`
2. `背景与约束`
3. `方案与权衡` or `关键发现`
4. `决定` / `待决策` / `待验证`
5. `可复用原则`

Record the reasoning and decision state, not a transcript. Clearly distinguish
confirmed evidence, inference, open questions, and decisions. Keep the note
concise; do not pad it to fill every section.

Link to an existing note only when its exact title is already known from the
current context or a narrow duplicate check. Do not search the vault just to add
wikilinks. Prefer a new focused note over appending to a broad or only loosely
related note.

## Tools

- If an Obsidian connector is available, use its create/update operation. Its
  search capability must still obey the read budget above.
- Otherwise use ordinary file tools; the vault consists of Markdown files.
- After writing, read back only the created or updated file to verify the path,
  frontmatter, and content.

## Privacy

Never record credentials, tokens, private keys, personal identifiers, or
unrelated sensitive content. Distill confidential project material into a
general principle unless the user explicitly requests the private detail and
the vault is an appropriate destination.
