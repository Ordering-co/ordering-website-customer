import { CheckoutGuestButton, PaymentDisclosureButton } from '~ui/src/design-system/components/ButtonAppearances'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'
import parsePhoneNumber from 'libphonenumber-js'
import { CheckoutStudentDetails } from '../CheckoutStudentDetails'
import { doesSchoolCartNeedStudent, isSchoolCart as isSchoolCartCheck } from '../CheckoutStudentDetails/schoolCartStudent'
import { getUtils } from '../PaymentOptionWallet/utils'
import { RewardsBanner } from '../RewardsBanner'

import {
  Container,
  WrapperLeftContainer,
  UserDetailsContainer,
  BusinessDetailsContainer,
  PaymentMethodContainer,
  DriverTipContainer,
  CartContainer,
  WrapperPlaceOrderButton,
  WarningMessage,
  CartsList,
  WarningText,
  WrapperUserDetails,
  WrapperRightContainer,
  WrapperLeftContent,
  DeliveryOptionsContainer,
  WalletPaymentOptionContainer,
  SelectSpotContainer,
  ReservationContainer,
  WrapperActionsInput,
  MobileWrapperPlaceOrderButton,
  CheckoutBottomRoom,
  MobilePlaceOrderHint,
  OrderContextUIWrapper,
  HeaderContent,
  AuthButtonList,
  AuthButtonSlot,
  CardItemAction,
  Flag,
  RequiredFlag,
  SummaryAccordion,
  SummaryAccordionHeader,
  SummaryAccordionContent,
  CardItemContent,
  NoPaymentNeededMsg,
  CheckoutProgress,
  ProgressSegmentsTrack,
  ProgressSegment,
  GuestCheckoutLinks,
  GuestDetailsOptionalNote,
  MissingItemsHint,
  StepNumberCircle,
  StepCard,
  StepCardHeaderRow,
  StepCollapsedSummary,
  StepCardBody,
  ContextCard,
  DockedOrderContextRow,
  SummaryCard,
  StoreStrip,
  PaymentStepCard,
  SlowNotice,
  PlaceOrderErrorAlert
} from './styles'

import { Checkout as CheckoutController } from '~components/components/Checkout'
import { useOrder } from '~components/contexts/OrderContext'
import { useSession } from '~components/contexts/SessionContext'
import { useApi } from '~components/contexts/ApiContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { isWalletEnabled as isWalletConfigEnabled } from '~components/utils/configHelpers'
import { useConfig } from '~components/contexts/ConfigContext'
import { useCustomer } from '~components/contexts/CustomerContext'
import { useEvent } from '~components/contexts/EventContext'
import { useSite } from '~components/contexts/SiteContext'
import { useGuestCheckoutPermission } from '~ui/hooks/useGuestCheckoutPermission'
import { isGuestStore } from '~/utils/singleStore'
import { isFullWebsite, singleStoreSlug } from '~/utils/siteSettings'
import settings from '../../../../config'

import { OrderDetail } from './OrderDetail'
import { PendingCartNotice } from './PendingCartNotice'

import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { Button } from '~ui/src/design-system/components/Button'
import { Icon as BaseIcon } from '~ui/src/design-system/components/Icon'
import { Choice } from '~ui/src/design-system/components/Choice'
import { Input } from '~ui/src/design-system/components/Input'
import { ChevronIcon } from '~ui/src/styles/Chevron'
import { Alert, Confirm } from '~ui/src/components/Confirm'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { SignUpForm } from '~ui/src/components/SignUpForm'
import { LoginForm } from '~ui/src/components/LoginForm'
import { useAuthTriggerFocus } from './useAuthTriggerFocus'
import { UpsellingPage } from '~ui/src/components/UpsellingPage'
import { AddressDetails } from '~ui/src/components/AddressDetails'
import { UserDetails } from '~ui/src/components/UserDetails'
import { PaymentOptions } from '~ui/src/components/PaymentOptions'
import { PaymentOptionWallet } from '~ui/src/components/PaymentOptionWallet'
import { DriverTips } from '~ui/src/components/DriverTips'
import { Cart } from '~ui/src/components/Cart'
import { CartContent } from '~ui/src/components/CartContent'
import { PlaceSpot } from '~ui/src/components/PlaceSpot'
import { OrderContextUI } from '~ui/src/components/OrderContextUI'
import { dockOrderContextBar } from '~ui/src/components/Header/orderContextPlacement'
import { BusinessReservation } from '~ui/src/components/BusinessReservation'
import { capitalize } from '~ui/utils'
import { CardBrand } from '~ui/src/components/CardBrand'

import { themeHidden, themeVisible } from '~/utils/themeVisibility'
import { businessLogoPlaceholder, themeSpace } from '~/utils/themeTokens'
import { scrollBehavior } from '~/utils/themeMotion'
import { BOTTOM_NAV_DOCKED, bottomNavRoom } from '~ui/src/components/NavigationBar/styles'
import { CUSTOMER_DETAIL_FIELD_CODES, isCustomerDetailRequirement, normalizeCheckoutFieldsState } from '~ui/src/utils/checkoutFields'
import { usePageSections } from '~ui/hooks/usePageSections'
import { checkoutMapMarkerColor, checkoutRequiredVariant } from './checkoutTheme'
import { slotButtonOptions } from '~/utils/themeGroups'

const mapConfigs = {
  mapZoom: 16,
  mapSize: {
    width: 640,
    height: 190
  }
}

const deliveryTypes = [1, 7]
const pickupTypes = [2, 8]
const driverTipsTypes = [...deliveryTypes, ...pickupTypes]

const methodsWithRequiredCards = ['globalpay', 'braintree', 'cybersource']
// the checkout fields UserFormDetails draws as inputs
const USER_FORM_FIELD_CODES = CUSTOMER_DETAIL_FIELD_CODES
const methodsWithIframeCards = ['globalpay', 'braintree', 'cybersource']
// missingItems keys the customer's own details gaps keep today's
// branches for (the UserDetails modal, the signup gate…), excluded from the
// universal fixable-gap gate in placeOrder below
const CUSTOMER_DETAIL_ITEM_KEYS = ['customer_details', 'student']

// round 4: the order type label of the progress row's right
// side ("Pickup · ..."), the same keys OrderContextUI's own type select
// already uses (translated everywhere that one is)
const ORDER_TYPE_LABELS = {
  1: ['DELIVERY', 'Delivery'],
  2: ['PICKUP', 'Pickup'],
  3: ['EAT_IN', 'Eat in'],
  4: ['CURBSIDE', 'Curbside'],
  5: ['DRIVE_THRU', 'Drive thru'],
  7: ['CATERING_DELIVERY', 'Catering Delivery'],
  8: ['CATERING_PICKUP', 'Catering Pickup'],
  9: ['RESERVATION', 'Reservation']
}

// round 4: step 1's collapsed line ("Name Lastname · email ·
// phone"), passed to UserDetails as CollapsedSummaryComponent — a plain
// component (no closure over Checkout) so its identity does not change
// every render.
const CollapsedCustomerSummary = ({ userData }) => {
  const parts = [
    [userData?.name, userData?.middle_name, userData?.lastname, userData?.second_lastname].filter(Boolean).join(' ').trim(),
    userData?.guest_email || userData?.email,
    userData?.guest_cellphone || userData?.cellphone
  ].filter(Boolean)
  return <StepCollapsedSummary title={parts.join(' · ')}>{parts.join(' · ')}</StepCollapsedSummary>
}

const CheckoutUI = (props) => {
  const {
    cart,
    errors,
    placing,
    cartState,
    useKioskApp,
    loyaltyPlansState,
    businessDetails,
    retryBusinessDetails,
    paymethodSelected,
    handlePaymethodChange,
    handlerClickPlaceOrder,
    handleOrderRedirect,
    isCustomerMode,
    isResetPaymethod,
    setIsResetPaymethod,
    handleChangeDeliveryOption,
    instructionsOptions,
    deliveryOptionSelected,
    handleStoreRedirect,
    onPlaceOrderClick,
    setPlaceSpotNumber,
    placeSpotNumber,
    checkoutFieldsState: apiCheckoutFieldsState,
    retryCheckoutFields,
    returnUrl,
    globalPayIFrameUrl,
    braintreeIFrameUrl,
    cybersourceIFrameUrl,
    createBusinessUserPaymethod,
    deleteBusinessUserPaymethod,
    isPendingCartReleasable,
    releasingPendingCart,
    handleReleasePendingCart
  } = props
  // An order type's field left unset takes the project's
  const checkoutFieldsState = useMemo(() => normalizeCheckoutFieldsState(apiCheckoutFieldsState), [apiCheckoutFieldsState])

  const theme = useTheme()
  // the sections of /checkout, ordered and hidden by the theme (pages.checkout)
  const { sections, isVisible: isSectionVisible } = usePageSections('checkout')
  const [{ options, loading }, { confirmCart }] = useOrder()
  const [, t] = useLanguage()
  const [{ parsePrice, parseDate, preorderDateFormat, timeFormat }] = useUtils()
  const [{ user, loading: userLoading, token }, { login }] = useSession()
  const [ordering] = useApi()
  const [{ configs }] = useConfig()
  const [{ site }] = useSite()
  // One store, or entered directly on this cart's store, lets a
  // guest check out ignoring the guest checkout settings
  const guestStore = isGuestStore({ singleStore: !!singleStoreSlug(theme, settings), site, fullWebsite: isFullWebsite(theme), slug: cart?.business?.slug })
  const { guestCheckoutAllowed, guestOrderBlocked, canUseGuestCheckout, canPlaceOrder } = useGuestCheckoutPermission({
    configs,
    orderType: options?.type,
    user,
    guestStore
  })
  const [assignedStudentId, setAssignedStudentId] = useState(null)
  const isSchoolCart = businessDetails?.business?.vertical === 'school' || isSchoolCartCheck(cart)
  const schoolNeedsStudent = doesSchoolCartNeedStudent({
    isSchool: isSchoolCart,
    studentId: cart?.student_id ?? cart?.student?.id ?? assignedStudentId
  })
  const [customerState] = useCustomer()
  const [events] = useEvent()
  const { getIcon } = getUtils()

  const windowSize = useWindowSize()
  // until the header has all of it, the order context is a bar docked under
  // the header (orderContextPlacement)
  const dockOrderContext = dockOrderContextBar(windowSize?.width, theme, options?.type)

  // small screens: the place order bar fixed at the bottom (over the
  // navigation): its height, measured, so the page's end keeps only the room
  // it covers (CheckoutBottomRoom)
  const showMobilePlaceOrder = windowSize.width < 576 && !cartState.loading && !!cart && cart?.status !== 2
  const placeOrderBarRef = useRef(null)
  const paymentDisclosureRef = useRef(null)
  const paymentContentRef = useRef(null)
  const revealPaymentList = useRef(false)
  const returnToPaymentAfterDetails = useRef(false)
  const [placeOrderBarHeight, setPlaceOrderBarHeight] = useState(0)
  const placeOrderRoom = Math.max(0, Math.ceil(placeOrderBarHeight) - bottomNavRoom(theme))

  const [errorCash, setErrorCash] = useState(false)
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [isUserDetailsEdit, setIsUserDetailsEdit] = useState(null)
  const [behalfName, setBehalfName] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [openModal, setOpenModal] = useState({ login: false, signup: false, isGuest: false })
  const authFocus = useAuthTriggerFocus(!!(openModal.login || openModal.signup))
  const [cardList, setCardList] = useState([])
  const [paymethodClicked, setPaymethodClicked] = useState(null)
  // the method clicked in the list that is still being set up (a card to pick or add), reported by PaymentOptions
  const [openPaymethod, setOpenPaymethod] = useState(null)
  const [signupPaymethodId, setSignupPaymethodId] = useState(null)
  const [productLoading, setProductLoading] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(!cart?.paymethod_id)
  const [isPaymentReviewOpen, setIsPaymentReviewOpen] = useState(false)
  const isPaymentListOpen = isPaymentOpen || isPaymentReviewOpen
  const handlePaymentListOpenChange = (open) => {
    setIsPaymentReviewOpen(false)
    setIsPaymentOpen(open)
  }
  // "Change" / the disclosure: opening the list asks for it to be revealed above the fixed bar (below)
  const togglePaymentList = () => {
    revealPaymentList.current = !isPaymentListOpen
    handlePaymentListOpenChange(!isPaymentListOpen)
  }
  const [confirm, setConfirm] = useState({ open: false, content: null, handleOnAccept: null })
  // The logo URL that failed to load: keyed by URL so another business's logo gets its own try
  const [failedBusinessLogo, setFailedBusinessLogo] = useState(null)
  // a business without a logo shows the theme's placeholder
  const businessLogo = businessDetails?.business?.logo || businessLogoPlaceholder(theme)
  const [isPaymentAttemptCancelled, setIsPaymentAttemptCancelled] = useState(false)
  // the click that reaches the controller shows its own
  // loading/slow/error state, independent of the controller's `placing`
  const [submitting, setSubmitting] = useState(false)
  const [savingGuestDetails, setSavingGuestDetails] = useState(false)
  // reading the cart by its UUID after a failure that leaves the order unconfirmed
  const [verifyingOrder, setVerifyingOrder] = useState(false)
  const checkoutActionBusy = submitting || savingGuestDetails || placing || verifyingOrder
  const [slowSubmit, setSlowSubmit] = useState(false)
  // false, 'failed' (the order was not placed), 'unconfirmed' (nobody knows: ) or 'pending' (its payment is)
  const [placeOrderError, setPlaceOrderError] = useState(false)
  const placeOrderBusy = useRef(false)
  const outcomeUnknown = useRef(false)
  const confirmationAttempted = useRef(false)
  // round 2: the customer's inline form (guest or logged in) has unsaved
  // changes — the CTA never discards it (onDirtyChange, UserFormDetails)
  const [isCustomerFormDirty, setIsCustomerFormDirty] = useState(false)
  // round 4: whether the guest/logged-in form is actually open right now —
  // reported by UserDetails' existing setIsOpenUserData (unused until now),
  // so the step card's own header (collapsed vs. open, the "Edit" button)
  // follows the form's real state without re-deriving it
  const [step1FormOpen, setStep1FormOpen] = useState(false)
  // a step already done collapses into one line; "Edit" reopens it by
  // nudging isUserDetailsEdit with a value it has never had before (a plain
  // `true` a second time would not re-trigger the open-on-prop-change effect)
  const [editNudge, setEditNudge] = useState(0)
  // round 5: the step card's "Cancel" leaves the open form the same way
  // (UserDetails' cancelEditNudge), now that the form has no X of its own
  const [cancelNudge, setCancelNudge] = useState(0)
  const editButtonRef = useRef(null)
  const restoreEditFocus = useRef(false)

  // "Continue to payment" opened a closed details form: submit it now that
  // it is on screen, so its missing fields say so ()
  const submitWhenFormOpens = useRef(false)
  useEffect(() => {
    if (!step1FormOpen) {
      submitWhenFormOpens.current = false
      return
    }
    if (!submitWhenFormOpens.current) return
    // the form paints once its fields have loaded: try each frame until it is there
    // shortcut: gives up after ~2 s of loading (the section was already scrolled to), raise if loads run longer
    let frame
    let tries = 0
    const attempt = () => {
      if (!submitWhenFormOpens.current) return
      if (submitGuestForm(true) || ++tries > 120) {
        submitWhenFormOpens.current = false
        return
      }
      frame = window.requestAnimationFrame(attempt)
    }
    attempt()
    return () => window.cancelAnimationFrame(frame)
  }, [step1FormOpen])

  useEffect(() => {
    if (step1FormOpen || !restoreEditFocus.current) return
    restoreEditFocus.current = false
    editButtonRef.current?.focus()
  }, [step1FormOpen])

  useEffect(() => {
    if (!submitting) {
      setSlowSubmit(false)
      return
    }
    const timer = setTimeout(() => setSlowSubmit(true), 8000)
    return () => clearTimeout(timer)
  }, [submitting])

  // belt and suspenders: if `placing` ever goes back to false with `errors`
  // while we still think we are submitting (a path that bypassed placeOrder
  // below), clear the spinner and show the inline error too
  useEffect(() => {
    if (submitting && !placing && errors) {
      setSubmitting(false)
      setPlaceOrderError((current) => current || 'failed')
    }
  }, [placing, errors])

  const cartPaymethod = businessDetails?.business?.paymethods?.find(({ paymethod }) => paymethod?.id === cart?.paymethod_id)?.paymethod
  const paymentSelectedName = cartPaymethod?.gateway
  const cardsMethods = ['stripe', 'stripe_connect_v2', 'credomatic']
  const stripeCardsMethods = ['stripe', 'stripe_connect_v2']
  // the gateways whose card id the controller sends as source_id (handlerClickPlaceOrder)
  const sourceIdMethods = ['stripe', 'stripe_connect', 'stripe_connect_v2', 'stripe_direct']
  const stripePaymethods = ['stripe', 'stripe_connect', 'stripe_connect_v2', 'stripe_redirect']
  const paymethodsWithoutAutoClose = ['hitpay', 'cash', 'braintree', 'cybersource']
  const businessConfigs = businessDetails?.business?.configs ?? []
  const isTableNumberEnabled = configs?.table_numer_enabled?.value
  const isWalletCashEnabled = businessConfigs.find(config => config.key === 'wallet_cash_enabled')?.value === '1'
  const isWalletCreditPointsEnabled = businessConfigs.find(config => config.key === 'wallet_credit_point_enabled')?.value === '1'
  const isWalletEnabled = configs?.cash_wallet?.value && isWalletConfigEnabled(configs) &&
    (isWalletCashEnabled || isWalletCreditPointsEnabled) && !useKioskApp && !isCustomerMode
  // the map's marker: the theme's primary
  const markerColor = checkoutMapMarkerColor(theme)
  const placeSpotTypes = [3, 4, 5]
  const placeSpotsEnabled = placeSpotTypes.includes(options?.type) && !useKioskApp
  const isGiftCardCart = !cart?.business_id
  const checkoutFields = useMemo(() => Array.isArray(checkoutFieldsState?.fields) ? checkoutFieldsState.fields.filter(field => field?.order_type_id === options?.type) : [], [checkoutFieldsState, options])
  const checkoutFieldsPending = !!(checkoutFieldsState?.loading || userLoading || (isCustomerMode && customerState.loading))
  const checkoutFieldsFailed = !checkoutFieldsState?.loading && (!!checkoutFieldsState?.error || !Array.isArray(checkoutFieldsState?.fields))
  const checkoutFieldsReady = !checkoutFieldsPending && !checkoutFieldsFailed
  const userSelected = isCustomerMode ? customerState.user : user
  const notFields = ['coupon', 'driver_tip', 'mobile_phone', 'address', 'zipcode', 'address_notes', 'comments']
  const checkGuestValidationFields = () => {
    const _requiredFields = checkoutFields
      .filter((field) => field?.enabled && field?.required_with_guest &&
        isCustomerDetailRequirement(field?.validation_field?.code) &&
        !notFields.includes(field?.validation_field?.code) &&
        field?.validation_field?.code !== 'email' &&
        userSelected && !userSelected[field?.validation_field?.code])
    const requiredFieldsCode = _requiredFields.map((item) => item?.validation_field?.code)
    const guestCheckoutCellPhone = checkoutFields.find((field) => field?.validation_field?.code === 'mobile_phone')
    const guestCheckoutEmail = checkoutFields.find((field) => field?.validation_field?.code === 'email')
    if (
      userSelected &&
      !(userSelected?.guest_cellphone ?? userSelected?.cellphone) &&
      ((guestCheckoutCellPhone?.enabled &&
        guestCheckoutCellPhone?.required_with_guest) ||
        configs?.verification_phone_required?.value === '1')
    ) {
      requiredFieldsCode.push('cellphone')
    }
    if (
      userSelected &&
      !(userSelected?.guest_email ?? userSelected?.email) &&
      guestCheckoutEmail?.enabled &&
      guestCheckoutEmail?.required_with_guest
    ) {
      requiredFieldsCode.push('email')
    }
    return { requiredFields: requiredFieldsCode, userErrors: [] }
  }
  const checkValidationFields = () => {
    const errors = []
    const _requiredFields = []
    checkoutFields.forEach(field => {
      if (field?.enabled &&
        field?.required &&
        isCustomerDetailRequirement(field?.validation_field?.code) &&
        !notFields.includes(field?.validation_field?.code)
      ) {
        if (userSelected && !userSelected[field?.validation_field?.code]) {
          _requiredFields.push(field?.validation_field?.code)
        }
      }
    })
    const mobilePhoneField = checkoutFields.find(field => field?.validation_field?.code === 'mobile_phone')
    if (
      userSelected &&
      !userSelected?.cellphone &&
      ((mobilePhoneField?.enabled &&
        mobilePhoneField?.required) ||
        configs?.verification_phone_required?.value === '1')
    ) {
      _requiredFields.push('cellphone')
    }
    if (userSelected && userSelected?.cellphone) {
      if (userSelected?.country_phone_code) {
        let phone = null
        phone = `+${userSelected?.country_phone_code}${userSelected?.cellphone.replace(`+${userSelected?.country_phone_code}`, '')}`
        const phoneNumber = parsePhoneNumber(phone)
        if (parseInt(configs?.validation_phone_number_lib?.value ?? 1, 10) && !phoneNumber?.isValid()) {
          errors.push(t('VALIDATION_ERROR_MOBILE_PHONE_INVALID', 'The field Phone number is invalid.'))
        }
      } else {
        errors.push(t('INVALID_ERROR_COUNTRY_CODE_PHONE_NUMBER', 'The country code of the phone number is invalid'))
      }
    }

    return { requiredFields: _requiredFields, userErrors: errors }
  }

  const { requiredFields, userErrors } = useMemo(() => {
    if (!checkoutFieldsReady) return { requiredFields: [], userErrors: [] }
    return user?.guest_id ? checkGuestValidationFields() : checkValidationFields()
  }, [checkoutFieldsReady, checkoutFields, user?.guest_id, userSelected, configs, t])

  const guestCheckoutDriveTip = useMemo(() => checkoutFields?.find(field => driverTipsTypes.includes(field.order_type_id) && field?.validation_field?.code === 'driver_tip'), [JSON.stringify(checkoutFields), options])
  const guestCheckoutComment = useMemo(() => checkoutFields?.find(field => field.order_type_id === options?.type && field?.validation_field?.code === 'comments'), [JSON.stringify(checkoutFields), options])
  const guestCheckoutCoupon = useMemo(() => checkoutFields?.find(field => field.order_type_id === options?.type && field?.validation_field?.code === 'coupon'), [JSON.stringify(checkoutFields), options])
  const guestCheckoutZipcode = useMemo(() => checkoutFields?.find(field => field.order_type_id === options?.type && field?.validation_field?.code === 'zipcode'), [JSON.stringify(checkoutFields), options])

  // const [hasBusinessPlaces, setHasBusinessPlaces] = useState(null)
  const allowDriverTipPickup = configs?.driver_tip_allowed_at_pickup?.value === '1' && pickupTypes.includes(options?.type)
  const validateCommentsCartField = (guestCheckoutComment?.enabled && (user?.guest_id ? guestCheckoutComment?.required_with_guest : guestCheckoutComment?.required)) && (cart?.comment === null || cart?.comment?.trim().length === 0)
  const validateDriverTipField = (deliveryTypes.includes(options.type) || allowDriverTipPickup) && (guestCheckoutDriveTip?.enabled && (user?.guest_id ? guestCheckoutDriveTip?.required_with_guest : guestCheckoutDriveTip?.required)) && (Number(cart?.driver_tip) <= 0)
  const validateCouponField = (guestCheckoutCoupon?.enabled && (user?.guest_id ? guestCheckoutCoupon?.required_with_guest : guestCheckoutCoupon?.required)) && !cart?.offers?.some(offer => offer?.type === 2)
  const validateZipcodeCard = (guestCheckoutZipcode?.enabled && (user?.guest_id ? guestCheckoutZipcode?.required_with_guest : guestCheckoutZipcode?.required)) && stripeCardsMethods.includes(paymethodSelected?.gateway) && paymethodSelected?.data?.card && !paymethodSelected?.data?.card?.zipcode
  const businessConfig = businessDetails?.business?.configs?.find(config => config?.key === 'reservation_setting')
  const reservationSetting = businessConfig ? JSON.parse(businessConfig?.value || '{}') : JSON.parse(configs?.reservation_setting?.value || '{}')

  const isFreeOrder = Number(cart?.balance) === 0
  const isInlineGuestCheckout = !!user?.guest_id && guestCheckoutAllowed
  const guestDetailsPending = isInlineGuestCheckout && !isFreeOrder && (isCustomerFormDirty || savingGuestDetails)

  // the card is missing when a card method is chosen in the list
  // (paymethodSelected is null until a card is picked) or when a Stripe
  // method (any of sourceIdMethods) comes restored from the cart without the
  // selected card's id (the controller sends it as source_id)
  const stripeCardMissing = sourceIdMethods.includes(paymethodSelected?.gateway) && cart?.balance > 0 && !paymethodSelected?.data?.id
  const cardPending = (!paymethodSelected && cart?.balance > 0 && cardsMethods.includes(openPaymethod?.gateway)) || stripeCardMissing
  // the payment notice's condition: no method, or a method without its card
  const paymentNoticeNeeded = (!paymethodSelected && cart?.balance > 0) || stripeCardMissing
  const paymentMethodMissing = !paymethodSelected && cart?.balance > 0 && !cardPending
  const validateCardRequired = cardsMethods.includes(paymethodSelected?.gateway) && cardList?.cards?.length === 0 && !stripeCardMissing
  const validateRequiredCardSelection = methodsWithRequiredCards.includes(paymethodSelected?.gateway) && (
    paymethodSelected?.gateway === 'cybersource'
      ? !(paymethodSelected?.data?.card_token || paymethodSelected?.data?.transient_token || cart?.paymethod_data?.card_token || cart?.paymethod_data?.transient_token)
      : !(paymethodSelected?.data?.card_token && cardList?.cards?.some(card => card?.id === paymethodSelected?.data?.id && card?.card_token === paymethodSelected?.data?.card_token))
  )

  // (B): only what the customer cannot fix from this page keeps
  // the button disabled. Missing details, payment or a required extra are
  // "fixable" — the CTA stays live and lists them (missingItems below)
  // instead of greying out. Round 2: `placing`/`submitting` are no longer
  // here either — while sending, the button keeps its primary look (the
  // theme's grey disabled style is only for a hard block); clicks are still
  // blocked, by the handlers below, not by the native `disabled` attribute.
  const isDisablePlaceOrderButton = guestOrderBlocked || !cart?.valid ||
    loading ||
    !cart?.valid_maximum ||
    (!cart?.valid_minimum && !(cart?.discount_type === 1 && cart?.discount_rate === 100)) ||
    (!cart?.reservation && options?.type === 9) ||
    (!!cart?.products?.length && !reservationSetting?.allow_preorder_reservation && options?.type === 9)

  // round 2: a guest with nothing saved yet (no name, no email, no phone)
  // gets the form open on entry even when nothing is required, so it is
  // visible with no intermediate step
  const guestHasNoSavedDetails = !user?.name && !(user?.guest_email ?? user?.email) && !(user?.guest_cellphone ?? user?.cellphone)

  // Step 1 "Your details" is done once the required fields are filled and,
  // for a school cart, a student is assigned (kiosk: the name is set); step
  // 2 "Payment" once a method is chosen or the order is free. Paid guest
  // checkouts finish step 1 by saving any edits before reviewing payment.
  // customer mode with only the email pending is complete too: the same
  // exception handlePlaceOrder makes (it places the order then)
  const customerDetailsComplete = requiredFields?.length === 0 ||
    (isCustomerMode && requiredFields?.length === 1 && requiredFields?.includes('email'))
  const step1Done = useKioskApp ? !!behalfName : (customerDetailsComplete && !guestDetailsPending && (!isSchoolCart || !schoolNeedsStudent))
  const step2Done = !!paymethodSelected || isFreeOrder
  // The section the customer's details (or the school's student) live in,
  // whichever the theme paints; the target the CTA scrolls to for step 1.
  const customerSectionSelector = '[data-doc-section="checkout-customer-details"], [data-doc-section="checkout-student-details"]'

  // The ordered, fixable gaps: none of them disables the button above; each
  // becomes a line under it ("To place your order, add …") and the target
  // its click scrolls to and focuses.
  const missingItems = useMemo(() => {
    const items = []
    const add = (key, label, selector) => items.push({ key, label, selector })
    // The CTA submits edits before the order can be confirmed.
    if (!useKioskApp && !customerDetailsComplete && !isCustomerFormDirty) add('customer_details', t('MISSING_YOUR_DETAILS', 'your details'), customerSectionSelector)
    if (isSchoolCart && schoolNeedsStudent) add('student', t('MISSING_STUDENT', 'a student'), customerSectionSelector)
    if (paymentMethodMissing) add('payment_method', t('MISSING_PAYMENT_METHOD', 'a payment method'), '[data-doc-section="checkout-payment-section"]')
    if (cardPending && cardList?.cards?.length > 0) add('card_selection', t('MISSING_CARD_SELECTION', 'a card selection'), '[data-doc-section="checkout-payment-section"]')
    if (cardPending && !(cardList?.cards?.length > 0)) add('card_required', t('MISSING_CARD', 'a card'), '[data-doc-section="checkout-payment-section"]')
    if (errorCash) add('cash', t('MISSING_CASH_AMOUNT', 'the cash amount'), '[data-doc-section="checkout-payment-section"]')
    if (validateCardRequired) add('card_required', t('MISSING_CARD', 'a card'), '[data-doc-section="checkout-payment-section"]')
    if (validateRequiredCardSelection) add('card_selection', t('MISSING_CARD_SELECTION', 'a card selection'), '[data-doc-section="checkout-payment-section"]')
    if (validateZipcodeCard) add('zipcode', t('MISSING_CARD_ZIPCODE', "your card's zipcode"), '[data-doc-section="checkout-payment-section"]')
    if (validateCommentsCartField) add('comments', t('MISSING_COMMENTS', 'a comment'), '[data-doc-section="checkout-totals"]')
    if (validateDriverTipField) add('driver_tip', t('MISSING_DRIVER_TIP', 'a tip'), '[data-doc-section="checkout-driver-tips"]')
    if (validateCouponField) add('coupon', t('MISSING_COUPON', 'a coupon'), '[data-doc-section="checkout-totals"]')
    if (isTableNumberEnabled === '1' && !isGiftCardCart && options?.type === 3 && !(cartState?.cart?.spot_number || cart?.spot_number || placeSpotNumber)) {
      add('place_spot', t('MISSING_PLACE_SPOT', 'your spot'), '[data-doc-section="checkout-place-spot"]')
    }
    return items
  }, [
    useKioskApp, customerDetailsComplete, isCustomerFormDirty, isSchoolCart, schoolNeedsStudent, paymentMethodMissing, cardPending, cardList, cart?.balance,
    errorCash, validateCardRequired, validateRequiredCardSelection, validateZipcodeCard, validateCommentsCartField,
    validateDriverTipField, validateCouponField, isTableNumberEnabled, isGiftCardCart, options?.type,
    cartState?.cart?.spot_number, cart?.spot_number, placeSpotNumber, t
  ])

  // the header only counts what is verified. While the required
  // fields load (or failed) nothing says step 1 is done, and a hard block
  // (e.g. an invalid delivery address) keeps step 2 from reading complete:
  // `stepsDone === 2` is "ready to place". Ready asks what the main action
  // asks: no fixable gap (missingItems) and no data error of the user's
  // details (userErrors) stand between the click and the confirmation.
  const hardBlocked = isDisablePlaceOrderButton && !(submitting || savingGuestDetails)
  const headerStep1Done = step1Done && checkoutFieldsReady
  // the cart is being read, or its payment is still pending (): the order is not ready to place, it is being confirmed
  const reconcilingPayment = verifyingOrder || placeOrderError === 'pending'
  const readyToPlace = headerStep1Done && step2Done && !hardBlocked && !missingItems.length && !userErrors.length && !reconcilingPayment
  const stepsDone = (headerStep1Done ? 1 : 0) + (readyToPlace ? 1 : 0)
  const checkoutStepLabel = checkoutFieldsPending
    ? t('CHECKOUT_CHECKING_DETAILS', 'Checking your details…')
    : checkoutFieldsFailed
      ? t('CHECKOUT_DETAILS_UNAVAILABLE', "We couldn't load the checkout details")
      : reconcilingPayment
        ? (verifyingOrder ? t('CHECKOUT_CHECKING_ORDER', 'Checking your order…') : t('CHECKOUT_CONFIRMING_PAYMENT_STEP', 'Confirming your payment…'))
        : stepsDone === 2
          ? t('CHECKOUT_READY_TO_PLACE', 'Ready to place your order')
          : headerStep1Done && step2Done
            ? t('CHECKOUT_RESOLVE_TO_PLACE', 'Review the notice below to place your order')
            : t('CHECKOUT_STEP_OF', 'Step :current: of :total:').replace(':current:', String(stepsDone + 1)).replace(':total:', '2')

  // Scrolls `selector`'s first match into view and focuses its first
  // focusable control (guarded: jsdom in tests has neither)
  const focusAndScrollTo = (selector) => {
    const el = document.querySelector(selector)
    if (!el) return
    el.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    el.querySelector?.('input, select, textarea, button, [tabindex]')?.focus?.()
  }

  const driverTipsOptions = typeof configs?.driver_tip_options?.value === 'string'
    ? JSON.parse(configs?.driver_tip_options?.value) || []
    : configs?.driver_tip_options?.value || []

  const deliveryOptions = instructionsOptions?.result && Array.isArray(instructionsOptions?.result) && instructionsOptions?.result?.filter(option => option?.enabled)?.map(option => {
    return {
      value: option?.id, content: t(option?.name.toUpperCase().replace(/\s/g, '_'), option?.name), showOnSelected: t(option?.name.toUpperCase().replace(/\s/g, '_'), option?.name)
    }
  })

  const hideBusinessAddress = themeHidden(theme, 'checkout.business.address')
  // logo, phone and notes of the business block
  const showBusinessLogo = themeVisible(theme, 'checkout.business.logo')
  const showBusinessPhone = themeVisible(theme, 'checkout.business.phone')
  const showBusinessNotes = themeVisible(theme, 'checkout.business.notes')
  const hideDriverTipsSubtitle = themeHidden(theme, 'checkout.driver_tips.subtitle')

  // round 5: the order's moment as the header shows it (OrderContextUI):
  // the scheduled date and time, or ASAP — the progress row and the context
  // card's title
  const momentLabel = options?.moment
    ? parseDate(options.moment, { outputFormat: `${preorderDateFormat} ${timeFormat}` })
    : t('ASAP_ABBREVIATION', 'ASAP')
  // the business has loaded (its block and the summary's store row)
  const businessLoaded = !cartState.loading && !!businessDetails?.business && Object.values(businessDetails?.business)?.length > 0
  // a pickup-like order (not kiosk) has its business' whole block in the
  // context card; a delivery or the kiosk, in the summary's store row
  const businessInContext = !useKioskApp && !deliveryTypes.includes(options?.type)
  // the context card's title of a pickup-like order ("Pickup at {business}"),
  // the moment after it
  const contextTitleTemplate = () => {
    if (options?.type === 3) return t('CHECKOUT_EAT_IN_AT', 'Eat in at :business:')
    if (options?.type === 4) return t('CHECKOUT_CURBSIDE_AT', 'Curbside at :business:')
    if (options?.type === 5) return t('CHECKOUT_DRIVE_THRU_AT', 'Drive thru at :business:')
    if (options?.type === 9) return t('CHECKOUT_RESERVATION_AT', 'Reservation at :business:')
    return t('CHECKOUT_PICKUP_AT', 'Pickup at :business:')
  }
  const contextTitle = `${contextTitleTemplate().replace(':business:', businessDetails?.business?.name ?? '')} · ${momentLabel}`
  // The tip is required for this order type: its section shows whatever the theme says
  const driverTipRequired = (deliveryTypes.includes(options?.type) || allowDriverTipPickup) && !!(guestCheckoutDriveTip?.enabled && (user?.guest_id ? guestCheckoutDriveTip?.required_with_guest : guestCheckoutDriveTip?.required))
  const driverTipsField = !cartState.loading && cart && cart?.business_id && (deliveryTypes.includes(options.type) || allowDriverTipPickup) && cart?.status !== 2 && (guestCheckoutDriveTip?.enabled) && driverTipsOptions.length > 0 && !useKioskApp

  const creditPointPlan = loyaltyPlansState?.result?.find(loyal => loyal.type === 'credit_point')
  const creditPointPlanOnBusiness = creditPointPlan?.businesses?.find(b => b.business_id === cart?.business_id && b.accumulates)

  const loyaltyRewardRate = creditPointPlanOnBusiness?.accumulation_rate ?? (!!creditPointPlanOnBusiness && creditPointPlan?.accumulation_rate) ?? 0
  const cashPlan = loyaltyPlansState?.result?.find(loyal => loyal.type === 'cashback' || loyal.type === 'cash')
  const cashPlanOnBusiness = cashPlan?.businesses?.find(b => b.business_id === cart?.business_id && b.accumulates)
  const cashRewardRate = cashPlanOnBusiness?.accumulation_rate ?? (!!cashPlanOnBusiness && cashPlan?.accumulation_rate) ?? 0
  const getCheckoutIncludedTaxes = () => {
    if (cart?.taxes === null) {
      return cart?.business?.tax_type === 1 ? cart?.tax : 0
    }
    return cart?.taxes?.reduce((taxIncluded, tax) => {
      return taxIncluded + ((tax.type === 1 && tax.target === 'product') ? tax.summary?.tax : 0)
    }, 0) ?? 0
  }
  const clearLoyaltyAmount = (value) => parseFloat((Math.trunc(value * 100) / 100).toFixed(configs?.format_number_decimal_length?.value ?? 2))
  const loyaltyRewardValue = clearLoyaltyAmount((cart?.subtotal + getCheckoutIncludedTaxes()) * loyaltyRewardRate)
  const cashRewardValue = clearLoyaltyAmount((cart?.subtotal + getCheckoutIncludedTaxes()) * cashRewardRate)
  const isDisabledRewards = configs?.disabled_rewards?.value === '1'
  const loyaltyRewardMessage = t('RECEIVE_LOYALTY_POINT', 'You could receive :amount: points for this purchase.')
  const [loyaltyRewardMessageStart, loyaltyRewardMessageEnd] = loyaltyRewardMessage.split(':amount:')
  const showLoyaltyReward = !isDisabledRewards && !!loyaltyRewardValue && isFinite(loyaltyRewardValue) && !cartState.loading && cart && cart?.status !== 2
  const cashRewardMessage = t('RECEIVE_CASHBACK', 'You could receive :amount: cashback for this purchase.')
  const [cashRewardMessageStart, cashRewardMessageEnd] = cashRewardMessage.split(':amount:')
  const showCashReward = !isDisabledRewards && !!cashRewardValue && isFinite(cashRewardValue) && !cartState.loading && cart && cart?.status !== 2
  const showCheckoutRewards = showLoyaltyReward || showCashReward

  // A confirmation goes through the same missing-items gate and submit state.
  // - a fixable gap besides the customer's details (those keep today's
  //   branches above, in handlePlaceOrder) blocks every one of them, not
  //   only this button, scrolling/focusing it instead of placing;
  // - the controller call is wrapped in try/catch/finally so a rejected
  //   promise (a dropped connection, not just `{ error: true }`) still
  //   clears the spinner and shows "Try again", never hangs it.
  // after a 5xx or a dropped connection the order may exist, and
  // the SDK only says no valid answer came. The cart is read by its UUID
  // before anything is sent again: a placed one opens its order. Resolves to
  // 'safe' when it is safe to send (the cart is still open), else why not: 'opened' (it was placed), 'pending' (its
  // payment is) or 'unconfirmed' (the read failed).
  const settleUnknownOutcome = async () => {
    setVerifyingOrder(true)
    let read = false
    let orderUuid = null
    let pendingPayment = false
    try {
      const customerId = isCustomerMode ? customerState.user?.id : null
      const { content } = await ordering.setAccessToken(token).carts(cart?.uuid).get(customerId ? { query: { user_id: customerId } } : {})
      read = !content?.error && !!content?.result
      // status 1 is placed, 2 is pending on the payment gateway (submodule Checkout/index.js:329-332, OrderContext:2027)
      orderUuid = content?.result?.status === 1 ? content.result.order?.uuid : null
      pendingPayment = content?.result?.status === 2
    } catch {
      read = false
    }
    setVerifyingOrder(false)
    // a payment still pending is not retried (a second POST could charge twice): Try again only reads again
    outcomeUnknown.current = !read || pendingPayment
    if (orderUuid) {
      handleOrderRedirect?.(orderUuid)
      return 'opened'
    }
    setPlaceOrderError(!read ? 'unconfirmed' : pendingPayment ? 'pending' : 'failed')
    return !read ? 'unconfirmed' : pendingPayment ? 'pending' : 'safe'
  }

  // Square places the cart inside its own dialog, so Checkout never sees its answer. The dialog
  // reports each cart it sends (`onPlaceSent`): from then on the outcome is unknown, as after a failed main
  // button, and any send from either path first reads the cart by its UUID. A token that failed sent nothing
  // and marks nothing.
  const markPlaceSent = () => { outcomeUnknown.current = true }
  const reconcileSquareOrder = async () => outcomeUnknown.current ? settleUnknownOutcome() : 'safe'

  const placeOrder = async (body) => {
    if (!checkoutFieldsReady || !handlerClickPlaceOrder || submitting || placeOrderBusy.current) return
    const blockingGap = missingItems.find((item) => !CUSTOMER_DETAIL_ITEM_KEYS.includes(item.key))
    if (blockingGap) {
      setPlaceOrderError(false)
      focusAndScrollTo(blockingGap.selector)
      return
    }
    setPlaceOrderError(false)
    placeOrderBusy.current = true
    setSubmitting(true)
    confirmationAttempted.current = true
    try {
      // an earlier failure left the order unconfirmed: read the cart first
      if (outcomeUnknown.current && (await settleUnknownOutcome()) !== 'safe') return
      outcomeUnknown.current = false
      const result = await handlerClickPlaceOrder(null, body)
      if (result?.error) {
        // the controller hands back the SDK's own failure as `result.result`; an
        // answer from the API (rejected, with its alert) carries none
        if (result.result) {
          outcomeUnknown.current = true
          await settleUnknownOutcome()
        } else {
          setPlaceOrderError('failed')
        }
      }
    } catch {
      outcomeUnknown.current = true
      await settleUnknownOutcome()
    } finally {
      placeOrderBusy.current = false
      setSubmitting(false)
    }
  }

  const handlePlaceOrder = () => {
    if (!checkoutFieldsReady || !canPlaceOrder()) return
    if (placing || submitting) return
    if (schoolNeedsStudent) return
    if (!user && !canUseGuestCheckout()) {
      setOpenModal({ ...openModal, signup: true, isGuest: false })
      return
    }
    if (stripePaymethods.includes(paymethodSelected?.gateway) && user?.guest_id) {
      handleOpenGuestSignup(paymethodSelected.id)
      return
    }

    if ((!userErrors.length && !requiredFields?.length) || (requiredFields?.length === 1 && isCustomerMode && requiredFields?.includes('email'))) {
      const body = {}
      if (behalfName) {
        body.on_behalf_of = behalfName
      }
      placeOrder(body)
      return
    }
    if (requiredFields?.length) {
      setIsOpen(true)
      return
    }
    setAlertState({
      open: true,
      content: Object.values(userErrors).map(error => error)
    })
    setIsUserDetailsEdit(true)
    // the inline form reads `editNudge || isUserDetailsEdit`: once "Edit"
    // was used, only a new nudge value reopens it
    setEditNudge((n) => n + 1)
  }

  // Submits the guest form already on screen (true), or reports there was
  // none to submit (false) so the caller can fall back to scrolling to it.
  // `orOpenForm`: else the open details form of a signed-in customer (it has
  // its own Continue), so its fields paint what is missing too ().
  const submitGuestForm = (orOpenForm = false) => {
    const guestForm = document.querySelector('[data-checkout-guest-form]') ||
      (orOpenForm ? document.querySelector('[data-doc-section="checkout-customer-details"] [data-doc-control="profile-form"]') : null)
    if (!guestForm) return false
    if (typeof guestForm.requestSubmit === 'function') guestForm.requestSubmit()
    else guestForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    return true
  }

  // Success comes from the controller before it closes the form. A form
  // becoming clean on cancel or unmount is never a successful save.
  const handleGuestFormSaved = (success) => {
    setSavingGuestDetails(false)
    // Keep the list open for review even if automatic selection has a cart
    // update still in flight. The next explicit payment interaction can fold it.
    if (success && isInlineGuestCheckout && !isFreeOrder) setIsPaymentReviewOpen(true)
  }

  const handlePlaceOrderButtonClick = () => {
    if (checkoutFieldsPending || checkoutActionBusy) return
    if (checkoutFieldsFailed) {
      retryCheckoutFields?.()
      return
    }
    if (isDisablePlaceOrderButton) return
    setPlaceOrderError(false)
    if (paymentBodyHidden) {
      // Submit the details, so their own validation runs. Finishing this
      // step opens payment without placing the order.
      if (submitGuestForm(!customerDetailsComplete)) return
      // A signed-in form that is still closed submits when it opens.
      if (step1Editable && !customerDetailsComplete) {
        submitWhenFormOpens.current = !step1FormOpen && !user?.guest_id
        setEditNudge((n) => n + 1)
      }
      focusAndScrollTo(customerSectionSelector)
      return
    }
    if (isCustomerFormDirty) {
      if (!submitGuestForm(true)) focusAndScrollTo(customerSectionSelector)
      return
    }
    handlePlaceOrder()
  }

  const handleOpenGuestSignup = (paymethodId) => {
    setOpenModal({ ...openModal, signup: true, isGuest: canUseGuestCheckout(), paymethodId })
  }

  const closeSignup = () => {
    setOpenModal(current => ({ ...current, signup: false, isGuest: false, paymethodId: null, source: null }))
  }

  // "Sign up for faster checkout" (step 1, guest allowed): guest_token sent
  // (isGuest), but it only logs the person in — it never places the order
  const handleOpenFasterCheckoutSignup = () => {
    authFocus.openedBy('signup')
    setOpenModal({ ...openModal, signup: true, isGuest: true, source: 'faster_checkout' })
  }

  const closeDetailsModal = () => {
    returnToPaymentAfterDetails.current = false
    setPaymethodClicked(null)
    setIsOpen(false)
  }

  const handleDetailsModalSaved = () => {
    if (!isOpen) return
    returnToPaymentAfterDetails.current = true
    setIsOpen(false)
    setPaymethodClicked(current => current ? { ...current, confirmed: true } : null)
  }

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
    setIsUserDetailsEdit(false)
  }

  const handleDeleteSelectedCard = (e) => {
    e?.stopPropagation?.()
    const cardId = paymethodSelected?.data?.id ?? cart?.paymethod_data?.id
    if (!cardId) return
    setConfirm({
      open: true,
      content: t('QUESTION_DELETE_CARD', 'Are you sure that you want to delete the card?'),
      handleOnAccept: () => {
        deleteBusinessUserPaymethod(cardId, () => {
          handlePaymethodChange(null)
          setCardList({ cards: [], loading: false, error: null })
          setIsPaymentOpen(true)
        })
        setConfirm({ open: false, content: null, handleOnAccept: null })
      }
    })
  }

  const isBraintreeCardSelected = (paymethodSelected?.gateway === 'braintree' || paymentSelectedName === 'braintree') && cart?.paymethod_data?.card

  const handleSuccessSignup = async (user) => {
    await login({
      user,
      token: user?.session?.access_token
    })
    if (openModal.paymethodId) {
      handlePaymethodChange(null)
      setSignupPaymethodId(openModal.paymethodId)
      handlePaymentListOpenChange(true)
    }
    closeSignup()
  }

  const handleSuccessLogin = (user) => {
    if (user) setOpenModal({ ...openModal, login: false })
  }

  const handleCloseIframe = async () => {
    setOpenModal((prev) => ({ ...prev, loading: true, iframe: false }))
    if (!methodsWithIframeCards.includes(paymethodSelected?.gateway)) {
      await confirmCart(cart?.uuid, {})
    }
    setOpenModal((prev) => ({ ...prev, loading: false }))
  }

  useEffect(() => {
    const bar = placeOrderBarRef.current
    if (!showMobilePlaceOrder || !bar) {
      setPlaceOrderBarHeight(0)
      return
    }
    const measure = () => setPlaceOrderBarHeight(bar.getBoundingClientRect().height)
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(bar)
    return () => observer?.disconnect()
  }, [showMobilePlaceOrder, theme])

  useEffect(() => {
    if (cart?.status === 2) setIsPaymentAttemptCancelled(false)
  }, [cart?.status])

  useEffect(() => {
    if (openModal.iframe === false) {
      document.body.style.overflow = ''
    }
  }, [openModal.iframe])

  useEffect(() => {
    // the controller's `errors` only come from placing the cart
    // (a dropped connection, an HTML 502: "Internal error"); the inline
    // "Your order wasn't placed" + "Try again" already cover them, and the
    // "Customer Details" alert is for data errors (handlePlaceOrder's own)
    if (!errors || confirmationAttempted.current) return
    // round 2: a network-level failure can hand the controller an
    // array with a blank message; an empty bullet taught nothing, and the
    // inline error + "Try again" already cover it — only a real message
    // opens this Alert, same as any other content it has always shown
    const nonEmptyErrors = Array.isArray(errors)
      ? errors.filter((message) => (typeof message === 'string' ? message.trim().length > 0 : !!message))
      : errors
    const hasContent = Array.isArray(nonEmptyErrors) ? nonEmptyErrors.length > 0 : !!nonEmptyErrors
    if (hasContent) {
      setAlertState({
        open: true,
        content: nonEmptyErrors
      })
    }
  }, [errors])

  useEffect(() => {
    if (isResetPaymethod) {
      handlePaymethodChange(null)
      setIsResetPaymethod(true)
      // changePaymethod(cart?.business_id, null, null)
    }
  }, [isResetPaymethod])

  useEffect(() => {
    if (cart?.products?.length || cart?.reservation || options?.type === 9 || userLoading) return
    if (cart?.business_id !== null) {
      if (cart?.business?.slug) {
        handleStoreRedirect(cart?.business?.slug)
      } else {
        events.emit('go_to_page', { page: 'search' })
      }
    } else {
      events.emit('go_to_page', { page: 'wallets', search: '?wallet=gift_card' })
    }
  }, [JSON.stringify(cart?.products)])

  useEffect(() => {
    const isCardSelected = paymethodSelected?.data?.card_token || paymethodSelected?.data?.transient_token
    const braintreeWithoutCard = paymentSelectedName === 'braintree' && !cart?.paymethod_data?.card
    if (braintreeWithoutCard) {
      setIsPaymentOpen(true)
      return
    }
    if (cart?.paymethod_id && (!paymethodsWithoutAutoClose.includes(paymethodSelected?.gateway) || isCardSelected)) {
      setIsPaymentOpen(false)
    } else if ((!cart?.paymethod_id && !paymethodSelected) || (paymethodSelected?.gateway === 'cybersource' && !isCardSelected)) {
      // a method just chosen keeps the list folded while the
      // cart saves it (it opens again only with no method at all)
      setIsPaymentOpen(true)
    }
  }, [cart?.paymethod_id, cart?.paymethod_data?.card, paymentSelectedName, paymethodSelected?.gateway, paymethodSelected?.data?.card_token, paymethodSelected?.data?.transient_token])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // The sections of the page in the theme's order (pages.checkout): each
  // renderer gets whether the theme shows it and returns its node. The
  // details (main) and the review (side) are two groups.
  const mainSections = {
    // round 5: the business' block — `title` ("Pickup at {business} ·
    // {moment}" in the context card, its name in the summary's store row),
    // then its address, phone and notes (each as checkout.business.* shows
    // it), its skeleton while loading and its error; its logo is the store
    // row's
    business: (title) => cart?.business_id && (
      <BusinessDetailsContainer data-doc-section='checkout-business-details'>
        {(businessDetails?.loading || cartState.loading) && !businessDetails?.error && (
          <div>
            <Skeleton height={20} style={{ marginBottom: themeSpace(theme, 'sm') }} />
            <Skeleton height={20} />
          </div>
        )}
        {businessLoaded && (
          <>
            {title}
            {!hideBusinessAddress && <p>{businessDetails?.business?.address}</p>}
            {showBusinessPhone && businessDetails?.business?.cellphone && <p>{businessDetails?.business?.cellphone}</p>}
            {showBusinessNotes && businessDetails?.business?.address_notes && <p>{businessDetails?.business?.address_notes}</p>}
          </>
        )}
        {businessDetails?.error && businessDetails?.error?.length > 0 && (
          <div>
            <h2 className='section-title'>{t('BUSINESS_DETAILS', 'Business Details')}</h2>
            <NotFoundSource
              icon='shop'
              content={businessDetails?.error[0]?.message || businessDetails?.error[0]}
            />
          </div>
        )}
      </BusinessDetailsContainer>
    ),
    customer: (visible) => {
      // the kiosk asks for the name in the customer's place (always, as
      // it names the order)
      if (useKioskApp) {
        return (
          <WrapperActionsInput>
            <h2>
              {t('WHATS_YOUR_NAME', "What's your name?")}
            </h2>
            <Input
              aria-label={t('WHATS_YOUR_NAME', "What's your name?")}
              placeholder={t('WRITE_YOUR_NAME', 'Write your name')}
              autoComplete='off'
              onChange={(e) => setBehalfName(e?.target?.value)}
            />
          </WrapperActionsInput>
        )
      }
      // a school order needs its student, also with the customer hidden
      if (!visible) {
        return isSchoolCart && !cartState.loading && (
          <UserDetailsContainer data-doc-section='checkout-student-details'>
            <WrapperUserDetails>
              <CheckoutStudentDetails cart={cart} onStudentAssigned={setAssignedStudentId} />
            </WrapperUserDetails>
          </UserDetailsContainer>
        )
      }
      return (
        <UserDetailsContainer data-doc-section='checkout-customer-details'>
          <WrapperUserDetails>
            {cartState.loading || (isCustomerMode && !customerState?.user?.id)
              ? (<div>
                <Skeleton height={35} style={{ marginBottom: themeSpace(theme, 'md') }} />
                <Skeleton height={35} style={{ marginBottom: themeSpace(theme, 'md') }} />
                <Skeleton height={35} style={{ marginBottom: themeSpace(theme, 'md') }} />
                <Skeleton height={35} style={{ marginBottom: themeSpace(theme, 'md') }} />
                <Skeleton height={35} style={{ marginBottom: themeSpace(theme, 'md') }} />
              </div>)
              : (guestOrderBlocked
                  ? (
                  <AuthButtonList>
                    {/* round 4: the step card's own header already shows the
                        numbered circle and "Your details" */}
                    {/* isGuest: true so, once signed up, the controller can send the
                        cart's guest_token; this gate only signs the customer in */}
                    <AuthButtonSlot>
                      <Button color='primary' size='md' fullWidth data-checkout-auth='signup' onClick={() => { authFocus.openedBy('signup'); setOpenModal({ ...openModal, signup: true, isGuest: true }) }}>
                        {t('SIGN_UP', 'Sign up')}
                      </Button>
                    </AuthButtonSlot>
                    <AuthButtonSlot>
                      <Button color='primary' appearance='outline' size='md' fullWidth data-checkout-auth='login' onClick={() => { authFocus.openedBy('login'); setOpenModal({ ...openModal, login: true }) }}>
                        {t('LOGIN', 'Login')}
                      </Button>
                    </AuthButtonSlot>
                  </AuthButtonList>
                    )
                  : (
                    <>
                      <UserDetails
                        isUserDetailsEdit={editNudge || isUserDetailsEdit || (!!user?.guest_id && guestCheckoutAllowed && (requiredFields?.length > 0 || guestHasNoSavedDetails))}
                        cartStatus={cart?.status}
                        businessId={cart?.business_id}
                        useDefualtSessionManager
                        useSessionUser={!isCustomerMode}
                        isCustomerMode={isCustomerMode}
                        userData={isCustomerMode && customerState.user}
                        userId={isCustomerMode && customerState?.user?.id}
                        isOrderTypeValidationField
                        requiredFields={requiredFields}
                        checkoutFields={checkoutFields}
                        isSuccess={isSuccess}
                        isCheckout
                        isCheckoutSection
                        isCheckoutGuestForm={isInlineGuestCheckout}
                        onDirtyChange={setIsCustomerFormDirty}
                        onSaveStart={isInlineGuestCheckout && !isFreeOrder ? () => setSavingGuestDetails(true) : undefined}
                        onSaved={handleGuestFormSaved}
                        onRequestLogin={() => { authFocus.openedBy('login'); setOpenModal({ ...openModal, login: true }) }}
                        handleSuccessUpdate={() => handleGuestFormSaved(true)}
                        setIsOpenUserData={setStep1FormOpen}
                        // the step card itself carries the numbered circle,
                        // "Your details" and the actions (Edit, Cancel) —
                        // this section has no title row of its own
                        hideSectionHeading
                        cancelEditNudge={cancelNudge}
                        CollapsedSummaryComponent={(step1Done && !isCustomerFormDirty) ? CollapsedCustomerSummary : undefined}
                        BelowTitleComponent={({ isEdit: isGuestFormOpen } = {}) => (
                          // under the heading, above the form or
                          // read mode (round 2: was wrongly above the heading)
                          !!user?.guest_id && guestCheckoutAllowed
                            ? (
                              <>
                                <GuestCheckoutLinks>
                                  <span>
                                    {t('ORDERED_HERE_BEFORE', 'Ordered here before?')}{' '}
                                    <CheckoutGuestButton data-checkout-auth='login' onClick={() => { authFocus.openedBy('login'); setOpenModal({ ...openModal, login: true }) }}>
                                      {t('LOG_IN_FOR_FASTER_CHECKOUT', 'Log in for faster checkout')}
                                    </CheckoutGuestButton>
                                  </span>
                                  <CheckoutGuestButton data-checkout-auth='signup' onClick={handleOpenFasterCheckoutSignup}>
                                    {t('SIGN_UP_FOR_FASTER_CHECKOUT', 'Sign up for faster checkout')}
                                  </CheckoutGuestButton>
                                </GuestCheckoutLinks>
                                {/* round 3: nothing the site requires — say so
                                    while the form is open, so it never reads
                                    as mandatory alongside a "Ready" CTA */}
                                {isGuestFormOpen && requiredFields?.length === 0 && (
                                  <GuestDetailsOptionalNote>
                                    {t('CHECKOUT_GUEST_DETAILS_OPTIONAL', 'Optional · so the store can reach you about your order')}
                                  </GuestDetailsOptionalNote>
                                )}
                              </>
                              )
                            : null
                        )}
                      />
                      {isSchoolCart && (
                        <CheckoutStudentDetails cart={cart} onStudentAssigned={setAssignedStudentId} />
                      )}
                    </>
                    )
                )}
          </WrapperUserDetails>
        </UserDetailsContainer>
      )
    },
    address: () => !useKioskApp && cart?.business_id && (
      (businessDetails?.loading || cartState.loading)
        ? (
            <div style={{ width: '100%', marginBottom: themeSpace(theme, 'xl') }}>
              <Skeleton height={35} style={{ marginBottom: themeSpace(theme, 'md') }} />
              <Skeleton height={150} />
            </div>
          )
        : (
            <AddressDetails
              location={cart?.business?.location}
              businessLogo={businessLogo}
              isCartPending={cart?.status === 2}
              businessId={cart?.business_id}
              apiKey={configs?.google_maps_api_key?.value}
              mapConfigs={mapConfigs}
              isCustomerMode={isCustomerMode}
              cart={cart}
              primaryColor={markerColor}
            />
          )
    ),
    delivery_instructions: () => (
      !useKioskApp && cart?.business_id && !cartState.loading && deliveryOptionSelected !== undefined && deliveryTypes.includes(options?.type) && !isSchoolCart && !(cart?.student_id ?? cart?.student?.id) && (
        <DeliveryOptionsContainer data-doc-section='checkout-delivery-instructions'>
          <h2>{t('SPECIAL_INSTRUCTIONS', 'Special Instructions')}</h2>
          {/* a choice list of components.choice whose rows are actions: pressing the current one sends it again */}
          <div className="delivery-options-list" role='group' aria-label={t('SPECIAL_INSTRUCTIONS', 'Special Instructions')}>
            {deliveryOptions?.map((option) => (
              <Choice
                key={option.value}
                variant='action'
                title={option.content}
                selected={deliveryOptionSelected === option.value}
                onClick={() => handleChangeDeliveryOption(option.value)}
                disabled={cart?.status === 2}
              />
            ))}
          </div>
        </DeliveryOptionsContainer>
      )
    ),
    order_summary: () => cartState.loading
      ? (
        <div>
          <div>
            <Skeleton height={35} style={{ marginBottom: themeSpace(theme, 'md') }} />
            <Skeleton height={55} style={{ marginBottom: themeSpace(theme, 'md') }} />
          </div>
        </div>
        )
      : (cart && (reservationSetting?.allow_preorder_reservation || !cart?.reservation) && (
        // round 5: the product lines straight in the summary card, under its
        // store row (no "Summary" accordion of their own)
        <CartContainer data-doc-section='checkout-order-summary' hideOrderBill>
          <Cart
            isCartPending={cart?.status === 2}
            cart={cart}
            useKioskApp={useKioskApp}
            isCheckout
            isProducts={cart?.products?.length || 0}
            viewString='checkout'
            businessConfigs={businessConfigs}
            hideCommentsByValidationCheckout={!guestCheckoutComment?.enabled}
            hideCouponByValidationCheckout={!guestCheckoutCoupon?.enabled}
            productLoading={productLoading}
            setProductLoading={setProductLoading}
            forceHideCheckoutButton
            hideOrderBill
          />
        </CartContainer>
        ))
  }

  // (B): whether the customer section actually paints anything
  // this render (same gating as sectionVisible below: the theme can hide
  // it; a school cart or kiosk force it anyway). The progress indicator has
  // nothing to point at when it does not.
  const customerThemeVisible = !!sections?.find((section) => section.key === 'customer')?.visible
  const customerSectionForced = useKioskApp || isSchoolCart
  const customerSectionPainted = (customerThemeVisible || customerSectionForced) && !!mainSections.customer(customerThemeVisible)
  // kiosk keeps no progress indicator (customer mode does)
  const showCheckoutProgress = !useKioskApp && customerSectionPainted

  // round 4: whether `key`'s section of pages.checkout paints at all — the
  // theme still decides this (visibility only: proposal B's fixed layout
  // decides where and in what order, not sectionItems/group/order anymore).
  // usePageSections' own isVisible: unknown keys default to visible (as the
  // hook does), hideable:false sections always visible, same as before.
  const sectionVisible = (key, forced = false) => forced || isSectionVisible(key)

  // B fixes each section's zone (step 1, step 2, the summary),
  // but inside a zone the sections follow the theme's order
  // (pages.checkout.sections, the mobile_web one under 576px). Kiosk, the
  // student, the context card, the notices and the CTA keep their place.
  const inThemeOrder = (renderers) => Object.keys(renderers)
    .map((key, index) => ({ key, index, at: sections.findIndex((section) => section.key === key) }))
    .sort((a, b) => ((a.at < 0 ? Infinity : a.at) - (b.at < 0 ? Infinity : b.at)) || a.index - b.index)
    .map(({ key }) => <React.Fragment key={key}>{renderers[key]()}</React.Fragment>)

  // step 1's own extras for the order, below the details form
  const stepOneExtras = () => inThemeOrder({
    delivery_instructions: () => sectionVisible('delivery_instructions') && mainSections.delivery_instructions(),
    place_spot: () => sectionVisible('place_spot') && sideSections.place_spot(),
    reservation: () => sectionVisible('reservation') && sideSections.reservation()
  })

  // the summary's store row: its logo small, its name, its address (a
  // pickup-like order's context card has the rest), or the business' whole
  // block on delivery and in kiosk
  const storeRow = () => (
            <StoreStrip $short={businessInContext}>
              {showBusinessLogo && businessLoaded && businessLogo && (
                <div className='business-logo'>
                  {failedBusinessLogo === businessLogo
                    ? (
                      <span className='business-logo-placeholder' role='img' aria-label={businessDetails?.business?.name}>
                        <BaseIcon name='store' />
                      </span>
                      )
                    : (
                      <img
                        src={businessLogo}
                        /* the business's logo is named by the business; the dummy says nothing (the name is beside it) */
                        alt={businessDetails?.business?.logo ? businessDetails?.business?.name : ''}
                        onError={() => setFailedBusinessLogo(businessLogo)}
                      />
                      )}
                </div>
              )}
              <div className='store-strip-text'>
                {businessInContext
                  ? (
                    <>
                      <p className='store-strip-name' title={businessDetails?.business?.name}>{businessDetails?.business?.name}</p>
                      {!hideBusinessAddress && <p title={businessDetails?.business?.address}>{businessDetails?.business?.address}</p>}
                    </>
                    )
                  : mainSections.business(<p className='store-strip-name'>{businessDetails?.business?.name}</p>)}
              </div>
            </StoreStrip>
  )

  // round 4: step 1 collapses into one line once it is done, has nothing
  // unsaved, and nobody (re)opened it — kiosk, a blocked guest and a
  // hidden/not-painted section never collapse (nothing saved to summarize)
  const step1Collapsed = !useKioskApp && !guestOrderBlocked && customerSectionPainted && step1Done && !isCustomerFormDirty && !step1FormOpen
  // a signed-in customer whose order type configures no field the form draws (UserFormDetails:
  // the name fields, email, phone, birthdate) has nothing to edit: no "Edit" over an empty form
  const hasEditableDetails = !!user?.guest_id || !checkoutFieldsReady || requiredFields?.length > 0 ||
    checkoutFields.some((field) => field?.enabled && USER_FORM_FIELD_CODES.includes(field?.validation_field?.code))
  // round 5: the step card's header carries the form's actions (the form
  // has no title row of its own): "Edit" while it is closed, "Cancel" while
  // it is open over something saved (as the form's own X was, also with a
  // required field missing) — a guest with nothing saved yet has no "Cancel"
  const step1Editable = !useKioskApp && !guestOrderBlocked && customerThemeVisible && !cartState.loading && hasEditableDetails &&
    !(isCustomerMode && !customerState?.user?.id) && cart?.status !== 2 && cart?.status !== 'payment_incomplete'
  const step1CanCancel = step1Editable && step1FormOpen && !guestHasNoSavedDetails

  // step 2's body waits for step 1 only while step 1 is on screen: with no
  // step 1 card (the theme hides "customer"), payment is always open
  const paymentBodyHidden = customerSectionPainted && !step1Done
  useEffect(() => {
    if (paymentBodyHidden || !isPaymentReviewOpen) return
    const disclosure = paymentDisclosureRef.current
    disclosure?.focus({ preventScroll: true })
    disclosure?.scrollIntoView?.({ block: 'center', behavior: scrollBehavior(theme) })
  }, [paymentBodyHidden, isPaymentReviewOpen, theme])

  // on small screens the fixed place order bar covers the end of
  // the list that "Change" just opened: scroll by what it hides of the lowest
  // option (measured), even when that takes the block's start out of the viewport
  useEffect(() => {
    if (!isPaymentListOpen || !revealPaymentList.current) return
    revealPaymentList.current = false
    const frame = window.requestAnimationFrame(() => {
      const list = paymentContentRef.current
      const bar = placeOrderBarRef.current
      if (!list || !bar) return
      const lowest = Math.max(...Array.from(
        list.querySelectorAll('button, a[href], input, select, textarea, [role="radio"], [role="button"], [tabindex]'),
        (control) => control.getBoundingClientRect().bottom
      ))
      const hidden = lowest - bar.getBoundingClientRect().top
      if (hidden > 0) window.scrollBy?.({ top: hidden, behavior: scrollBehavior(theme) })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isPaymentListOpen, theme])

  // "Cash preselected" / "Cash · already chosen" / the method's own name —
  // step 2's collapsed header (step 1 not done yet)
  const paymentMethodLabel = cartPaymethod?.gateway ? t(cartPaymethod.gateway.toUpperCase(), cartPaymethod?.name) : null
  const paymentSummaryText = isFreeOrder
    ? t('NO_PAYMENT_METHOD_NEEDED', 'No payment needed for this order.')
    : (cart?.paymethod_id || paymethodSelected?.id)
        ? (paymentMethodLabel || t('CHECKOUT_PAYMENT_METHOD_SELECTED', 'Already chosen'))
        : t('CHECKOUT_PAYMENT_PENDING', 'Choose a payment method')

  // the progress row's right side ("Pickup · ASAP", "Delivery · <date
  // time>"…), same keys as OrderContextUI's own order type labels
  const orderTypeLabelKey = ORDER_TYPE_LABELS[options?.type]
  const orderTypeLabel = orderTypeLabelKey ? t(orderTypeLabelKey[0], orderTypeLabelKey[1]) : null
  const orderContextLabel = [orderTypeLabel, momentLabel].filter(Boolean).join(' · ')

  // the chosen non-Stripe card (and its delete) and a failed payment (cart
  // status 4): in the methods' header, or under step 2's folded header while
  // its body waits for step 1 — never hidden with that body
  const savedCardShown = !isFreeOrder && !!cart?.paymethod_id && !!cart?.paymethod_data?.card && !['stripe', 'stripe_direct', 'stripe_connect'].includes(paymethodSelected?.gateway || paymentSelectedName)
  const paymentFailedShown = !isFreeOrder && !cartState.loading && cart?.status === 4
  const paymentNotices = (savedCardShown || paymentFailedShown) && (
    <>
      {savedCardShown && (
        <CardItemContent>
          <span className='brand'>
            <CardBrand brand={cart?.paymethod_data?.card?.brand} alt={cart?.paymethod_data?.card?.brand} />
          </span>
          <div className='payment-container'>
            <div className='payment-wrapper'>
              <span>
                {t(`${cart?.paymethod_data?.card?.brand?.toUpperCase() || 'PAYMENT_CARD'}`, capitalize(cart?.paymethod_data?.card?.brand || '') || 'Payment card')}
              </span>
            </div>
            <span className='card-number'>
              <p>••••</p>{cart?.paymethod_data?.card?.last4}
            </span>
          </div>
          {/* deleting the card is an icon button of the theme */}
          {isBraintreeCardSelected && (
            <CardItemAction>
              <Button
                type='button'
                shape='icon'
                color='neutral'
                appearance='ghost'
                size='sm'
                aria-label={t('DELETE_CARD', 'Delete card')}
                onClick={handleDeleteSelectedCard}
              >
                <BaseIcon name='trash' />
              </Button>
            </CardItemAction>
          )}
        </CardItemContent>
      )}
      {paymentFailedShown && (
        <WarningMessage $variant='danger' style={{ marginTop: 20 }}>
          <BaseIcon name="warning" />
          <p>
            {isPaymentAttemptCancelled
              ? t('PAYMENT_ATTEMPT_CANCELLED', 'The payment attempt was cancelled. Choose a payment method to try again.')
              : t('CART_STATUS_CANCEL_MESSAGE', 'The payment has not been successful, please try again')}
          </p>
        </WarningMessage>
      )}
    </>
  )

  const sideSections = {
    // round 4: a step card, its border/shadow following $current (step 1
    // done, step 2 not yet). Step 1 not done: a collapsed header only, the
    // content below stays mounted (`hidden`, never unmounted) so
    // PaymentOptions' own preselect/cash/card logic keeps running.
    // round 5: the methods' header row and body take the step card's own
    // padding (PaymentStepCard); the wallet goes in the step, under them
    payment_methods: () => !cartState.loading && cart && (
      <PaymentStepCard as='section' aria-label={t('CHECKOUT_PAYMENT', 'Payment')} $current={!paymentBodyHidden && !step2Done} data-doc-section='checkout-step-payment'>
        {paymentBodyHidden && (
          <StepCardHeaderRow $pending>
            <StepNumberCircle $state='pending' aria-hidden='true'>2</StepNumberCircle>
            <h2>{t('CHECKOUT_PAYMENT', 'Payment')}</h2>
            <StepCollapsedSummary title={paymentSummaryText}>{paymentSummaryText}</StepCollapsedSummary>
          </StepCardHeaderRow>
        )}
        {paymentBodyHidden && paymentNotices && <StepCardBody>{paymentNotices}</StepCardBody>}
        <div hidden={paymentBodyHidden}>
          {isFreeOrder
            ? (
          <NoPaymentNeededMsg className='paymentsContainer'>
            <StepCardHeaderRow>
              <StepNumberCircle $state='done' aria-hidden='true'>
                <BaseIcon name='check' />
              </StepNumberCircle>
              <h2>{t('CHECKOUT_PAYMENT', 'Payment')}</h2>
            </StepCardHeaderRow>
            <StepCardBody>
              <p>{t('NO_PAYMENT_METHOD_NEEDED', 'No payment needed for this order.')}</p>
            </StepCardBody>
          </NoPaymentNeededMsg>
              )
            : (
          <SummaryAccordion
            className='paymentsContainer'
            data-doc-section='checkout-payment-section'
            data-doc-state={(cart?.paymethod_id || paymethodSelected?.id) ? 'selected' : 'unselected'}
          >
            <SummaryAccordionHeader active={isPaymentListOpen} isPayment>
              {/* the heading holds the button that opens / closes the methods;
                  "Change" (a method chosen) is a button beside it, never inside */}
              <div className='header-row'>
                <h2 className='accordion-heading'>
                  <PaymentDisclosureButton
                    ref={paymentDisclosureRef}
                    className='header'
                    aria-expanded={isPaymentListOpen}
                    aria-controls='checkout-payment-content'
                    onClick={togglePaymentList}
                  >
                    <span className='title'>
                      <StepNumberCircle $state={step2Done ? 'done' : 'current'} aria-hidden='true'>
                        {step2Done ? <BaseIcon name='check' /> : '2'}
                      </StepNumberCircle>
                      {t('CHECKOUT_PAYMENT', 'Payment')}
                    </span>
                    {!(cart?.paymethod_id || paymethodSelected?.id) && (
                      <span className='align-content'>
                        {requiredVariant
                          ? <RequiredFlag $variant={requiredVariant}>{t('REQUIRED', 'Required')}</RequiredFlag>
                          : <Flag>{t('REQUIRED', 'Required')}</Flag>}
                        <ChevronIcon kind='disclose' open={isPaymentListOpen} />
                      </span>
                    )}
                  </PaymentDisclosureButton>
                </h2>
                {(cart?.paymethod_id || paymethodSelected?.id) && (
                  <Button
                    type='button'
                    {...paymentChangeOptions}
                    aria-expanded={isPaymentListOpen}
                    aria-controls='checkout-payment-content'
                    onClick={togglePaymentList}
                  >
                    {t('CHANGE', 'Change')}
                  </Button>
                )}
              </div>
              <div className='content'>
                {/* the chosen method is the option the list folds to (below),
                    its name is not repeated here; a Stripe card is shown
                    below, with its method */}
                {!paymentBodyHidden && paymentNotices}
              </div>
            </SummaryAccordionHeader>
            {/* the methods always show, folded to the chosen one while the
                list is closed */}
            <SummaryAccordionContent id='checkout-payment-content' ref={paymentContentRef} active>
              <PaymentMethodContainer>
                <PaymentOptions
                  cart={cart}
                  useKioskApp={useKioskApp}
                  isDisabled={cart?.status === 2 || !checkoutFieldsReady}
                  businessId={!isGiftCardCart ? businessDetails?.business?.id : -1}
                  isLoading={!isGiftCardCart ? businessDetails.loading : false}
                  paymethods={businessDetails?.business?.paymethods}
                  businessDetailsError={!isGiftCardCart && businessDetails?.error}
                  retryBusinessDetails={retryBusinessDetails}
                  paymentDisclosureRef={paymentDisclosureRef}
                  onPaymentChange={handlePaymethodChange}
                  errorCash={errorCash}
                  setErrorCash={setErrorCash}
                  handleOrderRedirect={handleOrderRedirect}
                  isCustomerMode={isCustomerMode}
                  paySelected={paymethodSelected}
                  onPlaceOrderClick={(...args) => checkoutFieldsReady && canPlaceOrder() && onPlaceOrderClick?.(...args)}
                  reconcileOrder={reconcileSquareOrder}
                  onPlaceSent={markPlaceSent}
                  setCardList={setCardList}
                  onOpenMethodChange={setOpenPaymethod}
                  requiredFields={requiredFields}
                  openUserModal={setIsOpen}
                  paymethodClicked={paymethodClicked}
                  setPaymethodClicked={setPaymethodClicked}
                  handleOpenGuestSignup={handleOpenGuestSignup}
                  signupPaymethodId={signupPaymethodId}
                  onSignupPaymethodResumed={() => setSignupPaymethodId(null)}
                  validateDriverTipField={validateDriverTipField}
                  returnUrl={returnUrl}
                  createBusinessUserPaymethod={createBusinessUserPaymethod}
                  setOpenModal={setOpenModal}
                  listOpen={isPaymentListOpen}
                  onListOpenChange={handlePaymentListOpenChange}
                />
              </PaymentMethodContainer>
            </SummaryAccordionContent>
          </SummaryAccordion>
              )}
          {sectionVisible('wallet') && sideSections.wallet()}
        </div>
      </PaymentStepCard>
    ),
    wallet: () => isWalletEnabled && !businessDetails?.loading && (
      <WalletPaymentOptionContainer className='payment-step-extra'>
        <h3>{t('WALLET', 'Wallet')}</h3>
        <PaymentOptionWallet
          cart={cart}
          loyaltyPlansState={loyaltyPlansState}
          businessConfigs={businessDetails?.business?.configs}
        />
      </WalletPaymentOptionContainer>
    ),
    driver_tips: () => !!driverTipsField && (
      <DriverTipContainer data-doc-section='checkout-driver-tips'>
        <h2>{t('DRIVER_TIPS', 'Driver Tips')}</h2>
        {!hideDriverTipsSubtitle && <p>{t('100%_OF_THE_TIP_YOUR_DRIVER', '100% of the tip goes to your driver')}</p>}
        <DriverTips
          businessId={cart?.business_id}
          driverTipsOptions={driverTipsOptions}
          isFixedPrice={parseInt(configs?.driver_tip_type?.value, 10) === 1}
          isDriverTipUseCustom={!!parseInt(configs?.driver_tip_use_custom?.value, 10)}
          driverTip={parseInt(configs?.driver_tip_type?.value, 10) === 1
            ? cart?.driver_tip
            : cart?.driver_tip_rate}
          cart={cart}
          useOrderContext
        />
      </DriverTipContainer>
    ),
    place_spot: () => !cartState.loading && placeSpotsEnabled && cart?.business_id && (
      <SelectSpotContainer data-doc-section='checkout-place-spot'>
        <PlaceSpot
          isCheckout
          isInputMode
          isHomeStyle
          cart={cart}
          spotNumberDefault={cartState?.cart?.spot_number ?? cart?.spot_number}
          vehicleDefault={cart?.vehicle}
          setPlaceSpotNumber={setPlaceSpotNumber}
        />
      </SelectSpotContainer>
    ),
    reservation: () => !cartState.loading && cart?.reservation && cart?.business_id && options?.type === 9 && (
      <ReservationContainer>
        <BusinessReservation
          isCheckout
          cart={cart}
          business={{
            ...cart?.business,
            id: cart?.business_id
          }}
          isCustomerMode={isCustomerMode}
          scheduleList={cart?.business?.schedule}
        />
      </ReservationContainer>
    ),
    totals: () => !cartState.loading && cart && (reservationSetting?.allow_preorder_reservation || !cart?.reservation || Number(cart?.total) > 0) && (
      <CartContainer data-doc-section='checkout-totals' hideProductList isGiftCardCart={isGiftCardCart}>
        <Cart
          isCartPending={cart?.status === 2}
          cart={cart}
          useKioskApp={useKioskApp}
          isCheckout
          isProducts={cart?.products?.length || 0}
          viewString='checkout'
          businessConfigs={businessConfigs}
          hideCommentsByValidationCheckout={!guestCheckoutComment?.enabled}
          hideCouponByValidationCheckout={!guestCheckoutCoupon?.enabled}
          productLoading={productLoading}
          setProductLoading={setProductLoading}
          forceHideCheckoutButton
          hideProductList
        />
      </CartContainer>
    ),
    rewards: () => showCheckoutRewards && (
      <RewardsBanner
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
    )
  }

  // The place order button of a slot (place_order, or
  // place_order_mobile on the bar of small screens); out of the order's
  // limits it keeps the secondary color that says so
  const placeOrderValid = cart?.valid_maximum && (cart?.valid_minimum || (cart?.discount_type === 1 && cart?.discount_rate === 100))
  // `size` is the slot's, else the button's (lg on the page, md on the bar); the store's color and
  // appearance apply only while the order is valid, else the secondary says so (the slot's shape is
  // not a place order's). Full width: the column's, as the wrapper's rule gave it
  const placeOrderProps = (slot, size) => {
    const { color, appearance, shape, ...sized } = slotButtonOptions(theme, 'checkout', slot, { size })
    // the screen's main action (`cta`: full width on small screens when the theme says so)
    const props = { ...sized, cta: true, fullWidth: true }
    return placeOrderValid ? { ...props, color: color ?? 'primary', ...(appearance && { appearance }) } : { ...props, color: 'secondary' }
  }
  // "Change" is a text button: the slot's shape is not its (as in placeOrderProps)
  const { shape: _slotShape, ...paymentChangeOptions } = slotButtonOptions(theme, 'checkout', 'payment_change', { color: 'secondary' })
  // round 5: while sending, the button keeps its primary look even when the
  // order context reports `loading` (the controller sets it while placing):
  // only a hard block greys it out; the click handler blocks a second click
  const placeOrderDisabled = checkoutFieldsPending ||
    (checkoutFieldsFailed ? !retryCheckoutFields : isDisablePlaceOrderButton && !(submitting || savingGuestDetails))
  // "Required" as a badge of the theme (slots.required), else its flag
  const requiredVariant = checkoutRequiredVariant(theme)

  // the CTA's label, desktop and mobile alike. The cart's own
  // limits come first (they block the button too); step 1 incomplete reads
  // "Continue to payment"; otherwise the existing labels, unchanged.
  const placeOrderLabel = () => {
    if (checkoutFieldsPending) return t('LOADING', 'Loading')
    if (checkoutFieldsFailed) return t('CHECKOUT_TRY_AGAIN', 'Try again')
    if (!cart?.valid_maximum) return `${t('MAXIMUM_SUBTOTAL_ORDER', 'Maximum subtotal order')}: ${parsePrice(cart?.maximum)}`
    if (!cart?.valid_minimum && !(cart?.discount_type === 1 && cart?.discount_rate === 100)) return `${t('MINIMUN_SUBTOTAL_ORDER', 'Minimum subtotal order:')} ${parsePrice(cart?.minimum)}`
    if (verifyingOrder) return t('CHECKOUT_CHECKING_ORDER', 'Checking your order…')
    if (placeOrderError) return t('CHECKOUT_TRY_AGAIN', 'Try again')
    if (submitting) return t('CHECKOUT_PLACING_YOUR_ORDER', 'Placing your order...')
    if (placing) return t('PLACING_ORDER', 'Placing order')
    if (paymentBodyHidden || savingGuestDetails) return t('CONTINUE_TO_PAYMENT', 'Continue to payment')
    if (cart?.paymethod_id && cart?.paymethod_data?.card) {
      return t('PAY_WITH', 'Pay with') + ' ' + t(`${cart?.paymethod_data?.card?.brand?.toUpperCase() || 'PAYMENT_CARD'}`, capitalize(cart?.paymethod_data?.card?.brand || '') || 'Payment card') + ' ' + cart?.paymethod_data?.card?.last4
    }
    // round 4: the total on the CTA itself ("Place order · £X"); every
    // other label above (min/max, error, loading, "Pay with…") stays as is
    return `${t('PLACE_ORDER', 'Place Order')} · ${parsePrice(cart?.total)}`
  }

  // "Sign up for faster checkout" prefills the guest's own
  // session data; every other signup entry (the blocked gate, the stripe
  // gate, handleOpenGuestSignup) keeps the form empty, as today
  const fasterCheckoutSignupProps = openModal.source === 'faster_checkout'
    ? {
        externalPhoneNumber: user?.country_phone_code && (user?.guest_cellphone ?? user?.cellphone)
          ? `+${user.country_phone_code}${user?.guest_cellphone ?? user?.cellphone}`
          : undefined,
        initialValues: { name: user?.name, lastname: user?.lastname, email: user?.guest_email ?? user?.email }
      }
    : {}

  // the payment notice: a card method already chosen asks for its card, not for a method
  const paymentWarning = cardPending
    ? t('WARNING_SELECT_CARD', 'Please, select or add a card to place order.')
    : t('WARNING_NOT_PAYMENT_SELECTED', 'Please, select a payment method to place order.')

  // "Still needed: your details, a payment method and a tip", under the
  // button, each gap a button that scrolls/focuses its target
  const missingItemsHint = checkoutFieldsReady && !!missingItems.length && (
    <MissingItemsHint>
      {t('CHECKOUT_STILL_NEEDED', 'Still needed:')}{' '}
      {missingItems.map((item, index) => (
        <React.Fragment key={item.key}>
          {index > 0 && (index === missingItems.length - 1 ? ` ${t('AND', 'and')} ` : ', ')}
          {/* no step 1 card (the theme hides "customer"): "your details"
              opens the UserDetails modal handlePlaceOrder uses */}
          <Button appearance='link' size='sm' onClick={() => (item.key === 'customer_details' && !customerSectionPainted ? setIsOpen(true) : focusAndScrollTo(item.selector))}>{item.label}</Button>
        </React.Fragment>
      ))}
    </MissingItemsHint>
  )

  // the failed placement over the button (a danger alert) and the slow one
  // under it (a status), each icon on its text's first line
  const placeOrderErrorAlert = (checkoutFieldsFailed || placeOrderError) && (
    <PlaceOrderErrorAlert>
      <span className='notice-icon' aria-hidden='true'><BaseIcon name='warning' /></span>
      <p>{checkoutFieldsFailed
        ? t('ERROR_UNKNOWN', 'An error has occurred')
        : placeOrderError === 'pending'
          ? t('CHECKOUT_CONFIRMING_PAYMENT', "We're still confirming your payment. Check again in a moment: your order opens once it's placed.")
          : placeOrderError === 'unconfirmed'
            ? t('CHECKOUT_ORDER_NOT_CONFIRMED', "We couldn't confirm your order. Your cart and details are saved.")
            : t('CHECKOUT_ORDER_NOT_PLACED', "Your order wasn't placed. Your cart and details are saved.")}</p>
    </PlaceOrderErrorAlert>
  )
  const slowSubmitNotice = submitting && slowSubmit && (
    <SlowNotice>
      <span className='notice-icon' aria-hidden='true'><BaseIcon name='clock' /></span>
      <span>{t('CHECKOUT_STILL_SENDING', "Still sending your order. Keep this page open; we'll show it as soon as it's confirmed.")}</span>
    </SlowNotice>
  )

  return (
    <Container data-doc-section='checkout'>
      {/* the order context docked under the header, full width */}
      {dockOrderContext && (
        <DockedOrderContextRow>
          <OrderContextUI isDocked />
        </DockedOrderContextRow>
      )}
      <WrapperLeftContainer>
        <WrapperLeftContent data-doc-section='checkout-details'>
          {!dockOrderContext && (
            <HeaderContent>
              {windowSize?.width < 576 && (
                <OrderContextUIWrapper>
                  <OrderContextUI isCheckOut />
                </OrderContextUIWrapper>
              )}
            </HeaderContent>
          )}
          <PendingCartNotice
            isCartPending={!cartState.loading && cart?.status === 2}
            placing={placing}
            paymethodName={cartPaymethod?.gateway && t(cartPaymethod.gateway.toUpperCase(), cartPaymethod?.name)}
            isPendingCartReleasable={isPendingCartReleasable}
            releasingPendingCart={releasingPendingCart}
            handleReleasePendingCart={handleReleasePendingCart}
            handleOrderRedirect={handleOrderRedirect}
            onReleased={() => setIsPaymentAttemptCancelled(true)}
          />
          <h1 className='checkout-title'>{t('CHECKOUT', 'Checkout')}</h1>
          {/* round 4 (proposal B): the step text, "Pickup"/
              "Delivery" muted beside it, and two discrete segments (never a
              continuously filling bar, never a success green — see
              CheckoutProgress/ProgressSegment in styles.js) */}
          {showCheckoutProgress && (
            <CheckoutProgress
              data-doc-section='checkout-progress'
              role='progressbar'
              aria-valuenow={stepsDone}
              aria-valuemin={0}
              aria-valuemax={2}
              aria-label={checkoutStepLabel}
            >
              <div className='checkout-progress-labels'>
                <p>{checkoutStepLabel}</p>
                <span className='checkout-progress-context'>{orderContextLabel}</span>
              </div>
              <ProgressSegmentsTrack aria-hidden='true'>
                <ProgressSegment $done={stepsDone >= 1} />
                <ProgressSegment $done={stepsDone >= 2} />
              </ProgressSegmentsTrack>
            </CheckoutProgress>
          )}
          {/* the context card: a pickup-like order says where and when
              ("Pickup at {business} · {moment}", the business' address), a
              delivery where to ("Deliver to", AddressDetails' address, its
              Change and map) */}
          {!useKioskApp && cart?.business_id && sectionVisible(deliveryTypes.includes(options?.type) ? 'address' : 'business') && (
            <ContextCard data-doc-section='checkout-context'>
              <span className='checkout-context-icon' aria-hidden='true'>
                <BaseIcon name={deliveryTypes.includes(options?.type) ? 'locationPin' : 'store'} />
              </span>
              {deliveryTypes.includes(options?.type)
                ? (
                  <div className='checkout-context-body checkout-context-address'>
                    <p className='checkout-context-title'>{t('DELIVER_TO', 'Deliver to')}</p>
                    {mainSections.address()}
                  </div>
                  )
                : <div className='checkout-context-body'>{mainSections.business(<p className='checkout-context-title'>{contextTitle}</p>)}</div>}
            </ContextCard>
          )}
          {/* step 1 "Your details": the card's own header carries the
              numbered circle and "Edit" — the form inside has neither its
              own heading nor pencil (hideSectionHeading, mainSections.customer) */}
          {customerSectionPainted && (
            <StepCard
              as='section'
              aria-labelledby='checkout-step-details-heading'
              data-doc-section='checkout-step-details'
              $current={!step1Collapsed}
              $allowFocusOverflow
            >
              <StepCardHeaderRow>
                {/* round 4: "done" only once it is actually tucked away
                    (step1Collapsed) — nothing is required can make step1Done
                    true while the form is still open (guestHasNoSavedDetails
                    keeps it open), and a check over an open, empty form
                    reads as wrong. The kiosk's step has no number */}
                {!useKioskApp && (
                  <StepNumberCircle $state={step1Collapsed ? 'done' : 'current'} aria-hidden='true'>
                    {step1Collapsed ? <BaseIcon name='check' /> : '1'}
                  </StepNumberCircle>
                )}
                <h2 id='checkout-step-details-heading'>{t('CHECKOUT_YOUR_DETAILS', 'Your details')}</h2>
                {step1Editable && !step1FormOpen && (
                  <Button
                    ref={editButtonRef}
                    appearance='ghost'
                    size='sm'
                    data-doc-control={step1Collapsed ? 'checkout-step-details-edit' : 'checkout-customer-edit'}
                    onClick={() => { submitWhenFormOpens.current = false; setEditNudge((n) => n + 1) }}
                  >
                    {t('EDIT', 'Edit')}
                  </Button>
                )}
                {step1CanCancel && (
                  <Button
                    appearance='ghost'
                    size='sm'
                    data-doc-control='checkout-customer-cancel'
                    onClick={() => {
                      restoreEditFocus.current = true
                      setCancelNudge((n) => n + 1)
                    }}
                  >
                    {t('CANCEL', 'Cancel')}
                  </Button>
                )}
              </StepCardHeaderRow>
              <StepCardBody>
                {mainSections.customer(customerThemeVisible)}
                {stepOneExtras()}
              </StepCardBody>
            </StepCard>
          )}
          {/* no step 1 card at all (the theme hides "customer" and nothing
              forces it): the order's own needs still show, uncarded */}
          {!customerSectionPainted && (
            <>{stepOneExtras()}</>
          )}
          {/* step 2 "Payment": not hideable (today's behaviour), its own
              card decides collapsed vs. open by step 1 — see sideSections.payment_methods */}
          {!cartState.loading && cart && sideSections.payment_methods()}
        </WrapperLeftContent>
      </WrapperLeftContainer>
      <WrapperRightContainer data-doc-section='checkout-review-and-submit'>
        <SummaryCard data-doc-section='checkout-summary' aria-label={t('SUMMARY', 'Summary')}>
          {/* round 5: the store in one compact row (its logo small; its
              name; its address), the item divider under it, as the theme
              shows the business. A pickup-like order's context card already
              has the rest (one muted line of address here); a delivery or
              the kiosk have it here: the business' whole block (phone,
              notes, skeleton, error) */}
          {inThemeOrder({
            business: () => cart?.business_id && sectionVisible('business') && (businessLoaded || !businessInContext) && storeRow(),
            order_summary: () => sectionVisible('order_summary') && mainSections.order_summary(),
            totals: () => sectionVisible('totals') && sideSections.totals(),
            driver_tips: () => sectionVisible('driver_tips', driverTipRequired) && sideSections.driver_tips(),
            rewards: () => sectionVisible('rewards') && sideSections.rewards()
          })}

          {!cart?.valid_address && cart?.status !== 2 && (
            <WarningText data-doc-section='checkout-address-warning'>
              {t('INVALID_CART_ADDRESS', 'Selected address is invalid, please select a closer address.')}
            </WarningText>
          )}

          {windowSize.width >= 576 && paymentNoticeNeeded && cart?.status !== 2 && (
            <WarningText data-doc-section='checkout-payment-warning'>
              {paymentWarning}
            </WarningText>
          )}

          {schoolNeedsStudent && cart?.status !== 2 && (
            <WarningText>
              {t('SCHOOL_SELECT_STUDENT_TO_PLACE', 'Please select a student to place the order.')}
            </WarningText>
          )}

          {!cart?.valid_products && cart?.status !== 2 && (
            <WarningText>
              {t('WARNING_INVALID_PRODUCTS', 'Some products are invalid, please check them.')}
            </WarningText>
          )}

          {isTableNumberEnabled === '1' && !isGiftCardCart && (options?.type === 3 && !(cart?.spot_number || placeSpotNumber)) && (
            <WarningText>
              {t('WARNING_PLACE_SPOT', 'Please, select your spot to place order.')}
            </WarningText>
          )}

          {validateDriverTipField && !isGiftCardCart &&
            (
              <WarningText>
                {t('WARNING_INVALID_DRIVER_TIP', 'Driver Tip is required.')}
              </WarningText>
            )}
          {validateCouponField &&
            (
              <WarningText>
                {t('WARNING_INVALID_COUPON_FIELD', 'Coupon is required.')}
              </WarningText>
            )}
          {validateCommentsCartField && (
            <WarningText>
              {t('WARNING_INVALID_CART_COMMENTS', 'Cart comments is required.')}
            </WarningText>
          )}

          {validateZipcodeCard && (
            <WarningText>
              {t('WARNING_CARD_ZIPCODE_REQUIRED', 'Your card selected has not zipcode')}
            </WarningText>
          )}

          {validateCardRequired && cart?.status !== 2 && (
            <WarningText>
              {t('WARNING_CARD_REQUIRED', 'Please, add a card to place your order.')}
            </WarningText>
          )}

          {validateRequiredCardSelection && cart?.status !== 2 && (
            <WarningText>
              {t('WARNING_CARD_SELECTION_REQUIRED', 'Please, select a card to place your order.')}
            </WarningText>
          )}

          {cart?.valid_preorder !== undefined && !cart?.valid_preorder && (
            <WarningText>
              {t('INVALID_CART_MOMENT', 'Selected schedule time is invalid, please select a schedule into the business schedule interval.')}
            </WarningText>
          )}

          {!cart?.reservation && options?.type === 9 && (
            <WarningText>
              {t('INVALID_CART_MOMENT', 'Selected schedule time is invalid, please select a schedule into the business schedule interval.')}
            </WarningText>
          )}
          {guestOrderBlocked && (
            <WarningText role='alert'>
              {t('GUEST_CHECKOUT_DISABLED', 'Guest checkout is not available for this order type.')}
            </WarningText>
          )}

          {windowSize.width >= 576 && !cartState.loading && cart && cart?.status !== 2 && (
            <WrapperPlaceOrderButton>
              {/* Order total now lives inside the order bill above; keep only a centered, full-width Confirm CTA here */}
              <div>
                {/* stacked full width (WrapperPlaceOrderButton), never beside
                    the button: the error over it, the slow notice and what is
                    still needed under it */}
                {placeOrderErrorAlert}
                <Button
                  data-doc-control='checkout-place-order'
                  {...placeOrderProps('place_order', 'lg')}
                  disabled={placeOrderDisabled}
                  aria-busy={checkoutActionBusy || checkoutFieldsPending}
                  aria-disabled={checkoutActionBusy || undefined}
                  busy={submitting || savingGuestDetails || verifyingOrder}
                  onClick={() => handlePlaceOrderButtonClick()}
                >
                  {placeOrderLabel()}
                </Button>
                {slowSubmitNotice}
                {missingItemsHint}
              </div>
            </WrapperPlaceOrderButton>
          )}
        </SummaryCard>
      </WrapperRightContainer>
      {placeOrderRoom > 0 && <CheckoutBottomRoom $room={placeOrderRoom} />}
      {showMobilePlaceOrder && (
        <MobileWrapperPlaceOrderButton className={BOTTOM_NAV_DOCKED} ref={placeOrderBarRef}>
          {/* Order total now lives inside the order bill above; keep only a centered, full-width Confirm CTA here. Payment hint shown here so mobile users see it next to the button. */}
          {/* while step 2's body waits for step 1, the missing list says
              what comes first ("your details"), not a method no one can pick yet */}
          {!paymentBodyHidden && paymentNoticeNeeded && cart?.status !== 2 && (
            <MobilePlaceOrderHint>
              {paymentWarning}
            </MobilePlaceOrderHint>
          )}
          {placeOrderErrorAlert}
          <Button
            data-doc-control='checkout-place-order'
            {...placeOrderProps('place_order_mobile', 'md')}
            disabled={placeOrderDisabled}
            aria-busy={checkoutActionBusy || checkoutFieldsPending}
            aria-disabled={checkoutActionBusy || undefined}
            busy={submitting || savingGuestDetails || verifyingOrder}
            onClick={() => handlePlaceOrderButtonClick()}
          >
            {placeOrderLabel()}
          </Button>
          {slowSubmitNotice}
          {missingItemsHint}
        </MobileWrapperPlaceOrderButton>
      )}
      <Alert
        title={t('CUSTOMER_DETAILS', 'Customer Details')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
      <Confirm
        title={t('CARD', 'Card')}
        content={confirm.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={confirm.open}
        onClose={() => setConfirm({ open: false, content: null, handleOnAccept: null })}
        onCancel={() => setConfirm({ open: false, content: null, handleOnAccept: null })}
        onAccept={confirm.handleOnAccept}
        closeOnBackdrop={false}
      />
      <DialogOverlay
        open={isOpen}
        size='xl'
        onClose={closeDetailsModal}
        finalFocus={() => returnToPaymentAfterDetails.current ? (paymentDisclosureRef.current ?? true) : true}
      >
        <UserDetails
          isUserDetailsEdit={isUserDetailsEdit}
          cartStatus={cart?.status}
          businessId={cart?.business_id}
          useDefualtSessionManager
          useSessionUser={!isCustomerMode}
          isCustomerMode={isCustomerMode}
          userData={isCustomerMode && customerState.user}
          userId={isCustomerMode && customerState?.user?.id}
          requiredFields={requiredFields}
          setIsSuccess={setIsSuccess}
          isCheckout
          isCheckoutPlace
          isEdit
          isModal
          isOrderTypeValidationField
          checkoutFields={checkoutFields}
          isAllowGuest={guestCheckoutAllowed && (paymethodSelected?.gateway === 'cash' || paymethodSelected?.gateway === 'card_delivery')}
          onClose={handleDetailsModalSaved}
        />
      </DialogOverlay>
      {openModal.signup && (
        <DialogOverlay
          open={openModal.signup}
          size='xl'
          onClose={closeSignup}
          finalFocus={authFocus.finalFocus}
        >
          <SignUpForm
            useLoginByCellphone
            useChekoutFileds
            handleSuccessSignup={handleSuccessSignup}
            isPopup
            isGuest={openModal.isGuest}
            {...fasterCheckoutSignupProps}
          />
        </DialogOverlay>
      )}
      {openModal.login && (
        <DialogOverlay
          open={openModal.login}
          size='xl'
          onClose={() => setOpenModal({ ...openModal, login: false })}
          finalFocus={authFocus.finalFocus}
        >
          <LoginForm
            handleSuccessLogin={handleSuccessLogin}
            isPopup
            isGuest
          />
        </DialogOverlay>
      )}
      {openModal.orderDetail && (
        <DialogOverlay
          open={openModal.orderDetail}
          size='xl'
          onClose={() => setOpenModal({ ...openModal, orderDetail: false })}
        >
          <OrderDetail
            item={cart}
            placingOrder={placing}
            orderType={options?.type}
            customerAddress={options?.address?.address}
            onClick={handlePlaceOrder}
          />
        </DialogOverlay>
      )}
      <DialogOverlay
        open={openModal.iframe && (cart?.paymethod_data?.result?.action?.iframe_url || paymethodSelected?.gateway === 'globalpay' || paymethodSelected?.gateway === 'braintree' || paymethodSelected?.gateway === 'cybersource')}
        onClose={() => openModal.loading ? null : handleCloseIframe()}
        aria-label={t('PAYMENT_METHOD', 'Payment method')}
      >
        <div style={{ height: paymethodSelected?.gateway === 'globalpay' ? '45vh' : '70vh', marginTop: paymethodSelected?.gateway === 'globalpay' ? 60 : 30 }}>
          <iframe
            width='100%'
            height='100%'
            src={paymethodSelected?.gateway === 'globalpay' ? globalPayIFrameUrl : paymethodSelected?.gateway === 'braintree' ? braintreeIFrameUrl : paymethodSelected?.gateway === 'cybersource' ? cybersourceIFrameUrl : cart?.paymethod_data?.result?.action?.iframe_url}
            style={{ border: 'none' }}
          />
        </div>
      </DialogOverlay>
    </Container>
  )
}

export const Checkout = (props) => {
  const {
    errors,
    clearErrors,
    // query,
    cartUuid,
    handleOrderRedirect,
    handleCheckoutRedirect,
    handleSearchRedirect,
    handleCheckoutListRedirect,
    businessSlug
  } = props

  const theme = useTheme()
  const [orderState, { confirmCart }] = useOrder()
  const [{ token }] = useSession()
  const [ordering] = useApi()
  const [, t] = useLanguage()

  const [cartState, setCartState] = useState({ loading: true, error: null, cart: null })

  const [openUpselling, setOpenUpselling] = useState(false)
  const [canOpenUpselling, setCanOpenUpselling] = useState(false)
  const [currentCart, setCurrentCart] = useState(null)
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [isResetPaymethod, setIsResetPaymethod] = useState(false)

  const cartsWithProducts = orderState?.carts && (Object.values(orderState?.carts)?.filter(cart => cart?.products && cart?.products?.length) || null)
  const carts = businessSlug
    ? cartsWithProducts.filter((cart) => cart?.business?.slug === businessSlug || businessSlug === cart?.business_id)
    : cartsWithProducts
  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
    clearErrors && clearErrors()
  }

  const handleUpsellingPage = () => {
    setOpenUpselling(false)
    setCurrentCart(null)
    setCanOpenUpselling(false)
    handleCheckoutRedirect(currentCart.uuid)
  }

  useEffect(() => {
    if (!orderState.loading && currentCart?.business_id) {
      setCurrentCart(...Object.values(orderState.carts)?.filter(cart => cart?.business_id === currentCart?.business_id))
    }
  }, [orderState.loading])

  useEffect(() => {
    if (currentCart?.products) {
      setOpenUpselling(true)
    }
  }, [currentCart])

  useEffect(() => {
    if (errors?.length) {
      setAlertState({
        open: true,
        content: errors
      })
    }
  }, [errors])

  const getOrder = async (cartId) => {
    try {
      let result = {}
      const cart = carts.find(cart => cart.uuid === cartId)
      const userCustomer = JSON.parse(window.localStorage.getItem('user-customer'))
      if (cart && !userCustomer) {
        result = { ...cart }
      } else {
        setCartState({ ...cartState, loading: true })
        const url = userCustomer
          ? `${ordering.root}/carts/${cartId}?user_id=${userCustomer?.id}`
          : `${ordering.root}/carts/${cartId}`
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-App-X': ordering.appId
          }
        })
        const content = await response.json()
        result = content.result
      }

      if (result.status === 1 && result.order?.uuid) {
        handleOrderRedirect(result.order.uuid)
        setCartState({ ...cartState, loading: false })
      } else if (result.status === 2) {
        let paymentData = null
        if (['credomatic', 'computop', 'epayco'].includes(result?.paymethod_data?.gateway)) {
          const urlParams = new URLSearchParams(window.location.search)
          const paramsObj = Object.fromEntries(urlParams.entries())
          paymentData = {
            [result?.paymethod_data?.gateway]: {
              ...paramsObj
            }
          }
        }
        try {
          const confirmCartRes = await confirmCart(cartUuid, paymentData)
          if (confirmCartRes.error) {
            setAlertState({
              open: true,
              content: typeof confirmCartRes.result === 'string'
                ? [confirmCartRes.result]
                : confirmCartRes.result
            })
            setIsResetPaymethod(true)
          }
          if (confirmCartRes.result.order?.uuid) {
            handleOrderRedirect(confirmCartRes.result.order.uuid)
          }
          setCartState({
            ...cartState,
            loading: false,
            cart: result
          })
        } catch (error) {
          setAlertState({
            open: true,
            content: [error.message]
          })
        }
      } else {
        let cart = Array.isArray(result) ? null : result
        const spotNumberFromStorage = window.localStorage.getItem('table_number')
        if (spotNumberFromStorage) {
          const spotNumber = JSON.parse(spotNumberFromStorage)?.tableNumber
          const slug = JSON.parse(spotNumberFromStorage)?.slug
          if (cart?.business?.slug === slug) {
            cart = {
              ...cart,
              spot_number: parseInt(spotNumber, 10)
            }
          }
        }
        setCartState({
          ...cartState,
          loading: false,
          cart,
          error: cart ? null : result
        })
      }
    } catch (e) {
      setCartState({
        ...cartState,
        loading: false,
        error: [e.toString()]
      })
    }
  }

  useEffect(() => {
    if (token && cartUuid) {
      getOrder(cartUuid)
    } else {
      setCartState({ ...cartState, loading: false })
    }
  }, [token, cartUuid])

  const checkoutProps = {
    ...props,
    UIComponent: CheckoutUI,
    enableCheckoutFieldsRetry: true,
    cartState,
    uuid: cartUuid,
    isResetPaymethod,
    setIsResetPaymethod
  }

  return (
    <>
      {!cartUuid && orderState.carts && carts && carts?.length === 0 && (
        <NotFoundSource
          headingLevel='h1'
          variant='empty'
          icon='bag'
          content={t('NO_CARTS_YET', "You don't have any carts yet")}
          subtitle={t('NO_CARTS_YET_DESC', 'Add items from a business to start an order.')}
          btnTitle={t('SEARCH_REDIRECT', 'Go to Businesses')}
          onClickButton={handleSearchRedirect}
        />
      )}
      {!cartUuid && orderState.carts && carts && carts?.length > 0 && (
        <CartsList>
          <CartContent
            carts={carts}
            isOrderStateCarts={!!orderState.carts}
            isForceOpenCart
          />
        </CartsList>
      )}

      {cartUuid && cartState.error && cartState.error?.length > 0 && (
        <NotFoundSource
          headingLevel='h1'
          icon='bag'
          content={t('ERROR_CART_SELECTED', 'Sorry, the selected cart was not found.')}
          btnTitle={t('CHECKOUT_REDIRECT', 'Go to Checkout list')}
          onClickButton={handleCheckoutListRedirect}
        />
      )}

      {cartState.loading && !(window.location.pathname === '/checkout') && (
        <Container>
          <WrapperLeftContainer>
            <Skeleton height={30} />
            <Skeleton height={100} style={{ marginBottom: themeSpace(theme, 'lg') }} />
            <Skeleton height={25} />
            <Skeleton height={50} style={{ marginBottom: themeSpace(theme, 'lg') }} />
            <Skeleton height={25} />
            <Skeleton height={50} style={{ marginBottom: themeSpace(theme, 'lg') }} />
            <Skeleton height={25} />
            <Skeleton height={25} />
          </WrapperLeftContainer>
          <WrapperRightContainer>
            <Skeleton height={25} />
            <Skeleton height={50} style={{ marginBottom: themeSpace(theme, 'xl') }} />
            <Skeleton height={25} />
            <Skeleton height={60} />
            <Skeleton height={80} style={{ marginBottom: themeSpace(theme, 'xl') }} />
            <Skeleton height={25} />
          </WrapperRightContainer>
        </Container>
      )}

      {cartUuid && cartState.cart && cartState.cart?.status !== 1 && <CheckoutController {...checkoutProps} />}

      {currentCart?.products && (
        <UpsellingPage
          businessId={currentCart?.business_id}
          cartProducts={currentCart?.products}
          business={currentCart?.business}
          handleUpsellingPage={handleUpsellingPage}
          openUpselling={openUpselling}
          canOpenUpselling={canOpenUpselling}
          setCanOpenUpselling={setCanOpenUpselling}
        />
      )}

      <Alert
        title={t('CHECKOUT ', 'Checkout')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
    </>
  )
}
