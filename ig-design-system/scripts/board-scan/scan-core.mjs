// Board scan core: pure functions over the output of extract.penpot.js.
// No imports and no I/O, so the same file runs under Node (tests, offline
// scan) and pasted into the Penpot plugin context (board-scan.mjs strips
// `export`). Every project-specific name and value comes from `rules`
// (see ../../schemas/scan-config.schema.json); this file has none of its own.
//
// Geometry follows the geometry contract (templates/geometry-contract.md):
// a text layer is measured by its token line box (font size × the role's
// token line height), centred on the drawn text box; a container without a
// visible fill, stroke or frame is measured by the union of its children.

const r1 = (n) => Math.round(n * 10) / 10

/** Helpers bound to one rule set. */
export function context(rules) {
  const prefixes = rules.componentPrefixes || ['DS-']
  const startsAny = (s, list) => (list || []).some((p) => s.startsWith(p))
  const decor = rules.decorPattern ? new RegExp(rules.decorPattern) : null
  const frame = rules.framePattern ? new RegExp(rules.framePattern) : null
  const icons = (rules.icons || []).slice().sort((a, b) => b.prefix.length - a.prefix.length)
  const compName = (n) => n.ds || (startsAny(n.name, prefixes) ? n.name : n.comp || '')
  const C = {
    compName,
    isComp: (n) => Boolean(n.ds || n.comp || startsAny(n.name, prefixes)),
    isAsset: (n) => startsAny(n.name, rules.assetPrefixes),
    iconRule: (n) => icons.find((r) => n.name.startsWith(r.prefix)) || null,
    isDecor: (n) => Boolean(decor && decor.test(n.name)),
    isFrame: (n) => Boolean(frame && frame.test(n.name)),
    isScrim: (n) => startsAny(n.name, rules.scrimPrefixes),
    label: (n) => (startsAny(n.name, prefixes) ? n.name : n.comp || n.ds || n.name).slice(0, 40),
    /** n plays `role` when its component name or layer name starts with one of the role's prefixes. */
    is: (n, role) => {
      const list = (rules.roles || {})[role] || []
      return list.some((p) => compName(n).startsWith(p) || n.name.startsWith(p))
    },
    matches: (n, list) => (list || []).some((p) => compName(n).startsWith(p) || n.name.startsWith(p)),
  }
  return C
}

/** Token line height for a font size: the first `lineHeights` step whose minSize the size reaches. */
export function tokenLineHeight(size, rules) {
  const steps = rules.lineHeights.slice().sort((a, b) => b.minSize - a.minSize)
  const step = steps.find((s) => size >= s.minSize)
  return step ? step.value : NaN
}

function textMetrics(n, rules) {
  const size = Math.max(...n.runs.map((r) => r.size))
  const lh = n.runs.find((r) => r.size === size).lh || rules.toolDefaultLineHeight || 1.2
  const lines = Math.max(1, Math.round(n.h / (size * lh)))
  const tokenH = lines * size * tokenLineHeight(size, rules)
  return { size, lh, lines, tokenH }
}

/** Index the flat node list: children, title rows and component/asset context. */
export function indexBoard(board, rules) {
  const C = context(rules)
  const N = board.nodes
  const kids = new Map()
  N.forEach((n, i) => {
    if (!kids.has(n.parent)) kids.set(n.parent, [])
    kids.get(n.parent).push(i)
  })
  // a row that starts with a section title (title plus a trailing action) is a title in the page flow
  N.forEach((n, i) => {
    if (!n.layout?.dir?.startsWith('row')) return
    const first = (kids.get(i) || []).map((k) => N[k]).sort((a, b) => a.x - b.x)[0]
    if (first && C.is(first, 'sectionTitle')) n.titleRow = true
  })
  // insideComp: some ancestor is a component instance or an asset
  const insideComp = N.map(() => false)
  N.forEach((n, i) => {
    const p = n.parent
    if (p >= 0 && (insideComp[p] || C.isComp(N[p]) || C.isAsset(N[p]))) insideComp[i] = true
  })
  return { N, kids, insideComp, C }
}

/** Visual box of node i under the geometry contract. */
export function visualBox(ix, i, rules, memo = new Map()) {
  if (memo.has(i)) return memo.get(i)
  const { C } = ix
  const n = ix.N[i]
  let box
  if (n.type === 'text' && n.runs?.length) {
    const { tokenH } = textMetrics(n, rules)
    const cy = n.y + n.h / 2
    box = { x: n.x, y: cy - tokenH / 2, w: n.w, h: tokenH }
  } else {
    // A component root keeps its own box (its size is part of its spec); so
    // does a container with a fill, a stroke or a frame child.
    const all = ix.kids.get(i) || []
    const framed = all.some((k) => C.isFrame(ix.N[k]))
    // a lone icon button keeps its touch-target box, as drawn (geometry contract: touch)
    const t = rules.touchMin
    const iconButton = n.type === 'board' && all.length === 1 && C.iconRule(ix.N[all[0]]) && Math.abs(n.w - t) < 0.5 && Math.abs(n.h - t) < 0.5
    const visible = ((n.fills?.length || n.strokes?.length) && n.type !== 'group') || framed || C.isComp(n) || iconButton
    const kids = all.filter((k) => !C.isDecor(ix.N[k]))
    if (visible || C.isAsset(n) || !kids.length || n.type !== 'board') {
      box = { x: n.x, y: n.y, w: n.w, h: n.h }
    } else {
      const bs = kids.map((k) => visualBox(ix, k, rules, memo))
      const x0 = Math.min(...bs.map((b) => b.x))
      const y0 = Math.min(...bs.map((b) => b.y))
      const x1 = Math.max(...bs.map((b) => b.x + b.w))
      const y1 = Math.max(...bs.map((b) => b.y + b.h))
      box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
    }
  }
  memo.set(i, box)
  return box
}

/**
 * Classify the vertical relation between two neighbours in a page-spine
 * column. `fixedParent` is true when the column itself is fixed (the board
 * root or a fixed bar), so two fixed bars there are a fixed stack, while the
 * same component inside scrolling content is a block.
 */
export function classifyColumn(prev, next, fixedParent, rules) {
  const C = context(rules)
  if (C.is(prev, 'header')) return 'header-to-first'
  if (fixedParent && C.is(next, 'fixedBottom') && C.is(prev, 'fixedBottom')) return 'fixed-bottom-stack'
  // scrolling content next to a fixed bar: its end is measured by content-end-to-bottom
  if (fixedParent && (C.is(next, 'fixedBottom') || C.is(prev, 'fixedBottom'))) return null
  if (C.is(prev, 'sectionTitle') || prev.titleRow) return 'section-title-to-content'
  if (C.is(next, 'sectionTitle') || next.titleRow) return 'section-to-section'
  if (C.is(prev, 'listRow') && C.is(next, 'listRow')) return 'list-row-pitch'
  if (prev.type === 'text' && next.type === 'text') return 'text-stack'
  if (prev.type === 'text') return 'label-to-content'
  return 'block-to-block'
}

function ancestorMatch(ix, i, prefixes) {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes]
  let p = ix.N[i].parent
  while (p >= 0) {
    const n = ix.N[p]
    if (list.some((s) => n.name.startsWith(s) || ix.C.compName(n).startsWith(s))) return true
    p = n.parent
  }
  return false
}

const screenHas = (board, s) => !s || (board.screen || board.name).includes(s)

/** Run every rule on one board. Returns findings plus measured relation values. */
export function scanBoard(board, rules) {
  const ix = indexBoard(board, rules)
  const { N, kids, insideComp, C } = ix
  const memo = new Map()
  const vb = (i) => visualBox(ix, i, rules, memo)
  const findings = []
  const relations = []
  const exceptions = rules.exceptions || []
  const add = (rule, i, detail) => findings.push({ rule, layer: i >= 0 ? C.label(N[i]) : '(board)', y: i >= 0 ? N[i].y : 0, detail })
  const exc = (rule, i, value) =>
    exceptions.some(
      (e) => e.rule === rule && (e.value === undefined || e.value === value) && (e.within ? C.matches(N[i], [e.within]) || ancestorMatch(ix, i, e.within) : true) && screenHas(board, e.screen),
    )
  const screenFonts = (rules.screenFonts || []).filter((s) => screenHas(board, s.screen))
  const allowedSizes = (family) => {
    const base = rules.fonts?.[family]
    if (!base) return null
    const extra = screenFonts.flatMap((s) => s.fonts?.[family]?.sizes || [])
    return { sizes: [...base.sizes, ...extra], weights: base.weights }
  }
  const colors = new Set((rules.colors || []).map((c) => c.toLowerCase()))
  const colorAllowed = (c) => c === 'image' || c === 'gradient' || colors.has(c)

  N.forEach((n, i) => {
    // colours (illustration assets are exempt)
    const exempt = C.matches(n, rules.colorExempt) || ancestorMatch(ix, i, rules.colorExempt || [])
    if (rules.colors && !exempt) {
      for (const c of [...(n.fills || []), ...(n.strokes || [])]) if (!colorAllowed(c) && !exc('color', i, c)) add('color', i, c)
    }
    // text: font pairs and line height
    if (n.type === 'text' && n.runs) {
      for (const r of n.runs) {
        if (rules.fonts) {
          const fam = allowedSizes(r.family)
          if (!fam || !fam.sizes.includes(r.size) || (fam.weights && !fam.weights.includes(r.weight))) {
            if (!exc('font', i, `${r.family}/${r.size}/${r.weight}`)) add('font', i, `${r.family} ${r.size}/${r.weight}`)
          }
        }
        const want = tokenLineHeight(r.size, rules)
        if (Math.abs(r.lh - want) > 0.005 && !exc('line-height', i)) add('line-height', i, `${r.size}px at ${r.lh}, token ${want}`)
      }
      if (rules.forbidFixedTextBox && n.grow === 'fixed' && !insideComp[i] && !exc('fixed-text-box', i)) add('fixed-text-box', i, `${n.w}×${n.h}`)
    }
    // icons: square, at a token size
    const ir = C.iconRule(n)
    if (ir) {
      const ok = ir.sizes ? ir.sizes.includes(n.w) : n.w >= ir.min && n.w <= ir.max
      if ((!ok || n.w !== n.h) && !exc('icon-size', i, n.w)) add('icon-size', i, `${n.name.slice(ir.prefix.length)} ${n.w}×${n.h}`)
    }
    // spacing on the grid: page-level flex containers only (component internals follow their spec)
    if (rules.grid && n.layout && !insideComp[i] && !C.isComp(n) && !C.isAsset(n)) {
      const gap = n.layout.dir?.startsWith('row') ? n.layout.columnGap : n.layout.rowGap
      const bad = [gap, ...(n.layout.pad || [])].filter((v) => typeof v === 'number' && r1(v) % rules.grid !== 0)
      if (bad.length && !exc('grid', i)) add('grid', i, `${n.layout.dir} gap ${gap} pad ${(n.layout.pad || []).join('/')}`)
    }
  })

  // Relations between neighbours on the page spine: the board, full-width
  // screen-level containers, and column containers nested in them. Deeper
  // structure belongs to its component spec and is covered by the grid rule only.
  const screenLevel = (p) => p === -1 || (!insideComp[p] && !C.isComp(N[p]) && !C.isAsset(N[p]))
  const fullBleed = (p) => p === -1 || Math.abs(N[p].w - board.w) < 1
  const contains = (o, b) => b.x >= o.x - 0.5 && b.y >= o.y - 0.5 && b.x + b.w <= o.x + o.w + 0.5 && b.y + b.h <= o.y + o.h + 0.5
  const floatBoxes = (kids.get(-1) || []).filter((i) => C.is(N[i], 'floating') || C.is(N[i], 'sheet')).map((i) => ({ i, b: vb(i) }))
  const spineMemo = new Map()
  const spine = (p) => {
    if (p === -1) return true
    if (spineMemo.has(p)) return spineMemo.get(p)
    const n = N[p]
    const v = screenLevel(p) && n.type === 'board' && !C.isDecor(n) && (fullBleed(p) || (n.layout?.dir === 'column' && spine(n.parent)))
    spineMemo.set(p, v)
    return v
  }
  const tol = rules.flowTolerance ?? 0.5
  for (const [p, ids] of kids) {
    if (!screenLevel(p)) continue
    const parent = p >= 0 ? N[p] : null
    const isRow = parent?.layout?.dir?.startsWith('row')
    if (!(spine(p) && !isRow) && !(isRow && spine(parent.parent))) continue
    // layers drawn into a floating layer's slot (sheet content) belong to it, not to the page
    const inFloating = (i) => p === -1 && floatBoxes.some((f) => f.i !== i && contains(f.b, vb(i)))
    const cs = ids.filter((i) => !C.isDecor(N[i]) && !C.isScrim(N[i]) && !C.is(N[i], 'floating') && !C.is(N[i], 'sheet') && !inFloating(i))
    const fixedParent = p === -1 || C.is(N[p], 'fixedBottom')
    if (!isRow) {
      const sorted = cs.slice().sort((a, b) => vb(a).y - vb(b).y)
      for (let k = 1; k < sorted.length; k++) {
        const a = vb(sorted[k - 1])
        const b = vb(sorted[k])
        if (Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) <= 0) continue
        const gap = r1(b.y - (a.y + a.h))
        if (gap < -tol) continue // overlaid layers (states drawn on one board, floating controls)
        const relation = classifyColumn(N[sorted[k - 1]], N[sorted[k]], fixedParent, rules)
        if (relation) relations.push({ relation, gap, from: C.label(N[sorted[k - 1]]), to: C.label(N[sorted[k]]) })
      }
    } else {
      const sorted = cs.slice().sort((a, b) => vb(a).x - vb(b).x)
      for (let k = 1; k < sorted.length; k++) {
        const a = vb(sorted[k - 1])
        const b = vb(sorted[k])
        const gap = r1(b.x - (a.x + a.w))
        if (gap < -tol || gap > (rules.pushApartMin ?? 48)) continue // pushed apart (space-between), not a spacing relation
        const small = [a, b].every((x) => x.h <= (rules.inlineMaxHeight ?? 32))
        const tiles = [sorted[k - 1], sorted[k]].every((i) => C.is(N[i], 'tile'))
        relations.push({ relation: tiles ? 'tile-grid' : small ? 'inline-siblings' : 'row-siblings', gap, from: C.label(N[sorted[k - 1]]), to: C.label(N[sorted[k]]) })
      }
    }
    // side margin: children of full-bleed screen-level containers start at the page margin
    if (fullBleed(p) && !isRow) {
      for (const i of cs) {
        const b = vb(i)
        if (b.w >= board.w - 1 || (C.isComp(N[i]) && Math.abs(N[i].w - board.w) < 1)) continue
        if (b.x < board.w / 2) relations.push({ relation: 'page-side-margin', gap: r1(b.x), from: '(edge)', to: C.label(N[i]) })
      }
    }
  }

  // sheet and dialog insets
  N.forEach((n, i) => {
    if (!C.is(n, 'sheet') || !n.layout) return
    const ch = (kids.get(i) || []).map((k) => [k, vb(k)]).sort((a, b) => a[1].y - b[1].y)
    if (!ch.length) return
    relations.push({ relation: 'sheet-top-to-first', gap: r1(ch[0][1].y - n.y), from: 'sheet edge', to: C.label(N[ch[0][0]]) })
    for (let k = 1; k < ch.length; k++) {
      relations.push({ relation: 'sheet-stack', gap: r1(ch[k][1].y - ch[k - 1][1].y - ch[k - 1][1].h), from: C.label(N[ch[k - 1][0]]), to: C.label(N[ch[k][0]]) })
    }
    relations.push({ relation: 'sheet-side', gap: n.layout.pad?.[3] ?? 0, from: 'sheet edge', to: 'content' })
  })

  // content end → fixed bottom stack (or board bottom)
  const fixedIds = N.map((n, i) => i).filter((i) => N[i].parent === -1 && C.is(N[i], 'fixedBottom'))
  const fixedTops = fixedIds.map((i) => vb(i).y)
  const limit = fixedTops.length ? Math.min(...fixedTops) : board.h
  const underFixed = (i) => {
    for (let p = i; p >= 0; p = N[p].parent) if (fixedIds.includes(p)) return true
    return false
  }
  const content = N.map((n, i) => i).filter(
    (i) => screenLevel(N[i].parent) && !insideComp[i] && !C.isDecor(N[i]) && !underFixed(i) && !C.is(N[i], 'floating') && !C.is(N[i], 'sheet') && !C.isScrim(N[i]),
  )
  const leaves = content.filter((i) => !(kids.get(i) || []).some((k) => content.includes(k)))
  if (leaves.length) {
    const end = Math.max(...leaves.map((i) => vb(i).y + vb(i).h))
    // content that reaches the fixed stack scrolls under it: its end is below the fold
    if (end < limit - 1) relations.push({ relation: 'content-end-to-bottom', gap: r1(limit - end), from: 'content end', to: fixedTops.length ? 'fixed bottom stack' : 'board bottom' })
  }

  // relation findings against the page-flow table
  const flow = rules.flow || {}
  for (const r of relations) {
    const want = flow[r.relation]
    if (want === undefined) continue
    const list = Array.isArray(want) ? want : [want]
    const ok = list.some((w) => Math.abs(w - r.gap) <= tol)
    const excused = exceptions.some(
      (e) => e.rule === r.relation && screenHas(board, e.screen) && (!e.to || r.to.startsWith(e.to)) && (e.value === undefined || Math.abs(e.value - r.gap) <= tol),
    )
    if (!ok && !excused) findings.push({ rule: `flow:${r.relation}`, layer: `${r.from} → ${r.to}`, y: 0, detail: `${r.gap}, table ${list.join('/')}` })
  }
  return { name: board.name, screen: board.screen || board.name, w: board.w, h: board.h, findings, relations }
}

/**
 * Compact summary: gate result, totals per rule, per board findings with
 * line-height findings folded into one count per size, and the distribution
 * of every relation value with up to three examples (the input for choosing
 * DS-PAGE-FLOW tokens). `detail` keeps every relation of every board.
 */
export function summarize(res, detail = false) {
  const boards = res.boards.map((b) => {
    const counts = {}
    const lh = {}
    const list = []
    for (const f of b.findings) {
      counts[f.rule] = (counts[f.rule] || 0) + 1
      if (f.rule === 'line-height') lh[f.detail] = (lh[f.detail] || 0) + 1
      else list.push(`${f.rule} | ${f.layer} | ${f.detail}`)
    }
    const out = { screen: b.screen, size: `${Math.round(b.w)}×${Math.round(b.h)}`, counts, lineHeight: lh, findings: list }
    if (detail) out.relations = b.relations.map((r) => `${r.relation} ${r.gap}: ${r.from} → ${r.to}`)
    return out
  })
  const relations = {}
  for (const b of res.boards)
    for (const r of b.relations) {
      const d = (relations[r.relation] ??= {})
      const v = (d[r.gap] ??= { n: 0, eg: [] })
      v.n++
      if (v.eg.length < 3) v.eg.push(`${String(b.screen).slice(0, 16)}: ${r.from} → ${r.to}`)
    }
  const total = Object.values(res.totals).reduce((a, b) => a + b, 0)
  return { gate: total === 0 ? 'PASS' : 'FAIL', file: res.file, extractedAt: res.extractedAt, boardCount: res.boards.length, totals: res.totals, boards, relations }
}

/** Scan a whole extract. */
export function scan(doc, rules) {
  const boards = doc.boards.map((b) => scanBoard(b, rules))
  const totals = {}
  for (const b of boards) for (const f of b.findings) totals[f.rule] = (totals[f.rule] || 0) + 1
  return { file: doc.file, extractedAt: doc.extractedAt, totals, boards }
}
