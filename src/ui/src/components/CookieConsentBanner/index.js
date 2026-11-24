import React from 'react'
import { useCookieConsent } from '../../../../contexts/CookieConsentContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import {
  BannerContainer,
  BannerContent,
  BannerText,
  BannerActions,
  BannerLink
} from './styles'
import { Button } from '~ui/src/design-system/components/Button'

export const CookieConsentBanner = () => {
  const { consentStatus, acceptConsent, optOutConsent, isConsentEnabled } = useCookieConsent()
  const [, t] = useLanguage()

  if (!isConsentEnabled || consentStatus !== 'unknown') return null

  const termsUrl = t('COOKIE_TERMS_URL', '/pages/terms_of_use')
  const privacyUrl = t('COOKIE_PRIVACY_URL', '/pages/privacy_policy')
  const isExternal = (url) => /^https?:\/\//.test(url)

  return (
    <BannerContainer data-doc-section='global-cookie-consent' role='dialog' aria-label={t('COOKIE_CONSENT', 'Cookie consent')}>
      <BannerContent>
        <BannerText>
          {t('COOKIE_CONSENT_MESSAGE', 'We use cookies and other tracking technologies to enhance your experience on our site. By continuing to use our site, you agree to our')}
          {' '}
          <BannerLink
            href={termsUrl}
            {...(isExternal(termsUrl) && { target: '_blank', rel: 'noopener noreferrer' })}
          >
            {t('TERMS_OF_USE', 'Terms of Use')}
          </BannerLink>
          {' '}
          {t('AND', 'and')}
          {' '}
          <BannerLink
            href={privacyUrl}
            {...(isExternal(privacyUrl) && { target: '_blank', rel: 'noopener noreferrer' })}
          >
            {t('PRIVACY_POLICY', 'Privacy Policy')}
          </BannerLink>
        </BannerText>
        {/* over the banner: "Got it" is the theme's inverse button, "Opt out" its ghost */}
        <BannerActions>
          <Button color='inverse' appearance='ghost' size='md' onClick={optOutConsent}>
            {t('COOKIE_OPT_OUT', 'Opt Out')}
          </Button>
          <Button color='inverse' size='md' onClick={acceptConsent}>
            {t('COOKIE_GOT_IT', 'Got it')}
          </Button>
        </BannerActions>
      </BannerContent>
    </BannerContainer>
  )
}
