import React, { useState } from 'react'
import { useTheme } from 'styled-components'
import {
  ReviewOrderContainer,
  StarWrapper,
  PlacedDate,
  Send,
  BusinessLogo,
  BusinessName,
  WrapperBusinessLogo,
  ReviewsProgressWrapper,
  LogoAndReviewWrapper
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { Button } from '~ui/src/design-system/components/Button'
import { Rating } from '~ui/src/design-system/components/Rating'

import { businessLogoPlaceholder } from '~/utils/themeTokens'
import { useImageFallback } from '~ui/hooks/useImageFallback'

export const ReviewTrigger = (props) => {
  const { order, handleOpenOrderReview, showPlacedDate = false } = props
  const [star, setStar] = useState(5)
  const [, t] = useLanguage()
  const [{ optimizeImage, parseDate }] = useUtils()
  const theme = useTheme()
  // the business's logo, the theme's placeholder when it has none or it
  // fails to load (a background image fails silently: an empty box)
  const placeholderLogo = businessLogoPlaceholder(theme)
  const businessLogo = useImageFallback(order?.business?.logo && optimizeImage(order?.business?.logo, 'h_200,c_limit'), placeholderLogo && optimizeImage(placeholderLogo, 'h_200,c_limit'))
  // the order's delivery date, UTC from the API, in the user's local time
  const placedOnDate = order?.delivery_datetime_utc
    ? parseDate(order.delivery_datetime_utc, { outputFormat: 'dddd MMMM DD, YYYY' })
    : null

  return (
    <>
      <span>
        {t('REVIEW_ORDER_DESCRIPTION', 'Your feedback is very important to us. Help us improve by rating your last order—it only takes a few seconds!')}
      </span>
      <LogoAndReviewWrapper>
        {businessLogo && (
          <WrapperBusinessLogo>
            <BusinessLogo bgimage={businessLogo} />
          </WrapperBusinessLogo>
        )}
        {order?.business?.name && <BusinessName>{order?.business?.name}</BusinessName>}
        <ReviewsProgressWrapper>
          <StarWrapper>
            {/* components.rating, a group of radios (one per star) */}
            <Rating
              value={star}
              onChange={setStar}
              size='lg'
              label={t('RATE_YOUR_ORDER', 'Rate your order')}
              optionLabel={(value) => t('STARS_OUT_OF_FIVE', '_NUMBER_ of 5 stars').replace('_NUMBER_', value)}
            />
          </StarWrapper>
        </ReviewsProgressWrapper>

        {showPlacedDate && placedOnDate && <PlacedDate>{t('DONOT_FORGET_RATE_YOUR_ORDER', 'Do not forget to rate your order placed on ')} <strong>{placedOnDate}</strong></PlacedDate>}
      </LogoAndReviewWrapper>
      <ReviewOrderContainer>
        <Send>
          <Button
            color='secondary'
            type='button'
            className='review-sent'
            onClick={() => handleOpenOrderReview(star)}
          >
            {t('REVIEW_TRIGGER_BUTTON', 'Review')}
          </Button>
        </Send>
      </ReviewOrderContainer>
    </>
  )
}

export default ReviewTrigger
