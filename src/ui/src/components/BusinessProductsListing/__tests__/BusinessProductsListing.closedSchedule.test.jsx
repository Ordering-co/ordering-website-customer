import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'

// implementation notesASAP + closed shows the full menu (showMenuWhenClosed) and,
// unlike implementation notes, a product click opens the product form directly —
// never a schedule modal first. The form itself (ProductForm, its own
// tests) renders read-only with a closed notice and, with preorder
// enabled, a "Schedule for later" button; this listing only owns: passing
// that button a callback (onRequestSchedule), rendering BusinessPreorder on
// top of the already-open product when it fires, and — once a valid moment
// is confirmed and a reload for it has been observed — swapping in the
// fresh product so the form reactivates, without ever closing it.

vi.mock('~components/hooks/useFreeDeliveryProgress', () => ({
  useFreeDeliveryProgress: () => ({ status: 'none' })
}))
vi.mock('~ui/src/components/ProductForm', () => ({
  ProductForm: ({ product, onRequestSchedule, schedulePending }) => (
    <div
      data-testid='product-form'
      data-product-id={product?.id}
      data-product-name={product?.name}
      data-schedule-available={String(product?.schedule_available)}
      data-schedule-pending={String(!!schedulePending)}
    >
      {onRequestSchedule && (
        <button type='button' onClick={() => onRequestSchedule()}>Schedule for later</button>
      )}
    </div>
  )
}))
vi.mock('~ui/src/components/Cart', () => ({
  Cart: () => <div data-testid='cart' />
}))
vi.mock('~ui/src/components/MomentControl/OrderMomentDraft', () => ({
  OrderMomentDraft: ({ children, onConfirm }) => children(() => onConfirm({ changed: true, moment: '2026-10-21 09:00:00' }))
}))
// a dataDocSection-scoped testid so the product-customization modal and the
// preorder modal (layered on top of it) are told apart, plus a close button
// that fires the Modal's own onClose
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children, 'data-doc-section': dataDocSection, onClose }) => {
    const testId = dataDocSection || 'modal'
    return open
      ? (
        <div data-testid={testId}>
          {children}
          <button type='button' data-testid={`${testId}-close`} onClick={() => onClose?.()}>Close</button>
        </div>
        )
      : null
  }
}))
// the product window is its own piece (ProductModal): the same stand-in, marked by its
// dataDocSection, so the preorder modal layered on top is still told apart
vi.mock('~ui/src/components/ProductForm/ProductModal', () => ({
  ProductModal: ({ open, children, dataDocSection, onClose, width }) => (open
    ? (
      <div data-testid={dataDocSection} data-width={width}>
        {children}
        <button type='button' data-testid={`${dataDocSection}-close`} onClick={() => onClose?.()}>Close</button>
      </div>
      )
    : null)
}))
// showButton: BusinessPreorder's own "Go to menu" confirm step.
// businessPreorderMounts counts real mounts (a mount effect, not a
// re-render) so a regression test can tell a reload that merely re-rendered
// the modal apart from one that unmounted and remounted it.
const businessPreorderMounts = { current: 0 }
vi.mock('~ui/src/components/BusinessPreorder', () => ({
  BusinessPreorder: ({ handleClick, showButton }) => {
    React.useEffect(() => { businessPreorderMounts.current += 1 }, [])
    return (
      <div data-testid='business-preorder'>
        {showButton && <button type='button' onClick={() => handleClick?.()}>Go to menu</button>}
      </div>
    )
  }
}))

const product = (overrides = {}) => ({ id: 55, name: 'Combo', extras: [{ id: 1 }], category_id: 10, ...overrides })

/**
 * Renders a fresh BusinessProductsListing with a controllable business/order
 * state: `businessState` and `orderOptions` are mutable objects the test can
 * change and then `rerender()` with, simulating the business reloading after
 * a moment is scheduled. Each scenario gets its own module graph (module
 * -level singleton state elsewhere in the app, same as the pickup tests).
 */
const renderListing = async ({
  configs = { preorder_status_enabled: { value: '1' } },
  business = { id: 1, slug: 'demo-store', open: false, categories: [{ id: 10, products: [product()] }] },
  auth = true,
  clicked = product(),
  isQuickAddProduct = false,
  listingProps = {}
} = {}) => {
  vi.resetModules()
  businessPreorderMounts.current = 0

  const orderOptions = { type: 1, moment: null }
  const businessState = { business, loading: false, error: null }
  const updateProductModalMock = vi.fn()
  const onProductRedirectMock = vi.fn()
  const addProductMock = vi.fn()
  const updateProductMock = vi.fn()

  vi.doMock('~components/contexts/ConfigContext', () => ({
    useConfig: () => [{ configs: { ...configs, ...(isQuickAddProduct ? { add_product_with_one_click: { value: '1' } } : {}) } }]
  }))
  vi.doMock('~components/contexts/OrderContext', () => ({
    useOrder: () => [{ carts: {}, options: orderOptions, loading: false }, { addProduct: addProductMock, updateProduct: updateProductMock }]
  }))
  vi.doMock('~components/contexts/SessionContext', () => ({
    useSession: () => [{ auth, user: {} }, { login: vi.fn() }]
  }))
  vi.doMock('~ui/src/components/RenderProductsLayout', () => ({
    RenderProductsLayout: ({ onProductClick, handleCustomProductBannerClick }) => (
      <div data-testid='render-products-layout'>
        <button type='button' data-testid='click-product' onClick={() => onProductClick(clicked)}>
          Click product
        </button>
        <button type='button' data-testid='click-banner-product' onClick={() => handleCustomProductBannerClick(product())}>
          Click banner product
        </button>
      </div>
    )
  }))
  vi.doMock('~components/components/BusinessAndProductList', () => ({
    BusinessAndProductList: ({ UIComponent, ...rest }) => {
      const [alertState, setAlertState] = React.useState({ open: false, content: [] })
      const [productModal, setProductModal] = React.useState({ product: null, loading: false, error: null })
      return (
        <UIComponent
          businessState={businessState}
          categoryState={{ products: [], loading: false }}
          categorySelected={{ id: 1, name: 'Menu' }}
          productModal={productModal}
          updateProductModal={(val) => { updateProductModalMock(val); setProductModal((prev) => ({ ...prev, product: val })) }}
          onProductRedirect={onProductRedirectMock}
          handleChangeSearch={vi.fn()}
          errors={[]}
          notFound={false}
          setNotFound={vi.fn()}
          alertState={alertState}
          setAlertState={setAlertState}
          {...rest}
        />
      )
    }
  }))

  const { BusinessProductsListing } = await import('../index')
  const view = renderWithProviders(<BusinessProductsListing {...listingProps} />)
  const rerender = () => view.rerender(<BusinessProductsListing {...listingProps} />)
  return { ...view, rerender, orderOptions, businessState, updateProductModalMock, onProductRedirectMock, addProductMock, updateProductMock }
}

const clickGoToMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Go to menu' }))
const clickScheduleForLater = () => fireEvent.click(screen.getByRole('button', { name: 'Schedule for later' }))

describe('BusinessProductsListing: the product window', () => {
  it('is as wide as the store\'s product_modal.base.width; a kiosk\'s is 80% up to it', async () => {
    const { unmount } = await renderListing()
    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })
    expect(screen.getByTestId('product-customization-dialog')).toHaveAttribute('data-width', '830px')
    unmount()

    await renderListing({ listingProps: { useKioskApp: true } })
    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })
    expect(screen.getByTestId('product-customization-dialog')).toHaveAttribute('data-width', 'min(80%, 830px)')
  })

  it('closing it clears the product, the state and the URL (back to the store\'s own)', async () => {
    const { updateProductModalMock, onProductRedirectMock } = await renderListing()
    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })
    expect(onProductRedirectMock).toHaveBeenCalled()
    onProductRedirectMock.mockClear()
    updateProductModalMock.mockClear()

    await act(async () => { fireEvent.click(screen.getByTestId('product-customization-dialog-close')) })

    expect(screen.queryByTestId('product-customization-dialog')).not.toBeInTheDocument()
    expect(updateProductModalMock).toHaveBeenCalledWith(null)
    expect(onProductRedirectMock).toHaveBeenLastCalledWith({ slug: 'demo-store' })
  })
})

describe('BusinessProductsListing: closed + ASAP opens the product read-only', () => {
  it('closed, preorder enabled: opens the product form directly, with a "Schedule for later" button, no schedule modal first', async () => {
    await renderListing()

    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })

    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('product-form')).toHaveAttribute('data-product-id', '55')
    expect(screen.queryByTestId('business-preorder-dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Schedule for later' })).toBeInTheDocument()
  })

  it('handleCustomProductBannerClick opens the product form directly too, same as a click', async () => {
    await renderListing()

    await act(async () => { fireEvent.click(screen.getByTestId('click-banner-product')) })

    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('business-preorder-dialog')).not.toBeInTheDocument()
  })

  it('closed + unscheduled never quick-adds, even with quick-add enabled: opens the form instead', async () => {
    const quickAddProduct = product({ extras: [], inventoried: false })
    await renderListing({ isQuickAddProduct: true, clicked: quickAddProduct })

    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })

    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
  })

  it('the form\'s own "Schedule for later" button opens the preorder modal layered on top, without closing the form', async () => {
    await renderListing()

    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })
    expect(screen.getByTestId('product-form')).toHaveAttribute('data-schedule-pending', 'false')
    await act(async () => { clickScheduleForLater() })

    expect(screen.getByTestId('business-preorder-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
    // The form stays read-only until the confirmed moment's menu is ready.
    expect(screen.getByTestId('product-form')).toHaveAttribute('data-schedule-pending', 'true')
  })

  it('requires a fresh response even when a menu for that moment was already loaded', async () => {
    const { orderOptions, businessState, updateProductModalMock, rerender } = await renderListing()

    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })
    await act(async () => { clickScheduleForLater() })
    expect(screen.getByTestId('business-preorder-dialog')).toBeInTheDocument()

    // The catalog may contain a previously loaded response for the same
    // moment. A new confirmation must wait for a new response.
    const scheduled = product({ name: 'Combo (scheduled)' })
    businessState.business = { ...businessState.business, categories: [{ id: 10, products: [scheduled] }] }
    orderOptions.moment = '2026-10-21 09:00:00'
    businessState.menuLoad = { id: 1, moment: orderOptions.moment, status: 'ready' }
    await act(async () => { rerender() })

    // not confirmed yet: must not swap, the preorder modal stays, the form
    // keeps showing the original product
    expect(screen.getByTestId('business-preorder-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('product-form')).toHaveAttribute('data-product-name', 'Combo')

    // the user now clicks BusinessPreorder's own "Go to menu"
    await act(async () => { clickGoToMenu() })
    expect(screen.getByTestId('business-preorder-dialog')).toBeInTheDocument()
    expect(updateProductModalMock).not.toHaveBeenCalledWith(scheduled)

    businessState.menuLoad = { id: 2, moment: orderOptions.moment, status: 'ready' }
    await act(async () => { rerender() })
    expect(screen.queryByTestId('business-preorder-dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
    expect(updateProductModalMock).toHaveBeenCalledWith(scheduled)
    expect(screen.getByTestId('product-form')).toHaveAttribute('data-product-name', 'Combo (scheduled)')
  })

  it('implementation notes regression: the preorder modal is not remounted by the business reload once a moment is chosen', async () => {
    const { orderOptions, businessState, rerender } = await renderListing()

    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })
    await act(async () => { clickScheduleForLater() })
    expect(screen.getByTestId('business-preorder-dialog')).toBeInTheDocument()
    expect(businessPreorderMounts.current).toBe(1)

    orderOptions.moment = '2026-10-21 09:00:00'
    businessState.loading = true
    await act(async () => { rerender() })
    businessState.loading = false
    await act(async () => { rerender() })

    expect(screen.getByTestId('business-preorder-dialog')).toBeInTheDocument()
    expect(businessPreorderMounts.current).toBe(1)
  })

  it('confirming before the reload starts waits for it, then swaps in the product, form never closed', async () => {
    const { businessState, orderOptions, rerender } = await renderListing()

    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })
    await act(async () => { clickScheduleForLater() })
    orderOptions.moment = '2026-10-21 09:00:00'
    await act(async () => { clickGoToMenu() })

    // The confirmed picker stays open while its reload is pending.
    expect(screen.getByTestId('business-preorder-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()

    businessState.loading = true
    await act(async () => { rerender() })
    businessState.loading = false
    businessState.menuLoad = { id: 1, moment: orderOptions.moment, status: 'ready' }
    await act(async () => { rerender() })
    expect(screen.queryByTestId('business-preorder-dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
  })

  it('if the resumed product is no longer on the menu, alerts and forces the form read-only (not active with stale data)', async () => {
    const business = { id: 1, slug: 'demo-store', open: false, categories: [{ id: 10, products: [] }] }
    const { orderOptions, businessState, updateProductModalMock, rerender } = await renderListing({ business })

    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })
    await act(async () => { clickScheduleForLater() })
    orderOptions.moment = '2026-10-21 09:00:00'
    await act(async () => { clickGoToMenu() })
    businessState.loading = true
    await act(async () => { rerender() })
    businessState.loading = false
    businessState.menuLoad = { id: 1, moment: orderOptions.moment, status: 'ready' }
    await act(async () => { rerender() })

    expect(screen.queryByTestId('business-preorder-dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('alert')).toHaveTextContent('This product is not available.')
    // implementation notes review: never active with the stale pre-schedule data —
    // the stale product is re-shown with schedule_available forced false,
    // so ProductForm's own predicate keeps it read-only
    expect(updateProductModalMock).toHaveBeenCalledWith(expect.objectContaining({ id: 55, schedule_available: false }))
    expect(screen.getByTestId('product-form')).toHaveAttribute('data-schedule-available', 'false')
  })

  it('if the resumed product\'s own schedule still rules it out, alerts, swaps in the still-unavailable product, keeps the form open', async () => {
    const unavailable = product({ schedule_available: false })
    const business = { id: 1, slug: 'demo-store', open: false, categories: [{ id: 10, products: [unavailable] }] }
    const { orderOptions, businessState, updateProductModalMock, rerender } = await renderListing({ business })

    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })
    await act(async () => { clickScheduleForLater() })
    orderOptions.moment = '2026-10-21 09:00:00'
    await act(async () => { clickGoToMenu() })
    businessState.loading = true
    await act(async () => { rerender() })
    businessState.loading = false
    businessState.menuLoad = { id: 1, moment: orderOptions.moment, status: 'ready' }
    await act(async () => { rerender() })

    // no modal loop: the preorder dialog does not reopen, the product
    // dialog stays visible (still disabled: ProductForm computes that from
    // schedule_available itself, see its own tests)
    expect(screen.queryByTestId('business-preorder-dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
    expect(updateProductModalMock).toHaveBeenCalledWith(unavailable)
    expect(screen.getByTestId('alert')).toHaveTextContent('This product is not available.')
  })

  it('implementation notesdismissing the schedule leaves the original form in place even if an order moment already exists', async () => {
    const { orderOptions, businessState, updateProductModalMock, rerender } = await renderListing()

    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })
    await act(async () => { clickScheduleForLater() })
    expect(screen.getByTestId('business-preorder-dialog')).toBeInTheDocument()

    // The order can already have a moment, for example when the product
    // was unavailable for that slot.
    const scheduled = product({ name: 'Combo (scheduled)' })
    businessState.business = { ...businessState.business, categories: [{ id: 10, products: [scheduled] }] }
    orderOptions.moment = '2026-10-21 09:00:00'
    businessState.loading = true
    await act(async () => { rerender() })
    businessState.loading = false
    await act(async () => { rerender() })

    // the user closes the picker with the X instead of "Go to menu"
    await act(async () => { fireEvent.click(screen.getByTestId('business-preorder-dialog-close')) })

    expect(screen.queryByTestId('business-preorder-dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
    expect(updateProductModalMock).not.toHaveBeenCalledWith(scheduled)
    expect(screen.getByTestId('product-form')).toHaveAttribute('data-product-name', 'Combo')
    expect(screen.getByTestId('product-form')).toHaveAttribute('data-schedule-pending', 'false')
  })

  it('dismissing the schedule (closing the preorder modal) drops the pending product: a later valid moment does not alter the form', async () => {
    const { orderOptions, rerender } = await renderListing()

    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })
    await act(async () => { clickScheduleForLater() })
    expect(screen.getByTestId('business-preorder-dialog')).toBeInTheDocument()
    await act(async () => { fireEvent.click(screen.getByTestId('business-preorder-dialog-close')) })
    expect(screen.queryByTestId('business-preorder-dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()

    orderOptions.moment = '2026-10-21 09:00:00'
    await act(async () => { rerender() })

    expect(screen.queryByTestId('business-preorder-dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('product-form')).toHaveAttribute('data-product-name', 'Combo')
  })

  it('closed, preorder disabled: opens the product form with no "Schedule for later" button and no alert', async () => {
    await renderListing({ configs: {} })

    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })

    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('business-preorder-dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Schedule for later' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('alert')).not.toBeInTheDocument()
  })

  it('open business: the click opens the product form as before, no preorder modal', async () => {
    const business = { id: 1, slug: 'demo-store', open: true, categories: [{ id: 10, products: [product()] }] }
    await renderListing({ business })

    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })

    expect(screen.queryByTestId('business-preorder-dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
  })

  it('open business: a product with schedule_available false still opens the form as before', async () => {
    const business = { id: 1, slug: 'demo-store', open: true, categories: [{ id: 10, products: [product()] }] }
    await renderListing({ business, clicked: product({ schedule_available: false }) })

    await act(async () => { fireEvent.click(screen.getByTestId('click-product')) })

    expect(screen.queryByTestId('business-preorder-dialog')).not.toBeInTheDocument()
    expect(screen.queryByTestId('alert')).not.toBeInTheDocument()
    expect(screen.getByTestId('product-customization-dialog')).toBeInTheDocument()
  })
})
