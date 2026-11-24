import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Block, ChoiceList, ChoiceRow, EmptyBtnWrapper, EmptyCart, RevervationContainer, ToleranceText } from './styles'
import { Button } from '~ui/src/design-system/components/Button'
import { Cart } from '~ui/src/components/Cart'
import { UserDetails } from '~ui/src/components/UserDetails'
import { useConfig } from '~components/contexts/ConfigContext'
import { useCustomer } from '~components/contexts/CustomerContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useSession } from '~components/contexts/SessionContext'
import { BusinessReservation as BusinessReservationController } from '~components/components/BusinessReservation'
import { useUtils } from '~components/contexts/UtilsContext'
import { useEvent } from '~components/contexts/EventContext'
import parsePhoneNumber from 'libphonenumber-js'
import { Select as ThemeSelect } from '~ui/src/design-system/components/Select'
import { RadioGroup } from '~ui/src/design-system/components/Checkbox'
import { Choice } from '~ui/src/design-system/components/Choice'
import { PreorderDateTimeSteps } from '~ui/src/components/PreorderDateTimeSteps'
import { ClosedBusinessMsg } from '~ui/src/components/MomentControl/styles'
import { EmptyStateArt, EmptyStateIcon } from '~ui/src/components/NotFoundSource'
import { isCustomerDetailRequirement, normalizeCheckoutFieldsState } from '~ui/src/utils/checkoutFields'
import { getTimes } from '~ui/utils'
import { businessCalendarDate, businessSlotForUser, utcInZone, utcWallClock, zonedDatesFrom, zonedSlotInstant } from '~/utils/businessTime'

export const BusinessReservationUI = (props) => {
  const {
    cart,
    isCustomerMode,
    checkoutFieldsState: apiCheckoutFieldsState,
    orderingMethod,
    setOrderingMethod,
    handleAddReservation,
    reservationSetting,
    reservationState,
    setReservationState,
    business,
    setOpenReservations,
    isCheckout
  } = props
  // An order type's field left unset takes the project's
  const checkoutFieldsState = useMemo(() => normalizeCheckoutFieldsState(apiCheckoutFieldsState), [apiCheckoutFieldsState])

  const [{ options }] = useOrder()
  const [, t] = useLanguage()
  const [{ user, loading: userLoading }] = useSession()
  const [{ configs }] = useConfig()
  const [{ parsePrice, is12Hours }] = useUtils()
  const [customerState] = useCustomer()
  const [events] = useEvent()
  const [requiredFields, setRequiredFields] = useState([])
  const [personsList, setPersonsList] = useState([])
  const is12hours = is12Hours

  // The days and times of a reservation are the business's (its schedule
  // is wall clock of its zone); each time shows as that instant in the
  // user's time, and reserve_date is sent in UTC, as api-core reads it.
  // Without a zone they are the user's.
  const timezone = business?.timezone || undefined
  const minMinutes = Number(reservationSetting?.min_time_reserve_minutes) || 0
  const maxDays = parseInt(reservationSetting?.max_time_reserve_days, 10) || 0
  const datesList = useMemo(
    () => zonedDatesFrom(timezone, { fromMinutes: minMinutes, count: Math.max(1, maxDays) }),
    [timezone, minMinutes, maxDays]
  )
  // the date and time picked ({ date, time: 'HH:mm' } of the business),
  // first the stored reservation's (UTC) on its day of the business
  const userPicked = useRef(false)
  const storedReserve = () => utcInZone(cart?.reservation?.reserve_date, timezone)
  const [reserveDate, setReserveDate] = useState(() => storedReserve() || { date: null, time: null })
  useEffect(() => {
    if (userPicked.current) return
    setReserveDate(storedReserve() || { date: null, time: null })
  }, [timezone, cart?.reservation?.reserve_date])
  const dateSelected = reserveDate?.date || datesList[0]
  // the slots of the day refresh while it is the first one (now moves on)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (dateSelected !== datesList[0]) return
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [dateSelected, datesList[0]])
  const schedule = business?.schedule
  const isEnabled = useMemo(() => {
    if (!dateSelected || !schedule) return false
    const day = timezone ? businessCalendarDate(dateSelected, timezone).day() : new Date(`${dateSelected}T00:00:00`).getDay()
    return !!schedule?.[day]?.enabled
  }, [dateSelected, schedule, timezone])
  const hoursList = useMemo(() => {
    if (!dateSelected || !schedule) return []
    const [year, month, day] = dateSelected.split('-').map(Number)
    return getTimes(new Date(year, month - 1, day), schedule, is12hours, { timezone, preorderLeadTime: minMinutes })
  }, [dateSelected, JSON.stringify(schedule), timezone, is12hours, minMinutes, now])
  // the picked time in the user's time, also when it is no longer a slot
  const selectedSlot = useMemo(() => {
    if (!reserveDate?.time || !dateSelected) return null
    const slot = businessSlotForUser(dateSelected, reserveDate.time, timezone, { is12Hours: is12hours })
    return { value: reserveDate.time, text: slot.text, userDate: slot.date }
  }, [dateSelected, reserveDate?.time, timezone, is12hours])
  const disablePlaceReservationButton =
    !((reservationState?.changes?.guests_reservation !== cart?.reservation?.guests_reservation) ||
      (reservationState?.changes?.reserve_date !== cart?.reservation?.reserve_date)) ||
      (!!cart?.products?.length && !reservationSetting?.allow_preorder_reservation)

  // The ordering methods available for this cart
  const orderingMethods = [
    !cart?.products?.length && { value: 1, label: t('TABLE_RESERVATION', 'Table reservation') },
    reservationSetting?.allow_preorder_reservation && { value: 2, label: t('TABLE_RESERVATION_AND_PREORDER', 'Table reservation & Preorder') }
  ].filter(Boolean)

  const notFields = ['coupon', 'driver_tip', 'mobile_phone', 'address', 'zipcode', 'address_notes', 'comments']
  const checkoutFields = useMemo(() => checkoutFieldsState?.fields?.filter(field => field.order_type_id === options?.type), [checkoutFieldsState, options])
  const onPlaceReservation = async () => {
    const result = await handleAddReservation(cart?.products)
    setOpenReservations?.(false)
    if (!result?.uuid) return
    if (orderingMethod === 1) {
      events.emit('go_to_page', { page: 'checkout', params: { cartUuid: result.uuid } })
    }
  }
  const checkGuestValidationFields = () => {
    const userSelected = isCustomerMode ? customerState.user : user
    const _requiredFields = checkoutFieldsState?.fields
      .filter((field) => (field?.order_type_id === options?.type) && field?.enabled && field?.required_with_guest &&
        isCustomerDetailRequirement(field?.validation_field?.code) &&
        !notFields.includes(field?.validation_field?.code) &&
        field?.validation_field?.code !== 'email' &&
        userSelected && !userSelected[field?.validation_field?.code])
    const requiredFieldsCode = _requiredFields.map((item) => item?.validation_field?.code)
    const guestCheckoutCellPhone = checkoutFieldsState?.fields?.find((field) => field.order_type_id === options?.type && field?.validation_field?.code === 'mobile_phone')
    const guestCheckoutEmail = checkoutFieldsState?.fields?.find((field) => field.order_type_id === options?.type && field?.validation_field?.code === 'email')
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
    setRequiredFields(requiredFieldsCode)
  }

  const checkValidationFields = () => {
    const errors = []
    const userSelected = isCustomerMode ? customerState.user : user
    const _requiredFields = []
    Object.values(checkoutFieldsState?.fields).map(field => {
      if (options?.type === field?.order_type_id &&
        field?.enabled &&
        field?.required &&
        !notFields.includes(field?.validation_field?.code)
      ) {
        if (userSelected && !userSelected[field?.validation_field?.code]) {
          _requiredFields.push(field?.validation_field?.code)
        }
      }
    })
    const mobilePhoneField = Object.values(checkoutFieldsState?.fields)?.find(field => field?.order_type_id === options?.type && field?.validation_field?.code === 'mobile_phone')
    if (
      userSelected &&
      !userSelected?.cellphone &&
      ((mobilePhoneField?.enabled &&
        mobilePhoneField?.required) ||
        configs?.verification_phone_required?.value === '1')
    ) {
      _requiredFields.push('cellphone')
    }
    setRequiredFields(_requiredFields)
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
  }

  const formatTimeDisplay = (time) => {
    if (!time) return ''
    if (is12hours) {
      if (time.includes('PM') || time.includes('AM')) {
        const period = time.includes('PM') ? 'PM' : 'AM'
        const timeStr = time.replace(/PM|AM/g, '').trim()
        const [hours, minutes] = timeStr.split(':')
        return { hours, minutes, period }
      }
      const [timeStr, period] = time.split(' ')
      const [hours, minutes] = timeStr.split(':')
      return { hours, minutes, period }
    }
    const [hours, minutes] = time.split(':')
    return { hours, minutes, period: null }
  }

  const handleChangeDate = (date) => {
    userPicked.current = true
    setReserveDate({
      ...reserveDate,
      date,
      time: null
    })
  }

  const handleChangeTime = (time) => {
    userPicked.current = true
    setReserveDate({
      ...reserveDate,
      date: dateSelected,
      time
    })
    setReservationState({
      ...reservationState,
      changes: {
        ...reservationState?.changes,
        // the business's wall clock as the UTC instant api-core reads
        reserve_date: utcWallClock(zonedSlotInstant(dateSelected, time, timezone))
      }
    })
  }

  useEffect(() => {
    if (checkoutFieldsState?.loading || customerState.loading || userLoading) return
    if (user?.guest_id) {
      checkGuestValidationFields()
    } else {
      checkValidationFields()
    }
  }, [checkoutFieldsState, user, customerState, options?.type])

  useEffect(() => {
    const _menuList = []
    const minPersons = reservationSetting?.min_guests_reservation
    const maxPersons = reservationSetting?.max_guests_reservation
    for (let i = minPersons; i <= maxPersons; i++) {
      _menuList.push({
        value: i,
        label: `${i} ${t('GUESTS', 'Guests')}`
      })
    }
    setPersonsList(_menuList)
  }, [reservationSetting?.min_time_reserve_minutes, reservationSetting?.max_time_reserve_days])

  return (
    <RevervationContainer isCheckout={isCheckout}>
      {!isCheckout && (
        <Block>
          <UserDetails
            useDefualtSessionManager
            cartStatus={cart?.status}
            businessId={cart?.business_id}
            useSessionUser={!isCustomerMode}
            isCustomerMode={isCustomerMode}
            userData={isCustomerMode && customerState.user}
            userId={isCustomerMode && customerState?.user?.id}
            isOrderTypeValidationField
            requiredFields={requiredFields}
            checkoutFields={checkoutFields}
            isCheckout
            CustomerDetailsTitleComponent={() => <h4>{t('CONTACT', 'Contact')}</h4>}
          />
        </Block>
      )}
      {!isCheckout && (
        <Block>
          <h4>{t('ORDERING_METHOD', 'Ordering Method')}</h4>
          {/* a single choice list of components.choice */}
          {orderingMethods.length > 0 && (
            <RadioGroup
              render={<ChoiceList />}
              aria-label={t('ORDERING_METHOD', 'Ordering Method')}
              value={orderingMethod}
              onValueChange={(value) => setOrderingMethod(value)}
            >
              {orderingMethods.map((method) => (
                <ChoiceRow key={method.value}>
                  <Choice value={method.value} title={method.label} />
                </ChoiceRow>
              ))}
            </RadioGroup>
          )}
          {(!!cart?.products?.length && !reservationSetting?.allow_preorder_reservation) && (
            <p className='error'>{t('MISSING_ORDERING_METHODS_ERROR', 'No ordering methods available, please remove the products of the cart to continue')}</p>
          )}
        </Block>
      )}
      <Block>
        <h4>{t('TABLE_SIZE', 'Table Size')}</h4>
        <div>
          {/* the guests are a select of the theme (components.input and its
              list of components.menu) */}
          <ThemeSelect
            presentation='mobile-sheet'
            fullWidth
            placeholder={t('GUESTS', 'Guests')}
            options={personsList.map(person => ({ value: person.value, content: person.label }))}
            defaultValue={reservationState?.changes?.guests_reservation}
            onChange={(value) => setReservationState({
              ...reservationState,
              changes: {
                ...reservationState?.changes,
                guests_reservation: value
              }
            })}
          />
        </div>
      </Block>
      <Block $plain>
        <h4>{t('AVAILABLE_TIME_CHOICE', 'Available Time Choice')}</h4>
        <PreorderDateTimeSteps
          datesList={datesList}
          dateSelected={dateSelected}
          timeSelected={reserveDate?.time}
          selectedSlot={selectedSlot}
          timeList={hoursList}
          isEnabled={isEnabled}
          handleChangeDate={handleChangeDate}
          handleChangeTime={handleChangeTime}
          configs={configs}
          maxDays={datesList?.length}
          formatTimeDisplay={formatTimeDisplay}
          is12Hours={is12hours}
          hasExistingMoment={!!reserveDate?.time}
          closedMessage={t('NOT_AVAILABLE_HOURS_DAY', 'Not available hours for this day')}
          business={business}
          ClosedBusinessMsg={ClosedBusinessMsg}
        />
      </Block>
      {!isCheckout && orderingMethod === 2 && (
        <Block>
          {cart?.products?.length > 0
            ? (
              <>
                <Cart
                  isStore
                  isCustomMode
                  isForceOpenCart
                  cart={cart}
                  isCartPending={cart?.status === 2}
                  isProducts={cart.products.length}
                  // handleCartOpen={handleCartOpen}
                  businessConfigs={business?.configs}
                  forceHideCheckoutButton
                  forceHideComments
                  forceHideCoupon
                  forceHideUpselling
                  forceHideBusiness
                  forcehideDriverTypes
                />
              </>
              )
            : (
              <EmptyCart>
                <div className='empty-content'>
                  {/* the image and box of the empty states (empty.not_found), else the cart icon */}
                  <EmptyStateArt>
                    <EmptyStateIcon name='bag' />
                  </EmptyStateArt>
                  <p>{t('ADD_PRODUCTS_IN_YOUR_CART', 'Add products in your cart')}</p>
                </div>
                <EmptyBtnWrapper>
                  <span>{parsePrice(0)}</span>
                </EmptyBtnWrapper>
              </EmptyCart>
              )}
        </Block>
      )}
      {isCheckout && (
        <ToleranceText>{t('YOU_HAVE', 'You have')} {reservationSetting?.late_arrival_hold_minutes} {t('MINUTES_TOLERANCE_RESERVATION_INFO', 'min of tolerance after the time of your reservation to avoid being canceled')}</ToleranceText>
      )}
      {(!isCheckout || !disablePlaceReservationButton) && (
        <Button
          loading={!!reservationState?.loading}
          disabled={!reservationState?.changes?.guests_reservation || !reserveDate?.time || disablePlaceReservationButton}
          onClick={onPlaceReservation}
          fullWidth
          size='md'
        >
          {isCheckout ? t('UPDATE_RESERVATION', 'Update reservation') : t('PLACE_TABLE_RESERVATION_NOW', 'Place Table Reservation Now')}
        </Button>
      )}
    </RevervationContainer>
  )
}

export const BusinessReservation = (props) => {
  const BusinessReservationProps = {
    ...props,
    UIComponent: BusinessReservationUI
  }

  return <BusinessReservationController {...BusinessReservationProps} />
}
