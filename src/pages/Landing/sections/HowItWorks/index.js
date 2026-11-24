import React from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { MarketplaceSection } from '../MarketplaceSection'
import { Steps, Step, Marker, StepTitle, StepText } from './styles'

export const HowItWorks = () => {
  const [, t] = useLanguage()
  const steps = [
    [t('LANDING_HOW_STEP_FIND_TITLE', 'Find a restaurant'), t('LANDING_HOW_STEP_FIND_TEXT', 'Enter your address and see who delivers to you.')],
    [t('LANDING_HOW_STEP_ORDER_TITLE', 'Order in a few taps'), t('LANDING_HOW_STEP_ORDER_TEXT', 'Pay online, pick delivery or pickup.')],
    [t('LANDING_HOW_STEP_TRACK_TITLE', 'Track it live'), t('LANDING_HOW_STEP_TRACK_TEXT', 'Follow your order until it\'s at your door.')]
  ]

  return (
    <MarketplaceSection id='landing-how_it_works' title={t('LANDING_HOW_IT_WORKS_TITLE', 'How it works')}>
      <Steps>
        {steps.map(([title, text], index) => (
          <Step key={index}>
            <Marker aria-hidden='true'>{index + 1}</Marker>
            <StepTitle>{title}</StepTitle>
            <StepText>{text}</StepText>
          </Step>
        ))}
      </Steps>
    </MarketplaceSection>
  )
}
