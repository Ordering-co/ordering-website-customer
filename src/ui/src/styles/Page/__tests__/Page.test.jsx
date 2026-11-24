import React from 'react'
import styled from 'styled-components'
import { describe, it, expect } from 'vitest'
import { PAGE_BOTTOM, pageContainerRules, pagePadding, pageTitleGap, pageTitleRules } from '../index'
import { OrderPageTitle, WrapperContainer } from '../../../components/OrderDetails/styles'
import { cssFor, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'

// A page with its own padding (base and wide screens), as the account pages had
const Page = styled.div`
  padding: 10px 15px;
  @media (min-width: 769px) { padding: 0 40px 40px; width: 70%; }
  ${props => pageContainerRules(props.theme)}
`
const Title = styled.h1`
  margin-bottom: 7px;
  ${props => pageTitleRules(props.theme)}
`

// A theme with a space xl these tests can tell apart (the page
// title's margin_bottom, section_header.variants.page, is {space.xl})
const xlTheme = (xl) => themeWithValues((values) => {
  values.tokens.space = { ...values.tokens.space, xl }
  values.components.section_header.variants.page = { ...values.components.section_header.variants.page, margin_bottom: xl }
  return values
})

describe('page box and title', () => {
  it('the box of the account pages, over the page\'s own (wide screens too)', () => {
    const theme = themeWithValues()
    const { getByText } = renderWith(theme, <Page><Title>Orders</Title></Page>)
    const css = cssFor(getByText('Orders').parentElement)
    // top tokens.space.xxl, sides tokens.layout.page_gutter
    const padding = `padding:${theme.values.tokens.space.xxl}px ${theme.values.tokens.layout.page_gutter}px ${PAGE_BOTTOM}px`
    expect(pagePadding(theme)).toBe(`${theme.values.tokens.space.xxl}px ${theme.values.tokens.layout.page_gutter}px ${PAGE_BOTTOM}px`)
    // base and restated inside the wide media rule
    expect(css.split(padding).length - 1).toBe(2)
    expect(css).toContain('width:75%')
    // the title's gap is the theme's xl, the space between the pages' sections
    expect(window.getComputedStyle(getByText('Orders')).marginBottom).toBe(`${theme.values.tokens.space.xl}px`)
  })

  it('the box follows tokens.space.xxl (top) and tokens.layout.page_gutter (sides)', () => {
    const theme = themeWithValues((values) => {
      values.tokens.space = { ...values.tokens.space, xxl: 40 }
      values.tokens.layout = { page_gutter: 12 }
      return values
    })
    const { getByText } = renderWith(theme, <Page><Title>Orders</Title></Page>)
    expect(getByText('Orders').parentElement).toHaveStyle({ paddingTop: '40px', paddingLeft: '12px', paddingRight: '12px', paddingBottom: `${PAGE_BOTTOM}px` })
  })

  it('the title\'s gap follows tokens.space.xl', () => {
    const theme = xlTheme(19)
    const { getByText } = renderWith(theme, <Page><Title>Orders</Title></Page>)
    expect(getByText('Orders')).toHaveStyle({ marginTop: '0px', marginBottom: '19px' })
    expect(pageTitleGap(theme)).toBe('19px')
  })

  it('the title\'s gap is section_header.variants.page.margin_bottom', () => {
    const theme = themeWithValues((values) => {
      values.components.section_header.variants.page = { ...values.components.section_header.variants.page, margin_bottom: 21 }
      return values
    })
    expect(pageTitleGap(theme)).toBe('21px')
  })
})

// The active order's page: its blocks are xl apart (the page's flex gap), the
// title one of them, so it takes no margin of its own (no double gap)
describe('the active order\'s title', () => {
  it('the title has no margin under it, the page\'s xl gap is its gap', () => {
    const theme = xlTheme(19)
    const { getByText } = renderWith(theme, (
      <WrapperContainer><OrderPageTitle>Order: #1</OrderPageTitle><div>card</div></WrapperContainer>
    ))
    const title = getByText('Order: #1')
    expect(title).toHaveStyle({ marginBottom: '0px' })
    expect(title.parentElement).toHaveStyle({ gap: '19px' })
  })
})
