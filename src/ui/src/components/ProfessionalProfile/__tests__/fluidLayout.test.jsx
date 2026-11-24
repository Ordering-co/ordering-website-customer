import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BookAction, ButtonWrapper } from '../styles'

describe('ProfessionalProfile: fluid action cap', () => {
  it('the Book action caps its width by the measure of text: 38ch, 25ch on a phone', () => {
    // the slot of the action carries the cap; the bar writes nothing over the Button
    const slot = cssFor(renderWith(themeWithValues(), <BookAction />).container.firstChild)
    expect(slot).toMatch(/max-width:\s*min\(100%,\s*38ch\)/)
    expect(slot).toMatch(/max-width:\s*min\(100%,\s*25ch\)/)
    expect(cssFor(renderWith(themeWithValues(), <ButtonWrapper data-testid='bar' />).getByTestId('bar'))).not.toMatch(/button|ch\)/)
  })
})
