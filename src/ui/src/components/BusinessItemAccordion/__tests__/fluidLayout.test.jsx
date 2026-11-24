import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { themeSpace } from '~/utils/themeTokens'
import { AccordionSection, BusinessInfo, PriceContainer } from '../styles'

const flat = (css) => css.replace(/\s+/g, '')

// implementation notesthe title's room and the action's floor have no fixed px.
describe('BusinessItemAccordion fluid layout', () => {
  it('the title keeps the sm size of the theme for the actions, two lg sizes with metadata', () => {
    const plain = renderWith(themeWithValues(), <BusinessInfo>a</BusinessInfo>)
    expect(flat(cssFor(plain.getByText('a')))).toContain('width:calc(100%-32px)')
    const other = renderWith(themeWithValues(), <BusinessInfo isOtherInfo>b</BusinessInfo>)
    expect(flat(cssFor(other.getByText('b')))).toContain('width:calc(100%-2*48px)')
  })

  it('the checkout action has a floor in ch', () => {
    const { getByText } = renderWith(themeWithValues(), <PriceContainer>price</PriceContainer>)
    const css = flat(cssFor(getByText('price')))
    expect(css).toContain('min-width:18ch')
    expect(css).not.toContain('150px')
  })

  // implementation notesa sticky footer in a modal or drawer reaches the edge of the body, not the edge of its padding
  // (Dialog and Sheet publish that padding as --layer-pad-bottom; where nothing does, it is 0 and nothing changes).
  describe('the sticky footer and the body\'s padding', () => {
    const theme = themeWithValues()
    const xs = themeSpace(theme, 'xs')
    const md = themeSpace(theme, 'md')

    it('pins to the edge by the layer\'s padding and grows its own by it, so it paints the strip', () => {
      const { getByText } = renderWith(theme, <PriceContainer isStickyFooter>price</PriceContainer>)
      const css = flat(cssFor(getByText('price')))
      expect(css).toContain('position:sticky')
      expect(css).toContain('bottom:calc(-1*var(--layer-pad-bottom,0px))')
      expect(css).toContain(`padding-bottom:calc(${xs}+var(--layer-pad-bottom,0px))`)
      // no margin of its own: the section is what takes the padding back at the end of the list
      expect(css).not.toMatch(/margin-bottom/)
      expect(css).not.toContain('bottom:0')
    })

    it('a footer that is not sticky does not read the variable', () => {
      const { getByText } = renderWith(theme, <PriceContainer>price</PriceContainer>)
      expect(cssFor(getByText('price'))).not.toContain('--layer-pad-bottom')
    })

    it('the last cart of the list takes the padding back from its section margin, and keeps its md where no layer says it', () => {
      const { getByText } = renderWith(theme, <AccordionSection isStickyFooter $hasStickyFooter>section</AccordionSection>)
      const css = flat(cssFor(getByText('section')))
      // only the last cart (.cart:last-child), only this instance (its own class twice, not the component's)
      expect(css).toMatch(new RegExp(String.raw`\.cart:last-child\.(\w+)\.\1:last-child\{margin-bottom:calc\(-1\*var\(--layer-pad-bottom,calc\(-1\*${md}\)\)\)`))
      // the md the section always had is still its own rule
      expect(css).toContain(`:last-child{border-bottom:0;margin-bottom:${md};`)
    })

    it('a section without a sticky footer is left as it was', () => {
      const { getByText } = renderWith(theme, <AccordionSection isStickyFooter>section</AccordionSection>)
      expect(cssFor(getByText('section'))).not.toContain('--layer-pad-bottom')
    })
  })
})
