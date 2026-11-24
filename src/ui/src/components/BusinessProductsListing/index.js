import React, { useState, useEffect, useCallback, useRef } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'
import { Link, useHistory, useLocation } from 'react-router-dom'
import settings from '../../../../config'
import { StudentOnboardingPopup } from '../StudentOnboardingPopup'
import { EmptyCartMessage } from '../RenderProductsLayout/styles'

import {
  ProductsContainer,
  ProductLoading,
  SkeletonItem,
  MobileCartViewWrapper,
  MobileCartActions,
  BusinessCartContent,
  EmptyCart,
  EmptyBtnWrapper,
  StoreRecoveryActions,
  Title,
  HeaderContent,
  OrderContextUIWrapper
} from './styles'

import { BusinessAndProductList } from '~components/components/BusinessAndProductList'
import { useEvent } from '~components/contexts/EventContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { ToastType, useToast } from '~components/contexts/ToastContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useSession } from '~components/contexts/SessionContext'
import { useSite } from '~components/contexts/SiteContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useBusiness } from '~components/contexts/BusinessContext'
import { shouldRequireOrderAddress } from '~components/utils/orderTypeAddress'
import { useFreeDeliveryProgress } from '~components/hooks/useFreeDeliveryProgress'

import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Button } from '~ui/src/design-system/components/Button'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { useCartBarPulse } from '~ui/hooks/useStoreCartFeedback'
import { setStoreCartInPage } from '~/utils/storeCartInPage'
import { useIsMounted } from '~ui/hooks/useIsMounted'
import { Alert } from '~ui/src/components/Confirm'
import { OrderContextUI } from '~ui/src/components/OrderContextUI'
import { dockOrderContextBar } from '~ui/src/components/Header/orderContextPlacement'
import { NotFoundSource, EmptyStateArt, EmptyStateIcon } from '~ui/src/components/NotFoundSource'
import { PageNotFound } from '~ui/src/components/PageNotFound'
import { Cart } from '~ui/src/components/Cart'
import { ProductForm } from '~ui/src/components/ProductForm'
import { ProductModal } from '~ui/src/components/ProductForm/ProductModal'
import { ServiceForm } from '~ui/src/components/ServiceForm'
import { BusinessPreorder } from '~ui/src/components/BusinessPreorder'
import { MomentContent } from '~ui/src/components/MomentContent'
import { OrderMomentDraft } from '~ui/src/components/MomentControl/OrderMomentDraft'
import { FloatingButton } from '~ui/src/components/FloatingButton'
import { UpsellingPage } from '~ui/src/components/UpsellingPage'
import { RenderProductsLayout } from '~ui/src/components/RenderProductsLayout'
import { FreeDeliveryProgress } from '~ui/src/components/FreeDeliveryProgress'

import { themeSpace } from '~/utils/themeTokens'
import { BackLink } from './BackLink'
import { ModalHeading } from '~ui/src/components/Overlay/ModalHeading'
import { franchiseSlug, isFullWebsite, menuPath, singleStoreSlug } from '~/utils/siteSettings'
import {
  bootPickupRelease,
  bootPickupStart,
  isEntryStore,
  setStorePickupForcedFrom,
  storePickupApplies,
  storePickupLanding,
  storePickupStartTaken,
  takeStorePickupForcedFrom,
  themeStorePath,
  unaddressedTypesFor
} from '~/utils/singleStore'
import { appendLocationToSearch, applySearchOrderType, hasValidSearchLocation, parseSearchQueryLocation } from '~/utils/searchQueryLocation'
import { isValidOrderMoment, productRequiresSchedule } from '~/utils/businessTime'
import { themeVisible } from '~/utils/themeVisibility'
import { DESKTOP_MIN_WIDTH, storeCartColumn, storePageVariant } from '../RenderProductsLayout/storePageTemplate'
import { getThemeCss } from '~/utils/themeCss'
import { BOTTOM_NAV_DOCKED, bottomNavHeight } from '~ui/src/components/NavigationBar/styles'

const PIXELS_TO_SCROLL = 300

const BusinessProductsListingUI = (props) => {
  const {
    errors,
    openCategories,
    isInitialRender,
    businessState,
    reloadBusiness,
    categorySelected,
    searchValue,
    sortByValue,
    categoryState,
    categoryId,
    productId,
    productModal,
    getNextProducts,
    handleChangeCategory,
    handleUpdateInitialRender,
    updateProductModal,
    onProductRedirect,
    handleChangeSearch,
    handleSearchRedirect,
    featuredProducts,
    handleChangeSortBy,
    isCartOnProductsList,
    errorQuantityProducts,
    multiRemoveProducts,
    setAlertState,
    alertState,
    onCheckoutRedirect,
    handleUpdateProducts,
    professionalSelected,
    handleChangeProfessionalSelected,
    onChangeMetaTag,
    onBusinessClick,
    handleChangePriceFilterValues,
    priceFilterValues,
    handleUpdateProfessionals,
    isCustomerMode,
    isCustomLayout,
    notFound,
    setNotFound,
    loadedFirstTime,
    handleAddReservation,
    handleFavoriteBusiness
  } = props

  const { business, loading, error } = businessState
  const [{ configs }] = useConfig()
  const theme = useTheme()
  // the product modal's width (product_modal.base.width)
  const productModalWidth = getThemeCss(theme, 'product_modal').base.width
  const [, t] = useLanguage()
  const [orderState, { addProduct, updateProduct, changeType, setPickupWithoutAddress }] = useOrder()
  const { carts, options } = orderState
  const [{ parsePrice }] = useUtils()
  const [events] = useEvent()
  const location = useLocation()
  const history = useHistory()
  const recoveryIntent = useRef(null)
  const [recoveryPending, setRecoveryPending] = useState(false)

  useEffect(() => {
    const unlisten = history.listen(() => {
      if (!recoveryIntent.current) return
      recoveryIntent.current = null
      setRecoveryPending(false)
    })
    return () => {
      unlisten()
      recoveryIntent.current = null
    }
  }, [history])

  const windowSize = useWindowSize()
  const [{ auth }] = useSession()
  const [{ site }] = useSite()
  const [, { setBusiness }] = useBusiness()
  const [openProduct, setModalIsOpen] = useState(false)
  const productContentRef = useRef(null)
  const wasOnProductRoute = useRef(false)
  const [curProduct, setCurProduct] = useState(props.product)
  const [openUpselling, setOpenUpselling] = useState(false)
  const [canOpenUpselling, setCanOpenUpselling] = useState(false)
  const [openBusinessInformation, setOpenBusinessInformation] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCartModal, setisCartModal] = useState(false)
  const cartOpenerRef = useRef(null)
  const [subcategoriesSelected, setSubcategoriesSelected] = useState([])
  const [productLoading, setProductLoading] = useState(false)
  // the product form's own "Schedule for later" button asked for a moment
  // (implementation notesthe product itself opens read-only, never a modal first);
  // the preorder modal below (BusinessPreorder) is rendered right here, not
  // in BusinessBasicInformation, because RenderProductsLayout remounts that
  // one (skeleton vs loaded) on every business reload — implementation notes. This
  // component isn't remounted by that reload, so its state survives it.
  // After confirmation, keep the product read-only until the catalog
  // response for that moment arrives.
  const [pendingSchedule, setPendingSchedule] = useState(null)
  const confirmedScheduleMoment = pendingSchedule?.confirmedMoment
  const menuLoad = businessState.menuLoad
  const isConfirmedMenu = !!confirmedScheduleMoment && menuLoad?.moment === confirmedScheduleMoment && menuLoad.id > pendingSchedule.afterMenuRequestId
  const scheduleMenuFailed = isConfirmedMenu && menuLoad.status === 'error'
  const waitingForScheduledMenu = !!confirmedScheduleMoment && !scheduleMenuFailed
  // implementation notesthe Preorder button's own modal (BusinessInfoComponent),
  // lifted here for the same reason as pendingSchedule above — a moment
  // picked inside it reloads the business, which remounts
  // BusinessBasicInformation (and would close a modal state kept there)
  const [isPreOrder, setIsPreOrder] = useState(false)
  const productsRef = useRef(null)
  const mobileCartFooterRef = React.useRef(null)
  const [mobileCartFooterHeight, setMobileCartFooterHeight] = useState(0)
  const isMounted = useIsMounted()

  const updatedBusinessSlug = singleStoreSlug(theme, settings)
  const effectiveFranchiseId = props.franchiseId || franchiseSlug(theme, settings)
  const hideGoToBusinesses = !!updatedBusinessSlug
  const showStoreSwitcher = !!props.franchiseId && !props.useKioskApp && !isCustomerMode && !!business?.id
  const isQuickAddProduct = configs?.add_product_with_one_click?.value === '1'
  const isPreorderEnabled = configs?.preorder_status_enabled?.value === '1'
  // The controller only exposes a GET result for the active route. During a
  // route transition, the previous catalog selection must not fill the form.
  const matchesProductRoute = !productId || [curProduct?.id, curProduct?.slug].some(id => id != null && String(id) === String(productId))
  const shownProduct = productModal.product || (matchesProductRoute ? curProduct : null)
  const unaddressedTypes = unaddressedTypesFor(configs, orderState)
  const checkoutMultiBusinessEnabled = configs?.checkout_multi_business_enabled?.value === '1'
  const currentCart = Object.values(carts).find(cart => cart?.business?.slug === business?.slug) ?? {}
  const hasBusinessError = Array.isArray(error) ? error.length > 0 : Boolean(error)
  const freeDeliveryProgress = useFreeDeliveryProgress({
    business,
    cart: currentCart,
    franchiseId: effectiveFranchiseId,
    enabled: !props.useKioskApp && !loading && !hasBusinessError
  })
  // the bar with the cart's total and "View cart" (visibility business.cart_bar)
  // (the direct menu is on its desktop layout from the desktop cut: the cart is beside the menu, or, without that
  // column, the header's drawer; no bar there, the designs A and C keep theirs at every width)
  const isDirectMenu = storePageVariant(theme, { business, configs, useKioskApp: props.useKioskApp }) === 'menu'
  const directMenuDesktop = isDirectMenu && windowSize.width >= DESKTOP_MIN_WIDTH
  const cartBeside = directMenuDesktop && storeCartColumn(theme)
  const cartBarVisible = themeVisible(theme, 'business.cart_bar')
  const mobileCartVisible = currentCart?.products?.length > 0 && !isCartModal && !directMenuDesktop && cartBarVisible
  // implementation notesin the direct menu the cart is always on the page (the panel beside the menu, else the bar), so
  // adding a product does not open the header's drawer: the panel highlights the line, the bar animates. Without
  // the cart column the desktop's cart is the header's drawer, which an add does not open either: the
  // icon's count animates. The header reads this (storeCartInPage) in another tree.
  const cartInPage = cartBeside ? 'aside' : (directMenuDesktop ? 'header' : (isDirectMenu && cartBarVisible ? 'bar' : null))
  const cartBarPulse = useCartBarPulse(cartInPage === 'bar')
  useEffect(() => {
    setStoreCartInPage(cartInPage)
    return () => setStoreCartInPage(null)
  }, [cartInPage])
  const isLazy = businessState?.business?.lazy_load_products_recommended
  const showViewOrderButton = false
  const singleBusinessRedirect = true || window.localStorage.getItem('single_business')
  // The back arrow to the list, unless the site has no list to go back to (a
  // single store site, or the list that redirected to its only store) or the
  // theme hides it (visibility business.back)
  const isSingleStoreSite = !!updatedBusinessSlug || !!window.localStorage.getItem('single_business')
  const showBackArrow = !isCustomLayout && !location.pathname.includes('/marketplace') &&
    !isSingleStoreSite && themeVisible(theme, 'business.back')
  // until the header has all of it, the order context is a bar docked under
  // the header (orderContextPlacement)
  const dockOrderContext = dockOrderContextBar(windowSize?.width, theme, orderState?.options?.type)
  const cateringTypes = [7, 8]
  const cateringPreorder = cateringTypes.includes(options?.type)
  const sortByOptions = [
    { value: null, content: t('SORT_BY', 'Sort By'), showOnSelected: t('SORT_BY', 'Sort By') },
    { value: 'rank', content: t('RANK', 'Rank'), showOnSelected: t('RANK', 'Rank') },
    { value: 'a-z', content: t('A_to_Z', 'A-Z'), showOnSelected: t('A_to_Z', 'A-Z') }
  ]

  const subtotalWithTaxes = currentCart?.taxes?.reduce((acc, item) => {
    if (item?.type === 1) {
      return acc = acc + item?.summary?.tax
    }
    return acc
  }, currentCart?.subtotal)

  const handler = () => {
    setOpenBusinessInformation(true)
  }

  // closed with no scheduled moment, or closed and the product's own schedule
  // rules it out (ASAP + closed shows the full menu now — implementation notes); an open
  // business keeps its previous flow
  const requiresSchedule = (product) => productRequiresSchedule(business, product, options?.moment)

  // the product's own "Schedule for later" button asks for a
  // moment through the preorder modal below; it only renders when preorder
  // is enabled (ProductForm's onRequestSchedule prop)
  const requestProductSchedule = (product) => setPendingSchedule({ product, businessId: business?.id })

  const handlePreorderDismissed = () => setPendingSchedule(null)
  const handlePreorderConfirmed = ({ changed, moment }) => {
    if (!changed && scheduleMenuFailed) {
      reloadBusiness()
      return
    }
    setPendingSchedule(prev => {
      if (!prev || !changed || !isValidOrderMoment(moment)) return null
      return { ...prev, confirmedMoment: moment, afterMenuRequestId: menuLoad?.id ?? 0 }
    })
  }
  const focusProductAfterScheduling = () => {
    const popup = productContentRef.current?.closest('[role=dialog]')
    // Save can replace the Schedule for later button with Add to cart.
    return popup?.querySelector('[data-slot=dialog-close-button]') ?? popup ?? true
  }

  const closePreOrder = () => setIsPreOrder(false)

  // the pending product by id, in the menu just reloaded for the moment picked
  const findProductInMenu = (id) => {
    const flatten = (categories) => (categories || []).reduce((products, category) => [
      ...products,
      ...(category?.products || []),
      ...flatten(category?.subcategories)
    ], [])
    return flatten(business?.categories).find((product) => product?.id === id) || null
  }

  // The product goes straight to the cart, with no form: nothing to choose (no options), nothing the form
  // does that the cart does not (a closed store asks for a moment first; an inventoried one has its own checks)
  // and a person who can add (a guest goes through the form, which signs her in)
  const canQuickAdd = (product) => auth && !requiresSchedule(product) && product.extras.length === 0 && !product.inventoried

  const quickAddProduct = async (product) => {
    if (shouldRequireOrderAddress(options?.type, options, unaddressedTypes)) {
      events.emit('require_order_address', { orderType: options?.type })
      return
    }
    setProductLoading(true)
    const isProductAddedToCart = currentCart?.products?.find(Cproduct => Cproduct.id === product.id)
    const productQuantity = isProductAddedToCart?.quantity
    const minimumPerOrder = product?.minimum_per_order || 1
    const addCurrentProduct = {
      ...product,
      quantity: minimumPerOrder
    }
    const updateCurrentProduct = {
      id: product.id,
      code: isProductAddedToCart?.code,
      quantity: productQuantity + 1
    }
    const cartData = currentCart?.business_id ? currentCart : { business_id: business.id }
    if (isProductAddedToCart) {
      await updateProduct(updateCurrentProduct, cartData, isQuickAddProduct)
    } else {
      await addProduct(addCurrentProduct, cartData, isQuickAddProduct)
    }
    setProductLoading(false)
  }

  const openProductForm = (product) => {
    const productSlug = product?.slug || product?.id
    const categorySlug = product?.category?.slug || product?.category_id
    if (!((product?.type === 'service') && business?.professionals?.length > 0)) {
      if (site?.product_url_template) {
        onProductRedirect({
          slug: business?.slug,
          product: site.product_url_template.includes('product_slug') ? productSlug : product.id,
          category: site.product_url_template.includes('category_slug') ? categorySlug : product.category_id
        })
      } else {
        onProductRedirect({
          slug: business?.slug,
          product: product.id,
          category: product.category_id
        })
      }
    }
    handleUpdateInitialRender(false)
    setCurProduct(product)
    setModalIsOpen(true)
    events.emit('product_clicked', product)
  }

  const onProductClick = async (product) => {
    if (currentCart?.status === 2) {
      openAlertErrorStatus()
      return
    }
    // closed + unscheduled: never quick-add straight to cart,
    // open the form instead — it shows the product read-only with its own
    // "Schedule for later" button
    if (canQuickAdd(product) && isQuickAddProduct) await quickAddProduct(product)
    else openProductForm(product)
  }

  // The "+" of the store page's designs (whatever the store's one-click setting says): the product with nothing to
  // choose goes to the cart, any other (or one at its maximum per order, a service with professionals) opens its
  // form as a click on it does
  const onProductAdd = async (product) => {
    if (currentCart?.status === 2) {
      openAlertErrorStatus()
      return
    }
    const inCart = currentCart?.products?.find(Cproduct => Cproduct.id === product.id)?.quantity ?? 0
    const atMaximum = product?.maximum_per_order && inCart >= product.maximum_per_order
    const needsProfessional = product?.type === 'service' && business?.professionals?.length > 0
    if (canQuickAdd(product) && !atMaximum && !needsProfessional) await quickAddProduct(product)
    else openProductForm(product)
  }

  const handleCustomProductBannerClick = (product) => {
    if (currentCart?.status === 2) {
      openAlertErrorStatus()
      return
    }
    const productSlug = product?.slug || product?.id
    const categorySlug = product?.category?.slug || product?.category_id
    if (!((product?.type === 'service') && business?.professionals?.length > 0)) {
      if (site?.product_url_template) {
        onProductRedirect({
          slug: business?.slug,
          product: site.product_url_template.includes('product_slug') ? productSlug : product.id,
          category: site.product_url_template.includes('category_slug') ? categorySlug : product.category_id
        })
      } else {
        onProductRedirect({
          slug: business?.slug,
          product: product.id,
          category: product.category_id
        })
      }
    }
    handleUpdateInitialRender(false)
    setCurProduct(product)
    setModalIsOpen(true)
  }

  const resetProductModal = () => {
    setModalIsOpen(false)
    setPendingSchedule(null)
    handleUpdateInitialRender(false)
    updateProductModal(null)
    setCurProduct(null)
    setNotFound(false)
  }

  const closeModalProductForm = () => {
    resetProductModal()
    onProductRedirect({
      slug: business?.slug
    })
  }

  const handlerProductAction = (product) => {
    if (currentCart?.status === 2) {
      openAlertErrorStatus()
      return
    }
    if (Object.keys(product).length) closeModalProductForm()
  }

  const handleScroll = useCallback(() => {
    const innerHeightScrolltop = window.innerHeight + document.documentElement?.scrollTop + PIXELS_TO_SCROLL
    const badScrollPosition = innerHeightScrolltop < document.documentElement?.offsetHeight
    const hasMore = !(categoryState.pagination.totalPages === categoryState.pagination.currentPage)
    if (badScrollPosition || categoryState.loading || !hasMore) return
    getNextProducts({ isNextPage: true })
  }, [categoryState, windowSize.width])

  const handleUpsellingPage = () => {
    onCheckoutRedirect(currentCart?.uuid)
    setOpenUpselling(false)
    setCanOpenUpselling(false)
  }

  const handleGoToBusinessList = (e) => {
    e.preventDefault()
    events.emit('go_to_page', { page: 'search' })
  }

  const adjustBusiness = async (adjustBusinessId) => {
    const _carts = carts?.[adjustBusinessId]
    const products = carts?.[adjustBusinessId]?.products || []
    const unavailableProducts = products.filter(product => product.valid !== true)
    const alreadyRemoved = sessionStorage.getItem('already-removed')
    sessionStorage.removeItem('already-removed')

    if (unavailableProducts.length > 0) {
      multiRemoveProducts && await multiRemoveProducts(unavailableProducts, _carts)
      return
    }

    if (alreadyRemoved === 'removed') {
      setAlertState({ open: true, content: [t('NOT_AVAILABLE_PRODUCT', 'This product is not available.')] })
    }
  }

  const openAlertErrorStatus = () => {
    setAlertState({ open: true, content: [t('YOU_HAVE_CART_IN_PROGRESS', 'You have a cart in progress, please complete it')] })
  }

  useEffect(() => {
    if (!loading && business?.id && categoryId && productId && isInitialRender) {
      if (productModal?.product?.id) {
        setCurProduct(productModal.product)
      }
      setModalIsOpen(true)
    }
  }, [loading, business?.id, productModal, categoryId, productId, isInitialRender])

  useEffect(() => {
    window.scrollTo(0, 0)
    if (categoryId && productId) handleUpdateInitialRender(true)
    events.emit('get_current_view')
  }, [])

  useEffect(() => {
    const handleClickedBannerProduct = () => {
      handleUpdateInitialRender(true)
    }
    events.on('product_banner_clicked', handleClickedBannerProduct)
    return () => {
      events.off('product_banner_clicked', handleClickedBannerProduct)
    }
  }, [])

  // A GET already in flight when the shopper clicked confirm can carry the
  // old catalog. Only the response for the saved moment can resume the form.
  useEffect(() => {
    if (!isConfirmedMenu || menuLoad.status !== 'ready') return
    if (business?.id !== pendingSchedule.businessId || options?.moment !== confirmedScheduleMoment) return
    const resumed = findProductInMenu(pendingSchedule.product.id)
    setPendingSchedule(null)
    if (resumed) {
      // productModal.product wins over curProduct in the render below: keep
      // both in sync (the click flow only sets curProduct, the direct-link
      // flow only productModal.product)
      setCurProduct(resumed)
      updateProductModal(resumed)
      if (resumed.schedule_available === false) {
        setAlertState({ open: true, content: [t('NOT_AVAILABLE_PRODUCT', 'This product is not available.')] })
      }
    } else {
      // gone from the reloaded menu: never show it active with the stale
      // data it had before scheduling — force the read-only predicate itself
      // (schedule_available: false), not just an alert over stale content
      const unavailable = { ...pendingSchedule.product, schedule_available: false }
      setCurProduct(unavailable)
      updateProductModal(unavailable)
      setAlertState({ open: true, content: [t('NOT_AVAILABLE_PRODUCT', 'This product is not available.')] })
    }
  }, [pendingSchedule, menuLoad, business, options?.moment])

  useEffect(() => {
    if (scheduleMenuFailed) {
      setAlertState({ open: true, content: [t('TRY_AGAIN', 'Please try again')] })
    }
  }, [scheduleMenuFailed])

  useEffect(() => {
    if (categoryId && productId) {
      wasOnProductRoute.current = true
      // Back closes the dialog, and Forward fetches it from its URL, just as
      // on direct entry. Clicks on the menu already supply the product.
      if (history.action === 'POP') handleUpdateInitialRender(true)
    } else if (wasOnProductRoute.current) {
      wasOnProductRoute.current = false
      if (openProduct || isInitialRender) resetProductModal()
    }
  }, [categoryId, productId, history])

  useEffect(() => {
    if (loading) return
    if (openProduct) {
      onChangeMetaTag && onChangeMetaTag(curProduct?.seo_title, curProduct?.seo_description, curProduct?.seo_keywords)
    } else {
      onChangeMetaTag && onChangeMetaTag(business?.name, business?.description, business?.name)
      updateProductModal(null)
      setCurProduct(null)
    }
  }, [openProduct, loading, business, curProduct])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Enable addressless pickup for the eligible store. If the
  // startup gates have not decided yet, apply the shared pickup default
  // using the loaded business and order.
  useEffect(() => {
    // waits for the project's order types and the order's own boot (local
    // storage / API options), so neither overwrites the pickup it starts
    if (!business?.id || orderState.loading || !configs?.order_types_allowed?.value) return
    const pickupStore = {
      singleStore: !!updatedBusinessSlug,
      entry: isEntryStore(site, business?.slug, { fullWebsite: isFullWebsite(theme) }),
      configTypes: configs?.order_types_allowed?.value?.split('|').map(value => Number(value)) || [],
      business
    }
    const applies = storePickupApplies(pickupStore)
    setPickupWithoutAddress?.(applies)
    // consumed every run so a stale record never lingers; put it right back
    // if it wasn't for this business (a fast client nav to another store
    // before the first one's own business ever loaded) — it isn't ours to use
    const forcedFrom = takeStorePickupForcedFrom()
    const forcedFromMatches = forcedFrom?.slug === business?.slug
    if (forcedFrom && !forcedFromMatches) {
      setStorePickupForcedFrom(forcedFrom.type, forcedFrom.slug)
    }
    const pickupStart = bootPickupStart({ ...pickupStore, options, carts: orderState.carts, slug: business.slug })
    if (pickupStart.action === 'force') {
      changeType(2)
    } else if (!applies && forcedFromMatches && options?.type === 2) {
      // implementation notesthe gate below forced pickup before this business loaded
      // (business was unknown then); it disables pickup after all, so undo it
      changeType(forcedFrom.type)
    }
  }, [business?.id, business?.slug, orderState.loading, configs?.order_types_allowed?.value])

  useEffect(() => {
    if (business?.schedule?.length) {
      window.localStorage.setItem('business_schedule', JSON.stringify(business?.schedule))
    }

    return () => {
      if (business?.schedule?.length) {
        window.localStorage.removeItem('business_schedule')
      }
    }
  }, [business?.schedule])

  useEffect(() => {
    const adjustBusinessId = sessionStorage.getItem('adjust-cart-products')
    if (currentCart && adjustBusinessId) {
      sessionStorage.removeItem('adjust-cart-products')
      adjustBusiness(adjustBusinessId)
    }
  }, [currentCart])

  useEffect(() => {
    if (cateringPreorder) {
      setBusiness(business)
    }
    return () => {
      setBusiness({})
    }
  }, [cateringPreorder, business])

  useEffect(() => {
    const footer = mobileCartFooterRef.current
    if (!mobileCartVisible || !footer) {
      setMobileCartFooterHeight(0)
      return
    }

    const measureFooter = () => setMobileCartFooterHeight(footer.getBoundingClientRect().height)
    measureFooter()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureFooter) : null
    observer?.observe(footer)
    window.addEventListener('resize', measureFooter)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measureFooter)
    }
  }, [mobileCartVisible, freeDeliveryProgress.status, freeDeliveryProgress.remainingAmount, currentCart?.total])

  const renderMissingStore = () => {
    const orderHasLocation = hasValidSearchLocation(orderState.options?.address?.location)
    const urlLocation = parseSearchQueryLocation(location.search)
    const canListBusinesses = orderHasLocation || !!urlLocation
    let label = t('CHOOSE_AN_ADDRESS', 'Choose an address')
    let destination = menuPath(theme, settings)
    const menuSlug = updatedBusinessSlug || (settings.use_marketplace && 'marketplace')
    const retryMenu = menuSlug && String(menuSlug) === String(props.slug)
    if (menuSlug) {
      label = retryMenu ? t('TRY_AGAIN', 'Please try again') : t('GO_TO_MENU', 'Go to menu')
      destination = themeStorePath(theme, site, menuSlug)
    } else if (props.useKioskApp) {
      label = t('GO_TO_HOME', 'Go to home')
    } else if (canListBusinesses) {
      label = t('SEARCH_REDIRECT', 'Go to Businesses')
      const orderType = new URLSearchParams(location.search).get('order_type')
      const orderTypeQuery = orderType ? `?order_type=${encodeURIComponent(orderType)}` : ''
      destination = orderHasLocation ? '/search' : `/search${appendLocationToSearch(orderTypeQuery, urlLocation)}`
    }
    const searchFromCoordinates = !menuSlug && !props.useKioskApp && !orderHasLocation && urlLocation
    const followSearch = async (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return
      event.preventDefault()
      if (recoveryIntent.current) return
      const intent = { location: history.location }
      recoveryIntent.current = intent
      setRecoveryPending(true)
      const isCurrent = () => recoveryIntent.current === intent && history.location === intent.location
      try {
        await applySearchOrderType({
          search: location.search,
          activeType: orderState.options?.type,
          allowedTypes: configs?.order_types_allowed?.value,
          changeType
        })
        if (isCurrent()) history.push(destination)
      } catch {
        if (isCurrent()) setAlertState({ open: true, content: [t('TRY_AGAIN', 'Please try again')] })
      } finally {
        if (recoveryIntent.current === intent) {
          recoveryIntent.current = null
          setRecoveryPending(false)
        }
      }
    }
    // The single-store route already uses the configured slug, so a full navigation retries its request.
    return (
      <NotFoundSource headingLevel='h1' icon='shop' content={t('STORE_NOT_FOUND', 'Store not found')}>
        <StoreRecoveryActions>
          <Button
            appearance='outline'
            busy={Boolean(searchFromCoordinates && recoveryPending)}
            nativeButton={false}
            role='link'
            render={menuSlug ? <a href={destination} /> : <Link to={destination} onClick={searchFromCoordinates ? followSearch : undefined} />}
          >
            {label}
          </Button>
          {retryMenu && (
            <Button appearance='ghost' nativeButton={false} role='link' render={<Link to='/pages' />}>
              {t('SITEMAP', 'Site Map')}
            </Button>
          )}
        </StoreRecoveryActions>
      </NotFoundSource>
    )
  }

  return (
    <>
      {business?.vertical === 'school' && (
        <StudentOnboardingPopup business={business} />
      )}
      <div data-doc-section='business-menu-capture-frame' style={{ width: '100%' }}>
        {/* the order context docked under the header, full width */}
        {!props.useKioskApp && dockOrderContext && (
          <OrderContextUI isDocked />
        )}
        <ProductsContainer
          ref={productsRef}
          data-doc-section='business-menu'
          tabIndex={-1}
          data-doc-state={loading ? 'loading' : error ? 'error' : business?.id ? (business?.categories?.length ? 'results' : 'empty') : 'empty'}
          singleBusinessRedirect={singleBusinessRedirect}
          $docked={dockOrderContext}
          style={mobileCartVisible ? { paddingBottom: mobileCartFooterHeight + (windowSize?.width < 576 ? bottomNavHeight(theme) : 0) + 16 } : undefined}
        >
        {!props.useKioskApp && (showBackArrow || !dockOrderContext) && (
          <HeaderContent switchFlex={windowSize?.width < 576}>
            {showBackArrow && (
              /* a link to the list (a real href): the click (pointer or
                 keyboard) goes there without reloading the page */
              <BackLink label={t('BACK', 'Back')} onClick={handleGoToBusinessList} />
            )}
            {windowSize?.width < 576 && !dockOrderContext && (
              <OrderContextUIWrapper>
                <OrderContextUI isCheckOut />
              </OrderContextUIWrapper>
            )}
          </HeaderContent>
        )}
        <RenderProductsLayout
          errors={errors}
          onBackToList={showBackArrow ? handleGoToBusinessList : null}
          isError={error}
          isLoading={loading}
          isLazy={isLazy}
          business={business}
          categoryId={categoryId}
          searchValue={searchValue}
          sortByValue={sortByValue}
          currentCart={currentCart}
          freeDeliveryProgress={freeDeliveryProgress}
          businessState={businessState}
          sortByOptions={sortByOptions}
          categoryState={categoryState}
          isCustomLayout={isCustomLayout}
          categoriesState={props.categoriesState}
          useKioskApp={props.useKioskApp}
          categorySelected={categorySelected}
          openCategories={openCategories}
          openBusinessInformation={openBusinessInformation}
          forceShowNearBusiness={props.forceShowNearBusiness}
          isCartOnProductsList={isCartOnProductsList && currentCart?.products?.length > 0}
          handleChangeSortBy={handleChangeSortBy}
          errorQuantityProducts={errorQuantityProducts}
          onClickCategory={handleChangeCategory}
          featuredProducts={featuredProducts}
          subcategoriesSelected={subcategoriesSelected}
          handler={handler}
          onProductClick={onProductClick}
          onProductAdd={onProductAdd}
          handleSearchRedirect={handleSearchRedirect}
          handleChangeSearch={handleChangeSearch}
          setOpenBusinessInformation={setOpenBusinessInformation}
          isPreOrder={isPreOrder}
          setIsPreOrder={setIsPreOrder}
          handleCartOpen={(val) => setIsCartOpen(val)}
          setSubcategoriesSelected={setSubcategoriesSelected}
          handleUpdateProducts={handleUpdateProducts}
          professionalSelected={professionalSelected}
          openProduct={openProduct}
          handleChangeProfessionalSelected={handleChangeProfessionalSelected}
          onBusinessClick={onBusinessClick}
          priceFilterValues={priceFilterValues}
          handleChangePriceFilterValues={handleChangePriceFilterValues}
          productLoading={productLoading}
          setProductLoading={setProductLoading}
          handleUpdateProfessionals={handleUpdateProfessionals}
          isCustomerMode={isCustomerMode}
          handleCustomProductBannerClick={handleCustomProductBannerClick}
          handleAddReservation={handleAddReservation}
          openAlertErrorStatus={openAlertErrorStatus}
          handleFavoriteBusiness={handleFavoriteBusiness}
          showStoreSwitcher={showStoreSwitcher}
        />

        {
          isMounted && !loading && loadedFirstTime && business && !Object.keys(business).length && (
            <div data-resume-recover='products'>
              <NotFoundSource
                headingLevel='h2'
                variant='empty'
                icon='shop'
                content={t('NO_PRODUCTS_IN_BUSINESS', 'This business has no products to show right now')}
                subtitle={t('NO_PRODUCTS_AVAILABLE_DESC', 'This business may update its menu later.')}
                btnTitle={hideGoToBusinesses ? null : t('SEARCH_REDIRECT', 'Go to Businesses')}
                onClickButton={hideGoToBusinesses ? null : () => handleSearchRedirect()}
              />
            </div>
          )
        }

        {!loading && !business && (props.slug ? renderMissingStore() : <PageNotFound />)}

        {error && error.length > 0 && business && Object.keys(business).length && (
          <NotFoundSource
            headingLevel='h2'
            icon='shop'
            content={error[0]?.message || error[0]}
            btnTitle={hideGoToBusinesses ? null : t('SEARCH_REDIRECT', 'Go to Businesses')}
            onClickButton={hideGoToBusinesses ? null : handleSearchRedirect}
          />
        )}
        </ProductsContainer>
      </div>
      {currentCart?.products?.length > 0 && auth && !isCartOpen && showViewOrderButton && !checkoutMultiBusinessEnabled && (
        <FloatingButton
          btnText={
            !currentCart?.valid_maximum
              ? (
                `${t('MAXIMUM_SUBTOTAL_ORDER', 'Maximum subtotal order')}: ${parsePrice(currentCart?.maximum)}`
                )
              : (subtotalWithTaxes < currentCart?.minimum)
                  ? (
                  `${t('MINIMUN_SUBTOTAL_ORDER', 'Minimum subtotal order:')} ${parsePrice(currentCart?.minimum)}`
                    )
                  : !openUpselling !== canOpenUpselling ? t('VIEW_ORDER', 'View Order') : t('LOADING', 'Loading')
          }
          isSecondaryBtn={!currentCart?.valid_maximum || subtotalWithTaxes < currentCart?.minimum}
          btnValue={currentCart?.products?.length}
          handleClick={() => setOpenUpselling(true)}
          disabled={openUpselling || !currentCart?.valid_maximum || subtotalWithTaxes < currentCart?.minimum}
        />
      )}
      {mobileCartVisible && (
        <MobileCartViewWrapper
          ref={mobileCartFooterRef}
          className={BOTTOM_NAV_DOCKED}
          data-doc-section='business-cart-bar'
          data-cart-pulse={cartBarPulse > 0 ? cartBarPulse % 2 : undefined}
        >
          {['progress', 'unlocked', 'unconfirmed'].includes(freeDeliveryProgress.status) && themeVisible(theme, 'cart.free_delivery_progress') && (
            <FreeDeliveryProgress {...freeDeliveryProgress} variant='compact' />
          )}
          <MobileCartActions>
            <span>{parsePrice(currentCart?.total)}</span>
            <Button ref={cartOpenerRef} color='primary' size='md' onClick={() => setisCartModal(true)}>{t('VIEW_CART', 'View cart')}</Button>
          </MobileCartActions>
        </MobileCartViewWrapper>
      )}
      <DialogOverlay
        legacyMaxWidth
        width='45%'
        open={isCartModal}
        onClose={() => setisCartModal(false)}
        finalFocus={() => cartOpenerRef.current ?? productsRef.current ?? true}
      >
        <BusinessCartContent isModal>
          <ModalHeading as={Title} style={{ textAlign: 'center', marginTop: themeSpace(theme, 'xs') }}>{t('YOUR_CART', 'Your cart')}</ModalHeading>
          {currentCart?.products?.length > 0
            ? (
              <>
                {/* how and when */}
                <OrderContextUI isCart />
                <Cart
                  isStore
                  isCustomMode
                  isForceOpenCart
                  forceHideCheckoutButton
                  showUpsellingInBusinessInfo
                  showDiscountInCart
                  cart={currentCart}
                  freeDeliveryProgress={freeDeliveryProgress}
                  isCartPending={currentCart?.status === 2}
                  isProducts={currentCart.products.length}
                  isCartOnProductsList={isCartOnProductsList}
                  handleCartOpen={(val) => setIsCartOpen(val)}
                  onClickCheckout={() => setisCartModal(false)}
                  businessConfigs={business?.configs}
                  productLoading={productLoading}
                />
              </>
              )
            : (
              <EmptyCart>
                <div className='empty-content'>
                  {/* the image and box of the empty states (empty.not_found) */}
                  <EmptyStateArt>
                    <EmptyStateIcon name='bag' />
                  </EmptyStateArt>
                  <p>{t('ADD_PRODUCTS_IN_YOUR_CART', 'Add products in your cart')}</p>
                </div>
                <EmptyBtnWrapper>
                  <span>{parsePrice(0)}</span>
                  <EmptyCartMessage role='status'>{t('EMPTY_CART', 'Empty cart')}</EmptyCartMessage>
                </EmptyBtnWrapper>
              </EmptyCart>
              )}
        </BusinessCartContent>
      </DialogOverlay>
      {!!business?.id && openProduct && (
        <ProductModal
          dataDocSection='product-customization-dialog'
          // a kiosk's 80% of the screen, up to the theme's width
          width={props.useKioskApp ? `min(80%, ${productModalWidth})` : productModalWidth}
          open={openProduct}
          contentRef={productContentRef}
          onClose={() => closeModalProductForm()}
        >

          {productModal.loading && !productModal.error && !productModal.product && (
            <ProductLoading>
              <SkeletonItem>
                <Skeleton height={45} count={props.useKioskApp ? 12 : 8} />
              </SkeletonItem>
            </ProductLoading>
          )}

          {productModal.error && productModal.error.length > 0 && (
            <NotFoundSource
              icon='shop'
              content={productModal.error[0]?.message || productModal.error[0]}
            />
          )}
          {isInitialRender && !productModal.loading && !productModal.error && !productModal.product && notFound && (
            <NotFoundSource
              icon='shop'
              content={t('ERROR_GET_PRODUCT', 'Sorry, we couldn\'t find the requested product.')}
            />
          )}
          {shownProduct && (
            <>
              {(shownProduct?.type === 'service' && business?.professionals?.length > 0)
                ? (
                  <ServiceForm
                    businessSlug={business?.slug}
                    useKioskApp={props.useKioskApp}
                    product={shownProduct}
                    businessId={business?.id}
                    onSave={handlerProductAction}
                    professionalList={business?.professionals}
                    businessTimezone={business?.timezone}
                    professionalSelected={professionalSelected}
                    handleChangeProfessional={handleChangeProfessionalSelected}
                    handleUpdateProfessionals={handleUpdateProfessionals}
                    productAddedToCartLength={currentCart?.products?.reduce((productsLength, Cproduct) => { return productsLength + (Cproduct?.id === shownProduct?.id ? Cproduct?.quantity : 0) }, 0) || 0}
                    setProductLoading={setProductLoading}
                  />
                  )
                : (
                  <ProductForm
                    // closed + unscheduled vs. scheduled/open is the only
                    // transition that needs a fresh mount: a
                    // lazy product's own fetch only runs once, on mount, so
                    // it must remount to pick up the newly valid moment;
                    // other moment changes (while already active) must not
                    // remount and lose the user's in-progress selections
                    key={`${shownProduct?.id}:${pendingSchedule || requiresSchedule(shownProduct) ? 'pending' : 'ready'}`}
                    businessSlug={business?.slug}
                    useKioskApp={props.useKioskApp}
                    product={shownProduct}
                    businessId={business?.id}
                    business={business}
                    categoryId={shownProduct?.category_id ?? categoryId}
                    productId={shownProduct?.id}
                    handleUpdateProducts={handleUpdateProducts}
                    onSave={handlerProductAction}
                    isCustomerMode={isCustomerMode}
                    productAddedToCartLength={currentCart?.products?.reduce((productsLength, Cproduct) => { return productsLength + (Cproduct?.id === shownProduct?.id ? Cproduct?.quantity : 0) }, 0) || 0}
                    setProductLoading={setProductLoading}
                    showMenuWhenClosed={props.showMenuWhenClosed}
                    onRequestSchedule={isPreorderEnabled ? () => requestProductSchedule(shownProduct) : undefined}
                    // Keep the form read-only until the fresh product arrives.
                    schedulePending={!!pendingSchedule}
                  />
                  )}
            </>
          )}
          {pendingSchedule && (
            <OrderMomentDraft onConfirm={handlePreorderConfirmed} waiting={waitingForScheduledMenu}>
              {(confirm, busy) => (
                <DialogOverlay
                  data-doc-section='business-preorder-dialog'
                  open
                  size={isCustomerMode ? 'lg' : 'xl'}
                  onClose={busy ? undefined : handlePreorderDismissed}
                  showCloseButton={!busy}
                  finalFocus={focusProductAfterScheduling}
                >
                  <BusinessPreorder business={business} showButton handleClick={confirm} isDisabled={busy} />
                </DialogOverlay>
              )}
            </OrderMomentDraft>
          )}
        </ProductModal>
      )}
      {isPreOrder && !pendingSchedule && (
        <OrderMomentDraft onConfirm={closePreOrder}>
          {(confirm, busy) => (
            <DialogOverlay
              data-doc-section='business-preorder-dialog'
              open={isPreOrder}
              size={isCustomerMode ? 'lg' : 'xl'}
              onClose={busy ? undefined : closePreOrder}
              showCloseButton={!busy}
              // Choosing a moment can remount the opener. Resolve the current entry during Dialog's focus cleanup.
              finalFocus={() => productsRef.current?.querySelector("[data-doc-control='business-preorder-entry']") ?? true}
            >
              {isCustomerMode
                ? <MomentContent onClose={confirm} />
                : <BusinessPreorder business={business} showButton buttonText={t('SAVE', 'Save')} handleClick={confirm} isDisabled={busy} />}
            </DialogOverlay>
          )}
        </OrderMomentDraft>
      )}
      <Alert
        title={t('ERROR', 'Error')}
        open={alertState?.open}
        content={alertState?.content || t('NOT_AVAILABLE_PRODUCTS', 'These products are not available.')}
        onClose={() => setAlertState({ open: false, content: [] })}
        onAccept={() => setAlertState({ open: false, content: [] })}
      />
      {currentCart?.products && openUpselling && (
        <UpsellingPage
          businessId={currentCart?.business_id}
          business={currentCart?.business}
          cartProducts={currentCart?.products}
          handleUpsellingPage={handleUpsellingPage}
          openUpselling={openUpselling}
          canOpenUpselling={canOpenUpselling}
          setCanOpenUpselling={setCanOpenUpselling}
        />
      )}
    </>
  )
}

/**
 * implementation noteson a single-store site or a store opened directly by link
 * (entry store), decides pickup BEFORE the controller's first business
 * request, so it only ever requests the business once (with the final
 * type) instead of once with the default type and again once implementation notes
 * (the effect in BusinessProductsListingUI above) forces pickup after the
 * business has already loaded.
 *
 * App.js's own boot gate (src/App.js, around its `loaded` effect) decides
 * this earlier still, before the Header/address UI paints — this gate is
 * the fallback for whatever App.js's own check can't tell yet from the URL
 * alone (a marketplace entry store, resolved only once this component
 * knows which business it is). `bootPickupStart` (src/utils/singleStore.js)
 * is the decision both share, so only one of them ever forces it.
 *
 * The controller (`~components/components/BusinessAndProductList`) only
 * holds its request via `isExternalLoading` when its OWN `avoidBusinessLoading`
 * path is off (this app's page always turns it on) — so this gate also
 * borrows `avoidBusinessLoading` for the short window it needs: off while
 * deciding ('pending') and for the one commit that releases the held
 * request with the final type ('open'), back to the caller's own value
 * once that request has fired ('released', the rest of this page's life).
 *
 * shortcut: while 'pending'/'open', a second order-option change landing
 * before the business loads won't be deferred/deduped against an in-flight
 * request the way `avoidBusinessLoading` normally does (same exposure the
 * admin dashboard's own permanent use of the other path already has) —
 * upgrade (add a 'released'-only extra state) if that ever double-fires.
 */
const useBusinessListingPickupGate = (props, theme) => {
  const [{ configs, loading: configLoading }] = useConfig()
  const [orderState, { changeType }] = useOrder()
  const [{ site }] = useSite()
  // never-hang backstop for the force below, same as App.js's own boot gate:
  // settles once changeType(2) resolves/rejects even without landing, and a
  // 4s fallback in case it never settles at all
  const [pickupForceSettled, setPickupForceSettled] = useState(false)
  const [pickupForceTimedOut, setPickupForceTimedOut] = useState(false)
  const pickupForceTimeoutRef = useRef(null)

  const [gate, setGate] = useState(() => {
    if (!(singleStoreSlug(theme, settings) || isEntryStore(site, props.slug, { fullWebsite: isFullWebsite(theme) }))) return 'released'
    if (!storePickupStartTaken()) return 'pending'
    // someone else (e.g. App.js's boot gate) already took the latch this
    // page load: wait for its forced type to land instead of redeciding
    return storePickupLanding(orderState.options?.type) ? 'pending' : 'released'
  })

  useEffect(() => {
    if (gate !== 'pending') return
    if (orderState.loading || configLoading) return
    if (storePickupStartTaken()) {
      // still waiting on it, unless it settled (or our own fallback timed
      // out) without ever landing — then give up instead of hanging
      const pickupRelease = bootPickupRelease({
        landing: storePickupLanding(orderState.options?.type),
        settled: pickupForceSettled,
        timedOut: pickupForceTimedOut
      })
      if (!pickupRelease.release) return
      if (pickupRelease.giveUp) takeStorePickupForcedFrom()
      setGate('open')
      return
    }
    const configTypes = configs?.order_types_allowed?.value?.split('|').map(value => Number(value)) || []
    const decision = bootPickupStart({
      singleStore: !!singleStoreSlug(theme, settings),
      entry: isEntryStore(site, props.slug, { fullWebsite: isFullWebsite(theme) }),
      configTypes,
      options: orderState.options,
      carts: orderState.carts,
      slug: props.slug
    })
    if (decision.action !== 'force') {
      setGate('open')
      return
    }
    // opens the gate itself once options.type === 2 lands (deps below), not
    // here — the controller's own orderOptions effect copies that same type
    // change in this commit, so both land together and the held request
    // fires only once; settled/timedOut are read fresh above, never from a
    // stale closure inside .finally
    changeType(2)?.finally?.(() => setPickupForceSettled(true))?.catch?.(() => {})
    pickupForceTimeoutRef.current = setTimeout(() => setPickupForceTimedOut(true), 4000)
  }, [gate, orderState.loading, configLoading, configs?.order_types_allowed?.value, orderState.options?.type, pickupForceSettled, pickupForceTimedOut])

  useEffect(() => {
    if (gate === 'open') setGate('released')
  }, [gate])

  // clears the fallback timeout once the gate opened (normally or by
  // giving up above), or the component unmounts
  useEffect(() => {
    if (gate !== 'pending') clearTimeout(pickupForceTimeoutRef.current)
  }, [gate])
  useEffect(() => () => clearTimeout(pickupForceTimeoutRef.current), [])

  return {
    isExternalLoading: gate === 'pending' ? true : props.isExternalLoading,
    avoidBusinessLoading: gate === 'released' ? props.avoidBusinessLoading : false
  }
}

export const BusinessProductsListing = (props) => {
  const [isInitialRender, setIsInitialRender] = useState(false)
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const theme = useTheme()
  const pickupGate = useBusinessListingPickupGate(props, theme)
  const onFavoriteError = () => showToast(ToastType.Error, t('NETWORK_ERROR', 'Network error, please reload the page'))

  const businessProductslistingProps = {
    ...props,
    onFavoriteError,
    scopeProductToRoute: true,
    trackBusinessMenuMoment: true,
    UIComponent: BusinessProductsListingUI,
    isInitialRender,
    handleUpdateInitialRender: (val) => setIsInitialRender(val),
    isFetchAllProducts: true,
    isExternalLoading: pickupGate.isExternalLoading,
    avoidBusinessLoading: pickupGate.avoidBusinessLoading
  }

  return (
    <BusinessAndProductList {...businessProductslistingProps} />
  )
}
