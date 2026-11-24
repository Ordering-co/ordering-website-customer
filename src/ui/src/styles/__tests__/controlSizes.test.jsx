import { describe, expect, it } from 'vitest'
import { DEFAULT_CONTROL_SIZE, themeControlHeight } from '../../../../utils/themeTokens'
import { themeWithValues } from './themeTestUtils'

// Every control's height comes from the theme's sizes (sm | md | lg, md by
// default): a button, a field and a chip of the same size line up.
describe('control sizes', () => {
  it('md by default: the button, the field, the tabs and the chip are as tall', () => {
    const theme = themeWithValues()
    const md = themeControlHeight(theme, 'button')
    expect(DEFAULT_CONTROL_SIZE).toBe('md')
    expect(md).toBe(40)
    expect(themeControlHeight(theme, 'input')).toBe(md)
    expect(themeControlHeight(theme, 'tabs')).toBe(md)
    expect(themeControlHeight(theme, 'chip')).toBe(md)
  })

  it('a chosen size is the same for every control', () => {
    const theme = themeWithValues()
    ;['sm', 'lg'].forEach((size) => {
      const height = themeControlHeight(theme, 'button', size)
      expect(themeControlHeight(theme, 'input', size)).toBe(height)
      expect(themeControlHeight(theme, 'chip', size)).toBe(height)
      expect(themeControlHeight(theme, 'choice', size)).toBe(height)
    })
  })

  it('a size the component lacks is its md', () => {
    expect(themeControlHeight(themeWithValues(), 'button', 'xl')).toBe(40)
  })
})
