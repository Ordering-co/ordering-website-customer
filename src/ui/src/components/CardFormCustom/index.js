import React, { useId, useState } from 'react'
import Card from 'react-credit-cards-2'
import 'react-credit-cards-2/es/styles-compiled.css'
import { useForm } from 'react-hook-form'

import {
  formatCreditCardNumber,
  formatCVC,
  formatExpirationDate,
  getCardType
} from './cardUtils'
import { FormContainer, InputContainer, SubmitRow } from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { Input } from '~ui/src/design-system/components/Input'
import { LabeledField } from '~ui/src/styles/Field'
import { Button } from '~ui/src/design-system/components/Button'

export const CardFormCustom = (props) => {
  const {
    handleNewCard,
    setAddCardOpen
  } = props

  const [, t] = useLanguage()
  // with the labels above the fields: the id each label points at
  const fieldsId = useId()
  const [formState, setFormState] = useState({
    cvc: '',
    expiry: '',
    focus: '',
    name: '',
    number: ''
  })

  const formMethods = useForm()

  const handleInputFocus = (e) => {
    setFormState({
      ...formState,
      focus: e.target.name
    })
  }

  const handleInputChange = ({ target }) => {
    if (target.name === 'number') {
      target.value = formatCreditCardNumber(target.value)
    } else if (target.name === 'expiry') {
      target.value = formatExpirationDate(target.value)
    } else if (target.name === 'cvc') {
      target.value = formatCVC(target.value)
    }
    setFormState({
      ...formState,
      [target.name]: target.value
    })
  }

  const onSubmit = (values) => {
    const cardBrand = getCardType(values?.number)
    const lastFourDigits = values?.number.substr(-4)
    const card = {
      type: 'card',
      brand: cardBrand,
      last4: lastFourDigits,
      ccnumber: values?.number?.replace(/\s/g, ''),
      ccexp: values?.expiry?.replace('/', ''),
      cvv: values?.cvc
    }
    handleNewCard(card)
    setAddCardOpen(false)
  }

  return (
    <FormContainer id='PaymentForm'>
      <Card
        cvc={formState.cvc}
        expiry={formState.expiry}
        focused={formState.focus}
        name={formState.name}
        number={formState.number}
        locale={{
          valid: t('VALID_THRU', 'Valid thru')
        }}
        placeholders={{
          name: t('YOUR_NAME_HERE', 'Your name here')
        }}
      />
      <form
        onSubmit={formMethods.handleSubmit(onSubmit)}
      >
        <InputContainer>
          <LabeledField label={t('CARD_NUMBER', 'Card number')} htmlFor={`${fieldsId}-number`}>
            <Input
              id={`${fieldsId}-number`}
              type='tel'
              name='number'
              placeholder={t('CARD_NUMBER', 'Card number')}
              inputMode='numeric'
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              pattern='[\d| ]{16,22}'
              maxLength={19}
              ref={
                formMethods.register({
                  required: t('CARD_NUMBER_REQUIRED', 'Card number is required'),
                  pattern: /^[\d| ]{16,22}$/i
                })
              }
              invalid={Boolean(formMethods.errors.number)}
            />
          </LabeledField>
        </InputContainer>
        <InputContainer>
          <LabeledField label={t('NAME', 'Name')} htmlFor={`${fieldsId}-name`}>
            <Input
              id={`${fieldsId}-name`}
              type='text'
              name='name'
              placeholder={t('NAME', 'Name')}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              ref={
                formMethods.register({
                  required: t('NAME_REQUIRED', 'Name is required')
                })
              }
              invalid={Boolean(formMethods.errors.name)}
            />
          </LabeledField>
        </InputContainer>
        <InputContainer>
          <LabeledField label={t('EXPIRY', 'Expiry')} htmlFor={`${fieldsId}-expiry`}>
            <Input
              id={`${fieldsId}-expiry`}
              type='text'
              name='expiry'
              pattern='\d\d/\d\d'
              placeholder={t('EXPIRY', 'Expiry')}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              ref={
                formMethods.register({
                  required: t('EXPIRY_DATE_REQUIRED', 'Expiry date required')
                })
              }
              invalid={Boolean(formMethods.errors.expiry)}
            />
          </LabeledField>
          <LabeledField label={t('CVC', 'CVC')} htmlFor={`${fieldsId}-cvc`}>
            <Input
              id={`${fieldsId}-cvc`}
              type='text'
              name='cvc'
              placeholder={t('CVC', 'CVC')}
              pattern='\d{3,4}'
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              ref={
                formMethods.register({
                  required: t('CVC_REQUIRED', 'CVC is required')
                })
              }
              invalid={Boolean(formMethods.errors.cvc)}
            />
          </LabeledField>
        </InputContainer>
        <SubmitRow>
          <Button
            type='submit'
            color='primary'
            fullWidth
            disabled={Object.keys(formMethods.errors)?.length > 0}
          >
            {t('SAVE', 'Save')}
          </Button>
        </SubmitRow>
      </form>
    </FormContainer>
  )
}
