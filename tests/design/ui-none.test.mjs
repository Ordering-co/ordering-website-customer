// A `ui:*-none` class that Tailwind also defines (R2-02, skill S8). This sheet clears Tailwind's scales and maps
// `none` to the spacing level, so `ui:max-w-none` is `max-width: 0` (not "no limit") and `ui:leading-none` is
// `line-height: 0` (not 1). The classes test of the pieces only proves that a class generates a rule, not which
// one: this compiles each `ui:*-none` class the pieces write with the design system's sheet and with Tailwind's
// own scales, and fails when the sheet resolves it to the spacing scale while Tailwind has a meaning of its own.
// `ui:m-none`, `ui:p-none`, `ui:gap-none` are fine: Tailwind has no `-none` there, the spacing level is the point.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { compile } from 'tailwindcss'
import { analyze } from '../../scripts/design/scan.mjs'
import { ROOT } from '../../scripts/design/engine.mjs'

const DESIGN_SYSTEM = path.join(ROOT, 'src/ui/src/design-system')
const SHEET = path.join(DESIGN_SYSTEM, 'styles.css')
const PIECES = path.join(DESIGN_SYSTEM, 'components')
const resolveFrom = createRequire(SHEET)
const loadStylesheet = async (id, base) => {
  const file = id.startsWith('.') ? path.join(base, id) : resolveFrom.resolve(/^tailwindcss\/(theme|utilities)$/.test(id) ? `${id}.css` : id)
  return { path: file, base: path.dirname(file), content: readFileSync(file, 'utf8') }
}
// the same prefix with Tailwind's own theme: what the class means outside this sheet
const TAILWIND = "@import 'tailwindcss/theme' layer(theme) prefix(ui);\n@import 'tailwindcss/utilities' layer(utilities) source(none);\n"
const SHEETS = [readFileSync(SHEET, 'utf8'), TAILWIND]
// a fresh compiler per class: build() accumulates every candidate it was ever given
const rule = async (sheet, candidate) => {
  const css = (await compile(sheet, { base: path.dirname(SHEET), loadStylesheet })).build([candidate]).replace(/@layer properties \{[\s\S]*?\n\}\n/, '').replace(/@property[^}]*\}/g, '')
  return /\.ui\\:/.test(css) ? css : ''
}

/** A `ui:*-none` class that this sheet sends to the spacing scale and Tailwind defines otherwise -> its two rules, or null. */
// the utility without its variants (`ui:max-mobile:leading-none` -> `ui:leading-none`): Tailwind's own theme does
// not know this sheet's breakpoints
const utilityOf = candidate => `ui:${candidate.slice(3).split(/:(?![^[]*\])/).pop()}`
export const collides = async candidate => {
  const [ours, theirs] = await Promise.all([rule(SHEETS[0], candidate), rule(SHEETS[1], utilityOf(candidate))])
  return ours.includes('--ot-space-none') && theirs ? { ours, theirs } : null
}

// the classes in the code of the pieces, comments left out (a comment may name the class it avoids)
const noneClasses = () => {
  const found = new Map()
  for (const file of readdirSync(PIECES).filter(f => /\.jsx?$/.test(f))) {
    for (const [token] of analyze(readFileSync(path.join(PIECES, file), 'utf8')).plain.matchAll(/ui:[^\s'"`]*-none(?![\w-])/g)) found.set(token, file)
  }
  return found
}

test('ui-none: knows a colliding class and a spacing one (the control of the next test)', async () => {
  assert.ok(await collides('ui:max-w-none'))
  assert.ok(await collides('ui:leading-none'))
  assert.ok(await collides('ui:max-mobile:leading-none'))
  assert.equal(await collides('ui:m-none'), null)
  assert.equal(await collides('ui:gap-none'), null)
})

test('ui-none: no piece writes a ui:*-none class that Tailwind defines and this sheet maps to the spacing scale', async () => {
  const classes = noneClasses()
  assert.ok(classes.size > 3, `read only ${classes.size} ui:*-none classes`)
  const bad = []
  for (const [candidate, file] of classes) if (await collides(candidate)) bad.push(`${file}: ${candidate}`)
  assert.deepEqual(bad, [])
})
