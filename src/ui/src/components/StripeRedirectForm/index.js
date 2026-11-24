import React, { useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'

import {
  FormRedirect,
  FormGroup,
  ErrorMessage,
  SubmitRow
} from './styles'

import { StripeRedirectForm as StripeRedirectFormController } from '~components/components/PaymentOptionStripeRedirect/StripeRedirectForm'
import { useSession } from '~components/contexts/SessionContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'
import { Input } from '~ui/src/design-system/components/Input'
import { Select } from '~ui/src/design-system/components/Select'

const StripeRedirectFormUI = (props) => {
  const {
    paymethods,
    handleSubmitPaymentMethod
  } = props

  const [{ user }] = useSession()
  const { handleSubmit, register, unregister, setValue, errors, formState } = useForm()
  const [, t] = useLanguage()
  // its labels tie to their fields
  const fieldsId = useId()
  // the payment method is a custom field of react-hook-form (v6): registered by name, its value set on each pick
  useEffect(() => {
    register({ name: 'type' }, { required: true })
    return () => unregister('type')
  }, [register, unregister])

  const typeInvalid = errors.type?.type === 'required'
  // the method has no DOM ref in the form, so the focus of the first invalid field is set here (it is the first in the form)
  const focusInvalidMethod = (invalid) => invalid.type && document.getElementById(`${fieldsId}-type`)?.focus()
  return (
    <FormRedirect onSubmit={handleSubmit(handleSubmitPaymentMethod, focusInvalidMethod)}>
      <FormGroup>
        <label htmlFor={`${fieldsId}-type`}>{t('SELECT_A_PAYMENT_METHOD', 'Select a payment method')}</label>
        <Select
          id={`${fieldsId}-type`}
          fullWidth
          placeholder={t('SELECT_A_PAYMENT_METHOD', 'Select a payment method')}
          options={(paymethods || []).map((paymethod) => ({ value: paymethod.value, content: paymethod.name }))}
          openSingle
          invalid={typeInvalid}
          aria-describedby={typeInvalid ? `${fieldsId}-type-error` : undefined}
          defaultValue={null}
          onChange={(value) => setValue('type', value, { shouldValidate: true })}
        />
        {typeInvalid && (
          <ErrorMessage id={`${fieldsId}-type-error`}>{t('FIELD_REQUIRED', 'This field is required')}</ErrorMessage>
        )}
      </FormGroup>

      <FormGroup>
        <label htmlFor={`${fieldsId}-name`}>{t('ACCOUNT_HOLDER', 'Account holder')}</label>
        <Input
          id={`${fieldsId}-name`}
          name='name'
          defaultValue={user?.name}
          placeholder={t('TYPE_ACCOUNT_HOLDER', 'Type an Account holder')}
          ref={
            register({
              required: true
            })
          }
          autoComplete='off'
        />
        {errors.name && errors.name.type === 'required' && (
          <ErrorMessage>{t('FIELD_REQUIRED', 'This field is required')}</ErrorMessage>
        )}
      </FormGroup>

      <FormGroup>
        <label htmlFor={`${fieldsId}-email`}>{t('EMAIL', 'Email')}</label>
        <Input
          id={`${fieldsId}-email`}
          name='email'
          type='email'
          defaultValue={user?.email}
          placeholder={t('TYPE_AN_EMAIL', 'Type an email')}
          ref={
            register({
              required: true
            })
          }
          autoComplete='off'
        />
        {errors.email && errors.email.type === 'required' && (
          <ErrorMessage>{t('FIELD_REQUIRED', 'This field is required')}</ErrorMessage>
        )}
      </FormGroup>
      <SubmitRow>
        <Button color='primary' type='submit' size='md' fullWidth disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('LOADING', 'Loading...') : t('OK', 'OK')}
        </Button>
      </SubmitRow>
    </FormRedirect>
  )
}

export const StripeRedirectForm = (props) => {
  const stripeRedirectFormProps = {
    ...props,
    UIComponent: StripeRedirectFormUI
  }
  return <StripeRedirectFormController {...stripeRedirectFormProps} />
}
