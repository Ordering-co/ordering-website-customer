import React from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Rating } from '~ui/src/design-system/components/Rating'
import { useStoreLanding } from '../../useStoreLanding'
import { LandingSection, LandingSkeleton } from '../shared/LandingSection'
import { Average, Count, Quote, QuoteAuthor, QuoteText, Quotes, Summary } from './styles'

const stars = (t, value) => t('STARS_OUT_OF_FIVE', '_NUMBER_ of 5 stars').replace('_NUMBER_', value)

/** The store's rating, how many reviews it has and up to 3 recent ones of 4-5 stars with a comment. No reviews: no section. */
export const ReviewsSection = ({ store }) => {
  const { reviews } = useStoreLanding(store, ['reviews'])
  const [, t] = useLanguage()

  if (reviews.loading) return <LandingSkeleton name='reviews' items={3} ratio='3 / 2' />
  const data = reviews.data
  if (!data || !(data.count > 0)) return null

  const average = Math.round(data.average * 10) / 10
  return (
    <LandingSection
      name='reviews'
      title={t('LANDING_REVIEWS_TITLE', 'What guests say')}
      action={(
        <Summary>
          <Average>{average.toFixed(1)}</Average>
          <Rating value={average} size='sm' label={stars(t, average)} />
          <Count>{t('LANDING_REVIEWS_COUNT', '_count_ reviews').replace('_count_', data.count)}</Count>
        </Summary>
      )}
    >
      {data.recent.length > 0 && (
        <Quotes>
          {data.recent.map((review) => (
            <Quote key={review.id}>
              <Rating value={review.rating} size='sm' label={stars(t, review.rating)} />
              <QuoteText>{review.comment}</QuoteText>
              <QuoteAuthor>{review.author || t('LANDING_GUEST', 'Guest')}</QuoteAuthor>
            </Quote>
          ))}
        </Quotes>
      )}
    </LandingSection>
  )
}
