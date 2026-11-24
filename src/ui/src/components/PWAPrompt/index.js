import React from 'react'
import loadable from '@loadable/component'
import { useTheme } from 'styled-components'

import { useLanguage } from '~components/contexts/LanguageContext'
import { buildPwaPromptCopy, isIosPwaPromptDevice, shouldShowIosPwaPrompt } from '../../../../utils/pwaPromptCopy'
import { themeVisible } from '~/utils/themeVisibility'

// The library only shows on iOS / iPadOS: its chunk loads only there.
const LibraryPWAPrompt = loadable(() => import('react-ios-pwa-prompt'))

export const PWAPrompt = ({
  ready,
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
}) => {
  const [languageState, t] = useLanguage()
  const theme = useTheme()

  // The theme shows or hides the "Add to Home Screen" prompt
  if (!themeVisible(theme, 'pwa_prompt')) return null

  if (!shouldShowIosPwaPrompt({
    ready,
    languageLoading: languageState.loading,
    userAgent
  })) {
    return null
  }

  if (!isIosPwaPromptDevice({ userAgent })) return null

  return (
    <LibraryPWAPrompt
      promptOnVisit={1}
      timesToShow={100}
      permanentlyHideOnDismiss={false}
      {...buildPwaPromptCopy(t)}
    />
  )
}

export default PWAPrompt
