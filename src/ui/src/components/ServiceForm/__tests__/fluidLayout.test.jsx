import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BookingAction, ButtonWrapper, EmptyProfessional, TimeListWrapper } from '../styles'

// implementation notesthe booking bar, the empty box and the times list use relative units.
const css = (ui) => cssFor(renderWith(themeWithValues(), ui).container.firstChild)

describe('ServiceForm: fluid sizes', () => {
  it('the action caps its width by the measure of text: 38ch, 25ch on a phone', () => {
    // the slot of each action carries the cap; the bar writes nothing over the Buttons
    const slot = css(<BookingAction />)
    expect(slot).toMatch(/max-width:\s*min\(100%,\s*38ch\)/)
    expect(slot).toMatch(/max-width:\s*min\(100%,\s*25ch\)/)
    expect(css(<BookingAction $soldout />)).toMatch(/pointer-events:\s*none/)
    expect(css(<BookingAction />)).not.toMatch(/pointer-events/)
    expect(css(<ButtonWrapper />)).not.toMatch(/button|ch\)/)
  })

  it('the box without a schedule is a multiple of the theme size, and the times list a share of the screen height', () => {
    const empty = css(<EmptyProfessional />)
    expect(empty).toMatch(/min-height:\s*calc\(1\.8 \* 56px\)/)
    expect(empty).toMatch(/margin-bottom:\s*calc\(1\.8 \* 56px\)/)
    expect(css(<TimeListWrapper />)).toMatch(/max-height:\s*30dvh/)
  })
})
