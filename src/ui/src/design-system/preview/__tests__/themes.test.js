import { describe, expect, it } from 'vitest'
import { contrast } from '@orderingco/ordering-theme-engine/colors'
import { getThemeCss } from '~/utils/themeCss'
import { SCHEMA } from '~/utils/themeSchema'
import { STORE_INPUTS, THEMES } from '../themes'

// the three store themes: they are the ones a person judges as a real store
const STORE_THEMES = THEMES.filter(({ id }) => !['defaults', 'typefaces'].includes(id))

const read = (object, path) => path.split('.').reduce((value, key) => value?.[key], object)

// [foreground, background] pairs: `c:` a token color, anything else a path in `components`
const TEXT = [
  ['c:text', 'c:background'], ['c:text', 'c:surface'], ['c:text', 'c:surface_alt'],
  ['c:text_muted', 'c:background'], ['c:text_muted', 'c:surface'], ['c:text_muted', 'c:surface_alt'],
  ['c:on_primary', 'c:primary'], ['c:on_primary', 'c:primary_pressed'],
  ['c:primary_text', 'c:background'], ['c:primary_text', 'c:surface'], ['c:primary_text', 'c:primary_subtle'],
  ['c:on_secondary', 'c:secondary'], ['c:on_success', 'c:success'], ['c:on_warning', 'c:warning'],
  ['c:on_danger', 'c:danger'], ['c:on_info', 'c:info'],
  ['c:success_text', 'c:background'], ['c:warning_text', 'c:background'], ['c:danger_text', 'c:background'],
  ['c:on_inverse', 'c:inverse_surface'],
  ['product_card.base.price_color', 'product_card.base.background'],
  ['product_modal.base.name_color', 'product_modal.base.header_background'],
  ['header.base.color', 'header.base.background'],
  ['button.variants.primary.outline.color', 'c:background'],
  ['button.variants.primary.tonal.color', 'button.variants.primary.tonal.background'],
  ['button.variants.secondary.solid.color', 'button.variants.secondary.solid.background'],
  ['input.base.text_color', 'input.base.background'],
  ['tabs.variants.pill.active', 'tabs.variants.pill.active_background']
]
// borders and the primary as a graphic (WCAG 1.4.11)
const CONTROL = [
  ['c:border_strong', 'c:background'], ['c:border_strong', 'c:surface'],
  ['c:primary', 'c:background'], ['c:primary', 'c:surface']
]

describe.each(STORE_THEMES)('the $id test theme', ({ id, theme }) => {
  const { tokens, components } = theme.values
  const color = (name) => (name.startsWith('c:') ? tokens.color[name.slice(2)] : read(components, name))

  it.each(TEXT)('text %s on %s is at least 4.5:1', (fg, bg) => {
    expect(color(fg), fg).toBeTruthy()
    expect(color(bg), bg).toBeTruthy()
    expect(contrast(color(fg), color(bg)), `${fg} ${color(fg)} on ${bg} ${color(bg)}`).toBeGreaterThanOrEqual(4.5)
  })

  it.each(CONTROL)('control %s on %s is at least 3:1', (fg, bg) => {
    expect(contrast(color(fg), color(bg)), `${fg} ${color(fg)} on ${bg} ${color(bg)}`).toBeGreaterThanOrEqual(3)
  })

  it('sets every base color of the schema and moves components.button and the header scope', () => {
    // a base color is one the schema does not derive from another
    const base = Object.entries(SCHEMA.tokens.color)
      .filter(([name, entry]) => !name.startsWith('$') && !entry.$extensions?.['co.ordering']?.derive)
      .map(([name]) => name)
    const values = STORE_INPUTS[id]
    expect(base.length).toBeGreaterThan(20)
    base.forEach((name) => expect(values.tokens.color[name], name).toBeTruthy())
    expect(values.components.button).toBeTruthy()
    expect(values.components.header.scope).toBeTruthy()
  })
})

describe.each(['grill', 'cafe'])('text field outlines in %s', (id) => {
  const { theme } = THEMES.find((entry) => entry.id === id)

  it.each(['input', 'search_bar'])('%s has at least 3:1 contrast between the border and surface', (component) => {
    const { border, background } = getThemeCss(theme, component).base
    const color = border.match(/#[\da-f]+$/i)?.[0]
    expect(contrast(color, background), `${border} against ${background}`).toBeGreaterThanOrEqual(3)
  })
})
