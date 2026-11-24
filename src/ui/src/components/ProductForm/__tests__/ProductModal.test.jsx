import React, { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPortal } from 'react-dom'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { productFixture } from '../../__tests__/helpers/menuTestMocks'
import { withModalBase } from './productModalTheme'
import { DialogOverlay } from '../../Overlay/overlays'

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
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
vi.mock('~ui/src/components/ProductOption', () => ({
  ProductOption: ({ option, children }) => <div id={`id_${option.id}`} data-testid={`option-${option.id}`}>{children}</div>
}))
vi.mock('~ui/src/components/ProductIngredient', () => ({ ProductIngredient: () => null }))
vi.mock('~ui/src/components/ProductOptionSubOption', () => ({ ProductOptionSubOption: () => null }))
vi.mock('~ui/src/components/ProductShare', () => ({ ProductShare: () => null }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => null }))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: true, user: { id: 1 } }, { login: vi.fn() }]
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ loading: false, options: { type: 1 } }]
}))
vi.mock('~components/utils/orderTypeAddress', () => ({
  parseUnaddressedOrderTypes: () => [],
  shouldRequireOrderAddress: () => false
}))
vi.mock('~components/hooks/useSelectedStudent', () => ({
  useSelectedStudent: () => ({ studentId: null })
}))

const product = {
  ...productFixture,
  name: 'Smoky burger',
  ingredients: [{ id: 5, name: 'Cheese' }],
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

const withLayout = (layout, mutate) => withModalBase(themeWithValues(mutate), { layout })

const popup = () => document.querySelector('[data-slot=dialog-content], [data-slot=sheet-content]')
const portalOf = (el) => el.closest('[data-base-ui-portal]')
const gone = () => waitFor(() => expect(popup()).toBeNull())

// What the listing does: it mounts the modal when a product is chosen and unmounts it when it closes
const Screen = ({ onClose = vi.fn(), initial = true, children, ...props }) => {
  const [open, setOpen] = useState(initial)
  return (
    <>
      <button type='button' data-testid='opener' onClick={() => setOpen(true)}>Open</button>
      {open && (
        <ProductModal open onClose={() => { onClose(); setOpen(false) }} {...props}>
          {children || <ProductForm product={product} />}
        </ProductModal>
      )}
    </>
  )
}

const mount = (ui, theme) => renderWithProviders(ui, { theme })

afterEach(() => { document.getElementById('app-modals')?.remove() })

describe('ProductModal: the surface of the layout', () => {
  it('sheet (the default) is a dialog: the one that rises on a phone', async () => {
    mount(<Screen />)
    await screen.findByRole('dialog')
    expect(popup().getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('[data-slot=sheet-content]')).toBeNull()
  })

  it('steps is a panel from the right', async () => {
    mount(<Screen />, withLayout('steps'))
    await screen.findByRole('dialog')
    expect(popup().getAttribute('data-slot')).toBe('sheet-content')
    expect(popup().getAttribute('data-side')).toBe('right')
  })

  it('the width is the theme\'s product_modal.base.width, or the one the screen passes', async () => {
    const widthOf = async (props, theme) => {
      const { unmount } = mount(<Screen {...props} />, theme)
      await screen.findByRole('dialog')
      const value = portalOf(popup()).style.getPropertyValue('--ui-modal-width')
      unmount()
      return value
    }
    expect(await widthOf({})).toBe('830px')
    expect(await widthOf({}, withLayout('sheet', (values) => { values.components.product_modal.base.width = 900; return values }))).toBe('900px')
    expect(await widthOf({ width: '760px' })).toBe('760px')
    expect(await widthOf({ width: 'min(80%, 830px)' })).toBe('min(80%, 830px)')
    expect(await widthOf({ width: '830px' }, withLayout('steps'))).toBe('830px')
  })

  it('the close is the button of product_modal.slots.close, at the top end, named Close', async () => {
    const heightOf = async (size) => {
      const theme = withLayout('sheet', (values) => {
        values.components.product_modal.slots.close = { ...values.components.product_modal.slots.close, size }
        return values
      })
      const { unmount } = mount(<Screen />, theme)
      const close = await screen.findByRole('button', { name: 'Close' })
      expect(close.getAttribute('data-slot')).toBe('dialog-close-button')
      expect(popup().contains(close)).toBe(true)
      const height = close.style.getPropertyValue('--ui-button-height')
      unmount()
      return height
    }
    const small = await heightOf('sm')
    const large = await heightOf('lg')
    expect(small).not.toBe('')
    expect(small).not.toBe(large)
  })

  it('hideCloseDefault leaves it out (the screen closes it)', async () => {
    mount(<Screen hideCloseDefault />)
    await screen.findByRole('dialog')
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('carries the marker of its screen', async () => {
    mount(<Screen dataDocSection='product-customization-dialog' />)
    await screen.findByRole('dialog')
    expect(popup().getAttribute('data-doc-section')).toBe('product-customization-dialog')
  })
})

describe('ProductModal: closing', () => {
  it.each([['sheet'], ['steps']])('the close button, Escape and a press outside call onClose once (%s)', async (layout) => {
    for (const how of ['button', 'escape', 'outside']) {
      const onClose = vi.fn()
      const { unmount } = mount(<Screen onClose={onClose} />, withLayout(layout))
      const dialog = await screen.findByRole('dialog')
      if (how === 'button') fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      if (how === 'escape') fireEvent.keyDown(document.activeElement || dialog, { key: 'Escape' })
      if (how === 'outside') {
        const overlay = document.querySelector('[data-slot=dialog-overlay]')
        fireEvent.pointerDown(overlay)
        fireEvent.click(overlay)
      }
      await gone()
      expect(onClose).toHaveBeenCalledTimes(1)
      unmount()
    }
  })

  it('the name of the product names the dialog; without a product it is just a product', async () => {
    mount(<Screen />)
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Smoky burger')
    expect(document.getElementById('product-modal-name')).toHaveTextContent('Smoky burger')
  })

  it('moves the focus in and gives it back to what had it when the window is gone', async () => {
    mount(<Screen initial={false} />)
    const opener = screen.getByTestId('opener')
    opener.focus()
    fireEvent.click(opener)
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await gone()
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('locks the page scroll while it is open and gives it back', async () => {
    mount(<Screen />)
    await screen.findByRole('dialog')
    expect(document.documentElement.hasAttribute('data-base-ui-scroll-locked') || /hidden/.test(document.body.style.overflowY + document.documentElement.style.overflowY)).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await gone()
    await waitFor(() => expect(document.documentElement.hasAttribute('data-base-ui-scroll-locked')).toBe(false))
    expect(document.body.style.overflowY).not.toBe('hidden')
  })
})

// A legacy modal (login, address, the maximum alert) opened over the product window: what the
// legacy Popup builds, a `.popup-component` in `#app-modals` of the body, closing with Escape on its own
const LegacyOver = ({ onLegacyClose }) => {
  const [open, setOpen] = useState(true)
  const root = React.useMemo(() => {
    const el = document.createElement('div')
    el.id = 'app-modals'
    document.body.append(el)
    return el
  }, [])
  const close = () => { onLegacyClose(); setOpen(false) }
  React.useEffect(() => {
    const onKey = (e) => e.keyCode === 27 && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return open
    ? createPortal(
      <div className='popup-component' tabIndex={-1}>
        <div className='popup-dialog' role='dialog' aria-label='Sign in'>
          <input aria-label='Email' />
          <button type='button'>Inside the legacy modal</button>
        </div>
      </div>,
      root
    )
    : null
}

// on a phone the `sheet` layout is the bottom Sheet (a Drawer): the same cancel of Escape and of the press
const initialWidth = window.innerWidth
describe.each([
  ['a wide screen (dialog)', initialWidth, 'dialog-content'],
  ['a phone (bottom sheet)', 390, 'sheet-content']
])('ProductModal: a legacy modal over it, on %s', (_, width, slot) => {
  beforeEach(() => { window.innerWidth = width })
  afterEach(() => { window.innerWidth = initialWidth })

  it('Escape closes only the one on top; a press on it is not outside the product window', async () => {
    const onClose = vi.fn()
    const onLegacyClose = vi.fn()
    mount(
      <Screen onClose={onClose}>
        <ProductForm product={product} />
        <LegacyOver onLegacyClose={onLegacyClose} />
      </Screen>
    )
    const productWindow = await screen.findByRole('dialog', { name: 'Smoky burger' })
    expect(productWindow).toHaveAttribute('data-slot', slot)
    const legacy = await screen.findByRole('dialog', { name: 'Sign in' })
    const button = within(legacy).getByRole('button', { name: 'Inside the legacy modal' })
    fireEvent.pointerDown(button)
    fireEvent.mouseDown(button)
    fireEvent.click(button)
    expect(onClose).not.toHaveBeenCalled()
    // the focus stays where the legacy modal put it
    const email = within(legacy).getByLabelText('Email')
    act(() => email.focus())
    expect(document.activeElement).toBe(email)

    fireEvent.keyDown(email, { key: 'Escape', keyCode: 27 })
    await waitFor(() => expect(onLegacyClose).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Smoky burger' })).toBeInTheDocument()

    // alone again, Escape closes the product window
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    await gone()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

// The base dialogs of the screens (DialogOverlay, on the shared stack): one opened BEFORE the product
// (the upselling, opened from the cart or the checkout) and one after it (an address form)
describe('ProductModal: a base dialog under it and over it', () => {
  const Stacked = ({ onClose, onUnderClose, onOverClose }) => {
    const [showProduct, setShowProduct] = useState(false)
    const [showOver, setShowOver] = useState(false)
    return (
      <>
        <DialogOverlay open title='Upselling' onClose={onUnderClose}>
          <button type='button' onClick={() => setShowProduct(true)}>Choose</button>
        </DialogOverlay>
        {showProduct && (
          <ProductModal open onClose={() => { onClose(); setShowProduct(false) }}>
            <ProductForm product={product} />
            <button type='button' onClick={() => setShowOver(true)}>Address</button>
          </ProductModal>
        )}
        <DialogOverlay open={showOver} title='Address form' onClose={() => { onOverClose(); setShowOver(false) }}><input aria-label='Street' /></DialogOverlay>
      </>
    )
  }
  const productGone = () => waitFor(() => expect(screen.queryByRole('dialog', { name: 'Smoky burger' })).toBeNull())
  const setup = async () => {
    const handlers = { onClose: vi.fn(), onUnderClose: vi.fn(), onOverClose: vi.fn() }
    mount(<Stacked {...handlers} />)
    await screen.findByRole('dialog', { name: 'Upselling' })
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }))
    await screen.findByRole('dialog', { name: 'Smoky burger' })
    return handlers
  }

  it('Escape closes only the window, the one under it stays', async () => {
    const { onClose, onUnderClose } = await setup()
    fireEvent.keyDown(document.activeElement, { key: 'Escape', keyCode: 27 })
    await productGone()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onUnderClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Upselling' })).toBeInTheDocument()
  })

  it('one opened over the window is the one Escape closes; then the window, then the one under', async () => {
    const { onClose, onUnderClose, onOverClose } = await setup()
    fireEvent.click(screen.getByRole('button', { name: 'Address' }))
    const street = await screen.findByLabelText('Street')
    street.focus()
    fireEvent.keyDown(street, { key: 'Escape', keyCode: 27 })
    await waitFor(() => expect(onOverClose).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Smoky burger' })).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement, { key: 'Escape', keyCode: 27 })
    await productGone()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onUnderClose).not.toHaveBeenCalled()
  })
})

describe('ProductModal: the form in it', () => {
  it('its action bar is a child of what scrolls (the dialog\'s body), in the form', async () => {
    mount(<Screen />, withLayout('sheet'))
    await screen.findByRole('dialog')
    const actions = document.querySelector('[data-doc-section="product-actions"]')
    const form = document.querySelector('.product-container')
    const scroller = actions.closest('[class*="overflow-y-auto"]')
    expect(scroller.parentElement).toBe(popup())
    expect(scroller.contains(form)).toBe(true)
    // the bar and the chips are children of the form's column; the column is no box on a phone
    expect(actions.parentElement.parentElement).toBe(form)
    expect(document.querySelector('[data-doc-section="product-navigation"]')).not.toBeNull()
  })

  it('the layout the theme chose is the one the form says it draws', async () => {
    const layoutOf = async (theme) => {
      const { unmount } = mount(<Screen />, theme)
      await screen.findByRole('dialog')
      const value = document.querySelector('.product-container').getAttribute('data-doc-layout')
      unmount()
      return value
    }
    expect(await layoutOf(withLayout('card'))).toBe('card')
    expect(await layoutOf(withLayout('showcase'))).toBe('showcase')
    expect(await layoutOf(withLayout('sheet'))).toBe('sheet')
    expect(await layoutOf(withLayout('steps'))).toBe('steps')
  })

  it('beside the image from the desktop cut, only in the sheet layout (the steps stay one column)', async () => {
    const columns = async (theme) => {
      const { unmount } = mount(<Screen />, theme)
      await screen.findByRole('dialog')
      const css = Array.from(document.querySelectorAll('style')).map((el) => el.textContent).join('\n').replace(/\s+/g, '')
      const cls = document.querySelector('.product-container').className.split(' ').find((name) => css.includes(`.${name}{`) && !name.includes('-sc-'))
      const grid = new RegExp(`@media\\(min-width:769px\\)\\{\\.${cls}\\{[^}]*display:grid;grid-template-columns:42%minmax\\(0,1fr\\);padding:0;`).test(css)
      unmount()
      return grid
    }
    expect(await columns(withLayout('sheet'))).toBe(true)
    expect(await columns(withLayout('steps'))).toBe(false)
  })

  it('beside the image, the whole heading (name, description, price) keeps clear of the close, not only the name', async () => {
    const reserves = async (theme, selector) => {
      const { unmount } = mount(<Screen />, theme)
      await screen.findByRole('dialog')
      const css = Array.from(document.querySelectorAll('style')).map((el) => el.textContent).join('\n').replace(/\s+/g, '')
      const classes = document.querySelector(selector).className.split(' ').filter((name) => !name.includes('-sc-'))
      const reserved = classes.some((cls) => new RegExp(`@media\\(min-width:769px\\)\\{\\.${cls}\\{padding-inline-end:calc\\(`).test(css))
      unmount()
      return reserved
    }
    expect(await reserves(withLayout('sheet'), '[data-doc-section=product-details]')).toBe(true)
    expect(await reserves(withLayout('sheet'), '#product-modal-name')).toBe(false)
    // one column (steps): the image is over the form, the heading is below the close
    expect(await reserves(withLayout('steps'), '[data-doc-section=product-details]')).toBe(false)
  })
})
