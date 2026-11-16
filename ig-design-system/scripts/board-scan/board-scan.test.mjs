// node --test ig-design-system/scripts
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { indexBoard, scanBoard, summarize, visualBox, scan, tokenLineHeight } from './scan-core.mjs'
import { loadConfig, tableAfter, exceptionsFromTable } from './rules.mjs'
import { buildScript, scanFile } from './board-scan.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const CONFIG = join(here, '..', '..', 'examples', 'board-scan', 'scan.config.json')
const { rules, extract, warnings } = loadConfig(CONFIG)

const node = (n) => ({ type: 'board', parent: -1, depth: 0, x: 0, y: 0, w: 10, h: 10, ...n })
const text = (n) => node({ type: 'text', runs: [{ family: 'Example Sans', size: n.size, weight: '400', lh: n.lh ?? 1.2, chars: 2 }], text: 'xx', grow: 'auto-width', ...n })
const board = (nodes, screen = 'Test screen') => ({ name: screen, screen, w: 360, h: 800, nodes })
const relations = (b) => scanBoard(b, rules).relations.map((r) => `${r.relation} ${r.gap}`)
const allFindings = (b) => scanBoard(b, rules).findings.map((f) => f.rule)
const findings = (b) => allFindings(b).filter((r) => !r.startsWith('flow:'))
const column = { dir: 'column', rowGap: 0, columnGap: 0, pad: [0, 0, 0, 0] }

describe('config', () => {
  test('resolves colours, the page-flow table and exceptions from the project documents', () => {
    assert.ok(rules.colors.includes('#3355aa'))
    assert.equal(rules.colorsFrom, undefined)
    assert.deepEqual(rules.flow['page-side-margin'], [20])
    assert.equal(Object.keys(rules.flow).length, 16)
    assert.ok(rules.exceptions.some((e) => e.rule === 'icon-size' && e.within === 'DS-Badge' && e.value === 14 && e.decision === 'D-4'))
    assert.ok(rules.exceptions.some((e) => e.rule === 'row-siblings' && e.screen === 'Detail' && e.to === 'info'))
    assert.deepEqual(warnings, [])
    assert.equal(extract.page, 'Screens')
  })

  test('tableAfter stops at the end of the first table and returns null for a missing heading', () => {
    const md = '#### Relations\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\ntext\n\n| x | y |\n|---|---|\n| 3 | 4 |\n'
    assert.deepEqual(tableAfter(md, '#### Relations'), [['1', '2']])
    assert.equal(tableAfter(md, '#### Nope'), null)
  })

  test('an exception without a reason is a config error, and multi-value relations are reported unsettled', () => {
    const dir = mkdtempSync(join(tmpdir(), 'scan-'))
    const cfg = (r) => {
      const p = join(dir, `c${Math.random()}.json`)
      writeFileSync(p, JSON.stringify({ rules: { lineHeights: [{ minSize: 0, value: 1.5 }], ...r } }))
      return p
    }
    assert.throws(() => loadConfig(cfg({ exceptions: [{ rule: 'grid' }] })), /no reason/)
    assert.throws(() => loadConfig(cfg({ lineHeights: [] })), /lineHeights/)
    assert.match(loadConfig(cfg({ flow: { 'block-to-block': [12, 16] } })).warnings[0], /not settled/)
    assert.deepEqual(exceptionsFromTable([['`grid`', '—', '—', 'r']]), [{ rule: 'grid', reason: 'r' }])
  })
})

describe('geometry contract', () => {
  test('token line height follows the size steps', () => {
    assert.equal(tokenLineHeight(24, rules), 1.3)
    assert.equal(tokenLineHeight(20, rules), 1.3)
    assert.equal(tokenLineHeight(15, rules), 1.6)
  })

  test('text is measured by its token line box, centred on the drawn box', () => {
    // 15 drawn at the tool default 1.2 → 18 high at y 100; token box 24 keeps the centre 109
    const b = board([text({ name: 't', size: 15, y: 100, h: 18 })])
    const box = visualBox(indexBoard(b, rules), 0, rules)
    assert.ok(Math.abs(box.h - 24) < 1e-9)
    assert.ok(Math.abs(box.y + box.h / 2 - 109) < 1e-9)
  })

  test('a component root keeps its own box; a plain container is the union of its children', () => {
    const b = board([
      node({ name: 'DS-Field / search', x: 20, y: 0, w: 320, h: 48 }),
      node({ name: 'icon', parent: 0, depth: 1, x: 36, y: 14, w: 20, h: 20 }),
      node({ name: 'group', x: 20, y: 100, w: 320, h: 80 }),
      node({ name: 'a', parent: 2, depth: 1, x: 40, y: 110, w: 20, h: 20, fills: ['#ffffff'] }),
    ])
    const ix = indexBoard(b, rules)
    assert.deepEqual(visualBox(ix, 0, rules), { x: 20, y: 0, w: 320, h: 48 })
    assert.deepEqual(visualBox(ix, 2, rules), { x: 40, y: 110, w: 20, h: 20 })
  })

  test('a lone icon button keeps its touch-target square; decoration does not widen a box', () => {
    const btn = board([node({ name: 'close', w: 48, h: 48 }), node({ name: 'asset / icon / close', parent: 0, depth: 1, x: 12, y: 12, w: 24, h: 24 })])
    assert.deepEqual(visualBox(indexBoard(btn, rules), 0, rules), { x: 0, y: 0, w: 48, h: 48 })
    const marked = board([
      node({ name: 'text', x: 56, y: 0, w: 224, h: 52 }),
      text({ name: 'Text', parent: 0, depth: 1, x: 56, y: 0, w: 224, h: 48, size: 15, lh: 1.6 }),
      node({ name: 'mark / highlight', parent: 0, depth: 1, x: 40, y: 5, w: 300, h: 18 }),
    ])
    assert.equal(visualBox(indexBoard(marked, rules), 0, rules).x, 56)
  })
})

describe('layer rules', () => {
  test('line height must be the role token', () => {
    assert.ok(findings(board([text({ name: 't', size: 15, lh: 1.2 })])).includes('line-height'))
    assert.deepEqual(findings(board([text({ name: 't', size: 15, lh: 1.6 })])), [])
    assert.deepEqual(findings(board([text({ name: 't', size: 24, lh: 1.3 })])), [])
  })

  test('colours must be tokens outside exempt illustrations; fonts must be listed pairs', () => {
    assert.deepEqual(findings(board([node({ name: 'box', fills: ['#123456'] })])), ['color'])
    assert.deepEqual(findings(board([node({ name: 'asset / illustration / leaf', fills: ['#123456'] })])), [])
    assert.deepEqual(findings(board([text({ name: 't', size: 18, lh: 1.6 })])), ['font'])
  })

  test('screen-specific font sizes apply only on their screens', () => {
    const t = text({ name: 't', size: 32, lh: 1.3 })
    assert.deepEqual(findings(board([t], 'Focus mode')), [])
    assert.deepEqual(findings(board([t], 'Detail')), ['font'])
  })

  test('icons must be square at a token size unless an exception covers them; ranges work', () => {
    assert.deepEqual(findings(board([node({ name: 'asset / icon / clock', w: 18, h: 18 })])), ['icon-size'])
    assert.deepEqual(findings(board([node({ name: 'asset / icon / large / pan', w: 40, h: 40 })])), [])
    assert.deepEqual(findings(board([node({ name: 'asset / icon / large / pan', w: 56, h: 56 })])), ['icon-size'])
    const badge = [node({ name: 'DS-Badge / mine', w: 59, h: 16 }), node({ name: 'asset / icon / voice', parent: 0, depth: 1, w: 14, h: 14 })]
    assert.deepEqual(findings(board(badge)), [])
  })

  test('page-level flex gaps sit on the grid; component internals do not count', () => {
    assert.deepEqual(findings(board([node({ name: 'meta', layout: { dir: 'row', rowGap: 0, columnGap: 6, pad: [0, 0, 0, 0] } })])), ['grid'])
    assert.deepEqual(findings(board([node({ name: 'DS-Chip / x', layout: { dir: 'row', rowGap: 0, columnGap: 6, pad: [0, 0, 0, 0] } })])), [])
  })
})

describe('page-flow relations', () => {
  test('classifies spine neighbours and checks them against the table', () => {
    const b = board([
      node({ name: 'content', w: 360, h: 800, layout: column }),
      node({ name: 'DS-TopBar / back', parent: 0, depth: 1, x: 0, y: 0, w: 360, h: 56, fills: ['#ffffff'] }),
      node({ name: 'DS-SectionTitle / default', parent: 0, depth: 1, x: 20, y: 60, w: 320, h: 32 }),
      node({ name: 'DS-Field / a', parent: 0, depth: 1, x: 20, y: 112, w: 320, h: 48 }),
    ])
    const r = relations(b)
    for (const want of ['header-to-first 4', 'section-title-to-content 20', 'page-side-margin 20']) assert.ok(r.includes(want), want)
    assert.deepEqual(allFindings(b), ['flow:section-title-to-content', 'flow:content-end-to-bottom'])
  })

  test('floating layers, sheet content and content under a fixed bar are not page flow', () => {
    const b = board([
      node({ name: 'list', w: 360, h: 700, layout: column }),
      node({ name: 'DS-ListRow / a', parent: 0, depth: 1, w: 360, h: 700 }),
      node({ name: 'DS-TabBar / home', y: 736, w: 360, h: 64, fills: ['#ffffff'] }),
      node({ name: 'DS-PrimaryRow / go', x: 20, y: 668, w: 221, h: 56 }),
      node({ name: 'DS-Fab / bot', type: 'ellipse', x: 284, y: 664, w: 56, h: 56 }),
      node({ name: 'DS-Sheet / bottom', y: 100, w: 360, h: 400 }),
      node({ name: 'picker', x: 20, y: 200, w: 320, h: 200 }),
    ])
    const r = relations(b)
    assert.ok(r.includes('fixed-bottom-stack 12'))
    assert.ok(!r.some((s) => s.startsWith('content-end')))
    assert.ok(!r.some((s) => s.startsWith('block-to-block')))
  })

  test('a row that starts with a section title counts as a title', () => {
    const b = board([
      node({ name: 'content', w: 360, h: 800, layout: column }),
      node({ name: 'DS-Field / a', parent: 0, depth: 1, x: 20, y: 0, w: 320, h: 48 }),
      node({ name: 'head', parent: 0, depth: 1, x: 20, y: 80, w: 320, h: 32, layout: { dir: 'row', rowGap: 0, columnGap: 8, pad: [0, 0, 0, 0] } }),
      node({ name: 'DS-SectionTitle / default', parent: 2, depth: 2, x: 20, y: 80, w: 87, h: 32 }),
      node({ name: 'DS-Field / b', parent: 0, depth: 1, x: 20, y: 124, w: 320, h: 48 }),
    ])
    const r = relations(b)
    assert.ok(r.includes('section-to-section 32'))
    assert.ok(r.includes('section-title-to-content 12'))
  })

  test('a registered exception is scoped to its screen and target', () => {
    const hero = (screen) =>
      board(
        [
          node({ name: 'body', w: 360, h: 800, layout: column }),
          node({ name: 'hero', parent: 0, depth: 1, x: 20, y: 0, w: 320, h: 150, layout: { dir: 'row', rowGap: 0, columnGap: 16, pad: [0, 0, 0, 0] } }),
          node({ name: 'photo', parent: 1, depth: 2, x: 20, y: 0, w: 141, h: 150, fills: ['#ffffff'] }),
          node({ name: 'info', parent: 1, depth: 2, x: 177, y: 0, w: 163, h: 120, fills: ['#ffffff'] }),
        ],
        screen,
      )
    assert.ok(!allFindings(hero('S02 Detail')).includes('flow:row-siblings'))
    assert.ok(allFindings(hero('Other')).includes('flow:row-siblings'))
  })
})

describe('summary and CLI', () => {
  test('summarize folds line-height findings, reports the gate and relation distribution', () => {
    const res = scan({ file: 'f', extractedAt: 't', boards: [board([text({ name: 'a', size: 15 }), text({ name: 'b', size: 15 })])] }, rules)
    const s = summarize(res)
    assert.equal(s.gate, 'FAIL')
    assert.deepEqual(s.boards[0].lineHeight, { '15px at 1.2, token 1.6': 2 })
    assert.ok(s.boards[0].findings.every((f) => !f.startsWith('line-height')))
    const clean = summarize(scan({ file: 'f', extractedAt: 't', boards: [board([text({ name: 'a', size: 15, lh: 1.6, x: 20, y: 752, h: 24 })])] }, rules))
    assert.equal(clean.gate, 'PASS')
    assert.ok(clean.relations['page-side-margin'][20].n === 1)
  })

  test('scanFile scans a saved extract offline', () => {
    const dir = mkdtempSync(join(tmpdir(), 'scan-'))
    const p = join(dir, 'extract.json')
    writeFileSync(p, JSON.stringify({ file: 'Example Design', extractedAt: 'now', boards: [board([node({ name: 'box', fills: ['#123456'] })])] }))
    const s = scanFile(CONFIG, p)
    assert.equal(s.gate, 'FAIL')
    assert.equal(s.totals.color, 1)
  })

  test('the built paste script runs against a stubbed Penpot API and changes nothing', async () => {
    const shape = (o) => ({ hidden: false, rotation: 0, opacity: 1, fills: [], strokes: [], children: [], getSharedPluginData: () => '', isComponentRoot: () => false, ...o })
    const approved = shape({
      type: 'board', name: 'Home', x: 1000, y: 0, width: 360, height: 800,
      getSharedPluginData: (ns, k) => (ns === 'example' && k === 'status' ? 'approved' : ns === 'example' && k === 'screen' ? 'Home' : ''),
      children: [shape({ type: 'rectangle', name: 'card', x: 1020, y: 40, width: 320, height: 80, fills: [{ fillColor: '#123456', fillOpacity: 1 }] })],
    })
    const draft = shape({ type: 'board', name: 'Draft', x: 0, y: 0, width: 360, height: 800 })
    const penpot = { currentFile: { name: 'Example Design' } }
    const penpotUtils = { getPageByName: (n) => (n === 'Screens' ? { root: { children: [approved, draft] } } : null) }
    const AsyncFunction = (async () => {}).constructor
    const run = new AsyncFunction('penpot', 'penpotUtils', buildScript(CONFIG))
    const s = await run(penpot, penpotUtils)
    assert.equal(s.boardCount, 1)
    assert.equal(s.gate, 'FAIL')
    assert.ok(s.boards[0].findings.includes('color | card | #123456'))
    const raw = await new AsyncFunction('penpot', 'penpotUtils', buildScript(CONFIG, { raw: true }))(penpot, penpotUtils)
    assert.equal(raw.boards[0].nodes[0].x, 20)
    await assert.rejects(new AsyncFunction('penpot', 'penpotUtils', buildScript(CONFIG))({ currentFile: { name: 'Other' } }, penpotUtils), /expected "Example Design"/)
  })
})
