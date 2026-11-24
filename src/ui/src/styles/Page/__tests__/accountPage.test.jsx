import React from 'react'
import styled from 'styled-components'
import { describe, it, expect } from 'vitest'
import { ACCOUNT_PAGE, PAGE_BOTTOM, PAGE_WIDTH, pageContainerRules, pagePadding, pageTitleGap, pageTitleRules, pageWidth } from '../index'
import { cssFor, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'

// The box of the account pages from components.account_page; the title of
// every page from components.section_header (its page variant)
const AccountPage = styled.div`
  padding: 10px;
  ${props => pageContainerRules(props.theme, ACCOUNT_PAGE)}
`
const AccountTitle = styled.h1`
  margin-bottom: 7px;
  ${props => pageTitleRules(props.theme)}
`
// A page that is not an account page (the order, a CMS page)
const OtherPage = styled.div`
  ${props => pageContainerRules(props.theme)}
`

const ACCOUNT = {
  width: 60,
  padding_top: 11,
  padding_bottom: 13
}
// The page variant's text and gap; its color and alignment are the base's
const PAGE_TITLE = {
  title: { size: 27, line: 1.3, weight: 800 },
  margin_bottom: 17
}
const TITLE_BASE = {
  title_color: '#0A0B0C',
  align: 'center'
}
const themed = () => themeWithValues((values) => {
  values.components.account_page.base = { ...values.components.account_page.base, ...ACCOUNT }
  values.components.section_header.base = { ...values.components.section_header.base, ...TITLE_BASE }
  values.components.section_header.variants.page = { ...values.components.section_header.variants.page, ...PAGE_TITLE }
  return values
})

describe('components.account_page', () => {
  it('the box of the account pages (width from 769px, top and bottom space)', () => {
    const theme = themed()
    const gutter = theme.values.tokens.layout.page_gutter
    expect(pagePadding(theme, ACCOUNT_PAGE)).toBe(`11px ${gutter}px 13px`)
    expect(pageWidth(theme, ACCOUNT_PAGE)).toBe('60%')
    const { getByText } = renderWith(theme, <AccountPage><AccountTitle>Orders</AccountTitle></AccountPage>)
    const css = cssFor(getByText('Orders').parentElement).replace(/\s+/g, '')
    expect(css).toContain(`padding:11px${gutter}px13px`)
    expect(css).toMatch(/@media\(min-width:769px\)\{[^}]*width:60%;/)
  })

  it('the page title from section_header.variants.page (text, gap) over its base (color, alignment)', () => {
    const theme = themed()
    expect(pageTitleGap(theme)).toBe('17px')
    const { getByText } = renderWith(theme, <AccountPage><AccountTitle>Orders</AccountTitle></AccountPage>)
    expect(getByText('Orders')).toHaveStyle({ fontSize: '27px', lineHeight: '1.3', fontWeight: '800', color: '#0A0B0C', marginBottom: '17px', textAlign: 'center' })
  })

  it('the schema defaults: the box of today, its top and bottom the xxl space, its title the h1', () => {
    const theme = themeWithValues()
    const { xxl, xl } = theme.values.tokens.space
    expect(pagePadding(theme, ACCOUNT_PAGE)).toBe(`${xxl}px ${theme.values.tokens.layout.page_gutter}px ${xxl}px`)
    expect(pageWidth(theme, ACCOUNT_PAGE)).toBe(`${PAGE_WIDTH}%`)
    const { getByText } = renderWith(theme, <AccountPage><AccountTitle>Orders</AccountTitle></AccountPage>)
    const h1 = theme.values.tokens.typography.h1
    expect(getByText('Orders')).toHaveStyle({ fontSize: `${h1.size}px`, marginBottom: `${xl}px`, textAlign: 'start', color: theme.values.tokens.color.text })
  })

  it('a page that is not an account page keeps the shared box (not components.account_page)', () => {
    const theme = themed()
    expect(pagePadding(theme)).toBe(`${theme.values.tokens.space.xxl}px ${theme.values.tokens.layout.page_gutter}px ${PAGE_BOTTOM}px`)
    const { container } = renderWith(theme, <OtherPage>x</OtherPage>)
    expect(cssFor(container.firstChild).replace(/\s+/g, '')).toContain(`width:${PAGE_WIDTH}%`)
  })

  it('a value the theme cannot use: the width clamped to its range, the start alignment', () => {
    const theme = themeWithValues((values) => {
      values.components.account_page.base = { width: 140 }
      values.components.section_header.base = { ...values.components.section_header.base, align: 'justify' }
      return values
    })
    expect(pageWidth(theme, ACCOUNT_PAGE)).toBe('100%')
    const { getByText } = renderWith(theme, <AccountTitle>Orders</AccountTitle>)
    expect(getByText('Orders')).toHaveStyle({ textAlign: 'start' })
  })
})
