import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { KEPT_WEIGHTS } from '../appTheme'

// Every weight a CSS block keeps through themeText / headingText /
// themePartText / themeTextStyle in the app's styles, by role.
const SRC = path.resolve(__dirname, '../..')
const HEADINGS = new Set(['display', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
const LEVEL = /^(display|h[1-6]|body_lg|body|label|caption|button)$/
const KEYWORDS = { bold: 700, normal: 400 }

const sourceFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name)
  if (entry.isDirectory()) return ['__tests__', '@', 'node_modules'].includes(entry.name) ? [] : sourceFiles(file)
  return /\.jsx?$/.test(entry.name) && !/\.test\./.test(entry.name) ? [file] : []
})

const keptWeights = () => {
  const found = { heading: new Set(), body: new Set() }
  const unread = []
  ;['ui', 'pages', 'components', 'utils'].forEach((dir) => sourceFiles(path.join(SRC, dir)).forEach((file) => {
    const source = fs.readFileSync(file, 'utf8')
    const calls = source.matchAll(/\b(themeText|headingText|themePartText|themeTextStyle)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)
    for (const [, helper, args] of calls) {
      // the `weight` option of themeText / themePartText, or a style object's fontWeight
      const match = args.match(/\bweight:\s*['"]?([a-z0-9]+)/) || args.match(/fontWeight:\s*['"]?([a-z0-9]+)/)
      if (!match) continue
      const raw = match[1]
      const weight = /^\d+$/.test(raw) ? Number(raw) : KEYWORDS[raw]
      if (weight === undefined) continue
      if (helper === 'themePartText') {
        found.heading.add(weight)
        found.body.add(weight)
        continue
      }
      const level = [...args.matchAll(/(['"`])([a-z0-9_]+)\1/g)].map((m) => m[2]).find((value) => LEVEL.test(value))
      if (!level) { unread.push(`${path.relative(SRC, file)}: ${args.slice(0, 80)}`); continue }
      found[helper === 'headingText' || HEADINGS.has(level) ? 'heading' : 'body'].add(weight)
    }
  }))
  return { found, unread }
}

describe('KEPT_WEIGHTS', () => {
  it('lists every weight the styles keep through themeText, by role', () => {
    const { found, unread } = keptWeights()
    expect(unread).toEqual([])
    expect(found.heading.size + found.body.size).toBeGreaterThan(0)
    expect(KEPT_WEIGHTS.heading).toEqual(expect.arrayContaining([...found.heading]))
    expect(KEPT_WEIGHTS.body).toEqual(expect.arrayContaining([...found.body]))
  })
})
