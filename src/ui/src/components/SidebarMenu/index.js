import React, { useCallback, useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useInertOutside } from '~ui/src/design-system/lib/inertOutside'
import { useTheme } from 'styled-components'
import {
  Container,
  SidebarContent,
  MenuClose,
  MenuLink,
  WrappContent,
  MenuLinkIcon,
  MenuLinkText,
  TextInfo,
  CustomerInfo,
  SidebarOverlay,
  sidebarOverlayColor,
  sidebarPanelWidth,
  sidebarShowsTitles
} from './styles'

import settings from '../../../../config'
import { useEvent } from '~components/contexts/EventContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSession } from '~components/contexts/SessionContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useSite } from '~components/contexts/SiteContext'
import { isWalletEnabled as isWalletConfigEnabled } from '~components/utils/configHelpers'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { LogoutButton } from '~ui/src/components/LogoutButton'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { SignUpForm } from '~ui/src/components/SignUpForm'
import { LoginForm } from '~ui/src/components/LoginForm'
import { ForgotPasswordForm } from '~ui/src/components/ForgotPasswordForm'
import { useEnabledLanguages } from '../../hooks/useEnabledLanguages'
import { useSavedCardsGateway } from '../SavedCards/useSavedCardsGateway'
import { ConnectionStatusRow } from './ConnectionStatusRow'

import { Icon } from '~ui/src/design-system/components/Icon'
import { Button } from '~ui/src/design-system/components/Button'
import { HeaderIcon } from '~ui/src/components/Icon/headerGlyphs'
import { SIDEBAR_MENU_ID } from '~ui/src/components/SidebarMenu/menuId'
import { themeVisible } from '~/utils/themeVisibility'
import { slotButtonOptions } from '~/utils/themeGroups'
import { isFranchise as isFranchiseSite, isFullWebsite, menuPath } from '~/utils/siteSettings'
import { isSingleStorePathname, shortStorePath, singleStoreSlug, themeStorePath } from '~/utils/singleStore'
import { ComponentScope } from '~ui/src/styles/ComponentScope'

// what takes the focus inside the panel (its close button is the first)
const PANEL_FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const SidebarMenu = (props) => {
  const { auth, isHideSignup, userCustomer, isCustomerMode, notificationState, logoHomeTarget } = props
  const [{ user }, { login }] = useSession()
  const [events] = useEvent()
  const [{ configs }] = useConfig()
  const [{ site }] = useSite()
  const [, t] = useLanguage()
  const { hasMultiple: hasMultipleLanguages } = useEnabledLanguages()
  const { isAvailable: savedCardsAvailable } = useSavedCardsGateway()
  const theme = useTheme()
  // the toggle is the header's menu_toggle piece; the close inside the panel
  // has no slot (an icon button of the theme's default look)
  const toggleOptions = slotButtonOptions(theme, 'header', 'menu_toggle', { color: 'neutral', appearance: 'ghost', size: 'md' })
  const { width } = useWindowSize()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [modalPageToShow, setModalPageToShow] = useState(null)
  const containerRef = useRef(null)
  // the panel lives in document.body (see the return), outside containerRef
  const panelRef = useRef(null)
  // the same element as state: what surrounds it is inert while the panel is open
  const [panelNode, setPanelNode] = useState(null)
  const setPanel = useCallback((el) => { panelRef.current = el; setPanelNode(el) }, [])
  // where the focus goes when the panel closes from inside, once the page is released
  const restoreFocus = useRef(false)
  // the menu button: the focus goes back to it when the panel closes from
  // inside (its close button, Escape)
  const toggleRef = useRef(null)

  // the option of the page on screen is the current one (aria-current)
  const currentPage = (active) => (active ? 'page' : undefined)

  const isProfileView = (view) => {
    if (typeof window === 'undefined') return false
    if (window.location.pathname !== '/profile') return false
    const params = new URLSearchParams(window.location.search)
    return params.get('view') === view
  }

  // The store of a single store site (its theme or the config's businessSlug)
  const websiteThemeBusinessSlug = singleStoreSlug(theme, settings)
  const isSingleStore = !!websiteThemeBusinessSlug
  const isFranchise = isFranchiseSite(theme, settings)
  const homePath = isSingleStore
    ? themeStorePath(theme, site, websiteThemeBusinessSlug)
    : logoHomeTarget?.page === 'search'
      ? '/search'
      : logoHomeTarget?.page === 'business'
        ? shortStorePath(logoHomeTarget.params.business_slug, { fullWebsite: isFullWebsite(theme) })
        : isFullWebsite(theme) ? menuPath(theme, settings) : '/home'

  const isProjectEnterpricePlan = configs?.plan_enterprise && configs?.plan_enterprise?.value
  const isWalletEnabled = configs?.cash_wallet?.value && isWalletConfigEnabled(configs)
  const isGiftCardDisabled = configs?.platform_store_giftcard_enabled?.value === '0' || configs?.platform_store_giftcard_enabled?.value === false
  const isPromotionsEnabled = configs?.advanced_offers_module?.value === '1' || configs?.advanced_offers_module?.value === true
  // the theme shows or hides Browse & Search (visibility menu.browse, like
  // the user popover). A single store has no listing to browse: never there.
  const hideBrowse = isSingleStore || !themeVisible(theme, 'menu.browse')
  // Home is current on its page (a single store: the store at either address)
  const isHomeCurrent = isSingleStore
    ? isSingleStorePathname(window.location.pathname, site, websiteThemeBusinessSlug, { fullWebsite: isFullWebsite(theme) })
    : window.location.pathname === homePath
  const hideOrders = !themeVisible(theme, 'menu.orders')
  const hideProfile = !themeVisible(theme, 'menu.profile')
  const hideMessages = !themeVisible(theme, 'menu.messages')
  const hideHelp = !themeVisible(theme, 'menu.help')
  const hideFavorites = !themeVisible(theme, 'menu.favorites')
  const hideSession = !themeVisible(theme, 'menu.sessions') || !isProjectEnterpricePlan
  const hidePromotions = !themeVisible(theme, 'menu.promotions')
  const showHome = themeVisible(theme, 'menu.home')
  const showGreeting = themeVisible(theme, 'menu.greeting')
  const showAddresses = themeVisible(theme, 'menu.addresses')
  const showCards = savedCardsAvailable && themeVisible(theme, 'menu.cards')
  const showLanguage = hasMultipleLanguages && themeVisible(theme, 'menu.language')
  const showNotifications = themeVisible(theme, 'menu.notifications')
  const showStudents = configs?.school_module_enabled?.value === '1'
  // a guest's Sign in and Sign up (menu.login, menu.signup)
  const showLogin = themeVisible(theme, 'menu.login')
  const showSignup = !isHideSignup && themeVisible(theme, 'menu.signup')
  // Rewards: the wallets (cash, loyalty points, gift cards) and the offers.
  // Each wallet has its key: menu.wallet the cash wallet, menu.loyalty_points,
  // menu.gift_cards
  const showWallets = isWalletEnabled && themeVisible(theme, 'menu.wallet')
  const showLoyaltyPoints = isWalletEnabled && themeVisible(theme, 'menu.loyalty_points')
  const showGiftCards = isWalletEnabled && !isGiftCardDisabled && themeVisible(theme, 'menu.gift_cards')
  // the user's loyalty level, a link to the points wallet that shows it
  // (menu.loyalty_levels, off by default)
  const showLoyaltyLevels = isWalletEnabled && themeVisible(theme, 'menu.loyalty_levels')
  const showOffers = isPromotionsEnabled && !hidePromotions
  const showRewards = showWallets || showLoyaltyPoints || showLoyaltyLevels || showGiftCards || showOffers
  // the socket's state, a row of Information (visibility connection_status)
  const showConnection = themeVisible(theme, 'connection_status')
  const showAccount = showStudents || showAddresses || showCards || !hideMessages || showLanguage || showNotifications
  // the groups' titles (sidebar_menu.base.show_titles), each
  // only with something in its group
  const showTitles = sidebarShowsTitles(theme)

  const closeModal = () => {
    setModalIsOpen(false)
    setModalPageToShow(null)
    actionSidebar(false)
  }

  const handleSuccessLogin = (user) => {
    if (user) {
      closeModal()
    }
  }

  const handleSuccessLogout = () => {
    events.emit('go_to_page', isSingleStore
      ? { page: 'business', params: { business_slug: websiteThemeBusinessSlug } }
      : { page: 'home' })
  }

  const handleOpenLoginSignUp = (index) => {
    setModalPageToShow(index)
    setModalIsOpen(true)
  }

  const handleGoToPage = (e, data) => {
    e.preventDefault()
    events.emit('go_to_page', data)
    actionSidebar(false)
    setIsMenuOpen(false)
  }

  const handleGoToHome = (e) => {
    if (isFranchise) {
      window.localStorage.setItem('change_store_redirect', 'true')
      window.localStorage.removeItem('single_business')
    }
    if (isSingleStore) {
      handleGoToPage(e, { page: 'business', params: { business_slug: websiteThemeBusinessSlug } })
      return
    }
    handleGoToPage(e, logoHomeTarget || { page: 'home' })
  }

  const actionSidebar = (value) => {
    setIsMenuOpen(value)
    document.getElementById(SIDEBAR_MENU_ID).style.width = value
      ? width > 489 ? sidebarPanelWidth(theme) : '100vw'
      : '0'
  }

  // closes the panel from inside it: the focus goes back to the menu button
  // (the panel's controls leave the tab order when it closes), as soon as the page is released:
  // an inert button takes no focus
  const closeFromInside = () => {
    restoreFocus.current = true
    actionSidebar(false)
  }

  // Open, the panel is the only thing in the tab order: the page behind (the header, its menu button
  // included) is inert, the focus is in the panel, and Tab and Shift+Tab go round its options.
  useInertOutside(panelNode, isMenuOpen)
  useEffect(() => {
    if (isMenuOpen) {
      panelRef.current?.querySelector(PANEL_FOCUSABLE)?.focus({ preventScroll: true })
    } else if (restoreFocus.current) {
      toggleRef.current?.focus?.()
      restoreFocus.current = false
    }
  }, [isMenuOpen])
  // a dialog that was over the panel leaves it without `inert` when it releases what it held: closed, the panel is inert
  useEffect(() => { if (!isMenuOpen) panelRef.current?.setAttribute('inert', '') }, [isMenuOpen, modalIsOpen])

  const keepFocusInPanel = (event) => {
    if (event.key !== 'Tab') return
    const options = Array.from(event.currentTarget.querySelectorAll(PANEL_FOCUSABLE))
    const [first, last] = [options[0], options[options.length - 1]]
    if (!first) return
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  const handleCustomModalClick = (e, { page }) => {
    e.preventDefault()
    // Keep focus on a dialog action when the link's form is replaced.
    e.currentTarget.closest('[role="dialog"]')?.querySelector('[data-slot="dialog-close-button"]')?.focus({ preventScroll: true })
    setModalPageToShow(page)
  }

  const handleSuccessSignup = (user) => {
    login({
      user,
      token: user?.session?.access_token
    })
    closeModal()
  }

  useEffect(() => {
    if (isMenuOpen) {
      if (width <= 489) {
        document.getElementById(SIDEBAR_MENU_ID).style.width = '100vw'
      } else {
        document.getElementById(SIDEBAR_MENU_ID).style.width = sidebarPanelWidth(theme)
      }
    }
  }, [width])

  useEffect(() => {
    const handleClickOutside = (event) => {
      const inside = containerRef.current?.contains(event.target) || panelRef.current?.contains(event.target)
      // the same way out as Escape and the X: the focus goes back to the menu button, not to the body
      if (containerRef.current && !inside && isMenuOpen) {
        closeFromInside()
        // the native action of the pointer comes after this mousedown and leaves the focus on the body when the
        // target takes none: give it back in the next frame, unless the click already took it elsewhere
        requestAnimationFrame(() => { if (document.activeElement === document.body) toggleRef.current?.focus?.() })
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  // Escape closes the open panel and gives the focus back to the menu button
  useEffect(() => {
    if (!isMenuOpen) return
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      closeFromInside()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  const hasCustomerName = !!(userCustomer?.name || userCustomer?.lastname)
  const isWalletsPage = window.location.pathname === '/wallets'
  const walletSearchParam = new URLSearchParams(window.location.search).get('wallet')
  const currentWallet = isWalletsPage ? (walletSearchParam || 'cash') : null

  return (
    <Container $auth={auth} ref={containerRef}>
      <ComponentScope group='header'>
        <Button
          {...toggleOptions}
          shape='icon'
          ref={toggleRef}
          aria-label={t('OPEN_SIDEBAR_MENU', 'Open menu')}
          aria-expanded={isMenuOpen}
          aria-controls={SIDEBAR_MENU_ID}
          onClick={() => actionSidebar(true)}
        >
          <HeaderIcon name='menuBars' />
        </Button>
      </ComponentScope>
      {/* The panel and its overlay hang from document.body: the header is a
          stacking context (HEADER_LAYER, sticky), and inside it the panel's
          20500 would sit under the modals and the cookie banner. */}
      {createPortal(
        <>
        {/* the overlay of components.sidebar_menu behind the panel */}
        {isMenuOpen && sidebarOverlayColor(theme) && (
          <SidebarOverlay $color={sidebarOverlayColor(theme)} />
        )}
        {/* closed (width 0, clipped) its options are out of the tab order and
            of the accessibility tree: inert */}
        <SidebarContent
          id={SIDEBAR_MENU_ID}
          ref={setPanel}
          onKeyDown={keepFocusInPanel}
          $open={isMenuOpen}
          {...(!isMenuOpen && { inert: '' })}
        >
          {/* the header row is always there (the header's height and shadow),
              with the greeting when there is a customer */}
          <CustomerInfo>
            {hasCustomerName && showGreeting && (
              <p>{t('HI', 'Hi')} <span className='customer-name' title={`${userCustomer?.name ?? ''} ${userCustomer?.lastname ?? ''}`}>{`${userCustomer?.name ?? ''} ${userCustomer?.lastname ?? ''}`}</span></p>
            )}
          </CustomerInfo>
          <MenuClose>
            <Button
              color='neutral'
              appearance='ghost'
              size='md'
              shape='icon'
              aria-label={t('CLOSE_SIDEBAR_MENU', 'Close menu')}
              onClick={closeFromInside}
            >
              <HeaderIcon name='menuBars' />
            </Button>
          </MenuClose>
          {showHome && (
            <MenuLink
              aria-current={currentPage(isHomeCurrent)}
              onClick={handleGoToHome}
              href={homePath}
            >
              <WrappContent>
                <MenuLinkIcon
                  active={isHomeCurrent}
                >
                  <Icon name="homeOutline" />
                </MenuLinkIcon>
                <MenuLinkText>
                  <TextInfo
                    active={isHomeCurrent}
                  >
                    {t('HOME', 'Home')}
                  </TextInfo>
                </MenuLinkText>
              </WrappContent>
            </MenuLink>
          )}
          {auth && (
            <>
              {!hideBrowse && (
                <MenuLink
                  aria-current={currentPage(window.location.pathname === '/business_search')}
                  onClick={(e) => handleGoToPage(e, { page: 'business_search' })}
                  href='/business_search'
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={
                        window.location.pathname === '/business_search'
                      }
                    >
                      <Icon name="searchOutline" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={
                          window.location.pathname === '/business_search'
                        }
                      >
                        {t('BROWSE_SEARCH', 'Browse & Search')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {!hideFavorites && (
                <MenuLink
                  aria-current={currentPage(window.location.pathname === '/favorite')}
                  onClick={(e) => handleGoToPage(e, { page: 'favorite' })}
                  href='/favorite'
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={
                        window.location.pathname === '/favorite'
                      }
                    >
                      <Icon name="heartOutline" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={
                          window.location.pathname === '/favorite'
                        }
                      >
                        {t('FAVORITES', 'Favorites')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {!isCustomerMode && !hideOrders && (
                <MenuLink
                  aria-current={currentPage(window.location.pathname === '/profile/orders')}
                  onClick={(e) => handleGoToPage(e, { page: 'orders' })}
                  href='/profile/orders'
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={
                        window.location.pathname === '/profile/orders'
                      }
                    >
                      <Icon name="shopping" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={
                          window.location.pathname === '/profile/orders'
                        }
                      >
                        {t('ORDERS', 'Orders')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {!hideProfile && (
                <MenuLink
                  aria-current={currentPage(isProfileView('account'))}
                  onClick={(e) => handleGoToPage(e, { page: 'profile', search: '?view=account' })}
                  href='/profile'
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={isProfileView('account')}
                    >
                      <Icon name="userOutlineAi" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={isProfileView('account')}
                      >
                        {t('VIEW_ACCOUNT', 'View account')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {/* the section only with something in it */}
              {showTitles && showRewards && <h3>{t('REWARDS', 'Rewards')}</h3>}
              {showWallets && (
                <MenuLink
                  aria-current={currentPage(currentWallet === 'cash')}
                  onClick={(e) => handleGoToPage(e, { page: 'wallets', search: '?wallet=cash' })}
                  href='/wallets?wallet=cash'
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={currentWallet === 'cash'}
                    >
                      <Icon name="dollarCircle" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={currentWallet === 'cash'}
                      >
                        {t('CASH_WALLET', 'Cash wallet')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {showLoyaltyPoints && (
                <MenuLink
                  aria-current={currentPage(currentWallet === 'credit_point')}
                  onClick={(e) => handleGoToPage(e, { page: 'wallets', search: '?wallet=credit_point' })}
                  href='/wallets?wallet=credit_point'
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={currentWallet === 'credit_point'}
                    >
                      <Icon name="book" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={currentWallet === 'credit_point'}
                      >
                        {t('LOYALTY_POINTS', 'Loyalty points')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {showLoyaltyLevels && (
                <MenuLink
                  onClick={(e) => handleGoToPage(e, { page: 'wallets', search: '?wallet=credit_point' })}
                  href='/wallets?wallet=credit_point'
                >
                  <WrappContent>
                    <MenuLinkIcon>
                      <Icon name="starOutline" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo>
                        {t('LOYALTY_LEVELS', 'Loyalty levels')}
                      </TextInfo>
                      {user?.loyalty_level?.name && (
                        <TextInfo bold>
                          {user.loyalty_level.name}
                        </TextInfo>
                      )}
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {showGiftCards && (
                <MenuLink
                  aria-current={currentPage(currentWallet === 'gift_card')}
                  onClick={(e) => handleGoToPage(e, { page: 'wallets', search: '?wallet=gift_card' })}
                  href='/wallets?wallet=gift_card'
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={currentWallet === 'gift_card'}
                    >
                      <Icon name="giftOutline" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={currentWallet === 'gift_card'}
                      >
                        {t('GIFT_CARDS', 'Gift cards')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {showOffers && (
                <MenuLink
                  aria-current={currentPage(window.location.pathname === '/promotions')}
                  onClick={(e) => handleGoToPage(e, { page: 'promotions' })}
                  href='/promotions'
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={
                        window.location.pathname === '/promotions'
                      }
                    >
                      <Icon name="tags" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={
                          window.location.pathname === '/promotions'
                        }
                      >
                        {t('OFFERS', 'Offers')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {showTitles && showAccount && <h3>{t('MY_ACCOUNT', 'My account')}</h3>}
              {showStudents && (
                <MenuLink
                  aria-current={currentPage(isProfileView('students'))}
                  onClick={(e) => handleGoToPage(e, { page: 'profile', search: '?view=students' })}
                  href='/profile'
                >
                  <WrappContent>
                    <MenuLinkIcon active={isProfileView('students')}>
                      <Icon name="read" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo active={isProfileView('students')}>
                        {t('SCHOOL_MY_STUDENTS', 'My students')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {showAddresses && (
                <MenuLink
                  aria-current={currentPage(isProfileView('savedPlaces'))}
                  onClick={(e) => handleGoToPage(e, { page: 'profile', search: '?view=savedPlaces' })}
                  href='/profile'
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={isProfileView('savedPlaces')}
                    >
                      <Icon name="environment" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={isProfileView('savedPlaces')}
                      >
                        {t('MY_ADDRESSES', 'My addresses')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {showCards && (
                <MenuLink
                  aria-current={currentPage(typeof window !== 'undefined' && window.location.pathname === '/profile/cards')}
                  onClick={(e) => handleGoToPage(e, { page: 'cards' })}
                  href='/profile/cards'
                >
                  <WrappContent>
                    <MenuLinkIcon active={typeof window !== 'undefined' && window.location.pathname === '/profile/cards'}>
                      {/* every icon of the panel is an Ant outline */}
                      <Icon name='creditCardOutline' />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo active={typeof window !== 'undefined' && window.location.pathname === '/profile/cards'}>
                        {t('MY_CARDS', 'My cards')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {!hideMessages && (
                <MenuLink
                  aria-current={currentPage(window.location.pathname === '/messages')}
                  onClick={(e) => handleGoToPage(e, { page: 'messages' })}
                  href='/messages'
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={
                        window.location.pathname === '/messages'
                      }
                    >
                      <Icon name="message" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={
                          window.location.pathname === '/messages'
                        }
                      >
                        {t('MESSAGES', 'Messages')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {showLanguage && (
                <MenuLink
                  aria-current={currentPage(isProfileView('language'))}
                  onClick={(e) => handleGoToPage(e, { page: 'profile', search: '?view=language' })}
                  href='/profile'
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={isProfileView('language')}
                    >
                      <Icon name="translation" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={isProfileView('language')}
                      >
                        {t('LANGUAGE', 'Language')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {showNotifications && (
                <MenuLink
                  aria-current={currentPage(isProfileView('notifications'))}
                  onClick={(e) => handleGoToPage(e, { page: 'profile', search: '?view=notifications' })}
                  href='/profile'
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={isProfileView('notifications')}
                    >
                      <Icon name="bell" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={isProfileView('notifications')}
                      >
                        {t('NOTIFICATIONS', 'Notifications')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {/* its title only with Help, Sessions or the connection status (Logout, always in this
                  group, goes on without it) */}
              {showTitles && (!hideHelp || !hideSession || showConnection) && <h3>{t('INFORMATION', 'Information')}</h3>}
              {!hideHelp && (
                <MenuLink
                  aria-current={currentPage(window.location.pathname === '/help')}
                  onClick={(e) => handleGoToPage(e, { page: 'help' })}
                  href='/help'
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={
                        window.location.pathname === '/help'
                      }
                    >
                      <Icon name="infoCircleOutline" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={
                          window.location.pathname === '/help'
                        }
                      >
                        {t('HELP', 'help')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {!hideSession && (
                <MenuLink
                  aria-current={currentPage(window.location.pathname === '/sessions')}
                  onClick={(e) => handleGoToPage(e, { page: 'sessions' })}
                  href='/sessions'
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={
                        window.location.pathname === '/sessions'
                      }
                    >
                      <Icon name="safety" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={
                          window.location.pathname === '/sessions'
                        }
                      >
                        {t('SESSIONS', 'Sessions')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {showConnection && <ConnectionStatusRow />}
              {/* Logout with its icon, in the danger color */}
              <LogoutButton danger handleSuccessLogout={handleSuccessLogout} onCustomClick={() => actionSidebar(false)} />
            </>
          )}
          {!auth && (
            <>
              {showLogin && (
                <MenuLink
                  as='button'
                  type='button'
                  onClick={() => {
                    handleOpenLoginSignUp('login')
                    actionSidebar(false)
                  }}
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={modalPageToShow === 'login'}
                    >
                      <Icon name="login" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={modalPageToShow === 'login'}
                      >
                        {t('SIGN_IN', 'Sign in')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
              {showSignup && (
                <MenuLink
                  as='button'
                  type='button'
                  onClick={() => {
                    handleOpenLoginSignUp('signup')
                    actionSidebar(false)
                  }}
                >
                  <WrappContent>
                    <MenuLinkIcon
                      active={modalPageToShow === 'signup'}
                    >
                      <Icon name="userAdd" />
                    </MenuLinkIcon>
                    <MenuLinkText>
                      <TextInfo
                        active={modalPageToShow === 'signup'}
                      >
                        {t('SIGN_UP', 'Sign up')}
                      </TextInfo>
                    </MenuLinkText>
                  </WrappContent>
                </MenuLink>
              )}
            </>
          )}
        </SidebarContent>
        </>,
        document.body
      )}
      {modalIsOpen && !auth && (
        <DialogOverlay
          legacyMaxWidth
          data-doc-section='sidebar-authentication-dialog'
          open={modalIsOpen}
          finalFocus={toggleRef}
          onClose={() => closeModal()}
          width='50%'
        >
          {modalPageToShow === 'login' && (
            <LoginForm
              notificationState={notificationState}
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
              closeModal={() => closeModal()}
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
        </DialogOverlay>
      )}
    </Container>
  )
}
