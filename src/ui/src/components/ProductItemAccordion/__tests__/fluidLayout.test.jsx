import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { ContentInfo, ScheduleInfoWrapper, WrapperProductImage } from '../styles'

// implementation notesthe line's boxes come from the media scale and the sizes of the theme, not a fixed px.
const css = (ui) => cssFor(renderWith(themeWithValues(), ui).container.firstChild)

describe('ProductItemAccordion: sizes of the theme', () => {
  it('the photo box is the xs media level (100px)', () => {
    const photo = css(<WrapperProductImage hideQuantitySelector />)
    for (const property of ['width', 'height', 'max-width', 'max-height']) expect(photo).toMatch(new RegExp(`${property}:\\s*100px`))
    expect(photo).not.toMatch(/95px/)
  })

  it('the info column and the schedule data reserve room in sizes of the theme', () => {
    expect(css(<ContentInfo />)).toMatch(/width:\s*calc\(65% - 56px\)/)
    expect(css(<ScheduleInfoWrapper />)).toMatch(/width:\s*calc\(100% - 56px - 8px\)/)
  })
})
