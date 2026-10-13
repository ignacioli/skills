# Catalog consistency test (L1)

Two assertions keep the index honest. Implement them as a plain unit test that reads source files and `components.md` from disk; no UI rendering, no new dependency.

1. **Index ↔ code, both directions.** The set of public component types in the design-system directory equals the set of code identifiers listed in the index table's code column. An unindexed type fails; an indexed type that no longer exists fails.
2. **Every ID has an anatomy entry.** Every `DS-*` ID in the index appears in a heading line somewhere in the document.

## Parsing rules

- Locate the repo root from the test file's own path, not the working directory.
- Read only the index section: from its heading (e.g. `## 3.`) to the next `## ` heading.
- Index rows start with `` | `DS- ``; the code column is the second cell; collect every backticked identifier with the project prefix (e.g. `DS`).
- Public types: a regex over the design-system directory for the language's public type declarations with the prefix. Examples:
  - Swift: `public\s+(?:struct|enum|final\s+class|class)\s+(DS[A-Za-z0-9]+)`
  - TypeScript: `export\s+(?:function|const|class)\s+(DS[A-Za-z0-9]+)` (components), plus `export\s+(?:type|interface)` only if the index lists types.
- Index public helpers that are part of the contract (modifiers, extensions, token enums); if something is deliberately unlisted, exclude it by an explicit allow-list in the test with a reason, never by loosening the regex.

## Failure message

Print the two set differences (`missing from index`, `indexed but not in code`) so the fix is obvious.
