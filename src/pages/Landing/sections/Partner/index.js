import React from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSession } from '~components/contexts/SessionContext'
import { Button } from '~ui/src/design-system/components/Button'
import { Band, Column, Title } from '../MarketplaceSection/styles'
import { Offer, OfferBody, OfferText } from './styles'

// The business sign-up redirects a customer who has a session (App.js), so only
// a guest is offered it. The offer is its own surface (title and text beside the
// action), so it frames its h2 itself instead of the section's heading row.
export const Partner = () => {
  const [, t] = useLanguage()
  const [{ auth }] = useSession()
  if (auth) return null

  return (
    <Band id='landing-partner' aria-labelledby='landing-partner-title'>
      <Column>
        <Offer>
          <OfferBody>
            <Title id='landing-partner-title'>{t('LANDING_PARTNER_TITLE', 'Own a restaurant?')}</Title>
            <OfferText>{t('LANDING_PARTNER_TEXT', 'Reach more customers in your city.')}</OfferText>
          </OfferBody>
          <Button nativeButton={false} role='link' render={<Link to='/signup_business' />}>
            {t('LANDING_PARTNER_CTA', 'Partner with us')}
          </Button>
        </Offer>
      </Column>
    </Band>
  )
}
