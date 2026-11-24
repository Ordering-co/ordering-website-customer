import React from 'react'
import { TouchSlot } from '~ui/src/styles/TouchSlot'
import { useTheme } from 'styled-components'
import { Hero, BgImg, HeroText, LogoImg, LogoName, Content, Segment, InputWrapper, BusinessSearch } from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useSite } from '~components/contexts/SiteContext'
import { slotButtonProps } from '~/utils/themeGroups'
import { getThemeInverseLogo, getThemeLogoUrl } from '~/utils/siteBranding'
import { ownSiteName } from '~/utils/resolvePwaBranding'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'

export const CancellationComponent = props => {
  const {
    bgUrl,
    logoUrl,
    ButtonComponent,
    InputComponent
  } = props
  const [, t] = useLanguage()
  const theme = useTheme()
  const [{ site }] = useSite()
  // The logo sits on the dark hero (inverse_surface): the theme's logo for
  // dark backgrounds (logotype, else isotype), then the site's logo.
  const logoSrc = logoUrl || getThemeInverseLogo(theme) || getThemeLogoUrl(theme)
  const ownName = !logoSrc && ownSiteName({ theme, site })
  const heroSrc = bgUrl || BUNDLED_IMAGES.general.businessHero

  return (
    <div data-doc-section='global-site-out-of-service'>
      <Hero>
        {heroSrc && (
          <BgImg src={heroSrc} alt='' />
        )}
        <HeroText>
          {logoSrc
            ? <LogoImg src={logoSrc} alt={t('LOGO', 'Logo')} />
            : ownName && <LogoName title={ownName}>{ownName}</LogoName>}
          <h1 className='title'>{t('CANCELLATION_TITLE', 'SITE OUT OF SERVICE')}</h1>
          {/* a subtitle, not a heading */}
          <p
            className='sub-title' dangerouslySetInnerHTML={{
              __html: t('CANCELLATION_SUBTITLE', 'This website has been archived or suspended in accordance with our :Terms of Service').replace(':Terms of Service', `<b><i>${t('CANCELLATION_TERMS', 'Terms of Service')}</i></b>`)
            }}
          />
        </HeroText>
      </Hero>
      <Content>
        <p dangerouslySetInnerHTML={{
          __html: t('CANCELLATION_OWNER_TEXT', 'If you are the :owner of this website contact us to reactivate your website.').replace(':owner', `<b>${t('CANCELLATION_OWNER', 'owner')}</b>`)
        }}
        />
        {ButtonComponent && (
          <ButtonComponent color='primary'>{t('CANCELLATION_CONTACT_US', 'Contact us')}</ButtonComponent>
        )}
      </Content>
      <Segment>
        <p dangerouslySetInnerHTML={{
          __html: t('CANCELLATION_CUSTOMER_TEXT', 'If you are a :customer, let the owner know you miss this website. Just write your email below.').replace(':customer', `<b>${t('CANCELLATION_CUSTOMER', 'customer')}</b>`)
        }}
        />
        <InputWrapper>
          <BusinessSearch>
            {InputComponent && (
              <InputComponent
                name='Email'
                placeholder={t('CANCELLATION_INPUT_PLACEHOLDER', 'Email')}
              />
            )}
          </BusinessSearch>
          {ButtonComponent && (
            // the input's trailing action (components.input.slots.trailing_action)
            <TouchSlot $mobile>
              <ButtonComponent color='primary' {...slotButtonProps(theme, 'input', 'trailing_action')}>
                {t('CANCELLATION_SEND_BUTTON', 'Send')}
              </ButtonComponent>
            </TouchSlot>
          )}
        </InputWrapper>
      </Segment>
    </div>
  )
}
