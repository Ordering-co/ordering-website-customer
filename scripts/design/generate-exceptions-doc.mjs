// Keep the skill's Recorded exceptions list in sync with the design guards' registry.
//   node scripts/design/generate-exceptions-doc.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { loadExceptions, ROOT } from './engine.mjs'

const docPath = '.claude/skills/ordering-website-design/references/design-system.md'
const file = path.join(ROOT, docPath)
const begin = '<!-- BEGIN GENERATED EXCEPTIONS -->'
const end = '<!-- END GENERATED EXCEPTIONS -->'

const renderList = exceptions => {
  const sections = []
  for (const guard of Object.keys(exceptions).sort()) {
    const entries = exceptions[guard]
    if (!Array.isArray(entries) || !entries.length) continue

    const byFile = new Map()
    for (const entry of entries) {
      if (!byFile.has(entry.file)) byFile.set(entry.file, [])
      byFile.get(entry.file).push(entry)
    }

    const groups = [`### \`${guard}\``]
    for (const file of [...byFile.keys()].sort()) {
      const lines = byFile.get(file).map(({ id, value, count, reason }) => {
        const uses = count > 1 ? ` (${count} uses)` : ''
        return `- \`${id}\` in \`${file}\` — \`${value}\`${uses}. ${reason.replace(/\s*\r?\n\s*/g, ' ')}`
      })
      groups.push(`#### \`${file}\`\n\n${lines.join('\n')}`)
    }
    sections.push(groups.join('\n\n'))
  }
  return sections.join('\n\n')
}

const doc = readFileSync(file, 'utf8')
const heading = /^## Recorded exceptions(?: [^\r\n]*)?\r?\n/m.exec(doc)
if (!heading) throw new Error(`${docPath}: missing Recorded exceptions heading`)

const sectionStart = heading.index + heading[0].length
const rest = doc.slice(sectionStart)
const nextHeading = rest.search(/^## /m)
const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading)
const newline = heading[0].endsWith('\r\n') ? '\r\n' : '\n'
const listStart = section.indexOf(`${newline}${begin}${newline}`)
const listEnd = section.indexOf(`${newline}${end}${newline}`)
if (listStart === -1 || listEnd <= listStart) {
  throw new Error(`${docPath}: missing or misplaced generated list markers in Recorded exceptions`)
}

const contentStart = sectionStart + listStart + newline.length + begin.length + newline.length
const contentEnd = sectionStart + listEnd + newline.length
const list = renderList(loadExceptions()).replaceAll('\n', newline)
const updated = doc.slice(0, contentStart) + newline + list + newline + newline + doc.slice(contentEnd)

if (doc !== updated) {
  if (process.argv.includes('--check')) {
    console.error(`${docPath}: Recorded exceptions is out of date. Run pnpm design:baseline.`)
    process.exitCode = 1
  } else {
    writeFileSync(file, updated)
  }
}
