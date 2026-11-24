import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { HighestRated } from '../index'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessList } from '../styles'
import { ContainerCard } from '../../BusinessController/styles'

vi.mock('~ui/src/components/BusinessController', () => ({
  BusinessController: ({ business, nameAs, withLogoAndFavorite, onPreorderBusiness }) => (
    <div data-testid='business-card' data-name-as={nameAs} data-logo-favorite={String(!!withLogoAndFavorite)}>
      {business?.name}
      <button type='button' data-testid='preorder' onClick={() => onPreorderBusiness?.(business)} />
    </div>
  )
}))
vi.mock('~ui/src/components/BusinessPreorder', () => ({
  BusinessPreorder: () => null
}))
vi.mock('~ui/src/components/AutoScroll', () => ({
  AutoScroll: ({ children }) => <div>{children}</div>
}))

const businessesList = vi.hoisted(() => ({
  current: {
    loading: false,
    error: null,
    businesses: [{ id: 1, name: 'Top Rated Cafe', reviews: { total: 4.8 }, favorite: false }]
  }
}))

vi.mock('~components/components/BusinessList', () => ({
  BusinessList: ({ UIComponent, ...rest }) => (
    <UIComponent
      businessesList={businessesList.current}
      handleBusinessClick={vi.fn()}
      favoriteIds={[]}
      setFavoriteIds={vi.fn()}
      {...rest}
    />
  )
}))

describe('HighestRated', () => {
  beforeEach(() => {
    businessesList.current = {
      loading: false,
      error: null,
      businesses: [{ id: 1, name: 'Top Rated Cafe', reviews: { total: 4.8 }, favorite: false }]
    }
  })

  it('keeps the loading carousel skeleton out of the listing heading order', () => {
    businessesList.current = { loading: true, error: null, businesses: [] }
    const view = renderWithProviders(<HighestRated onVisibleChange={vi.fn()} />)
    expect(view.queryByRole('heading')).toBeNull()
  })

  it('its cards\' names one heading level under its title (h2 under an h1, h3 under an h2)', () => {
    const asH1 = renderWithProviders(<HighestRated titleAs='h1' />)
    expect(asH1.getByTestId('business-card')).toHaveAttribute('data-name-as', 'h2')
    asH1.unmount()
    const asH2 = renderWithProviders(<HighestRated />)
    expect(asH2.getByTestId('business-card')).toHaveAttribute('data-name-as', 'h3')
  })

  it('its cards take the card\'s logo and favorite (business_card.logo / .favorite, A8)', () => {
    const { getByTestId } = renderWithProviders(<HighestRated />)
    expect(getByTestId('business-card')).toHaveAttribute('data-logo-favorite', 'true')
  })

  it('a preorder card opens BusinessPreorder in the base dialog; its close closes it', async () => {
    const { getByTestId, findByRole, queryByRole } = renderWithProviders(<HighestRated />)
    fireEvent.click(getByTestId('preorder'))
    const dialog = await findByRole('dialog')
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  it('renders highest rated businesses', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <HighestRated title='Highest rated' />
    )
    expect(getByText('Highest rated')).toBeInTheDocument()
    expect(getByTestId('business-card')).toHaveTextContent('Top Rated Cafe')
  })

  it('its title and description are a section header (section_header; h1: the page variant)', () => {
    const theme = themeWithValues((values) => {
      values.components.section_header.base = { ...values.components.section_header.base, title: { size: 22, line: 1.36, weight: 700 }, title_color: '#111111', description: { size: 12, line: 1.33, weight: 400 }, description_color: '#222222', gap: 6, margin_bottom: 10 }
      values.components.section_header.variants.page.title = { size: 34, line: 1.24, weight: 700 }
      values.components.section_header.variants.page.margin_bottom = 18
      return values
    })
    const h2 = renderWithProviders(<HighestRated title='Highest rated' />, { theme })
    expect(h2.getByText('Highest rated')).toHaveStyle({ fontSize: '22px', color: '#111111', marginBottom: '10px' })
    h2.unmount()
    const h1 = renderWithProviders(<HighestRated title='Top' titleAs='h1' description='Sponsored' />, { theme })
    const title = h1.getByText('Top')
    expect(title.tagName).toBe('H1')
    expect(title).toHaveStyle({ fontSize: '34px', marginBottom: '0px' })
    // the page variant's space under the header
    expect(h1.getByText('Sponsored')).toHaveStyle({ fontSize: '12px', color: '#222222', marginTop: '6px', marginBottom: '18px' })
    expect(cssFor(title)).toContain('color:#111111')
  })

  it('its cards keep the width of a card of the listing\'s grid, a share of the track (business_listing_page.base.rows)', () => {
    const theme = themeWithValues((values) => {
      values.tokens.space.lg = 16
      values.components.business_listing_page.base.rows = 3
      return values
    })
    const { getByTestId } = renderWith(theme, <BusinessList data-testid='list'><ContainerCard /></BusinessList>)
    const rules = cssFor(getByTestId('list'))
    expect(rules).toContain('flex-shrink:0')
    expect(rules).toContain('width:calc(85cqw - 2 * 16px)')
    // three cards a row on the widest screens, as the grid
    expect(rules).toContain('width:calc(33.33cqw - 2 * 16px)')
    expect(rules).not.toContain('25cqw')
    // the first and the last card at the page's side space (tokens.layout.page_gutter)
    expect(rules).toMatch(/:first-of-type\{margin-left:20px;/)
    expect(rules).toMatch(/:last-of-type\{margin-right:20px;/)
  })
})
