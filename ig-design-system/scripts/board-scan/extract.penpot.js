// Read-only extractor for a Penpot design file. Runs inside the Penpot
// plugin context (MCP `execute_code` or the plugin console) with the design
// file open; it changes nothing. board-scan.mjs replaces the EXTRACT_CONFIG
// line below with the project's `extract` config and wraps this file, the
// scan core and the rules into one script to paste.
//
// It returns, for every selected board on the screens page, a flat list of
// visible layers with geometry relative to the board.

const EXTRACT_CONFIG = { page: null, namespace: null, statusKey: 'status', statusValue: 'approved', screenKey: 'screen', board: null, fileName: null }

const cfg = EXTRACT_CONFIG
if (cfg.fileName && penpot.currentFile.name !== cfg.fileName) {
  throw new Error(`open file is "${penpot.currentFile.name}", expected "${cfg.fileName}"`)
}
const page = penpotUtils.getPageByName(cfg.page)
if (!page) throw new Error(`page not found: ${cfg.page}`)

const op = (v) => (typeof v === 'number' && v < 1 ? `@${+v.toFixed(2)}` : '')
const hex = (f) => (f.fillColor ? `${f.fillColor.toLowerCase()}${op(f.fillOpacity)}` : f.fillImage ? 'image' : f.fillColorGradient ? 'gradient' : null)
const strokeHex = (s) => (s.strokeColor ? `${s.strokeColor.toLowerCase()}${op(s.strokeOpacity)}` : null)
const r1 = (n) => Math.round(n * 10) / 10
const data = (shape, key) => (cfg.namespace && key ? shape.getSharedPluginData(cfg.namespace, key) : '')

function textRuns(t) {
  const props = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight']
  if (props.every((p) => t[p] !== 'mixed')) {
    return [{ family: t.fontFamily, size: +t.fontSize, weight: String(t.fontWeight), lh: +t.lineHeight, chars: t.characters.length }]
  }
  const runs = []
  for (let i = 0; i < t.characters.length; i++) {
    const g = t.getRange(i, i + 1)
    const run = { family: g.fontFamily, size: +g.fontSize, weight: String(g.fontWeight), lh: +g.lineHeight, chars: 1 }
    const last = runs[runs.length - 1]
    if (last && last.family === run.family && last.size === run.size && last.weight === run.weight && last.lh === run.lh) last.chars++
    else runs.push(run)
  }
  return runs
}

function walk(shape, board, parent, depth, out) {
  if (shape.hidden) return
  const comp = shape.isComponentRoot && shape.isComponentRoot() ? shape.component() : null
  const node = { id: shape.id, parent, depth, type: shape.type, name: shape.name, x: r1(shape.x - board.x), y: r1(shape.y - board.y), w: r1(shape.width), h: r1(shape.height) }
  // a rotated layer takes the room of its rotated bounds in the layout
  if (shape.rotation) Object.assign(node, { x: r1(shape.bounds.x - board.x), y: r1(shape.bounds.y - board.y), w: r1(shape.bounds.width), h: r1(shape.bounds.height) })
  if (typeof shape.opacity === 'number' && shape.opacity < 1) node.opacity = +shape.opacity.toFixed(2)
  if (Array.isArray(shape.fills)) {
    const f = shape.fills.map(hex).filter(Boolean)
    if (f.length) node.fills = f
  }
  if (Array.isArray(shape.strokes)) {
    const s = shape.strokes.map(strokeHex).filter(Boolean)
    if (s.length) node.strokes = s
  }
  if (shape.type === 'text') {
    node.text = shape.characters.slice(0, 40)
    node.runs = textRuns(shape)
    node.grow = shape.growType
    node.valign = shape.verticalAlign
  }
  if (comp) node.comp = comp.name
  const ds = data(shape, 'component')
  if (ds) node.ds = ds
  const part = data(shape, 'part')
  if (part) node.part = part
  if (shape.type === 'board' && (shape.flex || shape.grid)) {
    const l = shape.flex || shape.grid
    node.layout = { kind: shape.flex ? 'flex' : 'grid', dir: l.dir, rowGap: l.rowGap, columnGap: l.columnGap, pad: [l.topPadding, l.rightPadding, l.bottomPadding, l.leftPadding] }
  }
  out.push(node)
  const idx = out.length - 1
  // Component internals are covered by the component spec, but their text
  // and icons still count for line-height and icon checks, so keep walking.
  for (const c of shape.children ?? []) walk(c, board, idx, depth + 1, out)
}

const selected = (b) => {
  if (b.type !== 'board') return false
  if (cfg.board) return b.name === cfg.board
  return !cfg.namespace || !cfg.statusKey || data(b, cfg.statusKey) === cfg.statusValue
}
const boards = page.root.children.filter(selected)
return {
  file: penpot.currentFile.name,
  page: cfg.page,
  extractedAt: new Date().toISOString(),
  boards: boards.map((b) => {
    const nodes = []
    for (const c of b.children) walk(c, b, -1, 0, nodes)
    return { name: b.name, screen: data(b, cfg.screenKey) || b.name, w: b.width, h: b.height, fills: (b.fills || []).map(hex).filter(Boolean), nodes }
  }),
}
