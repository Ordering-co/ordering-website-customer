import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../../styles/__tests__/themeTestUtils'
import { TrackingProductItem } from '../TrackingProductItem'

vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (_key, fallback) => fallback]
}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parsePrice: (value) => `$${Number(value).toFixed(2)}` }]
}))
vi.mock('~components/components/ProductItemAccordion', () => ({
  ProductItemAccordion: ({ UIComponent, product, ...props }) => (
    <UIComponent
      {...props}
      product={product}
      productInfo={{
        ingredients: product.ingredients || [],
        options: product.options || []
      }}
    />
  )
}))
const product = { id: 1, name: 'burger deluxe', quantity: 2, price: 12, total: 10, images: '/burger.png', comment: 'no onion' }

describe('TrackingProductItem', () => {
  it('renders quantity, image, name, comment and the discounted inline price', () => {
    const { getByText, container } = renderWithProviders(<TrackingProductItem product={product} />)
    expect(getByText('2')).toBeInTheDocument()
    expect(getByText('burger deluxe')).toBeInTheDocument()
    expect(getByText('no onion')).toBeInTheDocument()
    expect(getByText('$12.00').tagName).toBe('S')
    expect(getByText('$10.00')).toBeInTheDocument()
    expect(container.querySelector('[style*="burger.png"]')).toBeTruthy()
    expect(container.querySelector('svg.lucide-chevron-down')).toBeNull()
  })

  it('hides the price when hidePrice is set', () => {
    const { getByText, queryByText } = renderWithProviders(<TrackingProductItem product={product} hidePrice />)
    expect(getByText('burger deluxe')).toBeInTheDocument()
    expect(getByText('no onion')).toBeInTheDocument()
    expect(queryByText('$12.00')).toBeNull()
    expect(queryByText('$10.00')).toBeNull()
  })

  it('opens the accordion with unselected ingredients, options and removed toppings', () => {
    const withOptions = {
      ...product,
      ingredients: [{ id: 1, name: 'Tomato', selected: false }, { id: 2, name: 'Lettuce', selected: true }],
      options: [
        { id: 5, name: 'Size', suboptions: [{ id: 6, name: 'Large', quantity: 1, position: 'whole', price: 2, rank: 1 }] },
        { id: 7, name: 'Synthetic Sauce', quantity: 1, price: 0 }
      ]
    }
    const { getByText, container } = renderWithProviders(
      <TrackingProductItem product={withOptions} toppingsRemoved={{ removed: [{ code: 'x', name: 'Cheese' }] }} />
    )
    expect(container.querySelector('svg.lucide-chevron-down')).toBeInTheDocument()
    fireEvent.click(container.querySelector('.product.accordion'))
    expect(container.querySelector('.product.accordion.active')).toBeTruthy()
    expect(getByText('No Tomato')).toBeInTheDocument()
    expect(getByText('Size')).toBeInTheDocument()
    expect(getByText('1 x Large +$2.00')).toBeInTheDocument()
    expect(getByText('Synthetic Sauce')).toBeInTheDocument()
    expect(getByText('Toppings removed')).toBeInTheDocument()
    expect(getByText('Cheese')).toBeInTheDocument()
  })
})

describe('TrackingProductItem: a product without a photo', () => {
  const noPhoto = { ...product, images: null }
  const dummyShown = () => themeWithValues((values) => ({
    ...values,
    visibility: { ...values.visibility, 'product.dummy_image': true }
  }))

  it('shows the theme\'s product placeholder (placeholder.product) when visibility.product.dummy_image is on', () => {
    const theme = dummyShown()
    const { container } = renderWithProviders(<TrackingProductItem product={noPhoto} />, { theme })
    expect(theme.values.images['placeholder.product']).toBeTruthy()
    expect(container.querySelector(`[style*="${theme.values.images['placeholder.product']}"]`)).toBeTruthy()
  })

  it('no dummy by default (visibility product.dummy_image off)', () => {
    const theme = themeWithValues()
    const { container } = renderWithProviders(<TrackingProductItem product={noPhoto} />, { theme })
    expect(container.querySelector('[style*="background-image"]')).toBeNull()
  })

  it('the key decides in a site served by the worker (production) too', () => {
    window.__CONFIG__ = {}
    try {
      const theme = dummyShown()
      const { container } = renderWithProviders(<TrackingProductItem product={noPhoto} />, { theme })
      expect(container.querySelector(`[style*="${theme.values.images['placeholder.product']}"]`)).toBeTruthy()
    } finally {
      delete window.__CONFIG__
    }
  })

  it('no image when the theme hides the products\' images (visibility confirmation.products.image)', () => {
    const theme = themeWithValues((values) => ({
      ...values,
      visibility: { ...values.visibility, 'confirmation.products.image': false }
    }))
    const { container } = renderWithProviders(<TrackingProductItem product={product} />, { theme })
    expect(container.querySelector('[style*="background-image"]')).toBeNull()
  })
})

describe('TrackingProductItem: the product\'s header', () => {
  const withOptions = { ...product, options: [{ id: 5, name: 'Size', suboptions: [] }] }

  it('a real button that says whether its details are open, its chevron hidden from assistive tech', () => {
    const { getByRole, container } = renderWithProviders(<TrackingProductItem product={withOptions} />)
    const header = getByRole('button')
    expect(header.tagName).toBe('BUTTON')
    expect(header).toHaveAttribute('type', 'button')
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(container.querySelector('svg.lucide-chevron-down')).toHaveAttribute('aria-hidden', 'true')
    fireEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'true')
    // phrasing content only inside the button
    expect(header.querySelector('div, p, h1, h2, h3, h4, h5, h6, ul')).toBeNull()
  })

  it('a plain row (no button) without details', () => {
    const { queryByRole, getByText } = renderWithProviders(<TrackingProductItem product={product} />)
    expect(queryByRole('button')).toBeNull()
    expect(getByText('burger deluxe').closest('[aria-expanded]')).toBeNull()
  })
})
