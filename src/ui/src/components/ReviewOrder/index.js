import React, { useState, useEffect, useId } from 'react'
import { useTheme } from 'styled-components'
import { useForm } from 'react-hook-form'
import {
  ReviewOrderContainer,
  Comments,
  Send,
  BusinessLogo,
  WrapperBusinessLogo,
  ReviewsProgressWrapper,
  LogoAndReviewWrapper,
  CommentsList,
  MultiLogosContainer,
  Divider,
  Wrapper,
  SkipLink
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { OrderReview as ReviewOrderController } from '~components/components/OrderReview'
import { Alert } from '~ui/src/components/Confirm'
import { Textarea } from '~ui/src/design-system/components/Textarea'
import { Choice } from '~ui/src/design-system/components/Choice'
import { Chip } from '~ui/src/design-system/components/Chip'
import { Button } from '~ui/src/design-system/components/Button'
import { RatingScale, thumbsRating } from '~ui/src/design-system/components/Rating'
import { reviewCommentList } from '~ui/utils'

import { Icon } from '~ui/src/design-system/components/Icon'
import { businessLogoPlaceholder } from '~/utils/themeTokens'
import { useImageFallback } from '~ui/hooks/useImageFallback'
import { modalSectionLevel } from '~ui/src/components/Overlay/titleLevel'

import { FieldError, orderRatingFields, orderReviewFields, reviewErrorAttributes, useReviewFeedback } from './reviewFeedback'

const ReviewOrderUI = (props) => {
  const { stars, order, handleSendReview, formState, closeReviewOrder, setIsReviewed, setStars } = props
  const [, t] = useLanguage()
  const [{ optimizeImage, parseDate }] = useUtils()
  const theme = useTheme()
  // the business's logo, the theme's placeholder when it has none or it
  // fails to load (a background image fails silently: an empty box)
  const placeholderLogo = businessLogoPlaceholder(theme)
  const businessLogo = useImageFallback(order?.business?.logo && optimizeImage(order?.business?.logo, 'h_200,c_limit'), placeholderLogo && optimizeImage(placeholderLogo, 'h_200,c_limit'))
  const hasAnyBusinessLogo = order?.business?.length > 1
    ? order?.business?.some((business) => business?.logo || placeholderLogo)
    : !!businessLogo
  // two thumbs or the scale of five points: the prop, else the theme's
  // (components.rating_scale.base.mode)
  const useSimpleRating = props.useSimpleRating ?? thumbsRating(theme)
  const { handleSubmit, errors } = useForm()
  const { message, fields, startSubmission, setMessage, clearFields } = useReviewFeedback(t, formState, orderReviewFields, () => {
    setIsReviewed?.(true)
    closeReviewOrder?.()
  })
  const fieldId = useId()
  const ratingError = [...new Set(orderRatingFields.map(field => fields[field]).filter(Boolean))].join(' ')
  const ratingErrorId = `${fieldId}-rating-error`
  const commentErrorId = `${fieldId}-comment-error`
  const [comments, setComments] = useState([])
  const [extraComment, setExtraComment] = useState('')

  const commentsList = reviewCommentList('order')
  // the section's title is a heading below the modal's title
  const SectionTitle = modalSectionLevel(theme)

  const qualificationList = [
    { key: 1, text: t('TERRIBLE', 'Terrible') },
    { key: 2, text: t('BAD', 'Bad') },
    { key: 3, text: t('OKAY', 'Okay') },
    { key: 4, text: t('GOOD', 'Good') },
    { key: 5, text: t('GREAT', 'Great') }
  ]

  const handleChangeStars = (value) => {
    clearFields(...orderRatingFields)
    if (comments.length) clearFields('comment')
    if (value) setStars({ ...stars, quality: value, punctuality: value, service: value, packaging: value, comments: '' })
    setComments([])
  }

  const handleChangeComment = (commentItem) => {
    clearFields('comment')
    const found = comments.find((comment) => comment?.key === commentItem.key)
    if (found) {
      const _comments = comments.filter((comment) => comment?.key !== commentItem.key)
      setComments(_comments)
    } else {
      setComments([...comments, commentItem])
    }
  }

  const isSelectedComment = (commentKey) => {
    const found = comments.find((comment) => comment?.key === commentKey)
    return found
  }

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      setMessage(Object.values(errors).map(error => error.message).join(' '))
    }
  }, [errors])

  const onSubmit = () => {
    if (Object.values(stars).some((value) => value === 0)) {
      setMessage(t('REVIEW_QUALIFICATION_REQUIRED', 'Review qualification is required'))
      return
    }
    startSubmission(handleSendReview)
  }

  useEffect(() => {
    let _comments = ''
    if (comments.length > 0) {
      comments.map(comment => (_comments += comment.content + '. '))
    }
    const _comment = _comments + extraComment
    setStars({ ...stars, comments: _comment })
  }, [comments, extraComment])

  return (
    <Wrapper>
      <p className='subtitle'>{order?.business?.name}{order?.delivery_datetime_utc && `  •  ${parseDate(order?.delivery_datetime_utc, { outputFormat: 'MM/DD/YY hh:mm A' })}`}</p>
      <LogoAndReviewWrapper>
        <div className='business-wrapper'>
          <div className='business-text'>
            <SectionTitle className='bold'>{t('RATE_THE_BUSINESS', 'Rate the business')}</SectionTitle>
            <p>{t('HOW_WAS_THE_BUSINESS_ORDER', 'How was the _business_ order?').replace('_business_', `${order?.business?.name ?? 'Business'}`)}</p>
          </div>
          {hasAnyBusinessLogo && (
            <WrapperBusinessLogo isMulti={order?.business?.length > 1}>
              {order?.business?.length > 1
                ? <MultiLogosContainer>
                    {order?.business?.map((business, i) => (business?.logo || placeholderLogo) && (
                      <React.Fragment key={business?.id}>
                        <BusinessLogo isMulti bgimage={optimizeImage(business?.logo || placeholderLogo, 'h_200,c_limit')} />
                      </React.Fragment>
                    ))}
                  </MultiLogosContainer>
                : <BusinessLogo bgimage={businessLogo} />}
            </WrapperBusinessLogo>
          )}
        </div>
        <ReviewsProgressWrapper useSimpleRating={useSimpleRating}>
          {!useSimpleRating && <p>{t('HOW_WAS_YOUR_ORDER', 'How was your order?')}</p>}
            {useSimpleRating
              ? (
                <div className='rating-container' role='group' aria-label={t('HOW_WAS_YOUR_ORDER', 'How was your order?')} {...reviewErrorAttributes(ratingErrorId, ratingError)}>
                  {/* options of components.choice (their colors) */}
                  <Choice
                    variant='icon-only-rating'
                    data-doc-control='order-review-like'
                    onClick={() => handleChangeStars(5)}
                    selected={stars?.quality === 5}
                    aria-label={t('GOOD', 'Good')}
                  >
                    <Icon name="likeOutline" />
                  </Choice>
                  <Choice
                    variant='icon-only-rating'
                    onClick={() => handleChangeStars(2)}
                    selected={stars?.quality === 2}
                    aria-label={t('BAD', 'Bad')}
                  >
                    <Icon name="dislikeOutline" />
                  </Choice>
                </div>
                )
              : (
                  /* components.rating_scale, a group of radios (one per point) */
                  <RatingScale value={stars?.quality} options={qualificationList.map(({ key, text }) => ({ value: key, label: text }))} onChange={handleChangeStars} label={t('HOW_WAS_YOUR_ORDER', 'How was your order?')} {...reviewErrorAttributes(ratingErrorId, ratingError)} />
                )}
          {ratingError && <FieldError id={ratingErrorId}>{ratingError}</FieldError>}
        </ReviewsProgressWrapper>
        <Divider />
        <p className='comments-title'>{t('COMMENTS', 'Comments')}</p>
        <CommentsList>
          {
            commentsList[stars?.quality || 5]?.list?.map((commentItem, i) => (
              <div key={i}>
                <Chip
                  variant='content'
                  selected={isSelectedComment(commentItem?.key)}
                  onClick={() => handleChangeComment(commentItem)}
                  suffix={isSelectedComment(commentItem?.key) && <Icon name='closeMd' />}
                >
                  {commentItem.content}
                </Chip>
              </div>
            ))
          }
        </CommentsList>
      </LogoAndReviewWrapper>
      <Divider />
      <ReviewOrderContainer onSubmit={handleSubmit(onSubmit)}>
        <Comments>
          <p className='extra-comment-title'>{t('DO_YOU_WANT_TO_ADD_SOMETHING', 'Do you want to add something?')}</p>
          <Textarea
            name='comments'
            placeholder={t('COMMENT', 'Comment')}
            value={extraComment}
            aria-label={t('COMMENT', 'Comment')}
            invalid={!!fields.comment}
            aria-describedby={fields.comment ? commentErrorId : undefined}
            onChange={(e) => {
              clearFields('comment')
              setExtraComment(e.target.value)
            }}
            autoComplete='off'
          />
          {fields.comment && <FieldError id={commentErrorId}>{fields.comment}</FieldError>}
        </Comments>
        <Send useSimpleRating={useSimpleRating}>
          {!useSimpleRating && <SkipLink onClick={closeReviewOrder}>{t('SKIP', 'Skip')}</SkipLink>}
          <Button
            data-doc-control='order-review-submit'
            type='submit'
            loading={formState.loading}
            disabled={formState.loading}
            className='review-sent'
            size={useSimpleRating ? 'lg' : 'md'}
          >
            {t('CONTINUE', 'Continue')}
            {!useSimpleRating && <Icon name={theme?.rtl ? 'arrowLeft' : 'arrowRight'} />}
          </Button>
        </Send>
        <Alert
          title={t('ORDER_REVIEW', 'Order Review')}
          content={message}
          acceptText={t('ACCEPT', 'Accept')}
          open={!!message}
          onClose={() => setMessage(null)}
          onAccept={() => setMessage(null)}
          closeOnBackdrop={false}
        />
      </ReviewOrderContainer>
    </Wrapper>
  )
}

export const ReviewOrder = (props) => {
  const ReviewOrderProps = {
    ...props,
    UIComponent: ReviewOrderUI,
    isToast: true,
    defaultStar: props?.defaultStar ?? 0
  }

  return <ReviewOrderController {...ReviewOrderProps} />
}

export default ReviewOrder
