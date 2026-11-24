import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compile } from 'tailwindcss'

// jsdom does not compile Tailwind (the vitest config skips CSS), so this runs
// the compiler itself on the design system's one sheet, as the Vite plugin
// does, and asks for classes (what `@source` would find in the pieces).
const SHEET = join(import.meta.dirname, '..', 'styles.css')
const resolveFrom = createRequire(SHEET)
const stylesheet = (id, base) => {
  const path = id.startsWith('.') ? join(base, id) : resolveFrom.resolve(/^tailwindcss\/(theme|utilities)$/.test(id) ? `${id}.css` : id)
  return { path, base: dirname(path), content: readFileSync(path, 'utf8') }
}

// (a compiler keeps every class it was asked for: one per question)
const build = async (...classes) => {
  const compiler = await compile(readFileSync(SHEET, 'utf8'), { base: dirname(SHEET), loadStylesheet: async (id, base) => stylesheet(id, base) })
  return compiler.build(classes)
}

describe('styles.css', () => {
  it('generates the utilities of the theme\'s tokens with the `ui:` prefix, reading their runtime variable and its default', async () => {
    const css = await build('ui:p-md', 'ui:bg-primary', 'ui:text-on-primary', 'ui:rounded-lg', 'ui:h-size-md', 'ui:text-button', 'ui:shadow-md')
    expect(css).toMatch(/\.ui\\:p-md \{\s*padding: var\(--ot-space-md, 12px\);/)
    expect(css).toMatch(/\.ui\\:bg-primary \{\s*background-color: var\(--ot-color-primary, #1E72E3\);/)
    expect(css).toContain('color: var(--ot-color-on-primary, #FFFFFF);')
    expect(css).toContain('border-radius: var(--ot-radius-lg,')
    expect(css).toContain('height: var(--ot-size-md, 40px);')
    expect(css).toContain('font-size: var(--ot-text-button-size, 16px);')
    expect(css).toContain('box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)')
  })

  it('has nothing of Tailwind\'s own scales: no palette, no numeric spacing, no default sizes or breakpoints', async () => {
    const css = await build('ui:bg-red-500', 'ui:text-blue-600', 'ui:p-4', 'ui:m-2', 'ui:text-sm', 'ui:text-lg', 'ui:rounded-3xl', 'ui:shadow-2xl', 'ui:sm:p-md', 'ui:md:p-md', 'ui:lg:p-md', 'ui:font-sans', 'ui:ease-in-out', 'ui:max-w-3xl', 'ui:blur-sm', 'ui:p-md')
    // only the one that is a token of the theme is generated (the control: p-md), none of the others
    expect(css.match(/\.ui\\:[^ ]+/g)).toEqual(['.ui\\:p-md'])
  })

  it('uses the shadcn names for the controls and the web\'s own names for the canvas and the brand secondary', async () => {
    const css = await build('ui:bg-background', 'ui:bg-secondary', 'ui:bg-canvas', 'ui:bg-brand-secondary', 'ui:text-on-brand-secondary', 'ui:bg-secondary-subtle', 'ui:text-on-secondary')
    expect(css).toMatch(/\.ui\\:bg-background \{\s*background-color: var\(--ot-color-surface,/)
    expect(css).toMatch(/\.ui\\:bg-secondary \{\s*background-color: var\(--ot-color-surface-alt,/)
    expect(css).toMatch(/\.ui\\:bg-canvas \{\s*background-color: var\(--ot-color-background,/)
    expect(css).toMatch(/\.ui\\:bg-brand-secondary \{\s*background-color: var\(--ot-color-secondary,/)
    expect(css).toContain('var(--ot-color-on-secondary,')
    // the names that would pair `secondary` with another color's text do not exist
    expect(css).not.toContain('bg-secondary-subtle')
    expect(css).not.toContain('text-on-secondary')
  })

  it('has the theme\'s phone cut as its one breakpoint', async () => {
    const css = await build('ui:max-mobile:p-sm', 'ui:mobile:p-md')
    expect(css).toContain('@media (width < 576px)')
    expect(css).toContain('@media (width >= 576px)')
  })

  it('does not reset the app: no preflight, no base layer', async () => {
    const css = await build('ui:flex')
    expect(css).not.toMatch(/box-sizing|@layer base|button, input/)
    // (the only rule on every element is the fallback of old browsers for Tailwind's own `--tw-*`)
    const outsideProperties = css.replace(/@layer properties \{[\s\S]*?\n\}\n/, '')
    expect(outsideProperties).not.toMatch(/(^|\n)\s*\*/)
  })

  it('reads a component\'s variables as arbitrary values, with no default of its own', async () => {
    const css = await build('ui:h-(--ui-button-height)', 'ui:duration-(--ui-button-motion-duration)', 'ui:motion-safe:transition-colors')
    expect(css).toContain('height: var(--ui-button-height);')
    expect(css).toContain('transition-duration: var(--ui-button-motion-duration);')
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)')
  })
})
