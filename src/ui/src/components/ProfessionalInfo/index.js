import React from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'
import {
  Container,
  PhotoWrapper,
  InfoWrapper,
  OccupationWrapper,
  Description,
  Divider,
  ReviewWrapper,
  ReviewItemContatiner,
  ReviewQualityContainer,
  ReviewBarContainer,
  ReviewQualityTextContainer,
  Comment,
  NotReviewed
} from './styles'

import { useUtils } from '~components/contexts/UtilsContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { ProfessionalInfo as ProfessionalInfoController } from '~components/components/ProfessionalInfo'

import { ModalHeading } from '~ui/src/components/Overlay/ModalHeading'
import { ProgressBar } from '~ui/src/styles/Progress'
import { Avatar } from '~ui/src/design-system/components/Avatar'
import { getThemeCss } from '~/utils/themeCss'

const ProfessionalInfoUI = (props) => {
  const {
    userState,
    userReviewState
  } = props

  const [{ optimizeImage }] = useUtils()
  const [, t] = useLanguage()
  const theme = useTheme()
  // the professional's photo is an avatar (components.avatar, xl)
  const avatarSize = getThemeCss(theme, 'avatar').sizes.xl.size

  const getReviewPercent = (quality) => {
    const reviewPercents = {
      1: 0,
      2: 25,
      3: 50,
      4: 75,
      5: 100
    }
    if (typeof reviewPercents[quality] !== 'undefined') return reviewPercents[quality]
    return quality / 5 * 100
  }

  return (
    <Container>
      <PhotoWrapper>
        {userState?.loading
          ? (
          <Skeleton
            width={avatarSize}
            height={avatarSize}
          />
            )
          : <Avatar src={userState?.user?.photo ? optimizeImage(userState.user.photo, 'h_200,c_limit') : null} size='xl' />}
      </PhotoWrapper>
      <InfoWrapper>
        {userState?.loading ? <h2><Skeleton width={120} height={20} /></h2> : <ModalHeading>{userState?.user?.name}</ModalHeading>}
        <OccupationWrapper>
          {userState?.loading ? <Skeleton width={100} height={15} /> : <p>{userState?.user?.occupation?.name}</p>}
        </OccupationWrapper>
        {userState?.user?.occupation?.description && (
          <Description>{userState?.user?.occupation?.description}</Description>
        )}
      </InfoWrapper>
      <Divider />
      <ReviewWrapper>
        <h3>{t('REVIEWS', 'Reviews')}</h3>
        {userReviewState.loading
          ? (
              [...Array(5).keys()].map(i => (
            <ReviewItemContatiner key={i}>
              <ReviewQualityContainer>
                <ReviewBarContainer>
                  <Skeleton height={10} />
                </ReviewBarContainer>
              </ReviewQualityContainer>
              <ReviewQualityTextContainer>
                <p><Skeleton width={40} /></p>
                <p><Skeleton width={40} /></p>
                <p><Skeleton width={40} /></p>
                <p><Skeleton width={40} /></p>
                <p><Skeleton width={40} /></p>
              </ReviewQualityTextContainer>
              <Comment>
                <div><Skeleton width={300} /></div>
                <div><Skeleton width={200} /></div>
              </Comment>
            </ReviewItemContatiner>
              ))
            )
          : (
              userReviewState?.reviews.map(review => (
            <ReviewItemContatiner key={review?.id}>
              <ReviewQualityContainer>
                <ReviewBarContainer>
                  {/* components.progress; the labels stay under it */}
                  <ProgressBar size='sm' value={getReviewPercent(review?.qualification)} aria-label={t('REVIEWS', 'Reviews')} />
                </ReviewBarContainer>
                <ReviewQualityTextContainer>
                  <p>{t('TERRIBLE', 'Terrible')}</p>
                  <p>{t('BAD', 'Bad')}</p>
                  <p>{t('OKAY', 'Okay')}</p>
                  <p>{t('GOOD', 'Good')}</p>
                  <p>{t('GREAT', 'Great')}</p>
                </ReviewQualityTextContainer>
              </ReviewQualityContainer>
              <Comment>{review?.comment}</Comment>
            </ReviewItemContatiner>
              ))
            )}

        {!userReviewState.loading && userReviewState.reviews.length === 0 && (
          <NotReviewed>
            {t('ERROR_REVIEW_FIND', 'The review does not exist.')}
          </NotReviewed>
        )}
      </ReviewWrapper>
    </Container>
  )
}

export const ProfessionalInfo = (props) => {
  const professionalInfoProps = {
    ...props,
    UIComponent: ProfessionalInfoUI
  }
  return <ProfessionalInfoController {...professionalInfoProps} />
}
