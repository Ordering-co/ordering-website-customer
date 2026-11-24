import { InlineDisclosureButton } from '~ui/src/design-system/components/ButtonAppearances'
import React, { useState, useRef, useEffect, useId } from 'react'
import { useTheme } from 'styled-components'
import momentjs from 'moment'
import {
  AccordionSection,
  Accordion,
  AccordionContent,
  ContentInfo,
  BusinessInfo,
  BusinessTotal,
  BusinessActions,
  HeaderActionSlot,
  PriceContainer,
  FooterAction,
  BusinessLink,
  ChangeStoreLabel
} from './styles'

import { useOrder } from '~components/contexts/OrderContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useEvent } from '~components/contexts/EventContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { Button } from '~ui/src/design-system/components/Button'

import { ChevronIcon } from '~ui/src/styles/Chevron'
import { scrollBehavior } from '~/utils/themeMotion'
import { slotButtonOptions } from '~/utils/themeGroups'
import { themeVisible } from '~/utils/themeVisibility'

// a Clear cart without cart.slots.clear: the legacy `red` button, md solid danger
const CLEAR_DEFAULTS = { color: 'danger', appearance: 'solid', size: 'md' }

export const BusinessItemAccordion = (props) => {
  const {
    cart,
    uuid,
    isCartPending,
    currentCartUuid,
    isCheckout,
    isClosed,
    moment,
    business,
    isProducts,
    isForceOpenAccordion,
    isCartOnProductsList,
    handleClearProducts,
    handleStoreRedirect,
    handleCartOpen,
    isStore,
    total,
    handleClickCheckout,
    checkoutButtonDisabled,
    checkoutInert,
    checkoutBusy,
    totalStatus,
    setPreorderBusiness,
    handleChangeStore,
    isMultiCheckout,
    isInCartGroup,
    isGiftCart,
    forceHideBusiness,
    cartReservation,
    hasNoReservation,
    showUpsellingInBusinessInfo,
    forceHideAddMoreProducts,
    isCartPopover,
    isStickyFooter
  } = props

  const [orderState] = useOrder()
  const [, t] = useLanguage()
  const [events] = useEvent()
  const [{ parsePrice, parseDate, timeFormat }] = useUtils()
  const [{ configs }] = useConfig()
  const theme = useTheme()
  // the options of a cart slot's Button, else `defaults` (the look without the slot); a slot's
  // shape is not taken (the legacy slotButtonProps never passed it: these buttons keep their label)
  const cartSlot = (slot, defaults) => {
    const { shape, ...options } = slotButtonOptions(theme, 'cart', slot, defaults)
    return options
  }
  const [setActive, setActiveState] = useState('')
  const [setHeight] = useState('0px')
  const [cartProductUpdated, setCartProductUpdated] = useState(null)
  const isBusinessChangeEnabled = configs?.cart_change_business_validation?.value === '1'
  const checkoutMultiBusinessEnabled = configs?.checkout_multi_business_enabled?.value === '1'
  const content = useRef(null)
  const toggleRef = useRef(null)
  // the products of the store: what the header's toggle opens / closes
  const contentId = useId()
  const accordionSectionRef = useRef(null)
  const businessStore = useRef(null)
  const businessDelete = useRef(null)
  const changeStore = useRef(null)

  // reserve_date is UTC (api-core reads and stores it so)
  const isValidReservation = cartReservation && momentjs.utc(cartReservation?.reserve_date, 'YYYY-MM-DD HH:mm:ss').valueOf() > Date.now()
  const toggleAccordion = (e) => {
    const isActionsClick = businessStore.current?.contains(e?.target) || businessDelete.current?.contains(e?.target) || changeStore.current?.contains(e?.target)
    if (isClosed || !isProducts || isActionsClick || isSoloCart) return
    activeAccordion(setActive !== 'active')
  }
  const showButton = orderState?.options?.type !== 9
    ? setActive === 'active' && !!isProducts && !isMultiCheckout && !checkoutMultiBusinessEnabled
    : isValidReservation

  const activeAccordion = (value, { restoreFocus = true } = {}) => {
    if (!value && restoreFocus && content.current?.contains(document.activeElement)) {
      toggleRef.current?.focus({ preventScroll: true })
    }
    setActiveState(value ? 'active' : '')
  }

  const handleCloseCartPopover = () => {
    const cartsLength = Object.values(orderState?.carts).filter(cart => cart.products.length > 0).length ?? 0
    if (cartsLength > 1 && !isCheckout && !isForceOpenAccordion) {
      // The containing cart layer returns focus when the whole cart closes.
      activeAccordion(false, { restoreFocus: false })
      setCartProductUpdated(null)
    }
  }

  const handleCartProductUpdated = (product, cart) => {
    setCartProductUpdated(cart?.uuid)
  }

  const handleOpenBusinessMenu = (business) => {
    setPreorderBusiness && setPreorderBusiness(business)
  }

  // the pieces of the cart's header the theme hides (visibility.cart.*)
  const showBusinessName = themeVisible(theme, 'cart.business_name')
  const showGoToStore = themeVisible(theme, 'cart.go_to_store')
  const showClearCart = themeVisible(theme, 'cart.clear')
  const showClosedClearCart = showClearCart && !!isProducts && !isCartPending
  // the cart of the popover / modal / drawer: with one cart on
  // screen its header does not open or close, and its Clear cart is a quiet
  // link there, far from Checkout
  const isCartView = !!showUpsellingInBusinessInfo
  const isSoloCart = isCartView && !!isForceOpenAccordion
  const showHeaderClearCart = isCartView && showClearCart && !isClosed && !!isProducts && !isCartPending
  const showHeaderToggle = !isClosed && !!isProducts && !isSoloCart
  // Reserve disjoint lanes for both touch targets without resizing either drawing.
  const headerAction = (control) => (
    <HeaderActionSlot $reserved={showHeaderClearCart && showHeaderToggle}>{control}</HeaderActionSlot>
  )
  // in the store's own page the store's name repeats it: the count of items
  const itemsCount = cart?.products?.reduce((sum, product) => sum + (product?.quantity || 0), 0) || 0

  const subtotalWithTaxes = cart?.taxes?.reduce((acc, item) => {
    if (item?.type === 1) {
      return acc = acc + item?.summary?.tax
    }
    return acc
  }, cart?.subtotal)
  const belowMinimum = cartReservation ? !cart?.valid_minimum : subtotalWithTaxes < cart?.minimum

  useEffect(() => {
    // A forced cart in the layer has no toggle. Never let selection hide it.
    if (currentCartUuid) {
      if (currentCartUuid === uuid) {
        activeAccordion(true)
        if (isCartPopover) {
          requestAnimationFrame(() => {
            accordionSectionRef.current?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior(theme) })
          })
        }
      } else if (!isSoloCart) {
        activeAccordion(false)
      }
      return
    }

    if (cartProductUpdated === uuid) {
      activeAccordion(true)
    } else if (cartProductUpdated && !isSoloCart) {
      activeAccordion(false)
    }
  }, [cartProductUpdated, currentCartUuid, uuid, isCartPopover, isSoloCart])

  useEffect(() => {
    const cartsLength = Object.values(orderState?.carts).filter(cart => cart.products.length > 0).length ?? 0
    if ((cartsLength === 1 || isCheckout) && !isClosed) {
      activeAccordion(true)
    }
  }, [orderState?.carts])

  useEffect(() => {
    if (isForceOpenAccordion) {
      activeAccordion(true)
    }
  }, [isForceOpenAccordion])

  useEffect(() => {
    events.on('cart_popover_closed', handleCloseCartPopover)
    events.on('cart_product_updated', handleCartProductUpdated)
    return () => {
      events.off('cart_popover_closed', handleCloseCartPopover)
      events.off('cart_product_updated', handleCartProductUpdated)
    }
  }, [])

  useEffect(() => {
    handleCartOpen && handleCartOpen(!!setActive)
  }, [setActive])

  // the footer: one condition for rendering it and for the section's margin that depends on it
  const showFooter = !isClosed && !isCheckout && (isStickyFooter ? !!isProducts : showButton)
  const hasStickyFooter = !!isStickyFooter && showFooter

  return (
    <>
    {
      forceHideBusiness
        ? props.children
        : (
        <AccordionSection ref={accordionSectionRef} isClosed={isClosed} isCartOnProductsList={isCartOnProductsList} isStickyFooter={isStickyFooter} $hasStickyFooter={hasStickyFooter}>
          {
            !isCheckout && (
              <Accordion
                data-doc-control='business-cart-accordion'
                data-doc-state={setActive === 'active' ? 'expanded' : 'collapsed'}
                isClosed={isClosed}
                isStickyFooter={isStickyFooter}
                $cartView={isCartView}
                $solo={isSoloCart}
                className={`accordion ${setActive}`}
                onClick={(e) => toggleAccordion(e)}
              >
                <BusinessInfo isOtherInfo={(isClosed && !isStore) || (!isClosed && !isProducts && !isStore)}>
                  <ContentInfo className='info' isStore={isStore}>
                    {isGiftCart && (
                      <h3>{t('GIFT_CARD_CHECKOUT', 'Gift card checkout')}</h3>
                    )}
                    {isCartView && isStore
                      ? (
                        <p className='items-count'>
                          {itemsCount === 1 ? t('ONE_ITEM', '1 item') : t('NUMBER_ITEMS', '_number_ items').replace('_number_', itemsCount)}
                        </p>
                        )
                      : showBusinessName && !!business?.name && (
                        <h3>{business?.name}</h3>
                      )}
                    {cartReservation && orderState?.options?.type === 9 && (
                      <div>
                        <span
                          className={!isValidReservation ? 'danger' : ''}
                        >
                          {t('RESERVATION', 'Reservation')} • {parseDate(cartReservation?.reserve_date, { outputFormat: `YYYY-MM-DD ${timeFormat}` })} • {cartReservation?.guests_reservation} {t('GUESTS', 'Guests')}
                        </span>
                      </div>
                    )
                    }
                    <div>
                      {showGoToStore && !showUpsellingInBusinessInfo && handleStoreRedirect && !isCartOnProductsList && !isStore && !isGiftCart && (
                        /* the button of cart.slots.store (md ghost primary
                           without it) */
                        <Button
                          ref={businessStore}
                          type='button'
                          {...cartSlot('store', { color: 'primary', appearance: 'ghost', size: 'md' })}
                          onClick={() => isClosed ? handleOpenBusinessMenu(business) : handleStoreRedirect(business?.slug)}
                        >
                          {t('GO_TO_STORE', 'Go to store')}
                        </Button>
                      )}
                      {showClearCart && !showUpsellingInBusinessInfo && !isClosed && (!!isProducts || (cartReservation && orderState?.options?.type === 9)) && !isCartPending && (
                        /* the Clear cart button of the cart (cart.slots.clear),
                           apart from Go to store by the row's gap */
                        <Button
                          ref={businessDelete}
                          type='button'
                          {...cartSlot('clear', CLEAR_DEFAULTS)}
                          onClick={() => handleClearProducts()}
                        >
                          {t('CLEAR_CART', 'Clear cart')}
                        </Button>
                      )}
                    </div>
                    {!showUpsellingInBusinessInfo && !cartReservation && isBusinessChangeEnabled && handleChangeStore && !isGiftCart && !isCartPending && (
                      <BusinessLink
                      ref={changeStore}
                        onClick={handleChangeStore}
                        className='change-store'
                        >
                        <ChangeStoreLabel>{t('CHANGE_STORE', 'Change store')}</ChangeStoreLabel>
                      </BusinessLink>
                    )}
                  </ContentInfo>
                </BusinessInfo>
                {isClosed && !isStore && (
                  <BusinessTotal className={`closed${showClosedClearCart ? ' has-clear' : ''}`}>
                    <p>{t('CLOSED', 'Closed')} {moment}</p>
                    {/* the Clear cart button of the cart (cart.slots.clear) */}
                    {showClosedClearCart && (
                      <Button
                        ref={businessDelete}
                        type='button'
                        {...cartSlot('clear', CLEAR_DEFAULTS)}
                        onClick={() => handleClearProducts()}
                      >
                        {t('CLEAR_CART', 'Clear cart')}
                      </Button>
                    )}
                  </BusinessTotal>
                )}

                {!isClosed && !isProducts && !isStore && (
                  <BusinessTotal>
                    <p>{cartReservation && orderState?.options?.type === 9 ? t('ONLY_TABLE', 'Only table') : t('NO_PRODUCTS', 'No products')}</p>
                  </BusinessTotal>
                )}

                <BusinessActions $cartView={isCartView}>
                  {showHeaderClearCart && headerAction(
                    <BusinessLink
                      ref={businessDelete}
                      $variant='muted'
                      data-doc-control='cart-clear'
                      onClick={() => handleClearProducts()}
                    >
                      {t('CLEAR_CART', 'Clear cart')}
                    </BusinessLink>
                  )}
                  {/* the toggle of the products: a real button (keyboard,
                      named by the store); its click reaches the row, which
                      opens / closes the accordion as a click on the row does */}
                  {showHeaderToggle && headerAction(
                    <InlineDisclosureButton
                      shape='icon'
                      className='accordion-toggle'
                      ref={toggleRef}
                      aria-expanded={setActive === 'active'}
                      aria-controls={contentId}
                      aria-label={business?.name || t('MY_CART', 'My cart')}
                    >
                      <span>
                        <ChevronIcon kind='disclose' open={setActive === 'active'} />
                      </span>
                    </InlineDisclosureButton>
                  )}
                </BusinessActions>
              </Accordion>
            )
          }
          <AccordionContent
            id={contentId}
            ref={content}
            isStickyFooter={isStickyFooter}
            isCartOnProductsList={isCartOnProductsList}
            isOpen={!!setActive}
            inert={setActive ? undefined : ''}
            style={{ minHeight: `${setHeight}`, maxHeight: !setActive && '0px' }}
            >
            {!showUpsellingInBusinessInfo && !cartReservation && isBusinessChangeEnabled && isCheckout && handleChangeStore && !isCartPending && (
              <BusinessInfo>
                <ContentInfo className='info'>
                  <BusinessLink
                    ref={changeStore}
                    onClick={handleChangeStore}
                    className='change-store'
                    >
                    <ChangeStoreLabel>{t('CHANGE_STORE', 'Change store')}</ChangeStoreLabel>
                  </BusinessLink>
                </ContentInfo>
              </BusinessInfo>
            )}
            {props.children}
          </AccordionContent>
          {showFooter && (
            <PriceContainer data-doc-section='cart-handoff' showUpsellingInBusinessInfo={showUpsellingInBusinessInfo} isStickyFooter={isStickyFooter} $inCartGroup={isInCartGroup}>
              {/* the fixed side panel already shows the menu: no "Add more products" there */}
              {showUpsellingInBusinessInfo && !forceHideAddMoreProducts && !isGiftCart && !isCartPending && (
                <FooterAction $size={isInCartGroup ? 'sm' : 'md'}>
                  <Button
                    color='primary'
                    appearance={isInCartGroup ? 'outline' : 'ghost'}
                    size={isInCartGroup ? 'sm' : 'md'}
                    fullWidth
                    onClick={() => handleStoreRedirect(business?.slug)}
                  >
                    {t('ADD_MORE_PRODUCTS', 'Add more products')}
                  </Button>
                </FooterAction>
              )}
              {!showUpsellingInBusinessInfo && (
                <p className='total'>{totalStatus}{parsePrice(total)}</p>
              )}
              <FooterAction $size={isInCartGroup ? 'sm' : 'md'}>
                <Button
                  data-doc-control='cart-checkout'
                  onClick={() => handleClickCheckout(uuid)}
                  color='primary'
                  size={isInCartGroup ? 'sm' : 'md'}
                  fullWidth
                  disabled={checkoutButtonDisabled}
                  /* while the cart updates: inert at once, busy once the delay passes */
                  busy={checkoutBusy && !checkoutButtonDisabled}
                  aria-disabled={checkoutInert ? true : undefined}
                >
                  {!cart?.valid_address
                    ? (
                        t('OUT_OF_COVERAGE', 'Out of Coverage')
                      )
                    : !cart?.valid_maximum
                        /* one text (as the Cart's Checkout): the label ends in … when it does
                           not fit, and the button's gap opens no second space before the price */
                        ? `${t('MAXIMUM_SUBTOTAL_ORDER', 'Maximum subtotal order')}: ${parsePrice(cart?.maximum)}`
                        : belowMinimum
                          ? `${t('MINIMUN_SUBTOTAL_ORDER', 'Minimum subtotal order:')} ${parsePrice(cart?.minimum)}`
                          : hasNoReservation
                            ? t('MISSING_RESERVATION', 'Missing reservation')
                            /* one text, not in a fragment: the button's gap would open the space
                               before the dot, and only a text child of the Button ends in … */
                            : showUpsellingInBusinessInfo && total >= 1
                              ? `${t('CHECKOUT', 'Checkout')} · ${parsePrice(total)}`
                              : t('CHECKOUT', 'Checkout')}
                </Button>
              </FooterAction>
            </PriceContainer>
          )}
        </AccordionSection>
          )
    }
    </>
  )
}
