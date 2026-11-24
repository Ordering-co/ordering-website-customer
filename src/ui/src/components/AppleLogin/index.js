import React, { useEffect } from 'react'
import { useTheme } from 'styled-components'

import { AppleLogin as AppleLoginController } from '~components/components/AppleLogin'
import { useLanguage } from '~components/contexts/LanguageContext'

import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { slotButtonOptions } from '~/utils/themeGroups'

const AppleLoginUI = (props) => {
  const {
    initLoginApple,
    formState,
    onLoadingChange,
    disabled
  } = props

  const [, t] = useLanguage()
  // the look of auth_form.slots.social (its shape was never read: a text button)
  const theme = useTheme()
  const { shape, ...options } = slotButtonOptions(theme, 'auth_form', 'social', { size: 'lg', color: 'neutral', appearance: 'outline' })
  const isLoading = formState?.loading

  useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading])

  return (
    <Button
      {...options}
      fullWidth
      socialIcon={<Icon name='apple' />}
      busy={isLoading}
      disabled={disabled}
      onClick={() => initLoginApple()}
    >
      {t('APPLE', 'Apple')}
    </Button>
  )
}

export const AppleLogin = (props) => {
  const propss = {
    ...props,
    UIComponent: AppleLoginUI
  }
  return <AppleLoginController {...propss} />
}
