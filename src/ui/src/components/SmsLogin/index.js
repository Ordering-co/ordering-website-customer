import React from 'react'
import { useTheme } from 'styled-components'

import { LoginForm as LoginFormController } from '~components/components/LoginForm'
import { useLanguage } from '~components/contexts/LanguageContext'

import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { slotButtonOptions } from '~/utils/themeGroups'

const SmsLoginButtonUI = (props) => {
  const [, t] = useLanguage()
  const { handleSmsLogin, disabled } = props
  const theme = useTheme()
  // a social login like the others (Apple, Google, Facebook): the look of
  // auth_form.slots.social (its shape was never read: a text button)
  const { shape, ...options } = slotButtonOptions(theme, 'auth_form', 'social', { size: 'lg', color: 'neutral', appearance: 'outline' })
  return (
    <Button
      data-doc-control='authentication-sms-entry'
      {...options}
      fullWidth
      socialIcon={<Icon name='sms' />}
      disabled={disabled}
      onClick={() => handleSmsLogin()}
      style={props.style}
    >
      {t('LOGIN_WITH_SMS', 'Login with SMS')}
    </Button>
  )
}

export const SmsLoginButton = (props) => {
  const smsLoginProps = {
    ...props,
    UIComponent: SmsLoginButtonUI
  }
  return <LoginFormController {...smsLoginProps} />
}
