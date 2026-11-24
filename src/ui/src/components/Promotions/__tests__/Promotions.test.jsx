import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { themeImage } from '../../../../../utils/themeTokens'
import { Promotions } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children, onClose }) => (
    open
      ? (
        <div data-testid='modal'>
          <button type='button' data-testid='modal-close' onClick={onClose}>x</button>
          {children}
        </div>
        )
      : null
  )
}))
vi.mock('~ui/src/components/SearchBar', () => ({
  SearchBar: ({ placeholder, onSearch }) => (
    <input data-testid='search' placeholder={placeholder} onChange={(e) => onSearch?.(e.target.value)} />
  )
}))
vi.mock('~ui/src/components/NotFoundSource', () => ({
  NotFoundSource: ({ content }) => <div data-testid='not-found'>{content}</div>
}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{
    parseDate: () => 'Jan 1',
    parsePrice: (v) => `$${v}`,
    optimizeImage: (url) => url
  }]
}))

const emit = vi.hoisted(() => vi.fn())
vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [{ emit, on: vi.fn(), off: vi.fn() }]
}))

const offersState = vi.hoisted(() => ({
  current: {
    loading: false,
    error: null,
    offers: [{
      id: 1,
      name: 'Summer Deal',
      description: '10% off',
      type: 2,
      coupon: 'SUMMER',
      target: 1,
      rate_type: 1,
      rate: 10,
      end: '2026-12-01',
      businesses: [{ id: 1, name: 'Cafe', slug: 'cafe', logo: '' }]
    }]
  }
}))

const handleSearchValue = vi.hoisted(() => vi.fn())
const setOfferSelected = vi.hoisted(() => vi.fn())

vi.mock('~components/components/PromotionsController', () => ({
  PromotionsController: ({ UIComponent, ...rest }) => (
    <UIComponent
      offersState={offersState.current}
      handleSearchValue={handleSearchValue}
      searchValue=''
      offerSelected={offersState.current.offers?.[0] || null}
      setOfferSelected={setOfferSelected}
      {...rest}
    />
  )
}))

describe('Promotions', () => {
  beforeEach(() => {
    handleSearchValue.mockClear()
    setOfferSelected.mockClear()
    emit.mockClear()
    offersState.current = {
      loading: false,
      error: null,
      offers: [{
        id: 1,
        name: 'Summer Deal',
        description: '10% off',
        type: 2,
        coupon: 'SUMMER',
        target: 1,
        rate_type: 1,
        rate: 10,
        end: '2026-12-01',
        businesses: [{ id: 1, name: 'Cafe', slug: 'cafe', logo: '' }]
      }]
    }
  })

  it('renders promotions list', () => {
    const { getByText } = renderWithProviders(<Promotions />, { theme: themeWithValues() })
    expect(getByText('Offers')).toBeInTheDocument()
    expect(getByText('Summer Deal')).toBeInTheDocument()
  })

  it('shows empty state when no offers', () => {
    offersState.current = { loading: false, error: null, offers: [] }
    const { getByTestId } = renderWithProviders(<Promotions />, { theme: themeWithValues() })
    expect(getByTestId('not-found')).toBeInTheDocument()
  })

  it('opens coupon modal and navigates to business', () => {
    const { getByText, getByTestId, getAllByText } = renderWithProviders(<Promotions />, { theme: themeWithValues() })
    fireEvent.click(getByText('Use coupon'))
    expect(setOfferSelected).toHaveBeenCalled()
    expect(getByTestId('modal')).toBeInTheDocument()
    const storeButtons = getAllByText('Use coupon')
    fireEvent.click(storeButtons[storeButtons.length - 1])
    expect(emit).toHaveBeenCalled()
  })

  it('shows loading skeletons and error', () => {
    offersState.current = { loading: true, error: null, offers: [] }
    const { getAllByTestId } = renderWithProviders(<Promotions />, { theme: themeWithValues() })
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0)
    offersState.current = { loading: false, error: ['fail'], offers: [] }
    const { getByTestId } = renderWithProviders(<Promotions />, { theme: themeWithValues() })
    expect(getByTestId('not-found')).toHaveTextContent('fail')
  })

  it('a business without a logo in the offer\'s modal shows no logo by default (visibility.business.dummy_logo off)', () => {
    const theme = themeWithValues()
    const placeholder = themeImage(theme, 'placeholder.business_logo')
    expect(placeholder).toBeTruthy()
    const view = renderWithProviders(<Promotions />, { theme })
    fireEvent.click(view.getByText('Use coupon'))
    expect(view.getByTestId('modal').querySelector(`[style*="${placeholder}"]`)).toBeNull()
  })

  it('a business without a logo in the offer\'s modal shows the theme\'s placeholder when visibility.business.dummy_logo is on', () => {
    const theme = themeWithValues((values) => ({ ...values, visibility: { ...values.visibility, 'business.dummy_logo': true } }))
    const placeholder = themeImage(theme, 'placeholder.business_logo')
    expect(placeholder).toBeTruthy()
    const view = renderWithProviders(<Promotions />, { theme })
    fireEvent.click(view.getByText('Use coupon'))
    expect(view.getByTestId('modal').querySelector(`[style*="${placeholder}"]`)).toBeTruthy()
  })
})
