import React, { useState, useEffect, useRef, useId } from 'react'
import { useTheme } from 'styled-components'
import { useForm } from 'react-hook-form'
import settings from '../../../../config'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import parsePhoneNumber from 'libphonenumber-js'
import { formatPhoneNumber } from 'react-phone-number-input'

import { LoginWith as SignupWith, CountdownTimer, ResendCode } from '../LoginForm/styles'

import {
  SignUpContainer,
  FormSide,
  FormInput,
  SocialButtons,
  RedirectLink,
  SkeletonWrapper,
  SkeletonSocialWrapper,
  ReCaptchaWrapper,
  Title,
  TermsConditionWrapper,
  BussinessAndDriverSignUp,
  CheckboxArea,
  PromotionsWrapper,
  ValidationText,
  InputContainer,
  OtpStep
} from './styles'

import { SignupForm as SignUpController } from '~components/components/SignupForm'
import { applyFormApiErrors, getFormApiFeedback } from '~/utils/formApiFeedback'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useSession } from '~components/contexts/SessionContext'
import { useToast, ToastType } from '~components/contexts/ToastContext'
import { ReCaptcha } from '~components/components/ReCaptcha'
import { useEvent } from '~components/contexts/EventContext'

import { useCountdownTimer } from '~ui/hooks/useCountdownTimer'
import { useRecaptcha } from '~ui/hooks/useRecaptcha'
import { SpinnerLoader } from '~ui/src/components/SpinnerLoader'
import { Checkbox, Radio, RadioGroup } from '~ui/src/design-system/components/Checkbox'
import { Input } from '~ui/src/design-system/components/Input'
import { InputCode } from '~ui/src/design-system/components/InputCode'
import { LabeledField } from '~ui/src/styles/Field'
import { TouchSlot } from '~ui/src/styles/TouchSlot'
import { Button } from '~ui/src/design-system/components/Button'
import { sortInputFields, formatSeconds } from '~ui/utils'
import { InputPhoneNumber } from '~ui/src/components/InputPhoneNumber'
import { FacebookLoginButton } from '~ui/src/components/FacebookLogin'
import { GoogleLoginButton } from '~ui/src/components/GoogleLogin'
import { AppleLogin } from '~ui/src/components/AppleLogin'
import { Alert } from '~ui/src/components/Confirm'

import { Icon } from '~ui/src/design-system/components/Icon'
import { themeControlHeight, themeSpace } from '~/utils/themeTokens'
import { themeVisible } from '~/utils/themeVisibility'
import { singleStoreSlug } from '~/utils/siteSettings'
import { ModalHeading } from '~ui/src/components/Overlay/ModalHeading'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { AUTH_FORM, authTabsProps, authLoginLinkVisible, authSocialVisible, signupPromotionsVisible } from '~/utils/authForm'
import { slotButtonOptions } from '~/utils/themeGroups'
import { validFacebookAppId } from '~/utils/integrationIds'

const notValidationFields = ['coupon', 'driver_tip', 'mobile_phone', 'address', 'address_notes']

const SignUpFormUI = (props) => {
  const {
    handleChangeInput,
    handleButtonSignupClick,
    handleReCaptcha,
    elementLinkToLogin,
    useChekoutFileds,
    validationFields,
    showField,
    isRequiredField,
    formState,
    handleSuccessSignup,
    isPopup,
    externalPhoneNumber,
    saveCustomerUser,
    fieldsNotValid,
    signupData,
    enableReCaptcha,
    closeModal,
    handleChangePromotions,
    isCustomerMode,
    checkPhoneCodeState,
    generateOtpCode,
    numOtpInputs,
    setWillVerifyOtpState,
    willVerifyOtpState,
    setOtpState,
    otpState,
    setSignUpTab,
    signUpTab,
    useSignUpFullDetails,
    useSignUpOtpEmail,
    useSignUpOtpCellphone,
    useSignUpOtpWhatsapp,
    isGuest,
    // implementation notes"Sign up for faster checkout" prefills name, lastname and
    // email from the guest's own session data; applied once on mount through
    // handleChangeInput so the existing signupData -> setValue sync fills them
    initialValues
  } = props
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const [{ configs }] = useConfig()
  const theme = useTheme()
  const submitOptions = slotButtonOptions(theme, AUTH_FORM, 'submit', { color: 'primary', size: 'lg' })
  const cancelOptions = slotButtonOptions(theme, AUTH_FORM, 'cancel', { color: 'secondary', size: 'lg' })
  const partnerOptions = slotButtonOptions(theme, AUTH_FORM, 'partner', { color: 'primary', appearance: 'tonal' })
  // the labels above the fields: the id each label points at
  const fieldsId = useId()
  const updatedBusinessSlug = singleStoreSlug(theme, settings)
  const formMethods = useForm()
  const [events] = useEvent()
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [recaptchaConfig] = useRecaptcha(enableReCaptcha)
  const [reCaptchaVersion, setRecaptchaVersion] = useState({ version: '', siteKey: '' })
  const [, { login }] = useSession()
  const googleLoginEnabled = configs?.google_login_enabled?.value === '1'
  const facebookLoginEnabled = configs?.facebook_login_enabled?.value === '1'
  const appleLoginEnabled = configs?.apple_login_enabled?.value === '1'
  const facebookAppId = validFacebookAppId(configs?.facebook_id?.value)

  const [otpLeftTime, , resetOtpLeftTime] = useCountdownTimer(600, !checkPhoneCodeState?.loading && willVerifyOtpState)
  const [userPhoneNumber, setUserPhoneNumber] = useState('')
  const [isValidPhoneNumber, setIsValidPhoneNumber] = useState(null)
  const [passwordSee, setPasswordSee] = useState(false)
  const [, setCurrentPhoneNumber] = useState(null)
  const otpChannelRef = useRef(2)

  const showInputPhoneNumber = (validationFields?.fields?.checkout?.cellphone?.enabled ?? false) || configs?.verification_phone_required?.value === '1'

  const initParams = {
    client_id: configs?.google_login_client_id?.value,
    cookiepolicy: 'single_host_origin',
    scope: 'profile'
  }

  const handleSuccessFacebook = (user) => {
    login({
      user,
      token: user?.session?.access_token
    })
  }

  const handleSuccessApple = (user) => {
    login({
      user,
      token: user?.session?.access_token
    })
  }

  const handleSuccessGoogle = (user) => {
    login({
      user,
      token: user?.session?.access_token
    })
  }

  const togglePasswordView = () => {
    setPasswordSee(!passwordSee)
  }

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
  }

  const handleGoToPage = (data) => {
    events.emit('go_to_page', data)
    closeModal && closeModal()
  }

  const handleSendOtp = () => {
    if (otpLeftTime < 520 && willVerifyOtpState) {
      resetOtpLeftTime()
      onSubmit()
    }
  }

  const handleSignUpTab = (tab) => {
    setSignUpTab(tab)
    formMethods.clearErrors()
  }

  const onSubmit = async () => {
    const isPhoneNumberValid = userPhoneNumber ? isValidPhoneNumber : true
    if (!userPhoneNumber &&
      ((validationFields?.fields?.checkout?.cellphone?.enabled &&
        validationFields?.fields?.checkout?.cellphone?.required) ||
        configs?.verification_phone_required?.value === '1') && signUpTab !== 'otpEmail'
    ) {
      setAlertState({
        open: true,
        content: [t('VALIDATION_ERROR_MOBILE_PHONE_REQUIRED', 'The field Mobile phone is required.')]
      })
      return
    }
    if (!isPhoneNumberValid && signUpTab !== 'otpEmail') {
      setAlertState({
        open: true,
        content: [t('INVALID_ERROR_PHONE_NUMBER', 'The Phone Number field is invalid')]
      })
      return
    }
    if (signUpTab === 'otpEmail' || signUpTab === 'otpCellphone') {
      generateOtpCode(null, otpChannelRef.current)
      return
    }
    handleButtonSignupClick && handleButtonSignupClick()
    if (!formState.loading && formState.result.result && !formState.result.error) {
      handleSuccessSignup(formState.result.result)
    }
  }

  // the phone as the controller's fields (country_phone_code, cellphone)
  const phoneFields = (number, isValid) => {
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
    return phoneNumber
  }

  const handleChangePhoneNumber = (number, isValid) => {
    if (formMethods.errors?.cellphone?.type === 'server') formMethods.clearErrors('cellphone')
    setUserPhoneNumber(number)
    handleChangeInput(phoneFields(number, isValid), true)
  }

  const handleChangeInputEmail = (e) => {
    if (formMethods.errors?.email?.type === 'server') formMethods.clearErrors('email')
    handleChangeInput({ target: { name: 'email', value: e.target.value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, '') } })
    formMethods.setValue('email', e.target.value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, ''))
  }

  useEffect(() => {
    if (!formState.loading && formState.result?.error) {
      if (formState.result?.result?.[0] === 'ERROR_AUTH_VERIFICATION_CODE' || formState.result?.error_codes?.includes('ERROR_AUTH_VERIFICATION_CODE')) {
        if (configs?.security_recaptcha_site_key?.value) {
          setRecaptchaVersion({ version: 'v2', siteKey: configs?.security_recaptcha_site_key?.value })
        }
        setAlertState({
          open: true,
          content: [t('TRY_AGAIN', 'Please try again')]
        })
        return
      }
      const fields = willVerifyOtpState
        ? []
        : Object.keys(validationFields?.fields?.checkout ?? {}).filter((field) =>
          showField?.(field) && (signUpTab === 'default' || (field === 'email' && signUpTab === 'otpEmail'))
        )
      if (!willVerifyOtpState && signUpTab === 'default' && !fieldsNotValid?.includes('password')) fields.push('password')
      if (!willVerifyOtpState && showInputPhoneNumber && (signUpTab === 'default' || signUpTab === 'otpCellphone')) fields.push('cellphone')
      const message = applyFormApiErrors(t, formState.result, fields, (name, error) => {
        formMethods.setError(name, error)
      })
      setAlertState({ open: !!message, content: message })
    } else if (!formState.loading && !formState.result?.error && formState.result?.result) {
      saveCustomerUser && saveCustomerUser(formState.result?.result)
    }
  }, [formState])

  useEffect(() => {
    Object.keys(signupData).map(fieldName => {
      formMethods.setValue(fieldName, signupData[fieldName])
    })
  }, [signupData])

  useEffect(() => {
    if (externalPhoneNumber) {
      setUserPhoneNumber(externalPhoneNumber)
      handleChangePhoneNumber(externalPhoneNumber, true)
    }
  }, [externalPhoneNumber])

  // implementation notesapplied once, on mount only (not every time the parent's
  // props re-render), so it never overwrites what the person is typing
  const appliedInitialValues = useRef(false)
  useEffect(() => {
    if (appliedInitialValues.current || !initialValues) return
    appliedInitialValues.current = true
    const many = {}
    Object.entries(initialValues).forEach(([name, value]) => {
      if (value) many[name] = { name, value }
    })
    // the controller merges each call into the signupData of its render, so this call would undo the
    // external phone's, made just before on mount: it carries the phone too
    if (Object.keys(many).length && externalPhoneNumber) Object.assign(many, phoneFields(externalPhoneNumber, true))
    if (Object.keys(many).length) handleChangeInput(many, true)
  }, [])

  useEffect(() => {
    if (signUpTab === 'default' || signUpTab === 'otpCellphone') {
      formMethods.register('cellphone', {
        required: isRequiredField('cellphone')
          ? t('VALIDATION_ERROR_MOBILE_PHONE_REQUIRED', 'The field Mobile phone is required').replace('_attribute_', t('CELLPHONE', 'Cellphone'))
          : null
      })
    } else {
      formMethods.unregister('cellphone')
    }
  }, [formMethods, signUpTab])

  useEffect(() => {
    if (checkPhoneCodeState?.result?.error) {
      showToast(ToastType.Error, getFormApiFeedback(t, checkPhoneCodeState.result).message)
    } else if (checkPhoneCodeState?.result?.result && checkPhoneCodeState?.result?.result?.[0] === 'VERIFICATION_CODE_WAS_SENT_TO') {
      showToast(ToastType.Success, t('CODE_SENT', 'The code has been sent'))
      resetOtpLeftTime()
    }
  }, [checkPhoneCodeState])

  useEffect(() => {
    if (recaptchaConfig?.siteKey) {
      setRecaptchaVersion({ version: recaptchaConfig?.version, siteKey: recaptchaConfig?.siteKey })
    }
  }, [recaptchaConfig])

  const preventWhiteSpaceOnKeyDown = (e) => {
    if (e.key === ' ') {
      e.preventDefault()
    }
  }

  return (
    <SignUpContainer data-doc-section='authentication-signup' data-doc-state={signUpTab} isPopup={isPopup}>
      <FormSide isPopup={isPopup}>
        <ComponentScope group={AUTH_FORM}>
        <ModalHeading as={Title}>{t('SIGN_UP', 'Sign up')}</ModalHeading>
        {((Number(useSignUpFullDetails) + Number(useSignUpOtpEmail) + Number(useSignUpOtpCellphone)) > 1 && !willVerifyOtpState) && (
          <SignupWith isPopup={isPopup}>
            <RadioGroup
              {...authTabsProps(theme)}
              segmented
              layout='scroll'
              aria-label={t('SIGN_UP', 'Sign up')}
              value={signUpTab}
              onValueChange={handleSignUpTab}
            >
              {useSignUpFullDetails && (
                <Radio appearance='segment' value='default' label={t('DEFAULT', 'Default')} onClick={() => signUpTab === 'default' && formMethods.clearErrors()} />
              )}
              {useSignUpOtpEmail && (
                <Radio appearance='segment' value='otpEmail' label={t('BY_OTP_EMAIL', 'by Otp Email')} onClick={() => signUpTab === 'otpEmail' && formMethods.clearErrors()} />
              )}
              {useSignUpOtpCellphone && (
                <Radio appearance='segment' value='otpCellphone' label={t('BY_OTP_PHONE', 'by Otp Phone')} onClick={() => signUpTab === 'otpCellphone' && formMethods.clearErrors()} />
              )}
            </RadioGroup>
          </SignupWith>
        )}
        {(!willVerifyOtpState) && (
          <FormInput
            noValidate
            isPopup={isPopup}
            onSubmit={formMethods.handleSubmit(onSubmit)}
            isSkeleton={useChekoutFileds && validationFields?.loading}
            autoComplete='on'
          >
            {
              !(useChekoutFileds && validationFields?.loading)
                ? (
                <>
                  {validationFields?.fields?.checkout &&
                    sortInputFields({ values: validationFields?.fields?.checkout }).map(field =>
                      showField && showField(field.code) && (
                        <React.Fragment key={field.id ?? field.code}>
                          {field.code === 'email'
                            ? (
                            <>
                              {(signUpTab === 'default' || signUpTab === 'otpEmail') && (
                                <InputContainer>
                                  {['required', 'server'].includes(formMethods.errors?.email?.type) && !notValidationFields.includes(field.code) && (
                                    <ValidationText id={`${fieldsId}-email-error`}>
                                      {formMethods.errors.email.message} {formMethods.errors.email.type === 'required' && '*'}
                                    </ValidationText>
                                  )}
                                  {formMethods.errors?.email?.type === 'pattern' && !notValidationFields.includes(field.code) && (
                                    <ValidationText id={`${fieldsId}-email-error`}>
                                      {t('INVALID_ERROR_EMAIL', 'Invalid email address').replace('_attribute_', t('EMAIL', 'Email'))}
                                    </ValidationText>
                                  )}
                                  <LabeledField label={t(field.code.toUpperCase(), field.name || field.code)} htmlFor={`${fieldsId}-${field.code}`}>
                                      <Input
                                        id={`${fieldsId}-${field.code}`}
                                        type={field.type}
                                        name={field.code}
                                        aria-label={t(field.code.toUpperCase(), field.name || field.code)}
                                        placeholder={isCustomerMode ? t(field.code.toUpperCase() + '_OPTIONAL', field.name + ' (Optional)') : t(field.code.toUpperCase(), field.name)}
                                        onChange={handleChangeInputEmail}
                                        ref={formMethods.register({
                                          required: !isCustomerMode && isRequiredField(field.code)
                                            ? t('VALIDATION_ERROR_EMAIL_REQUIRED', 'The field Email is required').replace('_attribute_', t('EMAIL', 'Email'))
                                            : null,
                                          pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
                                        })}
                                        onKeyDown={preventWhiteSpaceOnKeyDown}
                                        required={!!field.required && !isCustomerMode}
                                        autoComplete='on'
                                        invalid={!!formMethods.errors?.email && !notValidationFields.includes(field.code)}
                                        aria-describedby={formMethods.errors?.email ? `${fieldsId}-email-error` : undefined}
                                      />
                                  </LabeledField>
                                </InputContainer>
                              )}
                            </>
                              )
                            : (
                            <>
                              {(signUpTab === 'default') && (
                                <InputContainer>
                                  {formMethods.errors?.[`${field.code}`] && !notValidationFields.includes(field.code) && (
                                    <ValidationText id={`${fieldsId}-${field.code}-error`}>
                                      {formMethods.errors[field.code].message} {formMethods.errors[field.code].type === 'required' && '*'}
                                    </ValidationText>
                                  )}
                                  <LabeledField label={t(field.code.toUpperCase(), field.name || field.code)} htmlFor={`${fieldsId}-${field.code}`}>
                                      <Input
                                        id={`${fieldsId}-${field.code}`}
                                        type={field.type}
                                        name={field.code}
                                        aria-label={t(field.code.toUpperCase(), field.name || field.code)}
                                        placeholder={t(field.code.toUpperCase(), field.name)}
                                        onChange={handleChangeInput}
                                        ref={formMethods.register({
                                          required: isRequiredField(field.code)
                                            ? t(`VALIDATION_ERROR_${field.code.toUpperCase()}_REQUIRED`, `${field.name} is required`).replace('_attribute_', t(field.name, field.code))
                                            : null
                                        })}
                                        required={field.required}
                                        autoComplete='off'
                                        invalid={!!formMethods.errors?.[field.code] && !notValidationFields.includes(field.code)}
                                        aria-describedby={formMethods.errors?.[field.code] && !notValidationFields.includes(field.code) ? `${fieldsId}-${field.code}-error` : undefined}
                                      />
                                  </LabeledField>
                                </InputContainer>
                              )}
                            </>
                              )}
                        </React.Fragment>
                      )
                    )}

                  {(signUpTab === 'default' && (!fieldsNotValid || (fieldsNotValid && !fieldsNotValid.includes('password')))) && (
                    <>
                      {formMethods.errors?.password && (
                        <ValidationText id={`${fieldsId}-password-error`}>
                          {formMethods.errors?.password?.message} {formMethods?.errors?.password?.type === 'required' && '*'}
                        </ValidationText>
                      )}
                      <LabeledField label={t('PASSWORD', 'Password')} htmlFor={`${fieldsId}-password`}>
                          <Input
                            id={`${fieldsId}-password`}
                            type={!passwordSee ? 'password' : 'text'}
                            name='password'
                            aria-label={t('PASSWORD', 'Password')}
                            placeholder={t('PASSWORD', 'Password')}
                            onChange={handleChangeInput}
                            required
                            ref={formMethods.register({
                              required: isRequiredField('password') ? t('VALIDATION_ERROR_PASSWORD_REQUIRED', 'The field Password is required').replace('_attribute_', t('PASSWORD', 'password')) : null,
                              minLength: {
                                value: 8,
                                message: t('VALIDATION_ERROR_PASSWORD_MIN_STRING', 'The Password must be at least 8 characters.').replace('_attribute_', t('PASSWORD', 'Password')).replace('_min_', 8)
                              }
                            })}
                            invalid={!!formMethods.errors?.password}
                            aria-describedby={formMethods.errors?.password ? `${fieldsId}-password-error` : undefined}
                            suffix={(
                              <Button
                                shape='icon'
                                size='xs'
                                appearance='ghost'
                                color='neutral'
                                type='button'
                                onClick={togglePasswordView}
                                aria-label={passwordSee ? t('HIDE_PASSWORD', 'Hide password') : t('SHOW_PASSWORD', 'Show password')}
                                aria-pressed={!!passwordSee}
                              >
                                <Icon name={!passwordSee ? 'eye' : 'eyeInvisible'} />
                              </Button>
                            )}
                          />
                      </LabeledField>
                    </>
                  )}
                  {(!!showInputPhoneNumber && (signUpTab === 'default' || signUpTab === 'otpCellphone')) && (
                    <>
                      {formMethods.errors?.cellphone && formMethods.errors.cellphone.type !== 'server' && !userPhoneNumber && (
                        <ValidationText>
                          {formMethods.errors?.cellphone?.message} {formMethods?.errors?.cellphone?.type === 'required' && '*'}
                        </ValidationText>
                      )}
                      <InputPhoneNumber
                        label={t('PHONE', 'Phone')}
                        showPhoneIcon
                        value={userPhoneNumber}
                        currentCountryCode={signupData?.country_phone_code}
                        setValue={handleChangePhoneNumber}
                        handleIsValid={setIsValidPhoneNumber}
                        setCurrentPhoneNumber={setCurrentPhoneNumber}
                        isError={formMethods.errors?.cellphone?.type === 'server' || !!(formMethods.errors?.cellphone && !userPhoneNumber)}
                        errorText={formMethods.errors?.cellphone?.type === 'server' ? formMethods.errors.cellphone.message : null}
                      />
                    </>
                  )}
                </>
                  )
                : (
                <>
                  {[...Array(5)].map((_, i) => (
                    <SkeletonWrapper key={i}>
                      <Skeleton height={themeControlHeight(theme, 'input')} />
                    </SkeletonWrapper>
                  ))}
                </>
                  )
            }
            {props.isRecaptchaEnable && enableReCaptcha && (
              <ReCaptchaWrapper>
                <ReCaptcha handleReCaptcha={handleReCaptcha} reCaptchaVersion={reCaptchaVersion} />
              </ReCaptchaWrapper>
            )}

            <CheckboxArea>
              {configs?.terms_and_conditions?.value === 'true' && !isCustomerMode && (
                <>
                  {formMethods.errors?.acceptTerms && (
                    <ValidationText>
                      {formMethods.errors?.acceptTerms?.message} *
                    </ValidationText>
                  )}
                  <TermsConditionWrapper>
                    <Checkbox
                      name='acceptTerms'
                      inputRef={formMethods.register({
                        required: t('ERROR_ACCEPT_TERMS', 'You must accept the Terms & Conditions.')
                      })}
                      label={(
                        <span>
                          <span>{t('TERMS_AND_CONDITIONS_TEXT', 'I’m agree with')}</span>
                          <a
                            href={configs?.terms_and_conditions_url?.value}
                            target='_blank'
                            rel='noopener noreferrer'
                          >
                            {t('TERMS_AND_CONDITIONS', 'Terms & Conditions')}
                          </a>
                        </span>
                      )}
                      id='acceptTerms'
                    />
                  </TermsConditionWrapper>
                </>

              )}
              {(signUpTab === 'default') && !isCustomerMode && signupPromotionsVisible(theme) && (
                <PromotionsWrapper>
                  <Checkbox
                    name='promotions'
                    id='promotions'
                    label={t('RECEIVE_NEWS_EXCLUSIVE_PROMOTIONS', 'Receive newsletters and exclusive promotions')}
                    onCheckedChange={handleChangePromotions}
                  />
                </PromotionsWrapper>
              )}
            </CheckboxArea>

            {(signUpTab === 'otpCellphone' && useSignUpOtpWhatsapp)
              ? (
              <div style={{ display: 'flex', gap: themeSpace(theme, 'md'), width: '100%' }}>
                <Button
                  type='button'
                  disabled={formState.loading || validationFields?.loading}
                  onClick={() => { otpChannelRef.current = 2; formMethods.handleSubmit(onSubmit)() }}
                  style={{ flex: 1 }}
                  {...submitOptions}
                  cta
                  fullWidth
                >
                  {formState.loading
                    ? `${t('LOADING', 'Loading')}...`
                    : t('SEND_BY_SMS', 'Send by SMS')}
                </Button>
                <Button
                  type='button'
                  disabled={formState.loading || validationFields?.loading}
                  onClick={() => { otpChannelRef.current = 4; formMethods.handleSubmit(onSubmit)() }}
                  style={{ flex: 1 }}
                  {...submitOptions}
                  cta
                  fullWidth
                >
                  {formState.loading
                    ? `${t('LOADING', 'Loading')}...`
                    : t('SEND_BY_WHATSAPP', 'Send by WhatsApp')}
                </Button>
              </div>
                )
              : (
              <Button
                data-doc-control='authentication-signup-submit'
                {...submitOptions}
                fullWidth
                type='submit'
                disabled={formState.loading || validationFields?.loading}
              >
                {formState.loading
                  ? `${t('LOADING', 'Loading')}...`
                  : signUpTab === 'default'
                    ? t('CREATE_AN_ACCOUNT', 'Create an account')
                    : t('GET_VERIFY_CODE', 'Get verify code')}
              </Button>
                )}
          </FormInput>
        )}
        {(willVerifyOtpState) && (
          <OtpStep isPopup={isPopup}>
            <CountdownTimer>
              <span>{formatSeconds(otpLeftTime)}</span>
            </CountdownTimer>
            <InputCode
              length={numOtpInputs || 6}
              value={otpState}
              onChange={setOtpState}
              autoFocus
            />
            <ResendCode disabled={otpLeftTime > 520} onClick={handleSendOtp}>
              {t('LANG_SEND_AGAIN', 'Send again')}?
            </ResendCode>
            <Button
              type='button'
              {...cancelOptions}
              disabled={formState.loading}
              onClick={() => { setWillVerifyOtpState(false) }}
            >
              {t('CANCEL', 'Cancel')}
            </Button>
          </OtpStep>
        )}

        {(checkPhoneCodeState?.loading) && (
          <SpinnerLoader size='md' />
        )}
        {elementLinkToLogin && authLoginLinkVisible(theme) && (
          <RedirectLink register isPopup={isPopup}>
            <span>{t('MOBILE_FRONT_ALREADY_HAVE_AN_ACCOUNT', 'Already have an account?')}</span>
            {elementLinkToLogin}
          </RedirectLink>
        )}
        {/* the business and driver sign ups, unless the theme hides them
            (visibility auth.partner_signup) */}
        {Object.keys(configs).length > 0 && !isGuest && (
          configs?.business_signup_allow?.value === '1' || configs?.driver_signup_allow?.value === '1'
        ) && !isCustomerMode && themeVisible(theme, 'auth.partner_signup') &&
          (
            <BussinessAndDriverSignUp>
              {configs?.business_signup_allow?.value === '1' && !updatedBusinessSlug && (
                <TouchSlot>
                  <Button
                    {...partnerOptions}
                    fullWidth
                    coarseTouch
                    onClick={() => handleGoToPage({ page: 'signup_business' })}
                  >
                    {t('SIGNUP_FOR_BUSINESS', 'Sign up for business')}
                  </Button>
                </TouchSlot>
              )}
              {configs?.driver_signup_allow?.value === '1' && (
                <TouchSlot>
                  <Button
                    {...partnerOptions}
                    fullWidth
                    coarseTouch
                    onClick={() => handleGoToPage({ page: 'signup_driver' })}
                  >
                    {t('SIGNUP_FOR_DRIVER', 'Sign up for driver')}
                  </Button>
                </TouchSlot>
              )}
            </BussinessAndDriverSignUp>
          )}
        {!externalPhoneNumber && !isCustomerMode && authSocialVisible(theme) && (
          <>
            {Object.keys(configs).length > 0
              ? (
              <SocialButtons isPopup={isPopup}>
                {facebookLoginEnabled && facebookAppId && (
                  <FacebookLoginButton
                    appId={facebookAppId}
                    handleSuccessFacebookLogin={handleSuccessFacebook}
                  />
                )}
                {configs?.apple_login_client_id?.value && appleLoginEnabled && (
                  <AppleLogin
                    onSuccess={handleSuccessApple}
                    onFailure={() => setAlertState({
                      open: true,
                      content: t('TRY_AGAIN', 'Please try again')
                    })}
                  />
                )}
                {configs?.google_login_client_id?.value && configs?.google_login_auth_domain?.value && configs?.google_login_api_key?.value && googleLoginEnabled && (
                  <GoogleLoginButton
                    initParams={initParams}
                    handleSuccessGoogleLogin={handleSuccessGoogle}
                  />
                )}
              </SocialButtons>
                )
              : (
              <SkeletonSocialWrapper>
                <Skeleton height={themeControlHeight(theme, 'button', 'lg')} />
              </SkeletonSocialWrapper>
                )}
          </>
        )}
        </ComponentScope>
      </FormSide>
      <Alert
        title={t('SIGN_UP', 'Sign up')}
        content={alertState.content}
        acceptText={t('CLOSE', 'Close')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
    </SignUpContainer>
  )
}

export const SignUpForm = (props) => {
  const _numOtpInputs = 6
  const loginControllerProps = {
    ...props,
    isRecaptchaEnable: true,
    numOtpInputs: _numOtpInputs,
    UIComponent: SignUpFormUI
  }
  return <SignUpController {...loginControllerProps} />
}
