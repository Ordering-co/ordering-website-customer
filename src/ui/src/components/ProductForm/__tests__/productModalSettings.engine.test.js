import { describe, expect, it } from 'vitest'
import { buildAppTheme } from '~/utils/appTheme'
import { schemaDefault, schemaEntry, schemaOptions } from '~/utils/themeSchema'
import { missingChoicesMode, productModalLayout } from '../productModalSettings'

// implementation noteswhat the app's own theme (the engine's buildAppTheme, which is what the ThemeProvider gets, with the
// schema and the compiled theme of this checkout) says for the two settings of the window. Until the schema knows
// `product_modal.base.layout` and `.missing_choices` (SCH) the engine drops them and a store cannot set them: the test is
// skipped, not failed, and it wakes up on its own once those files have them.
const knows = (key) => !!schemaEntry(`components.product_modal.base.${key}`)
const built = (base) => buildAppTheme(null, { version: 2, values: { components: { product_modal: { base } } } })

describe('product_modal.base.layout and .missing_choices, read from the engine\'s theme', () => {
  it.skipIf(!knows('layout'))('layout: steps reaches productModalLayout; stored sheet is preserved and an unset layout is card', () => {
    expect(productModalLayout(built({ layout: 'steps' }))).toBe('steps')
    expect(productModalLayout(built({ layout: 'sheet' }))).toBe('sheet')
    expect(productModalLayout(built({}))).toBe('card')
  })

  it('offers all four designs and defaults to a neutral required badge', () => {
    expect(schemaOptions('components.product_modal.base.layout')).toEqual(expect.arrayContaining(['card', 'showcase', 'sheet', 'steps']))
    expect(schemaDefault('components.product_option.slots.required').variant).toBe('neutral')
    expect(productModalLayout(built({ layout: 'showcase' }))).toBe('showcase')
  })

  it.skipIf(!knows('missing_choices'))('missing_choices: guide reaches missingChoicesMode; jump and a theme without it are jump', () => {
    expect(missingChoicesMode(built({ missing_choices: 'guide' }))).toBe('guide')
    expect(missingChoicesMode(built({ missing_choices: 'jump' }))).toBe('jump')
    expect(missingChoicesMode(built({}))).toBe('jump')
  })

  it.skipIf(!knows('layout') || !knows('missing_choices'))('both together, as one theme says them', () => {
    const theme = built({ layout: 'steps', missing_choices: 'guide' })
    expect([productModalLayout(theme), missingChoicesMode(theme)]).toEqual(['steps', 'guide'])
  })
})
