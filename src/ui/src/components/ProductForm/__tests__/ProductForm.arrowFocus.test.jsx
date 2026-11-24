import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { defaultTheme } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'

// implementation notesan arrow inside a single-choice radiogroup chooses a radio and may complete the group;
// the form must then leave the focus on the radio (the keyboard walks the group, Tab moves on), where
// a press on a row takes the customer to the next group still to choose, as it always did.
vi.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div>{children}</div>,
  SwiperSlide: ({ children }) => <div>{children}</div>
}))
vi.mock('swiper/modules', () => ({ Navigation: class Navigation {}, Pagination: class Pagination {}, Thumbs: class Thumbs {} }))
vi.mock('swiper/css', () => ({}))
vi.mock('swiper/css/navigation', () => ({}))
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => null }))
vi.mock('~ui/src/components/ProductShare', () => ({ ProductShare: () => null }))
vi.mock('~ui/src/components/ProductIngredient', () => ({ ProductIngredient: () => null }))
vi.mock('~ui/src/components/ProductOption', () => ({
  ProductOption: ({ option, children }) => <div id={`id_${option.id}`} data-testid={`option-${option.id}`}>{children}</div>
}))
// a row: what the real one does when it completes its group, a choice and the form's `setIsScrollAvailable`
vi.mock('~ui/src/components/ProductOptionSubOption', () => ({
  ProductOptionSubOption: ({ option, suboption, onChange, setIsScrollAvailable }) => (
    <button
      type='button'
      data-testid={`row-${suboption.id}`}
      onClick={() => { onChange({ selected: true, quantity: 1, position: 'whole' }, suboption, option); setIsScrollAvailable(true) }}
    >
      {suboption.name}
    </button>
  )
}))
vi.mock('~components/contexts/SessionContext', () => ({ useSession: () => [{ auth: true, user: { id: 1 } }, { login: vi.fn() }] }))
vi.mock('~components/contexts/OrderContext', () => ({ useOrder: () => [{ loading: false, options: { type: 1 } }] }))
vi.mock('~components/utils/orderTypeAddress', () => ({ parseUnaddressedOrderTypes: () => [], shouldRequireOrderAddress: () => false }))
vi.mock('~components/hooks/useSelectedStudent', () => ({ useSelectedStudent: () => ({ studentId: null }) }))

const sub = (id, name) => ({ id, name, rank: id, enabled: true })
const product = {
  ...productFixture,
  ingredients: [],
  extras: [{
    id: 1,
    rank: 1,
    options: [
      { id: 1, rank: 1, name: 'Size', min: 1, max: 1, suboptions: [sub(11, 'Small'), sub(12, 'Large')] },
      { id: 2, rank: 2, name: 'Crust', min: 1, max: 1, suboptions: [sub(21, 'Thin'), sub(22, 'Thick')] }
    ]
  }]
}

vi.mock('~components/components/ProductForm', async () => {
  const React = await import('react')
  return {
    ProductForm: ({ UIComponent, ...rest }) => {
      const [sizeChosen, setSizeChosen] = React.useState(false)
      return (
        <UIComponent
          productObject={{ product, loading: false, error: null }}
          business={{ id: 1, name: 'Store' }}
          handleSave={vi.fn()}
          increment={vi.fn()}
          decrement={vi.fn()}
          handleChangeSuboptionState={(state, suboption, option) => option.id === 1 && setSizeChosen(true)}
          isSoldOut={false}
          maxProductQuantity={5}
          showOption={() => true}
          {...rest}
          errors={{ ...(sizeChosen ? {} : { 'id:1': true }), 'id:2': true }}
          productCart={{ quantity: 1, total: 21, options: {}, ingredients: {} }}
        />
      )
    }
  }
})

const { ProductForm } = await import('../index')

const render = () => {
  Element.prototype.scrollTo = vi.fn()
  return renderWithProviders(<div style={{ overflowY: 'auto' }}><ProductForm /></div>, { theme: defaultTheme })
}

describe('ProductForm: the focus after choosing in a single-choice group', () => {
  it('an arrow of the radiogroup leaves the focus on the radio', () => {
    render()
    const row = screen.getByTestId('row-11')
    row.focus()
    fireEvent.keyDown(row, { key: 'ArrowDown' })
    fireEvent.click(row)
    expect(row).toHaveFocus()
    expect(screen.getByTestId('option-2')).not.toHaveFocus()
  })

  it('a press on a row takes the focus to the next group still to choose', () => {
    render()
    const row = screen.getByTestId('row-11')
    fireEvent.pointerDown(row)
    fireEvent.click(row)
    expect(screen.getByTestId('option-2')).toHaveFocus()
  })

  it('an arrow does not stay armed: the next press goes on to the next group', () => {
    render()
    const row = screen.getByTestId('row-11')
    row.focus()
    fireEvent.keyDown(row, { key: 'ArrowDown' })
    fireEvent.pointerDown(row)
    fireEvent.click(row)
    expect(screen.getByTestId('option-2')).toHaveFocus()
  })
})
