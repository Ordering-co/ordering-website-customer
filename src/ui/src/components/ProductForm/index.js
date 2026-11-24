import React, { useState, useEffect, useRef, useMemo, useId } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { nanoid } from 'nanoid'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { useTheme } from 'styled-components'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Thumbs } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'

import {
  ProductContainer,
  ProductMain,
  WrapperImage,
  SwiperWrapper,
  ProductInfo,
  ProductEdition,
  SectionTitle,
  ProductActions,
  ProductComment,
  ProductNameRow,
  SkeletonBlock,
  WrapperSubOption,
  SkuContent,
  ProductFormTitle,
  WrapperIngredients,
  Divider,
  ProductShareWrapper,
  ProductName,
  Properties,
  ProductMeta,
  EstimatedPersons,
  ProductDescription,
  PriceContent,
  WeightUnitSwitch,
  WeightUnitSlot,
  ProductTagsListContainer,
  ProductTagWrapper,
  VideoGalleryWrapper,
  TitleWrapper,
  GuestUserLink,
  LoadingWrapper,
  ProductNavigation,
  ProductGalleryArrow,
  galleryArrowOptions,
  ClosedNotice,
  ScheduleForLater,
  AddActionSlot,
  ScheduleHint,
  NavigationChips,
  NavigationCount,
  NavigationSentinel,
  AddAction,
  MissingChoices,
  AddButtonContent,
  AddButtonLabel,
  AddButtonTotal,
  StepsBar,
  StepsBarInfo,
  StepsBarThumb,
  StepsBarText
} from './styles'

import { ProductForm as ProductOptions } from '~components/components/ProductForm'
import { useSession } from '~components/contexts/SessionContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { ToastType, useToast } from '~components/contexts/ToastContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useSite } from '~components/contexts/SiteContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { shouldRequireOrderAddress } from '~components/utils/orderTypeAddress'
import { useSelectedStudent } from '~components/hooks/useSelectedStudent'
import { isGuestCheckoutAllowed } from '~/utils/guestCheckout'
import { isGuestStore, unaddressedTypesFor } from '~/utils/singleStore'
import { isFullWebsite, singleStoreSlug } from '~/utils/siteSettings'
import settings from '../../../../config'

import { StudentOnboardingPopup } from '~ui/src/components/StudentOnboardingPopup'
import { Button as BaseButton } from '~ui/src/design-system/components/Button'
import { Textarea } from '~ui/src/design-system/components/Textarea'
import { Tabs, TabsIndicator, TabsList, TabsTrigger, slotTabsOptions } from '~ui/src/design-system/components/Tabs'
import { Icon as BaseIcon } from '~ui/src/design-system/components/Icon'
import { getThemeCss } from '~/utils/themeCss'
import { LinkableText } from '~ui/src/components/LinkableText'
import { ProductIngredient } from '~ui/src/components/ProductIngredient'
import { ProductOption } from '~ui/src/components/ProductOption'
import { ProductStepGroup } from '~ui/src/components/ProductOption/StepGroup'
import { errorPulseMs } from '~ui/src/components/ProductOption/styles'
import { restartErrorPulse } from './errorPulse'
import { useProductActionsScroll } from './useProductActionsScroll'
import { ProductNavigationScroll } from './ProductNavigationScroll'
import { useCardNavigationVisibility } from './useCardNavigationVisibility'
import { ProductAlert, ProductDialog } from './ProductDialogs'
import { missingChoicesMode, productModalLayout, PRODUCT_NAME_ID } from './productModalSettings'
import { ProductOptionSubOption } from '~ui/src/components/ProductOptionSubOption'
// from its own file: the sub-option module is mocked whole by the tests of the form
import { SubOptionRadioGroup } from '~ui/src/components/ProductOptionSubOption/SubOptionRadioGroup'
import { ProductShare } from '~ui/src/components/ProductShare'
import { LoginForm } from '~ui/src/components/LoginForm'
import { SignUpForm } from '~ui/src/components/SignUpForm'
import { ForgotPasswordForm } from '~ui/src/components/ForgotPasswordForm'
import { AddressList } from '~ui/src/components/AddressList'
import { AddressForm } from '~ui/src/components/AddressForm'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'

import { Stepper, StepperInput } from '~ui/src/design-system/components/Stepper'
import { FallbackImage } from '~ui/src/styles/FallbackImage'

import { Chip } from '~ui/src/design-system/components/Chip'
import { motionMs, scrollBehavior, swiperSpeed } from '~/utils/themeMotion'
import { isSingleChoice, optionMaximumText, optionNestingLevels, optionSelectionCount, shownOptionError } from '~/utils/productOptionTheme'
import { slotButtonOptions, slotSize, themeSlot } from '~/utils/themeGroups'
import { themeImage, themeValue } from '~/utils/themeTokens'
import { themeHidden, themeVisible } from '~/utils/themeVisibility'
import { activeSection, containerTop, isPageScroll, scrollParent, stickyTopBottom } from '~/utils/scrollContainer'
import { closedStatusLabel, productRequiresSchedule } from '~/utils/businessTime'

dayjs.extend(utc)

// how long the option navigation keeps the tab clicked active
// once its scroll stops sending events (the scroll-spy then takes over)
const NAVIGATION_SETTLE_MS = 150

// the arrows that choose through the radios of a single-choice group (the options' radiogroup)
const RADIO_ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

// the halves of a pizza: the keys of the halves' control (ProductOptionSubOption)
const HALF_LABELS = { left: ['LEFT_HALF', 'Left half'], whole: ['WHOLE', 'Whole'], right: ['RIGHT_HALF', 'Right half'] }

const ProductOptionsUI = (props) => {
  props = { ...defaultProps, ...props }
  const {
    businessSlug,
    business,
    editMode,
    isSoldOut,
    productObject,
    productCart,
    increment,
    decrement,
    handleChangeProductCartQuantity,
    showOption,
    maxProductQuantity,
    errors,
    handleSave,
    handleChangeIngredientState,
    handleChangeSuboptionState,
    handleChangeCommentState,
    productAddedToCartLength,
    pizzaState,
    handleFavoriteProduct,
    handleCreateGuestUser,
    actionStatus,
    isCustomerMode,
    onRequestSchedule,
    schedulePending
  } = props

  const { product, loading, error } = productObject

  const [{ auth, user }, { login }] = useSession()
  const [, t] = useLanguage()
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [orderState, { updateOrderOptions, ensureGuestDeliveryAddress } = {}] = useOrder()
  const [{ optimizeImage, parsePrice, is12Hours }] = useUtils()
  const theme = useTheme()
  const [{ site }] = useSite()
  const productUrlTemplate = site?.product_url_template
  const [urlToShare, setUrlToShare] = useState(null)
  const [modalPageToShow, setModalPageToShow] = useState('login')
  const [tabValue, setTabValue] = useState('all')
  const productContainerRef = useRef(null)
  const productInfoRef = useRef(null)
  const productActionsRef = useRef(null)
  const commentId = useId()
  const [commentExpanded, setCommentExpanded] = useState(false)
  const [gallery, setGallery] = useState([])
  const [videoGallery, setVideoGallery] = useState(null)
  const [thumbsSwiper, setThumbsSwiper] = useState(null)
  const [isHaveWeight, setIsHaveWeight] = useState(false)
  const [isScrollAvailable, setIsScrollAvailable] = useState(false)
  // whether the last thing the customer did was an arrow inside a radiogroup (see the effect on `errors`)
  const arrowChoice = useRef(false)
  const [qtyBy, setQtyBy] = useState({
    weight_unit: false,
    pieces: true
  })
  const [pricePerWeightUnit, setPricePerWeightUnit] = useState(null)
  const [alertState, setAlertState] = useState({ open: false, title: '', content: [] })
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const userCustomer = JSON.parse(window.localStorage.getItem('user-customer'))
  const galleryLength = gallery.length + (videoGallery?.length || 0)

  const [{ configs }] = useConfig()
  const unaddressedTypes = unaddressedTypesFor(configs, orderState)
  // implementation notesOne store, or entered directly on this store, lets a guest
  // add to cart and check out ignoring the guest checkout settings
  const guestStore = isGuestStore({ singleStore: !!singleStoreSlug(theme, settings), site, fullWebsite: isFullWebsite(theme), slug: business?.slug || businessSlug })
  const guestCheckoutEnabled = isGuestCheckoutAllowed(configs, orderState?.options?.type, { guestStore })
  const { studentId: selectedStudent } = useSelectedStudent(business?.slug || businessSlug)
  const [studentPickerOpen, setStudentPickerOpen] = useState(false)
  const isSchoolProduct = configs?.school_module_enabled?.value === '1' && business?.vertical === 'school'
  const needsStudent = isSchoolProduct && auth && !selectedStudent
  // the parts of the product the theme hides (visibility product.*)
  const hideProductDescription = themeHidden(theme, 'product.description')
  const hideProductDummyLogo = themeHidden(theme, 'product.dummy_image')
  const hideFavoriteIcon = themeHidden(theme, 'product.favorite')
  const hideShare = themeHidden(theme, 'product.share')
  const hideMeta = themeHidden(theme, 'product.meta')
  const hideTags = themeHidden(theme, 'product.tags')
  const hideInstructions = themeHidden(theme, 'product.instructions')
  // the total beside the quantity, off by default (visibility product.add_price)
  const hidePriceAddButton = themeHidden(theme, 'product.add_price')
  // the price before the offer (product.offer_price) and the ingredients to
  // take out (product.ingredients)
  const hideOfferPrice = themeHidden(theme, 'product.offer_price')
  const showIngredients = themeVisible(theme, 'product.ingredients')
  const hasNoAddress = shouldRequireOrderAddress(orderState?.options?.type, orderState?.options, unaddressedTypes)
  // the business is closed right now and there is still no valid scheduled
  // moment for it (or the product itself never supports one): the same
  // predicate the listing uses to decide whether to open this form at all
  // schedulePending keeps the form read-only until the listing
  // swaps in the fresh product for the confirmed moment.
  const closedReadOnly = !!schedulePending || productRequiresSchedule(business, product, orderState?.options?.moment)
  const canAddToCart = productCart && !isSoldOut && maxProductQuantity > 0 && !hasNoAddress && !needsStudent
  // the comment box, disabled the same way for any reason (closed, sold out,
  // no quantity left): implementation notes gives it the options' own subtle look
  // (ProductComment's $readOnly) instead of the theme's gray disabled input
  const commentDisabled = !(productCart && !isSoldOut && maxProductQuantity) || closedReadOnly
  // implementation notesclosed but otherwise addable — the footer shows one action
  // (schedule, or the closed label) instead of Add to cart / Login-SignUp
  const showScheduleAction = closedReadOnly && canAddToCart
  // the id the schedule button's visible hint is described by (useId: stable
  // across this component's own renders, unique across the page)
  const scheduleHintId = useId()
  // implementation notesa guest store adds straight to cart, no login/guest-link step
  const showGuestAddButton = !auth && guestStore && canAddToCart
  // the space between the gallery's thumbnails (product_modal.base.thumb_gap)
  const thumbGap = themeValue(theme, 'product_modal', 'base.thumb_gap')
  // the look of the main action (slots.add), of the login /
  // sold out action (slots.login) and the stepper's size (slots.quantity)
  // the modal's main action ($cta: full width on small screens when the theme
  // says so), add or log in to add
  // the add buttons are the base Button: the slot's size (lg without one), color and appearance (its shape is
  // not an add button's); full width of the column that AddAction sizes. With the price shown the label and the
  // total go to the two ends (`align='start'` gives AddButtonContent the button's width)
  const { shape: _addShape, ...addButtonOptions } = slotButtonOptions(theme, 'product_modal', 'add', { size: 'lg' })
  // the secondary actions (schedule, student, address, login / sold out) are base Buttons too: the add slot's look
  // (the login one's, outlined by default, for login and sold out)
  const { shape: _addActionShape, ...addActionOptions } = slotButtonOptions(theme, 'product_modal', 'add', { size: 'lg', color: 'primary' })
  const { shape: _loginActionShape, ...loginActionOptions } = slotButtonOptions(theme, 'product_modal', 'login', { size: 'lg', color: 'primary', appearance: 'outline' })
  const quantitySize = slotSize(theme, 'product_modal', 'quantity', 'lg')
  // the gallery's arrows are icon buttons of the theme (with a name, by
  // keyboard) handed to Swiper as its navigation, like the page banner's
  const gallerySwiper = useRef(null)
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0)
  const galleryPrevRef = useRef(null)
  const galleryNextRef = useRef(null)
  // (from 2 slides), unless the theme hides them (visibility
  // product.gallery_arrows): then the gallery moves by swiping or its thumbnails
  const showGalleryArrows = ((gallery?.length || 0) + (videoGallery?.length || 0)) > 1 &&
    themeVisible(theme, 'product.gallery_arrows')
  // the gallery's thumbnails (from 3 images), unless the theme hides them
  // (visibility product.gallery_thumbs)
  const showGalleryThumbs = galleryLength > 2 && themeVisible(theme, 'product.gallery_thumbs')
  const galleryNeedsKeyboard = galleryLength > 1 && !showGalleryArrows && !showGalleryThumbs
  const navigateGallery = (event) => {
    if (event.target !== gallerySwiper.current?.el || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    const forward = (event.key === 'ArrowRight') !== !!theme.rtl
    if (forward) gallerySwiper.current?.slideNext()
    else gallerySwiper.current?.slidePrev()
  }
  // what a gallery photo that fails to load shows: the theme's product
  // placeholder, unless it hides it (then nothing, never the broken image)
  const galleryFallback = hideProductDummyLogo ? null : themeImage(theme, 'placeholder.product')
  // the groups show their errors only after the first "Add"
  const [addAttempted, setAddAttempted] = useState(false)
  // the add a click of this customer started (it says "Adding to cart…"); a load
  // that comes from elsewhere is only "Loading"
  const [adding, setAdding] = useState(false)
  const savingProduct = useRef(false)
  useEffect(() => () => { savingProduct.current = false }, [])
  // how deep each option is nested (respect_to)
  const nestingLevels = useMemo(() => optionNestingLevels(product?.extras), [product?.extras])
  // the groups the form shows, in order (what the navigation lists and what
  // the add button tells the customer to choose)
  const optionSections = []
  if (product && !loading && !error) {
    ;[...(product.extras || [])].sort((a, b) => a.rank - b.rank).forEach(extra => {
      ;[...(extra?.options || [])].sort((a, b) => a.rank - b.rank).forEach(option => {
        if (!showOption(option)) return
        const required = option.min > 0
        const invalid = !!errors[`id:${option.id}`]
        // the choices made in the group: what its tab counts and, while invalid, what the limits are checked with
        const count = optionSelectionCount(option, productCart, pizzaState) || 0
        const missing = invalid && required && count < option.min
        const excessMaximum = invalid && !missing && option.max != null && count > option.max ? option.max : null
        optionSections.push({ id: `id_${option.id}`, optionId: option.id, label: option.name, required, missing, excessMaximum, count })
      })
    })
  }
  // the groups still to choose (the controller's errors, always computed),
  // and what the theme says to do about them (product_modal.base.missing_choices)
  const pendingSections = optionSections.filter(section => errors[`id:${section.optionId}`])
  const missingMode = missingChoicesMode(theme)
  const requiredPending = pendingSections.filter(section => section.missing)
  const guideMissing = missingMode === 'guide' && requiredPending.length > 0
  // the layout the theme chose (product_modal.base.layout), read for the one
  // that draws it (data-doc-layout)
  const modalLayout = productModalLayout(theme)
  const steps = modalLayout === 'steps'
  const showcase = modalLayout === 'showcase'
  const card = modalLayout === 'card'
  const photoFirst = showcase || card
  const hasImage = !!(product?.images || galleryFallback || product?.gallery?.some(item => item.file || item.video))
  const twoColumns = !!product && !error && hasImage && (showcase || modalLayout === 'sheet')
  const stickyActions = !!product && !loading && !error && themeValue(theme, 'product_modal', 'base.actions_sticky') !== false
  useProductActionsScroll(productInfoRef, productActionsRef, stickyActions, showcase && twoColumns)
  const tabNavigation = card || showcase
  const navigationSlot = themeSlot(theme, 'product_modal', 'navigation')
  const navigationSize = ['sm', 'md', 'lg'].includes(navigationSlot?.size) ? navigationSlot.size : 'md'
  const navigationSections = []
  if (!steps && themeVisible(theme, 'product.navigation') && product && !loading && !error) {
    if (showIngredients && product.ingredients?.length > 0) {
      navigationSections.push({ id: 'ingredients', label: t('INGREDIENTS', 'Ingredients') })
    }
    navigationSections.push(...optionSections)
  }
  const hasNavigation = navigationSections.length > 0
  const navigationSectionIds = navigationSections.map(section => section.id).join(' ')
  const cardNavigationVisible = useCardNavigationVisibility(
    productInfoRef, productActionsRef, card ? navigationSectionIds : '', stickyActions, optionSections.length >= 4
  )
  const showNavigation = hasNavigation && (!card || cardNavigationVisible)
  const navigationTabsRef = useRef(null)
  const navigationLock = useRef(null)

  // implementation notes, layout `steps`: the groups are an accordion with one open at a time
  // (the groups of options, then the ingredients and the instructions). They are the
  // navigation: the chips of the `sheet` layout are not drawn.
  const showStepsBar = steps && !!product && !error && hasImage
  // undefined: the customer has not touched the groups yet, the open one is the first
  // required still to choose (none when the store is closed or the product sold out:
  // they are read, not filled). Any change or toggle fixes the open group (pinSteps).
  const [openStep, setOpenStep] = useState()
  const openId = !steps
    ? null
    : openStep !== undefined
      ? openStep
      : (closedReadOnly || isSoldOut) ? null : (requiredPending[0]?.id ?? null)
  // read through a ref: the sub-options are memoized and call the handler of the render they last drew
  const openIdRef = useRef(null)
  openIdRef.current = openId
  const pinSteps = () => setOpenStep(current => current === undefined ? openIdRef.current : current)
  // what the open group's header should do once the layout settles: take the focus (after an
  // auto-advance), or the first error with its pulse (jump / guide)
  const [stepReq, setStepReq] = useState(null)
  const stepHeaders = useRef({})
  const stepsBarRef = useRef(null)
  const stepsImageRef = useRef(null)
  const [stepsCompact, setStepsCompact] = useState(false)

  const closeModal = () => {
    setModalIsOpen(false)
    setModalPageToShow('login')
  }

  const handleSuccessLogin = (user) => {
    if (user) {
      closeModal()
    }
  }

  const handleChangeFavorite = () => {
    if (auth) {
      handleFavoriteProduct && handleFavoriteProduct(product, !productCart?.favorite)
    } else {
      setModalPageToShow('login')
      setModalIsOpen(true)
    }
  }

  const SCROLL_TO_ERROR_OFFSET = 20

  // the pulse's timer of each group (restartErrorPulse), cleared on unmount
  const pulseTimers = useRef(new Map())
  useEffect(() => () => pulseTimers.current.forEach(clearTimeout), [])

  // what scrolls the form (the product modal's body, else
  // the nearest ancestor that scrolls, else the page)
  const formScrollContainer = () => scrollParent(productInfoRef.current || productContainerRef.current)

  const findSection = (id) => productContainerRef.current?.querySelector(`[id="${id}"]`) || null

  // the tab clicked stays active while its scroll runs
  const lockNavigation = () => {
    clearTimeout(navigationLock.current)
    navigationLock.current = setTimeout(() => { navigationLock.current = null }, NAVIGATION_SETTLE_MS)
  }

  // `pulse`: whether the group scrolled to pulses (an error it shows)
  const scrollToFirstError = ({ pulse = true, sectionId } = {}) => {
    const section = sectionId && findSection(sectionId)
    const errorElements = section ? [] : Array.from(productContainerRef.current?.querySelectorAll('.error') || [])
    const firstError = section || errorElements.reduce((best, el) => {
      const top = el.getBoundingClientRect().top
      return (!best || top < best.top) ? { el, top } : best
    }, null)?.el
    if (!firstError) return

    const container = formScrollContainer()
    if (!container) return

    let target = firstError
    while (target && target !== container && !(target.id && target.id.startsWith('id_'))) {
      target = target.parentElement
    }
    if (!target || target === container) target = firstError

    const containerY = containerTop(container)
    const targetRect = target.getBoundingClientRect()
    // below the option navigation too, when it shows
    const top = container.scrollTop + (targetRect.top - containerY) - SCROLL_TO_ERROR_OFFSET - stickyTopBottom(container)
    container.scrollTo({ top: Math.max(top, 0), behavior: scrollBehavior(theme) })

    if (pulse) restartErrorPulse(target, pulseTimers.current, errorPulseMs(theme))

    if (typeof target.focus === 'function') {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
      try { target.focus({ preventScroll: true }) } catch (_) { /* older browsers */ }
    }
  }

  // The first group still to choose, shown: with `sheet` the form scrolls to it; with `steps` it is
  // opened (the one that was open folds) and brought into view, with the pulse, once it has settled.
  const showFirstError = () => {
    const first = guideMissing ? requiredPending[0] : pendingSections[0]
    if (!steps || !first) return scrollToFirstError({ sectionId: first?.id })
    setOpenStep(first.id)
    setStepReq({ pulse: true, id: first.id })
  }

  const handleSaveProduct = ({ guestOrder } = {}) => {
    if (savingProduct.current) return
    if (hasNoAddress) {
      if (!auth) {
        setAddressModalOpen(true)
      }
      setAdding(false)
      return
    }
    const isErrors = Object.values(errors)?.length > 0
    if (!isErrors) {
      if (!handleSave) return setAdding(false)
      savingProduct.current = true
      setAdding(true)
      const save = async () => {
        const type = Number(guestOrder?.type ?? orderState.options?.type)
        const delivery = type === 1 || type === 7
        const addressSaved = delivery && !editMode && ensureGuestDeliveryAddress
          ? await ensureGuestDeliveryAddress({ retry: !guestOrder })
          : null
        if (!savingProduct.current) return
        if (addressSaved === false) {
          setAlertState({
            open: true,
            title: t('ERROR', 'Error'),
            content: [t('DELIVERY_ADDRESS_SAVE_FAILED', 'We couldn’t save your delivery address. Try again to add this item.')],
            retryAddress: true
          })
          return
        }
        // The delivery migration already sent the type and moment together
        // with the address. Pickup still needs the pre-login selection.
        if (guestOrder && addressSaved !== true) {
          const changes = {}
          if (guestOrder.type) changes.type = guestOrder.type
          if (guestOrder.moment) changes.moment = dayjs.utc(guestOrder.moment).unix()
          if (Object.keys(changes).length && await updateOrderOptions(changes) === false) return
        }
        if (savingProduct.current) await handleSave()
      }
      save()
        .catch((error) => console.error(error))
        .finally(() => {
          if (!savingProduct.current) return
          savingProduct.current = false
          setAdding(false)
        })
      return
    }
    setAdding(false)
    setAddAttempted(true)
    showFirstError()
  }

  // what keeps the add button from adding; a disabled one is not also busy (as the legacy one, disabled wins)
  const addDisabled = !!(closedReadOnly || !productCart?.quantity || productCart?.quantity === 0 || (product?.minimum_per_order && ((productCart?.quantity + productAddedToCartLength) < product?.minimum_per_order)) || (product?.maximum_per_order && ((productCart?.quantity + productAddedToCartLength) > product?.maximum_per_order)))

  // the label of an add button that loads: what this customer's click started, or a plain load.
  // With missing_choices `guide` it says which group to choose while one is missing (a click
  // takes the customer there, handleSaveProduct), else it is Add to cart / Update
  const addButtonLabel = (loading) => {
    if (loading) return adding && !editMode ? t('ADDING_TO_CART', 'Adding to cart…') : t('LOADING', 'Loading')
    if (guideMissing) return t('CHOOSE_GROUP', 'Choose _name_').replace('_name_', requiredPending[0].label)
    return editMode ? t('UPDATE', 'Update') : t('ADD_TO_CART', 'Add to cart')
  }

  // With the price shown (visibility product.add_price), the total can wrap below the label.
  const addButtonContent = (loading) => hidePriceAddButton
    ? addButtonLabel(loading)
    : (
      <AddButtonContent>
        <AddButtonLabel>{addButtonLabel(loading)}</AddButtonLabel>
        <AddButtonTotal>{Number.isFinite(productCart.total) ? parsePrice(productCart.total) : null}</AddButtonTotal>
      </AddButtonContent>
      )

  // Name the first required group above the action, including in guide mode.
  const missingChoicesText = () => {
    if (!requiredPending.length) return ''
    const [first, ...rest] = requiredPending
    return rest.length
      ? t('STILL_TO_CHOOSE_AND_MORE', 'Still to choose: _name_ and _count_ more').replace('_name_', first.label).replace('_count_', rest.length)
      : t('STILL_TO_CHOOSE', 'Still to choose: _name_').replace('_name_', first.label)
  }

  // a required group's chip: its choice made, or (after the first attempt to add) still missing.
  // Before that a pending group shows no status, as its own error: red from the first
  // moment would greet the customer with every required group flagged
  const chipStatus = (section) => {
    if (!section.required) return undefined
    if (!errors[`id:${section.optionId}`]) return 'complete'
    return addAttempted && section.missing ? 'missing' : undefined
  }

  const handleCustomModalClick = (e, { page }) => {
    e.preventDefault()
    setModalPageToShow(page)
  }

  const handleSuccessSignup = (user) => {
    login({
      user,
      token: user?.session?.access_token
    })
    closeModal()
  }

  // the group's own error highlight (scrollToFirstError's '.error' query);
  // implementation notes removed the 'soldout' class this used to add too (the gray
  // block WrapperSubOption.soldout painted) — sold out / read-only rows now
  // look normal apart from their own control and price (ProductOptionSubOption)
  const isError = (id) => errors[`id:${id}`] ? 'error' : ''

  const handleChangeTabValue = (value) => {
    // the section lands right under the bar; it takes the focus
    // (an in-page link), the tab clicked active while the scroll runs
    if (showNavigation) {
      const section = findSection(value)
      if (!section) return
      const container = formScrollContainer()
      const top = container.scrollTop + section.getBoundingClientRect().top - containerTop(container) - stickyTopBottom(container)
      setTabValue(value)
      lockNavigation()
      container.scrollTo({ top: Math.max(top, 0), behavior: scrollBehavior(theme) })
      if (!section.hasAttribute('tabindex')) section.setAttribute('tabindex', '-1')
      try { section.focus({ preventScroll: true }) } catch (_) { /* older browsers */ }
      return
    }
    if (document.getElementById(`${value}`)) {
      const extraHeight = 55
      const top = document.getElementById(`${value}`).offsetTop - extraHeight
      const scrollElement = formScrollContainer()

      scrollElement.scrollTo({
        top,
        behavior: scrollBehavior(theme)
      })
    }
  }

  const handleSwitchQtyUnit = (val) => {
    setQtyBy({ [val]: true, [!val]: false })
  }

  const getOverFlowImage = (url) => {
    const keys = url.split('/')
    const _videoId = keys[keys?.length - 1]
    const overFlowImg = 'http://img.youtube.com/vi/' + _videoId + '/0.jpg'
    return overFlowImg
  }

  const onChangeProductCartQuantity = (quantity) => {
    if (quantity > maxProductQuantity) {
      setAlertState({
        open: true,
        title: t('QUANTITY', 'Quantity'),
        content: [t('MAX_QUANTITY', 'The max quantity is _number_').replace('_number_', maxProductQuantity)]
      })
      return
    }
    handleChangeProductCartQuantity(quantity)
  }

  // The group that was open is a required one that a tap just completed (the sub-option says so:
  // it reached its limit): it folds and the next required one still to choose opens, else all stay
  // folded. The focus goes to that header, the control that held it is gone.
  const advanceStep = () => {
    const done = optionSections.find(section => section.id === openId)
    if (!done || !done.required || errors[`id:${done.optionId}`]) return
    const next = requiredPending.find(section => optionSections.indexOf(section) > optionSections.indexOf(done)) || requiredPending[0]
    setOpenStep(next ? next.id : null)
    setStepReq({ id: next ? next.id : done.id, focus: true })
  }

  const toggleStep = (id) => {
    setOpenStep(openId === id ? null : id)
    if (openId !== id) setStepReq({ id })
  }

  // The step's props: its folding is the accordion's, not the group's own
  const stepOf = (id, summary, extra) => ({
    open: openId === id,
    onToggle: () => toggleStep(id),
    headerRef: (el) => { stepHeaders.current[id] = el },
    summary,
    ...extra
  })

  // What a folded group says it holds: the sub-options chosen (with their quantity when
  // the group has one), the ingredients taken out, a note
  const optionSummary = (option) => {
    const chosen = productCart.options[`id:${option.id}`]?.suboptions || {}
    return [...(option.suboptions || [])]
      .sort((a, b) => a.rank - b.rank)
      .filter(suboption => chosen[`id:${suboption.id}`]?.selected !== false && chosen[`id:${suboption.id}`])
      .map(suboption => {
        const { quantity, position } = chosen[`id:${suboption.id}`]
        const name = option.allow_suboption_quantity && quantity > 1 ? `${suboption.name} ×${quantity}` : suboption.name
        // a pizza says which half (the same words as the halves' control)
        return option.with_half_option && HALF_LABELS[position] ? `${name} (${t(HALF_LABELS[position][0], HALF_LABELS[position][1])})` : name
      })
      .join(', ')
  }
  // The rows of an option's sub-options
  const renderSubOptions = (option) => option.suboptions.filter(suboptions => suboptions.enabled).sort((a, b) => a.rank - b.rank).map(suboption => {
    const currentState = productCart.options[`id:${option?.id}`]?.suboptions[`id:${suboption?.id}`] || {}
    const balance = productCart.options[`id:${option?.id}`]?.balance || 0
    return (
      <ProductOptionSubOption
        key={suboption?.id}
        onChange={(nextState, changedSuboption, changedOption) => {
          if (steps) pinSteps()
          // The controller rejects intermediate balances above max. An edited
          // line can have a saved balance above today's max. Let its owner
          // remove selected extras one at a time while keeping the real
          // option (and its save validation) intact.
          const removing = currentState.selected && !nextState.selected
          const overMax = editMode && changedOption.max != null &&
            optionSelectionCount(changedOption, productCart, pizzaState) > changedOption.max
          const updateOption = removing && overMax ? { ...changedOption, max: null } : changedOption
          return handleChangeSuboptionState(nextState, changedSuboption, updateOption)
        }}
        balance={balance}
        option={option}
        suboption={suboption}
        state={currentState}
        isSoldOut={isSoldOut}
        isReadOnly={closedReadOnly}
        scrollDown={scrollDown}
        setIsScrollAvailable={setIsScrollAvailable}
        pizzaState={pizzaState}
        productCart={productCart}
      />
    )
  })

  // the id of the sub-option chosen in a single-choice option (the radiogroup's value)
  const chosenSuboptionId = (option) => {
    const chosen = Object.entries(productCart.options[`id:${option.id}`]?.suboptions || {}).find(([, state]) => state?.selected)
    return chosen ? chosen[0].slice(3) : null
  }

  const removedIngredients = (product?.ingredients || []).filter(ingredient => productCart.ingredients[`id:${ingredient.id}`]?.selected === false)
  const ingredientsSummary = removedIngredients.length
    ? t('WITHOUT_INGREDIENTS', 'Without _list_').replace('_list_', removedIngredients.map(ingredient => ingredient.name).join(', '))
    : ''
  const instructionsSummary = productCart.comment?.trim() ? t('NOTE_ADDED', 'Note added') : ''

  const scrollDown = () => {
    if (!Object.values(errors)?.length) return
    // before the first "Add" the next group is reached, not flagged as an error
    scrollToFirstError({ pulse: addAttempted })
  }

  const handleUpdateGuest = () => {
    if (!guestCheckoutEnabled || actionStatus?.loading) return
    handleCreateGuestUser({ guest_token: nanoid() })
  }

  // implementation notesa guest on a guest store adds straight to cart (no "As
  // guest user" click): create the guest user first, then add the product
  // once `auth` turns true (the effect below). null = nothing pending;
  // otherwise the order type/moment picked before the guest existed
  //, still in OrderContext's local-only state.
  const addAfterGuestRef = useRef(null)

  const handleAddAsGuest = () => {
    if (actionStatus?.loading || addAfterGuestRef.current) return
    const isErrors = Object.values(errors)?.length > 0
    if (isErrors) {
      setAddAttempted(true)
      showFirstError()
      return
    }
    addAfterGuestRef.current = { type: orderState.options?.type, moment: orderState.options?.moment }
    setAdding(true)
    handleCreateGuestUser({ guest_token: nanoid() })
  }

  const handleSlideChange = () => {
    const videos = document.querySelectorAll('iframe, video')
    Array.prototype.forEach.call(videos, function (video) {
      if (video.tagName.toLowerCase() === 'video') {
        video.pause()
      } else {
        const src = video.src
        video.src = src
      }
    })
  }

  useEffect(() => {
    if (isScrollAvailable) {
      setIsScrollAvailable(false)
      // an arrow of the group's radios chose it: the keyboard walks the group, so the form neither takes the focus to
      // the next one nor folds this one (Tab moves on); a press, or a key on a checkbox, goes on as ever
      const byArrow = arrowChoice.current
      arrowChoice.current = false
      if (byArrow) return
      if (steps) advanceStep()
      else scrollDown()
    }
  }, [errors])

  // Use the logged-in controller props when the guest account is ready.
  useEffect(() => {
    if (!auth || !addAfterGuestRef.current) return
    const guestOrder = addAfterGuestRef.current
    addAfterGuestRef.current = null
    handleSaveProduct({ guestOrder })
  }, [auth])

  useEffect(() => {
    if (actionStatus?.error) setAdding(false)
    if (actionStatus?.error && addAfterGuestRef.current) {
      addAfterGuestRef.current = null
      setAlertState({ open: true, title: t('ERROR', 'Error'), content: [t('FAILED_TO_ADD_PRODUCT', 'Failed to add product')] })
    }
  }, [actionStatus?.error])

  // the scroll-spy of the option navigation, only while it
  // shows: the active tab is the section under the bar (once a frame)
  useEffect(() => {
    if (!showNavigation) return
    let container
    let scrollTarget
    let frame = null
    let pending = false
    const update = () => {
      pending = false
      const sections = navigationSectionIds.split(' ').map(findSection).filter(Boolean)
      const section = activeSection(container, sections, containerTop(container) + stickyTopBottom(container) + 1)
      if (section) setTabValue(section.id)
    }
    const handleScroll = () => {
      // the scroll of a tab clicked: that tab stays active until it stops
      if (navigationLock.current) {
        lockNavigation()
        return
      }
      if (pending) return
      pending = true
      frame = window.requestAnimationFrame(update)
    }
    const connectScroller = () => {
      container = formScrollContainer()
      const target = isPageScroll(container) ? window : container
      if (target === scrollTarget) return
      scrollTarget?.removeEventListener('scroll', handleScroll)
      if (pending) window.cancelAnimationFrame(frame)
      scrollTarget = target
      scrollTarget.addEventListener('scroll', handleScroll, { passive: true })
      update()
    }
    connectScroller()
    if (showcase) window.addEventListener('resize', connectScroller)
    return () => {
      scrollTarget?.removeEventListener('scroll', handleScroll)
      if (showcase) window.removeEventListener('resize', connectScroller)
      if (pending) window.cancelAnimationFrame(frame)
    }
  }, [showNavigation, navigationSectionIds, showcase, twoColumns])

  // the active tab comes into view in the bar (centered) when
  // it is cut or out of it
  useEffect(() => {
    const scroller = navigationTabsRef.current
    const tab = scroller?.querySelector('[aria-current="true"]')
    if (!showNavigation || !tab || typeof scroller.scrollTo !== 'function') return
    const box = scroller.getBoundingClientRect()
    const rect = tab.getBoundingClientRect()
    if (rect.left >= box.left && rect.right <= box.right) return
    scroller.scrollTo({
      left: scroller.scrollLeft + (rect.left - box.left) - (box.width - rect.width) / 2,
      behavior: scrollBehavior(theme)
    })
  }, [tabValue, showNavigation])

  useEffect(() => () => clearTimeout(navigationLock.current), [])

  // After a group opens by itself (auto-advance, jump to the one still to choose) and once the
  // folding has settled (the accordion's speed, 0 with reduced motion), the form brings it
  // into view under the compact bar. An advance moves the focus to the header; a jump shows
  // the first error as `sheet` does (pulse, focus on the group); a click on a header only
  // brings the group into view.
  useEffect(() => {
    if (!stepReq) return undefined
    const wait = setTimeout(() => {
      if (stepReq.pulse) return scrollToFirstError({ sectionId: stepReq.id })
      const container = formScrollContainer()
      const group = findSection(stepReq.id)
      if (stepReq.focus) stepHeaders.current[stepReq.id]?.focus({ preventScroll: true })
      if (!container || !group) return
      const line = containerTop(container) + stickyTopBottom(container)
      const rect = group.getBoundingClientRect()
      if (rect.top < line || rect.bottom > container.getBoundingClientRect().bottom) {
        container.scrollTo({ top: Math.max(container.scrollTop + rect.top - line, 0), behavior: scrollBehavior(theme) })
      }
    }, motionMs(theme, 'accordion'))
    return () => clearTimeout(wait)
  }, [stepReq])

  // the compact bar: solid once the image has gone by (the form scrolls under it)
  useEffect(() => {
    if (!showStepsBar) return undefined
    const container = formScrollContainer()
    const scrollTarget = isPageScroll(container) ? window : container
    const update = () => {
      const image = stepsImageRef.current
      const bar = stepsBarRef.current
      if (!image || !bar || !image.offsetHeight) return setStepsCompact(false)
      setStepsCompact(container.scrollTop >= image.offsetHeight - bar.offsetHeight)
    }
    scrollTarget.addEventListener('scroll', update, { passive: true })
    return () => scrollTarget.removeEventListener('scroll', update)
  }, [showStepsBar])

  useEffect(() => {
    const imageList = []
    const videoList = []
    const mainProductImage = product?.images || galleryFallback
    if (mainProductImage) imageList.push(mainProductImage)
    if (product?.gallery && product?.gallery?.length > 0) {
      for (const galleryItem of product?.gallery) {
        if (galleryItem?.file) {
          imageList.push(galleryItem?.file)
        }
        if (galleryItem?.video) {
          const _url = galleryItem?.video.split('/')
          let _videoId = _url[_url?.length - 1]
          if (_videoId.includes('watch')) {
            const __url = _videoId.split('=')[1]
            _videoId = __url
          }
          const embedURL = 'https://www.youtube.com/embed/' + _videoId
          videoList.push(embedURL)
        }
      }
    }
    setGallery(imageList)
    setVideoGallery(videoList)

    if (product?.weight && product?.weight_unit) {
      setIsHaveWeight(true)
      setPricePerWeightUnit(product?.price / product?.weight)
    }
  }, [product, galleryFallback])

  useEffect(() => {
    let _urlToShare = null
    const productSlug = product?.slug || product?.id
    const categorySlug = product?.category?.slug || product?.category_id
    const categoryId = product?.category_id
    const productId = product?.id
    if (productUrlTemplate === '/store/:business_slug/:category_slug/:product_slug') {
      _urlToShare = `${window.location.origin}/store/${businessSlug}/${categorySlug}/${productSlug}`
    }
    if (/\/store\/:category_slug\/:product_slug\?[a-zA-Z]+=:business_slug/.test(productUrlTemplate)) {
      const businessParameter = productUrlTemplate.replace('/store/:category_slug/:product_slug?', '').replace('=:business_slug', '')
      _urlToShare = `${window.location.origin}/store/${categorySlug}/${productSlug}?${businessParameter}=${businessSlug}`
    }
    if (/\/store\/:business_slug\?[a-zA-Z]+=:category_id&[a-zA-Z]+=:product_id/.test(productUrlTemplate)) {
      const ids = productUrlTemplate.split('?')[1].split('&')
      const categoryParameter = ids[0].replace('=:category_id', '')
      const productParameter = ids[1].replace('=:product_id', '')
      _urlToShare = `${window.location.origin}/store/${businessSlug}?${categoryParameter}=${categoryId}&${productParameter}=${productId}`
    }
    if (/\/:business_slug\/:category_slug\/:product_slug/.test(productUrlTemplate) && productUrlTemplate.indexOf('/store') !== 0) {
      _urlToShare = `${window.location.origin}/${businessSlug}/${categorySlug}/${productSlug}`
    }
    if (/\/:business_slug\?[a-zA-Z]+=:category_id&[a-zA-Z]+=:product_id/.test(productUrlTemplate) && productUrlTemplate.indexOf('/store') !== 0) {
      const ids = productUrlTemplate.split('?')[1].split('&')
      const categoryParameter = ids[0].replace('=:category_id', '')
      const productParameter = ids[1].replace('=:product_id', '')
      _urlToShare = `${window.location.origin}/${businessSlug}?${categoryParameter}=${categoryId}&${productParameter}=${productId}`
    }
    setUrlToShare(_urlToShare)
  }, [])

  // the action bar (price, quantity, add): after the product's info, a child
  // of the whole form, so its sticky bottom holds over all of it (inside the
  // info it could not rise above the info's top: under a tall gallery it
  // opened out of the dialog)
  const renderProductActions = () => {
    // the minimum / maximum to order, beside the quantity while the theme shows the price
    // block (visibility product.add_price: the total itself is in the add button)
    const inCart = productCart?.quantity + productAddedToCartLength
    const showQuantity = productCart && !isSoldOut && maxProductQuantity > 0
    const cartAction = !showScheduleAction && canAddToCart && (auth || showGuestAddButton)
    const minimumNote = !hidePriceAddButton && product?.minimum_per_order && inCart <= product?.minimum_per_order && productCart?.quantity !== 1
    const maximumNote = !hidePriceAddButton && product?.maximum_per_order && inCart >= product?.maximum_per_order
    return (
            <ProductActions ref={productActionsRef} data-doc-section='product-actions' center={!minimumNote && !maximumNote} $twoColumns={twoColumns} $showcase={showcase && twoColumns} $row={!(actionStatus?.loading && orderState.loading)}>
              {(actionStatus?.loading && orderState.loading)
                ? (
                <LoadingWrapper>
                  <Skeleton height={35} width={150} />
                </LoadingWrapper>
                  )
                : (
                <>
                  {cartAction && <MissingChoices role='status' aria-live='polite' $attempted={addAttempted} data-doc-section='product-missing-choices'>{missingChoicesText()}</MissingChoices>}
                  <div className='price-amount-block'>

                    {(minimumNote || maximumNote) && (
                      <div className='price'>
                        {minimumNote && <span>{t('MINIMUM_TO_ORDER', 'Minimum _number_ to order').replace('_number_', product?.minimum_per_order)}</span>}
                        {maximumNote && <span>{t('MAXIMUM_TO_ORDER', 'Max. _number_ to order').replace('_number_', product?.maximum_per_order)}</span>}
                      </div>
                    )}
                    {/* the quantity is a stepper (components.stepper) of the Add
                        button's size */}
                    {showQuantity && (
                      <div className='quantity-control'>
                        <Stepper
                          size={quantitySize}
                          onDecrement={decrement}
                          onIncrement={increment}
                          decrementDisabled={productCart.quantity === 1 || !productCart.quantity || isSoldOut || closedReadOnly || ((productCart?.quantity + productAddedToCartLength) <= product?.minimum_per_order)}
                          incrementDisabled={maxProductQuantity <= 0 || (productCart?.quantity + productAddedToCartLength) >= maxProductQuantity || ((productCart?.quantity + productAddedToCartLength) >= product?.maximum_per_order && product?.maximum_per_order) || isSoldOut || closedReadOnly}
                          decrementProps={{ 'data-doc-control': 'product-quantity-decrement' }}
                          incrementProps={{ 'data-doc-control': 'product-quantity-increment' }}
                        >
                          {qtyBy?.pieces && (
                            <StepperInput
                              data-doc-control='product-quantity'
                              aria-label={t('QUANTITY', 'Quantity')}
                              inputMode='numeric'
                              disabled={closedReadOnly}
                              value={productCart?.quantity || ''}
                              onChange={e => onChangeProductCartQuantity(parseInt(e.target.value))}
                              onKeyPress={(e) => {
                                if (!/^[0-9.]$/.test(e.key)) {
                                  e.preventDefault()
                                }
                              }}
                            />
                          )}
                          {qtyBy?.weight_unit && (
                            <StepperInput
                              readOnly
                              chars={7}
                              aria-label={t('QUANTITY', 'Quantity')}
                              disabled={closedReadOnly}
                              value={(productCart.quantity * product?.weight).toFixed(2)}
                            />
                          )}
                        </Stepper>
                        {isHaveWeight && (
                          // the unit is a pair of chips (components.chip)
                          <WeightUnitSwitch>
                            <WeightUnitSlot>
                              <Chip variant='compensated-contour' size='sm' selected={!!qtyBy?.pieces} disabled={closedReadOnly} onClick={() => handleSwitchQtyUnit('pieces')}>{t('PIECES', 'pcs')}</Chip>
                            </WeightUnitSlot>
                            <WeightUnitSlot>
                              <Chip variant='compensated-contour' size='sm' selected={!!qtyBy?.weight_unit} disabled={closedReadOnly} onClick={() => handleSwitchQtyUnit('weight_unit')}>{product?.weight_unit}</Chip>
                            </WeightUnitSlot>
                          </WeightUnitSwitch>
                        )}
                      </div>
                    )}
                  </div>

                  {/* implementation notesclosed but otherwise addable — one action
                      instead of Add to cart / Login-SignUp: schedule (with
                      preorder), else the closed label, disabled */}
                  {showScheduleAction && (
                    <ScheduleForLater>
                      <AddAction>
                        <BaseButton
                          type='button'
                          data-doc-control='product-schedule-for-later'
                          {...addActionOptions}
                          cta
                          fullWidth
                          disabled={!onRequestSchedule}
                          aria-describedby={onRequestSchedule ? scheduleHintId : undefined}
                          onClick={onRequestSchedule ? () => onRequestSchedule() : undefined}
                        >
                          {onRequestSchedule ? t('SCHEDULE_FOR_LATER', 'Schedule for later') : closedStatusLabel(business, t, { is12Hours })}
                        </BaseButton>
                      </AddAction>
                      {onRequestSchedule && (
                        <ScheduleHint id={scheduleHintId}>
                          {t('PRODUCT_CLOSED_SCHEDULE_HINT', 'The store is closed right now. Schedule your order for later to add it to your cart.')}
                        </ScheduleHint>
                      )}
                    </ScheduleForLater>
                  )}

                  {!showScheduleAction && canAddToCart && auth && (
                    <AddAction $priced={!hidePriceAddButton}>
                    <BaseButton
                      data-doc-control='add-product-to-cart'
                      className={(maxProductQuantity === 0 || Object.keys(errors).length > 0) ? 'disabled' : undefined}
                      {...addButtonOptions}
                      cta
                      fullWidth
                      layout={hidePriceAddButton ? undefined : 'multiline'}
                      align={hidePriceAddButton ? 'center' : 'start'}
                      onClick={() => handleSaveProduct()}
                      busy={(adding || orderState.loading) && !addDisabled}
                      disabled={addDisabled}
                    >
                      {addButtonContent(adding || orderState.loading)}
                    </BaseButton>
                    </AddAction>
                  )}

                  {/* implementation notesa guest on a guest store adds straight to
                      cart, same button, in place of Login / Sign Up */}
                  {!showScheduleAction && showGuestAddButton && (
                    <AddAction $priced={!hidePriceAddButton}>
                    <BaseButton
                      data-doc-control='add-product-to-cart'
                      className={(maxProductQuantity === 0 || Object.keys(errors).length > 0) ? 'disabled' : undefined}
                      {...addButtonOptions}
                      cta
                      fullWidth
                      layout={hidePriceAddButton ? undefined : 'multiline'}
                      align={hidePriceAddButton ? 'center' : 'start'}
                      onClick={() => handleAddAsGuest()}
                      busy={actionStatus?.loading && !addDisabled}
                      disabled={addDisabled}
                    >
                      {addButtonContent(actionStatus?.loading)}
                    </BaseButton>
                    </AddAction>
                  )}

                  {needsStudent && productCart && !isSoldOut && maxProductQuantity > 0 && !hasNoAddress && (
                    <AddActionSlot>
                      <BaseButton
                        {...addActionOptions}
                        cta
                        fullWidth
                        onClick={() => setStudentPickerOpen(true)}
                      >
                        {t('SCHOOL_SELECT_STUDENT', 'Select a student')}
                      </BaseButton>
                    </AddActionSlot>
                  )}
                  {isSchoolProduct && (
                    <StudentOnboardingPopup
                      business={business}
                      forceOpen={studentPickerOpen}
                      onForceClose={() => setStudentPickerOpen(false)}
                    />
                  )}

                  {hasNoAddress && (
                    orderState.loading
                      ? (
                      <AddActionSlot>
                        <BaseButton
                          {...addActionOptions}
                          cta
                          fullWidth
                          disabled
                        >
                          {t('LOADING', 'Loading')}
                        </BaseButton>
                      </AddActionSlot>
                        )
                      : auth
                        ? (
                        <AddressList
                          isModal
                          isProfile
                          userId={isNaN(userCustomer?.id) ? null : userCustomer?.id}
                          addressList={isNaN(userCustomer?.id) ? user.addresses : null}
                          isProductForm
                        />
                          )
                        : (
                        <AddActionSlot>
                          <BaseButton
                            {...addActionOptions}
                            cta
                            fullWidth
                            onClick={() => setAddressModalOpen(true)}
                          >
                            {t('ADD_ADDRESS', 'Add address')}
                          </BaseButton>
                        </AddActionSlot>
                          )
                  )}

                  {!showScheduleAction && !auth && guestCheckoutEnabled && !hasNoAddress && !actionStatus?.loading && !showGuestAddButton && (
                    <GuestUserLink onClick={handleUpdateGuest}>
                      {t('AS_GUEST_USER', 'As guest user')}
                    </GuestUserLink>
                  )}
                  {!showScheduleAction && (!auth || isSoldOut || maxProductQuantity <= 0) && !hasNoAddress && !showGuestAddButton && (
                    <AddActionSlot $soldout={!(productCart && !isSoldOut && maxProductQuantity > 0)}>
                      <BaseButton
                        {...loginActionOptions}
                        cta
                        fullWidth
                        disabled={isSoldOut || maxProductQuantity <= 0 || actionStatus?.loading}
                        onClick={() => setModalIsOpen(true)}
                      >
                        {actionStatus?.loading
                          ? t('LOADING', 'Loading...')
                          : (isSoldOut || maxProductQuantity <= 0 ? t('SOLD_OUT', 'Sold out') : t('LOGIN_SIGNUP', 'Login / Sign Up'))}
                      </BaseButton>
                    </AddActionSlot>
                  )}
                </>
                  )}
            </ProductActions>
    )
  }

  // The ingredients to take out: a section of the form under its title (`sheet`), a group of the
  // accordion with its own header (`steps`, after the options)
  const renderIngredients = () => {
    if (!showIngredients || !(product?.ingredients?.length > 0)) return null
    const list = (
      <WrapperIngredients>
        {product?.ingredients.map(ingredient => (
          <ProductIngredient
            key={ingredient?.id}
            ingredient={ingredient}
            state={productCart.ingredients[`id:${ingredient?.id}`] || {}}
            onChange={(...args) => { if (steps) pinSteps(); return handleChangeIngredientState(...args) }}
            isSoldOut={isSoldOut}
            isReadOnly={closedReadOnly}
          />
        ))}
      </WrapperIngredients>
    )
    return steps
      ? (
        <ProductStepGroup id='step_ingredients' name={t('INGREDIENTS', 'Ingredients')} step={stepOf('step_ingredients', ingredientsSummary)}>
          <div id='ingredients' data-doc-section='product-ingredients'>{list}</div>
        </ProductStepGroup>
        )
      : (
        <div id='ingredients' data-doc-section='product-ingredients'>
          <SectionTitle>{t('INGREDIENTS', 'Ingredients')}</SectionTitle>
          {list}
        </div>
        )
  }

  const renderInstructions = () => {
    if (product?.hide_special_instructions || hideInstructions) return null
    const label = t('ADDITIONAL_INSTRUCTIONS', 'Additional instructions')
    const disclosureDisabled = commentDisabled && !productCart.comment?.trim()
    const comment = (
      <ProductComment id={commentId} data-doc-section='product-instructions' hidden={!steps && !commentExpanded}>
        {/* TOKEN-GAP(implementation notes): Textarea has no height prop; use the product's existing comment_height. */}
        <Textarea
          aria-label={label}
          style={{ height: getThemeCss(theme, 'product_modal').base.comment_height }}
          placeholder={t('COMMENT', 'Comment')}
          defaultValue={productCart.comment}
          onChange={handleChangeCommentState}
          readOnly={commentDisabled}
          disabled={disclosureDisabled}
        />
      </ProductComment>
    )
    if (steps) {
      return (
        <ProductStepGroup id='step_instructions' name={label} step={stepOf('step_instructions', instructionsSummary, { disabled: disclosureDisabled })}>
          {comment}
        </ProductStepGroup>
      )
    }
    return (
      <div>
        <BaseButton
          type='button'
          appearance='ghost'
          color='neutral'
          align='start'
          fullWidth
          disabled={disclosureDisabled}
          aria-expanded={commentExpanded}
          aria-controls={commentId}
          onClick={() => setCommentExpanded(expanded => !expanded)}
        >
          <BaseIcon name={commentExpanded ? 'chevronDown' : theme.rtl ? 'chevronLeft' : 'chevronRight'} aria-hidden='true' />
          {label}
        </BaseButton>
        {comment}
      </div>
    )
  }

  const description = product?.description && !hideProductDescription && (
    <ProductDescription>
      <LinkableText text={product.description} />
    </ProductDescription>
  )

  const photoActions = product && !error && !props.useKioskApp && (
    <ProductShareWrapper $inline={!hasImage} $row={photoFirst}>
      {!isCustomerMode && !hideFavoriteIcon && (
        <BaseButton
          favorite='solid'
          layout='row'
          iconLine
          borderInset
          className='favorite'
          aria-label={t('FAVORITE', 'Favorite')}
          aria-pressed={!!productCart?.favorite}
          onClick={handleChangeFavorite}
          inert={steps && stepsCompact ? '' : undefined}
        >
          <BaseIcon name={productCart?.favorite ? 'heartFilled' : 'heartOutline'} />
        </BaseButton>
      )}
      {!hideShare && (
        <ProductShare
          inGallery={hasImage}
          defaultUrl={urlToShare}
          slug={businessSlug}
          categoryId={product?.category_id}
          productId={product?.id}
          product={product}
        />
      )}
    </ProductShareWrapper>
  )

  return (
    <ProductContainer
      data-doc-section='product-customization'
      data-doc-mode={editMode ? 'edit' : 'create'}
      data-doc-state={isSoldOut ? 'sold-out' : 'available'}
      data-doc-layout={modalLayout}
      className='product-container'
      $twoColumns={twoColumns}
      $showcase={showcase}
      $steps={steps}
      ref={productContainerRef}
      useKioskApp={props.useKioskApp}
      onKeyDownCapture={(e) => { arrowChoice.current = RADIO_ARROWS.includes(e.key) && !!e.target.closest?.('[role=radiogroup]') }}
      onPointerDownCapture={() => { arrowChoice.current = false }}
    >

      {showStepsBar && (
        <StepsBar ref={stepsBarRef} $compact={stepsCompact} data-sticky-top='' data-doc-section='product-steps-bar' data-compact={stepsCompact ? 'true' : 'false'}>
          <StepsBarInfo $on={stepsCompact} aria-hidden='true'>
            {gallery?.[0] && <StepsBarThumb src={gallery[0]} alt='' />}
            <StepsBarText>
              <span>{product?.name}</span>
              <span>{product?.price ? parsePrice(product.price) : ''}</span>
            </StepsBarText>
          </StepsBarInfo>
          {stepsCompact && !props.useKioskApp && !isCustomerMode && !hideFavoriteIcon && (
            <BaseButton
              favorite
              layout='row'
              iconLine
              borderInset
              className='favorite'
              aria-label={t('FAVORITE', 'Favorite')}
              aria-pressed={!!productCart?.favorite}
              onClick={handleChangeFavorite}
            >
              <BaseIcon name={productCart?.favorite ? 'heartFilled' : 'heartOutline'} />
            </BaseButton>
          )}
        </StepsBar>
      )}
      {product && hasImage && (
        <WrapperImage ref={stepsImageRef} $twoColumns={twoColumns} $photoFirst={photoFirst} data-doc-section='product-image' data-band-free=''>
          {/* Swiper owns sideways dragging. The steps panel also closes sideways, so it ignores a drag here
; the phone sheet closes downwards, an axis Swiper leaves alone: a drag down on the
              photo closes it too. */}
          <SwiperWrapper isSoldOut={isSoldOut} $twoColumns={twoColumns} $fullHeight={showcase} $photoFirst={photoFirst}
            onKeyDown={galleryNeedsKeyboard ? navigateGallery : undefined} data-base-ui-swipe-ignore={steps ? '' : undefined}
          >
            {photoActions}
            {(gallery.length > 0 || videoGallery?.length > 0) && (
              <Swiper
                // Swiper starts again when the arrows show up (the
                // gallery loads after the first render): it only takes its
                // navigation's elements when it starts
                key={showGalleryArrows ? 'gallery-arrows' : 'gallery'}
                speed={swiperSpeed(theme)}
                spaceBetween={10}
                navigation={showGalleryArrows && { prevEl: galleryPrevRef.current, nextEl: galleryNextRef.current }}
                onBeforeInit={(swiper) => {
                  // the arrows exist before Swiper starts: they are its navigation
                  if (showGalleryArrows && typeof swiper.params.navigation === 'object') {
                    swiper.params.navigation.prevEl = galleryPrevRef.current
                    swiper.params.navigation.nextEl = galleryNextRef.current
                  }
                }}
                modules={[Navigation, Thumbs]}
                watchOverflow
                observer
                observeParents
                parallax
                slidesPerView={1}
                thumbs={{ swiper: thumbsSwiper }} className='mySwiper2'
                {...(galleryNeedsKeyboard && {
                  role: 'region',
                  tabIndex: 0,
                  'aria-label': t('PHOTOS', 'Photos'),
                  'aria-keyshortcuts': 'ArrowLeft ArrowRight'
                })}
                onSwiper={(swiper) => {
                  gallerySwiper.current = swiper
                  setActiveGalleryIndex(swiper.activeIndex)
                }}
                onSlideChange={(swiper) => {
                  setActiveGalleryIndex(swiper.activeIndex)
                  handleSlideChange()
                }}
              >
                {gallery?.map((img, i) => (
                  <SwiperSlide key={i}>
                    {/* a photo that fails to load shows the theme's product
                        placeholder (images.dummies.product), never the broken image */}
                    <FallbackImage src={img} fallback={galleryFallback} alt='' className='active-img' />
                  </SwiperSlide>
                ))}
                {videoGallery && videoGallery?.length > 0 && (
                  <>
                    {videoGallery?.map((video, j) => (
                      <SwiperSlide key={`video-${j}`}>
                        <iframe title={t('PRODUCT_VIDEO', 'Product video')} style={{ border: 'none', width: '100%', height: '100%' }} src={video} />
                      </SwiperSlide>
                    ))}
                  </>
                )}
                {showGalleryArrows && (
                  <ProductGalleryArrow slot='container-end' $side='prev'>
                    <BaseButton ref={galleryPrevRef} {...galleryArrowOptions(theme)} shape='icon' type='button' aria-label={t('PREVIOUS', 'Previous')}>
                      <BaseIcon name={theme.rtl ? 'keyboardArrowRight' : 'keyboardArrowLeft'} aria-hidden='true' />
                    </BaseButton>
                  </ProductGalleryArrow>
                )}
                {showGalleryArrows && (
                  <ProductGalleryArrow slot='container-end' $side='next'>
                    <BaseButton ref={galleryNextRef} {...galleryArrowOptions(theme)} shape='icon' type='button' aria-label={t('NEXT', 'Next')}>
                      <BaseIcon name={theme.rtl ? 'keyboardArrowLeft' : 'keyboardArrowRight'} aria-hidden='true' />
                    </BaseButton>
                  </ProductGalleryArrow>
                )}
              </Swiper>
            )}
            {showGalleryThumbs && (
              <Swiper
                speed={swiperSpeed(theme)}
                onSwiper={setThumbsSwiper}
                spaceBetween={thumbGap}
                modules={[Navigation, Thumbs]}
                slidesPerView='auto'
                freeMode
                watchSlidesProgress
                className='product-thumb'
                watchOverflow
                observer
                observeParents
                parallax
              >
                {gallery?.map((img, i) => (
                  <SwiperSlide
                    key={i}
                    tag='button'
                    type='button'
                    aria-label={`${t('PRODUCT_IMAGE', 'Product image')} ${i + 1}`}
                    aria-current={activeGalleryIndex === i ? 'true' : undefined}
                    onFocus={() => thumbsSwiper?.slideTo(i, 0)}
                    onClick={() => gallerySwiper.current?.slideTo(i)}
                  >
                    <FallbackImage src={img} fallback={galleryFallback} alt='' />
                  </SwiperSlide>
                ))}
                {videoGallery && videoGallery?.length > 0 && (
                  <>
                    {videoGallery?.map((video, j) => (
                      <SwiperSlide
                        key={`video-${j}`}
                        tag='button'
                        type='button'
                        aria-label={`${t('PRODUCT_VIDEO', 'Product video')} ${j + 1}`}
                        aria-current={activeGalleryIndex === gallery.length + j ? 'true' : undefined}
                        onFocus={() => thumbsSwiper?.slideTo(gallery.length + j, 0)}
                        onClick={() => gallerySwiper.current?.slideTo(gallery.length + j)}
                      >
                        <VideoGalleryWrapper>
                          <img src={getOverFlowImage(video)} alt='' />
                          <BaseIcon name='playCircle' size='lg' />
                        </VideoGalleryWrapper>
                      </SwiperSlide>
                    ))}
                  </>
                )}
              </Swiper>
            )}
          </SwiperWrapper>
        </WrapperImage>
      )}
      {loading && !error && (
        <SkeletonBlock width={90} $twoColumns={twoColumns}>
          <Skeleton variant='rect' height={50} />
          <Skeleton variant='rect' height={50} />
          <Skeleton variant='rect' height={200} />
        </SkeletonBlock>
      )}
      {!loading && !error && product && (
        <ProductMain $twoColumns={twoColumns} $showcase={showcase} data-doc-section='product-main'>
          <ProductInfo ref={productInfoRef} noImage={!hasImage} $steps={steps}>
            <ProductFormTitle data-doc-section='product-details' $closeRoom={twoColumns} $photoFirst={photoFirst}>
              <ProductNameRow>
                <TitleWrapper>
                  <ProductName id={PRODUCT_NAME_ID}>
                    <span>{product?.name}</span>
                  </ProductName>
                </TitleWrapper>
                {!hasImage && photoActions}
              </ProductNameRow>
              {!photoFirst && description}
              <Properties>
                {isHaveWeight
                  ? <PriceContent>{parsePrice(pricePerWeightUnit)} / {product?.weight_unit}</PriceContent>
                  : <PriceContent>
                      <p>{product?.price ? parsePrice(product?.price) : ''}</p>
                      {product?.in_offer && !hideOfferPrice && (<span className='offer-price'>{product?.offer_price ? parsePrice(product?.offer_price) : ''}</span>)}
                    </PriceContent>}
                {!hideMeta && (
                <ProductMeta data-doc-section='product-meta'>
                  {product?.calories && (
                    <>
                      <span className='calories'>{product?.calories}{' '}cal</span>
                      <span>&nbsp;&#183;&nbsp;</span>
                    </>
                  )}
                  {product?.sku && product?.sku !== '-1' && product?.sku !== '1' && (
                    <SkuContent>
                      <span>{t('SKU', 'Sku')}&nbsp;</span>
                      <span>{product?.sku}</span>
                    </SkuContent>
                  )}
                  {product?.sku && product?.sku !== '-1' && product?.sku !== '1' && product?.estimated_person && (
                    <span>&nbsp;&#183;&nbsp;</span>
                  )}
                  {product?.estimated_person && (
                    <EstimatedPersons>
                      <span>{product?.estimated_person}&nbsp;</span>
                      <span>{t('ESTIMATED_PERSONS', 'persons')}</span>
                    </EstimatedPersons>
                  )}
                </ProductMeta>
                )}
              </Properties>
              {photoFirst && description}
            </ProductFormTitle>
            {closedReadOnly && (
              <ClosedNotice data-doc-section='product-closed-notice'>
                <span>{closedStatusLabel(business, t, { is12Hours })}</span>
              </ClosedNotice>
            )}
            {product?.tags?.length > 0 && !hideTags && (
              <ProductTagsListContainer data-doc-section='product-tags'>
                {product.tags.map(tag => (
                  <ProductTagWrapper key={tag.id}>
                    {(tag?.image || galleryFallback) && (
                      <img src={optimizeImage(tag?.image || galleryFallback, 'h_40,c_limit')} alt='' />
                    )}
                    <span>{tag.name}</span>
                  </ProductTagWrapper>
                ))}
              </ProductTagsListContainer>
            )}
            <Divider />
            <ProductEdition>
              {hasNavigation && tabNavigation && <NavigationSentinel aria-hidden='true' />}
              {hasNavigation && (
                <ProductNavigation
                  aria-label={t('PRODUCT_OPTIONS_NAVIGATION', 'Product options')}
                  aria-hidden={!showNavigation || undefined}
                  data-doc-section='product-navigation'
                  data-sticky-top={showNavigation ? '' : undefined}
                  $concealed={!showNavigation}
                  $tabs={tabNavigation}
                  $showcase={showcase && twoColumns}
                >
                  <ProductNavigationScroll
                    key={tabNavigation ? 'tabs' : 'chips'}
                    scrollRef={navigationTabsRef}
                    sectionIds={navigationSectionIds}
                    fade={tabNavigation}
                  >
                    {tabNavigation
                      ? (
                        <Tabs
                          group='product_modal'
                          {...slotTabsOptions(theme, 'product_modal', 'navigation', { size: 'md' })}
                          variant='underline'
                          layout='line'
                          value={navigationSections.some(section => section.id === tabValue) ? tabValue : navigationSections[0].id}
                        >
                          <TabsList activateOnFocus={false} ref={navigationTabsRef} inset='lg' aria-label={t('PRODUCT_OPTIONS_NAVIGATION', 'Product options')}>
                            {navigationSections.map(section => (
                              <TabsTrigger
                                key={section.id}
                                value={section.id}
                                onClick={() => handleChangeTabValue(section.id)}
                                data-doc-control='product-navigation-tab'
                                aria-current={tabValue === section.id ? 'true' : undefined}
                                aria-label={section.count > 0
                                  ? t('SECTION_SELECTED_COUNT', '_name_, _count_ selected').replace('_name_', section.label).replace('_count_', section.count)
                                  : undefined}
                              >
                                {section.label}
                                {section.count > 0 && <NavigationCount aria-hidden='true'>{section.count}</NavigationCount>}
                              </TabsTrigger>
                            ))}
                            <TabsIndicator />
                          </TabsList>
                        </Tabs>
                        )
                      : (
                        <NavigationChips ref={navigationTabsRef}>
                          {navigationSections.map(section => (
                            <Chip
                              key={section.id}
                              type='button'
                              size={navigationSize}
                              selected={tabValue === section.id}
                              status={chipStatus(section)}
                              // the chip says where the reader is (aria-current), it is not a toggle
                              aria-pressed={undefined}
                              aria-current={tabValue === section.id ? 'true' : undefined}
                              data-doc-control='product-navigation-tab'
                              onClick={() => handleChangeTabValue(section.id)}
                            >
                              {addAttempted && section.excessMaximum != null
                                ? `${section.label}, ${optionMaximumText(t, section.excessMaximum)}`
                                : section.label}
                            </Chip>
                          ))}
                        </NavigationChips>
                        )}
                  </ProductNavigationScroll>
                </ProductNavigation>
              )}
              {!steps && renderIngredients()}
              <div data-doc-section='product-options'>
                {
                  product?.extras?.sort((a, b) => a.rank - b.rank).map(extra => extra.options.sort((a, b) => a.rank - b.rank).map(option => {
                    const currentState = productCart.options[`id:${option?.id}`] || {}
                    const section = optionSections.find(section => section.optionId === option.id)
                    return (
                      <React.Fragment key={option?.id}>
                        {showOption(option) && (
                          <ProductOption
                            option={option}
                            currentState={currentState}
                            error={shownOptionError(theme, errors[`id:${option?.id}`], addAttempted)}
                            requiredInvalid={addAttempted && !!section?.missing}
                            nestingLevel={nestingLevels[option?.id] || 0}
                            step={steps
                              ? stepOf(`id_${option?.id}`, optionSummary(option), {
                                done: !errors[`id:${option?.id}`],
                                excessMaximum: section?.excessMaximum
                              })
                              : undefined}
                          >
                            {isSingleChoice(option)
                              ? (
                                <SubOptionRadioGroup
                                  aria-label={option.name}
                                  value={chosenSuboptionId(option)}
                                  render={<WrapperSubOption className={isError(option?.id)} />}
                                >
                                  {renderSubOptions(option)}
                                </SubOptionRadioGroup>
                                )
                              : <WrapperSubOption className={isError(option?.id)}>{renderSubOptions(option)}</WrapperSubOption>}
                          </ProductOption>)}
                      </React.Fragment>
                    )
                  }))
                }
              </div>
              {steps && renderIngredients()}
              {renderInstructions()}
            </ProductEdition>
          </ProductInfo>
          {renderProductActions()}
        </ProductMain>
      )}

      <ProductDialog
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        title={t('WHAT_IS_YOUR_ADDRESS', 'What\'s your address?')}
      >
        <AddressForm
          useValidationFileds
          createGuestOnSave={!auth}
          address={orderState?.options?.address || {}}
          onCancel={() => setAddressModalOpen(false)}
          onSaveAddress={() => setAddressModalOpen(false)}
        />
      </ProductDialog>

      <ProductDialog
        open={modalIsOpen && !auth}
        onClose={() => closeModal()}
        label={{ login: t('LOGIN', 'Login'), signup: t('SIGN_UP', 'Sign up'), forgotpassword: t('FORGOT_PASSWORD', 'Forgot password') }[modalPageToShow]}
        size='xl'
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
              useKioskApp={props.useKioskApp}
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
      </ProductDialog>

      {error && error.length > 0 && (
        <NotFoundSource
          icon='shop'
          content={error[0]?.message || error[0]}
        />
      )}
      <ProductAlert
        open={alertState.open}
        title={alertState.title}
        content={alertState.content}
        acceptText={alertState.retryAddress ? t('TRY_AGAIN', 'Please try again') : undefined}
        onAccept={alertState.retryAddress
          ? () => {
              setAlertState(state => ({ ...state, open: false }))
              handleSaveProduct()
            }
          : undefined}
        onClose={() => setAlertState(state => ({ ...state, open: false }))}
      />
    </ProductContainer>
  )
}

export const ProductForm = (props) => {
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  // a heart whose request fails to reach the API: the theme's notice, not the browser's «Failed to fetch»
  const onFavoriteError = () => showToast(ToastType.Error, t('NETWORK_ERROR', 'Network error, please reload the page'))
  const productOptionsProps = {
    ...props,
    onFavoriteError,
    productCart: {
      ...props.productCart,
      quantity: props.productCart?.code
        ? props.productCart?.quantity
        : props?.product?.minimum_per_order || 1
    },
    UIComponent: ProductOptionsUI
  }

  return (
    <ProductOptions {...productOptionsProps} />
  )
}

const defaultProps = {
  productAddedToCartLength: 0
}
