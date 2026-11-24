import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compile } from 'tailwindcss'

// Tailwind drops a class it does not understand without a word (`ui:min-h-0` is
// not in this theme's scale: the piece had no rule there). jsdom does not compile
// CSS, so this runs the compiler on the design system's sheet, as styles.test.js
// does, and asks it for every `ui:` class the pieces write.
const DESIGN_SYSTEM = join(import.meta.dirname, '..', '..')
const SHEET = join(DESIGN_SYSTEM, 'styles.css')
const resolveFrom = createRequire(SHEET)
const stylesheet = (id, base) => {
  const path = id.startsWith('.') ? join(base, id) : resolveFrom.resolve(/^tailwindcss\/(theme|utilities)$/.test(id) ? `${id}.css` : id)
  return { path, base: dirname(path), content: readFileSync(path, 'utf8') }
}
const sheet = readFileSync(SHEET, 'utf8')
const generates = async (candidate) => {
  const compiler = await compile(sheet, { base: dirname(SHEET), loadStylesheet: async (id, base) => stylesheet(id, base) })
  // (the `@layer properties` fallback and `@property` blocks are written for any utility)
  const css = compiler.build([candidate]).replace(/@layer properties \{[\s\S]*?\n\}\n/, '').replace(/@property[^}]*\}/g, '')
  return css.includes('{') && /\.ui\\:/.test(css)
}

const pieces = join(DESIGN_SYSTEM, 'components')
const pieceFiles = () => readdirSync(pieces).filter((file) => file.endsWith('.jsx'))
const classesOfPieces = () => {
  const found = new Set()
  pieceFiles().forEach((file) => {
    for (const [token] of readFileSync(join(pieces, file), 'utf8').matchAll(/ui:[^\s'"`]+/g)) found.add(token)
  })
  return [...found].sort()
}

// Tailwind reads the source as text: a class built by an interpolation (`ui:duration-(--ui-${name}-x)`)
// is never generated, so every piece spells each class whole.
const interpolated = (source) => [...source.matchAll(/ui:[^\s'"`]*\$\{[^\s'"`]*/g)].map(([token]) => token)

describe('the pieces\' classes', () => {
  it('reads a real set of classes from the pieces', () => {
    expect(classesOfPieces().length).toBeGreaterThan(150)
  })

  it('knows a class that generates nothing (the control of the next test)', async () => {
    expect(await generates('ui:min-h-0')).toBe(false)
    expect(await generates('ui:min-h-[0]')).toBe(true)
  })

  it('knows an interpolated class (the control of the next test)', () => {
    const built = ['ui:duration-(--ui-', '$', '{name}-motion-duration)'].join('')
    expect(interpolated(`'${built}'`)).toEqual([built])
    expect(interpolated('ui:p-sm ' + '$' + '{name} ui:m-none')).toEqual([])
  })

  it('no piece builds a class by interpolation', () => {
    const built = pieceFiles().flatMap((file) => interpolated(readFileSync(join(pieces, file), 'utf8')).map((token) => `${file}: ${token}`))
    expect(built).toEqual([])
  })

  it('every `ui:` class the pieces write generates a rule', async () => {
    const dead = []
    for (const candidate of classesOfPieces()) if (!(await generates(candidate))) dead.push(candidate)
    expect(dead).toEqual([])
  }, 60000)
})
