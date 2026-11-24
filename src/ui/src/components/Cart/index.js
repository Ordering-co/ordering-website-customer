import React, { useState, useEffect } from 'react'
import { useTheme } from 'styled-components'
import { CartStudentAlert } from '../CartStudentAlert'
import { getUtils } from '../PaymentOptionWallet/utils'
import { RewardsBanner } from '../RewardsBanner'
import { getTaxesByTarget, getTaxAmount, shouldShowTaxBillRow } from '../../../utils/taxBillUtils'
import { getFeeAmount, shouldShowFeeItem } from '../../../utils/feeBillUtils'

import {
  CartContainer,
  OrderBill,
  CheckoutAction,
  CheckoutButtonSlot,
  CouponContainer,
  CartSticky,
  CommentLabel,
  CommentSaving,
  CommentSavingStatus,
  CommentContainer,
  IconContainer,
  DeliveryFeeStrikethrough,
  DeliveryFeeFreeLabel,
  NoValidProductMessage,
  InvalidCartMessage,
  DriverTipContainer,
  CartUpdatingStatus,
  TotalSpinner,
  ReservationAlert,
  TaxesFeesToggle
} from './styles'

import { Cart as CartController } from '~components/components/Cart'
import { useOrder } from '~components/contexts/OrderContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useEvent } from '~components/contexts/EventContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useValidationFields } from '~components/contexts/ValidationsFieldsContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useSite } from '~components/contexts/SiteContext'
import { useCustomer } from '~components/contexts/CustomerContext'

import { Button } from '~ui/src/design-system/components/Button'
import { Confirm } from '~ui/src/components/Confirm'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Textarea } from '~ui/src/design-system/components/Textarea'
import { ChevronIcon } from '~ui/src/styles/Chevron'
import { Spinner } from '~ui/src/styles/Spinner'
import { useDelayedFlag } from '~ui/hooks/useDelayedFlag'
import { useBusyLines } from '~ui/hooks/useBusyLines'
import { getCateringValues, verifyDecimals, generalUtilities, capitalize } from '~ui/utils'
import { ProductItemAccordion } from '~ui/src/components/ProductItemAccordion'
import { BusinessItemAccordion } from '~ui/src/components/BusinessItemAccordion'
import { CouponControl } from '~ui/src/components/CouponControl'
import { ProductForm } from '~ui/src/components/ProductForm'
import { ProductModal } from '~ui/src/components/ProductForm/ProductModal'
import { UpsellingPage } from '~ui/src/components/UpsellingPage'
import { CartStoresListing } from '~ui/src/components/CartStoresListing'
import { DriverTips } from '~ui/src/components/DriverTips'
import { MomentContent } from '~ui/src/components/MomentContent'
import { ServiceForm } from '~ui/src/components/ServiceForm'
import { TaxInformation } from '~ui/src/components/TaxInformation'
import { TaxBillRows } from '~ui/src/components/TaxBillRows'
import { FeeBillRows } from '~ui/src/components/FeeBillRows'
import { FreeDeliveryProgress } from '~ui/src/components/FreeDeliveryProgress'

import { Icon } from '~ui/src/design-system/components/Icon'
import { themeIconSize, themeTextStyle } from '~/utils/themeTokens'
import { slotButtonOptions } from '~/utils/themeGroups'
import { themeHidden, themeVisible } from '~/utils/themeVisibility'
import { Tooltip, TooltipContent, TooltipTrigger } from '~ui/src/design-system/components/Tooltip'

const deliveryTypes = [1, 7]
const pickupTypes = [2, 8]

// the sm ring of the total (hidden from assistive technology; the status says it)
const TotalRing = () => <Spinner $size='sm' data-doc-control='cart-total-spinner' />

const FreeDeliveryInfo = ({ label, children }) => {
  const theme = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <Tooltip open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <TooltipTrigger
        delay={0}
        closeOnClick={false}
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        render={<Button size='xs' shape='icon' appearance='ghost' borderInset className='delivery-tooltip-trigger' aria-label={label} />}
      >
        <Icon name='infoCircle' size={themeIconSize(theme, 'md')} aria-hidden />
      </TooltipTrigger>
      <TooltipContent side='top' align='start'>{children}</TooltipContent>
    </Tooltip>
  )
}

export const CartUI = (props) => {
  const {
    currentCartUuid,
    clearCart,
    isProducts,
    changeQuantity,
    getProductMax,
    offsetDisabled,
    removeProduct,
    onClickCheckout,
    isCheckout,
    useKioskApp,
    isCartPending,
    isCartPopover,
    isForceOpenCart,
    isCartOnProductsList,
    handleCartOpen,
    highlightProductCode,
    isCustomMode,
    isStore,
    handleChangeComment,
    commentState,
    handleRemoveOfferClick,
    setPreorderBusiness,
    cart: cartMulticart,
    hideDeliveryFee,
    hideDriverTip,
    hideCouponInput,
    businessConfigs,
    loyaltyRewardRate,
    cashRewardRate,
    isCustomerMode,
    productLoading,
    setProductLoading,
    hideCommentsByValidationCheckout,
    hideCouponByValidationCheckout,
    forceHideCheckoutButton,
    forceHideAddMoreProducts,
    isInCartGroup,
    forceHideComments,
    forceHideCoupon,
    forceHideUpselling,
    forceHideBusiness,
    forcehideDriverTypes,
    callbackAfterUpdateCart,
    showUpsellingInBusinessInfo,
    showDiscountInCart,
    hideProductList,
    hideOrderBill,
    freeDeliveryProgress
  } = props

  const theme = useTheme()
  // the Clear cart's options (a slot's shape is not taken: the legacy slotButtonProps never passed it)
  const { shape: _clearShape, ...clearCartOptions } = slotButtonOptions(theme, 'cart', 'clear', { color: 'danger', appearance: 'ghost', size: 'md' })
  const [, t] = useLanguage()
  const [orderState] = useOrder()
  const [events] = useEvent()
  const [{ parsePrice, parseNumber, parseDate, preorderDateFormat, timeFormat }] = useUtils()
  const [validationFields] = useValidationFields()
  const [{ configs }] = useConfig()
  const [{ site }] = useSite()
  const [{ user }] = useCustomer()
  const { walletName } = generalUtilities()
  const { getIcon } = getUtils()

  // "Total to pay" under the wallet payments (visibility.cart.balance_total, off by default)
  const hideBalanceTotal = themeHidden(theme, 'cart.balance_total')
  // the "Taxes and fees" line opens to its breakdown (visibility.cart.taxes_detail)
  const showTaxesDetail = themeVisible(theme, 'cart.taxes_detail')

  const driverTipsOptions = typeof configs?.driver_tip_options?.value === 'string'
    ? JSON.parse(configs?.driver_tip_options?.value) || []
    : configs?.driver_tip_options?.value || []
  const allowDriverTipPickup = configs?.driver_tip_allowed_at_pickup?.value === '1' && pickupTypes.includes(orderState?.options?.type)

  const [confirm, setConfirm] = useState({ open: false, content: null, handleOnAccept: null })
  const [openProduct, setModalIsOpen] = useState(false)
  const [curProduct, setCurProduct] = useState({})
  const [openUpselling, setOpenUpselling] = useState(false)
  const [canOpenUpselling, setCanOpenUpselling] = useState(false)
  const [openTaxModal, setOpenTaxModal] = useState({ open: false, tax: null })
  const [isUpselling, setIsUpselling] = useState(false)
  const [openChangeStore, setOpenChangeStore] = useState(false)
  // taxes & service fees are collapsed under a single "Taxes and fees" row, expandable on demand
  const [showTaxesFeesDetail, setShowTaxesFeesDetail] = useState(false)

  // the comment saves on its own a moment after the last key: the indicator
  // only shows when that save is slow, so a quick one flashes nothing
  const savingComment = useDelayedFlag(!!commentState?.loading)

  // The cart is "updating" while a product changes: a save from the product
  // window (`productLoading`, which the page shares with the menu's quick add),
  // or one of this cart's lines changing its quantity, being removed or edited.
  // It is the cart's own state, not the order's `loading`, which is also true
  // for an address, a coupon or a tip and says nothing about the lines.
  // A line is touched when this cart changes its quantity, removes it or edits
  // it; an add with no line before (the menu) touches none, so only the total
  // shows it.
  const { codes: busyLineCodes, track: trackLine } = useBusyLines()
  const [editingCode, setEditingCode] = useState(null)
  const updatingLineCodes = editingCode == null ? busyLineCodes : [...busyLineCodes, editingCode]
  const cartUpdating = !!productLoading || updatingLineCodes.length > 0
  // the clicks stop at once; what the customer sees (rings, softened line, busy button) waits for the
  // delay, so an update that answers quickly flashes nothing
  const showUpdating = useDelayedFlag(cartUpdating)

  const businessUrlTemplate = site?.business_url_template || '/store/:business_slug'

  const isCouponEnabled = validationFields?.fields?.checkout?.coupon?.enabled
  const cateringTypes = [7, 8]
  const isMultiCheckout = configs?.checkout_multi_business_enabled?.value === '1'
  const cart = cartMulticart || orderState?.carts?.[`businessId:${props.cart?.business_id}`]
  const viewString = isStore ? 'business_view' : 'header'
  // visibility.cart.* is the cart's in every place, the checkout's included
  const hideCartComments = (isCheckout ? hideCommentsByValidationCheckout : !validationFields?.fields?.checkout?.comments?.enabled) || themeHidden(theme, 'cart.comments')
  const hideCartDiscount = (isCheckout ? hideCouponByValidationCheckout : !validationFields?.fields?.checkout?.coupon?.enabled) || themeHidden(theme, 'cart.discount_coupon')
  const cateringTypeString = orderState?.options?.type === 7
    ? 'catering_delivery'
    : orderState?.options?.type === 8
      ? 'catering_pickup'
      : null

  const cateringValues = businessConfigs && getCateringValues(cateringTypeString, businessConfigs)
  const extraValueMetafields = cart?.metafields?.filter?.(meta => meta?.key?.startsWith('extra_value_')) || []
  const hasNoReservation = !cart?.reservation && orderState?.options?.type === 9
  const isInvalidCart = cart?.valid === false && !isCartPending
  const invalidCartReasons = isInvalidCart && !isCheckout
    ? [
        cart?.valid_schedule === false && t('ERROR_ADD_PRODUCT_BUSINESS_CLOSED', 'The business is closed at the moment'),
        cart?.valid_schedule !== false && cart?.valid_preorder === false && t('INVALID_CART_MOMENT', 'Selected schedule time is invalid, please select a schedule into the business schedule interval.'),
        cart?.valid_address === false && t('INVALID_CART_ADDRESS', 'Selected address is invalid, please select a closer address.')
      ].filter(Boolean)
    : []

  const getIncludedTaxes = (isDeliveryFee) => {
    if (cart?.taxes === null) {
      return cart?.business.tax_type === 1 ? cart?.tax : 0
    } else {
      return cart?.taxes.reduce((taxIncluded, tax) => {
        return taxIncluded + (((!isDeliveryFee && tax.type === 1 && tax.target === 'product') || (isDeliveryFee && tax.type === 1 && tax.target === 'delivery_fee')) ? tax.summary?.tax : 0)
      }, 0)
    }
  }

  const subtotalWithTaxes = cart?.taxes?.reduce((acc, item) => {
    if (item?.type === 1) {
      return acc = acc + item?.summary?.tax
    }
    return acc
  }, cart?.subtotal)
  const belowMinimum = cart?.reservation ? !cart?.valid_minimum : subtotalWithTaxes < cart?.minimum
  // Checkout is disabled for the cart's validity (its own look); busy only adds to an enabled one
  const checkoutInvalid = (openUpselling && !canOpenUpselling) || !cart?.valid_maximum || belowMinimum || !cart?.valid_address || hasNoReservation
  const clearAmount = (value) => parseFloat((Math.trunc(value * 100) / 100).toFixed(configs.format_number_decimal_length?.value ?? 2))
  const deliveryFeeTotalWithIncludedTax = clearAmount((cart?.delivery_price_with_discount ?? 0) + getIncludedTaxes(true))
  const deliveryFeeOffers = cart?.offers?.filter(offer => offer?.target === 2) || []
  const hasDeliveryFeeOffer = deliveryFeeOffers.length > 0
  const freeDeliveryExtraMetafield = cart?.metafields?.find?.((meta) => meta?.key === 'extra_value_free_delivery')
  const freeDeliveryExtraParsed = parseFloat(freeDeliveryExtraMetafield?.value)
  const isDeliveryFreeByExtraMetafield =
    Boolean(freeDeliveryExtraMetafield) &&
    Number.isFinite(freeDeliveryExtraParsed) &&
    freeDeliveryExtraParsed < 0 &&
    clearAmount(-freeDeliveryExtraParsed) === deliveryFeeTotalWithIncludedTax

  // group the product taxes + service fees into one collapsible "Taxes and fees" line.
  // Reuse the exact same accessors the detail rows render with, so the summary always matches the breakdown.
  const productTaxRows = getTaxesByTarget(cart?.taxes, 'product').filter(shouldShowTaxBillRow)
  const feeRows = (cart?.fees ?? []).filter(shouldShowFeeItem)
  const taxesAndFeesCount = productTaxRows.length + feeRows.length
  const taxesAndFeesSubtotal =
    productTaxRows.reduce((sum, tax) => sum + (getTaxAmount(tax) ?? 0), 0) +
    feeRows.reduce((sum, fee) => sum + (getFeeAmount(fee) ?? 0), 0)

  const freeDeliveryPartnerNameMeta = cart?.metafields?.find?.((meta) => meta?.key === 'free_delivery_partner_name')
  const freeDeliveryPartnerName = String(freeDeliveryPartnerNameMeta?.value ?? '').trim()
  const freeDeliveryPartnerTooltip = freeDeliveryPartnerName
    ? t(
      'FREE_DELIVERY_FOR',
      'Free delivery for'
    ) + ' ' + freeDeliveryPartnerName + ' ' + t('CARDHOLDERS', 'cardholders')
    : t('FREE_DELIVERY_APPLIED_TOOLTIP', 'Free delivery applied')

  const visibleExtraValueMetafields = extraValueMetafields.filter((meta) => {
    if (!parseFloat(meta?.value)) return false
    if (isDeliveryFreeByExtraMetafield && meta?.key === 'extra_value_free_delivery') return false
    return true
  })

  const loyaltyRewardValue = clearAmount((cart?.subtotal + getIncludedTaxes()) * loyaltyRewardRate)
  const isDisabledRewards = configs?.disabled_rewards?.value === '1'
  const loyaltyRewardMessage = t('RECEIVE_LOYALTY_POINT', 'You could receive :amount: points for this purchase.')
  const [loyaltyRewardMessageStart, loyaltyRewardMessageEnd] = loyaltyRewardMessage.split(':amount:')
  const showLoyaltyReward = !isDisabledRewards && !!loyaltyRewardValue && isFinite(loyaltyRewardValue) && !isCheckout

  const cashRewardValue = clearAmount((cart?.subtotal + getIncludedTaxes()) * (cashRewardRate ?? 0))
  const cashRewardMessage = t('RECEIVE_CASHBACK', 'You could receive :amount: cashback for this purchase.')
  const [cashRewardMessageStart, cashRewardMessageEnd] = cashRewardMessage.split(':amount:')
  const showCashReward = !isDisabledRewards && !!cashRewardValue && isFinite(cashRewardValue) && !isCheckout
  // Only show the rewards banner once a real value has resolved — never a
  // loading/skeleton state (). While the loyalty plans are still
  // loading nothing is rendered, then the points/cashback appear cleanly.
  const showRewardsRow = !isCheckout && !isDisabledRewards && (showLoyaltyReward || showCashReward) &&
    themeVisible(theme, 'cart.rewards')
  // visibility.cart.upselling ("Complement your order" and the
  // upselling page the cart opens)
  const hideUpselling = forceHideUpselling || !themeVisible(theme, 'cart.upselling')

  // options.moment is UTC ('YYYY-MM-DD HH:mm:ss'); parseDate shows it in
  // the user's local time, in the format the header shows it
  const momentFormatted = !orderState?.options?.moment
    ? t('RIGHT_NOW', 'Right Now')
    : parseDate(orderState?.options?.moment, { outputFormat: `${preorderDateFormat || 'YYYY-MM-DD'} ${timeFormat || 'HH:mm'}` })

  const handleDeleteClick = (product) => {
    setConfirm({
      open: true,
      content: t('QUESTION_DELETE_PRODUCT', 'Are you sure that you want to delete the product?'),
      handleOnAccept: async () => {
        // the dialog closes at once: the line shows its own loading meanwhile
        setConfirm({ ...confirm, open: false })
        await trackLine(product?.code, () => removeProduct(product, cart))
        callbackAfterUpdateCart && callbackAfterUpdateCart()
      }
    })
  }

  // + and − of a line (`changeQuantity` of the controller; 0 removes)
  const handleChangeQuantity = (product, quantity) => trackLine(product?.code, () => changeQuantity(product, quantity))

  // the product window's save, from this cart's Edit: the line being saved is the one that was opened
  const handleEditLoading = (loading) => {
    setEditingCode(loading ? (curProduct?.code ?? null) : null)
    setProductLoading && setProductLoading(loading)
  }

  const handleEditProduct = (product) => {
    setCurProduct(product)
    setModalIsOpen(true)
  }

  // The checkout of one business goes to this cart's checkout; the whole
  // group pays from its Cart #N header (CartContent). A pending cart of a
  // group whose payment is still open goes back to that group's checkout,
  // where its payment is resolved.
  const handleClickCheckout = (uuid = cart?.uuid) => {
    const pendingGroupUuid = cart?.status === 2 && cart?.group?.uuid
    const isPendingMultiCart = !!pendingGroupUuid &&
      Object.values(orderState?.carts ?? {}).filter(_cart => _cart?.status === 2 && _cart?.group?.uuid === pendingGroupUuid).length > 1
    if (isPendingMultiCart) {
      events.emit('go_to_page', { page: 'multi_checkout', params: { cartUuid: pendingGroupUuid } })
    } else {
      events.emit('go_to_page', { page: 'checkout', params: { cartUuid: uuid } })
    }
    events.emit('cart_popover_closed')
    onClickCheckout && onClickCheckout()
  }

  const handleStoreRedirect = (slug) => {
    if (isCustomerMode) {
      events.emit('go_to_page', { page: 'business', params: { store: slug } })
    } else {
      const templateQuery = businessUrlTemplate.split('?')[1]
      if (businessUrlTemplate === '/store/:business_slug' || businessUrlTemplate === '/:business_slug' || !templateQuery) {
        events.emit('go_to_page', { page: 'business', params: { business_slug: slug } })
      } else {
        events.emit('go_to_page', { page: 'business', search: `?${templateQuery.replace(':business_slug', '')}${slug}` })
      }
    }

    onClickCheckout && onClickCheckout()
  }

  useEffect(() => {
    events.emit('get_current_view')
    return () => {
      setConfirm({ ...confirm, open: false })
    }
  }, [])

  const handlerProductAction = (product) => {
    if (Object.keys(product).length) {
      setModalIsOpen(false)
      callbackAfterUpdateCart && callbackAfterUpdateCart()
    }
  }

  const handleClearProducts = () => {
    setConfirm({
      open: true,
      content: t('QUESTION_DELETE_PRODUCTS', 'Are you sure that you want to delete all products?'),
      handleOnAccept: async () => {
        await clearCart(cart?.uuid)
        callbackAfterUpdateCart && callbackAfterUpdateCart()
        setConfirm({ ...confirm, open: false })
      }
    })
  }

  const handleUpsellingPage = () => {
    setOpenUpselling(false)
    setCanOpenUpselling(false)
    handleClickCheckout()
  }

  // Checkout waits for the cart to settle: it would open the checkout on the
  // amounts before the change
  const checkOutBtnClick = (uuid) => {
    if (cartUpdating) return
    handleClickCheckout(uuid)
  }

  const getIncludedTaxesDiscounts = () => {
    return cart?.taxes?.filter(tax => (tax?.type === 1 && tax?.target === 'product'))?.reduce((carry, tax) => carry + (tax?.summary?.tax_after_discount ?? tax?.summary?.tax), 0)
  }

  const onRemoveOffer = (id) => {
    setConfirm({
      open: true,
      content: t('QUESTION_DELETE_OFFER', 'Are you sure that you want to delete the offer?'),
      title: t('OFFER', 'Offer'),
      handleOnAccept: () => {
        setConfirm({ ...confirm, open: false })
        handleRemoveOfferClick(id, user?.id)
      }
    })
  }

  const handleChangeStore = () => {
    setOpenChangeStore(true)
  }

  useEffect(() => {
    if (isCustomMode || showUpsellingInBusinessInfo) setIsUpselling(true)
  }, [isCustomMode, showUpsellingInBusinessInfo])

  // the total, with the ring before it while the cart recalculates
  const totalAmount = (
    <>
      {showUpdating && <TotalSpinner><TotalRing /></TotalSpinner>}
      {parsePrice(cart?.total >= 0 ? cart?.total : 0)}
    </>
  )

  return (
    <>
      {/* always mounted, so a screen reader announces the text when it appears (the rings are decorative) */}
      <CartUpdatingStatus role='status' aria-live='polite' data-doc-control='cart-updating-status'>
        {showUpdating ? t('UPDATING_CART', 'Updating your cart…') : ''}
      </CartUpdatingStatus>
      <CartContainer
        data-doc-section='cart'
        data-doc-cart-uuid={cart?.uuid}
        data-doc-state={isCartPending ? 'pending' : !cart?.valid_products ? 'invalid-products' : 'valid'}
        className='cart'
      >
        {cart?.business?.vertical === 'school' && (
          <CartStudentAlert cart={cart} />
        )}
        <CartSticky isCartOnProductsList={isCartOnProductsList}>
          <BusinessItemAccordion
            cart={cart}
            isCartPending={isCartPending}
            currentCartUuid={currentCartUuid}
            uuid={cart?.uuid}
            isCheckout={isCheckout}
            orderTotal={cart?.total}
            business={cart?.business}
            isClosed={!cart?.valid_schedule}
            moment={momentFormatted}
            isProducts={isProducts}
            isValidProducts={cart?.valid_products}
            isForceOpenAccordion={isForceOpenCart}
            isCartOnProductsList={isCartOnProductsList}
            handleClearProducts={handleClearProducts}
            handleStoreRedirect={handleStoreRedirect}
            handleCartOpen={handleCartOpen}
            isStore={isStore}
            total={cart?.total}
            handleClickCheckout={checkOutBtnClick}
            checkoutInert={cartUpdating}
            checkoutBusy={showUpdating}
            totalStatus={showUpdating && <TotalSpinner><TotalRing /></TotalSpinner>}
            checkoutButtonDisabled={(openUpselling && !canOpenUpselling) || isInvalidCart || !cart?.valid_maximum || (!cart?.valid_minimum && !(cart?.discount_type === 1 && cart?.discount_rate === 100)) || !cart?.valid_address || hasNoReservation}
            setPreorderBusiness={setPreorderBusiness}
            handleChangeStore={!useKioskApp && handleChangeStore}
            isMultiCheckout={isMultiCheckout}
            isInCartGroup={isInCartGroup}
            isGiftCart={!cart?.business_id}
            forceHideBusiness={forceHideBusiness}
            cartReservation={cart?.reservation}
            hasNoReservation={hasNoReservation}
            showUpsellingInBusinessInfo={showUpsellingInBusinessInfo}
            forceHideAddMoreProducts={forceHideAddMoreProducts}
            isCartPopover={isCartPopover}
            isStickyFooter={showUpsellingInBusinessInfo}
          >
            {!hideProductList && cart?.products?.length > 0 && cart?.products.map(product => (
              <ProductItemAccordion
                key={product.code}
                isCartPending={isCartPending}
                isCartProduct
                highlighted={!!highlightProductCode && product.code === highlightProductCode}
                isDisabledEdit={!cart?.business_id}
                product={product}
                isCheckout={isCheckout}
                toppingsRemoved={cart?.toppings_removed?.[product?.code]}
                changeQuantity={handleChangeQuantity}
                isUpdating={updatingLineCodes.includes(product.code)}
                getProductMax={getProductMax}
                offsetDisabled={offsetDisabled}
                onDeleteProduct={handleDeleteClick}
                onEditProduct={handleEditProduct}
                isStore={isStore}
                viewString={viewString}
                hideQuantitySelector={!isCheckout}
              />
            ))}
            {!cart?.valid_products && (
              <NoValidProductMessage>
                {t('REMOVE_NOT_AVAILABLE_CART_PRODUCTS', 'To continue with your checkout, please remove from your cart the products that are not available.')}
              </NoValidProductMessage>
            )}
            {invalidCartReasons.map(reason => (
              <InvalidCartMessage key={reason} data-doc-section='cart-invalid-reason'>
                {reason}
              </InvalidCartMessage>
            ))}
            {freeDeliveryProgress && themeVisible(theme, 'cart.free_delivery_progress') && (
              <FreeDeliveryProgress {...freeDeliveryProgress} variant='full' />
            )}
            {!hideOrderBill && cart?.valid_products && (
              <OrderBill data-doc-section='cart-summary' isCheckout={isCheckout}>
                <table className='order-info'>
                  <tbody>
                    <tr className='subtotal'>
                      <td>{t('SUBTOTAL', 'Subtotal')}</td>
                      <td>{parsePrice(cart?.subtotal + getIncludedTaxes())}</td>
                    </tr>
                    {/* in the cart, surface the applied coupon + "Subtotal after discount" so the user sees their discount before checkout. Read-only and compact — still NOT the full fee breakdown (see ). */}
                    {showDiscountInCart && (
                    <>
                    {cart?.discount > 0 && cart?.total >= 0 && cart?.offers?.length === 0 && (
                      <tr>
                        {cart?.discount_type === 1
                          ? (
                            <td>
                              {t('DISCOUNT', 'Discount')}{' '}
                              <span>{`(${verifyDecimals(cart?.discount_rate, parsePrice)}%)`}</span>
                            </td>
                            )
                          : (
                            <td>{t('DISCOUNT', 'Discount')}</td>
                            )}
                        <td>- {parsePrice(cart?.discount || 0)}</td>
                      </tr>
                    )}
                    {cart?.offers?.length > 0 && cart?.offers?.filter(offer => offer?.target === 1)?.map(offer => (
                      <tr key={offer.id}>
                        <td>
                          {offer.name}
                          {offer.rate_type === 1 && (
                            <span>{` (${verifyDecimals(offer?.rate, parsePrice)}%)`}</span>
                          )}
                        </td>
                        <td>- {parsePrice(offer?.summary?.discount)}</td>
                      </tr>
                    ))}
                    {cart?.offers?.filter(offer => offer?.target === 1)?.length > 0 &&
                      cart?.subtotal_with_discount > 0 &&
                      cart?.discount > 0 &&
                      cart?.total >= 0 &&
                      (
                        <tr className='subtotal'>
                          <td>{t('SUBTOTAL_WITH_DISCOUNT', 'Subtotal with discount')}</td>
                          {cart?.business?.tax_type === 1
                            ? (
                              <td>{parsePrice((cart?.subtotal_with_discount ?? 0) + (getIncludedTaxesDiscounts() ?? 0))}</td>
                              )
                            : (
                              <td>{parsePrice(cart?.subtotal_with_discount ?? 0)}</td>
                              )}
                        </tr>
                      )}
                    </>
                    )}
                    {/* in the cart show only the Subtotal; the full bill breakdown lives at checkout */}
                    {!showUpsellingInBusinessInfo && (
                    <>
                    {cart?.discount > 0 && cart?.total >= 0 && cart?.offers?.length === 0 && (
                      <tr>
                        {cart?.discount_type === 1
                          ? (
                            <td>
                              {t('DISCOUNT', 'Discount')}{' '}
                              <span>{`(${verifyDecimals(cart?.discount_rate, parsePrice)}%)`}</span>
                            </td>
                            )
                          : (
                            <td>{t('DISCOUNT', 'Discount')}</td>
                            )}
                        <td>- {parsePrice(cart?.discount || 0)}</td>
                      </tr>
                    )}
                    {
                      cart?.offers?.length > 0 && cart?.offers?.filter(offer => offer?.target === 1)?.map(offer => (
                        <tr key={offer.id}>
                          <td className='icon'>
                            {offer.name}
                            {offer.rate_type === 1 && (
                              <span>{`(${verifyDecimals(offer?.rate, parsePrice)}%)`}</span>
                            )}
                            <IconContainer>
                              {/* real buttons (named, keyboard) with no box of their own */}
                              <Button size='xs' shape='icon' appearance='ghost' borderInset aria-label={t('INFORMATION', 'Information')} onClick={() => setOpenTaxModal({ open: true, data: offer, type: 'offer_target_1' })}>
                                <Icon name="infoCircle" size={themeIconSize(theme, 'md')} aria-hidden='true' />
                              </Button>
                              {!!offer?.id && (
                                <Button size='xs' shape='icon' appearance='ghost' borderInset aria-label={t('REMOVE', 'Remove')} onClick={() => onRemoveOffer(offer?.id)}>
                                  <Icon name="closeCircle" size={themeIconSize(theme, 'lg')} aria-hidden='true' />
                                </Button>
                              )}
                            </IconContainer>
                          </td>
                          <td>
                            - {parsePrice(offer?.summary?.discount)}
                          </td>
                        </tr>
                      ))
                    }
                    {
                      cart?.offers?.filter(offer => offer?.target === 1)?.length > 0 &&
                      cart?.subtotal_with_discount > 0 &&
                      cart?.discount > 0 &&
                      cart?.total >= 0 &&
                      (
                        <tr className='subtotal'>
                          <td>{t('SUBTOTAL_WITH_DISCOUNT', 'Subtotal with discount')}</td>
                          {cart?.business?.tax_type === 1
                            ? (
                              <td>{parsePrice((cart?.subtotal_with_discount ?? 0) + (getIncludedTaxesDiscounts() ?? 0))}</td>
                              )
                            : (
                              <td>{parsePrice(cart?.subtotal_with_discount ?? 0)}</td>
                              )}
                        </tr>
                      )
                    }
                    {/* collapse the product taxes + service fees into one "Taxes and fees" line; expand on demand to see each item. Collapsed by default. */}
                    {taxesAndFeesCount > 0 && !showTaxesDetail && (
                      <tr data-doc-control='cart-taxes-fees-total'>
                        <td>{t('TAXES_AND_FEES', 'Taxes and fees')}</td>
                        <td>{parsePrice(taxesAndFeesSubtotal)}</td>
                      </tr>
                    )}
                    {taxesAndFeesCount > 0 && showTaxesDetail
                      ? (
                        <>
                          {/* the whole row opens / closes the breakdown; its
                              button (the label and the chevron) is what the
                              keyboard reaches, and its click reaches the row */}
                          <tr
                            data-doc-control='cart-taxes-fees-toggle'
                            className='taxes-fees-summary'
                            onClick={() => setShowTaxesFeesDetail(prev => !prev)}
                          >
                            <td className='icon'>
                              <TaxesFeesToggle aria-expanded={showTaxesFeesDetail}>
                                {t('TAXES_AND_FEES', 'Taxes and fees')}
                                <ChevronIcon kind='disclose' open={showTaxesFeesDetail} />
                              </TaxesFeesToggle>
                            </td>
                            <td>{parsePrice(taxesAndFeesSubtotal)}</td>
                          </tr>
                          {showTaxesFeesDetail && (
                            <>
                              <TaxBillRows
                                taxes={cart?.taxes}
                                target='product'
                                setOpenTaxModal={setOpenTaxModal}
                                parsePrice={parsePrice}
                                parseNumber={parseNumber}
                                t={t}
                                iconVariant='icon'
                                IconWrapper={IconContainer}
                                rowClassName='taxes-fees-detail'
                              />
                              <FeeBillRows
                                fees={cart?.fees}
                                setOpenTaxModal={setOpenTaxModal}
                                parsePrice={parsePrice}
                                t={t}
                                iconVariant='icon'
                                IconWrapper={IconContainer}
                                rowClassName='taxes-fees-detail'
                              />
                            </>
                          )}
                        </>
                        )
                      : null}
                    {
                      cart?.offers?.length > 0 && cart?.offers?.filter(offer => offer?.target === 3)?.map(offer => (
                        <tr key={offer.id}>
                          <td className='icon'>
                            {offer.name}
                            {offer?.rate_type === 1 && (
                              <span>{`(${verifyDecimals(offer?.rate, parsePrice)}%)`}</span>
                            )}
                            <IconContainer>
                              {/* real buttons (named, keyboard) with no box of their own */}
                              <Button size='xs' shape='icon' appearance='ghost' borderInset aria-label={t('INFORMATION', 'Information')} onClick={() => setOpenTaxModal({ open: true, data: offer, type: 'offer_target_3' })}>
                                <Icon name="infoCircle" size={themeIconSize(theme, 'md')} aria-hidden='true' />
                              </Button>
                              {!!offer?.id && (
                                <Button size='xs' shape='icon' appearance='ghost' borderInset aria-label={t('REMOVE', 'Remove')} onClick={() => onRemoveOffer(offer?.id)}>
                                  <Icon name="closeCircle" size={themeIconSize(theme, 'lg')} aria-hidden='true' />
                                </Button>
                              )}
                            </IconContainer>
                          </td>
                          <td>
                            - {parsePrice(offer?.summary?.discount)}
                          </td>
                        </tr>
                      ))
                    }
                    <TaxBillRows
                      taxes={cart?.taxes}
                      target='order'
                      setOpenTaxModal={setOpenTaxModal}
                      parsePrice={parsePrice}
                      parseNumber={parseNumber}
                      t={t}
                      iconVariant='icon'
                      IconWrapper={IconContainer}
                    />
                    {deliveryTypes.includes(orderState?.options?.type) && !hideDeliveryFee && cart?.business_id && !hasDeliveryFeeOffer && (deliveryFeeTotalWithIncludedTax !== 0 || isDeliveryFreeByExtraMetafield) && (
                      <tr>
                        <td className={isDeliveryFreeByExtraMetafield ? 'icon' : undefined}>
                          {t('DELIVERY_FEE', 'Delivery Fee')}
                          {isDeliveryFreeByExtraMetafield && (
                            <FreeDeliveryInfo label={t('MORE_INFORMATION', 'More information')}>
                              {freeDeliveryPartnerTooltip}
                            </FreeDeliveryInfo>
                          )}
                        </td>
                        <td>
                          {isDeliveryFreeByExtraMetafield && (
                            <DeliveryFeeStrikethrough>
                              {parsePrice(cart?.delivery_price_with_discount + getIncludedTaxes(true))}
                            </DeliveryFeeStrikethrough>
                          )}
                          {isDeliveryFreeByExtraMetafield && (
                            <DeliveryFeeFreeLabel>{t('FREE', 'FREE')}</DeliveryFeeFreeLabel>
                          )}
                          {!isDeliveryFreeByExtraMetafield &&
                            parsePrice(cart?.delivery_price_with_discount + getIncludedTaxes(true))}
                        </td>
                      </tr>
                    )}
                    {cart?.extra_value_checkprice && cart?.extra_value_checkprice > 0 && (
                      <tr>
                        <td>{t('EXTRA_VALUE_CHECKPRICE', 'Extra value checkprice')}</td>
                        <td>{parsePrice(cart?.extra_value_checkprice)}</td>
                      </tr>
                    )}
                    <TaxBillRows
                      taxes={cart?.taxes}
                      target='delivery_fee'
                      setOpenTaxModal={setOpenTaxModal}
                      parsePrice={parsePrice}
                      parseNumber={parseNumber}
                      t={t}
                      iconVariant='icon'
                      IconWrapper={IconContainer}
                    />
                    {
                      !hideCartDiscount && cart?.offers?.length > 0 && cart?.offers?.filter(offer => offer?.target === 2)?.map(offer => (
                        <tr key={offer.id}>
                          <td className='icon'>
                            {offer.name}
                            {offer?.rate_type === 1 && (
                              <span>{`(${verifyDecimals(offer?.rate, parsePrice)}%)`}</span>
                            )}
                            <IconContainer>
                              {/* real buttons (named, keyboard) with no box of their own */}
                              <Button size='xs' shape='icon' appearance='ghost' borderInset aria-label={t('INFORMATION', 'Information')} onClick={() => setOpenTaxModal({ open: true, data: offer, type: 'offer_target_2' })}>
                                <Icon name="infoCircle" size={themeIconSize(theme, 'md')} aria-hidden='true' />
                              </Button>
                              {!!offer?.id && (
                                <Button size='xs' shape='icon' appearance='ghost' borderInset aria-label={t('REMOVE', 'Remove')} onClick={() => onRemoveOffer(offer?.id)}>
                                  <Icon name="closeCircle" size={themeIconSize(theme, 'lg')} aria-hidden='true' />
                                </Button>
                              )}
                            </IconContainer>
                          </td>
                          <td>
                            {parsePrice((cart?.delivery_price_with_discount ?? 0) + getIncludedTaxes(true))}
                          </td>
                        </tr>
                      ))
                    }
                    {cart?.driver_tip > 0 && !hideDriverTip && (
                      <tr>
                        <td>
                          {t('DRIVER_TIP', 'Driver tip')}{' '}
                          {cart?.driver_tip_rate > 0 &&
                            parseInt(configs?.driver_tip_type?.value, 10) === 2 &&
                            !parseInt(configs?.driver_tip_use_custom?.value, 10) &&
                            (
                              <span>{`(${verifyDecimals(cart?.driver_tip_rate, parseNumber)}%)`}</span>
                            )}
                        </td>
                        <td>{parsePrice(cart?.driver_tip)}</td>
                      </tr>
                    )}
                    {visibleExtraValueMetafields.map(meta => {
                      const strippedKey = meta?.key?.replace('extra_value_', '')
                      const langKey = meta?.key?.toUpperCase()
                      const fallback = strippedKey?.replace(/_/g, ' ')?.split(' ')?.map(word => capitalize(word))?.join(' ')
                      return (
                        <tr key={meta?.key}>
                          <td>
                            {t(langKey, fallback)}{' '}
                          </td>
                          <td>{parseFloat(meta?.value) > 0 ? parsePrice(parseFloat(meta?.value)) : `- ${parsePrice(parseFloat(meta?.value) * -1)}`}</td>
                        </tr>
                      )
                    })}
                    </>
                    )}
                  </tbody>
                </table>
                {/* at checkout, surface the Order total inside the bill (right below all the fee info), since the standalone total near the button can be easy to miss */}
                {isCheckout && (
                  <table className='total'>
                    <tbody>
                      <tr>
                        <td>{t('ORDER_TOTAL', 'Order total')}</td>
                        <td>{totalAmount}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
                {
                  !isStore &&
                  !isMultiCheckout &&
                  cart &&
                  cart?.business_id &&
                  (deliveryTypes.includes(orderState?.options?.type) || allowDriverTipPickup) &&
                  cart?.status !== 2 &&
                  validationFields?.fields?.checkout?.driver_tip?.enabled &&
                  driverTipsOptions.length > 0 &&
                  !useKioskApp &&
                  !isCheckout &&
                  !forcehideDriverTypes &&
                  !showUpsellingInBusinessInfo &&
                  (
                    <>
                      <DriverTipContainer>
                        <h3>{t('DRIVER_TIPS', 'Driver Tips')}</h3>
                        <p>{t('100%_OF_THE_TIP_YOUR_DRIVER', '100% of the tip goes to your driver')}</p>
                        <DriverTips
                          businessId={cart?.business_id}
                          driverTipsOptions={driverTipsOptions}
                          isFixedPrice={parseInt(configs?.driver_tip_type?.value, 10) === 1}
                          isDriverTipUseCustom={!!parseInt(configs?.driver_tip_use_custom?.value, 10)}
                          isCartPopover={isCartPopover}
                          driverTip={parseInt(configs?.driver_tip_type?.value, 10) === 1
                            ? cart?.driver_tip
                            : cart?.driver_tip_rate}
                          cart={cart}
                          useOrderContext
                        />
                      </DriverTipContainer>
                    </>
                  )
                }
                {showRewardsRow && (
                  <RewardsBanner
                    compact
                    showLoyaltyReward={showLoyaltyReward}
                    showCashReward={showCashReward}
                    loyaltyRewardMessageStart={loyaltyRewardMessageStart}
                    loyaltyRewardValue={loyaltyRewardValue}
                    loyaltyRewardMessageEnd={loyaltyRewardMessageEnd}
                    cashRewardMessageStart={cashRewardMessageStart}
                    cashRewardValue={cashRewardValue}
                    cashRewardMessageEnd={cashRewardMessageEnd}
                    getIcon={getIcon}
                    t={t}
                  />
                )}
                {!hideProductList && !showUpsellingInBusinessInfo && (
                  <table className='total'>
                    <tbody>
                      <tr>
                      <td>{t('TOTAL', 'Total')}</td>
                      <td>{totalAmount}</td>
                    </tr>
                    </tbody>
                  </table>
                )}
                {!forceHideComments && cart?.status !== 2 && !hideCartComments && !hideCommentsByValidationCheckout && !showUpsellingInBusinessInfo && (
                  <table className='comments'>
                    <tbody>
                      <tr>
                        <td>
                          <CommentLabel>
                            {t('COMMENTS', 'Comments')}
                            {/* always mounted, so a screen reader announces the text when it appears */}
                            <CommentSavingStatus role='status' aria-live='polite'>
                              {savingComment ? t('SAVING', 'Saving…') : ''}
                            </CommentSavingStatus>
                            {savingComment && (
                              <CommentSaving>
                                <Spinner $size='sm' />
                              </CommentSaving>
                            )}
                          </CommentLabel>
                        </td>
                      </tr>
                      <tr>
                        <CommentContainer>
                          <Textarea
                            aria-label={t('COMMENTS', 'Comments')}
                            defaultValue={cart?.comment}
                            placeholder={t('SPECIAL_COMMENTS', 'Special Comments')}
                            onChange={(e) => handleChangeComment(e.target.value, user?.id)}
                          />
                        </CommentContainer>
                      </tr>
                    </tbody>
                  </table>
                )}

                {cart?.payment_events?.length > 0 && (
                  <div
                    style={themeTextStyle(theme, 'body', {
                      width: '99%',
                      fontSize: 15
                    })}
                  >
                    {cart?.payment_events?.map(event => {
                      const isRefund = event?.event === 'refund'
                      const methodName = walletName[cart?.wallets?.find(wallet => wallet.id === event.wallet_id)?.type]?.description
                      const eventLabel = isRefund
                        ? `${t('REFUND', 'Refund')} (${methodName})`
                        : methodName
                      return (
                      <div
                        key={event.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 10,
                          fontWeight: 500
                        }}
                      >
                        <span>
                          {eventLabel}
                        </span>
                        <span>
                          {isRefund ? '+' : '-'}{parsePrice(event.amount, { isTruncable: true })}
                        </span>
                      </div>
                      )
                    })}
                    {!hideBalanceTotal && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 10
                        }}
                      >
                        <span
                          style={{ fontWeight: 'bold' }}
                        >
                          {t('TOTAL_TO_PAY', 'Total to pay')}
                        </span>
                        <span
                          style={{ fontWeight: 'bold' }}
                        >
                          {parsePrice(cart?.balance)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {!!cart?.business_id && !forceHideCoupon && isCouponEnabled && !isCartPending &&
                  ((isCheckout || isCartPopover || isMultiCheckout) &&
                    !(isCheckout && isCartPopover)) && !hideCartDiscount && !hideCouponInput && !showUpsellingInBusinessInfo &&
                  (
                    <CouponContainer>
                      <CouponControl
                        businessId={cart?.business_id}
                        price={cart?.total}
                        cart={cart}
                      />
                    </CouponContainer>
                  )}
              </OrderBill>
            )}
            {cateringTypes.includes(orderState?.options?.type) && (
              <div>
                <MomentContent
                  cateringPreorder
                  isCart
                  business={cart?.business}
                  {...cateringValues}
                />
              </div>
            )}
            {hasNoReservation && (
              <ReservationAlert>
                <p>{t('MISSING_RESERVATION', 'Missing reservation')}: {t('MISSING_RESERVATION_ALERT', 'Please press the reservation button and configure your reservation before to continue')}</p>
              </ReservationAlert>
            )}
            {/* the cart's header has it (), unless the cart has no header */}
            {showUpsellingInBusinessInfo && forceHideBusiness && !isCartPending && (
              <div className='clear-cart'>
                <Button
                  /* cart.slots.clear (md ghost danger without it, the legacy transparent red) */
                  {...clearCartOptions}
                  onClick={() => handleClearProducts()}
                >
                  {t('CLEAR_CART', 'Clear cart')}
                </Button>
              </div>
            )}
            {!forceHideCheckoutButton && (onClickCheckout || isForceOpenCart) && !isCheckout && cart?.valid && (!isMultiCheckout || isStore || !cart?.business_id) && (
              <CheckoutAction>
                <p>
                  {cart?.total >= 1 && parsePrice(cart?.total)}
                  <TotalSpinner $after>{showUpdating && <TotalRing />}</TotalSpinner>
                </p>
                <CheckoutButtonSlot>
                  <Button
                    color={(!cart?.valid_maximum || belowMinimum || !cart?.valid_address || hasNoReservation) ? 'secondary' : 'primary'}
                    size='md'
                    cta
                    fullWidth
                    onClick={() => checkOutBtnClick(cart?.uuid)}
                    disabled={checkoutInvalid}
                    /* while a product updates: inert at once (aria-disabled keeps the focus where it is), and
                       busy (the ring before the same label) once the delay passes */
                    busy={showUpdating && !checkoutInvalid}
                    aria-disabled={cartUpdating ? true : undefined}
                  >
                    {!cart?.valid_address
                      ? (
                          t('OUT_OF_COVERAGE', 'Out of Coverage')
                        )
                      : !cart?.valid_maximum
                          ? (
                          `${t('MAXIMUM_SUBTOTAL_ORDER', 'Maximum subtotal order')}: ${parsePrice(cart?.maximum)}`
                            )
                          : belowMinimum
                            ? (
                            `${t('MINIMUN_SUBTOTAL_ORDER', 'Minimum subtotal order:')} ${parsePrice(cart?.minimum)}`
                              )
                            : hasNoReservation
                              ? t('MISSING_RESERVATION', 'Missing reservation')
                              : !openUpselling ^ canOpenUpselling ? t('CHECKOUT', 'Checkout') : t('LOADING', 'Loading')}
                  </Button>
                </CheckoutButtonSlot>
              </CheckoutAction>
            )}
            {!hideUpselling && showUpsellingInBusinessInfo && (openUpselling || isUpselling) && (
              <UpsellingPage
                useKioskApp={useKioskApp}
                businessId={cart?.business_id}
                isCustomMode
                cartProducts={cart?.products}
                business={cart?.business}
                handleUpsellingPage={handleUpsellingPage}
                openUpselling={openUpselling}
                canOpenUpselling={canOpenUpselling}
                setCanOpenUpselling={setCanOpenUpselling}
                fromCartPopover
              />
            )}
          </BusinessItemAccordion>
          <Confirm
            title={t('PRODUCT', 'Product')}
            content={confirm.content}
            acceptText={t('ACCEPT', 'Accept')}
            open={confirm.open}
            onClose={() => setConfirm({ ...confirm, open: false })}
            onCancel={() => setConfirm({ ...confirm, open: false })}
            onAccept={confirm.handleOnAccept}
            closeOnBackdrop={false}
          />
          {openProduct && (
            <ProductModal
              dataDocSection='product-edit-dialog'
              open={openProduct}
              onClose={() => setModalIsOpen(false)}
            >
              {!curProduct?.calendar_event
                ? (
                  <ProductForm
                    isCartProduct
                    productCart={curProduct}
                    businessSlug={cart?.business?.slug}
                    businessId={cart?.business_id}
                    categoryId={curProduct?.category_id}
                    productId={curProduct?.id}
                    onSave={handlerProductAction}
                    viewString={viewString}
                    setProductLoading={handleEditLoading}
                  />
                  )
                : (
                  <ServiceForm
                    isCartProduct
                    isService
                    productCart={curProduct}
                    businessSlug={cart?.business?.slug}
                    businessId={cart?.business_id}
                    categoryId={curProduct?.category_id}
                    productId={curProduct?.id}
                    onSave={handlerProductAction}
                    professionalSelected={curProduct?.calendar_event?.professional}
                    businessTimezone={cart?.business?.timezone}
                    setProductLoading={handleEditLoading}
                  />
                  )}
            </ProductModal>
          )}
          {openTaxModal.open && (
            <DialogOverlay
              legacyMaxWidth
              width='70%'
              open={openTaxModal.open}
              title={`${openTaxModal.data?.name ||
                t('INHERIT_FROM_BUSINESS', 'Inherit from business')} ${openTaxModal.data?.rate_type !== 2 ? (typeof openTaxModal.data?.rate === 'number' ? `(${openTaxModal.data?.rate}%)` : ((openTaxModal.data?.fixed > 0 || openTaxModal.data?.percentage > 0) ? `(${openTaxModal.data?.fixed > 0 ? `${parsePrice(openTaxModal.data?.fixed)}${openTaxModal.data?.percentage > 0 ? ' + ' : ''}` : ''}${openTaxModal.data?.percentage > 0 ? `${openTaxModal.data?.percentage}%` : ''})` : '')) : ''}  `}
              onClose={() => setOpenTaxModal({ open: false, data: null, type: '' })}
            >
              <TaxInformation
                type={openTaxModal.type}
                data={openTaxModal.data}
                products={cart?.products}
                useKioskApp={useKioskApp}
              />
            </DialogOverlay>
          )}
          {!hideUpselling && !showUpsellingInBusinessInfo && (openUpselling || isUpselling) && (
            <UpsellingPage
              useKioskApp={useKioskApp}
              businessId={cart?.business_id}
              isCustomMode={isCustomMode}
              cartProducts={cart?.products}
              business={cart?.business}
              handleUpsellingPage={handleUpsellingPage}
              openUpselling={openUpselling}
              canOpenUpselling={canOpenUpselling}
              setCanOpenUpselling={setCanOpenUpselling}
            />
          )}
        </CartSticky>
        {openChangeStore && (
          <DialogOverlay
            legacyMaxWidth
            width='70%'
            title={t('CHANGE_STORE', 'Change store')}
            open={openChangeStore}
            onClose={() => setOpenChangeStore(false)}
          >
            <CartStoresListing
              isStore={isStore}
              pageChangeStore='business'
              cartuuid={cart?.uuid}
              onClose={() => setOpenChangeStore(false)}
              handleCustomStoreRedirect={handleStoreRedirect}
            />
          </DialogOverlay>
        )}
      </CartContainer>
    </>
  )
}

export const Cart = (props) => {
  const cartProps = {
    ...props,
    UIComponent: CartUI
  }

  return (
    <CartController {...cartProps} />
  )
}
