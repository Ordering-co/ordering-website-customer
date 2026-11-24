import React from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { galleryPhotos, useStoreLanding } from '../../useStoreLanding'
import { LandingSection, LandingSkeleton } from '../shared/LandingSection'
import { Photo, Photos } from './styles'

// the page shows the first photos; the rest is for the menu's own information
const MAX_PHOTOS = 12

/** The store's gallery photos (images only, up to 12). No photos: no section. */
export const GallerySection = ({ store }) => {
  const { business } = useStoreLanding(store, ['business'])
  const [, t] = useLanguage()

  if (business.loading) return <LandingSkeleton name='gallery' tone='alt' items={6} ratio='1' />
  const photos = galleryPhotos(business.data).slice(0, MAX_PHOTOS)
  if (!photos.length) return null

  const alt = (index) => t('BUSINESS_PHOTO_ALT', 'Photo _number_ of _business_')
    .replace('_number_', () => index + 1)
    .replace('_business_', () => business.data.name ?? '')

  return (
    <LandingSection name='gallery' title={t('PHOTOS', 'Photos')} tone='alt'>
      <Photos>
        {photos.map((photo, index) => (
          <Photo key={photo.id ?? photo.file}>
            <img src={photo.file} alt={alt(index)} loading='lazy' />
          </Photo>
        ))}
      </Photos>
    </LandingSection>
  )
}
