import React, { useEffect, useId, useState, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'

import {
  Container,
  FormContainer,
  FormController,
  FieldError,
  GiftCardInfoContainer,
  FormAction,
  InfoAction
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { RedeemGiftCard as RedeemGiftCardController } from '~components/components/GiftCard/RedeemGiftCard'
import { Alert } from '~ui/src/components/Confirm'
import { Button } from '~ui/src/design-system/components/Button'
import { Input } from '~ui/src/design-system/components/Input'
import { LabeledField } from '~ui/src/styles/Field'
import { ModalHeading } from '~ui/src/components/Overlay/ModalHeading'

const RedeemGiftCardUI = (props) => {
  const {
    actionState,
    redeemedGiftCard,
    handleApply,
    onClose
  } = props

  const [, t] = useLanguage()
  // its labels and errors tie to their fields
  const fieldsId = useId()
  const [{ parsePrice }] = useUtils()
  const { control, register, handleSubmit, errors } = useForm()
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const codeRef = useRef(null)

  // the wallet a gift card loads (its type)
  const giftCardTypes = {
    cash: t('CASH_WALLET', 'Cash Wallet'),
    credit_point: t('CREDITS_POINTS_WALLET', 'Credit Points Wallet')
  }
  // who sent it (the author of the gift card)
  const sender = [redeemedGiftCard?.author?.name, redeemedGiftCard?.author?.lastname].filter(Boolean).join(' ')

  const onSubmit = (values) => {
    handleApply(values)
  }

  const handleChangeCode = (event) => {
    let string = event.target.value
    string = string.replace(/-/g, '')
    if (!string) return
    const codeSlices = string.match(/.{1,4}/g)
    string = codeSlices.join('-').toUpperCase()
    codeRef.current.value = string
  }

  // the errors of the request (not of a field) in an alert
  useEffect(() => {
    if (!actionState.error) return
    setAlertState({
      open: true,
      content: actionState.error
    })
  }, [actionState.error])

  // a field's error under it, read with its field
  const errorProps = (name) => errors[name]
    ? { invalid: true, 'aria-describedby': errors[name].message ? `${fieldsId}-${name}-error` : undefined }
    : {}
  const fieldError = (name) => errors[name]?.message && (
    <FieldError id={`${fieldsId}-${name}-error`}>{errors[name].message}</FieldError>
  )

  return (
    <Container>
      {!redeemedGiftCard
        ? (
        <FormContainer onSubmit={handleSubmit(onSubmit)}>
          <ModalHeading>{t('REDEEM_GIFT_CARD', 'Redeem a gift card')}</ModalHeading>
          <FormController>
            <LabeledField label={t('GIFT_CARD_CODE', 'Gift card code')} htmlFor={`${fieldsId}-code`}>
              <Controller
                name='code'
                control={control}
                defaultValue={codeRef.current ?? ''}
                render={({ onChange }) => (
                  <Input
                    id={`${fieldsId}-code`}
                    aria-label={t('GIFT_CARD_CODE', 'Gift card code')}
                    placeholder={t('GIFT_CARD_CODE_PLACEHOLDER', 'Gift card code')}
                    type='text'
                    autoComplete='off'
                    ref={codeRef}
                    {...errorProps('code')}
                    onChange={e => {
                      onChange((e.target.value).toUpperCase())
                      handleChangeCode(e)
                    }}
                  />
                )}
                rules={{
                  required: t('VALIDATION_ERROR_REQUIRED', 'Code is required').replace('_attribute_', t('CODE', 'Code'))
                }}
              />
            </LabeledField>
            {fieldError('code')}
          </FormController>
          <FormController>
            <LabeledField label={t('GIFT_CARD_PASSWORD', 'Gift card password')} htmlFor={`${fieldsId}-password`}>
              <Input
                id={`${fieldsId}-password`}
                aria-label={t('GIFT_CARD_PASSWORD', 'Gift card password')}
                placeholder={t('GIFT_CARD_PASSWORD_PLACEHOLDER', 'Gift card password')}
                name='password'
                type='password'
                ref={register({
                  required: t('VALIDATION_ERROR_PASSWORD_REQUIRED', 'The field Password is required').replace('_attribute_', t('PASSWORD', 'Password'))
                })}
                autoComplete='new-password'
                {...errorProps('password')}
              />
            </LabeledField>
            {fieldError('password')}
          </FormController>
          <FormAction>
            <Button type='submit' size='lg' fullWidth loading={!!actionState?.loading}>
              {t('APPLY_TO_YOUR_BALANCE', 'Apply to your balance')}
            </Button>
          </FormAction>
          <Alert
            title={t('ERROR', 'Error')}
            content={alertState.content}
            acceptText={t('ACCEPT', 'Accept')}
            open={alertState.open}
            onClose={() => setAlertState({ open: false, content: [] })}
            onAccept={() => setAlertState({ open: false, content: [] })}
            closeOnBackdrop={false}
          />
        </FormContainer>
          )
        : (
        <>
          <ModalHeading>{t('GIFT_CARD', 'Gift card')}</ModalHeading>
          <GiftCardInfoContainer>
            <p>{t('TYPE', 'Type')}: {giftCardTypes[redeemedGiftCard?.type] || redeemedGiftCard?.type}</p>
            <p>{t('AMOUNT', 'Amount')}: {parsePrice(redeemedGiftCard?.amount)}</p>
            {sender && <p>{t('FROM', 'From')}: {sender}</p>}
            {redeemedGiftCard?.title && <p>{t('TITLE', 'Title')}: {redeemedGiftCard?.title}</p>}
            {redeemedGiftCard?.message && <p>{t('MESSAGES', 'Messages')}: {redeemedGiftCard?.message}</p>}
            <InfoAction>
              <Button size='lg' fullWidth onClick={() => onClose()}>
                {t('OK', 'Ok')}
              </Button>
            </InfoAction>
          </GiftCardInfoContainer>
        </>
          )}
    </Container>
  )
}

export const RedeemGiftCard = (props) => {
  const redeemGiftCardProps = {
    ...props,
    UIComponent: RedeemGiftCardUI
  }
  return <RedeemGiftCardController {...redeemGiftCardProps} />
}
