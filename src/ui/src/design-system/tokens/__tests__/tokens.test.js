import React from 'react'
import { readFileSync } from 'node:fs'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ServerStyleSheet, ThemeProvider } from 'styled-components'
import { buildTailwindCss, defaultEntries, FILES } from '../../../../../../scripts/theme-css-catalog.mjs'
import { buildAppTheme, THEME_DEFAULTS } from '~/utils/appTheme'
import THEME_COMPILED from '~/theme.compiled.json'
import { themeRadius } from '~/utils/themeTokens'
import { ALIASES, aliasVar } from '../aliases.mjs'
import { catalogEntries, keysFromTokens } from '../catalog.mjs'
import { tailwindLines } from '../tailwind.mjs'
import { ThemeCssVariables } from '../ThemeCssVariables'
import { themeCssVariables } from '../variables'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeBreakpoint.mjs'

const envelope = (tokens) => ({ version: 2, values: { tokens } })
const defaults = buildAppTheme(null, null)
const square = buildAppTheme(null, envelope({
  color: { primary: '#3DDC84', on_primary: '#05140C', surface: '#12281D', border_strong: '#244D37' },
  border_style: { radius: 'none', width: 'thin', style: 'solid' },
  font: { heading: 'roboto', body: 'inter' }
}))

const entries = defaultEntries()
const written = themeCssVariables(defaults)

describe('tokens: the catalog of the theme', () => {
  it('covers every color token of the compiled schema', () => {
    const colors = Object.keys(THEME_COMPILED.values.tokens.color)
    expect(colors.length).toBeGreaterThan(30)
    colors.forEach((key) => expect(written).toHaveProperty(`--ot-color-${key.replace(/_/g, '-')}`))
  })

  it('has one variable per token, with no repeated name', () => {
    const names = catalogEntries(keysFromTokens(THEME_DEFAULTS.tokens), () => ({})).map(({ ot }) => ot)
    expect(new Set(names).size).toBe(names.length)
    expect(Object.keys(written)).toEqual(names)
  })

  it('the generator\'s defaults are what the writer writes for the default theme', () => {
    entries.forEach(({ ot, value }) => expect(written[ot], ot).toBe(value))
    expect(entries.map(({ ot }) => ot)).toEqual(Object.keys(written))
  })

  it('two themes write different values', () => {
    const other = themeCssVariables(square)
    expect(written['--ot-color-primary']).toBe('#1E72E3')
    expect(other['--ot-color-primary']).toBe('#3DDC84')
    expect(other['--ot-font-body']).not.toBe(written['--ot-font-body'])
  })

  it('Identity applies: a square theme changes the radius and the border', () => {
    const other = themeCssVariables(square)
    expect(written['--ot-radius-md']).toBe(themeRadius(defaults, 'md'))
    expect(other['--ot-radius-md']).toBe('0px')
    expect(other['--ot-radius-md']).not.toBe(written['--ot-radius-md'])
    // the box's border follows the theme-wide width; a control's stays its level
    expect(other['--ot-border-thin']).toBe('1px')
    expect(written['--ot-border-thin']).toBe('0px')
    expect(written['--ot-border-fixed-thin']).toBe('1px')
  })

  it('is memoized per theme', () => {
    expect(themeCssVariables(defaults)).toBe(themeCssVariables(defaults))
  })
})

describe('tokens: the dashboard aliases', () => {
  it('each alias points to a token of the catalog', () => {
    Object.entries(ALIASES).forEach(([name, ot]) => expect(written, name).toHaveProperty([ot]))
  })

  it('the generated Tailwind file is current', () => {
    expect(readFileSync(FILES.tailwind, 'utf8')).toBe(buildTailwindCss())
  })

  it('the Tailwind block reads the runtime variables, not other Tailwind ones', () => {
    const css = readFileSync(FILES.tailwind, 'utf8')
    expect(css).toContain(`--color-primary-foreground: var(--ot-color-on-primary, ${written['--ot-color-on-primary']});`)
    expect(css).toContain('--color-input: var(--ot-color-border-strong,')
    expect(css).not.toMatch(/: var\(--(color|radius|text|spacing)-/)
  })
})

// `--color-x: var(--ot-…, default)` lines of the generated block, by Tailwind name
const lines = () => Object.fromEntries(
  [...readFileSync(FILES.tailwind, 'utf8').matchAll(/^ {2}(--[a-z0-9-]+): var\((--ot-[a-z0-9-]+),/gm)].map(([, name, ot]) => [name, ot])
)

describe('tokens: the names in Tailwind', () => {
  const tw = lines()

  it('clears Tailwind\'s own theme and has the theme\'s phone cut as its one breakpoint', () => {
    const css = readFileSync(FILES.tailwind, 'utf8')
    expect(css).toContain('  --*: initial;\n')
    expect(css).toContain(`--breakpoint-mobile: ${MOBILE_WEB_MAX_WIDTH}px;`)
    expect(css.match(/--breakpoint-/g)).toHaveLength(1)
  })

  it('shadcn\'s names rule: background is the controls\' surface and secondary the neutral fill', () => {
    expect(tw['--color-background']).toBe('--ot-color-surface')
    expect(tw['--color-secondary']).toBe('--ot-color-surface-alt')
    expect(tw['--color-secondary-foreground']).toBe('--ot-color-text')
  })

  it('the web\'s own background and secondary family keep their runtime variable under their own names', () => {
    expect(tw['--color-canvas']).toBe('--ot-color-background')
    expect(tw['--color-brand-secondary']).toBe('--ot-color-secondary')
    expect(tw['--color-on-brand-secondary']).toBe('--ot-color-on-secondary')
    expect(tw['--color-brand-secondary-subtle']).toBe('--ot-color-secondary-subtle')
    expect(tw['--color-brand-secondary-pressed']).toBe('--ot-color-secondary-pressed')
    // …and the old names of that family are gone, not pointing at another color
    ;['--color-on-secondary', '--color-secondary-subtle', '--color-secondary-pressed', '--color-on-background'].forEach((name) => expect(tw, name).not.toHaveProperty(name))
  })

  it('no token of the theme is lost or changed: every color variable of the catalog is reachable, each with the one it had', () => {
    const reachable = new Set(Object.values(tw))
    entries.filter(({ group }) => group === 'color').forEach(({ ot }) => expect(reachable.has(ot), ot).toBe(true))
    entries.filter(({ group }) => ['radius', 'space', 'size', 'icon', 'shadow', 'font', 'typography'].includes(group))
      .forEach(({ ot }) => expect(reachable.has(ot), ot).toBe(true))
  })

  it('no incoherent pair is exposed: `on-X` is the text of `X`, a `-foreground` the one the pair declares', () => {
    const colors = Object.fromEntries(Object.entries(tw).filter(([name]) => name.startsWith('--color-')).map(([name, ot]) => [name.slice('--color-'.length), ot]))
    Object.keys(colors).filter((name) => name.startsWith('on-') && colors[name.slice(3)]).forEach((on) => {
      const base = on.slice(3)
      expect(colors[on], `${on} with ${base}`).toBe(colors[base].replace('--ot-color-', '--ot-color-on-'))
    })
    // shadcn's pairs: what each `-foreground` is drawn over
    const FOREGROUND = {
      primary: '--ot-color-on-primary',
      action: '--ot-color-primary-text', // the dashboard's link text: no `action` fill
      secondary: '--ot-color-text',
      muted: '--ot-color-text-muted',
      destructive: '--ot-color-on-danger',
      card: '--ot-color-text',
      popover: '--ot-color-text',
      accent: '--ot-color-primary-text'
    }
    Object.keys(colors).filter((name) => name.endsWith('-foreground')).forEach((name) => {
      const base = name.slice(0, -'-foreground'.length)
      expect(FOREGROUND, base).toHaveProperty(base)
      expect(colors[name], name).toBe(FOREGROUND[base])
    })
  })

  it('a Tailwind name taken by two different tokens throws', () => {
    const catalog = entries
    expect(() => tailwindLines(catalog, { canvas: '--ot-color-surface' })).toThrow(/--color-canvas is taken by/)
    expect(() => tailwindLines(catalog, { nope: '--ot-color-missing' })).toThrow(/is not in the catalog/)
  })
})

describe('tokens: the writer', () => {
  it('writes the whole catalog on :root, from the theme it is given', () => {
    const sheet = new ServerStyleSheet()
    renderToString(sheet.collectStyles(<ThemeProvider theme={square}><ThemeCssVariables /></ThemeProvider>))
    const css = sheet.getStyleTags()
    sheet.seal()
    expect(css).toMatch(/:root\{[^}]*--ot-color-primary:#3DDC84;/)
    expect(css).toContain('--ot-radius-md:0px;')
    expect(css).toContain('--ot-border-fixed-thin:1px;')
    // the dashboard's names are there too, each pointing to its runtime variable
    for (const [name, ot] of Object.entries(ALIASES)) expect(css).toContain(`${aliasVar(name)}:var(${ot});`)
  })
})
