import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'
import { themeVisible } from '~/utils/themeVisibility'
import { themeValue } from '~/utils/themeTokens'
import { usePopper } from 'react-popper'
import {
  Wrapper,
  PopoverBody
} from './styles'
import { PopoverArrow } from '~ui/src/design-system/components/Popover'

import { useOrder } from '~components/contexts/OrderContext'
import { useEvent } from '~components/contexts/EventContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { CartContent } from '~ui/src/components/CartContent'
import { SheetOverlay } from '~ui/src/components/Overlay/overlays'

import { HeaderCartButton } from '~ui/src/components/HeaderOption/HeaderCartButton'
import { cartItemsCount } from '~/utils/cartItemsCount'
import { isInsideOverlay } from '~/utils/overlay'
import { storeCartInPage } from '~/utils/storeCartInPage'
import { useCartIconPulse } from '~ui/hooks/useStoreCartFeedback'

export const CartPopover = (props) => {
  // hideButton (the theme hides the header's cart): no button, only the cart
  // drawer, still opened by the header (header_cart_open) and on a product
  // added in a store
  const { open, auth, location, isCustomerMode, setPreorderBusiness, hideButton } = props
  const [orderState] = useOrder()
  const theme = useTheme()
  const [events] = useEvent()
  const [, t] = useLanguage()
  const countPulse = useCartIconPulse()
  const referenceElement = useRef()
  const popperElement = useRef()
  const arrowElement = useRef()

  const popper = usePopper(referenceElement.current, popperElement.current, {
    placement: theme?.rtl ? 'bottom' : 'bottom-end',
    modifiers: [
      { name: 'arrow', options: { element: arrowElement.current } },
      {
        name: 'offset',
        options: {
          offset: [0, 12]
        }
      }
    ]
  })

  const { styles, attributes } = popper

  const isSlideBar = true
  const [activeCartUuid, setActiveCartUuid] = useState(null)

  useEffect(() => {
    const handleProductAdded = (product, cart) => {
      setActiveCartUuid(cart?.uuid)
      // not where the store page already keeps the cart in sight (the direct menu's panel or bar, implementation notes; its
      // header's drawer, implementation notes, answers on the icon's count): it shows what was added by itself
      if (location?.pathname?.includes('/store/') && !storeCartInPage()) {
        props.onClick && props.onClick()
      }
    }
    const handleProductUpdated = (product, cart) => {
      setActiveCartUuid(cart?.uuid)
    }
    const handleCartPopoverClosed = () => {
      setActiveCartUuid(null)
    }
    events.on('cart_product_added', handleProductAdded)
    events.on('cart_product_updated', handleProductUpdated)
    events.on('cart_popover_closed', handleCartPopoverClosed)
    return () => {
      events.off('cart_product_added', handleProductAdded)
      events.off('cart_product_updated', handleProductUpdated)
      events.off('cart_popover_closed', handleCartPopoverClosed)
    }
  }, [location])

  const handleClose = () => {
    setActiveCartUuid(null)
    props.onClose && props.onClose()
  }

  const handleClickOutside = (e) => {
    if (!open) return
    const outsidePopover = !popperElement.current?.contains(e.target)
    const outsidePopoverMenu = !referenceElement.current?.contains(e.target)
    const outsideModal = !isInsideOverlay(e.target)
    if (outsidePopover && outsidePopoverMenu && outsideModal) {
      events.emit('cart_popover_closed')
      props.onClose && props.onClose()
    }
  }

  useEffect(() => {
    window.addEventListener('mouseup', handleClickOutside)
    return () => window.removeEventListener('mouseup', handleClickOutside)
  }, [open])

  useEffect(() => {
    props.onClose()
  }, [auth])

  useEffect(() => {
    if (location && location.pathname.includes('/checkout/')) {
      props.onClose && props.onClose()
    }
  }, [location])

  const getScrollTop = () => {
    if (document.documentElement?.scrollTop > 80) {
      props.onClose && props.onClose()
    }
  }

  useEffect(() => {
    if (location && location.pathname.includes('/store/') && isCustomerMode) {
      window.addEventListener('scroll', getScrollTop)
    }
    return () => {
      window.removeEventListener('scroll', getScrollTop)
    }
  }, [])

  // the popover no longer owns the scroll. It is a bounded flex column
  // so the inner cart can keep its store-name header and Total + Checkout + Add
  // more footer pinned while only the product list scrolls.
  // The badge counts what the cart shows: the units of every cart, valid or not
  // (the same count as the narrow header's), unless the theme hides it
  // (visibility.header.cart_count; the icon stays)
  const buttonCount = themeVisible(theme, 'header.cart_count') ? cartItemsCount(props.carts) : null
  const popStyle = { ...styles.popper, visibility: open ? 'visible' : 'hidden', width: `${themeValue(theme, 'menu', 'base.max_width')}px`, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
  if (!open) {
    popStyle.transform = 'translate3d(0px, 0px, 0px)'
  }

  const slideBarDrawer = open
    ? (
      <SheetOverlay
        data-doc-section='cart-popover'
        open={open}
        onClose={handleClose}
        title={t('YOUR_CART', 'Your cart')}
        side='right'
        width={getThemeCss(theme, 'cart').base.drawer_width}
      >
        <CartContent
          isCartPopover
          carts={props.carts}
          isOrderStateCarts={!!orderState.carts}
          onClose={handleClose}
          setPreorderBusiness={setPreorderBusiness}
          isOpenCart={open}
          onClick={props.onClick}
          isSlideBar={isSlideBar}
          isCustomerMode={isCustomerMode}
          activeCartUuid={activeCartUuid}
          onActiveCartChange={setActiveCartUuid}
        />
      </SheetOverlay>
      )
    : null

  if (hideButton) return slideBarDrawer

  return (
    <Wrapper open={open} isSlideBar={isSlideBar}>
      <HeaderCartButton
        data-doc-control='cart-open'
        data-doc-state={open ? 'open' : 'closed'}
        ref={referenceElement}
        onClick={props.onClick}
        name='cart-popover'
        id='cart-header-item'
        aria-expanded={!!open}
        count={buttonCount}
        pulse={countPulse}
      />
      {isSlideBar
        ? slideBarDrawer
        : (
        <PopoverBody data-doc-section='cart-popover' className='cart-popover' ref={popperElement} style={popStyle} {...attributes.popper}>
          <CartContent
            isCartPopover
            carts={props.carts}
            isOrderStateCarts={!!orderState.carts}
            onClose={handleClose}
            setPreorderBusiness={setPreorderBusiness}
            isOpenCart={open}
            onClick={props.onClick}
            isCustomerMode={isCustomerMode}
            activeCartUuid={activeCartUuid}
            onActiveCartChange={setActiveCartUuid}
          />
          <PopoverArrow key='arrow' ref={arrowElement} style={styles.arrow} background={themeValue(theme, 'cart', 'base.background')} />
        </PopoverBody>
          )}
    </Wrapper>
  )
}
