import React, { useState, useEffect, useId } from 'react'
import { useTheme } from 'styled-components'
import {
  Container,
  WrapperText,
  FormInput,
  InputWrapper,
  OtpWrapper,
  CountdownTimer,
  ButtonsWrapper,
  WarningText,
  FieldError,
  ErrorText
} from './styles'

import { UserVerification as UserVerificationController } from '~components/components/UserVerification'
import { UserFormDetails as UserFormController } from '~components/components/UserFormDetails'
import { LogoutAction as LogoutActionController } from '~components/components/LogoutAction'
import { useSession } from '~components/contexts/SessionContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'

import { Alert } from '~ui/src/components/Confirm'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Input } from '~ui/src/design-system/components/Input'
import { InputCode } from '~ui/src/design-system/components/InputCode'
import { LabeledField } from '~ui/src/styles/Field'
import { Button } from '~ui/src/design-system/components/Button'
import { useCountdownTimer } from '~ui/hooks/useCountdownTimer'
import { formatSeconds } from '~ui/utils'
import { InputPhoneNumber } from '~ui/src/components/InputPhoneNumber'
import { UserFormDetailsUI } from '~ui/src/components/UserFormDetails'

import { Icon } from '~ui/src/design-system/components/Icon'
import { themeSpace } from '~/utils/themeTokens'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { AUTH_FORM } from '~/utils/authForm'
import { slotButtonOptions } from '~/utils/themeGroups'
import { getFormApiFeedback } from '~/utils/formApiFeedback'

const UserDetails = (props) => {
  const userDetailsProps = {
    ...props,
    isEdit: true,
    useValidationFields: true,
    useDefualtSessionManager: true,
    UIComponent: UserFormDetailsUI
  }

  return <UserFormController {...userDetailsProps} />
}

const VerificationEmailRecovery = ({ formState, handleLogoutClick, disabled, onExiting }) => {
  const [, t] = useLanguage()
  const theme = useTheme()
  const handleExit = async () => {
    if (disabled || formState.loading) return
    onExiting(true)
    try {
      await handleLogoutClick()
    } finally {
      onExiting(false)
    }
  }
  return (
    <>
      <WarningText>
        {t('VERIFICATION_EMAIL_RECOVERY', 'If this email is already in use, enter another email or log out, then log in or sign up with this email.')}
      </WarningText>
      <Button
        type='button'
        {...slotButtonOptions(theme, AUTH_FORM, 'cancel', { color: 'secondary' })}
        shape='text'
        disabled={disabled || formState.loading}
        onClick={handleExit}
      >
        {t('LOGOUT', 'Logout')}
      </Button>
      {!formState.loading && formState.result?.error && (
        <ErrorText>
          {t('LOGOUT', 'Logout')}. {getFormApiFeedback(t, formState.result).message}
        </ErrorText>
      )}
    </>
  )
}

const VerificationEmailForm = (props) => {
  const {
    formState,
    handleButtonUpdateClick,
    verifyEmailState,
    user,
    onCancel
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  const emailId = useId()
  const errorId = `${emailId}-error`
  const [email, setEmail] = useState(user?.email || user?.guest_email || '')
  const [validationError, setValidationError] = useState(null)
  const [exiting, setExiting] = useState(false)
  const [dismissedResult, setDismissedResult] = useState(null)
  const [editedResult, setEditedResult] = useState(null)
  const loading = exiting || formState?.loading || verifyEmailState?.loadingSendCode || verifyEmailState?.loadingCheckCode

  const handleSaveEmail = () => {
    if (loading) return
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setValidationError(t('VALIDATION_ERROR_EMAIL_REQUIRED', 'The field Email is required').replace('_attribute_', t('EMAIL', 'Email')))
      return
    }
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(normalizedEmail)) {
      setValidationError(t('INVALID_ERROR_EMAIL', 'Invalid email address').replace('_attribute_', t('EMAIL', 'Email')))
      return
    }
    setValidationError(null)
    if (user?.email && normalizedEmail === user.email.trim().toLowerCase()) {
      onCancel?.()
      return
    }
    handleButtonUpdateClick({ email: normalizedEmail })
  }

  const saveError = !formState?.loading && formState?.result?.error
  const feedback = saveError && formState.result !== editedResult
    ? getFormApiFeedback(t, formState.result, { fields: ['email'] })
    : null
  const emailError = validationError || feedback?.fields.email

  return (
    <>
      <LabeledField label={t('EMAIL', 'Email')} htmlFor={emailId}>
        <Input
          id={emailId}
          type='email'
          name='email'
          aria-label={t('EMAIL', 'Email')}
          placeholder={t('EMAIL', 'Email')}
          autoComplete='email'
          required
          value={email}
          disabled={loading}
          invalid={!!emailError}
          aria-describedby={emailError ? errorId : undefined}
          prefix={<Icon name='envelope' />}
          onChange={event => {
            setEmail(event.target.value)
            setValidationError(null)
            setEditedResult(formState?.result)
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSaveEmail()
            }
          }}
        />
        {emailError && <FieldError id={errorId} role='alert'>{emailError}</FieldError>}
      </LabeledField>
      <Button
        data-doc-control='verification-save-email'
        type='button'
        {...slotButtonOptions(theme, AUTH_FORM, 'submit', { color: 'primary' })}
        shape='text'
        cta
        loading={!!formState?.loading}
        disabled={loading}
        onClick={handleSaveEmail}
      >
        {t('SAVE', 'Save')}
      </Button>
      {user?.email && onCancel && (
        <Button
          data-doc-control='verification-cancel-email'
          type='button'
          {...slotButtonOptions(theme, AUTH_FORM, 'cancel', { color: 'secondary' })}
          shape='text'
          disabled={loading}
          onClick={onCancel}
        >
          {t('CANCEL', 'Cancel')}
        </Button>
      )}
      <Alert
        title={t('SAVE', 'Save')}
        content={feedback?.message}
        open={!!feedback?.message && formState.result !== dismissedResult}
        onClose={() => setDismissedResult(formState.result)}
        onAccept={() => setDismissedResult(formState.result)}
        closeOnBackdrop={false}
      />
      {saveError && user?.guest_id && (
        <LogoutActionController
          useDefualtSessionManager
          UIComponent={VerificationEmailRecovery}
          disabled={loading}
          onExiting={setExiting}
        />
      )}
    </>
  )
}

const UserVerificationUI = (props) => {
  const {
    verifyEmailState,
    verifyPhoneState,
    sendVerifyEmailCode,
    sendVerifyPhoneCode,
    checkVerifyEmailCode,
    checkVerifyPhoneCode,
    cleanErrorsState,
    useWhatsappVerification
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  // the labels above the fields: the id each label points at
  const fieldsId = useId()
  const [{ configs }] = useConfig()
  const [{ auth, user }] = useSession()
  const [otpState, setOtpState] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [verificationState, setVerificationState] = useState({ email: false, phone: false })

  const [phoneState, setPhoneState] = useState(null)
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState(2)
  const [editingEmail, setEditingEmail] = useState(false)

  const isEmailVerifyRequired = auth && configs?.verification_email_required?.value === '1' && !user?.email_verified
  const isPhoneVerifyRequired = auth && configs?.verification_phone_required?.value === '1' && !user?.phone_verified

  const phoneLength = phoneState?.cellphone && phoneState?.country_phone_code && phoneState?.cellphone?.split('')?.length
  const lastNumbers = phoneState?.cellphone && phoneState?.country_phone_code && phoneState?.cellphone?.split('').fill('*', 0, phoneLength - 2).join('')

  const [otpLeftTime, , resetOtpLeftTime] = useCountdownTimer(
    600,
    isEmailVerifyRequired
      ? verificationState.email
      : verificationState.phone
  )

  const numOtpInputs = isEmailVerifyRequired ? 6 : 4
  const activeState = isEmailVerifyRequired ? verifyEmailState : isPhoneVerifyRequired ? verifyPhoneState : null
  const emailError = feedback?.fields.email
  const channelError = feedback?.fields.channel
  const codeError = feedback?.fields.code
  const codeErrorId = `${fieldsId}-code-error`
  const channelErrorId = `${fieldsId}-channel-error`
  const emailErrorId = `${fieldsId}-email-error`

  const handleSendOtp = (opt, channel) => {
    if (opt !== 'phone' && (!user?.email || editingEmail || verifyEmailState?.loadingSendCode || verifyEmailState?.loadingCheckCode)) return
    setFeedback(null)
    setOtpState('')
    resetOtpLeftTime()
    if (opt === 'phone') {
      const ch = channel || 2
      setSelectedChannel(ch)
      sendVerifyPhoneCode({
        cellphone: phoneState?.cellphone,
        country_phone_code: phoneState?.country_phone_code,
        channel: ch
      })
      return
    }
    sendVerifyEmailCode({ email: user?.email })
  }

  const closeAlert = () => {
    setFeedback((current) => current && { ...current, message: null })
    cleanErrorsState()
    cleanErrorsState('phone')
    setOtpState('')
  }

  const cancelCode = () => {
    closeAlert()
    setFeedback(null)
    setVerificationState({ email: false, phone: false })
  }

  const setupUserPhoneNumber = () => {
    if (!user || !user?.cellphone || !user?.country_phone_code) return
    setPhoneState({
      cellphone: user?.cellphone,
      country_phone_code: user?.country_phone_code,
      formatted: `+${user?.country_phone_code} ${user?.cellphone}`
    })
  }

  useEffect(() => {
    if (otpState?.length === numOtpInputs) {
      if (verificationState.email) {
        checkVerifyEmailCode({ code: otpState })
        return
      }
      if (verificationState.phone) {
        checkVerifyPhoneCode({
          cellphone: phoneState?.cellphone,
          country_phone_code: +(phoneState?.country_phone_code),
          code: otpState,
          channel: selectedChannel
        })
      }
    }
  }, [otpState])

  useEffect(() => {
    const outcome = activeState?.codeOutcome
    if (!outcome) return
    const checking = outcome.action === 'check'
    if (outcome.success) {
      if (!checking) setVerificationState({ email: isEmailVerifyRequired, phone: !isEmailVerifyRequired })
      return
    }
    const codeVisible = isEmailVerifyRequired ? verificationState.email : verificationState.phone
    let fields = []
    if (checking && codeVisible) {
      fields = ['code']
    } else if (!checking && !codeVisible) {
      if (isEmailVerifyRequired && user?.email && !editingEmail) fields = ['email']
      if (!isEmailVerifyRequired && phoneState?.formatted) fields = ['cellphone', 'country_phone_code', 'channel']
    }
    const title = checking
      ? t('VERIFICATION_CODE', 'Verification Code')
      : !isEmailVerifyRequired && useWhatsappVerification
          ? selectedChannel === 4 ? t('SEND_BY_WHATSAPP', 'Send by WhatsApp') : t('SEND_BY_SMS', 'Send by SMS')
          : t('SEND_CODE', 'Send code')
    setFeedback({ ...getFormApiFeedback(t, outcome.response, { fields }), title })
  }, [activeState?.codeOutcome])

  const changeCode = (code) => {
    if (codeError) setFeedback(null)
    setOtpState(code)
  }

  useEffect(() => {
    if (otpState) {
      setOtpState('')
    }
  }, [verificationState])

  useEffect(() => {
    setupUserPhoneNumber()
  }, [user])

  return (
    <Container
      data-doc-section='user-verification'
      data-doc-state={isEmailVerifyRequired
        ? verificationState.email ? 'email-code' : 'email-pre-send'
        : verificationState.phone ? 'phone-code' : 'phone-pre-send'}
    >
      {/* the controls of the form take components.auth_form */}
      <ComponentScope group={AUTH_FORM}>
      <FormInput data-doc-control='verification-form' onSubmit={event => event.preventDefault()}>
        <WrapperText>
          <h1>
            {t('VERIFICATION_CODE', 'Verification Code')}
          </h1>
          {isEmailVerifyRequired && (
            <span>
              {!verificationState.email
                ? (
                    t('VERIFICATION_EMAIL_CODE_MESSAGE', 'In order to continue using our platform please verify your email')
                  )
                : (
                    t('VERIFICATION_EMAIL_CODE_SENT_MESSAGE', 'Please type the verification code sent to your email')
                  )}
            </span>
          )}

          {isPhoneVerifyRequired && !isEmailVerifyRequired && (
            <span>
              {!verificationState.phone
                ? (
                `${t('VERIFICATION_PHONE_CODE_MESSAGE', 'In order to continue using our platform please verify your phone number')}`
                  )
                : (
                `${t('VERIFICATION_PHONE_CODE_SENT_MESSAGE', 'Please, enter the verification code we sent to your mobile ending with :number').replace(':number', lastNumbers)}`
                  )}
            </span>
          )}
        </WrapperText>

        {isEmailVerifyRequired && (
          !verificationState.email
            ? (
                user?.guest_id && (!user?.email || editingEmail)
                  ? (
                <UserFormController
                  key={user?.id}
                  user={user}
                  useDefualtSessionManager
                  UIComponent={VerificationEmailForm}
                  verifyEmailState={verifyEmailState}
                  handleSuccessUpdate={() => setEditingEmail(false)}
                  onCancel={() => setEditingEmail(false)}
                />
                    )
                  : (
            <>
              <LabeledField label={t('EMAIL', 'Email')} htmlFor={`${fieldsId}-email`}>
                <Input
                  id={`${fieldsId}-email`}
                  readOnly
                  type='email'
                  name='email'
                  aria-label={t('EMAIL', 'Email')}
                  placeholder={user?.email}
                  autoComplete='off'
                  invalid={!!emailError}
                  aria-describedby={emailError ? emailErrorId : undefined}
                  prefix={<Icon name='envelope' />}
                />
                {emailError && <FieldError id={emailErrorId} role='alert'>{emailError}</FieldError>}
              </LabeledField>
              {!user?.email && (
                <WarningText>
                  {t('VERIFICATION_EMAIL_MISSING', 'This account has no email address. An email address is required to send a verification code.')}
                </WarningText>
              )}
              <Button
                data-doc-control='verification-send-email'
                type='button'
                {...slotButtonOptions(theme, AUTH_FORM, 'submit', { color: 'primary' })}
                shape='text'
                cta
                loading={!!verifyEmailState?.loadingSendCode}
                disabled={!user?.email || verifyEmailState?.loadingSendCode || verifyEmailState?.loadingCheckCode}
                onClick={handleSendOtp}
              >
                {t('SEND_CODE', 'Send code')}
              </Button>
              {user?.guest_id && (
                <Button
                  data-doc-control='verification-edit-email'
                  type='button'
                  {...slotButtonOptions(theme, AUTH_FORM, 'cancel', { color: 'secondary' })}
                  shape='text'
                  disabled={verifyEmailState?.loadingSendCode || verifyEmailState?.loadingCheckCode}
                  onClick={() => {
                    setFeedback(null)
                    setEditingEmail(true)
                  }}
                >
                  {t('CHANGE', 'Change')}
                </Button>
              )}
            </>
                    )
              )
            : (
            <>
              <CountdownTimer error={otpLeftTime === 0}>
                <span>{formatSeconds(otpLeftTime)}</span>
              </CountdownTimer>

              <OtpWrapper>
                <InputCode
                  length={numOtpInputs}
                  value={otpState}
                  onChange={changeCode}
                  invalid={!!codeError}
                  aria-describedby={codeError ? codeErrorId : undefined}
                  placeholder={'0'.repeat(numOtpInputs)}
                  autoFocus
                />
                {codeError && <FieldError id={codeErrorId} role='alert'>{codeError}</FieldError>}
              </OtpWrapper>

              <ButtonsWrapper>
                <div>
                  <Button
                    type='button'
                    {...slotButtonOptions(theme, AUTH_FORM, 'cancel', { color: 'secondary' })}
                    shape='text'
                    disabled={verifyEmailState?.loadingSendCode || verifyEmailState?.loadingCheckCode}
                    onClick={cancelCode}
                  >
                    {t('CANCEL', 'Cancel')}
                  </Button>
                </div>
                <div>
                  <Button
                    type='button'
                    {...slotButtonOptions(theme, AUTH_FORM, 'cancel', { color: 'secondary' })}
                    shape='text'
                    disabled={verifyEmailState?.loadingSendCode || verifyEmailState?.loadingCheckCode}
                    onClick={handleSendOtp}
                  >
                    {t('RESEND_AGAIN', 'Resend again?')}
                  </Button>
                </div>
              </ButtonsWrapper>
            </>
              )
        )}

        {isPhoneVerifyRequired && !isEmailVerifyRequired && (
          !verificationState.phone
            ? (
                phoneState?.formatted
                  ? (
              <>
                <InputWrapper>
                  <InputPhoneNumber
                    label={t('PHONE', 'Phone')}
                    showPhoneIcon
                    align='center'
                    user={user}
                    value={phoneState?.formatted}
                    isError={!!(feedback?.fields.cellphone || feedback?.fields.country_phone_code)}
                    errorText={[feedback?.fields.cellphone, feedback?.fields.country_phone_code].filter(Boolean).join(' ')}
                    disabled={!!phoneState?.formatted}
                    setValue={() => {}}
                    handleIsValid={() => {}}
                  />
                </InputWrapper>
                {useWhatsappVerification
                  ? (
                    <div style={{ display: 'flex', gap: themeSpace(theme, 'md'), width: '100%' }}>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <Button
                          type='button'
                          {...slotButtonOptions(theme, AUTH_FORM, 'submit', { color: 'primary' })}
                          shape='text'
                          cta
                          loading={!!verifyPhoneState?.loadingSendCode && selectedChannel === 2}
                          aria-describedby={channelError && selectedChannel === 2 ? channelErrorId : undefined}
                          disabled={verifyPhoneState?.loadingSendCode || verifyPhoneState?.loadingCheckCode}
                          onClick={() => handleSendOtp('phone', 2)}
                        >
                          {t('SEND_BY_SMS', 'Send by SMS')}
                        </Button>
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <Button
                          type='button'
                          {...slotButtonOptions(theme, AUTH_FORM, 'submit', { color: 'primary' })}
                          shape='text'
                          cta
                          loading={!!verifyPhoneState?.loadingSendCode && selectedChannel === 4}
                          aria-describedby={channelError && selectedChannel === 4 ? channelErrorId : undefined}
                          disabled={verifyPhoneState?.loadingSendCode || verifyPhoneState?.loadingCheckCode}
                          onClick={() => handleSendOtp('phone', 4)}
                        >
                          {t('SEND_BY_WHATSAPP', 'Send by WhatsApp')}
                        </Button>
                      </div>
                    </div>
                    )
                  : (
                    <Button
                      data-doc-control='verification-send-phone'
                      type='button'
                      {...slotButtonOptions(theme, AUTH_FORM, 'submit', { color: 'primary' })}
                      shape='text'
                      cta
                      loading={!!verifyPhoneState?.loadingSendCode}
                      aria-describedby={channelError ? channelErrorId : undefined}
                      disabled={verifyPhoneState?.loadingSendCode || verifyPhoneState?.loadingCheckCode}
                      onClick={() => handleSendOtp('phone')}
                    >
                      {t('SEND_CODE', 'Send code')}
                    </Button>
                    )}
                {channelError && <FieldError id={channelErrorId} role='alert'>{channelError}</FieldError>}
              </>
                    )
                  : (
              <>
                <WarningText>
                  {t('WARNING_PHONE_CODE_VALIDATION', 'Please update your phone number to continue')}
                </WarningText>
                <Button
                  data-doc-control='verification-update-contact'
                  type='button'
                  {...slotButtonOptions(theme, AUTH_FORM, 'submit', { color: 'primary' })}
                  shape='text'
                  cta
                  onClick={() => setModalIsOpen(true)}
                >
                  {t('UPDATE_PROFILE', 'Update profile')}
                </Button>
              </>
                    )
              )
            : (
            <>
              <CountdownTimer error={otpLeftTime === 0}>
                <span>{formatSeconds(otpLeftTime)}</span>
              </CountdownTimer>

              <OtpWrapper>
                <InputCode
                  length={numOtpInputs}
                  value={otpState}
                  onChange={changeCode}
                  invalid={!!codeError}
                  aria-describedby={codeError ? codeErrorId : undefined}
                  placeholder={'0'.repeat(numOtpInputs)}
                  autoFocus
                />
                {codeError && <FieldError id={codeErrorId} role='alert'>{codeError}</FieldError>}
              </OtpWrapper>

              <ButtonsWrapper>
                <div>
                  <Button
                    type='button'
                    {...slotButtonOptions(theme, AUTH_FORM, 'cancel', { color: 'secondary' })}
                    shape='text'
                    disabled={verifyPhoneState?.loadingSendCode || verifyPhoneState?.loadingCheckCode}
                    onClick={cancelCode}
                  >
                    {t('CANCEL', 'Cancel')}
                  </Button>
                </div>
                <div>
                  <Button
                    type='button'
                    {...slotButtonOptions(theme, AUTH_FORM, 'cancel', { color: 'secondary' })}
                    shape='text'
                    disabled={verifyPhoneState?.loadingSendCode || verifyPhoneState?.loadingCheckCode}
                    onClick={() => handleSendOtp('phone', selectedChannel)}
                  >
                    {t('RESEND_AGAIN', 'Resend again?')}
                  </Button>
                </div>
              </ButtonsWrapper>
            </>
              )
        )}
      </FormInput>
      </ComponentScope>

      {modalIsOpen && (
        <DialogOverlay
          title={t('UPDATE_PROFILE', 'Update Profile')}
          open={modalIsOpen}
          onClose={() => setModalIsOpen(false)}
          size='lg'
        >
          <UserDetails
            user={user}
            handleSuccessUpdate={() => setModalIsOpen(false)}
          />
        </DialogOverlay>
      )}

      <Alert
        title={feedback?.title}
        content={feedback?.message}
        acceptText={t('ACCEPT', 'Accept')}
        open={!!feedback?.message}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
    </Container>
  )
}

export const UserVerification = (props) => {
  const [{ user }] = useSession()
  const verifyProps = {
    ...props,
    includeResponse: true,
    UIComponent: UserVerificationUI
  }
  return (
    <UserVerificationController
      key={JSON.stringify([user?.id, user?.email])}
      {...verifyProps}
    />
  )
}
