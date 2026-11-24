import React, { useId } from 'react'
import { useForm } from 'react-hook-form'
import {
  Container,
  FormController,
  FieldError,
  Actions
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { SendGiftCard as SendGiftCardController } from '~components/components/GiftCard/SendGiftCard'
import { Button } from '~ui/src/design-system/components/Button'
import { Input } from '~ui/src/design-system/components/Input'
import { Textarea } from '~ui/src/design-system/components/Textarea'
import { LabeledField } from '~ui/src/styles/Field'

const SendGiftCardUI = (props) => {
  const {
    actionState,
    handleSendGiftCard
  } = props
  const [, t] = useLanguage()
  // its labels and errors tie to their fields
  const fieldsId = useId()
  const { register, handleSubmit, errors } = useForm()

  const onSubmit = (values) => {
    handleSendGiftCard(values)
  }

  const emailError = errors.email?.message

  return (
    <Container onSubmit={handleSubmit(onSubmit)}>
      <h2>{t('GIFT_CARD_DETAILS', 'Gift Card details')}</h2>
      <FormController>
        <LabeledField label={t('GIFT_CARD_TO', 'To')} htmlFor={`${fieldsId}-email`}>
          <Input
            id={`${fieldsId}-email`}
            aria-label={t('GIFT_CARD_TO', 'To')}
            name='email'
            type='email'
            placeholder={t('ENTER_AN_EMAIL', 'Enter an email')}
            ref={register({
              required: t('VALIDATION_ERROR_EMAIL_REQUIRED', 'The field Email is required').replace('_attribute_', t('EMAIL', 'Email'))
            })}
            autoComplete='off'
            invalid={!!emailError}
            aria-describedby={emailError ? `${fieldsId}-email-error` : undefined}
          />
        </LabeledField>
        {emailError && <FieldError id={`${fieldsId}-email-error`}>{emailError}</FieldError>}
      </FormController>
      <FormController>
        <LabeledField label={t('NAME', 'Name')} htmlFor={`${fieldsId}-user_name`}>
          <Input
            id={`${fieldsId}-user_name`}
            aria-label={t('NAME', 'Name')}
            name='user_name'
            ref={register()}
            placeholder={t('WRITE_A_NAME', 'Write a name')}
            autoComplete='off'
          />
        </LabeledField>
      </FormController>
      <FormController>
        <LabeledField label={t('TITLE', 'Title')} htmlFor={`${fieldsId}-title`}>
          <Input
            id={`${fieldsId}-title`}
            aria-label={t('TITLE', 'Title')}
            name='title'
            ref={register()}
            placeholder={t('TITLE', 'Title')}
            autoComplete='off'
          />
        </LabeledField>
      </FormController>
      <FormController>
        <LabeledField label={t('MESSAGES', 'Messages')} htmlFor={`${fieldsId}-message`}>
          <Textarea
            id={`${fieldsId}-message`}
            aria-label={t('MESSAGES', 'Messages')}
            name='message'
            ref={register()}
            rows={5}
            placeholder={t('TYPE_YOUR_MESSAGE_HERE', 'Type your message here')}
            autoComplete='off'
          />
        </LabeledField>
      </FormController>
      <Actions>
        <Button type='submit' loading={!!actionState?.loading}>
          {t('SEND_GIFT_CARD', 'Send gift card')}
        </Button>
      </Actions>
    </Container>
  )
}

export const SendGiftCard = (props) => {
  const sendGiftCardProps = {
    ...props,
    showToastMsg: true,
    UIComponent: SendGiftCardUI
  }
  return <SendGiftCardController {...sendGiftCardProps} />
}
