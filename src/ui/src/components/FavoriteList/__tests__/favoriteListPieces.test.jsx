import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { FavoriteList } from '../index'

// implementation notes"Load more items" and "Go to business" are the design system's Button.

vi.mock('~ui/utils', () => ({
  checkSiteUrl: (_url, fallback) => fallback,
  generalUtilities: () => ({ getOrderStatus: () => 'pending' }),
  getCateringValues: () => ({}),
  capitalize: (s) => s
}))
vi.mock('~ui/src/components/SingleProductCard', () => ({
  SingleProductCard: ({ product, onProductClick }) => (
    <button type='button' data-testid='product-card' onClick={onProductClick}>{product?.name}</button>
  )
}))
vi.mock('~ui/src/components/SingleProfessionalCard', () => ({
  SingleProfessionalCard: ({ professional }) => <div data-testid='pro-card'>{professional?.name}</div>
}))
vi.mock('~ui/src/components/BusinessController', () => ({ BusinessController: () => <div /> }))
vi.mock('~ui/src/components/SingleOrderCard', () => ({ SingleOrderCard: () => <div /> }))
vi.mock('~ui/src/components/BusinessPreorder', () => ({ BusinessPreorder: () => <div /> }))
vi.mock('~ui/src/components/NotFoundSource', () => ({ NotFoundSource: () => <div /> }))

const getFavoriteList = vi.hoisted(() => vi.fn())
const favorites = vi.hoisted(() => ({ current: [], pagination: { currentPage: 1, totalPages: 2, totalItems: 10 } }))

vi.mock('~components/components/FavoriteList', () => ({
  FavoriteList: ({ UIComponent, ...rest }) => (
    <UIComponent
      favoriteList={{ loading: false, error: null, favorites: favorites.current }}
      handleUpdateFavoriteList={vi.fn()}
      pagination={favorites.pagination}
      getFavoriteList={getFavoriteList}
      handleReorder={vi.fn()}
      reorderState={{ loading: false }}
      {...rest}
    />
  )
}))

const theme = themeWithValues()
const varOf = (button, name) => button.style.getPropertyValue(name)
const expectLook = (button, options) => {
  const vars = componentVars(theme, 'button', options)
  ;['--ui-button-height', '--ui-button-background', '--ui-button-border', '--ui-button-color'].forEach((name) => {
    expect(varOf(button, name)).toBe(vars[name] ?? '')
  })
}

describe('FavoriteList: its buttons are the base Button', () => {
  it('"Load more items": primary outline md, asks the next page', () => {
    favorites.current = [{ id: 4, name: 'Alex' }]
    const { getByRole } = renderWithProviders(<FavoriteList isProfessional favoriteURL='favorite_users' originalURL='users' />, { theme })
    const more = getByRole('button', { name: 'Load more items' })
    expect(more).toHaveAttribute('data-slot', 'button')
    expect(more).toHaveAttribute('type', 'button')
    expectLook(more, { size: 'md', color: 'primary', appearance: 'outline' })
    // outline, not the solid fill
    expect(varOf(more, '--ui-button-background')).not.toBe(componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'solid' })['--ui-button-background'])
    fireEvent.click(more)
    expect(getFavoriteList).toHaveBeenCalledWith(2)
  })

  it('"Go to business" (the product\'s popup): primary solid md', () => {
    favorites.current = [{ id: 9, name: 'Burger', images: 'b.jpg', businesses: [{ id: 2, name: 'Cafe', slug: 'cafe' }] }]
    const { getByTestId, getByRole } = renderWithProviders(<FavoriteList isProduct favoriteURL='favorite_products' originalURL='products' />, { theme })
    fireEvent.click(getByTestId('product-card'))
    const go = getByRole('button', { name: 'Go to business' })
    expect(go).toHaveAttribute('data-slot', 'button')
    expect(go).toHaveAttribute('type', 'button')
    expectLook(go, { size: 'md', color: 'primary', appearance: 'solid' })
  })

  it('the product\'s popup is a dialog named by the product (its heading is the title row); Close closes it', async () => {
    favorites.current = [{ id: 9, name: 'Burger', images: 'b.jpg', businesses: [{ id: 2, name: 'Cafe', slug: 'cafe' }] }]
    const view = renderWithProviders(<FavoriteList isProduct favoriteURL='favorite_products' originalURL='products' />, { theme })
    fireEvent.click(view.getByTestId('product-card'))
    const dialog = await view.findByRole('dialog', { name: 'Burger' })
    expect(dialog.querySelector('[data-slot="dialog-title"]')).toHaveTextContent('Burger')
    fireEvent.click(view.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull())
  })
})
