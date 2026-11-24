import { describe, it, expect } from 'vitest'
import { resolve } from '@orderingco/ordering-theme-engine'
import { complete } from '@orderingco/ordering-theme-engine/runtime'
import { contrast } from '@orderingco/ordering-theme-engine/colors'
import SCHEMA from '../../../product.schema.json'
import COMPILED from '../../theme.compiled.json'

// A dotted path into a resolved/completed theme. Fails loudly (not
// silently NaN) when a step is missing, so a renamed or removed path
// fails the test instead of being skipped.
const at = (theme, path) => path.split('.').reduce((node, key) => {
  if (node === undefined || node === null || !(key in node)) {
    throw new Error(`missing path "${path}" at "${key}"`)
  }
  return node[key]
}, theme)

// Every spot that paints primary_text (or a derived-from-it color) over its
// own background: the pair must stay legible whatever primary is.
const TEXT_PAIRS = [
  ['tabs.variants.pill.active', 'components.tabs.variants.pill.active', 'components.tabs.variants.pill.active_background'],
  ['date_strip.base.selected_color', 'components.date_strip.base.selected_color', 'components.date_strip.base.selected_background'],
  ['steps active state', 'components.steps.variants.default.states.active.color', 'components.steps.variants.default.states.active.background'],
  ['order_card status', 'components.order_card.base.status_color', 'components.order_card.variants.default.states.active.background'],
  ['button primary tonal', 'components.button.variants.primary.tonal.color', 'components.button.variants.primary.tonal.background'],
  ['choice selected (schema color)', 'components.choice.variants.default.states.selected.color', 'components.choice.variants.default.states.selected.background'],
  // TimeChoice and the order-type menu's check paint primary_text over the selected fill
  ['primary_text on choice selected', 'tokens.color.primary_text', 'components.choice.variants.default.states.selected.background'],
  ['primary_text on menu item_selected', 'tokens.color.primary_text', 'components.menu.base.item_selected'],
  ['primary_text on background', 'tokens.color.primary_text', 'tokens.color.background'],
  ['primary_text on surface', 'tokens.color.primary_text', 'tokens.color.surface']
]

// Non-text (border) pairs only need 3:1 (WCAG non-text contrast), and only
// matter for the schema's own default primary.
const NON_TEXT_PAIRS = [
  ['choice selected border', 'components.choice.variants.default.states.selected.border.color', 'components.choice.variants.default.states.selected.background'],
  ['steps active border', 'components.steps.variants.default.states.active.border.color', 'components.steps.variants.default.states.active.background']
]

const PRIMARIES = [null, '#4DA3FF', '#0B3D91', '#FFB800', '#E63946']

describe('primary_text stays AA (4.5:1) wherever it paints, for any primary', () => {
  PRIMARIES.forEach((primary) => {
    it(`resolve(): ${primary ?? 'default'}`, () => {
      const theme = resolve(SCHEMA, primary ? { tokens: { color: { primary } } } : null)
      TEXT_PAIRS.forEach(([name, colorPath, bgPath]) => {
        expect(contrast(at(theme, colorPath), at(theme, bgPath)), name).toBeGreaterThanOrEqual(4.5)
      })
    })
  })

  it('resolve(): the default also keeps 3:1 on its non-text (border) pairs', () => {
    const theme = resolve(SCHEMA, null)
    NON_TEXT_PAIRS.forEach(([name, colorPath, bgPath]) => {
      expect(contrast(at(theme, colorPath), at(theme, bgPath)), name).toBeGreaterThanOrEqual(3)
    })
  })

  it('complete() of the compiled schema matches: the committed src/theme.compiled.json default is correct', () => {
    const theme = complete(COMPILED, null)
    TEXT_PAIRS.forEach(([name, colorPath, bgPath]) => {
      expect(contrast(at(theme, colorPath), at(theme, bgPath)), name).toBeGreaterThanOrEqual(4.5)
    })
  })
})
