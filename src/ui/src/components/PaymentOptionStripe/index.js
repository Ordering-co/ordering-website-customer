import React, { useState, useEffect, useRef, useId } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import {
  OptionStripeContainer,
  WarningMessage,
  CardItem,
  CardChoiceRow,
  CardItemContent,
  CardItemActions,
  BlockLoading,
  AddNewCard,
  AddNewCardLink,
  CardItemActionsWrapper,
  CardsChoiceList,
  CardsHeader,
  CardsChangeLink
} from './styles'

import { PaymentOptionStripe as PaymentOptionStripeController } from '~components/components/PaymentOptionStripe'
import { useSession } from '~components/contexts/SessionContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useValidationFields } from '~components/contexts/ValidationsFieldsContext'

import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { Confirm } from '~ui/src/components/Confirm'
import { StripeElementsForm } from '~ui/src/components/StripeElementsForm'
import { CardBrand } from '~ui/src/components/CardBrand'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { Choice, ChoiceIndicator } from '~ui/src/design-system/components/Choice'
import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'

export const PaymentOptionStripeUI = (props) => {
  const {
    deleteCard,
    cardsList,
    handleCardClick,
    handleNewCard,
    paymethodSelected,
    cardSelected,
    gateway,
    deleteUserCard,
    paymethodV2Featured,
    deleteBusinessUserPaymethod,
    foldOnSelect
  } = props
  const [{ token }] = useSession()
  const [, t] = useLanguage()
  const [validationFields] = useValidationFields()
  const [confirm, setConfirm] = useState({ open: false, content: null, handleOnAccept: null })
  // The cards are a single choice list (components.choice), 10px apart. In
  // the checkout (`foldOnSelect`) they are a list of their own, titled, under
  // the methods; once one is picked only it stays, "Change" (or picking it
  // again) shows them all. A card already chosen when they show (the cart's)
  // starts folded.
  const canFold = !!foldOnSelect
  const titleId = useId()
  const activeCardId = paymethodSelected || cardSelected?.id
  const [cardsOpen, setCardsOpen] = useState(!paymethodSelected)
  const cards = cardsList?.cards || []
  const hasActiveCard = cards.some(card => card.id === activeCardId)
  const cardsFolded = canFold && !cardsOpen && hasActiveCard
  const shownCards = cardsFolded ? cards.filter(card => card.id === activeCardId) : cards
  // Roving tabindex (implementation notes, B4): one Tab stop for the group, the card that has the focus, else the chosen one,
  // else the first
  const [focusedCardId, setFocusedCardId] = useState(null)
  const stopId = [focusedCardId, activeCardId].find(id => shownCards.some(card => card.id === id)) ?? shownCards[0]?.id
  // the arrows go through the cards (Home and End to the ends) and only move the focus: Space and Enter choose
  const handleCardsKeyDown = (e) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const step = { ArrowDown: 1, ArrowUp: -1, ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key]
    if (e.target.getAttribute('role') !== 'radio' || (step === undefined && e.key !== 'Home' && e.key !== 'End')) return
    const rows = [...e.currentTarget.querySelectorAll('[role="radio"]')]
    const at = rows.indexOf(e.target)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : (at + step + rows.length) % rows.length
    e.preventDefault()
    rows[next]?.focus()
  }

  const [addCartOpen, setAddCardOpen] = useState(false)
  const validateZipcodeCard =
    validationFields?.fields?.card?.zipcode?.enabled && validationFields?.fields?.card?.zipcode?.required

  const paymethodsWithoutStripeForm = ['credomatic', 'izipay', 'globalpay', 'hitpay', 'braintree', 'cybersource']

  const _handleNewCard = (card) => {
    setAddCardOpen(false)
    handleNewCard(card)
  }

  const handleDeleteCard = (card) => {
    setConfirm({
      open: true,
      content: t('QUESTION_DELETE_CARD', 'Are you sure that you want to delete the card?'),
      handleOnAccept: () => {
        paymethodV2Featured
          ? ['izipay'].includes(gateway)
              ? deleteUserCard(card)
              : deleteBusinessUserPaymethod(card)
          : deleteCard(card)
        setConfirm({ ...confirm, open: false })
      }
    })
  }

  useEffect(() => {
    if (!cardsList?.loading && cardsList?.cards?.length === 0 && !paymethodsWithoutStripeForm.includes(gateway)) {
      setAddCardOpen(true)
    }
  }, [cardsList?.loading])

  return (
    <OptionStripeContainer>
      {!token && <WarningMessage>{t('NEED_LOGIN_TO_USE', 'Sorry, you need to login to use this method')}</WarningMessage>}

      {token && !cardsList.loading && cardsList.cards && cardsList.cards.length === 0 && (
        <CardItem>
          <span>{t('NO_CARDS', 'No cards')}</span>
        </CardItem>
      )}

      {token && cardsList.error && cardsList.error.length > 0 && (
        <NotFoundSource
          icon='creditCardFront'
          content={cardsList?.error[0]?.message || cardsList?.error[0]}
        />
      )}
      {canFold && token && cards.length > 0 && (
        <CardsHeader>
          <h3 id={titleId}>{t('SELECT_A_CARD', 'Select a card')}</h3>
          {hasActiveCard && (
            <CardsChangeLink aria-expanded={!cardsFolded} onClick={() => setCardsOpen(cardsFolded)}>
              {t('CHANGE', 'Change')}
            </CardsChangeLink>
          )}
        </CardsHeader>
      )}
      {token && cardsList.cards && cardsList.cards.length > 0 && (
        <CardsChoiceList {...(canFold && { role: 'radiogroup', 'aria-labelledby': titleId })} onKeyDown={handleCardsKeyDown}>
          {shownCards.map((card, i) =>
            <PaymentCard
              {...props}
              key={canFold ? card.id : i}
              handleCardClick={() => {
                handleCardClick(card)
                canFold && setCardsOpen(false)
              }}
              onActiveClick={canFold ? () => setCardsOpen(cardsFolded) : undefined}
              handleDeleteCard={() => handleDeleteCard(card)}
              card={card}
              tabStop={card.id === stopId}
              onRowFocus={() => setFocusedCardId(card.id)}
              defaultSelected={i === 0}
              active={(paymethodSelected || cardSelected?.id) === card.id}
              cardSelected={cardSelected}
              paymethodSelected={paymethodSelected}
              validateZipcodeCard={validateZipcodeCard}
            />
          )}
        </CardsChoiceList>
      )}
      {token && !cardsList.loading && !paymethodsWithoutStripeForm.includes(gateway) && !cardsFolded && (
        <AddNewCard>
          <AddNewCardLink onClick={() => setAddCardOpen(true)}>{t('ADD_NEW_CARD', 'Add new card')}</AddNewCardLink>
        </AddNewCard>
      )}
      {addCartOpen && (
        <DialogOverlay
          title={t('ADD_NEW_CARD', 'Add new card')}
          open={addCartOpen}
          onClose={() => setAddCardOpen(false)}
        >
          <StripeElementsForm
            businessIds={props.businessIds}
            businessId={props.businessId}
            publicKey={props.publicKey}
            cardsGateway={props.cardsGateway}
            toSave
            requirements={props.clientSecret}
            onCancel={() => setAddCardOpen(false)}
            onNewCard={_handleNewCard}
          />
        </DialogOverlay>
      )}

      <Confirm
        title={t('CARD', 'Card')}
        content={confirm.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={confirm.open}
        onClose={() => setConfirm({ ...confirm, open: false })}
        onCancel={() => setConfirm({ ...confirm, open: false })}
        onAccept={confirm.handleOnAccept}
        closeOnBackdrop={false}
      />

      {token && cardsList.loading && (
        [...Array(5).keys()].map(i => (
          <BlockLoading key={i}>
            <Skeleton height={50} />
          </BlockLoading>
        ))
      )}
    </OptionStripeContainer>
  )
}

export const PaymentCard = (props) => {
  const {
    handleDeleteCard,
    card,
    handleCardClick,
    onSelectCard,
    active,
    cardSelected,
    validateZipcodeCard,
    paymethodV2Featured,
    onActiveClick,
    tabStop = true,
    onRowFocus
  } = props

  const [isShowActions, setIsShowActions] = useState(false)
  const [, t] = useLanguage()
  const cardActionsRef = useRef(null)
  const actionWrapperRef = useRef(null)

  const handleClickOutside = (e) => {
    if (!isShowActions) return
    const outsideCalendar = !cardActionsRef.current?.contains(e.target)
    if (outsideCalendar) {
      setIsShowActions(false)
    }
  }

  const handleChangeDefaultCard = (e) => {
    if (actionWrapperRef.current?.contains(e.target) || (!card?.zipcode && validateZipcodeCard) || !card?.last4) return
    // the chosen card, where the list folds: it shows / folds the list
    // instead of being picked again
    if (active && onActiveClick) {
      onActiveClick()
      return
    }
    handleCardClick(card)
    onSelectCard && onSelectCard({
      ...cardSelected,
      id: card.id,
      type: 'card',
      card_token: card.card_token,
      card: {
        brand: card.brand,
        last4: card.last4,
        zipcode: card.zipcode
      }
    })
  }

  useEffect(() => {
    if (!cardSelected || paymethodV2Featured?.includes?.('get_cards')) return
    onSelectCard && onSelectCard({
      ...cardSelected,
      id: cardSelected?.id,
      type: 'card',
      card_token: cardSelected?.card_token,
      card: {
        brand: cardSelected?.card?.brand,
        last4: cardSelected?.card?.last4,
        zipcode: cardSelected?.card?.zipcode
      }
    })
  }, [cardSelected])

  useEffect(() => {
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [isShowActions])

  const invalid = !card?.zipcode && validateZipcodeCard

  // The row is the option (role radio); a div, not a button, as it holds the trash action
  const choiceProps = {
    variant: 'card-actions',
    as: CardChoiceRow,
    selected: active,
    $invalid: invalid,
    'data-disabled': invalid ? '' : undefined,
    role: 'radio',
    'aria-checked': !!active,
    'aria-disabled': !!invalid || undefined,
    tabIndex: tabStop ? 0 : -1,
    onFocus: (e) => e.target === e.currentTarget && onRowFocus?.(),
    onKeyDown: (e) => {
      if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return
      e.preventDefault()
      handleChangeDefaultCard(e)
    }
  }

  return (
    <Choice onClick={handleChangeDefaultCard} {...choiceProps}>
      <CardItemContent>
        <ChoiceIndicator checked={!!active} />
        <div>
          <CardBrand brand={card?.brand} alt={card?.brand} />
        </div>
        <span>
          XXXX-XXXX-XXXX-{card?.last4}
        </span>
        {!card?.zipcode && validateZipcodeCard && (
          <p>
            ({t('MISSING_ZIPCODE', 'Missing zipcode')})
          </p>
        )}
      </CardItemContent>
      {/* the selected card (the one the order pays with) cannot be deleted */}
      {!active && (paymethodV2Featured?.includes('delete_cards') || !paymethodV2Featured) && (
        <CardItemActions>
          <CardItemActionsWrapper ref={actionWrapperRef}>
            {/* the delete action is a real button, the theme's icon button
                (ghost danger, as in My cards) */}
            <Button
              ref={cardActionsRef}
              type='button'
              shape='icon'
              size='sm'
              color='danger'
              appearance='ghost'
              aria-label={t('DELETE_CARD', 'Delete card')}
              onClick={() => handleDeleteCard()}
            >
              <Icon name='trash' />
            </Button>
          </CardItemActionsWrapper>
        </CardItemActions>
      )}
    </Choice>
  )
}

export const PaymentOptionStripe = (props) => {
  const paymentOptionStripeProps = {
    ...props,
    UIComponent: PaymentOptionStripeUI
  }
  return (
    <PaymentOptionStripeController {...paymentOptionStripeProps} />
  )
}
