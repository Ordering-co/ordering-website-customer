import React, { useId } from 'react'
import { useTheme } from 'styled-components'
import { CardCvcElement, CardElement, CardExpiryElement, CardNumberElement } from '@stripe/react-stripe-js'
import {
  FormStripe,
  FormRow,
  ErrorMessage,
  FormActions,
  CardExpiryCvcField,
  CardZipcodeField
} from './styles'

import { CardForm as CardFormController } from '~components/components/StripeElementsForm/CardForm'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useValidationFields } from '~components/contexts/ValidationsFieldsContext'
import { Button } from '~ui/src/design-system/components/Button'
import { Input } from '~ui/src/design-system/components/Input'
import { SdkField } from '~ui/src/design-system/components/SdkField'
import { stripeElementOptions } from '~ui/src/design-system/lib/sdkStyle'

// What the card form gave its Stripe elements before SdkField (the same options, from lib/sdkStyle)
export const cardElementOptions = stripeElementOptions

const CardFormUI = (props) => {
  const {
    error,
    errorExpiry,
    errorCvc,
    loading,
    handleSubmit,
    handleChange,
    isSplitForm,
    handleChangeExpiry,
    handleChangeCvc,
    errorZipcode
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  const [validationFields] = useValidationFields()
  const elementOptions = stripeElementOptions(theme)
  // each label names its field (Stripe puts the id on the Element's box)
  const fieldId = useId()
  const ids = {
    number: `${fieldId}-card-number`,
    expiry: `${fieldId}-card-expiry`,
    cvc: `${fieldId}-card-cvc`,
    zipcode: `${fieldId}-card-zipcode`
  }
  const zipCodeEnabled = validationFields?.fields?.card?.zipcode?.enabled
  const zipCodeRequired = validationFields?.fields?.card?.zipcode?.required

  return (
    <FormStripe onSubmit={handleSubmit}>
      <FormRow>
        {!isSplitForm
          ? (
            <SdkField error={error}>
              <CardElement options={elementOptions} onChange={handleChange} />
            </SdkField>
            )
          : <>
            <SdkField id={ids.number} label={t('CARD_NUMBER', 'Card number')} error={error}>
              <CardNumberElement id={ids.number} options={elementOptions} onChange={handleChange} />
            </SdkField>
            <CardExpiryCvcField>
              <SdkField id={ids.expiry} label={t('EXPIRE_DATE', 'Expire date')} error={errorExpiry}>
                <CardExpiryElement id={ids.expiry} options={elementOptions} onChange={handleChangeExpiry} />
              </SdkField>
              <SdkField id={ids.cvc} label={t('CVC', 'CVC')} error={errorCvc}>
                <CardCvcElement id={ids.cvc} options={elementOptions} onChange={handleChangeCvc} />
              </SdkField>
            </CardExpiryCvcField>
            {zipCodeEnabled && (
              <CardZipcodeField>
                <label htmlFor={ids.zipcode}>{t('ZIPCODE', 'Zipcode')}</label>
                <Input
                  id={ids.zipcode}
                  name='zipcode'
                  placeholder={`${t('ZIPCODE', 'Zipcode')}${zipCodeRequired ? '*' : ''}`}
                  onChange={handleChange}
                />
                {errorZipcode && (
                  <ErrorMessage>{t('ZIPCODE_IS_INCOMPLETED', 'The zipcode is incomplete.')}</ErrorMessage>
                )}
              </CardZipcodeField>
            )}
          </>
        }
      </FormRow>
      <FormActions>
        <Button
          color='primary'
          size='md'
          type='submit'
          fullWidth
          disabled={loading}
        >
          {loading ? t('LOADING', 'Loading...') : t('ADD_CARD', 'Add card')}
        </Button>
      </FormActions>
    </FormStripe>
  )
}

export const CardForm = (props) => {
  const cardFormProps = {
    ...props,
    UIComponent: CardFormUI
  }
  return <CardFormController {...cardFormProps} />
}
