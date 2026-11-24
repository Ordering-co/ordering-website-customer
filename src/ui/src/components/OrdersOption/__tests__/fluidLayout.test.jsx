import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessList } from '../PreviousBusinessOrdered/styles'
import { ProductsList } from '../PreviousProductsOrdered/styles'
import { ProductsList as ProfessionalsList } from '../PreviousProfessionalOrdered/styles'
import { ProductsListing, SkeletonButton, SkeletonReorder } from '../styles'

// implementation notesthe rails of "order it again" size their cards in relative units, no fixed px.
const css = (ui) => cssFor(renderWith(themeWithValues(), ui).container.firstChild)

describe('OrdersOption: fluid cards', () => {
  it('a business card of the carousel is a share of the row up to 36ch', () => {
    expect(css(<BusinessList horizontal />)).toMatch(/flex:\s*0 0 min\(85%,\s*36ch\)/)
  })

  it('a product card of the carousel is a share of the row up to 34ch; a vertical list keeps its width', () => {
    expect(css(<ProductsList horizontal />)).toMatch(/flex:\s*0 0 min\(85%,\s*34ch\) !important/)
    expect(css(<ProductsList />)).toMatch(/width:\s*auto !important/)
  })

  it('a professional card follows the row up to 38ch, 44ch from 480px', () => {
    const professionals = css(<ProfessionalsList />)
    expect(professionals).toMatch(/flex:\s*0 0 min\(85%,\s*38ch\)/)
    expect(professionals).toMatch(/flex-basis:\s*min\(85%,\s*44ch\)/)
  })

  it('the skeletons use the final measures: the button as a measure, the thumbnail as the 2xs media level', () => {
    expect(css(<SkeletonButton />)).toMatch(/width:\s*min\(100%,\s*34ch\)/)
    const reorder = css(<SkeletonReorder />)
    expect(reorder).toMatch(/width:\s*min\(100%,\s*9ch\)/)
    expect(reorder).toMatch(/width:\s*86px/)
    expect(css(<ProductsListing />)).toMatch(/width:\s*auto !important/)
  })
})
