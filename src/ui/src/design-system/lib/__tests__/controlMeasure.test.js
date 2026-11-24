import { describe, expect, it } from 'vitest'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../componentVars'
import { controlMeasureCss } from '../controlMeasure'

describe('controlMeasureCss: the font of a control\'s text, for a slot that measures it in ch', () => {
  it.each(THEMES.map(({ id, theme }) => [id, theme]))('is the font the Button / Input paints its text with (%s)', (_, theme) => {
    ;[['button', 'sm'], ['button', 'md'], ['button', 'lg'], ['input']].forEach(([component, size]) => {
      const vars = componentVars(theme, component, { size })
      const css = controlMeasureCss(theme, component, { size })
      expect(css).toContain(`font-family: ${vars[`--ui-${component}-text-family`]};`)
      expect(css).toContain(`font-size: ${vars[`--ui-${component}-text-size`]};`)
      expect(css).toContain(`font-weight: ${vars[`--ui-${component}-text-weight`]};`)
      expect(css).not.toContain('undefined')
    })
  })
})
