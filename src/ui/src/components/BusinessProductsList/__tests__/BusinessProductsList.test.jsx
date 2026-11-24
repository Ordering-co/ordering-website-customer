import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { BusinessProductsList } from '../index'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

vi.mock('~ui/src/components/SingleProductCard', () => ({
  SingleProductCard: ({ product }) => <div data-testid='product-card'>{product.name}</div>
}))
vi.mock('~ui/src/components/NotFoundSource', () => ({
  NotFoundSource: () => <div data-testid='not-found' />
}))

vi.mock('~components/components/ProductsList', () => ({
  ProductsList: ({ UIComponent, ...rest }) => (
    <UIComponent
      category={{ id: 1, name: 'Mains' }}
      categories={[]}
      categoryState={{ products: [productFixture], loading: false, pagination: { currentPage: 1, pageSize: 10, total: 1 } }}
      onProductClick={vi.fn()}
      subcategoriesSelected={[]}
      setSubcategoriesSelected={vi.fn()}
      errors={[]}
      {...rest}
    />
  )
}))

describe('BusinessProductsList', () => {
  it('renders products for a category', () => {
    const { getByTestId } = renderWithProviders(<BusinessProductsList />)
    expect(getByTestId('product-card')).toHaveTextContent('Burger')
  })

  it('a category\'s image is decorative beside its name', () => {
    // (the description is off by default: visibility business.categories.description)
    const category = { id: 1, name: 'Mains', image: '/mains.png' }
    const { getByRole, container } = renderWithProviders(
      <BusinessProductsList
        category={{}}
        categories={[category]}
        categoryState={{ products: [{ ...productFixture, category_id: 1 }], loading: false, pagination: { currentPage: 1, pageSize: 10, total: 1 } }}
      />
    )
    expect(getByRole('heading', { name: 'Mains' })).toBeInTheDocument()
    expect(container.querySelector('img[src="/mains.png"]')).toHaveAttribute('alt', '')
  })

  describe('the category image (visibility business.categories.image)', () => {
    const category = { id: 1, name: 'Mains', image: '/mains.png' }
    const renderList = (theme) => renderWithProviders(
      <BusinessProductsList
        category={{}}
        categories={[category]}
        categoryState={{ products: [{ ...productFixture, category_id: 1 }], loading: false, pagination: { currentPage: 1, pageSize: 10, total: 1 } }}
      />,
      { theme }
    )
    const hidden = { 'business.categories.image': false }

    it('shown by default, hidden by the key (the name stays)', () => {
      const shown = renderList(themeWithValues())
      expect(shown.container.querySelector('img[src="/mains.png"]')).not.toBeNull()
      shown.unmount()
      const view = renderList(themeWithValues((values) => {
        Object.assign(values.visibility, hidden)
        return values
      }))
      expect(view.container.querySelector('img[src="/mains.png"]')).toBeNull()
      expect(view.getByRole('heading', { name: 'Mains' })).toBeInTheDocument()
    })

    it('an image that fails to load goes away (no broken image), the name stays', () => {
      const view = renderList(themeWithValues())
      fireEvent.error(view.container.querySelector('img[src="/mains.png"]'))
      expect(view.container.querySelector('img[src="/mains.png"]')).toBeNull()
      expect(view.getByRole('heading', { name: 'Mains' })).toBeInTheDocument()
    })
  })

  describe('the category description and ribbon (visibility business.categories.description, .ribbon)', () => {
    const category = {
      id: 1,
      name: 'Mains',
      description: 'Hot dishes',
      ribbon: { enabled: true, text: 'Hot', color: '#ff0000', shape: 'rectangle' }
    }
    const renderList = (keys, extra = {}) => renderWithProviders(
      <BusinessProductsList
        category={{}}
        categories={[{ ...category, ...extra }]}
        categoryState={{ products: [{ ...productFixture, category_id: 1 }], loading: false, pagination: { currentPage: 1, pageSize: 10, total: 1 } }}
      />,
      {
        theme: themeWithValues((values) => {
          Object.assign(values.visibility, keys)
          return values
        })
      }
    )

    it('by default: the ribbon, no description', () => {
      const { queryByText, getByText } = renderList({})
      expect(getByText('Hot')).toBeInTheDocument()
      expect(queryByText('Hot dishes')).toBeNull()
    })

    it('description on: under the name, a long one cut with "View more" that opens it whole', async () => {
      const short = renderList({ 'business.categories.description': true })
      expect(short.getByText('Hot dishes')).toBeInTheDocument()
      expect(short.queryByText('View more')).toBeNull()
      short.unmount()
      const longText = 'x'.repeat(250)
      const long = renderList({ 'business.categories.description': true }, { description: longText })
      expect(long.getByText(`${'x'.repeat(200)}...`)).toBeInTheDocument()
      fireEvent.click(long.getByText('View more'))
      const dialog = await long.findByRole('dialog', { name: 'Mains' })
      expect(dialog).toHaveTextContent(longText)
      fireEvent.click(long.getByRole('button', { name: 'Close' }))
      await waitFor(() => expect(long.queryByRole('dialog')).toBeNull())
    })

    it('ribbon off: no ribbon, the name stays', () => {
      const { queryByText, getByRole } = renderList({ 'business.categories.ribbon': false })
      expect(queryByText('Hot')).toBeNull()
      expect(getByRole('heading', { name: 'Mains' })).toBeInTheDocument()
    })
  })
})
