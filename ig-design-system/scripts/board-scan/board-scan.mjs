#!/usr/bin/env node
// Board scan CLI. Read-only against the design file.
//
//   node board-scan.mjs build --config <scan.config.json> [--board <name>] [--detail] [--raw]
//       Print one self-contained script for the Penpot MCP `execute_code`
//       tool: extractor + scan core + resolved rules. It returns the summary
//       (gate PASS/FAIL, totals, findings, relation distribution); --raw
//       returns the extract itself instead, to save and scan offline.
//
//   node board-scan.mjs scan --config <scan.config.json> --extract <extract.json> [--detail]
//       Scan a saved extract in Node. Prints the summary as JSON.
//       Exit 0 = PASS (no findings outside registered exceptions),
//       1 = FAIL, 2 = usage or config error.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadConfig } from './rules.mjs'
import { scan, summarize } from './scan-core.mjs'

const here = dirname(fileURLToPath(import.meta.url))

export function buildScript(configPath, { board = null, detail = false, raw = false } = {}) {
  const { extract, rules } = loadConfig(configPath)
  const ex = { ...extract, board }
  const extractSrc = readFileSync(join(here, 'extract.penpot.js'), 'utf8').replace(/^const EXTRACT_CONFIG = .*$/m, `const EXTRACT_CONFIG = ${JSON.stringify(ex)}`)
  if (raw) return extractSrc
  const core = readFileSync(join(here, 'scan-core.mjs'), 'utf8').replace(/^export /gm, '')
  return `const EXTRACT = (() => {
${extractSrc}
})()
${core}
const RULES = ${JSON.stringify(rules)}
return summarize(scan(EXTRACT, RULES), ${detail})
`
}

export function scanFile(configPath, extractPath, detail = false) {
  const { rules, warnings } = loadConfig(configPath)
  const doc = JSON.parse(readFileSync(extractPath, 'utf8'))
  const summary = summarize(scan(doc, rules), detail)
  if (warnings.length) summary.warnings = warnings
  return summary
}

function arg(args, name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}

function main(argv) {
  const [cmd, ...args] = argv
  const config = arg(args, '--config')
  if (!config || !['build', 'scan'].includes(cmd)) {
    process.stderr.write('usage: board-scan.mjs build|scan --config <file> [--board <name>] [--extract <file>] [--detail] [--raw]\n')
    return 2
  }
  try {
    if (cmd === 'build') {
      process.stdout.write(buildScript(config, { board: arg(args, '--board'), detail: args.includes('--detail'), raw: args.includes('--raw') }))
      return 0
    }
    const extract = arg(args, '--extract')
    if (!extract) throw new Error('scan needs --extract <file>')
    const summary = scanFile(config, extract, args.includes('--detail'))
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n')
    return summary.gate === 'PASS' ? 0 : 1
  } catch (e) {
    process.stderr.write(`board-scan: ${e.message}\n`)
    return 2
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main(process.argv.slice(2))
