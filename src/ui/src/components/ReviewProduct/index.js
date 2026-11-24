import React, { useState, useEffect, useId } from 'react'
import { useTheme } from 'styled-components'
import { useForm } from 'react-hook-form'
import {
  ReviewProductContainer,
  ActionBlock,
  SingleProductReviewContainer,
  LogoAndReviewWrapper,
  ReviewsProgressWrapper,
  AdditionCommentsWrapper,
  AddCommentHideShow,
  Comments,
  CommentsList,
  WrapperProductLogo,
  ProductLogo,
  Divider
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { ReviewProduct as ReviewProductController } from '~components/components/ReviewProduct'
import { useUtils } from '~components/contexts/UtilsContext'
import { Textarea } from '~ui/src/design-system/components/Textarea'
import { Choice } from '~ui/src/design-system/components/Choice'
import { Chip } from '~ui/src/design-system/components/Chip'
import { Button } from '~ui/src/design-system/components/Button'
import { Alert } from '~ui/src/components/Confirm'
import { reviewCommentList } from '~ui/utils'

import { Icon } from '~ui/src/design-system/components/Icon'
import { themeHidden } from '~/utils/themeVisibility'
import { themeImage } from '~/utils/themeTokens'
import { modalSectionLevel } from '~ui/src/components/Overlay/titleLevel'

import { FieldError, noReviewFields, reviewFields, reviewErrorAttributes, useReviewFeedback } from '../ReviewOrder/reviewFeedback'

const SingleProductReview = (props) => {
  const {
    product,
    order,
    handleChangeFormState,
    formState,
    singleProduct,
    fieldErrors,
    clearFields
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  const [{ optimizeImage }] = useUtils()
  // visibility product.dummy_image decides
  const productImage = product?.images || (!themeHidden(theme, 'product.dummy_image') && themeImage(theme, 'placeholder.product'))
  const [isLike, setIsLike] = useState(true)
  const [isExtraComment, setIsExtraComment] = useState(singleProduct)
  const [comments, setComments] = useState([])
  const [extraComment, setExtraComment] = useState('')
  const [currentValue, setCurrentValue] = useState(5)

  const fieldId = useId()
  const ratingError = fieldErrors?.qualification
  const commentError = fieldErrors?.comment
  const ratingErrorId = `${fieldId}-rating-error`
  const commentErrorId = `${fieldId}-comment-error`
  const ratingQuestion = t('HOW_WAS_PRODUCT', 'How was the _product_?').replace('_product_', `${product?.name ?? 'Product'}`)
  const commentsList = reviewCommentList('product')
  // the section's title is a heading below the modal's title
  const SectionTitle = modalSectionLevel(theme)

  const handleChangeRating = (like) => {
    if (isLike === like) return
    clearFields?.('qualification')
    if (comments.length) clearFields?.('comment')
    setIsLike(like)
  }

  const handleChangeComment = (commentItem) => {
    clearFields?.('comment')
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
    if (commentError) setIsExtraComment(true)
  }, [commentError])

  useEffect(() => {
    const value = isLike ? 5 : 1
    setCurrentValue(value)
    if (value !== currentValue) setComments([])
    if (comments?.length === 0 && !extraComment && formState.changes?.length === 0 && isLike) return
    let _comments = ''
    if (comments.length > 0) {
      comments.map(comment => (_comments += comment.content + '. '))
    }
    const _comment = _comments + extraComment
    let found = false
    const _changes = formState.changes.map(item => {
      if (item?.product_id === product?.product_id) {
        found = true
        return {
          product_id: product?.product_id,
          comment: _comment,
          qualification: isLike ? 5 : 1
        }
      }
      return item
    })
    if (!found) {
      _changes.push({
        product_id: product?.product_id,
        comment: _comment,
        qualification: isLike ? 5 : 1
      })
    }
    handleChangeFormState && handleChangeFormState(_changes)
  }, [comments, extraComment, isLike])

  return (
    <SingleProductReviewContainer>
      <LogoAndReviewWrapper>
        <div className='product-wrapper'>
          <div className='product-text'>
            <SectionTitle className='bold'>{t('RATE_YOUR_ITEM', 'Rate your item')}</SectionTitle>
            <p>{ratingQuestion}</p>
          </div>
          {productImage && (
            <WrapperProductLogo>
              <ProductLogo bgimage={optimizeImage(productImage, 'h_200,c_limit')} />
            </WrapperProductLogo>
          )}
        </div>
        <ReviewsProgressWrapper useSimpleRating>
          <div className='rating-container' role='group' aria-label={ratingQuestion} {...reviewErrorAttributes(ratingErrorId, ratingError)}>
            <Choice variant='icon-only-rating' data-doc-control='product-review-like' onClick={() => handleChangeRating(true)} selected={isLike} aria-label={t('GOOD', 'Good')}>
              <Icon name="likeOutline" />
            </Choice>
            <Choice variant='icon-only-rating' data-doc-control='product-review-dislike' onClick={() => handleChangeRating(false)} selected={!isLike} aria-label={t('BAD', 'Bad')}>
              <Icon name="dislikeOutline" />
            </Choice>
          </div>
          {ratingError && <FieldError id={ratingErrorId}>{ratingError}</FieldError>}
        </ReviewsProgressWrapper>
        <Divider />
        <p className='comments-title'>{t('COMMENTS', 'Comments')}</p>
        <CommentsList>
          {
            commentsList[isLike ? 'like' : 'dislike']?.map((commentItem, i) => (
              <Chip
                variant='content'
                key={i}
                type='button'
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
      <AdditionCommentsWrapper>
        <AddCommentHideShow
          onClick={() => setIsExtraComment(!isExtraComment)}
          active={isExtraComment}
          aria-describedby={!isExtraComment && commentError ? commentErrorId : undefined}
        >
          {t('ADDITIONAL_COMMENTS', 'Additional comments')}
        </AddCommentHideShow>
        {
          isExtraComment && (
            <Comments>
              <p>{t('DO_YOU_WANT_TO_ADD_SOMETHING', 'Do you want to add something?')}</p>
              <Textarea
                name='comments'
                value={extraComment || ''}
                aria-label={t('COMMENT', 'Comment')}
                invalid={!!commentError}
                aria-describedby={commentError ? commentErrorId : undefined}
                onChange={(e) => {
                  clearFields?.('comment')
                  setExtraComment(e.target.value)
                }}
                autoComplete='off'
              />
            </Comments>
          )
        }
        {commentError && <FieldError id={commentErrorId}>{commentError}</FieldError>}
      </AdditionCommentsWrapper>
      {order?.products?.length > 1 && <Divider />}
    </SingleProductReviewContainer>
  )
}

const ReviewProductUI = (props) => {
  const {
    order,
    closeReviewProduct,
    formState,
    handleSendProductReview,
    setIsProductReviewed
  } = props

  const [, t] = useLanguage()
  const [{ parseDate }] = useUtils()
  const { handleSubmit, errors } = useForm()
  const products = (order?.products ?? []).flat().filter(product => product && !product.deleted)
  const [submittedProductId, setSubmittedProductId] = useState(null)
  // Unscoped validation can be placed when exactly one submitted item matches a visible row.
  const matchingProducts = submittedProductId == null ? [] : products.filter(product => product.product_id === submittedProductId)
  const errorProduct = matchingProducts.length === 1 ? matchingProducts[0] : null
  const visibleFields = errorProduct ? reviewFields : noReviewFields
  const { message, fields, startSubmission, setMessage, clearFields } = useReviewFeedback(t, formState, visibleFields, () => {
    setIsProductReviewed?.(true)
    closeReviewProduct?.()
  })

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      setMessage(Object.values(errors).map(error => error.message).join(' '))
    }
  }, [errors])

  const onSubmit = () => {
    const changes = formState.changes
    setSubmittedProductId(changes?.length === 1 ? changes[0].product_id : null)
    startSubmission(handleSendProductReview)
  }

  return (
    <ReviewProductContainer onSubmit={handleSubmit(onSubmit)}>
      <p className='subtitle'>{order?.business?.name}{order?.delivery_datetime_utc && `  •  ${parseDate(order?.delivery_datetime_utc, { outputFormat: 'MM/DD/YY hh:mm A' })}`}</p>
      {products.map((product, index) => (
        <SingleProductReview
          {...props}
          key={product.id ?? `index-${index}`}
          product={product}
          singleProduct={order?.products?.length === 1}
          fieldErrors={product === errorProduct ? fields : undefined}
          clearFields={product === errorProduct ? clearFields : undefined}
        />
      ))}
      <ActionBlock>
        <Button
          data-doc-control='product-review-submit'
          type='submit'
          loading={formState.loading}
          disabled={formState.loading || formState?.changes?.length === 0}
          className='review-sent'
          size='lg'
        >
          {t('CONTINUE', 'Continue')}
        </Button>
      </ActionBlock>
      <Alert
        title={t('PRODUCT_REVIEW', 'Product Review')}
        content={message}
        acceptText={t('ACCEPT', 'Accept')}
        open={!!message}
        onClose={() => setMessage(null)}
        onAccept={() => setMessage(null)}
        closeOnBackdrop={false}
      />
    </ReviewProductContainer>
  )
}

export const ReviewProduct = (props) => {
  const reviewProductProps = {
    ...props,
    UIComponent: ReviewProductUI,
    isToast: true
  }
  return <ReviewProductController {...reviewProductProps} />
}

export default ReviewProduct
