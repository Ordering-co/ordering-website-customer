import React, { useState, useEffect, useRef, useCallback, useId } from 'react'
import { useForm } from 'react-hook-form'
import { useTheme } from 'styled-components'
import parsePhoneNumber from 'libphonenumber-js'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import {
  LoginContainer,
  FormSide,
  FormInput,
  RedirectLink,
  SocialButtons,
  LoginWith,
  SkeletonSocialWrapper,
  CountdownTimer,
  ReCaptchaWrapper,
  Title,
  ValidationText,
  HeroSide,
  ResendCode
} from './styles'

import { LoginForm as LoginFormController } from '~components/components/LoginForm'
import { applyFormApiErrors, getFormApiFeedback } from '~/utils/formApiFeedback'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSite } from '~components/contexts/SiteContext'
import { getSiteName } from '~/utils/siteBranding'
import { useConfig } from '~components/contexts/ConfigContext'
import { useSession } from '~components/contexts/SessionContext'
import { useToast, ToastType } from '~components/contexts/ToastContext'
import { ReCaptcha } from '~components/components/ReCaptcha'
import { useApi } from '~components/contexts/ApiContext'
import { useOptimizationLoad } from '~components/contexts/OptimizationLoadContext'

import { Alert } from '~ui/src/components/Confirm'
import { SpinnerLoader } from '~ui/src/components/SpinnerLoader'
import { InputPhoneNumber } from '~ui/src/components/InputPhoneNumber'
import { Radio, RadioGroup } from '~ui/src/design-system/components/Checkbox'
import { Button } from '~ui/src/design-system/components/Button'
import { InputCode } from '~ui/src/design-system/components/InputCode'
import { Input } from '~ui/src/design-system/components/Input'
import { Icon } from '~ui/src/design-system/components/Icon'
import { LabeledField } from '~ui/src/styles/Field'
import { FacebookLoginButton } from '~ui/src/components/FacebookLogin'
import { GoogleLoginButton } from '~ui/src/components/GoogleLogin'
import { AppleLogin } from '~ui/src/components/AppleLogin'
import { useCountdownTimer } from '~ui/hooks/useCountdownTimer'
import { useRecaptcha } from '~ui/hooks/useRecaptcha'
import { formatSeconds } from '~ui/utils'
import { SmsLoginButton } from '~ui/src/components/SmsLogin'

import { themeControlHeight, themeSpace } from '~/utils/themeTokens'
import { themeVisible } from '~/utils/themeVisibility'
import { ModalHeading } from '~ui/src/components/Overlay/ModalHeading'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { AUTH_FORM, authSignupLinkVisible, authSocialVisible, authTabsProps } from '~/utils/authForm'
import { slotButtonOptions } from '~/utils/themeGroups'
import { validFacebookAppId } from '~/utils/integrationIds'

const LoginFormUI = (props) => {
  const {
    useLoginByEmail,
    useLoginByCellphone,
    handleChangeInput,
    handleReCaptcha,
    handleChangeTab,
    handleButtonLoginClick,
    handleSendVerifyCode,
    handleCheckPhoneCode,
    elementLinkToSignup,
    elementLinkToForgotPassword,
    formState,
    verifyPhoneState,
    checkPhoneCodeState,
    loginTab,
    isPopup,
    credentials,
    enableReCaptcha,
    useRootPoint,
    isCustomerMode,
    otpType,
    setOtpType,
    generateOtpCode,
    otpState,
    setOtpState,
    useLoginOtpEmail,
    useLoginOtpCellphone,
    useLoginOtpWhatsapp,
    handleLoginSpoonity,
    useLoginSpoonity,
    onAuthLoadingChange
  } = props
  const numOtpInputs = loginTab === 'otp' ? 6 : 4
  const [ordering, { setOrdering }] = useApi()
  const [, t] = useLanguage()
  const theme = useTheme()
  const [{ site }] = useSite()
  // with the labels above the fields: the id each label points at
  const fieldsId = useId()
  const [, { showToast }] = useToast()
  const [{ configs }] = useConfig()
  const [optimizationLoad] = useOptimizationLoad()
  const formMethods = useForm()
  const [recaptchaConfig] = useRecaptcha(enableReCaptcha)
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [reCaptchaVersion, setRecaptchaVersion] = useState({ version: '', siteKey: '' })
  const [, { login }] = useSession()
  const [passwordSee, setPasswordSee] = useState(false)
  const [loginWithOtpState, setLoginWithOtpState] = useState(false)
  const [willVerifyOtpState, setWillVerifyOtpState] = useState(false)
  const showEmailField = !willVerifyOtpState && (
    (useLoginByEmail && loginTab === 'email') || (loginTab === 'otp' && otpType === 'email') || (useLoginSpoonity && loginTab === 'spoonity')
  )
  const showPhoneField = !willVerifyOtpState && (
    (useLoginByCellphone && loginTab === 'cellphone') || (loginTab === 'otp' && otpType === 'cellphone')
  )
  const [validPhoneFieldState, setValidPhoneField] = useState(false)
  const [projectName, setProjectName] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [socialLoadingState, setSocialLoadingState] = useState({
    facebook: false,
    google: false,
    apple: false
  })

  const isSocialLoading = Object.values(socialLoadingState).some(Boolean)

  const handleFacebookLoadingChange = useCallback((loading) => {
    setSocialLoadingState(prev => ({ ...prev, facebook: loading }))
  }, [])

  const handleGoogleLoadingChange = useCallback((loading) => {
    setSocialLoadingState(prev => ({ ...prev, google: loading }))
  }, [])

  const handleAppleLoadingChange = useCallback((loading) => {
    setSocialLoadingState(prev => ({ ...prev, apple: loading }))
  }, [])

  const [otpLeftTime, , resetOtpLeftTime] = useCountdownTimer(
    600, !checkPhoneCodeState?.loading && willVerifyOtpState)
  const otpChannelRef = useRef(2)
  const isOtpCellphone = loginTab === 'otp' && otpType === 'cellphone'
  const initParams = {
    client_id: configs?.google_login_client_id?.value,
    cookiepolicy: 'single_host_origin',
    scope: 'profile'
  }

  const googleLoginEnabled = optimizationLoad?.result?.configs?.google_login_enabled?.value === '1'
  const facebookLoginEnabled = (
    optimizationLoad?.result?.configs?.facebook_login_enabled?.value ??
    configs?.facebook_login_enabled?.value
  ) === '1'
  const appleLoginEnabled = optimizationLoad?.result?.configs?.apple_login_enabled?.value === '1'
  const facebookAppId = validFacebookAppId(configs?.facebook_id?.value)

  const spoonityTitle = configs?.spoonity_title?.value

  const onSubmit = async () => {
    if (loginWithOtpState || loginTab === 'otp') {
      if (!validPhoneFieldState && (loginTab !== 'otp' || (otpType === 'cellphone' && loginTab === 'otp'))) {
        setAlertState({
          open: true,
          content: [t('INVALID_PHONE_NUMBER', 'Invalid phone number')]
        })

        return
      }
      if (loginTab === 'otp') {
        if (otpType === 'cellphone') {
          const { cellphone, countryPhoneCode } = parseNumber(credentials?.cellphone)
          generateOtpCode({ cellphone, countryPhoneCode }, otpChannelRef.current)
        } else {
          generateOtpCode(null, otpChannelRef.current)
        }
      }
      setWillVerifyOtpState(true)
    } else {
      if (projectName) {
        setOrdering({ ...ordering, project: projectName })
        localStorage.setItem('project_name', projectName)
        setSubmitted(true)
        return
      }
      if (loginTab === 'spoonity') {
        handleLoginSpoonity()
        return
      }
      handleButtonLoginClick()
    }
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
    if (checkPhoneCodeState?.result?.error || verifyPhoneState?.result?.error) {
      setOtpState('')
    }
  }

  const parseNumber = (unparsedNumber) => {
    if (!unparsedNumber) return {}

    const parsedNumber = parsePhoneNumber(unparsedNumber)
    const cellphone = parsedNumber?.nationalNumber
    const countryPhoneCode = +(parsedNumber?.countryCallingCode)

    return {
      cellphone,
      countryPhoneCode
    }
  }

  const handleChangeInputEmail = (e) => {
    if (formMethods.errors?.email?.type === 'server') formMethods.clearErrors('email')
    handleChangeInput({ target: { name: 'email', value: e.target.value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, '') } })
    formMethods.setValue('email', e.target.value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, ''))
  }

  const handleChangePhoneNumber = (number, isValid) => {
    if (formMethods.errors?.cellphone?.type === 'server') formMethods.clearErrors('cellphone')
    setValidPhoneField(isValid)
    handleChangeInput({ target: { name: 'cellphone', value: number } })
    formMethods.setValue('cellphone', number, '')
  }

  const handleChangeProject = (e) => {
    if (formMethods.errors?.project?.type === 'server') formMethods.clearErrors('project')
    setSubmitted(false)
    setProjectName(e.target.value)
  }

  const handleSendOtp = () => {
    if (willVerifyOtpState) {
      const { cellphone, countryPhoneCode } = parseNumber(credentials?.cellphone)

      resetOtpLeftTime()
      if (loginTab !== 'otp') {
        handleSendVerifyCode({
          cellphone,
          country_phone_code: countryPhoneCode
        })
      } else {
        onSubmit()
      }
    }
  }

  const handleChangeOtpType = (type) => {
    if (isSocialLoading) return
    handleChangeTab('otp')
    setOtpType(type)
  }

  useEffect(() => {
    onAuthLoadingChange?.(isSocialLoading)
    return () => onAuthLoadingChange?.(false)
  }, [isSocialLoading, onAuthLoadingChange])

  const preventWhiteSpaceOnKeyDown = (e) => {
    if (e.key === ' ') {
      e.preventDefault()
    }
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
        setSubmitted(false)
        return
      }
      const fields = [
        ...(showEmailField ? ['email'] : []),
        ...(showPhoneField ? ['cellphone'] : []),
        ...(!loginWithOtpState && loginTab !== 'otp' ? ['password'] : []),
        ...(useRootPoint ? ['project'] : [])
      ]
      const message = applyFormApiErrors(t, formState.result, fields, formMethods.setError)
      setAlertState({ open: !!message, content: message })
      setSubmitted(false)
    }
  }, [formState])

  useEffect(() => {
    formMethods.register('cellphone', {
      required: loginTab === 'cellphone'
        ? t('VALIDATION_ERROR_MOBILE_PHONE_REQUIRED', 'The field Mobile phone is required').replace('_attribute_', t('CELLPHONE', 'Cellphone'))
        : null
    })
    if (useRootPoint) {
      formMethods.register('project', {
        required: t('VALIDATION_ERROR_PROJECT_REQUIRED', 'The field project is required').replace('_attribute_', t('PROJECT', 'Project'))
      })
    }
  }, [formMethods])

  useEffect(() => {
    if (loginTab !== 'otp') {
      handleSendOtp()
    }
  }, [willVerifyOtpState])

  useEffect(() => {
    if (otpState?.length === numOtpInputs) {
      if (loginTab === 'otp') {
        handleButtonLoginClick()
      } else {
        const { cellphone, countryPhoneCode } = parseNumber(credentials?.cellphone)
        handleCheckPhoneCode({
          cellphone,
          country_phone_code: countryPhoneCode,
          code: otpState
        })
      }
    }
  }, [otpState])

  useEffect(() => {
    if (checkPhoneCodeState?.result?.error) {
      showToast(ToastType.Error, getFormApiFeedback(t, checkPhoneCodeState.result).message)
    } else if (checkPhoneCodeState?.result?.result) {
      showToast(ToastType.Success, t('CODE_SENT', 'The code has been sent'))
      resetOtpLeftTime()
    }
  }, [checkPhoneCodeState])

  useEffect(() => {
    if (otpLeftTime === 0) {
      setAlertState({
        open: true,
        content: t('TIME_IS_UP_PLEASE_RESEND_CODE', 'Time is up. Please resend code again')
      })
    }
  }, [otpLeftTime])

  useEffect(() => {
    if (verifyPhoneState?.result?.error) {
      setAlertState({
        open: true,
        content: getFormApiFeedback(t, verifyPhoneState.result).message
      })
    } else resetOtpLeftTime()
  }, [verifyPhoneState])

  useEffect(() => {
    formMethods.reset()
  }, [loginTab])

  useEffect(() => {
    if (ordering.project === null || !submitted || !useRootPoint) return
    handleButtonLoginClick()
  }, [ordering, submitted])

  useEffect(() => {
    if (recaptchaConfig?.siteKey) {
      setRecaptchaVersion({ version: recaptchaConfig?.version, siteKey: recaptchaConfig?.siteKey })
    }
  }, [recaptchaConfig])

  // The social logins (the theme may hide them: visibility auth.social) and
  // the SMS login, a login method that sits in their block
  const showSocial = authSocialVisible(theme)
  const showSmsLogin = !!(useLoginByCellphone && loginTab === 'cellphone' &&
    configs && Object.keys(configs).length > 0 && (configs?.twilio_service_enabled?.value === 'true' ||
      configs?.twilio_service_enabled?.value === '1'))

  return (
    <LoginContainer
      data-doc-section='authentication-login'
      data-doc-state={loginTab}
      data-doc-flow={loginWithOtpState ? 'sms-pre-send' : 'password'}
      isPopup={isPopup}
    >
      {/* call center: the form keeps its column (55%) beside an empty one */}
      {isCustomerMode && <HeroSide />}
      <FormSide isPopup={isPopup} isCustomerMode={isCustomerMode}>
        {/* the controls of the form take components.auth_form */}
        <ComponentScope group={AUTH_FORM}>
        {!isCustomerMode && <ModalHeading as={Title}>{t('LOGIN', 'Login')}</ModalHeading>}

        {((Number(useLoginByEmail) + Number(useLoginByCellphone) + Number(useLoginOtpEmail) + Number(useLoginOtpCellphone) + Number(useLoginSpoonity) > 1) && !loginWithOtpState && !willVerifyOtpState) && (
          <LoginWith isPopup={isPopup}>
            <RadioGroup
              {...authTabsProps(theme)}
              segmented
              layout='scroll'
              aria-label={t('LOGIN', 'Login')}
              value={loginTab === 'otp' ? `otp-${otpType}` : loginTab}
              readOnly={isSocialLoading}
              onValueChange={(value) => {
                if (isSocialLoading) return
                if (value === 'otp-email' || value === 'otp-cellphone') {
                  handleChangeOtpType(value === 'otp-email' ? 'email' : 'cellphone')
                } else {
                  handleChangeTab(value)
                }
              }}
            >
              {useLoginByEmail && (
                <Radio appearance='segment' value='email' data-doc-control='authentication-email-tab' label={t('BY_EMAIL', 'by Email')} />
              )}
              {useLoginByCellphone && (
                <Radio appearance='segment' value='cellphone' data-doc-control='authentication-phone-tab' label={t('BY_PHONE', 'by Phone')} />
              )}
              {useLoginOtpEmail && <Radio appearance='segment' value='otp-email' label={t('BY_OTP_EMAIL', 'by Otp Email')} />}
              {useLoginOtpCellphone && <Radio appearance='segment' value='otp-cellphone' label={t('BY_OTP_PHONE', 'by Otp Phone')} />}
              {useLoginSpoonity && <Radio appearance='segment' value='spoonity' label={spoonityTitle || t('BY_SPOONITY', 'by Spoonity')} />}
            </RadioGroup>
          </LoginWith>
        )}

        <FormInput
          noValidate
          isPopup={isPopup}
          autoComplete='on'
        >
          {useRootPoint && (
            <>
            {formMethods.errors?.project?.message && (
              <ValidationText id={`${fieldsId}-project-error`}>{formMethods.errors.project.message}</ValidationText>
            )}
            <LabeledField label={t('PROJECT', 'Project')} htmlFor={`${fieldsId}-project`}>
              <Input
                id={`${fieldsId}-project`}
                type='text'
                name='project'
                aria-label={t('PROJECT', 'Project')}
                placeholder={t('PROJECT', 'Project')}
                ref={formMethods.register({
                  required: t(
                    'VALIDATION_ERROR_REQUIRED',
                    'Project is required'
                  ).replace('_attribute_', t('PROJECT', 'Project'))
                })}
                onChange={(e) => handleChangeProject(e)}
                autoComplete='off'
                autoCapitalize='off'
                invalid={!!formMethods.errors?.project}
                aria-describedby={formMethods.errors?.project?.message ? `${fieldsId}-project-error` : undefined}
                prefix={<Icon name='boxArrowInRight' />}
              />
            </LabeledField>
            </>
          )}
          {showEmailField && (
            <>
              {['required', 'server'].includes(formMethods.errors?.email?.type) && (
                <ValidationText id={`${fieldsId}-email-error`}>
                  {formMethods.errors.email.message} {formMethods.errors.email.type === 'required' && '*'}
                </ValidationText>
              )}
              {formMethods.errors?.email?.type === 'pattern' && (
                <ValidationText id={`${fieldsId}-email-error`}>
                  {t('INVALID_ERROR_EMAIL', 'Invalid email address').replace('_attribute_', t('EMAIL', 'Email'))}
                </ValidationText>
              )}
              <LabeledField label={t('EMAIL', 'Email')} htmlFor={`${fieldsId}-email`}>
                <Input
                  id={`${fieldsId}-email`}
                  type='email'
                  name='email'
                  aria-label={t('EMAIL', 'Email')}
                  placeholder={t('EMAIL', 'Email')}
                  ref={formMethods.register({
                    required: loginTab === 'email' || loginTab === 'spoonity'
                      ? t('VALIDATION_ERROR_EMAIL_REQUIRED', 'The field Email is required').replace('_attribute_', t('EMAIL', 'Email'))
                      : null,
                    pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
                  })}
                  onKeyDown={preventWhiteSpaceOnKeyDown}
                  onChange={handleChangeInputEmail}
                  autoComplete='on'
                  invalid={!!formMethods.errors?.email}
                  aria-describedby={formMethods.errors?.email ? `${fieldsId}-email-error` : undefined}
                />
              </LabeledField>
            </>
          )}
          {showPhoneField && (
            <>
              {formMethods.errors?.cellphone && formMethods.errors.cellphone.type !== 'server' && !credentials?.cellphone && (
                <ValidationText>
                  {formMethods.errors?.cellphone?.message} {formMethods?.errors?.cellphone?.type === 'required' && '*'}
                </ValidationText>
              )}
              <InputPhoneNumber
                label={t('PHONE', 'Phone')}
                showPhoneIcon
                value={credentials?.cellphone}
                setValue={handleChangePhoneNumber}
                handleIsValid={() => { }}
                isError={formMethods.errors?.cellphone?.type === 'server' || !!(formMethods.errors?.cellphone && !credentials?.cellphone)}
                errorText={formMethods.errors?.cellphone?.type === 'server' ? formMethods.errors.cellphone.message : null}
              />
            </>
          )}

          {(!verifyPhoneState?.loading && willVerifyOtpState && !checkPhoneCodeState?.loading) && (
            <>
              <CountdownTimer>
                <span>{formatSeconds(otpLeftTime)}</span>
              </CountdownTimer>

              <InputCode length={numOtpInputs} value={otpState} onChange={setOtpState} autoFocus />
              <ResendCode disabled={otpLeftTime > 520 || verifyPhoneState?.loading} onClick={handleSendOtp}>
                {t('LANG_SEND_AGAIN', 'Send again')}?
              </ResendCode>
              <Button
                type='button'
                {...slotButtonOptions(theme, AUTH_FORM, 'cancel', { color: 'secondary', size: 'lg' })}
                shape='text'
                disabled={formState.loading}
                onClick={() => {
                  setLoginWithOtpState(false)
                  setWillVerifyOtpState(false)
                }}
              >
                {t('CANCEL', 'Cancel')}
              </Button>
            </>
          )}

          {(verifyPhoneState?.loading || checkPhoneCodeState?.loading) && (
            <SpinnerLoader size='md' />
          )}

          {!loginWithOtpState && loginTab !== 'otp' && (
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
                  ref={formMethods.register({
                    required: t('VALIDATION_ERROR_PASSWORD_REQUIRED', 'The field Password is required').replace('_attribute_', t('PASSWORD', 'Password'))
                  })}
                  onChange={(e) => handleChangeInput(e)}
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
                      <Icon name={!passwordSee ? 'eyeFilled' : 'eyeSlashFilled'} />
                    </Button>
                  )}
                />
              </LabeledField>
            </>
          )}
          {/* unless the theme hides it (visibility auth.forgot_password_link) */}
          {!loginWithOtpState && loginTab !== 'otp' && elementLinkToForgotPassword && themeVisible(theme, 'auth.forgot_password_link') && (
            <RedirectLink
              isPopup={isPopup}
              style={{
                pointerEvents: isSocialLoading ? 'none' : 'auto',
                opacity: isSocialLoading ? 0.5 : 1
              }}
            >
              <span>{t('FORGOT_YOUR_PASSWORD', 'Forgot your password?')}</span>
              {elementLinkToForgotPassword}
            </RedirectLink>
          )}
          {props.isRecaptchaEnable && enableReCaptcha && (
            <ReCaptchaWrapper>
              <ReCaptcha handleReCaptcha={handleReCaptcha} reCaptchaVersion={reCaptchaVersion} />
            </ReCaptchaWrapper>
          )}
          {(!willVerifyOtpState && isOtpCellphone && useLoginOtpWhatsapp)
            ? (
            <div style={{ display: 'flex', gap: themeSpace(theme, 'md'), width: '100%' }}>
              {/* each button fills half the row (the legacy button had flex: 1; nothing goes on the piece) */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Button
                  data-doc-control='authentication-otp-sms-submit'
                  {...slotButtonOptions(theme, AUTH_FORM, 'submit', { color: 'primary', size: 'lg' })}
                  shape='text'
                  type='button'
                  cta
                  loading={!!formState.loading}
                  disabled={isSocialLoading}
                  onClick={() => { otpChannelRef.current = 2; formMethods.handleSubmit(onSubmit)() }}
                >
                  {t('SEND_BY_SMS', 'Send by SMS')}
                </Button>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Button
                  data-doc-control='authentication-otp-whatsapp-submit'
                  {...slotButtonOptions(theme, AUTH_FORM, 'submit', { color: 'primary', size: 'lg' })}
                  shape='text'
                  type='button'
                  cta
                  loading={!!formState.loading}
                  disabled={isSocialLoading}
                  onClick={() => { otpChannelRef.current = 4; formMethods.handleSubmit(onSubmit)() }}
                >
                  {t('SEND_BY_WHATSAPP', 'Send by WhatsApp')}
                </Button>
              </div>
            </div>
              )
            : (!willVerifyOtpState &&
              <Button
                data-doc-control='authentication-submit'
                {...slotButtonOptions(theme, AUTH_FORM, 'submit', { color: 'primary', size: 'lg' })}
                shape='text'
                type='submit'
                onClick={formMethods.handleSubmit(onSubmit)}
                loading={!!formState.loading}
                disabled={isSocialLoading}
              >
                {loginWithOtpState || loginTab === 'otp'
                  ? t('GET_VERIFY_CODE', 'Get verify code')
                  : t('LOGIN', 'Login')}
              </Button>
              )}
          {(loginWithOtpState && !willVerifyOtpState) && (
            <Button
              type='button'
              {...slotButtonOptions(theme, AUTH_FORM, 'cancel', { color: 'secondary', size: 'lg' })}
              shape='text'
              disabled={formState.loading}
              onClick={() => {
                setLoginWithOtpState(false)
              }}
            >
              {t('CANCEL', 'Cancel')}
            </Button>
          )}
        </FormInput>

        {(elementLinkToSignup && !loginWithOtpState && loginTab !== 'otp' && authSignupLinkVisible(theme)) && (
          <RedirectLink
            register
            isPopup={isPopup}
            className='new-account'
            style={{
              pointerEvents: isSocialLoading ? 'none' : 'auto',
              opacity: isSocialLoading ? 0.5 : 1
            }}
          >
            <span>{t('NEW_ON_SITE_NAME', 'New on _site_?').replace('_site_', getSiteName({ theme, site }))}</span>
            {elementLinkToSignup}
          </RedirectLink>
        )}
        {(!props.isDisableButtons && !loginWithOtpState && (showSocial || showSmsLogin)) && (
          Object.keys(configs).length > 0
            ? (
            <SocialButtons isPopup={isPopup}>
              {showSocial && facebookLoginEnabled &&
                facebookAppId &&
                (
                  <FacebookLoginButton
                    appId={facebookAppId}
                    handleSuccessFacebookLogin={handleSuccessFacebook}
                    onLoadingChange={handleFacebookLoadingChange}
                    disabled={isSocialLoading}
                  />
                )}
              {showSocial && configs?.google_login_client_id?.value && configs?.google_login_auth_domain?.value && configs?.google_login_api_key?.value && googleLoginEnabled && (
                <GoogleLoginButton
                  initParams={initParams}
                  handleSuccessGoogleLogin={handleSuccessGoogle}
                  onLoadingChange={handleGoogleLoadingChange}
                  disabled={isSocialLoading}
                />
              )}
              {showSocial && configs?.apple_login_client_id?.value && appleLoginEnabled &&
                (
                  <AppleLogin
                    onSuccess={handleSuccessApple}
                    onFailure={() => setAlertState({
                      open: true,
                      content: t('TRY_AGAIN', 'Please try again')
                    })}
                    onLoadingChange={handleAppleLoadingChange}
                    disabled={isSocialLoading}
                  />
                )}
              {showSmsLogin &&
                (
                  <SmsLoginButton
                    // the neutral outline button of the other social logins,
                    // no look of its own (disabled while one of them loads)
                    disabled={isSocialLoading}
                    handleSmsLogin={() => { if (!isSocialLoading) setLoginWithOtpState(true) }}
                  />
                )}
            </SocialButtons>
              )
            : (
            <SkeletonSocialWrapper>
              {showSocial && (
                <>
                  <Skeleton height={themeControlHeight(theme, 'button', 'lg')} />
                  <Skeleton height={themeControlHeight(theme, 'button', 'lg')} />
                </>
              )}
              {useLoginByCellphone && loginTab === 'cellphone' && (
                <Skeleton height={themeControlHeight(theme, 'button', 'lg')} />
              )}
            </SkeletonSocialWrapper>
              )
        )}
        </ComponentScope>
      </FormSide>
      <Alert
        title={t('LOGIN', 'Login')}
        content={alertState.content}
        acceptText={t('CLOSE', 'Close')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
    </LoginContainer>
  )
}

export const LoginForm = (props) => {
  const isKioskApp = props.useKioskApp
  const loginControllerProps = {
    ...props,
    isRecaptchaEnable: !isKioskApp,
    elementLinkToForgotPassword: isKioskApp ? null : props.elementLinkToForgotPassword,
    useLoginByCellphone: isKioskApp ? null : props.useLoginByCellphone,
    elementLinkToSignup: isKioskApp ? null : props.elementLinkToSignup,
    isDisableButtons: isKioskApp ? true : props.isDisableButtons,
    UIComponent: LoginFormUI
  }
  return <LoginFormController {...loginControllerProps} />
}
