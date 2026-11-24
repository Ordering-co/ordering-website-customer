import React, { useEffect } from 'react'
import { useTheme } from 'styled-components'
import { FacebookLoginButton as FacebookLoginController } from '~components/components/FacebookLoginButton'
import { useLanguage } from '~components/contexts/LanguageContext'

import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { slotButtonOptions } from '~/utils/themeGroups'

const FacebookLoginButtonUI = (props) => {
  const [, t] = useLanguage()
  // the look of auth_form.slots.social (its shape was never read: a text button)
  const theme = useTheme()
  const { shape, ...options } = slotButtonOptions(theme, 'auth_form', 'social', { size: 'lg', color: 'neutral', appearance: 'outline' })
  const { handleFacebookLogin, formState, onLoadingChange, disabled } = props
  const isLoading = formState?.loading

  useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading])

  return (
    <Button
      {...options}
      fullWidth
      socialIcon={<Icon name='facebook' />}
      busy={isLoading}
      disabled={disabled}
      onClick={() => handleFacebookLogin()}
    >
      {t('FACEBOOK', 'Facebook')}
    </Button>
  )
}

export const FacebookLoginButton = (props) => {
  const facebookLoginProps = {
    ...props,
    UIComponent: FacebookLoginButtonUI
  }
  return <FacebookLoginController {...facebookLoginProps} />
}
