import React, { useState } from 'react'
import { PurchaseGiftCard } from '../PurchaseGiftCard'
import { RedeemGiftCard } from '../RedeemGiftCard'

import {
  TitleWrapper,
  ActionWrapper,
  Title,
  GiftCardContainer,
  Hero,
  HeroCard,
  HeroCopy,
  GiftCardSection
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Button } from '~ui/src/design-system/components/Button'
import { Divider } from '~ui/src/styles/Divider'

import { Icon } from '~ui/src/design-system/components/Icon'
import { usePageSections } from '~ui/hooks/usePageSections'

export const GiftCardUI = (props) => {
  const [, t] = useLanguage()
  const [openRedeem, setOpenRedeem] = useState(false)
  // the hero, the purchase and the redeem of the gift card wallet
  // (pages.wallets, group gift_card), in the theme's order; the theme may
  // hide the hero and the redeem. The redeem's modal stays mounted outside it.
  const { sections, render } = usePageSections('wallets')
  const shown = sections.filter(section => section.group === 'gift_card' && section.visible).map(section => section.key)
  const heroAt = shown.indexOf('gift_card_hero')
  // the line of the hero: on its side that faces another section (after it;
  // before it when it comes last)
  const lineAfterHero = heroAt >= 0 && heroAt < shown.length - 1
  const lineBeforeHero = heroAt > 0 && !lineAfterHero

  const renderers = {
    gift_card_hero: () => (
      <>
        {lineBeforeHero && <Divider $variant='section' />}
        <GiftCardSection>
          <Hero>
            {/* decorative: the page's title and copy already say it */}
            <HeroCard aria-hidden='true'>
              <div className='card-top'>
                <span className='brand'>{t('GIFT_CARD', 'Gift Card')}</span>
                <Icon name="gift" />
              </div>
              <span className='card-label'>{t('GIFT_CARD_WALLET', 'Gift Card Wallet')}</span>
            </HeroCard>
            <HeroCopy>
              <h2>{t('GIFT_CARD_WALLET_TITLE', 'Give the gift of special moments with our Gift Cards')}</h2>
              <p>{t('GIFT_CARD_WALLET_DESCRIPTION', 'Our Gift Cards are the perfect way to surprise someone special. Whether it’s for a birthday, a celebration, or just to brighten their day, they offer flexibility and the freedom to choose what they love most. The perfect gift for any occasion!')}</p>
            </HeroCopy>
          </Hero>
        </GiftCardSection>
        {lineAfterHero && <Divider $variant='section' />}
      </>
    ),
    gift_card_purchase: () => (
      <GiftCardSection>
        <PurchaseGiftCard isPage />
      </GiftCardSection>
    ),
    gift_card_redeem: () => (
      <GiftCardSection>
        <TitleWrapper>
          <h2>{t('GIFT_CARD', 'Gift card')}</h2>
          <Icon name="gift" />
        </TitleWrapper>
        <ActionWrapper>
          <div className='gift-card-text'>
            <h3>{t('GOT_GIFT_CARD', 'Got a Gift Card?')}</h3>
            <p>{t('REDEEM_IT_HERE', 'Redeem it here!')}</p>
          </div>
          <Button
            color='secondary'
            appearance='solid'
            size='sm'
            onClick={() => setOpenRedeem(true)}
          >
            {t('REDEEM', 'Redeem')}
          </Button>
        </ActionWrapper>
      </GiftCardSection>
    )
  }

  return (
    <GiftCardContainer>
      <Title>
        {t('GIFT_CARD_WALLET', 'Gift Card Wallet')}
      </Title>
      {render(renderers, { group: 'gift_card' })}
      {openRedeem && (
        <DialogOverlay
          size='lg'
          open={openRedeem}
          onClose={() => setOpenRedeem(false)}
        >
          <RedeemGiftCard
            onClose={() => setOpenRedeem(false)}
          />
        </DialogOverlay>
      )}
    </GiftCardContainer>
  )
}
