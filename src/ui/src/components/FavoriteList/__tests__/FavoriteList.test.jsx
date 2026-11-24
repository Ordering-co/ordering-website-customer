import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { FavoriteList } from '../index'

vi.mock('~ui/utils', () => ({
  checkSiteUrl: (_url, fallback) => fallback,
  generalUtilities: () => ({ getOrderStatus: () => 'pending' }),
  getCateringValues: () => ({}),
  capitalize: (s) => s
}))
vi.mock('~ui/src/components/BusinessController', () => ({
  BusinessController: ({ business, isSkeleton }) => (
    <div data-testid={isSkeleton ? 'business-skeleton' : 'business-card'}>{business?.name}</div>
  )
}))
vi.mock('~ui/src/components/SingleProductCard', () => ({
  SingleProductCard: ({ product, isSkeleton, onProductClick }) => (
    <button
      type='button'
      data-testid={isSkeleton ? 'product-skeleton' : 'product-card'}
      onClick={onProductClick}
    >
      {product?.name || 'skeleton'}
    </button>
  )
}))
vi.mock('~ui/src/components/SingleOrderCard', () => ({
  SingleOrderCard: ({ order, isSkeleton }) => (
    <div data-testid={isSkeleton ? 'order-skeleton' : 'order-card'}>{order?.id}</div>
  )
}))
vi.mock('~ui/src/components/SingleProfessionalCard', () => ({
  SingleProfessionalCard: ({ professional, isSkeleton }) => (
    <div data-testid={isSkeleton ? 'pro-skeleton' : 'pro-card'}>{professional?.name}</div>
  )
}))
vi.mock('~ui/src/components/BusinessPreorder', () => ({
  BusinessPreorder: () => <div data-testid='preorder' />
}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children }) => (open ? <div data-testid='modal'>{children}</div> : null)
}))
vi.mock('~ui/src/components/NotFoundSource', () => ({
  NotFoundSource: ({ content, variant, btnTitle, onClickButton }) => (
    <div data-testid='not-found' data-variant={variant}>
      {content}
      {onClickButton && <button type='button' onClick={onClickButton}>{btnTitle}</button>}
    </div>
  )
}))

const favoriteList = vi.hoisted(() => ({
  current: {
    loading: false,
    error: null,
    favorites: [{ id: 1, name: 'Fav Store', slug: 'fav-store', reviews: { total: 4 } }]
  }
}))

const pagination = vi.hoisted(() => ({
  current: { currentPage: 1, totalPages: 1, totalItems: 1 }
}))

const getFavoriteList = vi.hoisted(() => vi.fn())

vi.mock('~components/components/FavoriteList', () => ({
  FavoriteList: ({ UIComponent, ...rest }) => (
    <UIComponent
      favoriteList={favoriteList.current}
      handleUpdateFavoriteList={vi.fn()}
      pagination={pagination.current}
      getFavoriteList={getFavoriteList}
      handleReorder={vi.fn()}
      reorderState={{ loading: false }}
      {...rest}
    />
  )
}))

describe('FavoriteList', () => {
  beforeEach(() => {
    getFavoriteList.mockClear()
    pagination.current = { currentPage: 1, totalPages: 1, totalItems: 1 }
    favoriteList.current = {
      loading: false,
      error: null,
      favorites: [{ id: 1, name: 'Fav Store', slug: 'fav-store', reviews: { total: 4 } }]
    }
  })

  it('renders favorite businesses', () => {
    const { getByTestId } = renderWithProviders(
      <FavoriteList isBusiness favoriteURL='favorite_businesses' originalURL='business' />
    )
    expect(getByTestId('business-card')).toHaveTextContent('Fav Store')
  })

  it('renders empty state for businesses', () => {
    favoriteList.current = { loading: false, error: null, favorites: [] }
    const { getByTestId } = renderWithProviders(
      <FavoriteList isBusiness favoriteURL='favorite_businesses' originalURL='business' />
    )
    expect(getByTestId('not-found')).toHaveTextContent(/favorite businesses/i)
  })

  it('renders product favorites and opens product modal', () => {
    favoriteList.current = {
      loading: false,
      error: null,
      favorites: [{ id: 9, name: 'Burger', images: 'b.jpg', businesses: [{ slug: 'cafe' }] }]
    }
    const { getByTestId } = renderWithProviders(
      <FavoriteList isProduct favoriteURL='favorite_products' originalURL='products' />
    )
    fireEvent.click(getByTestId('product-card'))
    expect(getByTestId('modal')).toBeInTheDocument()
  })

  it('renders order favorites', () => {
    favoriteList.current = {
      loading: false,
      error: null,
      favorites: [{ id: 3, status: 1, business: { slug: 'cafe' } }]
    }
    const { getByTestId } = renderWithProviders(
      <FavoriteList isOrder favoriteURL='favorite_orders' originalURL='orders' />
    )
    expect(getByTestId('order-card')).toHaveTextContent('3')
  })

  describe('a single store site lists only the store\'s favorites', () => {
    const singleStore = () => themeWithValues((values) => {
      values.site = { ...values.site, mode: 'single_store', business_slug: 'mcbonalds' }
      return values
    })

    it('businesses, orders and products of the store; the empty state when none', () => {
      const theme = singleStore()
      favoriteList.current = { loading: false, error: null, favorites: [{ id: 41, name: 'McBonalds', slug: 'mcbonalds' }, { id: 37, name: 'Salami', slug: 'salami' }] }
      const businesses = renderWithProviders(<FavoriteList isBusiness favoriteURL='favorite_businesses' originalURL='business' />, { theme })
      expect(businesses.getAllByTestId('business-card').map((el) => el.textContent)).toEqual(['McBonalds'])
      businesses.unmount()

      favoriteList.current = { loading: false, error: null, favorites: [{ id: 3, business: { slug: 'pizzahut_local' } }] }
      const orders = renderWithProviders(<FavoriteList isOrder favoriteURL='favorite_orders' originalURL='orders' />, { theme })
      expect(orders.queryByTestId('order-card')).toBeNull()
      expect(orders.getByTestId('not-found')).toBeInTheDocument()
      orders.unmount()

      favoriteList.current = {
        loading: false,
        error: null,
        favorites: [
          { id: 9, name: 'Burger', images: 'b.jpg', businesses: [{ id: 41, slug: 'mcbonalds', name: 'McBonalds' }, { id: 37, slug: 'salami', name: 'Salami' }] },
          { id: 10, name: 'Pizza', images: 'p.jpg', businesses: [{ id: 37, slug: 'salami', name: 'Salami' }] }
        ]
      }
      const products = renderWithProviders(<FavoriteList isProduct favoriteURL='favorite_products' originalURL='products' />, { theme })
      expect(products.getAllByTestId('product-card').map((el) => el.textContent)).toEqual(['Burger'])
      // its popup offers only the store
      fireEvent.click(products.getByTestId('product-card'))
      expect(products.getByText('Available business for this product')).toBeInTheDocument()
      expect(products.queryByText('Salami')).toBeNull()
    })

    it('a site that lists businesses keeps them all', () => {
      favoriteList.current = { loading: false, error: null, favorites: [{ id: 41, name: 'McBonalds', slug: 'mcbonalds' }, { id: 37, name: 'Salami', slug: 'salami' }] }
      const view = renderWithProviders(<FavoriteList isBusiness favoriteURL='favorite_businesses' originalURL='business' />, { theme: themeWithValues() })
      expect(view.getAllByTestId('business-card')).toHaveLength(2)
    })
  })

  it('renders professional favorites and load more', () => {
    favoriteList.current = {
      loading: false,
      error: null,
      favorites: [{ id: 4, name: 'Alex' }]
    }
    pagination.current = { currentPage: 1, totalPages: 2, totalItems: 10 }
    const { getByTestId, getByText } = renderWithProviders(
      <FavoriteList isProfessional favoriteURL='favorite_users' originalURL='users' />
    )
    expect(getByTestId('pro-card')).toHaveTextContent('Alex')
    fireEvent.click(getByText('Load more items'))
    expect(getFavoriteList).toHaveBeenCalledWith(2)
  })

  it('renders loading skeletons for businesses', () => {
    favoriteList.current = { loading: true, error: null, favorites: [] }
    const { getAllByTestId } = renderWithProviders(
      <FavoriteList isBusiness favoriteURL='favorite_businesses' originalURL='business' />
    )
    expect(getAllByTestId('business-skeleton').length).toBeGreaterThan(0)
  })

  it('a failed load shows its own error state with Retry, not the API text', () => {
    favoriteList.current = { loading: false, error: ['The location.lat field is required'], favorites: [] }
    const { getByTestId, getByText, queryByText } = renderWithProviders(
      <FavoriteList isBusiness favoriteURL='favorite_businesses' originalURL='business' />
    )
    expect(queryByText(/location\.lat/)).toBeNull()
    expect(queryByText(/ERROR/)).toBeNull()
    expect(getByTestId('not-found')).toHaveTextContent('We couldn’t load your favorites')
    expect(getByTestId('not-found').dataset.variant).toBe('notFound')
    fireEvent.click(getByText('Retry'))
    expect(getFavoriteList).toHaveBeenCalledWith(1)
  })

  it('no favorites and no error: the empty state, without Retry', () => {
    favoriteList.current = { loading: false, error: null, favorites: [] }
    const { getByTestId, queryByText } = renderWithProviders(
      <FavoriteList isBusiness favoriteURL='favorite_businesses' originalURL='business' />
    )
    expect(getByTestId('not-found').dataset.variant).toBe('empty')
    expect(queryByText('Retry')).toBeNull()
  })

  describe('the product modal: a product without a photo, a business without a logo', () => {
    const openNoPhoto = (theme) => {
      favoriteList.current = {
        loading: false,
        error: null,
        favorites: [{ id: 9, name: 'Burger', images: null, businesses: [{ id: 2, name: 'Cafe', slug: 'cafe', logo: null }] }]
      }
      const view = renderWithProviders(
        <FavoriteList isProduct favoriteURL='favorite_products' originalURL='products' />,
        { theme }
      )
      fireEvent.click(view.getByTestId('product-card'))
      return view.getByTestId('modal')
    }

    const dummiesOn = (values) => ({ ...values, visibility: { ...values.visibility, 'product.dummy_image': true, 'business.dummy_logo': true } })

    it('no product nor business placeholder by default (visibility product.dummy_image, business.dummy_logo)', () => {
      const theme = themeWithValues()
      const modal = openNoPhoto(theme)
      expect(modal.querySelector('img')).toBeNull()
      expect(modal.querySelector(`[style*="${theme.values.images['placeholder.business_logo']}"]`)).toBeNull()
    })

    it('the theme\'s product placeholder (decorative) and business placeholder when both switches are on', () => {
      const theme = themeWithValues(dummiesOn)
      const product = theme.values.images['placeholder.product']
      const businessLogo = theme.values.images['placeholder.business_logo']
      expect(product).toBeTruthy()
      expect(businessLogo).toBeTruthy()
      const modal = openNoPhoto(theme)
      const img = modal.querySelector('img')
      expect(img).toHaveAttribute('src', product)
      expect(img).toHaveAttribute('alt', '')
      expect(modal.querySelector(`[style*="${businessLogo}"]`)).toBeTruthy()
    })

    it('visibility product.dummy_image decides in a site served by the worker (production) too', () => {
      window.__CONFIG__ = {}
      try {
        const theme = themeWithValues(dummiesOn)
        expect(openNoPhoto(theme).querySelector('img')).toHaveAttribute('src', theme.values.images['placeholder.product'])
      } finally {
        delete window.__CONFIG__
      }
    })

    it('no product placeholder when the theme hides it (visibility product.dummy_image), business placeholder still shown', () => {
      window.__CONFIG__ = {}
      try {
        const theme = themeWithValues((values) => ({ ...dummiesOn(values), visibility: { ...dummiesOn(values).visibility, 'product.dummy_image': false } }))
        const modal = openNoPhoto(theme)
        expect(modal.querySelector('img')).toBeNull()
        expect(modal.querySelector(`[style*="${theme.values.images['placeholder.business_logo']}"]`)).toBeTruthy()
      } finally {
        delete window.__CONFIG__
      }
    })

    it('a product\'s own photo is named by the product', () => {
      favoriteList.current = {
        loading: false,
        error: null,
        favorites: [{ id: 9, name: 'Burger', images: 'b.jpg', businesses: [] }]
      }
      const view = renderWithProviders(<FavoriteList isProduct favoriteURL='favorite_products' originalURL='products' />)
      fireEvent.click(view.getByTestId('product-card'))
      expect(view.getByAltText('Burger')).toHaveAttribute('src', 'b.jpg')
    })
  })
})
