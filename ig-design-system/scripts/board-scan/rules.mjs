// Load a project's scan config and resolve the parts it reads from the
// project's own documents, so the scan carries no values of its own:
//   colorsFrom     regex over a token file (capture group 1 = hex colour)
//   flowFrom       the DS-PAGE-FLOW "Relations" table in components.md
//   exceptionsFrom the "Registered exceptions" table next to it
// Relative paths resolve against `root`, which is relative to the config file.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/** Rows of the first markdown table after the line that starts with `heading`, header row dropped. */
export function tableAfter(md, heading) {
  const lines = md.split('\n')
  const start = lines.findIndex((l) => l.startsWith(heading))
  if (start < 0) return null
  const rows = []
  let inTable = false
  for (const l of lines.slice(start + 1)) {
    if (l.startsWith('|')) {
      inTable = true
      if (/^\|[\s|:-]+\|$/.test(l.trim())) continue
      rows.push(l.trim().slice(1, -1).split('|').map((c) => c.trim()))
    } else if (inTable) break
    else if (/^#{1,4} /.test(l)) break
  }
  return rows.slice(1)
}

const code = (s) => (s ?? '').replace(/`/g, '').trim()

/** Relations table → { id: [px, …] }. */
export function flowFromTable(rows, idColumn = 1, pxColumn = 3) {
  const flow = {}
  for (const r of rows) {
    const id = code(r[idColumn])
    const px = (r[pxColumn] ?? '').match(/-?\d+(\.\d+)?/g)?.map(Number)
    if (id && px?.length) flow[id] = px
  }
  return flow
}

/** Exceptions table (Rule | Where | Value | Reason [| Decision]) → exception objects. */
export function exceptionsFromTable(rows) {
  const out = []
  for (const r of rows) {
    const [rule, where, value, reason, decision] = r.map(code)
    if (!rule) continue
    const e = { rule, reason }
    if (decision) e.decision = decision
    if (value && value !== '—' && value !== '-') e.value = /^-?\d+(\.\d+)?$/.test(value) ? +value : value
    for (const part of (where || '').split(';').map((s) => s.trim()).filter(Boolean)) {
      const [k, v] = part.split('=').map((s) => s?.trim())
      if (k === 'within' || k === 'screen' || k === 'to') e[k] = v
    }
    out.push(e)
  }
  return out
}

/** Read config JSON and resolve every *From source. Returns { extract, rules, warnings }. */
export function loadConfig(configPath, readFile = (p) => readFileSync(p, 'utf8')) {
  const cfg = JSON.parse(readFile(configPath))
  const root = resolve(dirname(configPath), cfg.root ?? '.')
  const read = (p) => readFile(resolve(root, p))
  const rules = { ...cfg.rules }
  const warnings = []

  if (rules.colorsFrom) {
    const colors = new Set((rules.colors || []).map((c) => c.toLowerCase()))
    for (const src of rules.colorsFrom) {
      for (const m of read(src.file).matchAll(new RegExp(src.pattern, src.flags ?? 'gi'))) colors.add(m[1].toLowerCase())
    }
    rules.colors = [...colors]
    delete rules.colorsFrom
  }
  if (rules.flowFrom) {
    const f = rules.flowFrom
    const rows = tableAfter(read(f.file), f.heading)
    if (!rows) throw new Error(`flowFrom: heading "${f.heading}" not found in ${f.file}`)
    rules.flow = { ...flowFromTable(rows, f.idColumn, f.pxColumn), ...(rules.flow || {}) }
    delete rules.flowFrom
  }
  if (rules.exceptionsFrom) {
    const f = rules.exceptionsFrom
    const rows = tableAfter(read(f.file), f.heading)
    if (!rows) throw new Error(`exceptionsFrom: heading "${f.heading}" not found in ${f.file}`)
    rules.exceptions = [...(rules.exceptions || []), ...exceptionsFromTable(rows)]
    delete rules.exceptionsFrom
  }

  if (!Array.isArray(rules.lineHeights) || !rules.lineHeights.length) throw new Error('rules.lineHeights is required (token line height per size step)')
  for (const e of rules.exceptions || []) if (!e.reason) throw new Error(`exception for "${e.rule}" has no reason`)
  for (const [id, v] of Object.entries(rules.flow || {})) {
    if (v.length > 1) warnings.push(`flow "${id}" has ${v.length} values (${v.join('/')}): not settled to one token yet`)
  }
  return { extract: { statusKey: 'status', statusValue: 'approved', screenKey: 'screen', ...cfg.extract }, rules, warnings }
}
