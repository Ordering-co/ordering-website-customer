import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { RevervationContainer } from '../../BusinessReservation/styles'
import { BusinessSections } from '../styles'
import { CardContainer, CardInfo } from '../../SingleProductCard/styles'
import { SearchIconWrapper } from '../../BusinessBasicInformation/styles'
import { ProductName } from '../../ProductForm/styles'
import { ReviewsHeaderWrapper } from '../../BusinessReviews/styles'
import { SocialNetWork } from '../../BusinessBasicInformation/SocialNetWork'

vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (key, fallback) => fallback]
}))

// Second review of the business page with the theme: the space between its
// sections, the product cards' favorite and carousels, and the names and
// heading levels of its controls.

const tight = (css) => css.replace(/\s+/g, '')

// The CSS rules of the element's own generated class (its last one)
const rulesOf = (el) => {
  const cls = [...el.classList].filter((name) => /^[a-zA-Z]{5,}$/.test(name) && !name.includes('-')).pop()
  return tight(injectedCss().split('}').filter((rule) => rule.includes(`.${cls}`)).join('}'))
}

describe('business page: the space between its sections (pages.business, group main)', () => {
  it('each section the theme\'s xl space under it (collapsing margins, any order)', () => {
    renderWith(themeWithValues(), <BusinessSections data-testid='sections'><div /></BusinessSections>)
    expect(rulesOf(screen.getByTestId('sections'))).toContain('>*{margin-bottom:24px;')
  })

  it('the xl of the theme', () => {
    const theme = themeWithValues((values) => {
      values.tokens.space.xl = 40
      return values
    })
    renderWith(theme, <BusinessSections data-testid='sections'><div /></BusinessSections>)
    expect(rulesOf(screen.getByTestId('sections'))).toContain('>*{margin-bottom:40px;')
  })

  it('the reviews title has no space of its own above it on the page (the modal keeps its own)', () => {
    renderWith(themeWithValues(), <ReviewsHeaderWrapper data-testid='page'><h2>Reviews</h2></ReviewsHeaderWrapper>)
    expect(rulesOf(screen.getByTestId('page'))).toContain('h2{margin-top:0;')
  })

  it('the reviews title on the page is a section title (components.section_header)', () => {
    const theme = themeWithValues((values) => {
      values.components.section_header.base = { ...values.components.section_header.base, title_color: '#0B0C0D' }
      return values
    })
    renderWith(theme, <ReviewsHeaderWrapper data-testid='titled'><h2>Reviews</h2></ReviewsHeaderWrapper>)
    expect(rulesOf(screen.getByTestId('titled'))).toMatch(new RegExp(`h2\\{margin-top:0;[^}]*font-size:${theme.values.tokens.typography.h2.size}px;[^}]*color:#0B0C0D;`))
  })
})

describe('product card (product_card, favorite, product_section)', () => {
  it('the card\'s favorite is drawn by components.favorite, not restyled by the card', () => {
    renderWith(themeWithValues(), <CardInfo data-testid='info' />)
    const css = rulesOf(screen.getByTestId('info'))
    expect(css).not.toMatch(/\.favorite-icon[\s{]/)
  })

  it('the Add action spans the card and the favorite keeps its size', () => {
    renderWith(themeWithValues(), <CardContainer data-testid='card' />)
    expect(rulesOf(screen.getByTestId('card'))).toMatch(/\.add-button,[^{}]*\.order-button\{display:block;width:100%;/)
  })

  it('the cards of a carousel apart by the section\'s gap (product_section.base.gap)', () => {
    const theme = themeWithValues((values) => {
      values.components.product_section.base.gap = 20
      return values
    })
    renderWith(theme, <CardContainer data-testid='card' isFeatured />)
    expect(rulesOf(screen.getByTestId('card'))).toContain('margin-inline-end:20px;')
  })
})

describe('names and heading levels', () => {
  it('the product search opener is a button', () => {
    renderWith(themeWithValues(), <SearchIconWrapper aria-label='Search Products' data-testid='themed' />)
    expect(screen.getByTestId('themed').tagName).toBe('BUTTON')
    expect(screen.getByTestId('themed')).toHaveAttribute('type', 'button')
  })

  it('the product\'s name is the window\'s h2', () => {
    renderWith(themeWithValues(), <ProductName data-testid='themed'>Burger</ProductName>)
    expect(screen.getByTestId('themed').tagName).toBe('H2')
  })

  it('a social link is named by its network', () => {
    renderWith(themeWithValues(), <SocialNetWork url='https://facebook.com/x' icon={<svg />} label='Facebook' />)
    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://facebook.com/x')
  })

  // (the product's copy link is a Button of the design system now: ProductShare.test.jsx)
})

it('leaves the width of reservation buttons to the action and its piece', () => {
  renderWith(themeWithValues(), <RevervationContainer data-testid='reservation' />)
  expect(rulesOf(screen.getByTestId('reservation'))).not.toMatch(/button\{[^}]*width:/)
})
