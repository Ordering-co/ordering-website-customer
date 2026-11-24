import React, { useRef } from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Alert } from '~ui/src/components/Confirm'
import { INVALID_API_JSON_BODY } from '~components/utils/parseApiJsonBody'
import { isMomentSavePending } from '~ui/src/components/MomentControl/momentSave'

// The alert OrderProvider opens when the API rejects an order change. It cannot tell which
// change it was: one that opens while a picker's Save is in flight is the rejection of that
// Save, and with no readable reason it is about the time. That is read once,
// when it opens: an alert of another operation later does not inherit it.
// A response that is not JSON arrives as the SDK's technical text when the
// remote dictionary lacks INVALID_JSON_RESPONSE: the code says it.
export const OrderAlert = (props) => {
  const [, t] = useLanguage()
  const aboutTime = useRef(false)
  const wasOpen = useRef(false)
  if (props.open && !wasOpen.current) aboutTime.current = isMomentSavePending()
  if (!props.open) aboutTime.current = false
  wasOpen.current = !!props.open
  const content = Array.isArray(props.content)
    ? props.content.map((item) => item === INVALID_API_JSON_BODY.result[0]
      ? t('INVALID_JSON_RESPONSE', "We couldn't confirm your order. Your cart and details are saved, please try again.")
      : item)
    : props.content
  return (
    <Alert
      {...props}
      content={content}
      fallbackContent={aboutTime.current
        ? t('MOMENT_SAVE_ERROR', 'We couldn\'t save that time. Choose another time or try again.')
        : undefined}
    />
  )
}
