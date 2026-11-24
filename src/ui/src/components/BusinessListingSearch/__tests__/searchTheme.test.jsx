import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import {
  BusinessBanner,
  BusinessList,
  BusinessListWrapper,
  BusinessListingSearchContainer,
  BusinessLogo,
  ButtonContainer,
  ResultsAction,
  Description,
  HightestRatedWrapper,
  MapWrapper,
  PriceFilterListWrapper,
  ResetLink
} from '../styles'
import { SearchTypeContainer } from '../../BusinessTypeFilter/styles'

const theme = themeWithValues((values) => {
  values.tokens.layout.page_gutter = 28
  values.tokens.space.sm = 6
  values.tokens.space.lg = 18
  values.tokens.color.text_muted = '#5A5A5A'
  values.components.modal.base.actions_gap = 34
  values.components.modal.base.actions_spacing = 14
  values.components.product_search.base.logo_size = 64
  values.components.slider.base.animated = true
  values.components.slider.base.speed = 150
  return values
})
const tight = (css) => css.replace(/\s+/g, '')

describe('/business_search takes its spacing from the theme', () => {
  it('the page pads with the page gutter; the full-bleed blocks undo it', () => {
    const page = tight(cssFor(renderWith(theme, <BusinessListingSearchContainer data-testid='p' />).getByTestId('p')))
    expect(page).toContain('padding:28px;')
    expect(page).not.toMatch(/padding:20px|h3\{/)
    const map = tight(cssFor(renderWith(theme, <BusinessListingSearchContainer isShowMap data-testid='m' />).getByTestId('m')))
    expect(map).toContain('padding:028px;')
    const banner = tight(cssFor(renderWith(theme, <BusinessBanner data-testid='b' />).getByTestId('b')))
    expect(banner).toContain('margin-top:-28px;margin-left:-28px;margin-right:-28px;')
    expect(tight(cssFor(renderWith(theme, <HightestRatedWrapper data-testid='h' />).getByTestId('h')))).toContain('margin:0-28px;')
  })

  it('the cards\' list cancels their side space (space.lg); the map\'s list keeps no scrollbar of its own', () => {
    renderWith(theme, <BusinessListWrapper data-testid='w'><BusinessList /></BusinessListWrapper>)
    expect(tight(injectedCss())).toContain('{margin:0-18px;}')
    renderWith(theme, <BusinessListWrapper isShowMap data-testid='m' />)
    expect(injectedCss()).not.toContain('::-webkit-scrollbar')
  })

  it('the chips of the price and category filters are one row layout, space.sm apart, no icon margins of their own', () => {
    const price = tight(cssFor(renderWith(theme, <PriceFilterListWrapper data-testid='p' />).getByTestId('p')))
    const types = tight(cssFor(renderWith(theme, <SearchTypeContainer isSearchMode data-testid='t' />).getByTestId('t')))
    ;[price, types].forEach((css) => {
      expect(css).toContain('flex-wrap:wrap;gap:6px;')
      expect(css).toContain('justify-content:flex-start;')
      expect(css).not.toMatch(/svg\{margin/)
    })
  })

  it('the filter modal: its actions take the modal\'s actions_gap and actions_spacing, no transition', () => {
    const actions = tight(cssFor(renderWith(theme, <ButtonContainer data-testid='a' />).getByTestId('a')))
    expect(actions).toContain('margin-top:34px;')
    expect(actions).not.toContain('transition:all')
    const reset = renderWith(theme, <ResetLink data-testid='r'>Reset</ResetLink>).getByTestId('r')
    expect(reset).toHaveStyle({ marginTop: '14px' })
    // the Button's own width: the container writes none over it
    expect(reset.style.width).toBe('')
    expect(actions).not.toMatch(/button/)
    expect(reset).toHaveAttribute('type', 'button')
  })

  it('the filter\'s description is secondary text, no weight of its own', () => {
    const el = renderWith(theme, <Description>d</Description>).getByText('d')
    expect(el).toHaveStyle({ color: '#5A5A5A' })
    expect(tight(cssFor(el))).not.toContain('font-weight')
  })

  it('the logo of the product results and its skeleton take product_search.logo_size', () => {
    const logo = renderWith(theme, <BusinessLogo isSkeleton data-testid='l'><span /></BusinessLogo>).getByTestId('l')
    const css = tight(cssFor(logo))
    expect(css).toMatch(/@media\(min-width:576px\)\{[^}]*\}[^{]*span\{width:64px;min-width:64px;height:64px;min-height:64px;/)
    expect(css).not.toMatch(/45px|75px/)
  })

  it('its measures are fluid: the map, the action under the filters and the brands list', () => {
    const map = tight(cssFor(renderWith(theme, <MapWrapper data-testid='m' />).getByTestId('m')))
    expect(map).toContain('height:60dvh;')
    expect(map).not.toContain('500px')
    const action = tight(cssFor(renderWith(theme, <ResultsAction data-testid='b' />).getByTestId('b')))
    expect(action).toContain('max-width:min(100%,54ch)')
    expect(action).not.toContain('430px')
  })

  it('the map: the card\'s look on its own, the divider beside the list (no shadow or border of its own)', () => {
    const css = tight(cssFor(renderWith(theme, <MapWrapper data-testid='m' />).getByTestId('m')))
    expect(css).not.toContain('rgba(0,0,0,0.08)')
    expect(css.match(/border-left:/g)).toHaveLength(1)
  })
})
