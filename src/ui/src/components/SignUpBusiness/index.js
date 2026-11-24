import React, { useState, useEffect, useRef, useId } from 'react'
import { useForm } from 'react-hook-form'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import parsePhoneNumber from 'libphonenumber-js'
import { useTheme } from 'styled-components'

import {
  SignupBusinessContainer,
  SignupDescriptionContainer,
  SignupBackgroundBand,
  SignupDescriptionTitle,
  SignupDescriptionContent,
  FormInput,
  SignUpTitle,
  ReCaptchaWrapper,
  TermsConditionWrapper,
  TermsLabel,
  SkeletonWrapper,
  FormSide,
  PhoneNumberWrapper,
  SignupLoadingContainer,
  FieldItem,
  FieldError,
  RedirectLink
} from './styles'

import { SignupForm as SignUpController } from '~components/components/SignupForm'
import { applyFormApiErrors } from '~/utils/formApiFeedback'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { ReCaptcha } from '~components/components/ReCaptcha'
import { useApi } from '~components/contexts/ApiContext'
import { useSite } from '~components/contexts/SiteContext'
import { getSiteName } from '~/utils/siteBranding'

import { Alert } from '~ui/src/components/Confirm'
import { InputPhoneNumber } from '~ui/src/components/InputPhoneNumber'
import { Input } from '~ui/src/design-system/components/Input'
import { LabeledField } from '~ui/src/styles/Field'
import { Button } from '~ui/src/design-system/components/Button'
import { Checkbox } from '~ui/src/design-system/components/Checkbox'
import { sortInputFields } from '~ui/utils'
import { useRecaptcha } from '~ui/hooks/useRecaptcha'
import { SpinnerLoader } from '~ui/src/components/SpinnerLoader'

import { Icon } from '~ui/src/design-system/components/Icon'
import { themeControlHeight, themeImage } from '~/utils/themeTokens'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { AUTH_FORM, authLoginLinkVisible } from '~/utils/authForm'
import { slotButtonOptions } from '~/utils/themeGroups'
import { usePageSections } from '~ui/hooks/usePageSections'

const notValidationFields = ['coupon', 'driver_tip', 'mobile_phone', 'address', 'address_notes']

const SignUpBusinessUI = (props) => {
  const {
    handleChangeInput,
    handleButtonSignupClick,
    handleReCaptcha,
    useChekoutFileds,
    validationFields,
    showField,
    isRequiredField,
    formState,
    handleSuccessSignup,
    externalPhoneNumber,
    saveCustomerUser,
    fieldsNotValid,
    signupData,
    elementLinkToLogin,
    enableReCaptcha
  } = props

  const theme = useTheme()
  // the labels above the fields: the id each label points at
  const fieldsId = useId()
  const [{ site }] = useSite()
  // The site's name in the description (the domain when the site has none)
  const siteName = getSiteName({ theme, site, fallback: typeof window !== 'undefined' ? window.location.hostname : '' })
  // The sections of the page (pages.signup_business): the image band (fixed, on top)
  // and the description and the form, in the theme's order
  const { isVisible, render } = usePageSections('signup_business')
  const [languageState, t] = useLanguage()
  const [{ configs }] = useConfig()
  const [ordering] = useApi()
  const formMethods = useForm()
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [recaptchaConfig] = useRecaptcha(enableReCaptcha)
  const [reCaptchaVersion, setRecaptchaVersion] = useState({ version: '', siteKey: '' })
  const [pageContent, setPageContent] = useState({ body: null, loading: true })
  const emailInput = useRef(null)
  const pendingSignupSuccess = useRef(false)

  const [userPhoneNumber, setUserPhoneNumber] = useState('')
  const [isValidPhoneNumber, setIsValidPhoneNumber] = useState(null)
  // the phone's error after a submit (required), shown under the field
  const [phoneError, setPhoneError] = useState(null)
  const [passwordSee, setPasswordSee] = useState(false)

  const languageCode = languageState?.language?.code
  // the page's one image, its background: the theme's
  // (signup.business_background, the bundle's without one)
  const backgroundImage = themeImage(theme, 'signup.business_background')
  const showInputPhoneNumber = (validationFields?.fields?.checkout?.cellphone?.enabled ?? false) || configs?.verification_phone_required?.value === '1'

  const togglePasswordView = () => {
    setPasswordSee(!passwordSee)
  }

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
  }

  // A field's error (react-hook-form), under it and tied to it
  const errorId = (code) => `${fieldsId}-${code}-error`
  const errorProps = (code) => {
    const error = formMethods.errors?.[code]
    return error
      ? { invalid: true, 'aria-describedby': errorId(code) }
      : {}
  }
  const fieldError = (code) => {
    const message = formMethods.errors?.[code]?.message
    return message ? <FieldError id={errorId(code)}>{message}</FieldError> : null
  }

  const onSubmit = () => {
    const isPhoneNumberValid = userPhoneNumber ? isValidPhoneNumber : true
    if (!userPhoneNumber &&
      ((validationFields?.fields?.checkout?.cellphone?.enabled &&
        validationFields?.fields?.checkout?.cellphone?.required) ||
        configs?.verification_phone_required?.value === '1')
    ) {
      const message = t('VALIDATION_ERROR_MOBILE_PHONE_REQUIRED', 'The field Mobile phone is required.')
      setPhoneError(message)
      return
    }
    if (!isPhoneNumberValid) {
      // the field shows its own invalid message
      setPhoneError(true)
      return
    }
    // fire success from the resolved result (see effect below), not the
    // render-time formState — which held the previous attempt's result
    // (double-fire) or was null on the first submit (crash on .result).
    pendingSignupSuccess.current = true
    handleButtonSignupClick && handleButtonSignupClick()
  }

  const handleChangePhoneNumber = (number, isValid) => {
    if (formMethods.errors?.cellphone?.type === 'server') formMethods.clearErrors('cellphone')
    setUserPhoneNumber(number)
    setPhoneError(null)

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
    }
    if (phoneNumberParser) {
      phoneNumber = {
        country_phone_code: {
          name: 'country_phone_code',
          value: phoneNumberParser.countryCallingCode
        },
        cellphone: {
          name: 'cellphone',
          value: phoneNumberParser.nationalNumber
        }
      }
    }
    handleChangeInput(phoneNumber, true)
  }

  const handleChangeInputEmail = (e) => {
    if (formMethods.errors?.email?.type === 'server') formMethods.clearErrors('email')
    handleChangeInput({ target: { name: 'email', value: e.target.value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, '') } })
    formMethods.setValue('email', e.target.value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, ''))
    if (emailInput?.current) {
      emailInput.current.value = e.target.value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, '')
    }
  }

  useEffect(() => {
    if (!formState.loading && formState.result?.error) {
      // Failed attempt — drop the pending flag so a later unrelated success
      // state cannot fire handleSuccessSignup for this submit.
      pendingSignupSuccess.current = false
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
      const fields = Object.keys(validationFields?.fields?.checkout ?? {}).filter((field) =>
        showField?.(field)
      )
      if (!fieldsNotValid?.includes('password')) fields.push('password')
      if (showInputPhoneNumber) fields.push('cellphone')
      const message = applyFormApiErrors(t, formState.result, fields, (name, error) => {
        if (name === 'cellphone') setPhoneError(error.message)
        else formMethods.setError(name, error)
      })
      setAlertState({ open: !!message, content: message })
    } else if (!formState.loading && !formState.result?.error && formState.result?.result) {
      saveCustomerUser && saveCustomerUser(formState.result?.result)
      // run the success handler once, with this attempt's fresh result.
      if (pendingSignupSuccess.current) {
        pendingSignupSuccess.current = false
        handleSuccessSignup && handleSuccessSignup(formState.result?.result)
      }
    }
  }, [formState])

  useEffect(() => {
    if (!validationFields.loading) {
      Object.values(validationFields?.fields?.checkout).map(field => !notValidationFields.includes(field.code) && (
        field.code === 'email'
          ? (
              formMethods.register('email', {
                required: isRequiredField(field.code)
                  ? t('VALIDATION_ERROR_EMAIL_REQUIRED', 'The field Email is required').replace('_attribute_', t('EMAIL', 'Email'))
                  : null,
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: t('INVALID_ERROR_EMAIL', 'Invalid email address').replace('_attribute_', t('EMAIL', 'Email'))
                }
              })
            )
          : (
              formMethods.register(field.code, {
                required: isRequiredField(field.code)
                  ? t(`VALIDATION_ERROR_${field.code.toUpperCase()}_REQUIRED`, `${field.name} is required`).replace('_attribute_', t(field.name, field.code))
                  : null
              })
            )
      ))
    }
  }, [formMethods])

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

  useEffect(() => {
    if (recaptchaConfig?.siteKey) {
      setRecaptchaVersion({ version: recaptchaConfig?.version, siteKey: recaptchaConfig?.siteKey })
    }
  }, [recaptchaConfig])

  useEffect(() => {
    handleChangeInput({
      target: {
        name: 'level',
        value: 2
      }
    })
  }, [])

  const getPageContent = async () => {
    setPageContent({ body: null, loading: true })
    try {
      if (languageCode) {
        const { content: { error: langError, result: langResult } } = await ordering
          .pages(`signup_business_${languageCode}`)
          .get()

        if (!langError && langResult?.body && langResult?.enabled) {
          setPageContent({ body: langResult.body, loading: false })
          return
        }
      }

      const { content: { error, result } } = await ordering.pages('signup_business').get()

      if (!error && result?.body && result?.enabled) {
        setPageContent({ body: result.body, loading: false })
      } else {
        setPageContent({ body: null, loading: false })
      }
    } catch (err) {
      setPageContent({ body: null, loading: false })
    }
  }

  useEffect(() => {
    getPageContent()
  }, [languageCode])

  if (pageContent.loading) {
    return (
      <SignupLoadingContainer>
        <SpinnerLoader />
      </SignupLoadingContainer>
    )
  }

  if (pageContent.body) {
    return <div dangerouslySetInnerHTML={{ __html: pageContent.body }} />
  }

  return (
    <>
      {backgroundImage && isVisible('background_band') && <SignupBackgroundBand $image={backgroundImage} aria-hidden='true' />}
      <SignupBusinessContainer
        bgImage={backgroundImage}
        $veiled={isVisible('description')}
        data-doc-section='application-business'
        data-doc-state='native-form'
      >
        {render({
          description: () => (
        <SignupDescriptionContainer>
          <SignupDescriptionTitle $hasImage={!!backgroundImage}>{t('START_SELLING_WITH_US', 'Start Selling with us.')}</SignupDescriptionTitle>
          <SignupDescriptionContent $hasImage={!!backgroundImage}>{t('REGISTER_AS_NEW_BUSINESS_TERMS', 'Register as a new business owner and create your store to sell your products or services in _Domain_or_brand_ Website and Native Apps for iOS & Android.').split('_Domain_or_brand_').join(siteName)}</SignupDescriptionContent>
        </SignupDescriptionContainer>
          ),
          form: () => (
        <FormSide>
          <ComponentScope group={AUTH_FORM}>
          <SignUpTitle>{t('SIGN_UP_NOW', 'Sign up now')}</SignUpTitle>
          <FormInput
            noValidate
            onSubmit={formMethods.handleSubmit(onSubmit)}
          >
            {
              !(useChekoutFileds && validationFields?.loading)
                ? (
                <>
                  {validationFields?.fields?.checkout &&
                    sortInputFields({ values: validationFields?.fields?.checkout }).map(field =>
                      showField && showField(field.code) && (
                        <FieldItem key={field.id ?? field.code}>
                          {field.code === 'email'
                            ? (
                            <LabeledField label={t(field.code.toUpperCase(), field.name || field.code)} htmlFor={`${fieldsId}-${field.code}`}>
                              <Input
                                id={`${fieldsId}-${field.code}`}
                                type={field.type}
                                name={field.code}
                                aria-label={t(field.code.toUpperCase(), field.name || field.code)}
                                placeholder={t(field.code.toUpperCase(), field.name)}
                                onChange={handleChangeInputEmail}
                                ref={(e) => {
                                  emailInput.current = e
                                }}
                                required={!!field.required}
                                autoComplete='email'
                                {...errorProps(field.code)}
                              />
                            </LabeledField>
                              )
                            : (
                            <LabeledField label={t(field.code.toUpperCase(), field.name || field.code)} htmlFor={`${fieldsId}-${field.code}`}>
                              <Input
                                id={`${fieldsId}-${field.code}`}
                                type={field.type}
                                name={field.code}
                                aria-label={t(field.code.toUpperCase(), field.name || field.code)}
                                placeholder={t(field.code.toUpperCase(), field.name)}
                                onChange={(event) => {
                                  if (formMethods.errors?.[field.code]?.type === 'server') formMethods.clearErrors(field.code)
                                  handleChangeInput(event)
                                }}
                                required={field.required}
                                autoComplete='off'
                                {...errorProps(field.code)}
                              />
                            </LabeledField>
                              )}
                          {fieldError(field.code)}
                        </FieldItem>
                      )
                    )}
                  {!!showInputPhoneNumber && (
                    <PhoneNumberWrapper>
                      <InputPhoneNumber
                        label={t('PHONE', 'Phone')}
                        showPhoneIcon
                        value={userPhoneNumber}
                        setValue={handleChangePhoneNumber}
                        handleIsValid={setIsValidPhoneNumber}
                        isError={!!phoneError}
                        errorText={typeof phoneError === 'string' ? phoneError : null}
                      />
                    </PhoneNumberWrapper>
                  )}

                  {(!fieldsNotValid || (fieldsNotValid && !fieldsNotValid.includes('password'))) && (
                    <FieldItem>
                    <LabeledField label={t('PASSWORD', 'Password')} htmlFor={`${fieldsId}-password`}>
                      <Input
                        id={`${fieldsId}-password`}
                        type={!passwordSee ? 'password' : 'text'}
                        name='password'
                        aria-label={t('PASSWORD', 'Password')}
                        placeholder={t('PASSWORD', 'Password')}
                        onChange={handleChangeInput}
                        required
                        autoComplete='new-password'
                        {...errorProps('password')}
                        ref={formMethods.register({
                          required: isRequiredField('password') ? t('VALIDATION_ERROR_PASSWORD_REQUIRED', 'The field Password is required').replace('_attribute_', t('PASSWORD', 'password')) : null,
                          minLength: {
                            value: 8,
                            message: t('VALIDATION_ERROR_PASSWORD_MIN_STRING', 'The Password must be at least 8 characters.').replace('_attribute_', t('PASSWORD', 'Password')).replace('_min_', 8)
                          }
                        })}
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
                            {!passwordSee ? <Icon name='eye' /> : <Icon name='eyeInvisible' />}
                          </Button>
                        )}
                      />
                    </LabeledField>
                    {fieldError('password')}
                    </FieldItem>
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

            {configs?.terms_and_conditions?.value === 'true' && (
              <FieldItem>
              <TermsConditionWrapper>
                <Checkbox
                  name='acceptTerms'
                  inputRef={formMethods.register({
                    required: t('ERROR_ACCEPT_TERMS', 'You must accept the Terms & Conditions.')
                  })}
                  id={`${fieldsId}-acceptTerms`}
                  invalid={!!formMethods.errors?.acceptTerms}
                  aria-describedby={formMethods.errors?.acceptTerms ? errorId('acceptTerms') : undefined}
                  label={(
                    <TermsLabel>
                      <span>{t('TERMS_AND_CONDITIONS_TEXT', 'I’m agree with')}</span>
                      <a
                        href={configs?.terms_and_conditions_url?.value}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {t('TERMS_AND_CONDITIONS', 'Terms & Conditions')}
                      </a>
                    </TermsLabel>
                  )}
                />
              </TermsConditionWrapper>
              {fieldError('acceptTerms')}
              </FieldItem>
            )}

            <Button
              type='submit'
              {...slotButtonOptions(theme, AUTH_FORM, 'submit', { color: 'primary', size: 'lg' })}
              shape='text'
              loading={!!formState.loading}
              disabled={!!validationFields?.loading}
              data-doc-control='application-submit'
            >
              {t('SUBMIT', 'Submit')}
            </Button>
          </FormInput>
          {elementLinkToLogin && authLoginLinkVisible(theme) && (
            <RedirectLink>
              <span>{t('MOBILE_FRONT_ALREADY_HAVE_AN_ACCOUNT', 'Already have an account?')}</span>
              {elementLinkToLogin}
            </RedirectLink>
          )}
          </ComponentScope>
        </FormSide>
          )
        }, { group: 'main' })}
        <Alert
          title={t('SIGN_UP_FOR_BUSINESS', 'Sign up for business')}
          content={alertState.content}
          acceptText={t('CLOSE', 'Close')}
          open={alertState.open}
          onClose={() => closeAlert()}
          onAccept={() => closeAlert()}
          closeOnBackdrop={false}
        />
      </SignupBusinessContainer>
    </>
  )
}

export const SignUpBusiness = (props) => {
  const signUpBusinessProps = {
    ...props,
    UIComponent: SignUpBusinessUI
  }
  return <SignUpController {...signUpBusinessProps} />
}
