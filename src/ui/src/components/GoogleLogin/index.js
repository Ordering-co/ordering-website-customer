import React, { useEffect } from 'react'
import { useTheme } from 'styled-components'

import { useLanguage } from '~components/contexts/LanguageContext'
import { FirebaseGoogleLoginButton as GoogleLoginController } from '~components/components/FirebaseGoogleLoginButton'

import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { slotButtonOptions } from '~/utils/themeGroups'

const GoogleLoginButtonUI = (props) => {
  const [, t] = useLanguage()
  // the look of auth_form.slots.social (its shape was never read: a text button)
  const theme = useTheme()
  const { shape, ...options } = slotButtonOptions(theme, 'auth_form', 'social', { size: 'lg', color: 'neutral', appearance: 'outline' })
  const { signInWithGoogle, actionState, onLoadingChange, disabled } = props
  const isLoading = actionState?.loading

  useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading])

  return (
    <Button
      {...options}
      fullWidth
      socialIcon={<Icon name='google' />}
      busy={isLoading}
      disabled={disabled}
      onClick={signInWithGoogle}
    >
      {t('GOOGLE', 'Google')}
    </Button>
  )
}

export const GoogleLoginButton = (props) => {
  const googleLoginProps = {
    ...props,
    UIComponent: GoogleLoginButtonUI
  }
  return <GoogleLoginController {...googleLoginProps} />
}
