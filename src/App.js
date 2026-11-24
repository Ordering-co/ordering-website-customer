import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Switch,
  Route,
  Redirect,
  Link,
  useLocation,
  useHistory
} from 'react-router-dom'
import loadable from '@loadable/component'
import settings from './config'
import { parseSearchQueryLocation, formatSearchQueryLocation, stripLocationSearchParams } from './utils/searchQueryLocation'
import { isSegmentWriteKey } from './utils/segmentWriteKey'

import { useSession } from '~components/contexts/SessionContext'
import { useApi } from '~components/contexts/ApiContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useStorePrivate } from './utils/useStorePrivate'
import { useConfig } from '~components/contexts/ConfigContext'
import { isWalletEnabled as isWalletConfigEnabled } from '~components/utils/configHelpers'
import { useEvent } from '~components/contexts/EventContext'
import { useOrderingTheme } from '~components/contexts/OrderingThemeContext'
import { useSite } from '~components/contexts/SiteContext'

import { Alert } from '~ui/src/components/Confirm'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { useOnlineStatus } from '~ui/hooks/useOnlineStatus'
import { useResumeRecovery } from '~ui/hooks/useResumeRecovery'
import { useKeyboardOpen } from '~ui/hooks/useKeyboardOpen'
import { ThemeProvider } from '~ui/contexts/ThemeContext'
import { SmartAppBanner } from '~ui/src/components/SmartAppBanner'
import { WebManifest } from '~ui/src/components/WebManifest'
import { PWAPrompt } from '~ui/src/components/PWAPrompt'
import { SpinnerLoader } from '~ui/src/components/SpinnerLoader'
import { Header } from '~ui/src/components/Header'
import { LazyDialog } from '~ui/src/components/Overlay/lazyOverlay'
import { Footer } from '~ui/src/components/Footer'
import { NotNetworkConnectivity } from '~ui/src/components/NotNetworkConnectivity'
import { NavigationBar } from '~ui/src/components/NavigationBar'
import { bottomNavRoom, bottomNavShown } from '~ui/src/components/NavigationBar/styles'
import { BottomBarScrollPadding } from '~ui/src/components/NavigationBar/useBottomBarScrollPadding'
import { WebsocketStatus } from '~ui/src/components/WebsocketStatus'
import { CookieConsentBanner } from '~ui/src/components/CookieConsentBanner'
import { AppToast } from '~ui/src/styles/Toast'

import { lazyRetry } from './components/LazyRetry'
import { menuHomeRoutes } from './components/MenuHomeRoutes'
import { useCookieConsent } from './contexts/CookieConsentContext'
import { useProfileCompletion } from './contexts/CheckoutFieldsContext'
import { SentryInitializer } from './components/SentryInitializer'
import ConsentUserSync from './components/ConsentUserSync'
import { IntercomWrapper } from './components/IntercomWrapper'
import { getFallbackFaviconUrl, getGenericFaviconUrl, getSiteFaviconUrl, getSiteName, getThemeAppIcon } from './utils/siteBranding'
import { ownAppBranding } from './utils/resolvePwaBranding'
import { applyFavicon } from './utils/applyFavicon'
import { PROJECT_NOT_FOUND_REDIRECT_URL, SIGNUP_CONTACT_EMAIL, SIGNUP_DASHBOARD_URL } from './utils/vendorLinks'
import { buildAppTheme, themeFonts } from './utils/appTheme'
import { themeImage } from './utils/themeTokens'
import { isFullWebsite, isTrackingOnly as trackingOnlySite, menuPath, siteMode, singleStoreSlug, smartBanner, thirdPartyCode } from './utils/siteSettings'
import { isMarketingHome as isMarketingHomePath, LANDING_FOOTER_MODES } from './utils/marketingHome'
import { themeVisible } from './utils/themeVisibility'
import { useSiteThemeFallback } from './utils/remoteTheme'
import { integrationIds, validOneSignalAppId } from './utils/integrationIds'
import {
  bootPickupRelease,
  bootPickupStart,
  entryStoreSlug,
  NON_ADDRESS_ORDER_TYPES,
  singleBusinessHomePath,
  storePickupLanding,
  takeStorePickupForcedFrom
} from './utils/singleStore'
import { pageFooterVisible, pageForPath } from './utils/themePages'
import { MOBILE_WEB_MAX_WIDTH } from './utils/themeCss'
import { firebasePushSetup, getFirebaseWebConfig, isFirebasePushEnabled, getOpenedPushOrderUuid } from './utils/firebaseWebPush'

const AddressList = loadable(() => lazyRetry(() => import('./pages/AddressList')))
const SavedCards = loadable(() => lazyRetry(() => import('./pages/SavedCards')))
const BusinessesList = loadable(() => lazyRetry(() => import('./pages/BusinessesList')))
const BusinessProductsList = loadable(() => lazyRetry(() => import('./pages/BusinessProductsList')))
const CheckoutPage = loadable(() => lazyRetry(() => import('./pages/Checkout')))
const Cms = loadable(() => lazyRetry(() => import('./pages/Cms')))
const MyOrders = loadable(() => lazyRetry(() => import('./pages/MyOrders')))
const OrderDetailsPage = loadable(() => lazyRetry(() => import('./pages/OrderDetails')))
const PageNotFound = loadable(() => lazyRetry(() => import('./pages/PageNotFound')))
const StorePrivate = loadable(() => lazyRetry(() => import('./pages/StorePrivate')))
const TrackingOnlyRoutes = loadable(() => lazyRetry(() => import('./components/TrackingOnlyRoutes')))
const PagesList = loadable(() => lazyRetry(() => import('./pages/PagesList')))

const ScrollToTop = loadable(() => lazyRetry(() => import('./components/ScrollToTop')))
const ListenPageChanges = loadable(() => lazyRetry(() => import('./components/ListenPageChanges')))
const HelmetTags = loadable(() => lazyRetry(() => import('./components/HelmetTags')))
const Profile = loadable(() => lazyRetry(() => import('./pages/Profile')))
const Wallets = loadable(() => lazyRetry(() => import('./pages/Wallets')))
const MessagesList = loadable(() => lazyRetry(() => import('./pages/MessagesList')))
const Help = loadable(() => lazyRetry(() => import('./pages/Help')))
const Favorite = loadable(() => lazyRetry(() => import('./pages/Favorite')))
const SessionsList = loadable(() => lazyRetry(() => import('./pages/SessionsList')))
const SignUpBusiness = loadable(() => lazyRetry(() => import('./pages/SignUpBusiness')))
const SignUpDriver = loadable(() => lazyRetry(() => import('./pages/SignUpDriver')))
const UserVerification = loadable(() => lazyRetry(() => import('./pages/UserVerification')))
const CompleteProfile = loadable(() => lazyRetry(() => import('./pages/CompleteProfile')))
const Promotions = loadable(() => lazyRetry(() => import('./pages/Promotions')))
const ResetPassword = loadable(() => lazyRetry(() => import('./pages/ResetPassword')))
const MultiCheckout = loadable(() => lazyRetry(() => import('./pages/MultiCheckout')))
const MultiCart = loadable(() => lazyRetry(() => import('./pages/MultiCart')))
const MultiOrdersDetails = loadable(() => lazyRetry(() => import('./pages/MultiOrdersDetails')))
const BusinessListingSearch = loadable(() => lazyRetry(() => import('./pages/BusinessListingSearch')))

// Trackers render only after boot/consent; keeping them out of the entry chunk
// spares it their vendors (e.g. @segment/analytics-next).
const Analytics = loadable(() => import('~components/components/Analitycs').then((m) => m.Analytics))
const AnalyticsSegment = loadable(() => import('~components/components/AnalyticsSegment').then((m) => m.AnalyticsSegment))
const FacebookPixel = loadable(() => import('~components/components/FacebookPixel').then((m) => m.FacebookPixel))

// Conditionally-rendered overlays (order reviews, cancellations, signup
// approval, Spoonity login) — not needed for first paint.
const CancellationComponent = loadable(async () => {
  const [{ CancellationComponent: Cancellation }, { Button }, { Input }, { TouchSlot }] = await Promise.all([
    import('~ui/src/components/CancellationComponent'),
    import('~ui/src/design-system/components/Button'),
    import('~ui/src/design-system/components/Input'),
    import('~ui/src/styles/TouchSlot')
  ])

  // Cancellation passes the trailing action's slot through the legacy prop names.
  const CancellationButton = ({ $size, $color, $appearance, color, ...props }) => (
    <Button size={$size} color={$color || color} appearance={$appearance} {...props} />
  )

  const CancellationInput = ({ placeholder, ...props }) => (
    <TouchSlot $mobile as='label' style={{ width: '100%', alignSelf: 'flex-start' }}>
      <Input aria-label={placeholder} placeholder={placeholder} {...props} />
    </TouchSlot>
  )

  return () => <Cancellation ButtonComponent={CancellationButton} InputComponent={CancellationInput} />
})
const ReviewTrigger = loadable(() => import('~ui/src/components/ReviewTrigger').then((m) => m.ReviewTrigger))
const ReviewOrder = loadable(() => import('~ui/src/components/ReviewOrder').then((m) => m.ReviewOrder))
const ReviewProduct = loadable(() => import('~ui/src/components/ReviewProduct').then((m) => m.ReviewProduct))
const ReviewDriver = loadable(() => import('~ui/src/components/ReviewDriver').then((m) => m.ReviewDriver))
const SignUpApproval = loadable(() => import('~ui/src/components/SignUpApproval').then((m) => m.SignUpApproval))
const QueryLoginSpoonity = loadable(() => import('~ui/src/components/QueryLoginSpoonity').then((m) => m.QueryLoginSpoonity))
// The site's body code needs html-react-parser only with consent and a body.
const SiteBodyCode = loadable(() => import('./components/SiteBodyCode').then((m) => m.SiteBodyCode))

const GATE_EXEMPT_PATHS = ['/checkout', '/multi-checkout', '/orders', '/multi-orders']

export const App = () => {
  const history = useHistory()
  const [{ auth, user, token }, { login }] = useSession()
  const profileCompletion = useProfileCompletion()
  const [events] = useEvent()
  const [ordering] = useApi()
  const [orderStatus, { changeType, getLastOrderHasNoReview, setExtraUnaddressedOrderTypes }] = useOrder()
  // adding to cart needs the customer's address only in delivery and catering delivery
  useEffect(() => { setExtraUnaddressedOrderTypes?.(NON_ADDRESS_ORDER_TYPES) }, [])
  const [{ configs, loading: configLoading }] = useConfig()
  const [{ loading: siteLoading, site }] = useSite()
  const [languageState, t] = useLanguage()
  const [orderingTheme] = useOrderingTheme()
  // the API answered 403 STORE_PRIVATE: no valid preview token
  const storePrivate = useStorePrivate()
  const [loaded, setLoaded] = useState(false)
  // implementation notesnever-hang backstop for the boot-time forced pickup below —
  // settles once changeType(2) resolves/rejects (even if the type never
  // actually landed, e.g. a silent API error), and a 4s fallback in case it
  // never settles at all.
  const [pickupForceSettled, setPickupForceSettled] = useState(false)
  const [pickupForceTimedOut, setPickupForceTimedOut] = useState(false)
  const pickupForceTimeoutRef = useRef(null)
  const onlineStatus = useOnlineStatus()
  useResumeRecovery()
  useKeyboardOpen()
  const location = useLocation()
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const windowSize = useWindowSize()
  const [businessSignUpSuccessed, setBusinessSignUpSuccessed] = useState({ open: false, content: {} })
  const [searchValue, setSearchValue] = useState('')
  const [lastOrderReview, setLastOrderReview] = useState({
    isReviewOpen: false,
    order: null,
    defaultStar: 5,
    reviewStatus: { trigger: false, order: false, product: false, driver: false },
    reviewed: { isOrderReviewed: false, isProductReviewed: false, isDriverReviewed: false }
  })
  const [oneSignalState, setOneSignalState] = useState({
    notification_app: settings.notification_app
  })
  const firebasePushSetupRef = useRef(false)
  const firebasePushActiveRef = useRef(true)
  const customOrderEnabled = configs?.custom_order_enabled?.value === '1'

  const { hasConsented, setIsConsentEnabled } = useCookieConsent()
  const isShowReviewsPopupEnabled = configs?.show_reviews_popups_enabled?.value === '1'
  const hashKey = new URLSearchParams(useLocation()?.search)?.get('hash') || null
  const isKioskApp = settings?.use_kiosk

  let queryIntegrationToken
  let queryIntegrationCode
  if (location.search) {
    const query = new URLSearchParams(location.search)
    queryIntegrationCode = query.get('integration_code')
    queryIntegrationToken = query.get('integration_token')
  }

  // Without the worker (Vite dev) the context gets no v2 theme: ask for it.
  const remoteTheme = useSiteThemeFallback({
    root: ordering?.root,
    appId: settings?.app_id,
    project: ordering?.project,
    contextTheme: orderingTheme?.theme,
    contextLoading: orderingTheme?.loading
  })

  // The site's theme over the schema's defaults: the theme every component reads (src/utils/appTheme.js).
  const themeUpdated = useMemo(() => buildAppTheme(undefined, remoteTheme.theme), [remoteTheme.theme])
  const siteCode = thirdPartyCode(themeUpdated)

  const isTrackingOnly = trackingOnlySite(themeUpdated)
  const fullWebsite = isFullWebsite(themeUpdated)
  // where every "back to the menu" goes: '/order' on a full website, else '/'
  const menuHome = menuPath(themeUpdated, settings)

  // The site's own name and app icon (null without either): gates the smart
  // app banner and the PWA prompt, which otherwise show the schema's
  // defaults (a gray icon, "My Site").
  const ownBranding = useMemo(() => ownAppBranding({ theme: themeUpdated, site }), [themeUpdated, site])
  const bannerIds = smartBanner(themeUpdated, settings)

  const updatedBusinessSlug = singleStoreSlug(themeUpdated, settings)
  const businessesSlug = {
    marketplace: 'marketplace',
    kiosk: updatedBusinessSlug,
    business: updatedBusinessSlug
  }

  const singleBusinessConfig = {
    isActive: settings?.use_marketplace || updatedBusinessSlug || isKioskApp,
    businessSlug: businessesSlug[isKioskApp ? 'kiosk' : settings?.use_marketplace ? 'marketplace' : 'business']
  }
  // where a single business site goes home (src/utils/singleStore.js)
  const singleBusinessHome = singleBusinessHomePath({
    site,
    slug: updatedBusinessSlug,
    businessSlug: singleBusinessConfig.businessSlug,
    direct: !isKioskApp && !settings?.use_marketplace,
    fullWebsite
  })

  const locationSearchParams = new URLSearchParams(location.search)
  const orderTypeSearchParam = parseInt(locationSearchParams.get('order_type') ?? 0, 10)
  const hasLocationSearchParams = ['lat', 'lng', 'order_type'].some(param => locationSearchParams.has(param))
  const searchQueryLocation = parseSearchQueryLocation(location.search)
  const hasSearchQueryLocation = !!searchQueryLocation
  const hasOrderSearchLocation = !!formatSearchQueryLocation(orderStatus.options?.address?.location)
  const hasOrderAddressContext = !!orderStatus.options?.address_id || hasOrderSearchLocation
  const hasBusinessSearchLocation = hasOrderSearchLocation || hasSearchQueryLocation
  const shouldRedirectHomeToOrderLocation = !isKioskApp && !customOrderEnabled && hasOrderSearchLocation
  const homeOrderLocationRedirectPath = singleBusinessConfig.isActive ? singleBusinessHome : '/search'
  const logoHomeTarget = shouldRedirectHomeToOrderLocation
    ? singleBusinessConfig.isActive
      ? { page: 'business', params: { business_slug: singleBusinessConfig.businessSlug } }
      : { page: 'search' }
    : null
  const configTypes = configs?.order_types_allowed?.value?.split('|').map(value => Number(value)) || []

  const isWalletEnabled = configs?.cash_wallet?.value && isWalletConfigEnabled(configs) && !isKioskApp
  const isEmailVerifyRequired = auth && configs?.verification_email_required?.value === '1' && !user?.email_verified
  const isPhoneVerifyRequired = auth && configs?.verification_phone_required?.value === '1' && !user?.phone_verified
  const isUserVerifyRequired = (isEmailVerifyRequired || isPhoneVerifyRequired) && !isKioskApp
  // The theme can show or hide the footer per page (pages.<page>.footer); null follows the global one.
  const pageFooter = pageFooterVisible(themeUpdated, pageForPath(location.pathname, { fullWebsite }), { mobile: windowSize.width < MOBILE_WEB_MAX_WIDTH })
  const isHideFooter = pageFooter === null ? !themeVisible(themeUpdated, 'footer') : !pageFooter

  // The gate stays off during checkout and order confirmation: converting a guest into a user
  // mid-order would otherwise swap the page away while the order is being placed.
  const isGateExemptPath = GATE_EXEMPT_PATHS.some(path => location.pathname.startsWith(path))
  const isProfileCompletionRequired = profileCompletion.isRequired && !isGateExemptPath && !isKioskApp && !isTrackingOnly

  const guestCheckoutEnabled = false
  // configs?.guest_checkout_enabled?.value === '1' &&
  // (!orderTypeList[orderStatus?.options?.type - 1] || configs?.allowed_order_types_guest_checkout?.value?.includes(orderTypeList[orderStatus?.options?.type - 1]))

  const isHome = location.pathname === '/' || location.pathname === '/home' || (fullWebsite && location.pathname === '/order')
  // The marketing page of a full website brings its own header (src/pages/Landing). Everything else
  // that `isHome` drives stays as it is on '/': the footer under the page (no space above it, as the
  // home has), the content growing to push it to the bottom, and the bottom navigation, which
  // is the phone's way to the account and cart that the page's header does not have.
  const isMarketingHome = isMarketingHomePath(location.pathname, {
    fullWebsite,
    mode: siteMode(themeUpdated),
    isKioskApp,
    spoonity: queryIntegrationCode === 'spoonity' && !!queryIntegrationToken
  })
  const isFooterPage = location.pathname === '/pages/footer' || isKioskApp || isHideFooter || isTrackingOnly
  // the marketing page's own footer takes the place of the app's (it carries the site's footer content)
  const hasLandingFooter = isMarketingHome && LANDING_FOOTER_MODES.includes(siteMode(themeUpdated))
  const bottomNavSpace = windowSize.width < 576 && onlineStatus && !isTrackingOnly ? bottomNavRoom(themeUpdated) : 0

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
  }

  const acceptAlert = () => {
    window.localStorage.setItem('front_version', configs?.front_version?.value)
    window.location.reload()
  }

  const handleSuccessSignup = (user) => {
    if (!user?.enabled && (configs?.business_signup_enabled_default?.value === '0' || configs?.driver_signup_enabled_default?.value === '0')) {
      setBusinessSignUpSuccessed({
        open: true,
        content: {
          approvalType: 'no_automatic',
          businessType: user?.level,
          project: ordering?.project,
          dashboardUrl: SIGNUP_DASHBOARD_URL,
          dashboardLoginUrl: `${SIGNUP_DASHBOARD_URL}/login/?project=${ordering?.project}&token=${user?.session?.access_token}`,
          contactEmail: SIGNUP_CONTACT_EMAIL
        }
      })
      return
    }

    if (configs?.business_signup_enabled_default?.value === '1' || configs?.driver_signup_enabled_default?.value === '1') {
      setBusinessSignUpSuccessed({
        open: true,
        content: {
          approvalType: 'automatic',
          businessType: user?.level,
          project: ordering?.project,
          dashboardUrl: SIGNUP_DASHBOARD_URL,
          dashboardLoginUrl: `${SIGNUP_DASHBOARD_URL}/login/?project=${ordering?.project}&token=${user?.session?.access_token}`,
          contactEmail: SIGNUP_CONTACT_EMAIL
        }
      })

      login({
        user,
        token: user?.session?.access_token
      })
    }
  }

  const goToPage = (page, params) => {
    events.emit('go_to_page', { page, params })
  }

  const _getLastOrderHasNoReview = async () => {
    const lastOrderHasNoReview = await getLastOrderHasNoReview()
    lastOrderHasNoReview && OrderReviewRequired(lastOrderHasNoReview)
  }

  const reviewModalTitle = () => {
    if (lastOrderReview?.reviewStatus?.trigger) return t('DONT_FORGET_TO_RATE_YOUR_ORDER', 'Don\'t forget to rate your order!')
    if (lastOrderReview?.reviewStatus?.order) return t('REVIEW_ORDER', 'Review order')
    if (lastOrderReview?.reviewStatus?.product) return t('REVIEW_PRODUCT', 'Review Product')
    return t('REVIEW_DRIVER', 'Review Driver')
  }

  const OrderReviewRequired = (order) => {
    setLastOrderReview({
      isReviewOpen: !!((location?.pathname === '/' || location?.pathname === '/search' || location?.pathname === '/home' || (fullWebsite && location?.pathname === '/order'))),
      order,
      defaultStar: 5,
      reviewStatus: { trigger: true, order: false, product: false, driver: false },
      reviewed: { isOrderReviewed: false, isProductReviewed: false, isDriverReviewed: false }
    })
  }

  const handleOpenOrderReview = (star) => {
    setLastOrderReview({
      ...lastOrderReview,
      defaultStar: star,
      reviewStatus: { trigger: false, order: true, product: false, driver: false }
    })
  }

  const handleCloseReivew = () => {
    setLastOrderReview({
      ...lastOrderReview,
      isReviewOpen: false,
      reviewStatus: { trigger: false, order: false, product: false, driver: false }
    })
  }

  const setIsReviewed = (reviewType) => {
    const _reviewStatus = { ...lastOrderReview?.reviewed }
    setLastOrderReview({
      ...lastOrderReview,
      reviewed: { ..._reviewStatus, [reviewType]: true }
    })
  }

  const closeReviewOrder = () => {
    const enableProduct = lastOrderReview?.order?.products.some(product => !product?.deleted)
    if (!lastOrderReview?.reviewed?.isProductReviewed && enableProduct) setLastOrderReview({ ...lastOrderReview, reviewStatus: { order: false, product: true, driver: false } })
    else if ((lastOrderReview?.order?.driver || enableProduct) && !lastOrderReview?.order?.user_review && !lastOrderReview?.reviewed?.isDriverReviewed) setLastOrderReview({ ...lastOrderReview, reviewStatus: { order: false, product: false, driver: true } })
    else handleCloseReivew()
  }

  const closeReviewProduct = () => {
    if (lastOrderReview?.order?.driver && !lastOrderReview?.order?.user_review && !lastOrderReview?.reviewed?.isDriverReviewed) setLastOrderReview({ ...lastOrderReview, reviewStatus: { order: false, product: false, driver: true } })
    else {
      setIsReviewed('isDriverReviewed')
      handleCloseReivew()
    }
  }

  useEffect(() => {
    // no favicon link yet and the theme still loading: wait for it
    if (!document.getElementById('favicon') && orderingTheme?.loading) return
    // the favicon with its file's type (none when it cannot be told) and, for
    // an SVG, the host's bundled PNG for the browsers without SVG favicons;
    // without a site-level favicon at all, the worker's own fallback choice
    // (business logo/header, else generic — window.__CONFIG__.favicon_fallback)
    // or, without the worker (pnpm start), the bundled generic icon
    applyFavicon(
      getSiteFaviconUrl(themeImage(themeUpdated, 'favicon'), site?.logo, undefined, getThemeAppIcon(themeUpdated)),
      getFallbackFaviconUrl(),
      window.__CONFIG__?.favicon_fallback || getGenericFaviconUrl()
    )

    // The theme's fonts (tokens.font, with every weight the page paints with them: themeFonts)
    const fonts = Object.entries(themeFonts(themeUpdated))
    fonts.forEach(([role, fontFamily]) => {
      const fontElement = window.document.getElementById(`${role}-font-styles`)
      if (fontElement?.name !== fontFamily.name || fontElement?.href !== fontFamily.href) {
        fontElement?.remove()
        const href = fontFamily.href
        // Another role already loads this same stylesheet: do not import it twice.
        const loaded = [...window.document.querySelectorAll('link[id$="-font-styles"]')].some(link => link.href === href)
        if (role === 'body') {
          // A family Google Fonts does not serve falls back to sans-serif, not
          // to the browser's serif default.
          window.document.body.style.fontFamily = `${JSON.stringify(String(fontFamily.name))}, sans-serif`
        }
        if (loaded) return
        const font = window.document.createElement('link')
        font.id = `${role}-font-styles`
        font.rel = 'stylesheet'
        font.async = true
        font.defer = true
        font.name = fontFamily.name
        font.href = href

        window.document.body.appendChild(font)
      }
    })
  }, [themeUpdated, site?.logo])

  useEffect(() => {
    if (!hasConsented || !siteCode.body) return

    if (document.getElementById('third-party-body-scripts-loaded')) return

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = siteCode.body

    const scripts = tempDiv.querySelectorAll('script')
    scripts.forEach(script => {
      const newScript = document.createElement('script')
      if (script.src) {
        newScript.src = script.src
      } else {
        newScript.innerHTML = script.innerHTML
      }
      if (script.type) {
        newScript.type = script.type
      }
      document.body.appendChild(newScript)
    })

    const marker = document.createElement('div')
    marker.id = 'third-party-body-scripts-loaded'
    marker.style.display = 'none'
    document.body.appendChild(marker)
  }, [hasConsented, siteCode.body])

  useEffect(() => {
    if (!isShowReviewsPopupEnabled) return
    const _user = window.localStorage.getItem('user')
    const _token = window.localStorage.getItem('token')
    const _reviewRequired = window.sessionStorage.getItem('review-required')
    if (((_user || _token) && auth) && _reviewRequired !== '1' && window.location.pathname === '/search') {
      window.sessionStorage.setItem('review-required', '1')
      _getLastOrderHasNoReview()
    }
    if (!(_user || _token)) {
      window.sessionStorage.removeItem('review-required')
    }
  }, [auth, isShowReviewsPopupEnabled, window.location.pathname])

  useEffect(() => {
    if (auth) {
      window.localStorage.removeItem('change_store_redirect')
    }
  }, [auth])

  useEffect(() => {
    if (!loaded && !orderStatus.loading && !configLoading && !siteLoading && !orderingTheme?.loading && !remoteTheme.loading) {
      const shouldApplyOrderTypeFromUrl = orderTypeSearchParam &&
        configTypes.includes(orderTypeSearchParam) &&
        !hasOrderAddressContext &&
        !(auth && hasLocationSearchParams)
      if (shouldApplyOrderTypeFromUrl) {
        changeType(parseInt(orderTypeSearchParam, 10))
        if (orderStatus?.options?.type === parseInt(orderTypeSearchParam, 10)) {
          setLoaded(true)
        }
        return
      }
      // implementation notesdecide pickup (a single-store site, or a store opened
      // directly by link) before the Header/address UI paints, same reason
      // the URL order_type above holds this same gate. The routes (and
      // BusinessProductsListing's own fallback of this same decision) only
      // mount once `loaded` is true, so this always resolves first.
      const pickupStart = bootPickupStart({
        singleStore: !!updatedBusinessSlug,
        entry: !!entryStoreSlug(site),
        configTypes,
        options: orderStatus.options,
        carts: orderStatus.carts,
        slug: updatedBusinessSlug || entryStoreSlug(site)
      })
      if (pickupStart.action === 'force') {
        // settled/timedOut only ever flip a plain flag here: the decision
        // itself is read fresh from `orderStatus` below on whichever render
        // reacts to that flag, never from a stale closure inside .finally
        changeType(2)?.finally?.(() => setPickupForceSettled(true))?.catch?.(() => {})
        pickupForceTimeoutRef.current = setTimeout(() => setPickupForceTimedOut(true), 4000)
        return
      }
      // this effect depends on the whole `orderStatus` (a new object every
      // OrderProvider render, for any reason) and can re-run while our own
      // force above is still in flight — bootPickupStart would then see the
      // latch already consumed ('skip') and setLoaded too early: keep
      // waiting for that type to actually land, unless it settled (or timed
      // out) without ever landing it, in which case give up instead of
      // hanging the boot spinner forever
      const pickupRelease = bootPickupRelease({
        landing: storePickupLanding(orderStatus?.options?.type),
        settled: pickupForceSettled,
        timedOut: pickupForceTimedOut
      })
      if (!pickupRelease.release) return
      if (pickupRelease.giveUp) takeStorePickupForcedFrom()
      setLoaded(true)
    }
  }, [orderStatus, configLoading, siteLoading, orderingTheme, remoteTheme.loading, hasOrderAddressContext, orderTypeSearchParam, auth, hasLocationSearchParams, pickupForceSettled, pickupForceTimedOut])

  // clears the fallback timeout once it's no longer needed: the boot gate
  // released (normally or by giving up above), or the app unmounts
  useEffect(() => {
    if (loaded) clearTimeout(pickupForceTimeoutRef.current)
  }, [loaded])
  useEffect(() => () => clearTimeout(pickupForceTimeoutRef.current), [])

  useEffect(() => {
    const shouldCleanLocationParams = ['/search', '/business_search'].includes(location.pathname)
    if (!shouldCleanLocationParams || orderStatus.loading) return
    if (!hasOrderAddressContext) return

    const params = new URLSearchParams(location.search)
    const hadLocationParams = ['lat', 'lng', 'order_type'].some(param => params.has(param))
    if (!hadLocationParams) return

    history.replace(`${location.pathname}${stripLocationSearchParams(location.search)}`)
  }, [location.pathname, location.search, orderStatus.loading, hasOrderAddressContext, history])

  useEffect(() => {
    if (configs?.front_version?.value && loaded) {
      const localStorageFrontVersion = window.localStorage.getItem('front_version')
      if (localStorageFrontVersion && localStorageFrontVersion !== configs?.front_version?.value) {
        setAlertState({
          open: true,
          content: [t('RELOAD_FRONT_QUESTION_SITE_NAME', 'There is a new version of _site_! Do you want to update it?').replace('_site_', getSiteName({ theme: themeUpdated, site }))]
        })
      }
    }
  }, [configs, loaded])

  useEffect(() => {
    // the marketing page of a full website stays at '/'
    if (isHome && !(fullWebsite && location.pathname === '/') && (settings?.use_marketplace || updatedBusinessSlug)) {
      goToPage('business', { store: settings?.use_marketplace ? 'marketplace' : updatedBusinessSlug })
    }
  }, [])

  useEffect(() => {
    if (!orderStatus.loading) {
      const localCountryCode = orderStatus?.options?.address?.country_code ??
        window.localStorage.getItem('country-code')

      if (localCountryCode) {
        ordering?.setCountryCode && ordering.setCountryCode(localCountryCode)
      }
    }
  }, [orderStatus])

  useEffect(() => {
    if (
      languageState?.error &&
      languageState?.error?.includes('This project does not exist') &&
      settings?.use_project_subdomain
    ) {
      window.open(PROJECT_NOT_FOUND_REDIRECT_URL, '_self')
    }
  }, [languageState])

  const oneSignalSetup = () => {
    const appId = validOneSignalAppId(configs?.onesignal_orderingweb_id?.value)
    if (!appId) return

    const OneSignal = window.OneSignal || []
    const hostname = window.location.hostname
    const initConfig = {
      appId,
      allowLocalhostAsSecureOrigin: hostname === 'localhost',
      notificationClickHandlerAction: 'navigate'
    }

    OneSignal.push(function () {
      OneSignal.SERVICE_WORKER_PARAM = { scope: '/push/onesignal/' }
      OneSignal.SERVICE_WORKER_PATH = 'push/onesignal/OneSignalSDKWorker.js'
      OneSignal.SERVICE_WORKER_UPDATER_PATH = 'push/onesignal/OneSignalSDKWorker.js'
      if (!OneSignal._initCalled) {
        // OneSignal v15's init returns a promise; an invalid-but-UUID id
        // rejects it, which would otherwise surface as an uncaught rejection.
        Promise.resolve(OneSignal.init(initConfig)).catch(() => {})
      }

      const onNotificationClicked = function (data) {
        if (data?.data?.order_uuid) {
          history.push(`/orders/${data?.data?.order_uuid}`)
        }
      }
      const handler = function (data) {
        onNotificationClicked(data)
        if (typeof OneSignal.addListenerForNotificationOpened === 'function') {
          OneSignal.addListenerForNotificationOpened(handler)
        }
      }
      if (typeof OneSignal.addListenerForNotificationOpened === 'function') {
        OneSignal.addListenerForNotificationOpened(handler)
      }

      OneSignal.on('subscriptionChange', function (isSubscribed) {
        if (isSubscribed) {
          OneSignal.getUserId((userId) => {
            const data = {
              ...oneSignalState,
              notification_token: userId
            }
            setOneSignalState(data)
          })
        }
      })

      OneSignal.getUserId((userId) => {
        const data = {
          ...oneSignalState,
          notification_token: userId
        }
        setOneSignalState(data)
      })
    })
  }

  useEffect(() => {
    if (configLoading) return
    const enabled = configs?.cookie_consent_enabled?.value === '1' ||
      (!configs?.cookie_consent_enabled && settings?.cookie_consent_enabled)
    setIsConsentEnabled(!!enabled)
  }, [configLoading, configs?.cookie_consent_enabled])

  const firebaseWebPushSetup = () => {
    if (firebasePushSetupRef.current) return
    firebasePushSetupRef.current = true
    firebasePushSetup({
      config: getFirebaseWebConfig(configs),
      isActive: () => firebasePushActiveRef.current,
      onToken: (fcmToken) => {
        setOneSignalState({
          ...oneSignalState,
          notification_token: fcmToken,
          notification_provider: 'fcm'
        })
      },
      onNotificationClick: (data) => {
        const orderUuid = getOpenedPushOrderUuid(data)
        if (orderUuid) {
          history.push(`/orders/${orderUuid}`)
        }
      }
    }).catch((error) => {
      firebasePushSetupRef.current = false
      console.log('Firebase push setup error:', error)
    })
  }

  const subscribePushNotifications = async () => {
    try {
      await fetch(`${ordering.root}/users/${user?.id}/notification_tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          token: oneSignalState.notification_token,
          user_id: user?.id,
          app: oneSignalState.notification_app,
          provider: oneSignalState.notification_provider
        })
      })
    } catch (error) {
      console.log('Firebase push subscribe error:', error)
    }
  }

  useEffect(() => {
    if (!auth || !oneSignalState?.notification_token || !oneSignalState?.notification_provider) return
    subscribePushNotifications()
  }, [auth, oneSignalState?.notification_token])

  useEffect(() => {
    firebasePushActiveRef.current = true
    return () => { firebasePushActiveRef.current = false }
  }, [])

  useEffect(() => {
    if (configLoading || !hasConsented) return
    if (isFirebasePushEnabled(configs)) {
      firebaseWebPushSetup()
      return
    }
    oneSignalSetup()
  }, [configLoading, events, hasConsented])

  const { gaId, pixelId, segmentKey } = integrationIds({ configs, settings, singleBusiness: singleBusinessConfig?.isActive })

  // Outside the boot gate on purpose: the 403 can also stop what `loaded` waits for
  if (storePrivate) {
    return (
      <ThemeProvider theme={themeUpdated}>
        <StorePrivate />
      </ThemeProvider>
    )
  }

  return settings.isCancellation
    ? (
      <>
        <CancellationComponent />
        <AppToast theme={themeUpdated} />
      </>
      )
    : (
      <>
        {/* room for the bottom navigation below 576px: its height (the theme's
            bottom_nav.base.height) and 15px more; none when the theme hides it */}
        <div style={{ marginBottom: bottomNavSpace, ...(isHome && { display: 'flex', flexDirection: 'column', minHeight: `calc(100vh - ${bottomNavSpace}px)` }) }}>
          <ConsentUserSync />
          <SentryInitializer />
          {hasConsented && gaId && (
            <Analytics trackId={gaId} />
          )}
          {hasConsented && isSegmentWriteKey(segmentKey) && (
            <AnalyticsSegment writeKey={segmentKey} />
          )}
          {hasConsented && pixelId && FacebookPixel && (
            <FacebookPixel trackId={pixelId} />
          )}
          {/* Boot gate resolves in <~500ms now that config/theme/site/i18n are
              edge-injected — the pre-loading animation only appears as a
              fallback when a load genuinely exceeds the delay. */}
          {!loaded && <SpinnerLoader delayMs={600} data-doc-section='global-boot-loading' />}
          <WebManifest
            ready={!languageState.loading && !siteLoading}
            theme={themeUpdated}
            site={site}
            languageCode={languageState.language?.code}
          />
          {/* the theme shows or hides it, but it also needs the site's own
              name and app icon: no gray placeholder / "My Site" banner */}
          {!isTrackingOnly && themeVisible(themeUpdated, 'smart_app_banner') && ownBranding && (
            <SmartAppBanner
              theme={themeUpdated}
              appName={ownBranding.name}
              description={site?.description}
              storeAndroidId={bannerIds.androidId}
              storeAppleId={bannerIds.appleId}
              logo={ownBranding.icon}
            />
          )}
          {
            loaded && (
              <ThemeProvider
                theme={themeUpdated}
                direction={languageState?.language?.rtl ? 'rtl' : 'ltr'}
              >
                <ListenPageChanges />
                {!(isKioskApp && isHome) && !isMarketingHome && (
                  <Header
                    isHome={isHome}
                    location={location}
                    isCustomLayout={singleBusinessConfig.isActive}
                    singleBusinessConfig={singleBusinessConfig}
                    logoHomeTarget={logoHomeTarget}
                    searchValue={searchValue}
                    setSearchValue={setSearchValue}
                    notificationState={oneSignalState}
                    businessSlug={updatedBusinessSlug}
                    isTrackingOnly={isTrackingOnly}
                    useModalMode
                  />
                )}
                <NotNetworkConnectivity />
                {onlineStatus && isProfileCompletionRequired && (
                  <ScrollToTop isFooterHidden={isFooterPage} isHome={isHome}>
                    <IntercomWrapper>
                      <CompleteProfile />
                    </IntercomWrapper>
                  </ScrollToTop>
                )}
                {onlineStatus && !isProfileCompletionRequired && (
                  <ScrollToTop isFooterHidden={isFooterPage} isHome={isHome}>
                    <HelmetTags />
                    <IntercomWrapper>
                      {isTrackingOnly && <TrackingOnlyRoutes />}
                      {!isTrackingOnly && (
                      <Switch>
                        {menuHomeRoutes({
                          fullWebsite,
                          auth,
                          hasAddress: !!orderStatus.options?.address?.location,
                          loading: orderStatus.loading,
                          notificationState: oneSignalState,
                          isUserVerifyRequired,
                          guestCheckoutEnabled,
                          isKioskApp,
                          customOrderEnabled,
                          queryIntegrationToken,
                          queryIntegrationCode,
                          shouldRedirectHomeToOrderLocation,
                          homeOrderLocationRedirectPath,
                          singleBusinessActive: singleBusinessConfig.isActive,
                          singleBusinessHome
                        })}
                        <Route exact path='/wallets'>
                          {auth
                            ? isUserVerifyRequired && !guestCheckoutEnabled
                              ? <Redirect to='/verify' />
                              : isWalletEnabled
                                ? <Wallets />
                                : <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />
                            : <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />}
                        </Route>
                        <Route exact path='/signup_business'>
                          {!auth && !isKioskApp && !updatedBusinessSlug
                            ? (
                              <SignUpBusiness
                                elementLinkToLogin={<Link to={menuHome}>{t('LOGIN', 'Login')}</Link>}
                                useLoginByCellphone
                                useChekoutFileds
                                handleSuccessSignup={handleSuccessSignup}
                                isRecaptchaEnable
                              />
                              )
                            : (
                              <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />
                              )}
                        </Route>
                        <Route exact path='/signup-driver'>
                          {!auth && !isKioskApp
                            ? (
                              <SignUpDriver
                                elementLinkToLogin={<Link to={menuHome}>{t('LOGIN', 'Login')}</Link>}
                                useLoginByCellphone
                                useChekoutFileds
                                handleSuccessSignup={handleSuccessSignup}
                                isRecaptchaEnable
                              />
                              )
                            : (
                              <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />
                              )}
                        </Route>
                        <Route exact path='/password/reset'>
                          {auth
                            ? (
                              <Redirect to={menuHome} />
                              )
                            : (
                                isKioskApp
                                  ? <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />
                                  : <ResetPassword />
                              )}
                        </Route>
                        <Route exact path='/profile'>
                          {auth
                            ? isUserVerifyRequired && !guestCheckoutEnabled
                              ? <Redirect to='/verify' />
                              : (<Profile userId={user?.id} accessToken={user?.session?.access_token} useValidationFields />)
                            : <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />}
                        </Route>
                        <Route exact path='/verify'>
                          {isUserVerifyRequired && !guestCheckoutEnabled
                            ? <UserVerification />
                            : <Redirect to={(auth || isKioskApp) ? singleBusinessConfig.isActive ? singleBusinessHome : '/search' : menuHome} />}
                        </Route>
                        <Route exact path='/profile/orders'>
                          {auth
                            ? isUserVerifyRequired && !guestCheckoutEnabled
                              ? <Redirect to='/verify' />
                              : (<MyOrders />)
                            : queryIntegrationToken && queryIntegrationCode === 'spoonity'
                              ? <QueryLoginSpoonity token={queryIntegrationToken} notificationState={oneSignalState} />
                              : <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />}
                        </Route>
                        <Route exact path='/profile/addresses'>
                          {auth
                            ? isUserVerifyRequired && !guestCheckoutEnabled
                              ? <Redirect to='/verify' />
                              : (<AddressList />)
                            : <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />}
                        </Route>
                        <Route exact path='/profile/cards'>
                          {auth
                            ? isUserVerifyRequired && !guestCheckoutEnabled
                              ? <Redirect to='/verify' />
                              : (<SavedCards />)
                            : <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />}
                        </Route>
                        <Route exact path='/messages'>
                          {auth
                            ? isUserVerifyRequired && !guestCheckoutEnabled
                              ? <Redirect to='/verify' />
                              : <MessagesList />
                            : (
                                isKioskApp
                                  ? <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />
                                  : <Redirect to={{ pathname: '/search' }} />
                              )}
                        </Route>
                        <Route exact path='/help'>
                          {auth
                            ? isUserVerifyRequired && !guestCheckoutEnabled
                              ? <Redirect to='/verify' />
                              : (<Help />)
                            : <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />}
                        </Route>
                        <Route exact path='/search'>
                          {
                            isKioskApp || businessesSlug?.business
                              ? <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />
                              : queryIntegrationToken && queryIntegrationCode === 'spoonity'
                                ? <QueryLoginSpoonity token={queryIntegrationToken} notificationState={oneSignalState} />
                                : (
                                    orderStatus.loading && !orderStatus.options?.address?.location && !hasSearchQueryLocation
                                      ? (
                                      <SpinnerLoader />
                                        )
                                      : (
                                          isUserVerifyRequired && !guestCheckoutEnabled
                                            ? (
                                          <Redirect to='/verify' />
                                              )
                                            : (
                                                (orderStatus.options?.address?.location || hasSearchQueryLocation) && !singleBusinessConfig.isActive
                                                  ? <BusinessesList searchValueCustom={searchValue} />
                                                  : <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />
                                              )
                                        )
                                  )
                          }
                        </Route>
                        <Route exact path='/business_search'>
                          {
                            isKioskApp || singleBusinessConfig.isActive
                              ? <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />
                              : (
                                  orderStatus.loading && !hasBusinessSearchLocation
                                    ? (
                                    <SpinnerLoader />
                                      )
                                    : (
                                        isUserVerifyRequired && !guestCheckoutEnabled
                                          ? (
                                        <Redirect to='/verify' />
                                            )
                                          : (
                                              hasBusinessSearchLocation && !singleBusinessConfig.isActive
                                                ? (
                                            <BusinessListingSearch />
                                                  )
                                                : (
                                            <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />
                                                  )
                                            )
                                      )
                                )
                          }
                        </Route>
                        <Route exact path='/promotions'>
                          {orderStatus.loading && !orderStatus.options?.address?.location
                            ? (
                              <SpinnerLoader />
                              )
                            : (
                                isUserVerifyRequired && !guestCheckoutEnabled
                                  ? (
                                  <Redirect to='/verify' />
                                    )
                                  : (
                                      orderStatus.options?.address?.location && !isKioskApp
                                        ? <Promotions businessSlug={updatedBusinessSlug || null} />
                                        : <Redirect to={singleBusinessConfig.isActive ? singleBusinessHome : menuHome} />
                                    )
                              )}
                        </Route>
                        <Route path='/checkout/:cartUuid?'>
                          {auth
                            ? isUserVerifyRequired && !guestCheckoutEnabled
                              ? <Redirect to='/verify' />
                              : <CheckoutPage />
                            : (
                              <Redirect to={{
                                pathname: singleBusinessConfig.isActive
                                  ? singleBusinessHome
                                  : menuHome,
                                state: { from: location.pathname || null }
                              }}
                              />
                              )}
                        </Route>
                        <Route exact path='/multi-checkout/:cartUuid?'>
                          {auth
                            ? isUserVerifyRequired && !guestCheckoutEnabled
                              ? <Redirect to='/verify' />
                              : <MultiCheckout />
                            : (
                              <Redirect to={{
                                pathname: singleBusinessConfig.isActive
                                  ? singleBusinessHome
                                  : menuHome,
                                state: { from: location.pathname || null }
                              }}
                              />
                              )}
                        </Route>
                        <Route exact path='/multi-cart'>
                          {auth
                            ? isUserVerifyRequired && !guestCheckoutEnabled
                              ? <Redirect to='/verify' />
                              : <MultiCart />
                            : (
                              <Redirect to={{
                                pathname: singleBusinessConfig.isActive
                                  ? singleBusinessHome
                                  : menuHome,
                                state: { from: location.pathname || null }
                              }}
                              />
                              )}
                        </Route>
                        <Route exact path='/multi-orders/:orderId'>
                          {auth
                            ? isUserVerifyRequired && !guestCheckoutEnabled
                              ? <Redirect to='/verify' />
                              : <MultiOrdersDetails />
                            : (
                              <Redirect to={{
                                pathname: singleBusinessConfig.isActive
                                  ? singleBusinessHome
                                  : menuHome,
                                state: { from: location.pathname || null }
                              }}
                              />
                              )}
                        </Route>
                        <Route exact path='/orders/:orderId'>
                          {(auth || hashKey)
                            ? isUserVerifyRequired && !guestCheckoutEnabled
                              ? <Redirect to='/verify' />
                              : <OrderDetailsPage />
                            : (
                              <Redirect to={{
                                pathname: singleBusinessConfig.isActive
                                  ? singleBusinessHome
                                  : menuHome,
                                state: { from: location.pathname || null }
                              }}
                              />
                              )}
                        </Route>
                        <Route exact path='/pages/:pageSlug'>
                          {isUserVerifyRequired && !guestCheckoutEnabled
                            ? (
                              <Redirect to='/verify' />
                              )
                            : (
                              <Cms />
                              )}
                        </Route>
                        <Route exact path='/pages'>
                          {isUserVerifyRequired && !guestCheckoutEnabled
                            ? (
                              <Redirect to='/verify' />
                              )
                            : (
                              <PagesList />
                              )}
                        </Route>
                        <Route exact path='/favorite'>
                          {auth && !isKioskApp
                            ? <Favorite />
                            : (
                              <Redirect to={menuHome} />
                              )}
                        </Route>
                        <Route exact path='/sessions'>
                          {auth && !isKioskApp
                            ? <SessionsList />
                            : (
                              <Redirect to={menuHome} />
                              )}
                        </Route>
                        <Route exact path='/store'>
                          {queryIntegrationToken && queryIntegrationCode === 'spoonity'
                            ? <QueryLoginSpoonity token={queryIntegrationToken} notificationState={oneSignalState} />
                            : isUserVerifyRequired && !guestCheckoutEnabled
                              ? (
                                <Redirect to='/verify' />
                                )
                              : (
                                <BusinessProductsList />
                                )}
                        </Route>
                        <Route exact path='/store/:business_slug'>
                          {queryIntegrationToken && queryIntegrationCode === 'spoonity'
                            ? <QueryLoginSpoonity token={queryIntegrationToken} notificationState={oneSignalState} />
                            : isUserVerifyRequired && !guestCheckoutEnabled
                              ? (
                                <Redirect to='/verify' />
                                )
                              : (
                                <BusinessProductsList />
                                )}
                        </Route>
                        <Route exact path='/store/:business_slug/:category_slug/:product_slug'>
                          {queryIntegrationToken && queryIntegrationCode === 'spoonity'
                            ? <QueryLoginSpoonity token={queryIntegrationToken} notificationState={oneSignalState} />
                            : isUserVerifyRequired && !guestCheckoutEnabled
                              ? (
                                <Redirect to='/verify' />
                                )
                              : (
                                <BusinessProductsList />
                                )}
                        </Route>
                        <Route exact path='/store/:category_slug/:product_slug'>
                          {queryIntegrationToken && queryIntegrationCode === 'spoonity'
                            ? <QueryLoginSpoonity token={queryIntegrationToken} notificationState={oneSignalState} />
                            : isUserVerifyRequired && !guestCheckoutEnabled
                              ? (
                                <Redirect to='/verify' />
                                )
                              : (
                                <BusinessProductsList />
                                )}
                        </Route>
                        <Route exact path='/:business_slug'>
                          {queryIntegrationToken && queryIntegrationCode === 'spoonity'
                            ? <QueryLoginSpoonity token={queryIntegrationToken} notificationState={oneSignalState} />
                            : isUserVerifyRequired && !guestCheckoutEnabled
                              ? (
                                <Redirect to='/verify' />
                                )
                              : (
                                <BusinessProductsList />
                                )}
                        </Route>
                        <Route exact path='/:business_slug/:category_slug/:product_slug'>
                          {queryIntegrationToken && queryIntegrationCode === 'spoonity'
                            ? <QueryLoginSpoonity token={queryIntegrationToken} notificationState={oneSignalState} />
                            : isUserVerifyRequired && !guestCheckoutEnabled
                              ? (
                                <Redirect to='/verify' />
                                )
                              : (
                                <BusinessProductsList />
                                )}
                        </Route>
                        <Route exact path='/:business_slug/:category_slug'>
                          {queryIntegrationToken && queryIntegrationCode === 'spoonity'
                            ? <QueryLoginSpoonity token={queryIntegrationToken} notificationState={oneSignalState} />
                            : isUserVerifyRequired && !guestCheckoutEnabled
                              ? (
                                <Redirect to='/verify' />
                                )
                              : (
                                <BusinessProductsList />
                                )}
                        </Route>
                        <Route path='*'>
                          <PageNotFound />
                        </Route>
                      </Switch>
                      )}
                    </IntercomWrapper>
                  </ScrollToTop>
                )}
                {!isTrackingOnly && ownBranding && <PWAPrompt ready={!languageState.loading} />}
                {!isFooterPage && !hasLandingFooter && (
                  <Footer isFooterPage={isFooterPage} isHome={isHome} />
                )}
                {auth && (
                  <WebsocketStatus useReconnectByLogin />
                )}
                <BottomBarScrollPadding />
                {/* the theme can hide it (visibility bottom_nav) */}
                {/* stays mounted when the screen widens: the cart (and a product being edited) it opened must not close with a turn or a fold */}
                {(onlineStatus && !isTrackingOnly && bottomNavShown(themeUpdated)) && (
                  <NavigationBar hidden={windowSize.width >= 576} />
                )}
                <Alert
                  title={t('INFORMATION', 'Information')}
                  content={alertState.content}
                  links={alertState.links}
                  acceptText={t('ACCEPT', 'Accept')}
                  open={alertState.open}
                  onClose={() => closeAlert()}
                  onCancel={() => closeAlert()}
                  onAccept={() => alertState?.isOnlyAlert ? closeAlert() : acceptAlert()}
                  closeOnBackdrop={false}
                />
                {lastOrderReview?.isReviewOpen && (
                  <LazyDialog
                    legacyMaxWidth
                    open={lastOrderReview?.isReviewOpen}
                    onClose={handleCloseReivew}
                    title={lastOrderReview?.order && reviewModalTitle()}
                    width={lastOrderReview?.reviewStatus?.trigger ? '480px' : undefined}
                  >
                    <div>
                      {
                        lastOrderReview?.reviewStatus?.trigger
                          ? <ReviewTrigger order={lastOrderReview?.order} handleOpenOrderReview={handleOpenOrderReview} />
                          : lastOrderReview?.reviewStatus?.order
                            ? <ReviewOrder order={lastOrderReview?.order} defaultStar={lastOrderReview?.defaultStar} closeReviewOrder={closeReviewOrder} setIsReviewed={() => setIsReviewed('isOrderReviewed')} />
                            : (lastOrderReview?.reviewStatus?.product
                                ? <ReviewProduct order={lastOrderReview?.order} closeReviewProduct={closeReviewProduct} setIsProductReviewed={() => setIsReviewed('isProductReviewed')} />
                                : <ReviewDriver order={lastOrderReview?.order} closeReviewDriver={handleCloseReivew} setIsDriverReviewed={() => setIsReviewed('isDriverReviewed')} />)
                      }
                    </div>
                  </LazyDialog>
                )}
                {businessSignUpSuccessed?.open && (
                  <LazyDialog
                    open={businessSignUpSuccessed?.open}
                    onClose={() => acceptAlert()}
                    title={t('CONGRATULATIONS', 'Congratulations')}
                    size='xl'
                  >
                    <SignUpApproval
                      content={businessSignUpSuccessed?.content}
                      onAccept={() => acceptAlert()}
                      onCancel={() => acceptAlert()}
                    />
                  </LazyDialog>
                )}
              </ThemeProvider>
            )
          }
        </div>
        {/* the toast under the app's theme (the site's),
            outside the boot gate so a boot or early-error toast shows */}
        <AppToast theme={themeUpdated} />
        <CookieConsentBanner />
        {hasConsented && siteCode.body && <SiteBodyCode html={siteCode.body} />}
      </>
      )
}
