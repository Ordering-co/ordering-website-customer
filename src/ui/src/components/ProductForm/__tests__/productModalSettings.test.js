import { describe, expect, it } from 'vitest'
import { defaultTheme } from '../../../styles/__tests__/themeTestUtils'
import { withModalBase } from './productModalTheme'
import { missingChoicesMode, productModalLayout } from '../productModalSettings'

const withBase = (base) => withModalBase(defaultTheme, base)

describe('product modal settings', () => {
  it('a theme without the settings is jump and card', () => {
    expect(missingChoicesMode(defaultTheme)).toBe('jump')
    expect(productModalLayout(defaultTheme)).toBe('card')
  })

  it('reads each value the theme forces', () => {
    expect(missingChoicesMode(withBase({ missing_choices: 'guide' }))).toBe('guide')
    expect(missingChoicesMode(withBase({ missing_choices: 'jump' }))).toBe('jump')
    expect(productModalLayout(withBase({ layout: 'card' }))).toBe('card')
    expect(productModalLayout(withBase({ layout: 'showcase' }))).toBe('showcase')
    expect(productModalLayout(withBase({ layout: 'steps' }))).toBe('steps')
    expect(productModalLayout(withBase({ layout: 'sheet' }))).toBe('sheet')
  })

  it('a value it does not know falls to the default', () => {
    expect(missingChoicesMode(withBase({ missing_choices: 'banner' }))).toBe('jump')
    expect(missingChoicesMode(withBase({ missing_choices: null }))).toBe('jump')
    expect(productModalLayout(withBase({ layout: 'wizard' }))).toBe('card')
  })
})
