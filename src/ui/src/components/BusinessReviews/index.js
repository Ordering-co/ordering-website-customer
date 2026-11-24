import React, { useState } from 'react'
import moment from 'moment'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import {
  BusinessReviewsContainer,
  ReviewOf,
  Content,
  Review,
  SkeletonContainer,
  ReviewsHeaderWrapper,
  ReviewsProgressWrapper,
  ReviewsProgressContent,
  ReviewsRatingTargets,
  ReviewsMarkPoint,
  ReviewTime,
  ReviewItemHeader,
  ReviewItemContent,
  SearchContainer,
  ReviewStars,
  ReviewRatingWrapper,
  RatingsLink
} from './styles'
import ratingsIllustration from './ratings-illustration.svg'
import { AutoScroll } from '~ui/src/components/AutoScroll'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'

import { BusinessReviews as BusinessReviewController } from '~components/components/BusinessReviews'
import { useLanguage } from '~components/contexts/LanguageContext'

import { Input } from '~ui/src/design-system/components/Input'
import { Avatar } from '~ui/src/design-system/components/Avatar'
import { Icon } from '~ui/src/design-system/components/Icon'
import { themeVisible } from '~/utils/themeVisibility'
import { ProgressBar } from '~ui/src/styles/Progress'
import { Rating } from '~ui/src/design-system/components/Rating'
import { ModalHeading } from '~ui/src/components/Overlay/ModalHeading'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'

export const BusinessReviewsUI = (props) => {
  const { totalReviews, stars, reviewsList, handleClickOption, onChangeReview, isColumnMode } = props
  const [, t] = useLanguage()
  const theme = useTheme()

  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOnChange = (evt) => {
    if (evt.target.value) onChangeReview(evt.target.value)
    else onChangeReview('')
  }
  // the rating the ranking filters by: a second click on it shows them all
  const [ratingSelected, setRatingSelected] = useState(null)
  const handleClickRaiting = (raiting) => {
    if (!raiting) return
    const next = ratingSelected === raiting ? null : raiting
    setRatingSelected(next)
    handleClickOption(next ?? 'all')
  }

  // the ranking (the average and the ratings to filter by) and the search
  // of the comments, off by default (visibility business.reviews.ranking,
  // business.reviews.search)
  const showRanking = themeVisible(theme, 'business.reviews.ranking')
  const showReviewDate = themeVisible(theme, 'business.reviews.review_date')
  const showCustomerComments = themeVisible(theme, 'business.reviews.customer_comments')
  const showSearch = themeVisible(theme, 'business.reviews.search')
  const hideElement = false

  const reviewPoints = [1, 2, 3, 4, 5]
  // no reviews: the empty state of the app (NotFoundSource, the theme's
  // empty.not_found) in place of the list, under the title
  const isEmpty = !reviewsList.loading && reviewsList?.reviews.length === 0

  const ReviewList = () => {
    return (
      <>
        {!reviewsList.loading
          ? reviewsList?.reviews.map((review) => (
            <Review key={review.id} id='review' reviewName={review?.name} isColumnMode={isColumnMode}>
              {/* visibility business.reviews.review_date hides only the date */}
              <ReviewItemHeader isColumnMode={isColumnMode}>
                  {review?.name && (
                    <Avatar
                      className='review-avatar'
                      size={isColumnMode ? 'md' : 'lg'}
                      initialsText={isColumnMode ? 'h2' : 'display'}
                      fallback={review.name.charAt(0).toUpperCase()}
                    />
                  )}
                  <div className='review-info'>
                    {review?.name && (
                      <h3>{review?.name}</h3>
                    )}
                    <ReviewStars reviewName={review?.name}>
                      {/* components.rating sm, an image named by the rating */}
                      <Rating value={Number(review?.total) || 0} size='sm' label={t('STARS_OUT_OF_FIVE', '_NUMBER_ of 5 stars').replace('_NUMBER_', Number(review?.total) || 0)} />
                      {showReviewDate && review?.name && <ReviewTime>{moment.utc(review?.created_at).local().format('DD/MM/YY')}</ReviewTime>}
                    </ReviewStars>
                    {showReviewDate && !review?.name && <ReviewTime className='review-time'>{moment.utc(review?.created_at).local().format('DD/MM/YY')}</ReviewTime>}
                  </div>
              </ReviewItemHeader>
              {showCustomerComments && (
                <ReviewItemContent isEmpty={!review?.comment?.trim()}>
                  {review?.comment?.trim() || t('NO_COMMENT', 'No comment')}
                </ReviewItemContent>
              )}
            </Review>
          ))
          : (
            <>
              {[...Array(2)].map((item, i) => (
                <SkeletonContainer key={i}>
                  <div>
                    <Skeleton width={100} height={30} />
                    <Skeleton width={100} />
                  </div>
                  <div>
                    <Skeleton width={150} height={50} />
                  </div>
                </SkeletonContainer>
              ))}

            </>
            )}
      </>
    )
  }

  return (
    <BusinessReviewsContainer>
      {reviewsList.error
        ? <p>{t('ERROR_UNKNOWN', 'An error has occurred')}</p>
        : (
          <>
            <ReviewsHeaderWrapper noReviews={reviewsList?.reviews.length === 0} isColumnMode={isColumnMode}>
              {
                !reviewsList.loading
                  ? (
                    <>
                      <ModalHeading>{t('REVIEWS', 'Reviews')}</ModalHeading>
                      {!isColumnMode && (<p className='ratings'><RatingsLink onClick={() => setIsModalOpen(true)}>{reviewsList?.reviews.length > 250 ? `${t('250_PLUS', '250+')} ${t('RATINGS', 'Ratings')}` : `${reviewsList?.reviews.length} ${t('RATINGS', 'Ratings')}`}</RatingsLink></p>)}
                    </>
                    )
                  : (
                    <Skeleton width={100} height={30} />
                    )
              }
            </ReviewsHeaderWrapper>
            {showSearch && (
              <ReviewOf>
                {!reviewsList.loading
                  ? (
                    <SearchContainer>
                      <Input
                        variant='search-bar'
                        prefix={<Icon name='search' />}
                        type='text'
                        onChange={handleOnChange}
                        placeholder={t('SEARCH', 'Search')}
                        aria-label={t('SEARCH', 'Search')}
                      />
                    </SearchContainer>
                    )
                  : <Skeleton width={200} height={30} />}
              </ReviewOf>
            )}
            {showRanking && (
              <ReviewsProgressWrapper>
                <p>{t('CUSTOMER_REVIEWS', 'Customers reviews')}</p>
                <ReviewsProgressContent>
                  {/* components.progress, the average of 5 stars */}
                  <ProgressBar size='sm' value={(stars / 5) * 100} aria-label={t('CUSTOMER_REVIEWS', 'Customers reviews')} />
                  <ReviewsRatingTargets>
                    {reviewPoints.map((reviewPoint, index) => (
                      <ReviewsMarkPoint
                        key={reviewPoint}
                        chartIndex={index}
                        aria-label={t('STARS_OUT_OF_FIVE', '_NUMBER_ of 5 stars').replace('_NUMBER_', reviewPoint)}
                        aria-pressed={ratingSelected === reviewPoint}
                        onClick={() => handleClickRaiting(reviewPoint)}
                      >
                        <ReviewStars as='span' aria-hidden='true'>
                          {reviewPoint}
                          <Icon name='starFilled' className='start' />
                        </ReviewStars>
                      </ReviewsMarkPoint>
                    ))}
                  </ReviewsRatingTargets>
                </ReviewsProgressContent>
              </ReviewsProgressWrapper>
            )}
            {isEmpty && (
              <NotFoundSource variant='empty' headingLevel='h3' icon='star' content={t('NO_REVIEWS', 'No reviews')} />
            )}
            {!hideElement && !isEmpty && (
              <Content id='content' isColumnMode={isColumnMode}>
                <div className='reviews-container'>
                  {isColumnMode
                    ? (
                      <div className='reviews-container-column'>
                        <ReviewList />
                      </div>
                      )
                    : (
                    <AutoScroll scrollId='reviews' isColumnMode={isColumnMode} byItem>
                      <ReviewList />
                    </AutoScroll>
                      )}
                </div>
              </Content>
            )}
          </>
          )}
      {isModalOpen && (
        <DialogOverlay
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          size='sm'
        >
          <BusinessReviewsContainer>
            <ReviewsHeaderWrapper isModal>
              <ModalHeading>{t('RANKING', 'Ranking')}</ModalHeading>
            </ReviewsHeaderWrapper>
            <ReviewRatingWrapper>
              <img src={ratingsIllustration} alt='' />
              {totalReviews && <div className='rating'>{totalReviews} <p>{t('OF_THE_FIVE', 'of the 5.0')}</p></div>}
            </ReviewRatingWrapper>
          </BusinessReviewsContainer>
        </DialogOverlay>
      )}
    </BusinessReviewsContainer>
  )
}

export const BusinessReviews = (props) => {
  const BusinessReviewProps = {
    ...props,
    UIComponent: BusinessReviewsUI
  }
  return <BusinessReviewController {...BusinessReviewProps} />
}
