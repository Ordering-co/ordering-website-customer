import React, { useState } from 'react'
import { useTheme } from 'styled-components'

import {
  AppliedOfferIcon,
  AppliedCoupon,
  CouponContainer,
  CouponEntryContent,
  CouponForm,
  CouponModalContent,
  CouponSection,
  CouponSectionHeader,
  OfferLoadingState,
  OfferCard,
  OfferAction,
  OfferCardContent,
  OfferCode,
  OfferList,
  OfferRate,
  OfferSpinner,
  OfferState,
  OfferTabCount,
  OfferTabDescription
} from './styles'

import { CouponControl as CouponController } from '~components/components/CouponControl'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { Input } from '~ui/src/design-system/components/Input'
import { Button } from '~ui/src/design-system/components/Button'
import { Confirm } from '~ui/src/components/Confirm'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~ui/src/design-system/components/Tabs'
import { ChevronIcon } from '~ui/src/styles/Chevron'
import { themeColor } from '~/utils/themeColors'

const CouponOfferCard = (props) => {
  const {
    offer,
    cartHasOffers,
    applyingOfferId,
    onApply,
    t
  } = props

  const isApplying = applyingOfferId === offer.id
  const isUnavailable = offer.applicable === false
  const shouldReplace = !offer.stackable && cartHasOffers
  const rate = offer.rate_type === 1 && offer.rate
    ? `${offer.rate}%`
    : null

  return (
    <OfferCard $unavailable={isUnavailable}>
      {rate && <OfferRate>{rate}</OfferRate>}
      <OfferCardContent>
        <h4>{offer.name}</h4>
        {(offer.coupon || offer.code) && <OfferCode>{offer.coupon || offer.code}</OfferCode>}
        {offer.description && <p>{offer.description}</p>}
        {isUnavailable && (
          <small>
            {t('OFFER_REQUIREMENTS_NOT_MET', "This cart doesn't meet this offer's requirements yet.")}
          </small>
        )}
      </OfferCardContent>
      <OfferAction>
        <Button
          color='primary'
          disabled={isUnavailable || Boolean(applyingOfferId)}
          onClick={() => onApply(offer)}
        >
          {isApplying
            ? t('APPLYING', 'Applying...')
            : shouldReplace
              ? t('REPLACE', 'Replace')
              : t('APPLY', 'Apply')}
        </Button>
      </OfferAction>
    </OfferCard>
  )
}

const CurrentOfferCard = (props) => {
  const {
    isCoupon,
    offer,
    onRemove,
    removingOfferId,
    t
  } = props

  const rate = offer.rate_type === 1 && offer.rate
    ? `${offer.rate}%`
    : null
  const isRemoving = removingOfferId === offer.id
  const canRemove = isCoupon || Boolean(offer.id)
  // removing an offer is the danger outline button of the theme

  return (
    <OfferCard>
      {rate
        ? <OfferRate>{rate}</OfferRate>
        : (
          <AppliedOfferIcon>
            <Icon name='tag' />
          </AppliedOfferIcon>
          )}
      <OfferCardContent>
        <h4>{offer.name || t('APPLIED_OFFER', 'Applied offer')}</h4>
        {(offer.coupon || offer.code) && <OfferCode>{offer.coupon || offer.code}</OfferCode>}
        {offer.description && <p>{offer.description}</p>}
      </OfferCardContent>
      {canRemove && (
        <OfferAction>
          <Button
            type='button'
            appearance='outline'
            color='danger'
            disabled={Boolean(removingOfferId)}
            onClick={() => onRemove(offer, isCoupon)}
            aria-label={`${t('REMOVE', 'Remove')} ${offer.name || offer.coupon || t('OFFER', 'Offer')}`}
          >
            <Icon name='closeCircle' size='sm' aria-hidden='true' />
            <span>{isRemoving ? t('REMOVING', 'Removing...') : t('REMOVE', 'Remove')}</span>
          </Button>
        </OfferAction>
      )}
    </OfferCard>
  )
}

const CouponControlUI = (props) => {
  const theme = useTheme()
  const {
    applyingOfferId,
    canLoadOffers,
    cart,
    couponDefault,
    couponInput,
    handleButtonApplyClick,
    handleLoadOffers,
    handleOfferApplyClick,
    handleOfferRemoveClick,
    handleRemoveCouponClick,
    onChangeInputCoupon,
    offersState,
    removingOfferId,
    confirm,
    setConfirm
  } = props

  const [, t] = useLanguage()
  const [orderState] = useOrder()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('available')
  const [pendingRemoval, setPendingRemoval] = useState(null)
  const couponLabel = typeof couponDefault === 'object'
    ? couponDefault?.coupon || couponDefault?.code || ''
    : couponDefault
  const appliedOffers = Array.isArray(cart?.offers) ? cart.offers : []
  const normalizedCouponLabel = String(couponLabel || '').trim().toLowerCase()
  const couponIsListedAsOffer = appliedOffers.some(offer => (
    normalizedCouponLabel &&
    String(offer?.coupon || offer?.code || '').trim().toLowerCase() === normalizedCouponLabel
  ))
  const currentOffers = [
    ...appliedOffers,
    ...(couponDefault && !couponIsListedAsOffer
      ? [{
          id: `coupon:${couponLabel}`,
          coupon: couponLabel,
          name: t('APPLIED_COUPON', 'Applied coupon'),
          isCoupon: true
        }]
      : [])
  ]
  const appliedOffersCount = currentOffers.length

  const handleOpen = () => {
    setOpen(true)
    if (canLoadOffers) handleLoadOffers()
  }

  const handleManualApply = async (event) => {
    event.preventDefault()
    const applied = await handleButtonApplyClick()
    if (applied === true) setOpen(false)
  }

  const handleOfferApply = async (offer) => {
    const applied = await handleOfferApplyClick(offer)
    if (applied) setOpen(false)
  }

  const onRemoveCoupon = () => {
    setPendingRemoval({ type: 'coupon' })
    setConfirm({
      open: true,
      content: t('QUESTION_DELETE_COUPON', 'Are you sure that you want to delete the coupon?')
    })
  }

  const onRemoveOffer = (offer, isCoupon) => {
    if (isCoupon) {
      onRemoveCoupon()
      return
    }
    setPendingRemoval({ type: 'offer', id: offer.id })
    setConfirm({
      open: true,
      content: t('QUESTION_DELETE_OFFER', 'Are you sure that you want to delete the offer?')
    })
  }

  const handleOnAccept = async () => {
    if (!confirm.error) {
      if (pendingRemoval?.type === 'offer') {
        await handleOfferRemoveClick?.(pendingRemoval.id)
      } else {
        await handleRemoveCouponClick?.()
        onChangeInputCoupon('')
      }
    }
    setConfirm({ ...confirm, open: false, error: false })
    setPendingRemoval(null)
  }

  const handleClose = () => {
    setConfirm({ ...confirm, open: false, error: false })
    setPendingRemoval(null)
  }

  return (
    <CouponContainer>
      {/* the ghost button of the theme (its card is the box); its two lines grow it */}
      {/* the card clips: the row's keyboard ring is drawn inside its edge */}
      <Button type='button' appearance='ghost' color='neutral' fullWidth focusInset align='start' layout='multiline' onClick={handleOpen}>
        {/* the tag icon alone, no box, in the rating color */}
        <Icon name='tag' style={{ color: themeColor(theme, 'rating') }} />
        <CouponEntryContent>
          <strong>{t('OFFERS_AND_COUPONS', 'Offers and coupons')}</strong>
          <span>
            {appliedOffersCount
              ? `${appliedOffersCount} ${t('APPLIED', 'applied')}`
              : t('ADD_A_COUPON_OR_OFFER', 'Add a coupon or offer')}
          </span>
        </CouponEntryContent>
        <ChevronIcon kind='navigate' size={false} />
      </Button>

      {open && (
        <DialogOverlay
          open
          title={t('OFFERS_AND_COUPONS', 'Offers and coupons')}
          onClose={() => setOpen(false)}
          data-doc-section='coupon-selector-dialog'
        >
          <CouponModalContent>
            <CouponSection>
              <CouponSectionHeader>
                <h4>{t('ENTER_A_COUPON_CODE', 'Enter a coupon code')}</h4>
                <p>{t('ENTER_COUPON_HELP', 'Enter your code below to apply it to this cart.')}</p>
              </CouponSectionHeader>
              {couponDefault
                ? (
                  <AppliedCoupon>
                    <div>
                      <Icon name='tag' />
                      <span>
                        <small>{t('APPLIED_COUPON', 'Applied coupon')}</small>
                        <strong title={couponLabel}>{couponLabel}</strong>
                      </span>
                    </div>
                    <Button
                      appearance='outline'
                      color={canLoadOffers ? 'primary' : 'danger'}
                      onClick={canLoadOffers ? () => setActiveTab('current') : onRemoveCoupon}
                    >
                      {canLoadOffers ? t('MANAGE', 'Manage') : t('REMOVE', 'Remove')}
                    </Button>
                  </AppliedCoupon>
                  )
                : (
                  <CouponForm onSubmit={handleManualApply}>
                    <Input
                      value={couponInput ?? ''}
                      aria-label={t('DISCOUNT_COUPON', 'Discount coupon')}
                      placeholder={t('DISCOUNT_COUPON', 'Discount coupon')}
                      onChange={(event) => onChangeInputCoupon(event.target.value)}
                      autoComplete='off'
                    />
                    <Button
                      type='submit'
                      cta={false}
                      color='primary'
                      disabled={!couponInput || orderState.loading || Boolean(applyingOfferId) || Boolean(removingOfferId)}
                    >
                      {t('APPLY', 'Apply')}
                    </Button>
                  </CouponForm>
                  )}
            </CouponSection>

            {canLoadOffers && (
              <CouponSection>
                <Tabs layout='fill' value={activeTab} onValueChange={setActiveTab}>
                  <TabsList aria-label={t('OFFERS_AND_COUPONS', 'Offers and coupons')} activateOnFocus>
                    <TabsTrigger value='available'>
                      <span>{t('AVAILABLE_OFFERS', 'Available offers')}</span>
                      {!offersState.loading && offersState.offers.length > 0 && (
                        <OfferTabCount>{offersState.offers.length}</OfferTabCount>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value='current'>
                      <span>{t('CURRENT_OFFERS', 'Current offers')}</span>
                      <OfferTabCount>{appliedOffersCount}</OfferTabCount>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value='available'>
                    <OfferTabDescription>
                      {t('AVAILABLE_OFFERS_HELP', 'Choose an offer and apply it instantly.')}
                    </OfferTabDescription>
                    <OfferList aria-busy={offersState.loading}>
                      {offersState.loading && (
                        <OfferLoadingState role='status' aria-live='polite'>
                          <OfferSpinner aria-hidden='true' />
                          <span>{t('LOADING', 'Loading...')}</span>
                        </OfferLoadingState>
                      )}

                      {!offersState.loading && offersState.error && (
                        <OfferState role='alert'>
                          <Icon name='closeOctagon' />
                          <strong>{t('OFFERS_COULD_NOT_LOAD', "We couldn't load your offers")}</strong>
                          <span>{t('OFFERS_LOAD_RETRY_HELP', 'Check your connection and try again.')}</span>
                          <Button appearance='outline' color='primary' onClick={handleLoadOffers}>
                            {t('RETRY', 'Retry')}
                          </Button>
                        </OfferState>
                      )}

                      {!offersState.loading && !offersState.error && offersState.offers.length === 0 && (
                        <OfferState>
                          <Icon name='giftOutline' />
                          <strong>{t('NO_OFFERS_AVAILABLE', 'No offers available right now')}</strong>
                          <span>{t('NO_OFFERS_AVAILABLE_HELP', 'You can still enter a coupon code above.')}</span>
                        </OfferState>
                      )}

                      {!offersState.loading && !offersState.error && offersState.offers.map(offer => (
                        <CouponOfferCard
                          key={offer.id}
                          offer={offer}
                          cartHasOffers={Boolean(cart?.offers?.length)}
                          applyingOfferId={applyingOfferId}
                          onApply={handleOfferApply}
                          t={t}
                        />
                      ))}
                    </OfferList>
                  </TabsContent>

                  <TabsContent value='current'>
                    <OfferTabDescription>
                      {t('CURRENT_OFFERS_HELP', 'Review or remove discounts applied to this cart.')}
                    </OfferTabDescription>
                    <OfferList>
                      {currentOffers.length === 0 && (
                        <OfferState>
                          <Icon name='tag' />
                          <strong>{t('NO_CURRENT_OFFERS', 'No offers applied yet')}</strong>
                          <span>{t('NO_CURRENT_OFFERS_HELP', 'Choose an available offer or enter a coupon code above.')}</span>
                        </OfferState>
                      )}

                      {currentOffers.map(offer => (
                        <CurrentOfferCard
                          key={offer.id || offer.coupon || offer.code || offer.name}
                          offer={offer}
                          isCoupon={Boolean(offer.isCoupon)}
                          removingOfferId={removingOfferId}
                          onRemove={onRemoveOffer}
                          t={t}
                        />
                      ))}
                    </OfferList>
                  </TabsContent>
                </Tabs>
              </CouponSection>
            )}
          </CouponModalContent>
        </DialogOverlay>
      )}
      <Confirm
        title={pendingRemoval?.type === 'offer' ? t('OFFER', 'Offer') : t('COUPON', 'Coupon')}
        content={confirm?.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={confirm?.open}
        onClose={handleClose}
        onCancel={!confirm?.error ? handleClose : null}
        onAccept={handleOnAccept}
        closeOnBackdrop={false}
      />
    </CouponContainer>
  )
}

export const CouponControl = (props) => {
  const couponProp = {
    ...props,
    UIComponent: CouponControlUI
  }
  return (
    <CouponController {...couponProp} />
  )
}
