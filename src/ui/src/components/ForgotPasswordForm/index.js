import React, { useEffect, useState, useId } from 'react'
import { useForm } from 'react-hook-form'
import { useTheme } from 'styled-components'

import {
  ForgotPasswordContainer,
  FormSide,
  FormInput,
  RedirectLink,
  ReCaptchaWrapper,
  ValidationText
} from './styles'

import { ForgotPasswordForm as ForgotPasswordController } from '~components/components/ForgotPasswordForm'
import { useLanguage } from '~components/contexts/LanguageContext'
import { ReCaptcha } from '~components/components/ReCaptcha'

import { Alert } from '~ui/src/components/Confirm'
import { Input } from '~ui/src/design-system/components/Input'
import { LabeledField } from '~ui/src/styles/Field'
import { Button } from '~ui/src/design-system/components/Button'
import { ModalHeading } from '~ui/src/components/Overlay/ModalHeading'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { AUTH_FORM, authLoginLinkVisible } from '~/utils/authForm'
import { slotButtonOptions } from '~/utils/themeGroups'
import { getFormApiFeedback } from '~/utils/formApiFeedback'

const ForgotPasswordUI = (props) => {
  const {
    hanldeChangeInput,
    handleButtonForgotPasswordClick,
    formState,
    elementLinkToLogin,
    isPopup,
    handleReCaptcha,
    enableReCaptcha
  } = props

  const formMethods = useForm()
  const [alertState, setAlertState] = useState({ open: false, success: false })
  const [submitted, setSubmitted] = useState(false)
  const [apiEmailError, setApiEmailError] = useState(null)
  const [, t] = useLanguage()
  const theme = useTheme()
  // with the labels above the fields: the id each label points at
  const fieldsId = useId()
  const emailError = formMethods.errors?.email
  const emailErrorMessage = apiEmailError ?? emailError?.message

  const onSubmit = () => {
    setApiEmailError(null)
    setSubmitted(true)
    handleButtonForgotPasswordClick()
  }

  const closeAlert = () => {
    setAlertState((current) => ({ ...current, open: false }))
  }

  const handleChangeInputEmail = (e) => {
    setApiEmailError(null)
    hanldeChangeInput({ target: { name: 'email', value: e.target.value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, '') } })
    formMethods.setValue('email', e.target.value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, ''))
  }

  useEffect(() => {
    if (formState.loading) return
    if (formState.result?.error) {
      const { fields, message } = getFormApiFeedback(t, formState.result, { fields: ['email'] })
      setApiEmailError(fields.email ?? null)
      setAlertState({
        success: false,
        open: !!message,
        content: message
      })
    } else if (submitted && formState.result?.result) {
      setAlertState({
        success: true,
        open: true,
        title: t('LINK_SEND_SUCCESSFULLY', 'Link Sent Successfully'),
        content: t('IF_ACCOUNT_EXIST_EMAIL_SEND_PASSWORD', 'If an account exists with this email a password will be sent')
      })
    }
  }, [formState, submitted])

  // The title of the page, or of the popup
  const TitleTag = isPopup ? 'h2' : 'h1'

  return (
    <ForgotPasswordContainer
      data-doc-section='password-recovery-request'
      data-doc-state='empty'
      isPopup={isPopup}
    >
      <ModalHeading as={TitleTag}>{t('TITLE_FORGOT_PASSWORD', 'Forgot your password?')}</ModalHeading>
      <FormSide isPopup={isPopup}>
        <ComponentScope group={AUTH_FORM}>
        <FormInput
          noValidate
          isPopup={isPopup}
          onSubmit={formMethods.handleSubmit(onSubmit)}
        >
          {emailErrorMessage && (
            <ValidationText id={`${fieldsId}-email-error`}>
              {emailErrorMessage} {!apiEmailError && emailError?.type === 'required' && '*'}
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
                required: t('VALIDATION_ERROR_EMAIL_REQUIRED', 'The field Email is required').replace('_attribute_', t('EMAIL', 'Email')),
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: t('INVALID_ERROR_EMAIL', 'Invalid email address').replace('_attribute_', t('EMAIL', 'Email'))
                }
              })}
              onChange={handleChangeInputEmail}
              autoComplete='off'
              invalid={!!emailErrorMessage}
              aria-describedby={emailErrorMessage ? `${fieldsId}-email-error` : undefined}
            />
          </LabeledField>
          {props.isRecaptchaEnable && enableReCaptcha && (
            <ReCaptchaWrapper>
              <ReCaptcha handleReCaptcha={handleReCaptcha} />
            </ReCaptchaWrapper>
          )}
          <Button
            data-doc-control='password-recovery-submit'
            {...slotButtonOptions(theme, AUTH_FORM, 'submit', { color: 'primary', size: 'lg' })}
            shape='text'
            type='submit'
            loading={!!formState.loading}
            disabled={alertState.success}
          >
            {alertState.success && formState.result?.result
              ? t('LINK_SEND_FORGOT_PASSWORD', 'Link Sent')
              : t('FRONT_RECOVER_PASSWORD', 'Recover Password')}
          </Button>
        </FormInput>
        {elementLinkToLogin && authLoginLinkVisible(theme) && (
          <RedirectLink register isPopup={isPopup}>
            <span>{t('SIGN_IN_MESSAGE', 'Do you want to sign in?')}</span>
            {elementLinkToLogin}
          </RedirectLink>
        )}
        </ComponentScope>
      </FormSide>
      <Alert
        title={alertState?.title || t('TITLE_FORGOT_PASSWORD', 'Forgot your password?')}
        content={alertState.content}
        acceptText={alertState.success ? t('ACCEPT', 'Accept') : t('CLOSE', 'Close')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
    </ForgotPasswordContainer>
  )
}

export const ForgotPasswordForm = (props) => {
  const ForgotPasswordProps = {
    ...props,
    isRecaptchaEnable: true,
    UIComponent: ForgotPasswordUI
  }
  return <ForgotPasswordController {...ForgotPasswordProps} />
}
