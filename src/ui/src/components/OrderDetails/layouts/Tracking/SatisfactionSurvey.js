import { Textarea } from '~ui/src/design-system/components/Textarea'
import React, { useEffect, useId, useState } from 'react'
import { useTheme } from 'styled-components'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useApi } from '~components/contexts/ApiContext'
import { useSession } from '~components/contexts/SessionContext'
import { Radio, RadioGroup } from '~ui/src/design-system/components/Checkbox'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Button } from '~ui/src/design-system/components/Button'
import { Chip } from '~ui/src/design-system/components/Chip'
import { Rating, RatingScale, thumbsRating } from '~ui/src/design-system/components/Rating'
import { themeValue } from '~/utils/themeTokens'
import { slotButtonOptions } from '~/utils/themeGroups'
import { ORDER_TRACKING, orderChipProps } from '~/utils/orderTheme'
import { sendOrderSurvey, sendDriverSurvey } from './surveyRequests'
import {
  SurveyContainer,
  IntroWrapper,
  BagImage,
  IntroText,
  QuestionsWrapper,
  QuestionBlock,
  QuestionLabel,
  QuestionTitle,
  Thumbs,
  SubQuestion,
  Chips,
  CommentField,
  SurveyHint,
  SubmitLane,
  SkipRow
} from './styles'

export const SatisfactionSurvey = (props) => {
  const { order, hashKey, image } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  const [ordering] = useApi()
  const [{ token, user }] = useSession()

  const [phase, setPhase] = useState(order?.review ? 'done' : 'intro')
  const [product, setProduct] = useState({ stars: 0, chips: [], comment: '' })
  const [delivery, setDelivery] = useState({ rating: 0, chips: [], comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(false)

  const hasDriver = !!order?.driver
  // components.order_tracking (the survey's rating, chips and buttons)
  const ratingSize = themeValue(theme, ORDER_TRACKING, 'base.survey_rating_size')
  const { $size: chipSize } = orderChipProps(theme, ORDER_TRACKING, 'survey_chip')
  // the delivery: two thumbs (good 5, bad 1) or the scale of five points,
  // as components.rating_scale.base.mode says (as the driver's review)
  const useThumbs = thumbsRating(theme)
  const thumbsName = `survey-thumbs-${useId()}`
  const deliveryQuestion = t('TRACKING_SURVEY_Q_DELIVERY', 'How was the delivery?')
  const thumbs = [
    { value: 5, icon: 'likeOutline', label: t('TRACKING_SURVEY_THUMB_UP', 'Good'), control: 'order-tracking-survey-thumb-up' },
    { value: 1, icon: 'dislikeOutline', label: t('TRACKING_SURVEY_THUMB_DOWN', 'Bad'), control: 'order-tracking-survey-thumb-down' }
  ]
  const scaleOptions = [
    { value: 1, label: t('TERRIBLE', 'Terrible') },
    { value: 2, label: t('BAD', 'Bad') },
    { value: 3, label: t('OKAY', 'Okay') },
    { value: 4, label: t('GOOD', 'Good') },
    { value: 5, label: t('GREAT', 'Great') }
  ]

  const productDislikeChips = [
    { key: 'different_or_incomplete', content: t('TRACKING_SURVEY_PROD_DISLIKE_0', 'Different or incomplete product') },
    { key: 'bad_taste', content: t('TRACKING_SURVEY_PROD_DISLIKE_1', 'Bad taste') },
    { key: 'small_portion', content: t('TRACKING_SURVEY_PROD_DISLIKE_2', 'Small portion') },
    { key: 'quality_issues', content: t('TRACKING_SURVEY_PROD_DISLIKE_3', 'Quality issues') }
  ]
  const productLikeChips = [
    { key: 'quality_ingredients', content: t('TRACKING_SURVEY_PROD_LIKE_0', 'Quality ingredients') },
    { key: 'good_taste', content: t('TRACKING_SURVEY_PROD_LIKE_1', 'Good taste') },
    { key: 'value_for_money', content: t('TRACKING_SURVEY_PROD_LIKE_2', 'Value for money') },
    { key: 'adequate_portion', content: t('TRACKING_SURVEY_PROD_LIKE_3', 'Adequate portion') }
  ]
  const deliveryProblemChips = [
    { key: 'delivery_time', content: t('TRACKING_SURVEY_DELIV_PROBLEM_0', 'Delivery time') },
    { key: 'never_arrived', content: t('TRACKING_SURVEY_DELIV_PROBLEM_1', 'The order never arrived') },
    { key: 'tracking_issues', content: t('TRACKING_SURVEY_DELIV_PROBLEM_2', 'Tracking issues') },
    { key: 'damaged_order', content: t('TRACKING_SURVEY_DELIV_PROBLEM_3', 'Damaged order') },
    { key: 'rider_service', content: t('TRACKING_SURVEY_DELIV_PROBLEM_4', 'Driver service') }
  ]
  const deliveryBestChips = [
    { key: 'punctuality', content: t('TRACKING_SURVEY_DELIV_BEST_0', 'Punctuality') },
    { key: 'delivery_tracking', content: t('TRACKING_SURVEY_DELIV_BEST_1', 'Delivery tracking') },
    { key: 'fast_delivery', content: t('TRACKING_SURVEY_DELIV_BEST_2', 'Fast delivery') },
    { key: 'good_package_condition', content: t('TRACKING_SURVEY_DELIV_BEST_3', 'Good package condition') },
    { key: 'rider_service', content: t('TRACKING_SURVEY_DELIV_BEST_4', 'Driver service') }
  ]

  const productChipList = product.stars >= 4 ? productLikeChips : productDislikeChips
  const productSubTitle = product.stars >= 4
    ? t('TRACKING_SURVEY_PROD_LIKE_TITLE', 'What would you highlight about your order?')
    : t('TRACKING_SURVEY_PROD_DISLIKE_TITLE', 'What was the problem?')
  const deliveryGood = delivery.rating >= 4
  const deliveryChipList = deliveryGood ? deliveryBestChips : deliveryProblemChips
  const deliverySubTitle = deliveryGood
    ? t('TRACKING_SURVEY_DELIV_BEST_TITLE', 'What was the best part?')
    : t('TRACKING_SURVEY_DELIV_PROBLEM_TITLE', 'What was the problem?')

  const productAnswered = product.stars > 0
  const deliveryAnswered = delivery.rating > 0
  const productComplete = productAnswered && product.chips.length > 0
  const deliveryComplete = !hasDriver || (deliveryAnswered && delivery.chips.length > 0)
  const canSubmit = productComplete && deliveryComplete
  const missingReason = (productAnswered && product.chips.length === 0) || (hasDriver && deliveryAnswered && delivery.chips.length === 0)
  const showHint = (productAnswered || deliveryAnswered) && !canSubmit

  const toggleChip = (setter, chip) => {
    setter(prev => {
      const exists = prev.chips.find(item => item.key === chip.key)
      return { ...prev, chips: exists ? prev.chips.filter(item => item.key !== chip.key) : [...prev.chips, chip] }
    })
  }
  const isChipActive = (list, chip) => !!list.find(item => item.key === chip.key)
  const handleSetStars = (value) => setProduct({ stars: value, chips: [], comment: '' })
  const handleSetDelivery = (value) => setDelivery({ rating: value, chips: [], comment: '' })
  const handleDecline = () => setPhase('declined')

  const handleSubmit = async () => {
    const willProduct = product.stars > 0
    const willDelivery = delivery.rating > 0 && hasDriver
    if (!willProduct && !willDelivery) {
      setPhase('done')
      return
    }
    setError(false)
    setSubmitting(true)
    const auth = { ordering, token, hashKey, userId: user?.id }
    try {
      const results = await Promise.all([
        willProduct ? sendOrderSurvey(auth, order, product) : Promise.resolve(true),
        willDelivery ? sendDriverSurvey(auth, order, delivery) : Promise.resolve(true)
      ])
      setSubmitting(false)
      if (results.every(Boolean)) setPhase('done')
      else setError(true)
    } catch (e) {
      setSubmitting(false)
      setError(true)
    }
  }

  useEffect(() => {
    if (order?.review) setPhase('done')
  }, [order?.review])

  return (
    <SurveyContainer data-doc-section='order-tracking-survey' data-phase={phase}>
      <IntroWrapper>
        {image && <BagImage src={image} alt='' />}
        {phase === 'intro' && (
          <>
            <IntroText>{t('TRACKING_SURVEY_INTRO', 'Tell us how your delivery and order experience went.')}</IntroText>
            <Button layout='inline' borderInset {...slotButtonOptions(theme, ORDER_TRACKING, 'survey_start', { color: 'neutral' })} onClick={() => setPhase('survey')} data-doc-control='order-tracking-survey-start'>
              {t('TRACKING_SURVEY_RATE', 'Rate')}
            </Button>
            <SkipRow>
              <Button appearance='link' linkVariant='muted' type='button' onClick={handleDecline}>{t('TRACKING_SURVEY_NOT_NOW', 'Not now')}</Button>
            </SkipRow>
          </>
        )}
        {phase === 'declined' && (
          <IntroText className='highlight'>{t('TRACKING_SURVEY_ENJOY_ORDER', 'Enjoy your order.')}</IntroText>
        )}
        {phase === 'done' && (
          <IntroText className='highlight'>{t('TRACKING_SURVEY_THANKS', 'Thank you for your feedback!')}</IntroText>
        )}
      </IntroWrapper>

      {phase === 'survey' && (
        <QuestionsWrapper>
          <QuestionBlock>
            <QuestionLabel>{t('TRACKING_SURVEY_YOUR_ORDER', 'Your order')}</QuestionLabel>
            <QuestionTitle>{t('TRACKING_SURVEY_Q_PRODUCT', 'How was what you ordered?')}</QuestionTitle>
            {/* components.rating, a group of radios (one per star) */}
            <Rating
              value={product.stars}
              onChange={handleSetStars}
              size={ratingSize}
              label={t('TRACKING_SURVEY_Q_PRODUCT', 'How was what you ordered?')}
              optionLabel={(value) => t('STARS_OUT_OF_FIVE', '_NUMBER_ of 5 stars').replace('_NUMBER_', value)}
              optionProps={(value) => ({ 'data-doc-control': `order-tracking-survey-star-${value}` })}
            />
            {product.stars > 0 && (
              <SubQuestion>
                <p className='sub-title'>{productSubTitle}</p>
                <Chips>
                  {productChipList.map(chip => (
                    <Chip
                      key={chip.key}
                      type='button'
                      size={chipSize}
                      selected={isChipActive(product.chips, chip)}
                      onClick={() => toggleChip(setProduct, chip)}
                    >
                      {chip.content}
                    </Chip>
                  ))}
                </Chips>
                <CommentField>
                  <Textarea
                    variant='compact-resizable'
                    placeholder={t('TRACKING_SURVEY_OPTIONAL_COMMENT', 'Optional comment')}
                    aria-label={t('TRACKING_SURVEY_OPTIONAL_COMMENT', 'Optional comment')}
                    value={product.comment}
                    onChange={(e) => { const value = e.target.value; setProduct(prev => ({ ...prev, comment: value })) }}
                  />
                </CommentField>
              </SubQuestion>
            )}
          </QuestionBlock>

          {hasDriver && (
            <QuestionBlock>
              <QuestionLabel>{t('TRACKING_SURVEY_DELIVERY', 'The delivery')}</QuestionLabel>
              <QuestionTitle>{deliveryQuestion}</QuestionTitle>
              {useThumbs
                ? (
                  /* a group of radios, each an icon option of components.choice */
                  <RadioGroup
                    render={<Thumbs />}
                    aria-label={deliveryQuestion}
                    name={thumbsName}
                    value={delivery.rating}
                    onValueChange={handleSetDelivery}
                  >
                    {thumbs.map((thumb) => (
                      <Radio key={thumb.value} appearance='icon-only' value={thumb.value} aria-label={thumb.label} data-doc-control={thumb.control}>
                        <Icon name={thumb.icon} />
                      </Radio>
                    ))}
                  </RadioGroup>
                  )
                : (
                  /* components.rating_scale, a group of radios (one per point) */
                  <RatingScale
                    value={delivery.rating}
                    options={scaleOptions}
                    onChange={handleSetDelivery}
                    label={deliveryQuestion}
                    data-doc-control='order-tracking-survey-scale'
                  />
                  )}
              {deliveryAnswered && (
                <SubQuestion>
                  <p className='sub-title'>{deliverySubTitle}</p>
                  <Chips>
                    {deliveryChipList.map(chip => (
                      <Chip
                        key={chip.key}
                        type='button'
                        size={chipSize}
                        selected={isChipActive(delivery.chips, chip)}
                        onClick={() => toggleChip(setDelivery, chip)}
                      >
                        {chip.content}
                      </Chip>
                    ))}
                  </Chips>
                  <CommentField>
                    <Textarea
                      variant='compact-resizable'
                      placeholder={t('TRACKING_SURVEY_OPTIONAL_COMMENT', 'Optional comment')}
                      aria-label={t('TRACKING_SURVEY_OPTIONAL_COMMENT', 'Optional comment')}
                      value={delivery.comment}
                      onChange={(e) => { const value = e.target.value; setDelivery(prev => ({ ...prev, comment: value })) }}
                    />
                  </CommentField>
                </SubQuestion>
              )}
            </QuestionBlock>
          )}

          {showHint && (
            <SurveyHint>
              {missingReason
                ? t('TRACKING_SURVEY_SELECT_REASON', 'Select at least one reason to continue.')
                : t('TRACKING_SURVEY_ANSWER_BOTH', 'Answer both questions to send your feedback.')}
            </SurveyHint>
          )}
          {error && (
            <SurveyHint className='error'>{t('TRACKING_SURVEY_ERROR', 'We could not send your feedback. Please try again.')}</SurveyHint>
          )}
          <SubmitLane>
            <Button layout='inline' borderInset fullWidth {...slotButtonOptions(theme, ORDER_TRACKING, 'survey_submit', { color: 'neutral' })} disabled={!canSubmit || submitting} onClick={handleSubmit} data-doc-control='order-tracking-survey-submit'>
              {submitting ? t('LOADING', 'Loading') : t('TRACKING_SURVEY_SEND', 'Send feedback')}
            </Button>
          </SubmitLane>
          <SkipRow>
            <Button appearance='link' linkVariant='muted' type='button' onClick={handleDecline}>{t('TRACKING_SURVEY_SKIP', 'Skip survey')}</Button>
          </SkipRow>
        </QuestionsWrapper>
      )}
    </SurveyContainer>
  )
}
