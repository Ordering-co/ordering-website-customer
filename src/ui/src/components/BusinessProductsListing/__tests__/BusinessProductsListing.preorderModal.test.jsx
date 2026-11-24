import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { classicStoreTheme } from '../../../styles/__tests__/themeTestUtils'

// implementation notesthe Preorder button's modal (BusinessInfoComponent ->
// BusinessBasicInformation) is lifted into BusinessProductsListing, the same
// way pendingSchedule already is — RenderProductsLayout
// remounts BusinessBasicInformation (skeleton vs loaded) whenever the
// business reloads, which happens the instant a moment is picked
// (MomentOption applies it right away). Lifting the state here means the
// modal survives that remount.

vi.mock('~components/hooks/useFreeDeliveryProgress', () => ({
  useFreeDeliveryProgress: () => ({ status: 'none' })
}))
vi.mock('~ui/src/components/ProductForm', () => ({
  ProductForm: () => <div data-testid='product-form' />
}))
vi.mock('~ui/src/components/Cart', () => ({
  Cart: () => <div data-testid='cart' />
}))
vi.mock('~ui/src/components/MomentControl/OrderMomentDraft', () => ({
  OrderMomentDraft: ({ children, onConfirm }) => children(() => onConfirm(true))
}))
vi.mock('~ui/src/components/MomentContent', () => ({
  MomentContent: () => <div data-testid='moment-content' />
}))
// a real mount counter, same technique as the closedSchedule suite
//, to prove the modal's content is never remounted either
const businessPreorderMounts = { current: 0 }
vi.mock('~ui/src/components/BusinessPreorder', () => ({
  BusinessPreorder: ({ handleClick, showButton, buttonText }) => {
    React.useEffect(() => { businessPreorderMounts.current += 1 }, [])
    return (
      <div data-testid='business-preorder'>
        {showButton && <button type='button' onClick={() => handleClick?.()}>{buttonText || 'Go to menu'}</button>}
      </div>
    )
  }
}))

const business = { id: 1, slug: 'demo-store', open: true, categories: [{ id: 10, products: [] }] }

/**
 * Renders BusinessProductsListing with a RenderProductsLayout stand-in that
 * exposes the elevated isPreOrder/setIsPreOrder props via a button, the same
 * way the Preorder action inside BusinessInfoComponent would call them.
 */
const renderListing = async ({ isCustomerMode = false, carts = {} } = {}) => {
  vi.resetModules()
  businessPreorderMounts.current = 0

  const businessState = { business, loading: false, error: null }

  vi.doMock('~components/contexts/OrderContext', () => ({
    useOrder: () => [{ carts, options: { type: 1, moment: null }, loading: false }, { addProduct: vi.fn(), updateProduct: vi.fn() }]
  }))
  vi.doMock('~ui/src/components/RenderProductsLayout', () => ({
    // the entry button only exists while loaded, same as the real
    // BusinessBasicInformation/BusinessInfoComponent it stands in for here:
    // a reload (loading true -> false) unmounts and remounts it as a new,
    // previously-disconnected DOM node (implementation notes's a11y regression)
    RenderProductsLayout: ({ isPreOrder, setIsPreOrder, businessState }) => (
      <div data-testid='render-products-layout'>
        {!businessState?.loading && (
          <button type='button' data-doc-control='business-preorder-entry' data-testid='business-preorder-entry' onClick={() => setIsPreOrder(true)}>
            Preorder
          </button>
        )}
        <span data-testid='elevated-is-preorder'>{String(isPreOrder)}</span>
      </div>
    )
  }))
  vi.doMock('~components/components/BusinessAndProductList', () => ({
    BusinessAndProductList: ({ UIComponent, ...rest }) => {
      const [alertState, setAlertState] = React.useState({ open: false, content: [] })
      return (
        <UIComponent
          businessState={businessState}
          categoryState={{ products: [], loading: false }}
          categorySelected={{ id: 1, name: 'Menu' }}
          productModal={{ open: false }}
          updateProductModal={vi.fn()}
          onProductRedirect={vi.fn()}
          handleChangeSearch={vi.fn()}
          errors={[]}
          notFound={false}
          alertState={alertState}
          setAlertState={setAlertState}
          isCustomerMode={isCustomerMode}
          {...rest}
        />
      )
    }
  }))

  const { BusinessProductsListing } = await import('../index')
  const view = renderWithProviders(<BusinessProductsListing isCustomerMode={isCustomerMode} />, { theme: classicStoreTheme() })
  const rerender = () => view.rerender(<BusinessProductsListing isCustomerMode={isCustomerMode} />)
  return { ...view, rerender, businessState }
}

const openPreOrder = () => fireEvent.click(screen.getByTestId('business-preorder-entry'))
// the base dialog keeps the legacy dataDocSection as data-doc-section on its popup
const preorderDialog = () => document.querySelector('[data-slot="dialog-content"][data-doc-section="business-preorder-dialog"]')

describe('BusinessProductsListing: the Preorder modal survives a business reload', () => {
  it('opens its own preorder dialog when the elevated setIsPreOrder fires', async () => {
    await renderListing()
    await act(async () => { openPreOrder() })
    expect(preorderDialog()).toBeInTheDocument()
    expect(screen.getByTestId('business-preorder')).toBeInTheDocument()
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    // its close (the X) closes it: closePreOrder
    fireEvent.click(within(preorderDialog()).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(preorderDialog()).toBeNull())
    expect(screen.getByTestId('elevated-is-preorder')).toHaveTextContent('false')
  })

  it('regression: a reload (loading true -> false) does not remount or close it; Save closes it', async () => {
    const { businessState, rerender } = await renderListing()

    await act(async () => { openPreOrder() })
    expect(preorderDialog()).toBeInTheDocument()
    expect(businessPreorderMounts.current).toBe(1)

    // a moment picked inside BusinessPreorder/MomentOption applies at once
    // and reloads the business — the exact transition that used to remount
    // BusinessBasicInformation (and this modal with it, implementation notes)
    businessState.loading = true
    await act(async () => { rerender() })
    businessState.loading = false
    await act(async () => { rerender() })

    expect(preorderDialog()).toBeInTheDocument()
    expect(businessPreorderMounts.current).toBe(1)

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save' })) })
    await waitFor(() => expect(preorderDialog()).toBeNull())
  })

  it('customer mode: renders MomentContent instead of BusinessPreorder', async () => {
    await renderListing({ isCustomerMode: true })
    await act(async () => { openPreOrder() })
    expect(preorderDialog()).toBeInTheDocument()
    expect(screen.getByTestId('moment-content')).toBeInTheDocument()
    expect(screen.queryByTestId('business-preorder')).not.toBeInTheDocument()
  })

  it('restores focus to the remounted Preorder button after committing Save', async () => {
    const { businessState, rerender } = await renderListing()

    const originalEntry = screen.getByTestId('business-preorder-entry')
    originalEntry.focus()
    await act(async () => { openPreOrder() })

    // the moment picked inside reloads the business, unmounting and
    // remounting the entry button as a brand-new DOM node
    businessState.loading = true
    await act(async () => { rerender() })
    businessState.loading = false
    await act(async () => { rerender() })

    const entry = screen.getByTestId('business-preorder-entry')
    expect(originalEntry).not.toBeInTheDocument()
    const save = screen.getByRole('button', { name: 'Save' })
    save.focus()
    expect(save).toHaveFocus()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      await act(async () => {
        fireEvent.click(save)
        // A zero-delay timer can run while React still has the close queued.
        vi.advanceTimersByTime(0)
        expect(save).toHaveFocus()
      })
    } finally {
      vi.useRealTimers()
    }

    expect(preorderDialog()).toBeNull()
    expect(entry).toHaveFocus()
  })
})

it('announces an empty cart after the last product disappears and restores focus on close', async () => {
  const cart = { uuid: 'fixture-cart', business, products: [{ id: 42 }], total: 5 }
  const { rerender } = await renderListing({ carts: { [cart.uuid]: cart } })
  const opener = screen.getByRole('button', { name: 'View cart' })
  opener.focus()
  fireEvent.click(opener)
  expect(await screen.findByTestId('cart')).toBeInTheDocument()

  cart.products = []
  rerender()
  const dialog = screen.getByRole('dialog', { name: 'Your cart' })
  expect(within(dialog).getByRole('status')).toHaveTextContent('Empty cart')
  expect(within(dialog).queryByRole('button', { name: 'Empty cart' })).toBeNull()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
  await waitFor(() => expect(dialog).not.toBeInTheDocument())
  const menu = document.querySelector('[data-doc-section=business-menu]')
  await waitFor(() => expect(menu).toContainElement(document.activeElement))
})
