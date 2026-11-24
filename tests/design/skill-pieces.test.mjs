// Every base piece has a row in the "The pieces" table of the design skill, so an
// agent that reads the skill learns the piece exists before reaching for a legacy primitive.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const doc = readFileSync(path.join(root, '.claude/skills/ordering-website-design/references/design-system.md'), 'utf8')
const componentsDir = path.join(root, 'src/ui/src/design-system/components')

// createIcon is covered by the Icon row
const pieces = readdirSync(componentsDir)
  .filter((file) => file.endsWith('.jsx') && file !== 'createIcon.jsx')
  .map((file) => file.replace(/\.jsx$/, ''))

const section = (doc.split(/^## The pieces\s*$/m)[1] || '').split(/^## /m)[0]
const named = new Set(
  section.split('\n')
    .filter((line) => line.startsWith('|'))
    .flatMap((line) => [...line.split('|')[1].matchAll(/`([^`]+)`/g)].map((m) => m[1].replace(/\.jsx$/, '')))
)

test('the skill has a "The pieces" table', () => {
  assert.ok(named.size > 0, 'no "## The pieces" table in references/design-system.md')
})

test('every piece in design-system/components has a row in "The pieces"', () => {
  const missing = pieces.filter((piece) => !named.has(piece))
  assert.deepEqual(missing, [], `pieces without a row in "The pieces" of references/design-system.md: ${missing.join(', ')}`)
})
