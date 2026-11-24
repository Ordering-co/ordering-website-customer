import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme } from 'styled-components'
import settings from '../../../../config'
import { themeHidden, themeVisible } from '~/utils/themeVisibility'
import {
  Header as HeaderContainer,
  InnerHeader,
  LogoHeader,
  LogoHeaderName,
  HeaderStoreSlot,
  LeftHeader,
  CheckoutHomeExit,
  RightHeader,
  Menu,
  CustomerInfo,
  UserEdit,
  AddressMenu,
  MomentMenu,
  FarAwayMessage,
  AddressWrapper,
  Divider,
  AddressFormWrapper,
  LanguageSelectorWrapper,
  LeftSide,
  AddressOrderTypeContainer,
  HEADER_HEIGHT_VAR
} from './styles'
import { headerScrollBehavior, useHeaderScroll, HEADER_SCROLL_FIXED } from './scrollBehavior'
import { useDockOut } from './orderContextDock'
import { OrderContextChip } from './OrderContextChip'
import { HEADER_LOGO_ATTRIBUTE, HEADER_STORE_SLOT_ATTRIBUTE } from './behindHeader'
import { HeaderMapButton } from './HeaderMapButton'
import AddressMapDialog from './address-map-dialog'

import { useSession } from '~components/contexts/SessionContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useEvent } from '~components/contexts/EventContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useCustomer } from '~components/contexts/CustomerContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useBusiness } from '~components/contexts/BusinessContext'
import { useSite } from '~components/contexts/SiteContext'
import loadable from '@loadable/component'
import { LanguageSelector } from '~ui/src/components/LanguageSelector'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { useOnlineStatus } from '~ui/hooks/useOnlineStatus'
import { getDistance, getCateringValues } from '~ui/utils'
import { Confirm } from '~ui/src/components/Confirm'
import { LazyDialog } from '~ui/src/components/Overlay/lazyOverlay'
import { HeaderOption } from '~ui/src/components/HeaderOption'
import { AddressOrderType } from '~ui/src/components/AddressOrderType'
import { OrderContextCapsule } from '~ui/src/components/AddressOrderType/styles'
import { orderContextInHeader, orderContextVisible } from './orderContextPlacement'
import { getSiteLogoUrl, headerBrand, brandRepeatsStore, readStoredBrandLogo, writeStoredBrandLogo } from '~/utils/siteBranding'
import { ownSiteName } from '~/utils/resolvePwaBranding'
import { franchiseSlug, isFullWebsite, singleStoreSlug } from '~/utils/siteSettings'
import { showsCustomerAddress, isSingleStoreOwnPage, singleStoreCarts } from '~/utils/singleStore'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'
import { themeImage } from '~/utils/themeTokens'
import { cartItemsCount } from '~/utils/cartItemsCount'
import { focusStoreCartAside, storeCartInPage } from '~/utils/storeCartInPage'
import { scrollBehavior as motionScrollBehavior } from '~/utils/themeMotion'

import { HeaderIcon } from '~ui/src/components/Icon/headerGlyphs'
import { OrderIcon } from '~ui/src/components/AddressOrderType/OrderIcon'
import { ChevronIcon } from '~ui/src/styles/Chevron'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { Button as PieceButton } from '~ui/src/design-system/components/Button'
import { slotButtonOptions } from '~/utils/themeGroups'

// What login and signup look like without a slot (header.slots.login / .signup):
// the neutral ghost and the primary solid md buttons they always were
const LOGIN_LOOK = { color: 'neutral', appearance: 'ghost', size: 'md' }
const SIGNUP_LOOK = { color: 'primary', appearance: 'solid', size: 'md' }

// Popover/modal contents open on interaction — lazy so their vendor trees
// (swiper via Cart/ProductForm, maps + phone metadata via AddressForm,
// firebase via LoginForm, datepickers via MomentContent/BusinessPreorder)
// stay out of the entry chunk.
const CartPopover = loadable(() => import('~ui/src/components/CartPopover').then((m) => m.CartPopover))
const CartContent = loadable(() => import('~ui/src/components/CartContent').then((m) => m.CartContent))
// a failed download (offline) is retried on click, not an unhandled rejection
const preloadCart = () => { CartContent.preload()?.catch?.(() => {}) }
const MomentContent = loadable(() => import('~ui/src/components/MomentContent').then((m) => m.MomentContent))
const AddressList = loadable(() => import('~ui/src/components/AddressList').then((m) => m.AddressList))
const AddressForm = loadable(() => import('~ui/src/components/AddressForm').then((m) => m.AddressForm))
const SidebarMenu = loadable(() => import('~ui/src/components/SidebarMenu').then((m) => m.SidebarMenu))
const UserDetails = loadable(() => import('~ui/src/components/UserDetails').then((m) => m.UserDetails))
const LoginForm = loadable(() => import('~ui/src/components/LoginForm').then((m) => m.LoginForm))
const SignUpForm = loadable(() => import('~ui/src/components/SignUpForm').then((m) => m.SignUpForm))
const ForgotPasswordForm = loadable(() => import('~ui/src/components/ForgotPasswordForm').then((m) => m.ForgotPasswordForm))
const BusinessPreorder = loadable(() => import('~ui/src/components/BusinessPreorder').then((m) => m.BusinessPreorder))

export const Header = (props) => {
  // its height (border box) on the root as HEADER_HEIGHT_VAR, while mounted
  const headerRef = useRef(null)
  useEffect(() => {
    const node = headerRef.current
    const root = document.documentElement
    if (!node || typeof ResizeObserver === 'undefined') return
    const update = () => root.style.setProperty(HEADER_HEIGHT_VAR, `${node.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => {
      observer.disconnect()
      root.style.removeProperty(HEADER_HEIGHT_VAR)
    }
  }, [])
  const scrollBehavior = headerScrollBehavior(useTheme())
  useHeaderScroll(headerRef, scrollBehavior)
  // the bar docked under the header is out of view (behind it)
  const dockOut = useDockOut()
  const {
    location,
    isHome,
    isHideSignup,
    isCustomerMode,
    businessSlug,
    notificationState,
    singleBusinessConfig,
    logoHomeTarget,
    isTrackingOnly
  } = props

  const isSingleBusiness = !!singleBusinessConfig?.isActive
  const { pathname } = useLocation()
  const [events] = useEvent()
  const [{ parseDate, timeFormat, preorderDateFormat, getMaxPreorderDays }] = useUtils()
  const [, t] = useLanguage()
  const [{ auth, user }, { login }] = useSession()
  const [orderState, { refreshOrderOptions }] = useOrder()
  const [openPopover, setOpenPopover] = useState({})
  const theme = useTheme()
  // the site's own single store (not the config's): the logo goes to it
  const themeBusinessSlug = singleStoreSlug(theme)
  const isFranchise = !!franchiseSlug(theme, settings)
  const [configState] = useConfig()
  const maxPreorderDays = getMaxPreorderDays(orderState.options?.type)
  const isPreorderDisabled = maxPreorderDays === -1 || maxPreorderDays === 0
  const [customerState, { deleteUserCustomer }] = useCustomer()
  const [{ business }] = useBusiness()
  const [{ site }] = useSite()
  const updatedBusinessSlug = singleStoreSlug(theme, settings)
  const hideMapIcon = !!updatedBusinessSlug
  // kept current for the events effect below (mounted once, [] deps): its
  // handlers would otherwise close over the slug of the render they were
  // registered on (e.g. null, off the defaults theme, before the site's own
  // loads) and never see it change
  const updatedBusinessSlugRef = useRef(updatedBusinessSlug)
  updatedBusinessSlugRef.current = updatedBusinessSlug
  // Single Restaurant: the store's own page (not
  // checkout/orders/profile…), where the header hides its brand while the
  // store block is in view — signalled by BusinessBasicInformation, a
  // different tree, over the event bus. Derived during render (not an
  // effect) so arriving at or leaving the page never flashes the brand for
  // a frame before an effect could catch up.
  const onStoreOwnPage = isSingleStoreOwnPage(pathname, site, updatedBusinessSlug, { fullWebsite: isFullWebsite(theme) })
  const lastOnStoreOwnPage = useRef(onStoreOwnPage)
  const [storeBlockInView, setStoreBlockInView] = useState(onStoreOwnPage)
  if (lastOnStoreOwnPage.current !== onStoreOwnPage) {
    lastOnStoreOwnPage.current = onStoreOwnPage
    setStoreBlockInView(onStoreOwnPage)
  }
  // Whether a `single_store_in_view` event has ever arrived since landing on
  // this store page: without IntersectionObserver support, or if
  // BusinessBasicInformation fails before mounting, none ever would, and the
  // brand would stay hidden forever — the bounded fallback below shows it.
  const hasReceivedInViewRef = useRef(false)
  useEffect(() => {
    if (!onStoreOwnPage) return
    hasReceivedInViewRef.current = false
    const timer = setTimeout(() => {
      if (!hasReceivedInViewRef.current) setStoreBlockInView(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [onStoreOwnPage])
  const [liveStoreLogo, setLiveStoreLogo] = useState(null)
  const [liveStoreName, setLiveStoreName] = useState(null)
  const clearCustomer = useRef(null)
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [modalSelected, setModalSelected] = useState(null)
  // the moment picker is saving: its dialog stays open until it ends
  const [momentBusy, setMomentBusy] = useState(false)
  const mapOpenerRef = useRef(null)
  const [modalPageToShow, setModalPageToShow] = useState(null)
  const [preorderBusiness, setPreorderBusiness] = useState(null)
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false)
  const [isOpenUserData, setIsOpenUserData] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, content: null, handleOnAccept: null })
  const [isFarAway, setIsFarAway] = useState(false)
  const [activeCartUuid, setActiveCartUuid] = useState(null)

  const isMulticheckoutPage = window.location.pathname?.includes('/multi-checkout')

  const cartsWithProducts = (orderState?.carts && Object.values(orderState?.carts).filter(cart => (cart.products && cart.products?.length > 0) || cart?.reservation)) || null
  const carts = businessSlug
    ? cartsWithProducts.filter((cart) => cart?.business?.slug === businessSlug || businessSlug === cart?.business_id)
    : cartsWithProducts

  const windowSize = useWindowSize()
  const onlineStatus = useOnlineStatus()

  const userCustomer = JSON.parse(window.localStorage.getItem('user-customer'))

  const isPreOrderSetting = configState?.configs?.preorder_status_enabled?.value === '1'
  // The header's parts the theme hides (visibility.header.*). The order
  // options (type, moment, address) follow visibility.order_context.*; the
  // customer of the customer mode always shows.
  const isHideLanguages = themeHidden(theme, 'header.language_selector')
  const isHideCart = themeHidden(theme, 'header.cart')
  const showMenuToggle = themeVisible(theme, 'header.menu_toggle')
  const showLogo = themeVisible(theme, 'header.logo')
  const showMap = themeVisible(theme, 'header.map')
  const showLogin = themeVisible(theme, 'header.login')
  const showSignup = themeVisible(theme, 'header.signup')
  const isFarAwayVisible = themeVisible(theme, 'header.far_away')
  const showFarAway = isFarAwayVisible && isFarAway
  const cateringTypeString = orderState?.options?.type === 7
    ? 'catering_delivery'
    : orderState?.options?.type === 8
      ? 'catering_pickup'
      : null

  const cateringValues = getCateringValues(cateringTypeString, pathname.includes('store') && Object?.keys(business || {})?.length > 0 ? business?.configs : configState?.configs)

  const hasSavedAddressContext = Boolean(
    orderState?.options?.address || orderState?.options?.address_id
  )

  const hasOrderAddress = Boolean(
    orderState?.options?.address?.address || orderState?.options?.address?.location
  )

  const hideHomeOrderContext = isHome && !hasOrderAddress

  const handleSuccessSignup = (user) => {
    closeAuthModal()
    login({
      user,
      token: user?.session?.access_token
    })
  }

  const handleClickUserCustomer = (e) => {
    const isActionsClick = clearCustomer.current?.contains(e?.target)
    if (isActionsClick) {
      setConfirm({
        open: true,
        content: t('QUESTION_CLEAR_CUSTOMER', 'Are you sure that you want to clear the customer?'),
        handleOnAccept: () => {
          deleteUserCustomer(true)
          refreshOrderOptions()
          handleGoToPage({ page: 'home' })
          setConfirm({ ...confirm, open: false })
        }
      })
      return
    }
    setCustomerModalOpen(true)
  }

  const openModal = (opt) => {
    setModalSelected(opt)
    setModalIsOpen(true)
  }

  const openMap = (event) => {
    mapOpenerRef.current = event.currentTarget
    openModal('address-map')
  }

  const mapFinalFocus = () => {
    if (mapOpenerRef.current?.isConnected) return mapOpenerRef.current
    return headerRef.current?.querySelector('[data-header-map-trigger]') ?? headerRef.current
  }

  // implementation noteswhere the store page (direct menu) has the cart panel beside the menu, the cart icon takes the person
  // to it instead of opening the drawer. True when it did; otherwise the icon behaves as ever.
  const goToStoreCartAside = () => storeCartInPage() === 'aside' && focusStoreCartAside(motionScrollBehavior(theme))

  const handleTogglePopover = (type) => {
    setOpenPopover({
      ...openPopover,
      [type]: !openPopover[type]
    })
  }

  const handleClosePopover = (type) => {
    setOpenPopover({
      ...openPopover,
      [type]: false
    })
  }

  const handleGoToPage = (data) => {
    events.emit('go_to_page', data)
    if (isCustomerMode && pathname.includes('/orders')) {
      deleteUserCustomer(true)
      refreshOrderOptions()
    }
  }

  const handleCustomModalClick = (e, { page }) => {
    e.preventDefault()
    setModalPageToShow(page)
  }

  const closeAuthModal = () => {
    setAuthLoading(false)
    setAuthModalOpen(false)
    setModalPageToShow(null)
  }

  const handleSuccessLogin = (user) => {
    if (user) {
      closeAuthModal()
    }
  }

  const handleOpenLoginSignUp = (index) => {
    if (isCustomerMode) {
      events.emit('go_to_page', { page: 'home' })
    } else {
      setModalPageToShow(index)
      setAuthModalOpen(true)
    }
  }

  const handleClosePreorder = () => {
    setPreorderBusiness(null)
  }

  const handleBusinessClick = (business) => {
    events.emit('go_to_page', { page: 'business', params: { store: business.slug } })
  }

  const handleLogoClick = () => {
    if (isTrackingOnly) {
      handleGoToPage({ page: 'home' })
      return
    }
    if (isFranchise) {
      window.localStorage.setItem('change_store_redirect', 'true')
      window.localStorage.removeItem('single_business')
    }
    if (themeBusinessSlug) {
      handleGoToPage({ page: 'business', params: { business_slug: themeBusinessSlug } })
      return
    }
    handleGoToPage(logoHomeTarget || { page: 'home' })
  }

  useEffect(() => {
    const handleProductAdded = (product, cart) => {
      setActiveCartUuid(cart?.uuid)
    }
    const handleProductUpdated = (product, cart) => {
      setActiveCartUuid(cart?.uuid)
    }
    const handleCartPopoverClosed = () => {
      setActiveCartUuid(null)
    }
    const handleRequireOrderAddress = (payload) => {
      // the emitters send the order type; this effect's orderState would be stale
      if (!showsCustomerAddress(payload?.orderType)) return
      openModal('address')
    }
    // The cart of the business's fixed header (BusinessStickyHeader): the
    // popover on wide screens, the cart modal on narrow ones (as the header's)
    const handleHeaderCartOpen = () => {
      if (goToStoreCartAside()) return
      if (window.innerWidth > 768) {
        setOpenPopover(popover => ({ ...popover, cart: true }))
        return
      }
      openModal('cart')
    }
    // Single Restaurant, from BusinessBasicInformation (a
    // different tree): the store's own logo, live off the business it has
    // loaded — cached for pages (orders, profile) that have neither it nor a
    // cart of the store to read it from.
    const handleStoreLogo = (logo) => {
      setLiveStoreLogo(logo || null)
      writeStoredBrandLogo(updatedBusinessSlugRef.current, logo || null)
    }
    // The store's name, to tell whether the brand repeats the store block's.
    const handleStoreName = (name) => setLiveStoreName(name || null)
    // Whether the store block is in view, from its IntersectionObserver.
    const handleStoreInView = (inView) => {
      hasReceivedInViewRef.current = true
      setStoreBlockInView(!!inView)
    }
    events.on('cart_product_added', handleProductAdded)
    events.on('cart_product_updated', handleProductUpdated)
    events.on('cart_popover_closed', handleCartPopoverClosed)
    events.on('require_order_address', handleRequireOrderAddress)
    events.on('header_cart_open', handleHeaderCartOpen)
    events.on('single_store_logo', handleStoreLogo)
    events.on('single_store_in_view', handleStoreInView)
    events.on('single_store_name', handleStoreName)
    return () => {
      events.off('cart_product_added', handleProductAdded)
      events.off('cart_product_updated', handleProductUpdated)
      events.off('cart_popover_closed', handleCartPopoverClosed)
      events.off('require_order_address', handleRequireOrderAddress)
      events.off('header_cart_open', handleHeaderCartOpen)
      events.off('single_store_logo', handleStoreLogo)
      events.off('single_store_in_view', handleStoreInView)
      events.off('single_store_name', handleStoreName)
    }
  }, [])

  const handleCloseCartModal = () => {
    setActiveCartUuid(null)
    setModalIsOpen(false)
  }

  useEffect(() => {
    if (isCustomerMode) {
      setCustomerModalOpen(false)
    }
  }, [customerState?.user?.address])

  useEffect(() => {
    // hidden by the theme, or an order without the customer's address (pickup…):
    // no position asked for it, so the browser shows no location prompt
    if (!isFarAwayVisible || !showsCustomerAddress(orderState?.options?.type) || !(pathname.includes('/search') || pathname.includes('/checkout'))) {
      setIsFarAway(false)
      return
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const crd = pos.coords
      const distance = getDistance(crd.latitude, crd.longitude, orderState?.options?.address?.location?.lat, orderState?.options?.address?.location?.lng)
      if (distance > 20) setIsFarAway(true)
      else setIsFarAway(false)
    }, (err) => {
      console.warn(`ERROR(${err.code}): ${err.message}`)
    }, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    })
  }, [orderState?.options?.address?.location, orderState?.options?.type, pathname, isFarAwayVisible])

  const apiLogotype = themeImage(theme, 'logotype')
  const apiIsotype = themeImage(theme, 'isotype')
  const isMobileLogo = windowSize.width <= 768
  // the order context's controls this row has (the rest are in the bar the
  // page docks under the header)
  const inHeaderWidth = orderContextInHeader(windowSize.width)
  // the theme's visibility.order_context.*, the address also needing the
  // order type (implementation notes, showsCustomerAddress)
  const orderContextShown = orderContextVisible(theme, orderState?.options?.type)
  const inHeader = {
    // no allowed types yet (the configuration loading): no type piece, so no
    // empty capsule
    type: inHeaderWidth.type && orderContextShown.type && !!configState?.configs?.order_types_allowed?.value,
    moment: inHeaderWidth.moment && orderContextShown.moment,
    address: inHeaderWidth.address && orderContextShown.address
  }
  // With a fixed header, once the bar docked under it has left
  // the view the row has a chip with its summary: the address, or the moment
  // when the theme hides the address (visibility.order_context.*); none
  // without either, as the bar
  const momentShown = orderContextShown.moment && isPreOrderSetting
  const chipLabel = orderContextShown.address
    ? orderState.options?.address?.address || t('WHAT_IS_YOUR_ADDRESS', 'What\'s your address?')
    : momentShown
      ? orderState.options?.moment
        ? parseDate(orderState.options.moment, { outputFormat: `${preorderDateFormat} ${timeFormat}` })
        : t('ASAP_ABBREVIATION', 'ASAP')
      : null
  // The chip stays mounted (with its last label) while its sheet is open,
  // whatever else changes: unmounting it would drop the sheet and the focus
  const [chipBusy, setChipBusy] = useState(false)
  const lastChipLabel = useRef(null)
  if (chipLabel) lastChipLabel.current = chipLabel
  const showChip = chipBusy || (scrollBehavior === HEADER_SCROLL_FIXED && dockOut && !!chipLabel && onlineStatus && !isCustomerMode && !hideHomeOrderContext)
  const logotypeSrc = getSiteLogoUrl(apiLogotype, BUNDLED_IMAGES.logos.logotype)
  const isotypeSrc = getSiteLogoUrl(
    apiIsotype,
    isMobileLogo ? BUNDLED_IMAGES.logos.isotypeInvert : BUNDLED_IMAGES.logos.isotype
  )
  // Single Restaurant: which brand the header shows — its own
  // logo image, else the single store's own logo (live, off the event from
  // its page > its cart > the last one persisted for this store), else the
  // site's own name as text; with none of those, no LogoHeader at all (the
  // menu sits next to the order context, no empty box). `singleStore` false
  // (Marketplace, no singleStoreSlug) keeps this exactly as before: its own
  // logo or name, the store logo never considered.
  const singleStore = !!updatedBusinessSlug
  const cartStoreLogo = singleStore
    ? singleStoreCarts(Object.values(orderState?.carts || {}), updatedBusinessSlug).find(cart => cart?.business?.logo)?.business?.logo || null
    : null
  const storeLogo = singleStore ? (liveStoreLogo || cartStoreLogo || readStoredBrandLogo(updatedBusinessSlug)) : null
  const ownName = ownSiteName({ theme, site })
  const brand = headerBrand({ logotypeSrc, isotypeSrc, storeLogo, name: ownName, singleStore })
  const showLogoHeader = showLogo && !!brand
  // hidden while the store block is in view, only on the store's own page
  // (elsewhere — checkout, orders, profile, pages… — it always shows, rule 3)
  // and only when it repeats the block (the store's logo or its same name; a
  // site logo or a different site name stays)
  const storeName = singleStore
    ? (liveStoreName || singleStoreCarts(Object.values(orderState?.carts || {}), updatedBusinessSlug).find(cart => cart?.business?.name)?.business?.name || null)
    : null
  // same theme per platform as the block (ThemeContext/usePlatformTheme), so
  // whether the block paints its logo at this width is decided the same way
  // here, with no flicker
  const storeBlockShowsLogo = themeVisible(theme, 'business.header.logo')
  const hideBrand = onStoreOwnPage && storeBlockInView && brandRepeatsStore(brand, storeName, storeBlockShowsLogo)

  if (isTrackingOnly) {
    return (
      <HeaderContainer ref={headerRef} data-app-header='' data-scroll-behavior={scrollBehavior}>
        <InnerHeader>
          <LeftSide>
            <LeftHeader id='left-side'>
              {showLogoHeader && (
                <LogoHeader onClick={handleLogoClick} aria-label={t('GO_TO_HOME', 'Go to home')} $disabledResponsive={brand.kind === 'store'}>
                  {/* the header's logo box sizes them (components.header
                      logo_height / logo_width); above the fold, loaded at once */}
                  {brand.kind === 'site' && brand.logotypeSrc && (
                    <img
                      alt={t('LOGO', 'Logo')}
                      src={brand.logotypeSrc}
                      loading='eager'
                    />
                  )}
                  {brand.kind === 'site' && brand.isotypeSrc && (
                    <img
                      alt={t('LOGO', 'Logo')}
                      loading='eager'
                      src={brand.isotypeSrc}
                    />
                  )}
                  {brand.kind === 'store' && (
                    <img
                      alt={t('LOGO', 'Logo')}
                      src={brand.storeLogo}
                      loading='eager'
                    />
                  )}
                  {brand.kind === 'name' && (
                    <LogoHeaderName title={brand.name}>{brand.name}</LogoHeaderName>
                  )}
                </LogoHeader>
              )}
            </LeftHeader>
          </LeftSide>
        </InnerHeader>
      </HeaderContainer>
    )
  }

  const languageSelector = !isHideLanguages && (
    <LanguageSelectorWrapper>
      <LanguageSelector />
    </LanguageSelectorWrapper>
  )

  return (
    <HeaderContainer ref={headerRef} tabIndex={-1} data-app-header='' data-scroll-behavior={scrollBehavior}>
      <InnerHeader>
        <LeftSide>
          <LeftHeader id='left-side'>
            {showMenuToggle && (
              <SidebarMenu
                notificationState={notificationState}
                auth={auth}
                isHideSignup={isHideSignup}
                userCustomer={userCustomer ?? user}
                isCustomerMode={isCustomerMode}
                logoHomeTarget={logoHomeTarget}
              />
            )}
            {!showMenuToggle && !showLogoHeader && (
              <CheckoutHomeExit>
                <PieceButton
                  data-doc-control='checkout-home-exit'
                  appearance='ghost'
                  color='neutral'
                  onClick={handleLogoClick}
                >
                  {t('GO_TO_HOME', 'Go to home')}
                </PieceButton>
              </CheckoutHomeExit>
            )}
            <HeaderStoreSlot {...{ [HEADER_STORE_SLOT_ATTRIBUTE]: '' }} />
            {showLogoHeader && (
              <LogoHeader
                {...{ [HEADER_LOGO_ATTRIBUTE]: '' }}
                onClick={handleLogoClick}
                aria-label={t('GO_TO_HOME', 'Go to home')}
                $disabledResponsive={brand.kind === 'store'}
                $hideBrand={hideBrand}
                aria-hidden={hideBrand ? 'true' : undefined}
                tabIndex={hideBrand ? -1 : undefined}
              >
                {brand.kind === 'site' && brand.logotypeSrc && (
                  <img
                    alt={t('LOGO', 'Logo')}
                    src={brand.logotypeSrc}
                    loading='lazy'
                  />
                )}
                {brand.kind === 'site' && brand.isotypeSrc && (
                  <img
                    alt={t('LOGO', 'Logo')}
                    loading='lazy'
                    src={brand.isotypeSrc}
                  />
                )}
                {brand.kind === 'store' && (
                  <img
                    alt={t('LOGO', 'Logo')}
                    loading='lazy'
                    src={brand.storeLogo}
                  />
                )}
                {brand.kind === 'name' && (
                  <LogoHeaderName title={brand.name}>{brand.name}</LogoHeaderName>
                )}
              </LogoHeader>
            )}
            {showChip && (
              <OrderContextChip
                icon={orderContextShown.address ? 'mapMarker' : 'clockOutline'}
                label={chipLabel || lastChipLabel.current}
                onBusyChange={setChipBusy}
                onOpenModal={openModal}
              />
            )}
          </LeftHeader>

          {windowSize.width >= 576 && !hideHomeOrderContext && !['/signup_business', '/signup-driver'].includes(location.pathname) && (
            <Menu id='center-side' className='left-header' isCustomerMode={isCustomerMode}>
              {/* the order context capsule: the type switcher, the moment and
                  the address, whichever this width has (orderContextPlacement),
                  one surface instead of separate fields */}
              {(inHeader.type || (onlineStatus && !isCustomerMode && (inHeader.moment || inHeader.address))) && (
                <OrderContextCapsule aria-label={t('YOUR_ORDER', 'Your order')}>
                  {inHeader.type && (
                    <AddressOrderTypeContainer>
                      <AddressOrderType />
                    </AddressOrderTypeContainer>
                  )}
                  {onlineStatus && !isCustomerMode && inHeader.moment && (isPreOrderSetting || configState?.configs?.preorder_status_enabled?.value === undefined) && (
                    <>
                      {inHeader.type && <Divider />}
                      <MomentMenu
                        onClick={isPreorderDisabled
                          ? null
                          : () => openModal('moment')}
                        disabled={!!isPreorderDisabled}
                        aria-haspopup='dialog'
                      >
                        <div>
                          <OrderIcon name='clockOutline' />
                          {orderState.options?.moment
                            ? parseDate(orderState.options?.moment, { outputFormat: `${preorderDateFormat} ${timeFormat}` })
                            : t('ASAP_ABBREVIATION', 'ASAP')}
                          <ChevronIcon kind='list' />
                        </div>
                      </MomentMenu>
                    </>
                  )}
                  {onlineStatus && !isCustomerMode && inHeader.address && (
                    <>
                      {(inHeader.type || inHeader.moment) && <Divider />}
                      <AddressWrapper>
                        {windowSize.width > 850 && showFarAway && (
                          <FarAwayMessage>
                            <HeaderIcon name="caretUpFill" />
                            <span>{t('YOU_ARE_FAR_FROM_ADDRESS_INFO', 'Is this the right address? It seems like you\'re a bit far away.')}</span>
                          </FarAwayMessage>
                        )}
                        <AddressMenu
                          onClick={() => openModal('address')}
                        >
                          <OrderIcon name='mapMarker' />
                          <span>
                            <p title={orderState.options?.address?.address || undefined}>
                              {orderState.options?.address?.address || t('WHAT_IS_YOUR_ADDRESS', 'What\'s your address?')}
                            </p>
                          </span>
                        </AddressMenu>
                      </AddressWrapper>
                    </>
                  )}
                </OrderContextCapsule>
              )}
              {isCustomerMode && showsCustomerAddress(orderState?.options?.type) && (
                <>
                  <AddressWrapper>
                    {windowSize.width > 850 && showFarAway && (
                      <FarAwayMessage>
                        <HeaderIcon name="caretUpFill" />
                        <span>{t('YOU_ARE_FAR_FROM_ADDRESS_INFO', 'Is this the right address? It seems like you\'re a bit far away.')}</span>
                      </FarAwayMessage>
                    )}
                    <AddressMenu
                      isCustomerMode={isCustomerMode}
                      onClick={(e) => handleClickUserCustomer(e)}
                    >
                      <OrderIcon name='mapMarker' />
                      <span title={orderState.options?.address?.address || undefined}>{orderState.options?.address?.address || t('LANG_WHAT_IS_YOUR_ADDRESS', 'What\'s your address?')}</span>
                    </AddressMenu>
                  </AddressWrapper>
                  <Divider />
                </>
              )}
              {isCustomerMode && windowSize.width > 450 && (
                <>
                  <CustomerInfo
                    onClick={(e) => handleClickUserCustomer(e)}
                  >
                    <span>
                      <p title={`${userCustomer?.name ?? ''} ${userCustomer?.lastname ?? ''}`.trim() || undefined}>{userCustomer?.name} {userCustomer?.lastname}</p>
                    </span>
                    <span
                      ref={clearCustomer}
                    >
                      <HeaderIcon name="close" />
                    </span>
                  </CustomerInfo>
                  <Divider />
                </>
              )}
            </Menu>
          )}
        </LeftSide>
        {onlineStatus && (
          <RightHeader id='right-side'>
            <Menu isCustomerMode={isCustomerMode}>
              {showMap && !hideMapIcon && windowSize.width > 768 && !hideHomeOrderContext && !['/signup_business', '/signup-driver'].includes(location.pathname) && window.location.search !== '?view=map' && (
                <HeaderMapButton data-header-map-trigger='' onClick={openMap} aria-label={t('BUSINESSES_MAP', 'Businesses Map')} />
              )}
              {
                !auth && windowSize.width > 920 && (
                  <>
                    {/* login is a button of the row's size (md), a ghost one,
                        unless the theme hides it */}
                    {showLogin && (
                      <ComponentScope group='header'>
                        <PieceButton
                          type='button'
                          {...slotButtonOptions(theme, 'header', 'login', LOGIN_LOOK)}
                          name='signin'
                          onClick={() => handleOpenLoginSignUp('login')}
                        >
                          {t('LOGIN', 'Login')}
                        </PieceButton>
                      </ComponentScope>
                    )}
                    {!isHideSignup && showSignup && (
                      <ComponentScope group='header'>
                        <PieceButton
                          type='button'
                          {...slotButtonOptions(theme, 'header', 'signup', SIGNUP_LOOK)}
                          name='signup'
                          className='signup-button'
                          onClick={() => handleOpenLoginSignUp('signup')}
                        >
                          {t('SIGN_UP', 'Sign up')}
                        </PieceButton>
                      </ComponentScope>
                    )}
                  </>
                )
              }
              {
                // the cart is the header's for everyone, with or without a session: a guest's
                // cart is the order's, as the bar's "View cart" reads it
                (
                  <>
                    {windowSize.width > 768
                      ? !isMulticheckoutPage
                          ? <CartPopover
                              open={openPopover.cart}
                              carts={carts}
                              onClick={() => goToStoreCartAside() || handleTogglePopover('cart')}
                              onClose={() => handleClosePopover('cart')}
                              auth={auth}
                              location={location}
                              isCustomerMode={isCustomerMode}
                              setPreorderBusiness={setPreorderBusiness}
                              hideButton={isHideCart}
                            />
                          : null
                      : (
                        <>
                          {auth && showMap && !hideMapIcon && !hideHomeOrderContext && !['/signup_business', '/signup-driver'].includes(location.pathname) && window.location.search !== '?view=map' && (
                            <HeaderMapButton data-header-map-trigger='' onClick={openMap} aria-label={t('BUSINESSES_MAP', 'Businesses Map')} />
                          )}
                          {/* the language select before the cart: the cart is the last control, at the page's side */}
                          {languageSelector}
                          {!isHideCart && (
                            // HeaderOption passes no pointer handlers: the chunk of the cart it
                            // opens downloads on hover / focus / touch (the wrapper has no box)
                            <span style={{ display: 'contents' }} onPointerEnter={preloadCart} onFocus={preloadCart} onTouchStart={preloadCart}>
                              <HeaderOption
                                variant='cart'
                                totalCarts={cartItemsCount(carts)}
                                onClick={(variant) => openModal(variant)}
                              />
                            </span>
                          )}
                        </>
                        )
                    }
                  </>
                )
              }
              {/* wide: after the cart; narrow it is before it (above), so the cart is the row's last control */}
              {windowSize.width > 768 && languageSelector}
            </Menu>
          </RightHeader>
        )}
      </InnerHeader>
      {modalIsOpen && modalSelected === 'address-map' && (
        <AddressMapDialog
          finalFocus={mapFinalFocus}
          onClose={() => setModalIsOpen(false)}
          onExplore={() => {
            events.emit('go_to_page', { page: 'business_search', search: '?view=map' })
            setModalIsOpen(false)
          }}
        />
      )}
      {modalIsOpen && modalSelected !== 'address-map' && (
        <LazyDialog
          legacyMaxWidth
          {...((!auth || !hasSavedAddressContext) && modalSelected === 'address' && { title: t('WHAT_IS_YOUR_ADDRESS', 'What\'s your address?') })}
          {...(modalSelected === 'cart' && { title: t('YOUR_CART', 'Your cart') })}
          open={modalIsOpen}
          onClose={modalSelected === 'moment' && momentBusy ? undefined : () => setModalIsOpen(false)}
          showCloseButton={!(modalSelected === 'moment' && momentBusy)}
          {...(modalSelected === 'address' ? { width: orderState?.options?.user_id ? '70%' : '50%' } : { size: 'lg' })}
        >
          {modalSelected === 'cart' && (
            <CartContent
              isCartPopover
              carts={carts}
              isOrderStateCarts={!!orderState.carts}
              onClose={handleCloseCartModal}
              activeCartUuid={activeCartUuid}
              onActiveCartChange={setActiveCartUuid}
            />
          )}
          {modalSelected === 'address' && (
            auth && hasSavedAddressContext
              ? (
                <AddressList
                  isModal
                  changeOrderAddressWithDefault
                  userId={isNaN(userCustomer?.id) ? null : userCustomer?.id}
                  onCancel={() => setModalIsOpen(false)}
                  isCustomerMode={isCustomerMode}
                />
                )
              : (
                <AddressFormWrapper>
                  <AddressForm
                    useValidationFileds
                    address={orderState?.options?.address || {}}
                    onCancel={() => setModalIsOpen(false)}
                    onSaveAddress={() => setModalIsOpen(false)}
                    isCustomerMode={isCustomerMode}
                  />
                </AddressFormWrapper>
                )
          )}
          {modalSelected === 'moment' && (
            <MomentContent
              onClose={() => setModalIsOpen(false)}
              onBusyChange={setMomentBusy}
              cateringPreorder={!!cateringTypeString}
              isHeader
              business={(pathname.includes('store') && business) || isSingleBusiness}
              {...cateringValues}
            />
          )}
        </LazyDialog>
      )}
      {isCustomerMode && customerModalOpen && (
        <LazyDialog
          legacyMaxWidth
          open={customerModalOpen}
          width='80%'
          onClose={() => setCustomerModalOpen(false)}
          showCloseButton={false}
        >
          <UserEdit>
            {!customerState?.loading && (
              <>
                <UserDetails
                  isAddressFormOpen={isAddressFormOpen}
                  userData={customerState?.user}
                  userId={customerState?.user?.id}
                  isOpenUserData={isOpenUserData}
                  isCustomerMode
                  isModal
                  setIsOpenUserData={setIsOpenUserData}
                  onClose={() => setCustomerModalOpen(false)}
                />
                <AddressList
                  isModal
                  userId={customerState?.user?.id}
                  changeOrderAddressWithDefault
                  userCustomerSetup={customerState.user}
                  isOpenUserData={isOpenUserData}
                  setCustomerModalOpen={setCustomerModalOpen}
                  setIsOpenUserData={setIsOpenUserData}
                  setIsAddressFormOpen={setIsAddressFormOpen}
                  isHeader
                  isCustomerMode={isCustomerMode}
                />
              </>
            )}
          </UserEdit>
        </LazyDialog>
      )}
      {authModalOpen && !auth && (
        <LazyDialog
          legacyMaxWidth
          data-doc-section='header-authentication-dialog'
          open={authModalOpen}
          onClose={() => { if (!authLoading) closeAuthModal() }}
          width='50%'
          closeOnBackdrop={!authLoading}
        >
          {modalPageToShow === 'login' && (
            <LoginForm
              notificationState={notificationState}
              handleSuccessLogin={handleSuccessLogin}
              onAuthLoadingChange={setAuthLoading}
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
              notificationState={notificationState}
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
              closeModal={() => closeAuthModal()}
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
      <Confirm
        title={t('CUSTOMER', 'Customer')}
        content={confirm.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={isCustomerMode && confirm.open}
        onClose={() => setConfirm({ ...confirm, open: false })}
        onCancel={() => setConfirm({ ...confirm, open: false })}
        onAccept={confirm.handleOnAccept}
        closeOnBackdrop={false}
      />
      {!!preorderBusiness && (
        <LazyDialog
          data-doc-section='business-preorder-dialog'
          open={!!preorderBusiness}
          size='xl'
          onClose={() => handleClosePreorder()}
        >
          <BusinessPreorder
            business={preorderBusiness}
            handleClick={handleBusinessClick}
            showButton
          />
        </LazyDialog>
      )}
    </HeaderContainer>
  )
}

export default Header
