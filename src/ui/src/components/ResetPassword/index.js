import React, { useRef, useEffect, useState, useId } from 'react'
import { useForm } from 'react-hook-form'
import { useTheme } from 'styled-components'
import { getThemeLogoUrl } from '~/utils/siteBranding'
import { ownSiteName } from '~/utils/resolvePwaBranding'

import {
  ResetPasswordContainer,
  FormSide,
  HeroSide,
  FormInput,
  TitleHeroSide,
  HiddenTitle,
  LogoName,
  FieldError
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useSite } from '~components/contexts/SiteContext'
import { ResetPassword as ResetPasswordController } from '~components/components/ResetPassword'
import { Alert } from '~ui/src/components/Confirm'
import { Input } from '~ui/src/design-system/components/Input'
import { LabeledField } from '~ui/src/styles/Field'
import { Button } from '~ui/src/design-system/components/Button'
import { LoginForm } from '~ui/src/components/LoginForm'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { AUTH_FORM } from '~/utils/authForm'
import { slotButtonOptions } from '~/utils/themeGroups'
import { usePageSections } from '~ui/hooks/usePageSections'
import { getFormApiFeedback } from '~/utils/formApiFeedback'

const ResetPasswordUI = (props) => {
  const {
    code,
    random,
    formState,
    resetPasswordData,
    handleResetPassword,
    handleChangeInput,
    redirectResetPassword
  } = props

  const { handleSubmit, register, errors, watch } = useForm()
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [openAuthModal, setOpenAuthModal] = useState(false)
  const [apiFields, setApiFields] = useState({})
  const [, t] = useLanguage()
  const theme = useTheme()
  const [{ site }] = useSite()
  // the labels above the fields: the id each label points at
  const fieldsId = useId()
  // The sections of the page (pages.reset_password): the hero and the form,
  // in the theme's order (side by side from 992px, one over the other below)
  const { render, isVisible } = usePageSections('reset_password')
  const resetSucceeded = !formState.loading && !formState.result?.error && !!formState.result?.result?.length
  const fieldMessage = (field) => apiFields[field] ?? errors?.[field]?.message
  const errorProps = (field) => ({
    invalid: !!fieldMessage(field),
    'aria-describedby': fieldMessage(field) ? `${fieldsId}-${field}-error` : undefined
  })
  const errorText = (field) => (
    fieldMessage(field) && <FieldError id={`${fieldsId}-${field}-error`}>{fieldMessage(field)}</FieldError>
  )

  const password = useRef({})
  // the logo box is 60 tall and as wide as the image (no width)
  const logoSize = { height: '60' }
  const logo = getThemeLogoUrl(theme)
  const ownName = !logo && ownSiteName({ theme, site })

  password.current = watch('password', '')

  const onSubmit = () => {
    setApiFields({})
    if (code && random) {
      handleResetPassword()
    } else {
      redirectResetPassword && redirectResetPassword(resetPasswordData)
    }
  }

  const editField = (event) => {
    const { name } = event.target
    if (apiFields[name]) setApiFields((current) => ({ ...current, [name]: null }))
    handleChangeInput(event)
  }

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: []
    })
  }

  const handleSuccessLogin = (user) => {
    if (user) {
      setOpenAuthModal(false)
    }
  }

  useEffect(() => {
    if (!formState.loading && formState.result?.error) {
      const feedback = getFormApiFeedback(t, formState.result, { fields: code && random ? ['password', 'confirm-password'] : [] })
      setApiFields(feedback.fields)
      setAlertState({
        open: !!feedback.message,
        content: feedback.message
      })
    } else if (resetSucceeded) {
      setAlertState({
        open: true,
        content: t('PASSWORD_RESET_SUCCESS', 'Password changed successfully')
      })
      setOpenAuthModal(true)
    }
  }, [formState])

  return (
    <ResetPasswordContainer
      data-doc-section='password-reset'
      data-doc-state={code && random ? 'new-password' : 'manual-codes'}
    >
      {/* the page's h1 is the hero's title: with the hero hidden by the theme
          it stays, only for assistive technology */}
      {!isVisible('hero') && <HiddenTitle>{t('TITLE_RESET_PASSWORD', 'Reset password')}</HiddenTitle>}
      {render({
        hero: () => (
          <HeroSide>
            <TitleHeroSide>
              <h1>{t('TITLE_RESET_PASSWORD', 'Reset password')}</h1>
              <p>{code && random ? t('SUBTITLE_RESET_PASSWORD', 'Reset your password') : t('RESET_PASSWORD_CODES_TITLE', 'Please insert the codes')}</p>
            </TitleHeroSide>
          </HeroSide>
        ),
        form: () => code && random
          ? (
        <FormSide>
          <ComponentScope group={AUTH_FORM}>
          {logo
            ? <img src={logo} alt={t('LOGO', 'Logo')} {...logoSize} loading='lazy' />
            : ownName && <LogoName title={ownName}>{ownName}</LogoName>}
          <FormInput
            noValidate
            onSubmit={handleSubmit(onSubmit)}
          >
            <div>
            <LabeledField label={t('NEW_PASSWORD', 'New password')} htmlFor={`${fieldsId}-password`}>
              <Input
                id={`${fieldsId}-password`}
                type='password'
                name='password'
                aria-label={t('NEW_PASSWORD', 'New password')}
                spellCheck='false'
                ref={register({
                  required: t('VALIDATION_ERROR_PASSWORD_REQUIRED', 'The field password is required'),
                  minLength: {
                    value: 8,
                    message: t('VALIDATION_ERROR_PASSWORD_MIN_STRING', 'The Password must be at least 8 characters.').replace('_attribute_', t('PASSWORD', 'Password')).replace('_min_', 8)
                  }
                })}
                placeholder={t('NEW_PASSWORD', 'New password')}
                onChange={editField}
                autoComplete='off'
                {...errorProps('password')}
              />
            </LabeledField>
            {errorText('password')}
            </div>
            <div>
            <LabeledField label={t('CONFIRM_PASSWORD', 'Confirm Password')} htmlFor={`${fieldsId}-confirm-password`}>
              <Input
                id={`${fieldsId}-confirm-password`}
                type='password'
                name='confirm-password'
                aria-label={t('CONFIRM_PASSWORD', 'Confirm Password')}
                spellCheck='false'
                ref={register({
                  required: t('VALIDATION_ERROR_PASSWORD_CONFIRM_REQUIRED', 'The field password confirm is required'),
                  validate: value =>
                    value === password.current || t('VALIDATION_ERROR_PASSWORDS_MATCH', 'The passwords do not match')
                })}
                placeholder={t('CONFIRM_PASSWORD', 'Confirm Password')}
                onChange={editField}
                autoComplete='off'
                {...errorProps('confirm-password')}
              />
            </LabeledField>
            {errorText('confirm-password')}
            </div>
            <Button
              data-doc-control='password-reset-submit'
              type='submit'
              {...slotButtonOptions(theme, AUTH_FORM, 'submit', { color: (formState.loading || resetSucceeded) ? 'secondary' : 'primary', size: 'lg' })}
              shape='text'
              loading={!!formState.loading}
              disabled={!!(formState.loading || resetSucceeded)}
            >
              {t('CHANGE_PASSWORD', 'Change password')}
            </Button>
          </FormInput>
          </ComponentScope>
        </FormSide>
            )
          : (
        <FormSide>
          <ComponentScope group={AUTH_FORM}>
          {logo
            ? <img src={logo} alt={t('LOGO', 'Logo')} {...logoSize} loading='lazy' />
            : ownName && <LogoName title={ownName}>{ownName}</LogoName>}
          <FormInput
            noValidate
            onSubmit={handleSubmit(onSubmit)}
          >
            {!code && (
              <div>
              <LabeledField label={t('CODE', 'Code')} htmlFor={`${fieldsId}-code`}>
                <Input
                  id={`${fieldsId}-code`}
                  name='code'
                  aria-label={t('CODE', 'Code')}
                  ref={register({
                    required: t('RESET_PASSWORD_CODE_REQUIRED', 'The field code is required')
                  })}
                  placeholder={t('CODE', 'Code')}
                  onChange={editField}
                  autoComplete='off'
                  {...errorProps('code')}
                />
              </LabeledField>
              {errorText('code')}
              </div>
            )}
            {!random && (
              <div>
              <LabeledField label={t('RAMDON', 'Random')} htmlFor={`${fieldsId}-random`}>
                <Input
                  id={`${fieldsId}-random`}
                  name='random'
                  aria-label={t('RAMDON', 'Random')}
                  ref={register({
                    required: t('RESET_PASSWORD_RANDOM_REQUIRED', 'The field random is required')
                  })}
                  placeholder={t('RAMDON', 'Random')}
                  onChange={editField}
                  autoComplete='off'
                  {...errorProps('random')}
                />
              </LabeledField>
              {errorText('random')}
              </div>
            )}
            <Button
              type='submit'
              {...slotButtonOptions(theme, AUTH_FORM, 'submit', { color: 'primary', size: 'lg' })}
              shape='text'
            >
              {t('SUBMIT_CODES', 'Submit codes')}
            </Button>
          </FormInput>
          </ComponentScope>
        </FormSide>
            )
      }, { group: 'main' })}
      {openAuthModal && (
        <DialogOverlay
          open={openAuthModal}
          onClose={() => setOpenAuthModal(false)}
          size='lg'
        >
          <LoginForm
            handleSuccessLogin={handleSuccessLogin}
            useLoginByCellphone
            isPopup
          />
        </DialogOverlay>
      )}
      <Alert
        title={t('RESET_PASSWORD', 'Reset Password')}
        content={alertState?.content}
        acceptText={resetSucceeded ? t('ACCEPT', 'Accept') : t('CLOSE', 'Close')}
        open={alertState.open}
        onClose={() => closeAlert()}
        onAccept={() => closeAlert()}
        closeOnBackdrop={false}
      />
    </ResetPasswordContainer>
  )
}

export const ResetPassword = (props) => {
  const resetPasswordProps = {
    ...props,
    UIComponent: ResetPasswordUI
  }

  return <ResetPasswordController {...resetPasswordProps} />
}
