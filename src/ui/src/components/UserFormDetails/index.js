import React, { useEffect, useId, useRef, useState } from 'react'
import moment from 'moment'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'
import { useForm } from 'react-hook-form'
import parsePhoneNumber from 'libphonenumber-js'
import { formatPhoneNumber } from 'react-phone-number-input'

import {
  FormInput,
  ActionsForm,
  SkeletonForm,
  InputGroup,
  InputPhoneNumberWrapper,
  LanguageSelectorWrapper,
  NotificationChoiceList,
  FillAction,
  CenterAction,
  AccountNotice
} from './styles'

import { useSession } from '~components/contexts/SessionContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useCustomer } from '~components/contexts/CustomerContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { SignUpForm } from '~ui/src/components/SignUpForm'
import { Input } from '~ui/src/design-system/components/Input'
import { Button } from '~ui/src/design-system/components/Button'
import { Choice } from '~ui/src/design-system/components/Choice'
import { InputPhoneNumber } from '~ui/src/components/InputPhoneNumber'
import { LanguageSelectorList } from '~ui/src/components/LanguageSelectorList'
import { Alert } from '~ui/src/components/Confirm'
import { sortInputFields } from '~ui/utils'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { DatePickerUI } from '~ui/src/components/DatePicker'
import { useEnabledLanguages } from '../../hooks/useEnabledLanguages'
import { themeVisible } from '~/utils/themeVisibility'
import { fieldLabelAbove } from '~ui/src/styles/Field'
import { ErrorMsg } from '~ui/src/components/InputPhoneNumber/styles'
import { scrollBehavior } from '~/utils/themeMotion'
import { applyFormApiErrors } from '~/utils/formApiFeedback'

/* A field of the form keeps the value it mounted with: the form's `changes` follow every keystroke,
   and Base UI's uncontrolled Field warns when its default changes. The fields mount once the user is
   loaded (the form waits for it), so the first value is the user's. */
const MountedValueInput = React.forwardRef(({ defaultValue, ...props }, ref) => {
  const [mounted] = useState(defaultValue)
  return <Input ref={ref} defaultValue={mounted} {...props} />
})
MountedValueInput.displayName = 'MountedValueInput'

// What the phone's keyboard offers to fill in, by the field's code. A field that is not here
// gets none. second_lastname has no standard token and says off, so the browser does not guess another name into it.
const FIELD_AUTOCOMPLETE = {
  name: 'given-name',
  middle_name: 'additional-name',
  lastname: 'family-name',
  second_lastname: 'off',
  email: 'email'
}

// The phone input takes E.164 ("+12025550199"): react-phone-number-input logs an error for a space or a dash ().
// What is sent stays the code and the number apart (handleChangePhoneNumber).
const toE164 = (code, number) => `+${String(code).replace('+', '')}${String(number).replace(/[\s().-]/g, '')}`

export const UserFormDetailsUI = (props) => {
  const {
    isEdit,
    formState,
    onCancel,
    showField,
    cleanFormState,
    toggleIsEdit,
    onCloseProfile,
    isRequiredField,
    validationFields,
    handleChangeInput,
    handleButtonUpdateClick,
    isCheckout,
    userData,
    isCustomerMode,
    setWillVerifyOtpState,
    isOldLayout,
    requiredFields,
    handleChangeNotifications,
    handlePlaceOrderAsGuest,
    isOrderTypeValidationField,
    checkoutFields,
    isCheckoutPlace,
    view,
    // the guest form of the checkout's step 1 (customer section,
    // guest allowed, rendered inline): its own submit label and a data
    // attribute the CTA can submit by. Opt-in only: every other caller of
    // this UI (profile, the checkout's modal, etc.) keeps "Continue".
    isCheckoutGuestForm,
    isCheckoutSection,
    isModal,
    // round 2: tells the checkout the form has unsaved input, so its CTA
    // never discards it. Opt-in: nobody else passes it, so default
    // behaviour (no callback invoked) is unaffected everywhere else.
    onDirtyChange,
    // round 3: tells the checkout a save attempt it started (through
    // requestSubmit) failed — client validation or the API call itself —
    // so it can release its own spinner; called with `false` only (a
    // success is the controller's own handleSuccessUpdate, read directly by
    // ~components/components/UserFormDetails, since it fires before this
    // component can unmount on success — see the effect below). Opt-in,
    // same as onDirtyChange.
    onSaved,
    onSaveStart,
    // opens the sign-in the screen already has. A guest whose email or phone belongs to an account
    // is told so under that field, with this action, instead of an error that stops them. Opt-in
    onRequestLogin
  } = props

  // the failed submit focuses the first invalid field itself (below), after the phone and birthdate
  // errors, which are not the form library's, are painted too
  const formMethods = useForm({ shouldFocusError: false })
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const theme = useTheme()
  const [{ user: userSession }, { login }] = useSession()
  const [isValidPhoneNumber, setIsValidPhoneNumber] = useState(null)
  const [userPhoneNumber, setUserPhoneNumber] = useState(null)
  // The Alert is for what the server answered. What the form itself finds missing or invalid is
  // painted under each field (a modal over the form hid the very fields it named on a phone)
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  // the phone and birthdate errors of a submit (the form library holds the other fields')
  const [fieldErrors, setFieldErrors] = useState({})
  // the fields ('email', 'cellphone') the API says belong to an account; no word of that account is kept
  const [duplicates, setDuplicates] = useState([])
  const [submitFailures, setSubmitFailures] = useState(0)
  const formRef = useRef(null)
  const focusFirstInvalid = useRef(false)
  const [, { setUserCustomer }] = useCustomer()
  const pendingCustomerSync = useRef(false)
  const [isChanged, setIsChanged] = useState(false)
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const user = userData || userSession
  const [birthdate, setBirthdate] = useState(user?.birthdate ? moment(user?.birthdate, 'YYYY-MM-DD').toDate() : null)

  // The titles over the fields: shown when the theme puts the labels above
  // the fields
  // (components.field.base.label_position, like every form)
  const hideTopPlaceHolders = !fieldLabelAbove(theme)
  const fieldsId = useId()
  // the title over a field is its label
  const fieldTitle = (text, id) => <label htmlFor={id}>{text}</label>
  const [notificationList, setNotificationList] = useState({
    email: formState?.result?.result
      ? !!formState?.result?.result?.settings?.email?.newsletter
      : !!(formState?.changes?.settings?.email?.newsletter ?? (user && user?.settings?.email?.newsletter)),
    sms: formState?.result?.result
      ? !!formState?.result?.result?.settings?.sms?.newsletter
      : !!(formState?.changes?.settings?.sms?.newsletter ?? (user && user?.settings?.sms?.newsletter)),
    notification: formState?.result?.result
      ? !!formState?.result?.result?.settings?.notification?.newsletter
      : !!(formState?.changes?.settings?.notification?.newsletter ?? (user && user?.settings?.notification?.newsletter))
  })

  const { hasMultiple: hasMultipleLanguages } = useEnabledLanguages()
  const showCustomerPassword = themeVisible(theme, 'profile.password')
  // Only expose the language selector when there is more than one language to
  // switch between. The count is primed by the always-mounted header language
  // selector, so it's known immediately — no load-then-hide flash.
  const showLangauges = view === 'language' && hasMultipleLanguages
  const showNotifications = view === 'notifications'
  // the theme can hide the SMS and push channels
  // (profile.notifications.sms, profile.notifications.push)
  const notificationOptions = [
    { key: 'email', label: t('EMAILS', 'Emails') },
    ...(themeVisible(theme, 'profile.notifications.sms') ? [{ key: 'sms', label: t('SMS', 'Sms') }] : []),
    ...(themeVisible(theme, 'profile.notifications.push') ? [{ key: 'notification', label: t('PUSH_NOTIFICATIONS', 'Push Notifications') }] : [])
  ]
  const showAccount = view === 'account' || (!showLangauges && !showNotifications)

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
    cleanFormState && cleanFormState({ result: { error: false } })
  }

  const handleSuccessSignup = (user) => {
    login({
      user,
      token: user?.session?.access_token
    })
    handlePlaceOrderAsGuest && handlePlaceOrderAsGuest()
  }

  const showInputPhoneNumber = isOrderTypeValidationField ? checkoutFields?.find(field => field?.validation_field?.code === 'mobile_phone')?.enabled : (validationFields?.fields?.checkout?.cellphone?.enabled ?? false)
  const showInputBirthday = isOrderTypeValidationField ? checkoutFields?.find(field => field?.validation_field?.code === 'birthdate')?.enabled : (validationFields?.fields?.checkout?.birthdate?.enabled ?? false)

  const setUserCellPhone = (isEdit = false) => {
    if (userPhoneNumber && !userPhoneNumber.includes('null') && !isEdit) {
      setUserPhoneNumber(userPhoneNumber)
      return
    }
    // What the customer typed and the form still holds (a save the server rejected remounts the form, )
    // wins over what the user had saved, even when the user has no phone yet (a guest)
    if (formState.changes?.cellphone && formState.changes?.country_phone_code) {
      setUserPhoneNumber(toE164(formState.changes.country_phone_code, formState.changes.cellphone))
      return
    }
    const cellphone = user?.guest_id ? (user?.guest_cellphone ?? user?.cellphone) : user?.cellphone
    if (cellphone) {
      let phone = null
      if (user?.country_phone_code) {
        phone = toE164(user?.country_phone_code, cellphone)
      } else {
        phone = cellphone
      }
      setUserPhoneNumber(phone)
      return
    }
    setUserPhoneNumber(cellphone || '')
  }

  // What the form finds wrong in the fields the form library does not hold (birthdate, phone)
  const checkOwnFields = () => {
    const isPhoneNumberValid = userPhoneNumber && showInputPhoneNumber ? isValidPhoneNumber : true
    const isPhoneRequiredByOrderType = checkoutFields?.find(field => field?.validation_field?.code === 'mobile_phone')?.required
    const requiredPhone = (user?.guest_id && requiredFields?.includes?.('cellphone')) ||
    (!isOrderTypeValidationField && validationFields?.fields?.checkout?.cellphone?.enabled && validationFields?.fields?.checkout?.cellphone?.required && !user?.guest_id) ||
    (isOrderTypeValidationField && isPhoneRequiredByOrderType)

    const errors = {}
    if (requiredFields?.includes?.('birthdate') && !birthdate) {
      errors.birthdate = t('VALIDATION_ERROR_BIRTHDATE_REQUIRED', 'Birthdate is required')
    }
    if (!userPhoneNumber && (requiredPhone || (configs?.verification_phone_required?.value === '1'))) {
      errors.phone = t('VALIDATION_ERROR_MOBILE_PHONE_REQUIRED', 'The field Phone Number is required.')
    }
    // a number that does not validate paints its own message (InputPhoneNumber)
    return { errors, isPhoneNumberValid, blocked: Object.keys(errors).length > 0 || (!isPhoneNumberValid && !!userPhoneNumber) }
  }

  // A submit the form refuses: the fields paint their errors, the first one takes the focus (the
  // effect below), and the checkout is told so it releases its spinner
  const failSubmit = (errors) => {
    setFieldErrors(errors)
    // a required field this form does not draw (the phone or birthdate hidden here) has nowhere to
    // paint its message: the alert says it, so a refused submit never goes silent
    const unshown = [!showPhone && errors.phone, !showBirthday && errors.birthdate].filter(Boolean)
    if (unshown.length) setAlertState({ open: true, content: unshown })
    focusFirstInvalid.current = true
    setSubmitFailures(n => n + 1)
    onSaved?.(false)
  }

  const submitInFlight = useRef(false)

  const onSubmit = () => {
    const { errors, isPhoneNumberValid, blocked } = checkOwnFields()
    if (blocked) {
      failSubmit(errors)
      return
    }
    if (Object.keys(formState.changes).length === 0) {
      if (requiredFields) {
        toggleIsEdit && toggleIsEdit()
        cleanFormState && cleanFormState({ changes: {} })
      }
      return
    }
    if (Object.keys(formState.changes).length > 0 && isPhoneNumberValid) {
      let changes = null
      if (user?.cellphone && !userPhoneNumber) {
        changes = {
          country_phone_code: '',
          cellphone: ''
        }
      }
      // defer the CustomerContext sync until the update resolves. The
      // old code passed the pre-submit formState.result (undefined on the first
      // save), clearing the selected customer before the request even ran.
      if (isCustomerMode) {
        pendingCustomerSync.current = true
      }
      onSaveStart?.()
      return handleButtonUpdateClick(changes)
    }
  }

  const handleFormSubmit = async (event) => {
    event.preventDefault()
    if (submitInFlight.current || formState.loading) return
    submitInFlight.current = true
    try {
      await formMethods.handleSubmit(onSubmit, () => failSubmit(checkOwnFields().errors))(event)
    } finally {
      submitInFlight.current = false
    }
  }

  const handleChangePhoneNumber = (number, isValid) => {
    setDuplicates(list => list.filter(field => field !== 'cellphone'))
    setUserPhoneNumber(number)
    setIsChanged(true)
    setFieldErrors(({ phone, ...rest }) => rest)

    let phoneNumberParser = null
    let phoneNumber = {
      country_phone_code: {
        name: 'country_phone_code',
        value: ''
      },
      cellphone: {
        name: 'cellphone',
        value: ''
      }
    }
    if (isValid) {
      phoneNumberParser = parsePhoneNumber(number)
      if (!parseInt(configs?.validation_phone_number_lib?.value ?? 1, 10)) {
        if (phoneNumberParser?.nationalNumber) phoneNumberParser.nationalNumber = formatPhoneNumber(number)?.replace?.(/\s/g, '')
      }
    }
    if (phoneNumberParser) {
      phoneNumber = {
        country_phone_code: {
          name: 'country_phone_code',
          value: phoneNumberParser?.countryCallingCode
        },
        cellphone: {
          name: 'cellphone',
          value: phoneNumberParser?.nationalNumber
        }
      }
    }
    handleChangeInput(phoneNumber, true)
  }

  const handleFieldChange = (event) => {
    const { name } = event.target
    if (formMethods.errors[name]?.type === 'server') formMethods.clearErrors(name)
    handleChangeInput(event)
  }

  const handleChangeInputEmail = (e) => {
    const value = e.target.value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, '')
    setDuplicates(list => list.filter(field => field !== 'email'))
    handleFieldChange({ target: { name: 'email', value } })
    formMethods.setValue('email', value)
  }

  const _handleChangeDate = (date) => {
    setBirthdate(date)
    setFieldErrors(({ birthdate, ...rest }) => rest)
    const _birthdate = moment(date).format('YYYY-MM-DD')
    handleFieldChange({ target: { name: 'birthdate', value: _birthdate } })
  }

  // round 2: report unsaved input to the checkout (onDirtyChange)
  // whenever it changes; a successful save or a cancel clears formState's
  // changes back to {}, so this reports clean again on its own.
  useEffect(() => {
    onDirtyChange?.(Object.keys(formState?.changes || {}).length > 0)
  }, [formState?.changes])

  // a save closes the form before its changes are cleared: an unmounted form
  // holds no unsaved input
  useEffect(() => () => onDirtyChange?.(false), [])

  // The first field with an error (in screen order) takes the focus and the middle of the screen, once its
  // error is painted. Reduced motion jumps instead of gliding.
  useEffect(() => {
    if (!focusFirstInvalid.current) return
    const field = formRef.current?.querySelector('[aria-invalid="true"]')
    // once the errors are painted: no invalid field drawn means nothing to focus later either
    if (!field && submitFailures && !Object.keys(formMethods.errors).length) {
      focusFirstInvalid.current = false
      return
    }
    if (!field) return
    focusFirstInvalid.current = false
    field.scrollIntoView?.({ block: 'center', behavior: scrollBehavior(theme) })
    field.focus({ preventScroll: true })
  }, [submitFailures, formMethods.errors, fieldErrors])

  // once an isCustomerMode update finishes, refresh the selected
  // customer from the resolved response instead of the stale pre-submit state.
  useEffect(() => {
    if (formState?.loading || !pendingCustomerSync.current) return
    if (formState?.result?.result && !formState?.result?.error) {
      setUserCustomer(formState.result.result, true)
    }
    pendingCustomerSync.current = false
  }, [formState?.loading])

  useEffect(() => {
    if (!isEdit && onCloseProfile) {
      onCloseProfile()
    }
    if ((user || !isEdit) && !formState?.loading) {
      setUserCellPhone()
      if (!isEdit) {
        cleanFormState && cleanFormState({ changes: {} })
      }
    }
    if (!isEdit) onCancel && onCancel()
  }, [user, isEdit])

  useEffect(() => {
    if (!validationFields.loading && birthdate) {
      // after a server error, result is its messages, not the user
      formMethods.setValue('birthdate', formState?.result?.result && !formState?.result?.error
        ? formState?.result?.result?.birthdate
        : formState?.changes?.birthdate ?? (user && user?.birthdate) ?? '', { shouldValidate: true })
    }
  }, [validationFields, birthdate])

  useEffect(() => {
    if (isChanged && userPhoneNumber && isValidPhoneNumber && formState?.changes?.country_phone_code && formState?.changes?.cellphone && configs?.verification_phone_required?.value === '1') {
      setWillVerifyOtpState && setWillVerifyOtpState(true)
    }
  }, [isValidPhoneNumber, userPhoneNumber, configs?.verification_phone_required?.value, isChanged])

  useEffect(() => {
    if (requiredFields && !requiredFields?.includes?.('cellphone')) setIsValidPhoneNumber(true)
  }, [requiredFields])

  const handleEditNotifications = (key, value) => {
    setNotificationList({
      ...notificationList,
      [key]: value
    })
  }

  useEffect(() => {
    isEdit && !isCheckout && handleChangeNotifications(notificationList, (changes) => handleButtonUpdateClick(changes))
  }, [notificationList, isCheckout])

  // A field of the checkout form is drawn when it is enabled and the screen asks for it
  const isFieldShown = (item) => {
    const field = item?.validation_field || item
    return (isOrderTypeValidationField ? item?.enabled : (showField && showField(field.code))) &&
      ((requiredFields && requiredFields?.includes?.(field.code)) || !requiredFields || !isCheckoutPlace)
  }
  const shownFields = sortInputFields({ values: isOrderTypeValidationField ? checkoutFields : validationFields?.fields?.checkout }).filter(isFieldShown)
  const showPhone = !!(((!user?.guest_id && !!showInputPhoneNumber) || (isOrderTypeValidationField || user?.guest_id)) &&
    showInputPhoneNumber &&
    ((requiredFields && requiredFields?.includes?.('cellphone')) || !requiredFields || !isCheckoutPlace))
  const showBirthday = !!(((!user?.guest_id && showInputBirthday) || (isOrderTypeValidationField || user?.guest_id)) &&
    showInputBirthday &&
    ((requiredFields && requiredFields?.includes?.('birthdate')) || !requiredFields || !isCheckoutPlace))
  const showPassword = !isCheckout && showCustomerPassword && !requiredFields && !isCustomerMode

  useEffect(() => {
    if (formState?.loading || !formState?.result?.error) return
    const phoneFields = showPhone ? ['cellphone', 'mobile_phone', 'country_phone_code'] : []
    const fields = showAccount
      ? [
          ...shownFields.map(item => (item.validation_field || item).code),
          ...phoneFields,
          ...(showBirthday ? ['birthdate'] : []),
          ...(showPassword ? ['password'] : [])
        ]
      : []
    const message = applyFormApiErrors(t, formState.result, fields, (name, error) => {
      if (phoneFields.includes(name)) {
        setFieldErrors(previous => ({ ...previous, phone: error.message }))
      } else {
        formMethods.setError(name, error)
      }
    }, {
      // the duplicates this form draws a notice for
      softDuplicates: !onRequestLogin
        ? []
        : [...(shownFields.some(item => (item.validation_field || item).code === 'email') ? ['email'] : []), ...(showPhone ? ['cellphone'] : [])],
      onDuplicates: setDuplicates,
      // never a bare "Please try again": it says what failed
      fallback: t('FORM_DETAILS_NOT_SAVED', 'We couldn’t save your details. Check them and try again.')
    })
    setAlertState({ open: !!message, content: message })
    if (!message) {
      focusFirstInvalid.current = true
      setSubmitFailures(n => n + 1)
    }
  }, [formState?.loading, formState?.result])

  // The Enter key of the phone's keyboard says "next" while another field follows and "done" on the last one
  const afterFields = showPhone || showBirthday || showPassword
  const enterHint = (index) => index < shownFields.length - 1 || afterFields ? 'next' : 'done'

  // What is wrong with a field, painted under it and tied to it (aria-describedby). The form library
  // holds the text fields' errors; a pattern rule has no message of its own (the email's)
  const messageOf = (code) => {
    const error = formMethods.errors[code]
    if (error) return error.message || t('INVALID_ERROR_EMAIL', 'Invalid email address').replace('_attribute_', t('EMAIL', 'Email'))
    return fieldErrors[code] || null
  }
  const errorId = (code) => `${fieldsId}-${code}-error`
  const invalidProps = (code) => messageOf(code) ? { invalid: true, 'aria-describedby': errorId(code) } : {}
  const errorMessage = (code) => messageOf(code) && <ErrorMsg id={errorId(code)}>{messageOf(code)}</ErrorMsg>
  // The email or phone belongs to an account: a notice under the field (it does not stop the guest), with the way to sign in
  const accountNotice = (field) => duplicates.includes(field) && (
    <AccountNotice role='status' data-doc-control={`account-notice-${field}`}>
      {field === 'email'
        ? t('FORM_EMAIL_HAS_ACCOUNT', 'This email already has an account. Sign in to use your saved details, or continue as a guest.')
        : t('FORM_PHONE_HAS_ACCOUNT', 'This phone number already has an account. Sign in to use your saved details, or continue as a guest.')}
      {' '}
      <Button type='button' appearance='link' size='sm' onClick={onRequestLogin}>{t('SIGN_IN', 'Sign in')}</Button>
    </AccountNotice>
  )

  return (
    <>
      {showAccount && (
        <FormInput
          noValidate
          data-doc-control='profile-form'
          ref={formRef}
          onSubmit={handleFormSubmit}
          isCheckout={isCheckout}
          {...(isCheckoutGuestForm ? { 'data-checkout-guest-form': 'true' } : {})}
        >
          {!validationFields?.loading
            ? (
            <>
              {shownFields.map((item, index) => {
                const field = item?.validation_field || item
                // The fields of the first load come without an id: their code is unique
                const fieldKey = field.id ?? field.code
                return (
                  <React.Fragment key={fieldKey}>
                    {field.code === 'email'
                      ? (
                        <InputGroup>
                          {!hideTopPlaceHolders && fieldTitle(t(field.code.toUpperCase(), field?.name), `${fieldsId}-${field.code}`)}
                          <MountedValueInput
                            key={fieldKey}
                            id={`${fieldsId}-${field.code}`}
                            // always an email field (the keyboard's @ and the browser's email suggestions), whatever type the API's field declares
                            type='email'
                            inputMode='email'
                            name={field.code}
                            disabled={!isEdit}
                            placeholder={isCustomerMode ? t(field.code.toUpperCase() + '_OPTIONAL', field.name + ' (Optional)') : t(field.code.toUpperCase(), field?.name)}
                            defaultValue={formState?.changes[field.code] ?? (user && user?.guest_id ? user?.guest_email : user?.[field.code]) ?? ''}
                            onChange={handleChangeInputEmail}
                            ref={
                              formMethods.register({
                                required: !isCustomerMode ? t('VALIDATION_ERROR_EMAIL_REQUIRED', 'The field Email is required').replace('_attribute_', t('EMAIL', 'Email')) : null,
                                pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
                              })
                            }
                            autoComplete={FIELD_AUTOCOMPLETE.email}
                            enterKeyHint={enterHint(index)}
                            {...invalidProps(field.code)}
                          />
                          {errorMessage(field.code)}
                          {accountNotice('email')}
                        </InputGroup>
                        )
                      : (
                        <InputGroup>
                          {!hideTopPlaceHolders && fieldTitle(t(field.code.toUpperCase(), field?.name), `${fieldsId}-${field.code}`)}
                          <MountedValueInput
                            key={fieldKey}
                            id={`${fieldsId}-${field.code}`}
                            type={field.type}
                            name={field.code}
                            disabled={!isEdit}
                            placeholder={t(field.code.toUpperCase(), field?.name)}
                            defaultValue={formState?.changes[field.code] ?? (user && user[field.code]) ?? ''}
                            onChange={handleFieldChange}
                            ref={formMethods.register({
                              required: isRequiredField(field.code)
                                ? t(`VALIDATION_ERROR_${field.code.toUpperCase()}_REQUIRED`, `${field?.name} is required`).replace('_attribute_', t(field?.name, field.code))
                                : null
                            })}
                            autoComplete={FIELD_AUTOCOMPLETE[field.code]}
                            enterKeyHint={enterHint(index)}
                            {...invalidProps(field.code)}
                          />
                          {errorMessage(field.code)}
                        </InputGroup>
                        )}
                  </React.Fragment>
                )
              })}
              {showPassword && (
                <InputGroup>
                  {!hideTopPlaceHolders && fieldTitle(t('PASSWORD', 'Password'), `${fieldsId}-password`)}
                  <Input
                    id={`${fieldsId}-password`}
                    type='password'
                    name='password'
                    disabled={!isEdit}
                    placeholder={t('FRONT_VISUALS_PASSWORD', 'Password')}
                    onChange={handleFieldChange}
                    ref={formMethods.register({
                      required: isRequiredField('password')
                        ? t('VALIDATION_ERROR_PASSWORD_REQUIRED', 'The field Password is required').replace('_attribute_', t('PASSWORD', 'Password'))
                        : null,
                      minLength: {
                        value: 8,
                        message: t('VALIDATION_ERROR_PASSWORD_MIN_STRING', 'The Password must be at least 8 characters.').replace('_attribute_', t('PASSWORD', 'Password')).replace('_min_', 8)
                      }
                    })}
                    {...invalidProps('password')}
                  />
                  {errorMessage('password')}
                </InputGroup>
              )}
              {showPhone && (
                  <InputPhoneNumberWrapper>
                    {/* its label, the phone field's own (tied to its input) */}
                    <InputPhoneNumber
                      label={t('PHONE', 'Phone')}
                      user={user}
                      value={userPhoneNumber}
                      setValue={handleChangePhoneNumber}
                      handleIsValid={setIsValidPhoneNumber}
                      disabled={!isEdit}
                      enterKeyHint={showBirthday || showPassword ? 'next' : 'done'}
                      isError={!!fieldErrors.phone}
                      errorText={fieldErrors.phone}
                    />
                    {accountNotice('cellphone')}
                  </InputPhoneNumberWrapper>
              )}
              {showBirthday && (
                  <InputPhoneNumberWrapper>
                    {!hideTopPlaceHolders && fieldTitle(t('BIRTHDATE', 'Birthdate'), `${fieldsId}-birthdate`)}
                    {/* the field opens the calendar (a popover, a sheet on a phone);
                        the date it applies is the form's value */}
                    <DatePickerUI
                      id={`${fieldsId}-birthdate`}
                      value={birthdate}
                      onChange={_handleChangeDate}
                      label={t('BIRTHDATE', 'Birthdate')}
                      placeholder={t('BIRTHDATE', 'Birthdate')}
                      {...invalidProps('birthdate')}
                    />
                    {errorMessage('birthdate')}
                    <input
                      type='hidden'
                      name='birthdate'
                      defaultValue={birthdate ? moment(birthdate).format('YYYY-MM-DD') : ''}
                      ref={formMethods.register({
                        required: isRequiredField('birthdate')
                          ? t('VALIDATION_ERROR_BIRTHDATE_REQUIRED', 'Birthdate is required')
                          : null
                      })}
                    />
                  </InputPhoneNumberWrapper>
              )}
              <ActionsForm $inFlow={!!isCheckoutSection && !isModal}>
                {onCancel && isOldLayout && (
                  <FillAction>
                    <Button
                      color='secondary'
                      appearance='outline'
                      size='md'
                      type='button'
                      onClick={() => onCancel(false)}
                      disabled={formState.loading}
                    >
                      {t('CANCEL', 'Cancel')}
                    </Button>
                  </FillAction>
                )}
                {!requiredFields && ((formState && Object.keys(formState?.changes).length > 0 && isEdit) || formState?.loading) && (
                  <CenterAction $beside={!!(onCancel && isOldLayout)}>
                    <Button
                      data-doc-control='profile-save'
                      id='form-btn'
                      color='primary'
                      size='md'
                      type='submit'
                      loading={!!formState.loading}
                    >
                      {t('SAVE', 'Save')}
                    </Button>
                  </CenterAction>
                )}
                {requiredFields && (
                  isCheckoutGuestForm
                    ? (
                      // round 3: one primary CTA on screen — the
                      // checkout's own button. This stays a real submit
                      // button (Enter and form.requestSubmit() still reach
                      // it) but out of sight and out of the tab order.
                      <Button
                        srOnly
                        type='submit'
                        tabIndex={-1}
                        aria-hidden='true'
                        disabled={formState.loading}
                      />
                      )
                    : (
                      <FillAction>
                        <Button
                          id='form-btn'
                          color='primary'
                          size='md'
                          type='submit'
                          loading={!!formState.loading}
                        >
                          {t('CONTINUE', 'Continue')}
                        </Button>
                      </FillAction>
                      )
                )}
              </ActionsForm>
            </>
              )
            : <SkeletonForm>
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} />
                ))}
              </SkeletonForm>}
        </FormInput>
      )}
      {showNotifications && !requiredFields && !isCustomerMode && (
        // a choice list (components.choice) named for the
        // screen reader; each setting a switch row, the whole row the
        // switch (role switch), selected while on
        <NotificationChoiceList
          role='group'
          aria-label={t('MARKETING_NOTIFICATIONS', 'Marketing Notifications')}
        >
          {notificationOptions.map(({ key, label }) => (
            <Choice
              key={key}
              type='switch'
              title={label}
              defaultChecked={!!notificationList?.[key]}
              onCheckedChange={(checked) => handleEditNotifications(key, checked)}
              disabled={!!formState.loading}
            />
          ))}
        </NotificationChoiceList>
      )}
      {showLangauges && !requiredFields && !isCustomerMode && (
        <>
          <LanguageSelectorWrapper>
            {!hideTopPlaceHolders && <p>{t('LANGUAGES', 'Languages')}</p>}
            <LanguageSelectorList />
          </LanguageSelectorWrapper>
        </>
      )}
      <Alert
        title={t('PROFILE', 'Profile')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
      {modalIsOpen && (
        <DialogOverlay
          open={modalIsOpen}
          onClose={() => setModalIsOpen(false)}
          size='xl'
        >
          <SignUpForm
            useLoginByCellphone
            useChekoutFileds
            handleSuccessSignup={handleSuccessSignup}
            isPopup
            isGuest
          />
        </DialogOverlay>
      )}
    </>
  )
}
