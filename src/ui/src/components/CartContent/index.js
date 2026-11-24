import React, { useEffect, useMemo, useState, useCallback } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'
import settings from '~/config'
import { useFreeDeliveryProgress } from '~components/hooks/useFreeDeliveryProgress'
import { franchiseSlug } from '~/utils/siteSettings'
import { CartGroupCheckoutPrice, CartGroupDivider, CartGroupHeader, CartGroupMessage, CartGroupTitle, Container, MultiCartPriceContainer, NotCarts, PendingBadge, Title, WrapperContainer } from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useEvent } from '~components/contexts/EventContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useApi } from '~components/contexts/ApiContext'
import { useSession } from '~components/contexts/SessionContext'
import { Cart } from '~ui/src/components/Cart'
import { Button } from '~ui/src/design-system/components/Button'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { ModalHeading } from '~ui/src/components/Overlay/ModalHeading'
import { OrderContextUI } from '~ui/src/components/OrderContextUI'
import { useCartGroupPreview } from '~ui/hooks/useCartGroupPreview'

const CartGroup = React.memo(({ group, index, renderCart, handleClickCheckout, groupCartsByUuid, isGroupPricingPending }) => {
  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()
  const validCarts = group.filter(cart => cart?.valid)
  const hasPending = validCarts.some(cart => cart?.status === 2)
  // The group checkout pays every cart of the group: it shows their total
  const groupTotal = validCarts.reduce((total, cart) => total + ((groupCartsByUuid?.[cart?.uuid] ?? cart)?.total || 0), 0)

  // Invalid carts cannot checkout — hide them entirely (/670).
  if (!validCarts.length) return null

  return (
    <React.Fragment>
      <CartGroupHeader>
        <CartGroupTitle>
          {t('CART', 'Cart')} #{index + 1}
          {hasPending && (
            <PendingBadge>{t('PENDING', 'Pending')}</PendingBadge>
          )}
        </CartGroupTitle>
        <Button
          data-doc-control='multi-cart-group-checkout'
          data-doc-group-index={index}
          onClick={() => handleClickCheckout(validCarts, validCarts.length === 1 ? validCarts[0]?.uuid : null)}
          color='primary'
          size='md'
        >
          {t('CHECKOUT', 'Checkout')}
          {isGroupPricingPending && !hasPending
            ? <CartGroupCheckoutPrice><Skeleton width='6ch' inline /></CartGroupCheckoutPrice>
            : groupTotal >= 1 && <CartGroupCheckoutPrice>{parsePrice(groupTotal)}</CartGroupCheckoutPrice>}
        </Button>
      </CartGroupHeader>
      {validCarts.map(cart => renderCart(cart, true))}
    </React.Fragment>
  )
})

const hasCartItems = (cart, orderType) => cart?.products?.length > 0 || (cart?.reservation && orderType === 9)

const CartItem = React.memo(({
  cart,
  isInCartGroup,
  isOpenCart,
  isCartPopover,
  isForceOpenCart,
  currentCartUuid,
  onClose,
  setPreorderBusiness,
  configs,
  isCustomerMode,
  productLoading,
  setProductLoading,
  checkoutMultiBusinessEnabled,
  loyaltyPlansState
}) => {
  const [orderState] = useOrder()
  const theme = useTheme()
  const franchiseId = franchiseSlug(theme, settings)
  const isCheckout = window.location.pathname === `/checkout/${cart?.uuid}` && !isCartPopover
  const isCheckoutRoute = /^\/(?:checkout|multi-checkout)(?:\/|$)/.test(window.location.pathname)
  const freeDeliveryProgress = useFreeDeliveryProgress({
    business: { ...cart?.business, id: cart?.business?.id ?? cart?.business_id },
    cart,
    franchiseId,
    enabled: isOpenCart !== false && !isCheckoutRoute && Boolean(cart?.products?.length)
  })

  if (!hasCartItems(cart, orderState?.options?.type)) {
    return null
  }

  const creditPointPlan = loyaltyPlansState?.result?.find(loyal => loyal.type === 'credit_point')
  const creditPointPlanOnBusiness = creditPointPlan?.businesses?.find(b => b.business_id === cart?.business_id && b.accumulates)
  const loyaltyRewardRate = creditPointPlanOnBusiness?.accumulation_rate ?? (!!creditPointPlanOnBusiness && creditPointPlan?.accumulation_rate) ?? 0
  const cashPlan = loyaltyPlansState?.result?.find(loyal => loyal.type === 'cashback' || loyal.type === 'cash')
  const cashPlanOnBusiness = cashPlan?.businesses?.find(b => b.business_id === cart?.business_id && b.accumulates)
  const cashRewardRate = cashPlanOnBusiness?.accumulation_rate ?? (!!cashPlanOnBusiness && cashPlan?.accumulation_rate) ?? 0

  return (
    <Cart
      forceHideCheckoutButton
      cart={cart}
      isInCartGroup={isInCartGroup}
      freeDeliveryProgress={freeDeliveryProgress}
      isCartPending={cart?.status === 2}
      isOpenCart={isOpenCart}
      isCartPopover={isCartPopover}
      loyaltyRewardRate={loyaltyRewardRate}
      cashRewardRate={cashRewardRate}
      isCheckout={isCheckout}
      isForceOpenCart={isForceOpenCart}
      currentCartUuid={currentCartUuid}
      isProducts={cart?.products?.length}
      onClickCheckout={onClose}
      setPreorderBusiness={setPreorderBusiness}
      businessConfigs={cart?.business?.configs}
      hideCouponInput={configs?.multi_business_checkout_coupon_input_style?.value === 'group'}
      hideDeliveryFee={checkoutMultiBusinessEnabled && configs?.multi_business_checkout_show_combined_delivery_fee?.value === '1'}
      hideDriverTip={checkoutMultiBusinessEnabled && configs?.multi_business_checkout_show_combined_driver_tip?.value === '1'}
      isCustomerMode={isCustomerMode}
      productLoading={productLoading}
      setProductLoading={setProductLoading}
      showUpsellingInBusinessInfo
      showDiscountInCart={isCartPopover}
    />
  )
})

export const CartContent = (props) => {
  const {
    carts,
    isOrderStateCarts,
    isCartPopover,
    isForceOpenCart,
    setPreorderBusiness,
    isOpenCart,
    isSlideBar,
    isCustomerMode,
    activeCartUuid,
    onActiveCartChange
  } = props

  const [, t] = useLanguage()
  const [events] = useEvent()
  const [orderState] = useOrder()
  const [{ parsePrice }] = useUtils()
  const [{ configs }] = useConfig()
  const [ordering] = useApi()
  const [{ token }] = useSession()

  const [currentCartUuid, setCurrentCartUuid] = useState(null)
  const effectiveCartUuid = activeCartUuid ?? currentCartUuid
  const [productLoading, setProductLoading] = useState(false)
  const [loyaltyPlansState, setLoyaltyPlansState] = useState({ loading: true, result: [] })
  const isDisabledRewards = configs?.disabled_rewards?.value === '1'
  const hasCartReservation = carts?.some(cart => cart?.reservation)
  const checkoutMultiBusinessEnabled = orderState?.options?.type !== 9 && !hasCartReservation && configs?.checkout_multi_business_enabled?.value === '1'
  const validCartsList = useMemo(() => carts?.filter((cart) => cart?.valid) || [], [carts])
  const orderType = orderState?.options?.type
  const displayableCartsList = useMemo(() => carts?.filter(cart => hasCartItems(cart, orderType)) || [], [carts, orderType])
  const invalidCartsList = useMemo(() => displayableCartsList.filter((cart) => !cart?.valid), [displayableCartsList])
  const hasValidCarts = validCartsList.length > 0
  const hasDisplayableCarts = displayableCartsList.length > 0
  // One cart on screen opens with its products, also when the user has carts
  // of other stores the list leaves out (a single store site shows only its
  // store's): the accordion alone only opens when the user has one cart
  const isOnlyCartShown = displayableCartsList.length === 1

  const hideTitle = true

  const cartsAvailable = useMemo(() => Object.values(orderState?.carts || {})?.filter?.(cart => cart?.valid), [orderState?.carts])

  // One "Cart #N" per cart group of the API (its checkout pays the whole
  // group), only with the valid carts. A pending cart without
  // a group is a group of its own; active carts without one stay together.
  const cartGroups = useMemo(() => {
    if (!validCartsList.length) return {}
    return [...validCartsList].sort((a, b) => b?.status - a?.status).reduce((groups, cart) => {
      const groupId = cart?.status === 2
        ? `pending:${cart?.group?.uuid || cart?.uuid}`
        : `group:${cart?.group?.uuid || 'none'}`
      groups[groupId] = [...(groups[groupId] || []), cart]
      return groups
    }, {})
  }, [validCartsList])
  // A group earns its Cart #N header (and group checkout) only when it pays
  // several carts: with one cart per group every cart stands alone
  const showCartGroups = checkoutMultiBusinessEnabled &&
    Object.values(cartGroups).some(groupCarts => groupCarts.filter(cart => cart?.valid).length > 1)
  const hasSingleActiveGroup = Object.keys(cartGroups).filter(groupId => groupId.startsWith('group:')).length === 1
  const { cartGroup, isPending: isGroupPricingPending } = useCartGroupPreview({ enabled: !!isOrderStateCarts && showCartGroups && hasSingleActiveGroup && !isCustomerMode })
  const groupCartsByUuid = useMemo(
    () => (cartGroup?.carts || []).reduce((map, cart) => ({ ...map, [cart?.uuid]: cart }), {}),
    [cartGroup]
  )
  const pricedCartsList = useMemo(
    () => validCartsList.map(cart => groupCartsByUuid[cart?.uuid] ?? cart),
    [validCartsList, groupCartsByUuid]
  )
  const totalCartsPrice = hasValidCarts && pricedCartsList
    .reduce((total, cart) => { return total + cart?.total }, 0)
  const totalCartsFee = hasValidCarts && pricedCartsList
    .filter((cart) => cart?.status !== 1)
    .reduce((total, cart) => { return total + (cart?.delivery_price_with_discount) }, 0)
  const totalDriverTip = pricedCartsList.reduce((sum, cart) => sum + (cart?.driver_tip || 0), 0)

  const renderCart = useCallback((cart, isInCartGroup) => (
    <CartItem
      key={cart.uuid}
      cart={cart}
      isInCartGroup={isInCartGroup}
      isOpenCart={isOpenCart}
      isCartPopover={isCartPopover}
      isForceOpenCart={isForceOpenCart || isOnlyCartShown}
      currentCartUuid={effectiveCartUuid}
      onClose={props.onClose}
      setPreorderBusiness={setPreorderBusiness}
      configs={configs}
      isCustomerMode={isCustomerMode}
      productLoading={productLoading}
      setProductLoading={setProductLoading}
      checkoutMultiBusinessEnabled={checkoutMultiBusinessEnabled}
      loyaltyPlansState={loyaltyPlansState}
    />
  ), [effectiveCartUuid, isOpenCart, isCartPopover, isForceOpenCart, isOnlyCartShown, configs, isCustomerMode, productLoading, checkoutMultiBusinessEnabled, loyaltyPlansState])

  const handleActiveCartChange = (uuid) => {
    setCurrentCartUuid(uuid)
    onActiveCartChange?.(uuid)
  }

  const handleAddProduct = (product, cart) => {
    handleActiveCartChange(cart?.uuid)
  }

  const handleUpdateProduct = (product, cart) => {
    handleActiveCartChange(cart?.uuid)
  }

  const handleSetCurrentCartUuid = () => {
    handleActiveCartChange(null)
    props.onClose && props.onClose()
  }

  const handleClickCheckout = async (group, singleUuid) => {
    const isSingleCart = cartsAvailable.length === 1
    const previewGroupUuid = cartGroup?.uuid && group.every(cart => groupCartsByUuid[cart?.uuid]) ? cartGroup.uuid : null
    const hasNotGroup = !previewGroupUuid && group.some(cart => !cart?.group?.uuid)
    const cartGroupUuid = previewGroupUuid ?? group[0]?.group?.uuid
    if (isSingleCart || singleUuid) {
      events.emit('go_to_page', { page: 'checkout', params: { cartUuid: singleUuid } })
    } else if (hasNotGroup) {
      events.emit('go_to_page', { page: 'multi_cart' })
    } else {
      events.emit('go_to_page', { page: 'multi_checkout', params: { cartUuid: cartGroupUuid } })
    }
    events.emit('cart_popover_closed')
    props.onClose && props.onClose()
  }

  useEffect(() => {
    events.on('cart_popover_closed', handleSetCurrentCartUuid)
    events.on('cart_product_added', handleAddProduct)
    events.on('cart_product_updated', handleUpdateProduct)
    return () => {
      events.off('cart_popover_closed', handleSetCurrentCartUuid)
      events.off('cart_product_added', handleAddProduct)
      events.off('cart_product_updated', handleUpdateProduct)
    }
  }, [])

  useEffect(() => {
    if (isDisabledRewards || !carts?.length) return
    let mounted = true
    const getLoyaltyPlans = async () => {
      try {
        const loyaltyParams = 'params=type,accumulation_rate,businesses'
        const req = await fetch(`${ordering.root}/loyalty_plans?${loyaltyParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-App-X': ordering.appId,
            'X-INTERNAL-PRODUCT-X': ordering.appInternalName
          }
        })
        const { error, result } = await req.json()
        if (mounted) setLoyaltyPlansState({ loading: false, result: error ? [] : result })
      } catch (err) {
        if (mounted) setLoyaltyPlansState({ loading: false, result: [] })
      }
    }
    getLoyaltyPlans()
    return () => {
      mounted = false
    }
  }, [token, isDisabledRewards, carts?.length])

  return (
    <>
      <Container
        data-doc-section='cart-content'
        data-doc-state={hasDisplayableCarts ? 'populated' : 'empty'}
      >
        <WrapperContainer>
          {!isSlideBar && !hideTitle && (
            <ModalHeading as={Title}>{t('YOUR_CART', 'Your cart')}</ModalHeading>
          )}
        </WrapperContainer>
        {isOrderStateCarts && hasDisplayableCarts && (
          <>
            {/* how and when */}
            {isCartPopover && !isCustomerMode && <OrderContextUI isCart />}
            {showCartGroups
              ? (
                  Object.entries(cartGroups)
                    .filter(([, groupCarts]) => groupCarts.some(cart => cart?.valid))
                    .map(([group, _], i) => (
                  <React.Fragment key={group}>
                    <CartGroup
                      group={cartGroups[group]}
                      index={i}
                      renderCart={renderCart}
                      handleClickCheckout={handleClickCheckout}
                      groupCartsByUuid={groupCartsByUuid}
                      isGroupPricingPending={isGroupPricingPending}
                    />
                    <CartGroupDivider />
                  </React.Fragment>
                    ))
                )
              : (
                  displayableCartsList.map(cart => renderCart(cart))
                )}
            {showCartGroups && invalidCartsList.map(cart => renderCart(cart))}
            {showCartGroups && hasValidCarts && (
              <MultiCartPriceContainer>
                {(isGroupPricingPending || !!totalCartsFee) &&
                  configs?.multi_business_checkout_show_combined_delivery_fee?.value === '1' &&
                  (
                    <span>
                      <p>{t('TOTAL_DELIVERY_FEE', 'Total delivery fee')}</p>
                      <p>{isGroupPricingPending ? <Skeleton width='6ch' inline /> : parsePrice(totalCartsFee)}</p>
                    </span>
                  )}
                {totalDriverTip > 0 &&
                  configs?.multi_business_checkout_show_combined_driver_tip?.value === '1' &&
                  (
                    <span>
                      <p>{t('DRIVER_TIP', 'Driver tip')}</p>
                      <p>{parsePrice(totalDriverTip)}</p>
                    </span>
                  )}
                <div>
                  <p className='total'>{t('TOTAL_FOR_ALL_CARTS', 'Total for all Carts')}</p>
                  <p className='total'>{isGroupPricingPending ? <Skeleton width='7ch' inline /> : parsePrice(totalCartsPrice)}</p>
                </div>
                <CartGroupMessage>
                  <p>{t('CART_GROUP_MESSAGE_ALERT', 'Discounts may be applied at the time of payment for this group.')}</p>
                </CartGroupMessage>
              </MultiCartPriceContainer>
            )}
          </>
        )}
        {!hasDisplayableCarts && (
          <NotCarts isSlideBar={isSlideBar}>
            <NotFoundSource
              variant='empty'
              icon='bag'
              content={t('NO_PRODUCTS_TO_CART', 'You have no products added to the cart')}
            />
          </NotCarts>
        )}
      </Container>
    </>
  )
}
