import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { PaymentOptionStripe, PaymentCard } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
vi.mock('~ui/src/components/StripeElementsForm', () => ({
  StripeElementsForm: ({ cardsGateway }) => <div data-testid='stripe-elements-form' data-cards-gateway={cardsGateway} />
}))
vi.mock('~ui/src/components/Confirm', () => ({
  Confirm: () => null
}))
vi.mock('~ui/src/components/NotFoundSource', () => ({
  NotFoundSource: () => null
}))
vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [{ fields: { card: { zipcode: { enabled: false, required: false } } } }]
}))

vi.mock('~components/components/PaymentOptionStripe', () => ({
  PaymentOptionStripe: ({ UIComponent, ...rest }) => (
    <UIComponent
      cardsList={{ loading: false, cards: [{ id: 1, brand: 'visa', last4: '4242' }] }}
      gateway='stripe'
      handleCardClick={vi.fn()}
      handleNewCard={vi.fn()}
      deleteCard={vi.fn()}
      paymethodSelected={{ paymethod: { gateway: 'stripe' } }}
      {...rest}
    />
  )
}))

describe('PaymentOptionStripe', () => {
  it('renders saved card row', () => {
    const { getByText } = renderWithProviders(<PaymentOptionStripe />)
    expect(getByText(/4242/)).toBeInTheDocument()
  })

  it('adds a new card through the cards gateway of the controller, in a dialog that closes', async () => {
    const { findByRole, queryByRole } = renderWithProviders(
      <PaymentOptionStripe
        gateway='stripe_connect_v2'
        cardsGateway='stripe_connect_v2'
        cardsList={{ loading: false, cards: [] }}
      />
    )
    const dialog = await findByRole('dialog', { name: 'Add new card' })
    expect(within(dialog).getByTestId('stripe-elements-form')).toHaveAttribute('data-cards-gateway', 'stripe_connect_v2')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })
})

const completeTheme = (showIndicator = true) => themeWithValues((values) => {
  values.components.choice.base.show_indicator = showIndicator
  values.components.choice.variants.default.states.selected = { background: '#FFEBE0', border: { width: 1, color: '#FF5500', style: 'solid' }, color: '#111111' }
  return values
})

const cards = { loading: false, cards: [{ id: 1, brand: 'visa', last4: '4242' }, { id: 2, brand: 'visa', last4: '1111' }] }

describe('PaymentOptionStripe (the theme\'s choice list)', () => {
  it('each saved card is an option of a single choice list, 10px apart', () => {
    const { getAllByRole } = renderWithProviders(
      <PaymentOptionStripe cardsList={cards} paymethodSelected={2} />,
      { theme: completeTheme() }
    )
    const [first, second] = getAllByRole('radio')
    expect(first).toHaveAttribute('aria-checked', 'false')
    expect(second).toHaveAttribute('aria-checked', 'true')
    // the card is the base Choice card (components.choice): its selected look is the theme's
    expect(first).toHaveAttribute('data-slot', 'choice')
    expect(second).toHaveAttribute('data-checked')
    expect(first).not.toHaveAttribute('data-checked')
    expect(second.style.getPropertyValue('--ui-choice-selected-background')).toBe('#FFEBE0')
    expect(cssFor(first.parentElement)).toContain('gap:10px')
    expect(second.querySelectorAll('[data-slot="choice-indicator"]')).toHaveLength(1)
  })

  it('picking a card selects it; its trash action does not', () => {
    const handleCardClick = vi.fn()
    const onSelectCard = vi.fn()
    const { getAllByRole } = renderWithProviders(
      <PaymentOptionStripe cardsList={cards} handleCardClick={handleCardClick} onSelectCard={onSelectCard} />,
      { theme: completeTheme() }
    )
    const [first] = getAllByRole('radio')
    const trash = within(first).getByRole('button', { name: 'Delete card' })
    fireEvent.click(trash)
    expect(handleCardClick).not.toHaveBeenCalled()
    fireEvent.click(first)
    expect(handleCardClick).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
    fireEvent.keyDown(first, { key: 'Enter' })
    expect(handleCardClick).toHaveBeenCalledTimes(2)
  })

  it('the trash action is the base icon button, named and of type button, with the base icon', () => {
    const { getAllByRole } = renderWithProviders(
      <PaymentOptionStripe cardsList={cards} paymethodSelected={2} />,
      { theme: completeTheme() }
    )
    const [first, second] = getAllByRole('radio')
    // the chosen card cannot be deleted
    expect(within(second).queryByRole('button')).toBeNull()
    const trash = within(first).getByRole('button', { name: 'Delete card' })
    expect(trash).toHaveAttribute('data-slot', 'button')
    expect(trash).toHaveAttribute('type', 'button')
    expect(trash.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('a card missing its zipcode is dimmed and not-allowed, and picks nothing', () => {
    const handleCardClick = vi.fn()
    const { getByRole } = renderWithProviders(
      <PaymentCard card={{ id: 1, brand: 'visa', last4: '4242' }} validateZipcodeCard handleCardClick={handleCardClick} />,
      { theme: completeTheme() }
    )
    const row = getByRole('radio')
    expect(row).toHaveAttribute('aria-disabled', 'true')
    expect(row).toHaveAttribute('data-disabled')
    expect(cssFor({ className: [...row.classList].filter((name) => !name.startsWith('ui:')).join(' ') })).toContain('opacity:0.7')
    fireEvent.click(row)
    expect(handleCardClick).not.toHaveBeenCalled()
  })

  it('show_indicator false hides the indicator', () => {
    const hidden = renderWithProviders(<PaymentOptionStripe cardsList={cards} />, { theme: completeTheme(false) })
    expect(hidden.getAllByRole('radio')[0].querySelectorAll('span[aria-hidden="true"]')).toHaveLength(0)
  })
})

describe('PaymentOptionStripe (folding in the checkout)', () => {
  it('the cards are a titled list of their own; once one is chosen only it stays, Change shows them all', () => {
    const handleCardClick = vi.fn()
    const { getAllByRole, getByRole, rerender, queryByText } = renderWithProviders(
      <PaymentOptionStripe foldOnSelect cardsList={cards} handleCardClick={handleCardClick} />,
      { theme: completeTheme() }
    )
    expect(getByRole('radiogroup')).toHaveAccessibleName('Select a card')
    expect(getAllByRole('radio')).toHaveLength(2)
    fireEvent.click(getAllByRole('radio')[1])
    expect(handleCardClick).toHaveBeenCalled()
    // the cart takes the card: only it stays
    rerender(<PaymentOptionStripe foldOnSelect cardsList={cards} handleCardClick={handleCardClick} paymethodSelected={2} />)
    expect(getAllByRole('radio')).toHaveLength(1)
    expect(getAllByRole('radio')[0]).toHaveTextContent('1111')
    expect(queryByText('Add new card')).toBeNull()
    fireEvent.click(getByRole('button', { name: 'Change' }))
    expect(getAllByRole('radio')).toHaveLength(2)
  })

  it('a card already chosen starts folded; without foldOnSelect all cards show', () => {
    const { getAllByRole, rerender } = renderWithProviders(
      <PaymentOptionStripe foldOnSelect cardsList={cards} paymethodSelected={1} />,
      { theme: completeTheme() }
    )
    expect(getAllByRole('radio')).toHaveLength(1)
    rerender(<PaymentOptionStripe cardsList={cards} paymethodSelected={1} />)
    expect(getAllByRole('radio')).toHaveLength(2)
  })
})

// implementation notes, B4: the saved cards are announced as radios, so they behave as one: the arrows go through the group, one
// Tab stop for the selection (roving tabindex), Space and Enter select, and each card's own action stays in the tab order.
describe('PaymentOptionStripe (the cards as one radio group)', () => {
  const renderCards = (props = {}) => renderWithProviders(
    <PaymentOptionStripe cardsList={{ loading: false, cards: [...cards.cards, { id: 3, brand: 'visa', last4: '3333' }] }} {...props} />,
    { theme: completeTheme() }
  )
  const tabStops = (radios) => radios.map((radio) => radio.tabIndex)

  it('one Tab stop: the chosen card, or the first when none is chosen', () => {
    expect(tabStops(renderCards({ paymethodSelected: 2 }).getAllByRole('radio'))).toEqual([-1, 0, -1])
  })

  it('without a chosen card the first is the stop', () => {
    expect(tabStops(renderCards().getAllByRole('radio'))).toEqual([0, -1, -1])
  })

  it('the arrows move the focus through the group (wrapping, Home and End) and the stop follows it, selecting nothing', () => {
    const handleCardClick = vi.fn()
    const { getAllByRole } = renderCards({ handleCardClick })
    const radios = getAllByRole('radio')
    radios[0].focus()
    fireEvent.keyDown(radios[0], { key: 'ArrowDown' })
    expect(radios[1]).toHaveFocus()
    expect(tabStops(radios)).toEqual([-1, 0, -1])
    fireEvent.keyDown(radios[1], { key: 'ArrowRight' })
    expect(radios[2]).toHaveFocus()
    fireEvent.keyDown(radios[2], { key: 'ArrowDown' })
    expect(radios[0]).toHaveFocus()
    fireEvent.keyDown(radios[0], { key: 'ArrowUp' })
    expect(radios[2]).toHaveFocus()
    fireEvent.keyDown(radios[2], { key: 'Home' })
    expect(radios[0]).toHaveFocus()
    fireEvent.keyDown(radios[0], { key: 'End' })
    expect(radios[2]).toHaveFocus()
    expect(handleCardClick).not.toHaveBeenCalled()
  })

  it('Space and Enter select the card that has the focus', () => {
    const handleCardClick = vi.fn()
    const { getAllByRole } = renderCards({ handleCardClick })
    const radios = getAllByRole('radio')
    fireEvent.keyDown(radios[1], { key: ' ' })
    expect(handleCardClick).toHaveBeenLastCalledWith(expect.objectContaining({ id: 2 }))
    fireEvent.keyDown(radios[2], { key: 'Enter' })
    expect(handleCardClick).toHaveBeenLastCalledWith(expect.objectContaining({ id: 3 }))
  })

  it('the action of a card keeps its own key handling and stays reachable (not a stop to leave out)', () => {
    const { getAllByRole } = renderCards({ paymethodSelected: 2 })
    const [first] = getAllByRole('radio')
    const trash = within(first).getByRole('button', { name: 'Delete card' })
    expect(trash.tabIndex).toBe(0)
    trash.focus()
    fireEvent.keyDown(trash, { key: 'ArrowDown' })
    expect(trash).toHaveFocus()
  })
})
