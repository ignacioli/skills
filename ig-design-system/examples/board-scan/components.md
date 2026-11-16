# Example components (fictional)

## 2. Shared rules

### 2.1 Page flow `DS-PAGE-FLOW`

#### Relations

| Relation | ID | Token | px | Measured | Status |
|---|---|---|---|---|---|
| page side margin | `page-side-margin` | `space-page-x` | 20 | 20 ×12 | settled |
| top bar → first block | `header-to-first` | `space-1` | 4 | 4 ×2; 8 ×1 | owner 2026-01-01 D-3 |
| block ↔ block | `block-to-block` | `space-4` | 16 | 16 ×5; 12 ×2 | owner 2026-01-01 D-3 |
| section title → content | `section-title-to-content` | `space-3` | 12 | 12 ×3 | settled |
| section → next section title | `section-to-section` | `space-section` | 32 | 32 ×2 | settled |
| text label → content | `label-to-content` | `space-2` | 8 | 8 ×1 | settled |
| title → subtitle | `text-stack` | `space-1` | 4 | none | settled |
| small siblings in a row | `inline-siblings` | `space-2` | 8 | 8 ×6 | settled |
| larger siblings in a row | `row-siblings` | `space-3` | 12 | 12 ×4 | settled |
| tiles in a grid | `tile-grid` | `space-2` | 8 | 8 ×4 | settled |
| list row → list row | `list-row-pitch` | none | 0 | 0 ×8 | settled |
| content end → bottom | `content-end-to-bottom` | `space-6` | 24 | 24 ×2 | settled |
| fixed bar → fixed bar | `fixed-bottom-stack` | `space-3` | 12 | 12 ×1 | settled |
| sheet edge → first | `sheet-top-to-first` | `space-2` | 8 | 8 | settled |
| sheet stack | `sheet-stack` | `space-3` | 12 | 12 | settled |
| sheet side inset | `sheet-side` | `space-5` | 20 | 20 | settled |

#### Registered exceptions

| Rule | Where | Value | Reason | Decision |
|---|---|---|---|---|
| `icon-size` | `within=DS-Badge` | 14 | badge icon sits beside note-size text | D-4 |
| `row-siblings` | `screen=Detail; to=info` | 16 | hero image is a tilted sticker | D-5 |
