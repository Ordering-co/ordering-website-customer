import React, { useState, useEffect, useId } from 'react'
import { useTheme } from 'styled-components'
import { useForm } from 'react-hook-form'
import {
  ReviewDriverContainer,
  Comments,
  Send,
  ReviewsProgressWrapper,
  LogoAndReviewWrapper,
  CommentsList,
  Divider,
  Wrapper
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { ReviewDriver as ReviewDriverController } from '~components/components/ReviewDriver'
import { reviewCommentList } from '~ui/utils'
import { Alert } from '~ui/src/components/Confirm'
import { Textarea } from '~ui/src/design-system/components/Textarea'
import { Choice } from '~ui/src/design-system/components/Choice'
import { Chip } from '~ui/src/design-system/components/Chip'
import { Button } from '~ui/src/design-system/components/Button'
import { RatingScale, thumbsRating } from '~ui/src/design-system/components/Rating'
import { Avatar } from '~ui/src/design-system/components/Avatar'

import { Icon } from '~ui/src/design-system/components/Icon'
import { modalSectionLevel } from '~ui/src/components/Overlay/titleLevel'

import { FieldError, reviewFields, reviewErrorAttributes, useReviewFeedback } from '../ReviewOrder/reviewFeedback'

const ReviewDriverUI = (props) => {
  const {
    dirverReviews,
    order,
    formState,
    setDriverReviews,
    closeReviewDriver,
    setIsDriverReviewed,
    handleSendDriverReview
  } = props

  const theme = useTheme()
  // two thumbs or the scale of five points: the prop, else the theme's
  // (components.rating_scale.base.mode)
  const useSimpleRating = props.useSimpleRating ?? thumbsRating(theme)
  const [, t] = useLanguage()
  const [{ optimizeImage, parseDate }] = useUtils()
  const { handleSubmit, errors } = useForm()
  const [comments, setComments] = useState([])
  const [extraComment, setExtraComment] = useState('')
  const { message, fields, startSubmission, setMessage, clearFields } = useReviewFeedback(t, formState, reviewFields, () => {
    setIsDriverReviewed?.(true)
    closeReviewDriver?.()
  })
  const fieldId = useId()
  const ratingError = fields.qualification
  const ratingErrorId = `${fieldId}-rating-error`
  const commentErrorId = `${fieldId}-comment-error`

  const commentsList = reviewCommentList('driver')
  // the section's title is a heading below the modal's title
  const SectionTitle = modalSectionLevel(theme)

  const qualificationList = [
    { key: 1, text: t('TERRIBLE', 'Terrible') },
    { key: 2, text: t('BAD', 'Bad') },
    { key: 3, text: t('OKAY', 'Okay') },
    { key: 4, text: t('GOOD', 'Good') },
    { key: 5, text: t('GREAT', 'Great') }
  ]

  const handleChangeStars = (index) => {
    clearFields('qualification')
    if (comments.length) clearFields('comment')
    if (index) setDriverReviews({ ...dirverReviews, qualification: index, comment: '' })
    setComments([])
  }

  const onSubmit = () => {
    if (dirverReviews?.qualification === 0) {
      setMessage(t('REVIEW_QUALIFICATION_REQUIRED', 'Review qualification is required'))
      return
    }
    startSubmission(handleSendDriverReview)
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

  useEffect(() => {
    let _comments = ''
    if (comments.length > 0) {
      comments.map(comment => (_comments += comment.content + '. '))
    }
    const _comment = _comments + extraComment
    setDriverReviews({ ...dirverReviews, comment: _comment })
  }, [comments, extraComment])

  return (
    <Wrapper>
      <p className='subtitle'>{order?.business?.name}{order?.delivery_datetime_utc && `  •  ${parseDate(order?.delivery_datetime_utc, { outputFormat: 'MM/DD/YY hh:mm A' })}`}</p>
      <LogoAndReviewWrapper>
        <div className='driver-wrapper'>
          <div className='driver-text'>
            <SectionTitle className='bold'>{t('RATE_YOUR_ORDER', 'Rate your order')}</SectionTitle>
            <p>{t('HOW_WAS_DRIVER_DELIVERY', 'How was _driver_ delivery?').replace('_driver_', `${order?.driver?.name ?? 'Driver'} ${order?.driver?.last_name ?? ''}`)}</p>
          </div>
          {/* components.avatar md (the text beside it names the driver) */}
          <Avatar variant='photo' src={order?.driver?.photo && optimizeImage(order?.driver?.photo, 'h_200,c_limit')} size='md' />
        </div>
        <ReviewsProgressWrapper useSimpleRating={useSimpleRating}>
          {!useSimpleRating && <p>{t('HOW_WAS_YOUR_ORDER', 'How was your order?')}</p>}
            {useSimpleRating
              ? (
                <div className='rating-container' role='group' aria-label={t('HOW_WAS_YOUR_ORDER', 'How was your order?')} {...reviewErrorAttributes(ratingErrorId, ratingError)}>
                  {/* options of components.choice (their colors) */}
                  <Choice
                    variant='icon-only-rating'
                    data-doc-control='driver-review-like'
                    onClick={() => handleChangeStars(5)}
                    selected={dirverReviews?.qualification === 5}
                    aria-label={t('GOOD', 'Good')}
                  >
                    <Icon name="likeOutline" />
                  </Choice>
                  <Choice
                    variant='icon-only-rating'
                    onClick={() => handleChangeStars(2)}
                    selected={dirverReviews?.qualification === 2}
                    aria-label={t('BAD', 'Bad')}
                  >
                    <Icon name="dislikeOutline" />
                  </Choice>
                </div>
                )
              : (
                  /* components.rating_scale, a group of radios (one per point) */
                  <RatingScale value={dirverReviews?.qualification} options={qualificationList.map(({ key, text }) => ({ value: key, label: text }))} onChange={handleChangeStars} label={t('HOW_WAS_YOUR_ORDER', 'How was your order?')} {...reviewErrorAttributes(ratingErrorId, ratingError)} />
                )}
          {ratingError && <FieldError id={ratingErrorId}>{ratingError}</FieldError>}
        </ReviewsProgressWrapper>
        <Divider />
        <p className='comments-title'>{t('COMMENTS', 'Comments')}</p>
        <CommentsList>
          {
            commentsList[dirverReviews?.qualification || 5]?.list?.map((commentItem, i) => (
              <div key={i}>
                <Chip
                  variant='content'
                  selected={isSelectedComment(commentItem.key)}
                  onClick={() => handleChangeComment(commentItem)}
                  suffix={isSelectedComment(commentItem.key) && <Icon name='closeMd' />}
                >
                  {commentItem.content}
                </Chip>
              </div>
            ))
          }
        </CommentsList>
      </LogoAndReviewWrapper>
      <Divider />
      <ReviewDriverContainer onSubmit={handleSubmit(onSubmit)}>
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
          <Button
            data-doc-control='driver-review-submit'
            type='submit'
            loading={formState.loading}
            disabled={formState.loading}
            className='review-sent'
            size={useSimpleRating ? 'lg' : 'md'}
          >
            {t('CONTINUE', 'Continue')}
          </Button>
        </Send>
        <Alert
          title={t('DRIVER_REVIEW', 'Driver Review')}
          content={message}
          acceptText={t('ACCEPT', 'Accept')}
          open={!!message}
          onClose={() => setMessage(null)}
          onAccept={() => setMessage(null)}
          closeOnBackdrop={false}
        />
      </ReviewDriverContainer>
    </Wrapper>
  )
}

export const ReviewDriver = (props) => {
  const reviewDriverProps = {
    ...props,
    UIComponent: ReviewDriverUI,
    isToast: true
  }

  return <ReviewDriverController {...reviewDriverProps} />
}

export default ReviewDriver
