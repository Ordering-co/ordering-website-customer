import React from 'react'
import { useTheme } from 'styled-components'
import settings from '~/config'
import { smartBanner } from '~/utils/siteSettings'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Band, Copy, Inner, Stores, Text, Title } from './styles'

const appStoreUrl = (appleId) => `https://apps.apple.com/app/id${appleId}`
const playStoreUrl = (androidId) => `https://play.google.com/store/apps/details?id=${androidId}`

/**
 * Download of the app. It belongs to the site, not to a store, so the
 * marketing page of any site type can use it: the ids are the site's app
 * store ids (`smartBanner`, which falls back to the project's). Without any
 * id there is nothing to link to, and the section is not drawn.
 */
export const AppSection = () => {
  const [, t] = useLanguage()
  const theme = useTheme()
  const { appleId, androidId } = smartBanner(theme, settings)
  if (!appleId && !androidId) return null

  return (
    <Band id='landing-app' aria-labelledby='landing-app-title'>
      <Inner>
        <Copy>
          <Title id='landing-app-title'>{t('LANDING_GET_APP', 'Get our app')}</Title>
          <Text>{t('LANDING_GET_APP_TEXT', 'Order faster and follow your order from your phone.')}</Text>
        </Copy>
        <Stores>
          {appleId && (
            <Button appearance='outline' color='neutral' nativeButton={false} render={<a href={appStoreUrl(appleId)} rel='noopener' />} aria-label={t('LANDING_APP_STORE_LABEL', 'Download on the App Store')}>
              <Icon name='apple' />
              App Store
            </Button>
          )}
          {androidId && (
            <Button appearance='outline' color='neutral' nativeButton={false} render={<a href={playStoreUrl(androidId)} rel='noopener' />} aria-label={t('LANDING_PLAY_STORE_LABEL', 'Get it on Google Play')}>
              <Icon name='google' />
              Google Play
            </Button>
          )}
        </Stores>
      </Inner>
    </Band>
  )
}

export default AppSection
