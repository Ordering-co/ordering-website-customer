import React, { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { withModalBase } from './productModalTheme'

// implementation noteswhat the product form opens over its own window (login, the maximum alert, Copy URL) is a
// Dialog nested in the product's: it is above it in every layout, and Escape and a press outside
// belong to the layer on top.
const session = vi.hoisted(() => ({ auth: false }))

vi.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div data-testid='swiper'>{children}</div>,
  SwiperSlide: ({ children }) => <div>{children}</div>
}))
vi.mock('swiper/modules', () => ({
  Navigation: class Navigation {},
  Pagination: class Pagination {},
  Thumbs: class Thumbs {}
}))
vi.mock('swiper/css', () => ({}))
vi.mock('swiper/css/navigation', () => ({}))
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => <div data-testid='skeleton' /> }))
vi.mock('~ui/src/components/ProductOption', () => ({
  ProductOption: ({ option, children }) => <div id={`id_${option.id}`}>{children}</div>
}))
vi.mock('~ui/src/components/ProductIngredient', () => ({ ProductIngredient: () => null }))
vi.mock('~ui/src/components/ProductOptionSubOption', () => ({ ProductOptionSubOption: () => null }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => <button type='button'>Inside the login</button> }))
vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => null }))
vi.mock('~components/components/ProductShare', () => ({
  ProductShare: ({ UIComponent, ...rest }) => <UIComponent urlToShare='https://example.com/p/1' showShareButton updateShowValue={vi.fn()} {...rest} />
}))
vi.mock('../../ProductShare/ProductCopyURL', () => ({ ProductCopyURL: () => <p>Copy me</p> }))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: session.auth, user: { id: 1 } }, { login: vi.fn() }]
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ loading: false, options: { type: 1 } }]
}))
vi.mock('~components/utils/orderTypeAddress', () => ({
  parseUnaddressedOrderTypes: () => [],
  shouldRequireOrderAddress: () => false
}))
vi.mock('~components/hooks/useSelectedStudent', () => ({ useSelectedStudent: () => ({ studentId: null }) }))

const product = {
  ...productFixture,
  name: 'Smoky burger',
  ingredients: [],
  extras: [{ id: 1, rank: 1, options: [{ id: 1, rank: 1, name: 'Base', suboptions: [] }] }]
}

vi.mock('~components/components/ProductForm', () => ({
  ProductForm: ({ UIComponent, ...rest }) => (
    <UIComponent
      productObject={{ product, loading: false, error: null }}
      business={{ id: 1, name: 'Store' }}
      handleSave={vi.fn()}
      increment={vi.fn()}
      decrement={vi.fn()}
      handleChangeSuboptionState={vi.fn()}
      handleChangeProductCartQuantity={vi.fn()}
      errors={{}}
      isSoldOut={false}
      editMode={false}
      maxProductQuantity={5}
      showOption={() => true}
      {...rest}
      productCart={{ quantity: 1, options: {}, ingredients: {} }}
    />
  )
}))

const { ProductForm } = await import('../index')
const { ProductModal } = await import('../ProductModal')

const Screen = ({ onClose }) => {
  const [open, setOpen] = useState(true)
  return open && (
    <ProductModal open onClose={() => { onClose(); setOpen(false) }}>
      <ProductForm product={product} />
    </ProductModal>
  )
}

const portalOf = (el) => el.closest('[data-base-ui-portal]')
const zOf = (dialog) => dialog.parentElement.className.match(/ui:z-\d+/)[0]
const isAfter = (a, b) => !!(portalOf(a).compareDocumentPosition(portalOf(b)) & Node.DOCUMENT_POSITION_FOLLOWING)

// each child the form opens: how it opens, and the dialog it is
const CHILDREN = [
  ['the maximum alert', { auth: true }, async () => {
    const quantity = document.querySelector('[data-doc-control=product-quantity]')
    fireEvent.change(quantity, { target: { value: '99' } })
    return screen.findByRole('dialog', { name: 'Quantity' })
  }],
  ['the login, from Favorite without a session', { auth: false }, async () => {
    fireEvent.click(document.querySelector('.favorite'))
    return screen.findByRole('dialog', { name: 'Login' })
  }],
  ['Copy URL', { auth: true }, async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy URL' }))
    return screen.findByRole('dialog', { name: 'Copy URL' })
  }]
]

describe.each([['sheet', 'ui:z-20002'], ['steps', 'ui:z-20002']])('ProductForm: what it opens over the product (%s)', (layout, layer) => {
  const theme = withModalBase(themeWithValues(), { layout })

  it.each(CHILDREN)('%s: it is a Dialog over the product, on the same layer and later in the DOM', async (_name, as, open) => {
    session.auth = as.auth
    renderWithProviders(<Screen onClose={vi.fn()} />, { theme })
    const productWindow = await screen.findByRole('dialog', { name: 'Smoky burger' })
    const child = await open()
    expect(child.getAttribute('data-slot')).toBe('dialog-content')
    expect(isAfter(productWindow, child)).toBe(true)
    // the same layer, or a sheet that is above (z 20601) would cover a child that is not
    expect(zOf(child)).toBe(layer)
    expect(zOf(productWindow)).toBe(layer)
  })

  it.each(CHILDREN)('%s: Escape closes only it, the next one closes the product', async (_name, as, open) => {
    session.auth = as.auth
    const onClose = vi.fn()
    renderWithProviders(<Screen onClose={onClose} />, { theme })
    await screen.findByRole('dialog', { name: 'Smoky burger' })
    const child = await open()
    fireEvent.keyDown(child, { key: 'Escape' })
    await waitFor(() => expect(child.isConnected).toBe(false))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Smoky burger' })).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})

describe('ProductForm: the maximum alert', () => {
  it('says the quantity, titles the window, closes with Accept and not by a press outside', async () => {
    session.auth = true
    const onClose = vi.fn()
    renderWithProviders(<Screen onClose={onClose} />)
    await screen.findByRole('dialog', { name: 'Smoky burger' })
    fireEvent.change(document.querySelector('[data-doc-control=product-quantity]'), { target: { value: '99' } })
    const alert = await screen.findByRole('dialog', { name: 'Quantity' })
    expect(alert).toHaveTextContent('The max quantity is 5')
    const overlays = document.querySelectorAll('[data-slot=dialog-overlay]')
    const top = overlays[overlays.length - 1]
    fireEvent.pointerDown(top)
    fireEvent.click(top)
    expect(alert.isConnected).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }))
    await waitFor(() => expect(alert.isConnected).toBe(false))
    expect(screen.getByRole('dialog', { name: 'Smoky burger' })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
