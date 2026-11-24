import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../../__tests__/helpers/testUtils'
import { productFixture } from '../../../../__tests__/helpers/menuTestMocks'
import { themeWithValues } from '../../../../../styles/__tests__/themeTestUtils'
import { BusinessProductsList } from '../index'

vi.mock('~ui/src/components/SingleProductCard', () => ({
  SingleProductCard: ({ product }) => <div data-testid='product-card'>{product.name}</div>
}))
vi.mock('~ui/src/components/AccordionDropdown', () => ({
  AccordionDropdown: ({ item }) => <div data-testid='accordion'>{item.name}</div>
}))

vi.mock('~components/components/ProductsList', () => ({
  ProductsList: ({ UIComponent, ...rest }) => (
    <UIComponent
      business={{ id: 1, name: 'Grocery' }}
      category={{ id: 1, name: 'Produce' }}
      categories={[{ id: 1, name: 'Produce', subcategories: [] }]}
      categoriesState={{ loading: false }}
      categoryState={{ products: [productFixture], loading: false }}
      onProductClick={vi.fn()}
      onClickCategory={vi.fn()}
      subcategoriesSelected={[]}
      setSubcategoriesSelected={vi.fn()}
      {...rest}
    />
  )
}))

const withKeys = (keys) => themeWithValues((values) => {
  Object.assign(values.visibility, keys)
  return values
})

describe('BusinessProductsList groceries layout', () => {
  it('renders grocery category and product', () => {
    const { getByText, getByTestId } = renderWithProviders(<BusinessProductsList />)
    expect(getByText('Produce')).toBeInTheDocument()
    expect(getByTestId('product-card')).toHaveTextContent('Burger')
  })

  it('a category\'s image is decorative beside its name (header and description modal)', async () => {
    const category = { id: 1, name: 'Produce', image: '/produce.png', description: 'x'.repeat(250) }
    const { getByText, findByRole, getByRole, queryByRole } = renderWithProviders(<BusinessProductsList category={category} />, { theme: withKeys({ 'business.categories.description': true }) })
    fireEvent.click(getByText('View more'))
    await findByRole('dialog', { name: 'Produce' })
    const imgs = Array.from(document.querySelectorAll('img[src="/produce.png"]'))
    expect(imgs.length).toBeGreaterThanOrEqual(2)
    imgs.forEach((img) => expect(img).toHaveAttribute('alt', ''))
    fireEvent.click(getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  describe('a category\'s image, ribbon and description follow the keys of the other layout', () => {
    const category = {
      id: 1,
      name: 'Produce',
      image: '/produce.png',
      description: 'Fresh from the farm',
      ribbon: { enabled: true, text: 'Local', color: '#00aa00', shape: 'rectangle' }
    }
    // the selected category and the list of all of them
    const views = (theme) => [
      () => renderWithProviders(<BusinessProductsList category={category} />, { theme }),
      () => renderWithProviders(
        <BusinessProductsList
          category={{}}
          categories={[category]}
          categoryState={{ products: [{ ...productFixture, category_id: 1 }], loading: false, pagination: {} }}
        />,
        { theme }
      )
    ]
    const parts = ({ container }) => ({
      image: !!container.querySelector('img[src="/produce.png"]'),
      ribbon: container.textContent.includes('Local'),
      description: container.textContent.includes('Fresh from the farm')
    })

    it('by default: the image and the ribbon, no description (off by default)', () => {
      views(themeWithValues()).forEach((renderView) => {
        const view = renderView()
        expect(parts(view)).toEqual({ image: true, ribbon: true, description: false })
        view.unmount()
      })
    })

    it('each key on its own', () => {
      views(withKeys({
        'business.categories.image': false,
        'business.categories.ribbon': false,
        'business.categories.description': true
      })).forEach((renderView) => {
        const view = renderView()
        expect(parts(view)).toEqual({ image: false, ribbon: false, description: true })
        expect(view.getByRole('heading', { name: 'Produce' })).toBeInTheDocument()
        view.unmount()
      })
    })
  })
})
