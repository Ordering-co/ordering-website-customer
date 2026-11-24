import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { ProductItemAccordion } from '../index'

// implementation notesthe row's edit and delete (ProductActionsEdit / ProductActionsDelete) are the
// base Button, icon shape: neutral ghost sm (the trash too: on main `&&& svg { fill: currentColor }`
// beat its `fill: danger`, so it painted the button's neutral), danger ghost sm on a line whose menu
// is no longer valid.

const handlers = vi.hoisted(() => ({ onEditProduct: vi.fn(), onDeleteProduct: vi.fn(), loading: false }))

const size = vi.hoisted(() => ({ width: 1024 }))
vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => ({ width: size.width, height: 768 }) }))

vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ loading: handlers.loading, options: {} }]
}))

vi.mock('~components/components/ProductItemAccordion', () => ({
  ProductItemAccordion: ({ UIComponent, ...rest }) => (
    <UIComponent
      productInfo={{ ingredients: [], options: [{ id: 1, name: 'Size', suboptions: [] }] }}
      onEditProduct={handlers.onEditProduct}
      onDeleteProduct={handlers.onDeleteProduct}
      changeQuantity={() => {}}
      isCheckout={false}
      isCartProduct
      hideQuantitySelector={false}
      {...rest}
    />
  )
}))

const line = (extra = {}) => ({ ...productFixture, quantity: 2, price: 9.5, valid: true, valid_quantity: true, valid_menu: true, ...extra })
const themes = [
  ['the default theme', themeWithValues()],
  ['another primary', themeWithValues((values) => { values.tokens.color.primary = '#ABCDEF'; return values })]
]
const LOOK = ['--ui-button-height', '--ui-button-background', '--ui-button-border', '--ui-button-color', '--ui-button-icon-size']
const expectLook = (theme, button, color) => {
  expect(button).toHaveAttribute('data-slot', 'button')
  expect(button).toHaveAttribute('type', 'button')
  const vars = componentVars(theme, 'button', { size: 'sm', shape: 'icon', color, appearance: 'ghost' })
  LOOK.forEach((name) => expect(button.style.getPropertyValue(name)).toBe(vars[name] ?? ''))
}
const nameToggle = (utils) => utils.getByRole('button', { name: productFixture.name })

afterEach(() => {
  size.width = 1024
  handlers.loading = false
  handlers.onEditProduct.mockClear()
  handlers.onDeleteProduct.mockClear()
})

describe.each(themes)('ProductItemAccordion\'s row actions are the base Button (%s)', (_, theme) => {
  it('from 411px (C, E): neutral ghost sm, disabled while the order loads, the click does not open the row', () => {
    handlers.loading = true
    const utils = renderWithProviders(<ProductItemAccordion product={line()} />, { theme })
    const edit = utils.container.querySelector('button[data-doc-control="cart-product-edit"]')
    const remove = utils.container.querySelector('button[data-doc-control="cart-product-delete"]')
    expectLook(theme, edit, 'neutral')
    expectLook(theme, remove, 'neutral')
    expect(edit).toHaveAttribute('aria-label', 'Edit')
    expect(remove).toHaveAttribute('aria-label', 'Remove')
    expect(edit).toBeDisabled()
    expect(remove).toBeDisabled()
    // below 411px the delete hides: a wrapper of layout, never the button
    expect(cssFor(remove.parentElement)).toMatch(/display:none/)
    expect(cssFor(remove.parentElement)).toMatch(/@media \(min-width:\s?411px\)\{[^}]*display:inline-flex/)
  })

  it('from 411px (C, E): enabled, each calls its handler and the row stays closed (the refs reach the button)', () => {
    const utils = renderWithProviders(<ProductItemAccordion product={line()} />, { theme })
    fireEvent.click(utils.container.querySelector('button[data-doc-control="cart-product-edit"] svg'))
    expect(nameToggle(utils)).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(utils.container.querySelector('button[data-doc-control="cart-product-delete"] svg'))
    expect(nameToggle(utils)).toHaveAttribute('aria-expanded', 'false')
    expect(handlers.onEditProduct).toHaveBeenCalledTimes(1)
    expect(handlers.onDeleteProduct).toHaveBeenCalledTimes(1)
  })

  it('up to 410px (A, B): neutral ghost sm, never disabled, B without data-doc-control', () => {
    size.width = 400
    handlers.loading = true
    const utils = renderWithProviders(<ProductItemAccordion product={line()} getProductMax={() => 3} offsetDisabled={() => 3} />, { theme })
    const edit = utils.getAllByRole('button', { name: 'Edit' }).find((b) => b.getAttribute('data-doc-control') === 'cart-product-edit')
    const remove = utils.getAllByRole('button', { name: 'Remove' }).find((b) => !b.hasAttribute('data-doc-control'))
    expectLook(theme, edit, 'neutral')
    expectLook(theme, remove, 'neutral')
    expect(edit).not.toBeDisabled()
    expect(remove).not.toBeDisabled()
    fireEvent.click(edit)
    expect(nameToggle(utils)).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(remove)
    expect(nameToggle(utils)).toHaveAttribute('aria-expanded', 'false')
    expect(handlers.onEditProduct).toHaveBeenCalledTimes(1)
    expect(handlers.onDeleteProduct).toHaveBeenCalledTimes(1)
  })

  it('a quantity no longer valid (D, F): neutral ghost sm, disabled while the order loads', () => {
    handlers.loading = true
    const utils = renderWithProviders(<ProductItemAccordion product={line({ valid: false, valid_quantity: false })} />, { theme })
    const edit = utils.container.querySelector('button[data-doc-control="cart-product-edit"]')
    const remove = utils.container.querySelector('button[data-doc-control="cart-product-delete"]')
    expectLook(theme, edit, 'neutral')
    expectLook(theme, remove, 'neutral')
    expect(edit).toBeDisabled()
    expect(remove).toBeDisabled()
    expect(cssFor(remove.parentElement)).toMatch(/display:none/)
  })

  it('a menu no longer valid (G): danger ghost sm, disabled while the order loads', () => {
    handlers.loading = true
    const utils = renderWithProviders(<ProductItemAccordion product={line({ valid: false, valid_menu: false })} />, { theme })
    const remove = utils.container.querySelector('button[data-doc-control="cart-product-delete"]')
    expectLook(theme, remove, 'danger')
    expect(remove).not.toHaveAttribute('color')
    expect(remove).toBeDisabled()
    expect(cssFor(remove.parentElement)).toMatch(/display:none/)
  })
})

describe('ProductItemAccordion: no rule of the row\'s containers reaches inside its action buttons', () => {
  // the piece wraps its icon in a span: ContentInfo's `span div span { height }` / `svg:nth-child(1) { margin }`
  // and ProductError's `span { text-align }` (for its own texts) must not reach it
  it('up to 410px (ContentInfo) and with an invalid quantity (ProductError)', () => {
    size.width = 400
    const narrow = renderWithProviders(<ProductItemAccordion product={line()} />, { theme: themes[0][1] })
    const edit = narrow.container.querySelector('button[data-doc-control="cart-product-edit"]')
    expect(edit.querySelector('span')).not.toHaveStyle({ height: '20px' })
    expect(edit.querySelector('svg')).not.toHaveStyle({ marginRight: '3px' })
    narrow.unmount()
    size.width = 1024
    const invalid = renderWithProviders(<ProductItemAccordion product={line({ valid: false, valid_quantity: false })} />, { theme: themes[0][1] })
    const remove = invalid.container.querySelector('button[data-doc-control="cart-product-delete"]')
    expect(remove.querySelector('span')).not.toHaveStyle({ textAlign: 'center' })
  })
})
