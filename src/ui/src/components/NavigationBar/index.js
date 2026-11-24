import React, { useState } from 'react'
import { useTheme } from 'styled-components'
import { useLocation } from 'react-router-dom'
import {
  NavigationBarContainer,
  NavigationLink
} from './styles'

import loadable from '@loadable/component'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useEvent } from '~components/contexts/EventContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useSession } from '~components/contexts/SessionContext'
import { useSite } from '~components/contexts/SiteContext'
import { LazyDialog } from '~ui/src/components/Overlay/lazyOverlay'

import { HeaderIcon } from '~ui/src/components/Icon/headerGlyphs'
import { themeVisible } from '~/utils/themeVisibility'
import { isSingleStorePathname, singleStoreCarts, singleStoreSlug } from '~/utils/singleStore'
import { isFullWebsite } from '~/utils/siteSettings'
import settings from '../../../../config'

// Modal contents open on interaction — lazy so their vendor trees (swiper via
// CartContent, maps/phone metadata via AddressForm, firebase via LoginForm)
// stay out of the entry chunk (this bar is always mounted on mobile).
const CartContent = loadable(() => import('~ui/src/components/CartContent').then((m) => m.CartContent))
// a failed download (offline) is retried on click, not an unhandled rejection
const preloadCart = () => { CartContent.preload()?.catch?.(() => {}) }
const AddressForm = loadable(() => import('~ui/src/components/AddressForm').then((m) => m.AddressForm))
const LoginForm = loadable(() => import('~ui/src/components/LoginForm').then((m) => m.LoginForm))
const SignUpForm = loadable(() => import('~ui/src/components/SignUpForm').then((m) => m.SignUpForm))
const ForgotPasswordForm = loadable(() => import('~ui/src/components/ForgotPasswordForm').then((m) => m.ForgotPasswordForm))
const AccountInvite = loadable(() => import('~ui/src/components/AccountInvite').then((m) => m.AccountInvite))

// Without a session these pages invite to create an account before they ask to log in
const INVITED_PAGES = ['orders', 'profile']

// `hidden`: the bar is not drawn (a wide screen) but its cart and address dialogs stay as they are
export const NavigationBar = ({ hidden = false }) => {
  const theme = useTheme()
  const [, t] = useLanguage()
  const location = useLocation()
  const [events] = useEvent()
  const [orderState] = useOrder()
  const [{ auth }, { login }] = useSession()
  const [{ site }] = useSite()
  const [isCart, setIsCart] = useState(false)
  const [isAddress, setIsAddress] = useState(false)
  const [modalPageToShow, setModalPageToShow] = useState(null)
  const [invite, setInvite] = useState(null)

  // A single store site: its store is the home and the cart shows only its
  // carts (as the header's), not the user's carts of other stores
  const storeSlug = singleStoreSlug(theme, settings)
  const isSingleStoreSite = !!storeSlug
  const cartsWithProducts = singleStoreCarts((orderState?.carts && Object.values(orderState?.carts).filter(cart => cart.products && cart.products?.length > 0)) || null, storeSlug)

  const handleGoToPage = (data) => {
    if (auth) events.emit('go_to_page', data)
    else if (INVITED_PAGES.includes(data.page)) setInvite(data)
    else handleOpenLoginSignUp('login')
  }

  const handleChangeExplore = () => {
    if (isSingleStoreSite) {
      events.emit('go_to_page', { page: 'business', params: { business_slug: storeSlug } })
      return
    }
    auth
      ? handleGoToPage({ page: 'search' })
      : setIsAddress(true)
  }

  const handleOpenLoginSignUp = (index) => {
    setModalPageToShow(index)
  }

  const handleCustomModalClick = (e, { page }) => {
    e.preventDefault()
    setModalPageToShow(page)
  }

  const closeAuthModal = () => {
    setModalPageToShow(null)
  }

  const handleSuccessLogin = (user) => {
    if (user) {
      closeAuthModal()
    }
  }

  const handleSuccessSignup = (user) => {
    login({
      user,
      token: user?.session?.access_token
    })
  }

  const itemlist = {
    home: {
      key: 'home',
      text: t('HOME', 'Home'),
      active: isSingleStoreSite
        ? isSingleStorePathname(location.pathname, site, storeSlug, { fullWebsite: isFullWebsite(theme) })
        : location.pathname === '/search' || isAddress,
      onClick: handleChangeExplore
    },
    browse: {
      key: 'browse',
      active: location.pathname === '/business_search',
      onClick: () => handleGoToPage({ page: 'business_search' }),
      text: t('EXPLORE', 'Explore')
    },
    cart: {
      key: 'cart',
      active: isCart,
      text: t('MY_CART', 'My cart'),
      onClick: () => setIsCart(true)
    },
    orders: {
      key: 'orders',
      active: location.pathname === '/profile/orders',
      text: t('ORDERS', 'Orders'),
      onClick: () => handleGoToPage({ page: 'orders' })
    },
    profile: {
      key: 'profile',
      active: location.pathname === '/profile',
      text: t('PROFILE', 'Profile'),
      onClick: () => handleGoToPage({ page: 'profile', search: '?view=account' })
    }
  }

  // the theme hides Explore, My cart, Orders or Profile (visibility
  // bottom_nav.browse / cart / orders / profile); Home always stays. A
  // single store has no listing to explore: no Explore.
  const shownItems = Object.values(itemlist)
    .filter(item => !(isSingleStoreSite && item.key === 'browse'))
    .filter(item => !['browse', 'cart', 'orders', 'profile'].includes(item.key) || themeVisible(theme, `bottom_nav.${item.key}`))

  const getIcon = (icon) => {
    return icon === 'home'
      ? <HeaderIcon name="house" />
      : icon === 'browse'
        ? <HeaderIcon name="search" />
        : icon === 'orders'
          ? <HeaderIcon name="cardChecklist" />
          : icon === 'cart'
            ? <HeaderIcon name="shoppingCart" />
            : <HeaderIcon name="userOutline" />
  }

  return (
    <>
      {!hidden && <NavigationBarContainer data-doc-section='mobile-bottom-navigation'>
        {shownItems.map(item => (
          <NavigationLink
            key={item.key}
            aria-current={item.active ? 'page' : undefined}
            onClick={() => item.onClick()}
            // the cart's chunk downloads on hover / focus / touch, not at start
            {...(item.key === 'cart' && { onPointerEnter: preloadCart, onFocus: preloadCart, onTouchStart: preloadCart })}
          >
            {getIcon(item.key)}
            <span>{item.text}</span>
          </NavigationLink>
        ))}
      </NavigationBarContainer>}
      {isCart && (
        <LazyDialog
          legacyMaxWidth
          open={isCart}
          title={t('MY_CART', 'My cart')}
          onClose={() => setIsCart(false)}
          width='50%'
        >
          <CartContent
            carts={cartsWithProducts}
            isOrderStateCarts={!!orderState.carts}
            onClose={() => setIsCart(false)}
          />
        </LazyDialog>
      )}
      {isAddress && (
        <LazyDialog
          legacyMaxWidth
          open={isAddress}
          title={t('WHERE_DO_WE_DELIVERY', 'Where do we deliver?')}
          onClose={() => setIsAddress(false)}
          width='50%'
        >
          <AddressForm
            useValidationFileds
            address={orderState?.options?.address || {}}
            onCancel={() => setIsAddress(false)}
            onSaveAddress={() => setIsAddress(false)}
          />
        </LazyDialog>
      )}
      {invite && (
        <AccountInvite
          entry={invite.page}
          open
          onClose={() => setInvite(null)}
          // an account made or a login: it goes where it was asked
          onDone={() => events.emit('go_to_page', invite)}
        />
      )}
      {modalPageToShow && !auth && (
        <LazyDialog
          legacyMaxWidth
          open={modalPageToShow && !auth}
          onRemove={() => closeAuthModal()}
          width='50%'
        >
          {modalPageToShow === 'login' && (
            <LoginForm
              handleSuccessLogin={handleSuccessLogin}
              elementLinkToSignup={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'signup' })
                  } href='#'
                >{t('CREATE_ACCOUNT', 'Create account')}
                </a>
              }
              elementLinkToForgotPassword={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'forgotpassword' })
                  } href='#'
                >{t('RESET_PASSWORD', 'Reset password')}
                </a>
              }
              useLoginByCellphone
              isPopup
            />
          )}
          {modalPageToShow === 'signup' && (
            <SignUpForm
              elementLinkToLogin={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'login' })
                  } href='#'
                >{t('LOGIN', 'Login')}
                </a>
              }
              useLoginByCellphone
              useChekoutFileds
              handleSuccessSignup={handleSuccessSignup}
              isPopup
            />
          )}
          {modalPageToShow === 'forgotpassword' && (
            <ForgotPasswordForm
              elementLinkToLogin={
                <a
                  onClick={
                    (e) => handleCustomModalClick(e, { page: 'login' })
                  } href='#'
                >{t('LOGIN', 'Login')}
                </a>
              }
              isPopup
            />
          )}
        </LazyDialog>
      )}
    </>
  )
}

export default NavigationBar
