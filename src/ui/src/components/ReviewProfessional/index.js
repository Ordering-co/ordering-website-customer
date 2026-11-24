import React, { useState, useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import {
  ReviewProfessionalContainer,
  Comments,
  ActionBtnWrapper,
  DriverPhoto,
  WrapperDriverPhoto,
  ReviewsProgressWrapper,
  LogoAndReviewWrapper,
  CommentsList,
  DriverInfoBlock
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { ReviewDriver } from '~components/components/ReviewDriver'
import { reviewCommentList } from '~ui/utils'
import { Alert } from '~ui/src/components/Confirm'
import { Textarea } from '~ui/src/design-system/components/Textarea'
import { Chip } from '~ui/src/design-system/components/Chip'
import { Button } from '~ui/src/design-system/components/Button'
import { RatingScale } from '~ui/src/design-system/components/Rating'

import { Icon } from '~ui/src/design-system/components/Icon'

import { FieldError, reviewFields, reviewErrorAttributes, useReviewFeedback } from '../ReviewOrder/reviewFeedback'

const ReviewProfessionalUI = (props) => {
  const {
    dirverReviews,
    order,
    formState,
    setDriverReviews,
    closeReviewProfessional,
    setIsProfessionalReviewed,
    handleSendDriverReview
  } = props

  const [, t] = useLanguage()
  const [{ optimizeImage }] = useUtils()
  const { handleSubmit, errors } = useForm()
  const [comments, setComments] = useState([])
  const [extraComment, setExtraComment] = useState('')
  const { message, fields, startSubmission, setMessage, clearFields } = useReviewFeedback(t, formState, reviewFields, () => {
    setIsProfessionalReviewed?.(true)
    closeReviewProfessional?.()
  })
  const fieldId = useId()
  const ratingError = fields.qualification
  const ratingErrorId = `${fieldId}-rating-error`
  const commentErrorId = `${fieldId}-comment-error`

  const commentsList = reviewCommentList('professional')

  const qualificationList = [
    { key: 1, text: t('TERRIBLE', 'Terrible') },
    { key: 2, text: t('BAD', 'Bad') },
    { key: 3, text: t('OKAY', 'Okay') },
    { key: 4, text: t('GOOD', 'Good') },
    { key: 5, text: t('GREAT', 'Great') }
  ]

  const handleChangeReviews = (index) => {
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
    <>
      <LogoAndReviewWrapper>
        <WrapperDriverPhoto>
          {(order?.products[0]?.calendar_event?.professional?.photo)
            ? (
            <DriverPhoto bgimage={optimizeImage(order?.products[0]?.calendar_event?.professional?.photo, 'h_200,c_limit')} />
              )
            : <Icon name="user" />}
        </WrapperDriverPhoto>
        {
          order?.products[0]?.calendar_event?.professional?.name && (
            <DriverInfoBlock>{order?.products[0]?.calendar_event?.professional?.name}</DriverInfoBlock>
          )
        }
        <ReviewsProgressWrapper>
          <p>{t('HOW_WAS_YOUR_SERVICE', 'How was your service?')}</p>
          {/* components.rating_scale, a group of radios (one per point) */}
          <RatingScale value={dirverReviews?.qualification} options={qualificationList.map(({ key, text }) => ({ value: key, label: text }))} onChange={handleChangeReviews} label={t('HOW_WAS_YOUR_SERVICE', 'How was your service?')} {...reviewErrorAttributes(ratingErrorId, ratingError)} />
          {ratingError && <FieldError id={ratingErrorId}>{ratingError}</FieldError>}
        </ReviewsProgressWrapper>
        <CommentsList>
          <p>{commentsList[dirverReviews?.qualification || 1]?.title}</p>
          {
            commentsList[dirverReviews?.qualification || 1]?.list?.map((commentItem, i) => (
              <Chip
                variant='content'
                key={i}
                selected={isSelectedComment(commentItem.key)}
                onClick={() => handleChangeComment(commentItem)}
                suffix={isSelectedComment(commentItem.key) && <Icon name='closeMd' />}
              >
                {commentItem.content}
              </Chip>
            ))
          }
        </CommentsList>
      </LogoAndReviewWrapper>
      <ReviewProfessionalContainer onSubmit={handleSubmit(onSubmit)}>
        <Comments>
          <p>{t('DO_YOU_WANT_TO_ADD_SOMETHING', 'Do you want to add something?')}</p>
          <Textarea
            name='comment'
            rows={4}
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
        <ActionBtnWrapper>
          <Button
            type='submit'
            loading={formState.loading}
            disabled={formState.loading}
            className='review-sent'
          >
            {t('SEND_REVIEW', 'Send review')}
          </Button>
        </ActionBtnWrapper>
        <Alert
          title={t('PROFESSIONAL_REVIEW', 'Professional Review')}
          content={message}
          acceptText={t('ACCEPT', 'Accept')}
          open={!!message}
          onClose={() => setMessage(null)}
          onAccept={() => setMessage(null)}
          closeOnBackdrop={false}
        />
      </ReviewProfessionalContainer>
    </>
  )
}

export const ReviewProfessional = (props) => {
  const reviewDriverProps = {
    ...props,
    UIComponent: ReviewProfessionalUI,
    isToast: true
  }

  return <ReviewDriver {...reviewDriverProps} />
}
