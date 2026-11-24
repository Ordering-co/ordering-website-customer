import React from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { aboutText, galleryPhotos, useStoreLanding } from '../../useStoreLanding'
import { LandingSkeleton } from '../shared/LandingSection'
import { OrderLink } from '../shared/OrderLink'
import { SectionInner, SectionRoot, SectionTitle } from '../shared/styles'
import { AboutLayout, AboutPhoto, AboutText } from './styles'

/** The store's story (`about`, else `description`) with the first photo of its gallery. No text: no section. */
export const AboutSection = ({ store }) => {
  const { business } = useStoreLanding(store, ['business'])
  const [, t] = useLanguage()

  if (business.loading) return <LandingSkeleton name='about' tone='alt' items={2} min='40ch' />
  const text = aboutText(business.data)
  if (!text) return null

  const photo = galleryPhotos(business.data)[0]
  const titleId = 'landing-about-title'
  return (
    <SectionRoot id='landing-about' data-landing-section='about' aria-labelledby={titleId} $tone='alt'>
      <SectionInner>
        <AboutLayout $photo={!!photo}>
          <AboutText>
            <SectionTitle id={titleId}>{t('LANDING_ABOUT_TITLE', 'About _name_').replace('_name_', () => business.data.name || '')}</SectionTitle>
            {text.split(/\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            <OrderLink>{t('ORDER_NOW', 'Order now')}</OrderLink>
          </AboutText>
          {photo && <AboutPhoto src={photo.file} alt={business.data.name || ''} loading='lazy' />}
        </AboutLayout>
      </SectionInner>
    </SectionRoot>
  )
}
