import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import {
  giftCardPaginationFixture,
  giftCardsListFixture,
  purchaseGiftCardFixture,
  redeemGiftCardFixture,
  sendGiftCardFixture
} from '../../__tests__/helpers/giftCardStudentTestMocks'
import { GiftCardUI } from '../GiftCardUI'
import { PurchaseGiftCard } from '../PurchaseGiftCard'
import { RedeemGiftCard } from '../RedeemGiftCard'
import { SendGiftCard } from '../SendGiftCard'
import { VerticalGiftCardOrdersLayout } from '../VerticalGiftCardOrdersLayout'

// implementation notesthe buttons and fields of the gift card pages (the redeem on
// the wallet, the purchase, the load-more of the orders, the send and redeem
// forms) are the design system's pieces.

vi.mock('~components/components/GiftCard/PurchaseGiftCard', () => ({
  PurchaseGiftCard: ({ UIComponent, ...rest }) => <UIComponent {...purchaseGiftCardFixture} {...rest} />
}))
vi.mock('~components/components/GiftCard/RedeemGiftCard', () => ({
  RedeemGiftCard: ({ UIComponent, ...rest }) => <UIComponent {...redeemGiftCardFixture} {...rest} />
}))
vi.mock('~components/components/GiftCard/SendGiftCard', () => ({
  SendGiftCard: ({ UIComponent, ...rest }) => <UIComponent {...sendGiftCardFixture} {...rest} />
}))
vi.mock('~components/components/GiftCard/GiftCardOrdersList', () => ({
  GiftCardOrdersList: ({ UIComponent, ...rest }) => (
    <UIComponent
      giftCards={giftCardsListFixture}
      paginationProps={{ ...giftCardPaginationFixture, totalPages: 3 }}
      loadMoreOrders={vi.fn()}
      title='Pending'
      setIsEmpty={vi.fn()}
      {...rest}
    />
  )
}))

const theme = themeWithValues()
const render = (ui) => renderWithProviders(ui, { theme })
const isButton = (el) => expect(el).toHaveAttribute('data-slot', 'button')
const buttonVar = (el, name) => el.style.getPropertyValue(name)

describe('GiftCardUI: the redeem button', () => {
  it('is the base Button, secondary solid sm, and opens the redeem', () => {
    const { getByRole, getByText } = render(<GiftCardUI />)
    const redeem = getByRole('button', { name: 'Redeem' })
    isButton(redeem)
    const look = componentVars(theme, 'button', { size: 'sm', color: 'secondary', appearance: 'solid' })
    expect(buttonVar(redeem, '--ui-button-height')).toBe(look['--ui-button-height'])
    expect(buttonVar(redeem, '--ui-button-background')).toBe(look['--ui-button-background'])
    fireEvent.click(redeem)
    expect(getByText('Redeem a gift card')).toBeInTheDocument()
  })
})

describe('PurchaseGiftCard: the purchase button', () => {
  it('is the base Button, a plain button named with its amount', () => {
    const { getByRole } = render(<PurchaseGiftCard />)
    const purchase = getByRole('button', { name: 'Purchase $25' })
    isButton(purchase)
    expect(purchase).toHaveAttribute('type', 'button')
    expect(purchase.getAttribute('aria-labelledby')).toBe(`${purchase.id} ${purchase.getAttribute('aria-labelledby').split(' ')[1]}`)
    expect(document.getElementById(purchase.getAttribute('aria-labelledby').split(' ')[1])).toHaveTextContent('$25')
  })

  it('buys on click', () => {
    const handleAccept = vi.fn()
    const { getByRole } = render(<PurchaseGiftCard handleAccept={handleAccept} />)
    fireEvent.click(getByRole('button', { name: 'Purchase $25' }))
    expect(handleAccept).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })
})

describe('VerticalGiftCardOrdersLayout: load more orders', () => {
  const props = { title: 'Pending', defaultStatus: 'pending' }

  it('is the base Button, outline and full width', () => {
    const { getByRole } = render(<VerticalGiftCardOrdersLayout {...props} />)
    const more = getByRole('button', { name: 'Load more orders' })
    isButton(more)
    const look = componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'outline' })
    expect(buttonVar(more, '--ui-button-border')).toBe(look['--ui-button-border'])
    expect(more.className).toContain('ui:w-full')
    expect(more).not.toHaveAttribute('aria-busy')
  })

  it('while the next page loads: busy, keeps its name, no "Loading..." text', () => {
    const { getByRole, queryByText } = render(
      <VerticalGiftCardOrdersLayout {...props} giftCards={{ ...giftCardsListFixture, loading: true }} />
    )
    const more = getByRole('button', { name: 'Load more orders' })
    expect(more).toHaveAttribute('aria-busy', 'true')
    expect(more.querySelector('[data-slot="button-spinner"]')).not.toBeNull()
    expect(queryByText('Loading...')).toBeNull()
  })
})

describe('SendGiftCard: fields and submit', () => {
  it('the inputs are the base Input and the message the base Textarea with its rows', () => {
    const { getByLabelText } = render(<SendGiftCard />)
    ;['To', 'Name', 'Title'].forEach((name) => {
      expect(getByLabelText(name)).toHaveAttribute('data-slot', 'input')
      expect(getByLabelText(name)).not.toHaveAttribute('aria-invalid')
    })
    const message = getByLabelText('Messages')
    expect(message).toHaveAttribute('data-slot', 'textarea')
    expect(message).toHaveAttribute('rows', '5')
    expect(getByLabelText('To')).toHaveAttribute('type', 'email')
    expect(getByLabelText('To')).toHaveAttribute('autocomplete', 'off')
  })

  it('a missing email: invalid, described by its message', async () => {
    const { getByRole, getByLabelText } = render(<SendGiftCard />)
    await act(async () => { fireEvent.click(getByRole('button', { name: 'Send gift card' })) })
    const email = getByLabelText('To')
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(email.getAttribute('aria-describedby'))).toHaveTextContent('The field Email is required')
  })

  it('the submit is the base Button, a submit that sends the values', async () => {
    const handleSendGiftCard = vi.fn()
    const { getByRole, getByLabelText } = render(<SendGiftCard handleSendGiftCard={handleSendGiftCard} />)
    const submit = getByRole('button', { name: 'Send gift card' })
    isButton(submit)
    expect(submit).toHaveAttribute('type', 'submit')
    fireEvent.change(getByLabelText('To'), { target: { value: 'ann@test.dev' } })
    await act(async () => { fireEvent.click(submit) })
    expect(handleSendGiftCard).toHaveBeenCalledWith(expect.objectContaining({ email: 'ann@test.dev' }))
  })

  it('while it sends: busy, keeps its name, no "Loading" text', () => {
    const { getByRole, queryByText } = render(<SendGiftCard actionState={{ loading: true, error: null }} />)
    const submit = getByRole('button', { name: 'Send gift card' })
    expect(submit).toHaveAttribute('aria-busy', 'true')
    expect(queryByText('Loading')).toBeNull()
  })
})

describe('RedeemGiftCard: fields, submit and OK', () => {
  it('both fields are the base Input; the code is still upper-cased and grouped', async () => {
    const handleApply = vi.fn()
    const { getByLabelText, getByRole } = render(<RedeemGiftCard handleApply={handleApply} />)
    const code = getByLabelText('Gift card code')
    const password = getByLabelText('Gift card password')
    expect(code).toHaveAttribute('data-slot', 'input')
    expect(password).toHaveAttribute('data-slot', 'input')
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveAttribute('autocomplete', 'new-password')
    fireEvent.change(code, { target: { value: 'abcd1234' } })
    expect(code.value).toBe('ABCD-1234')
    fireEvent.change(password, { target: { value: 'secret' } })
    await act(async () => { fireEvent.click(getByRole('button', { name: 'Apply to your balance' })) })
    expect(handleApply).toHaveBeenCalledWith({ code: 'ABCD1234', password: 'secret' })
  })

  it('missing fields: invalid and described by their messages', async () => {
    const { getByLabelText, getByRole } = render(<RedeemGiftCard />)
    await act(async () => { fireEvent.click(getByRole('button', { name: 'Apply to your balance' })) })
    ;[['Gift card code', 'Code is required'], ['Gift card password', 'The field Password is required']].forEach(([name, message]) => {
      const field = getByLabelText(name)
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(document.getElementById(field.getAttribute('aria-describedby'))).toHaveTextContent(message)
    })
  })

  it('the submit is the base Button lg, full width, a submit; busy while it sends', () => {
    const idle = render(<RedeemGiftCard />)
    const submit = idle.getByRole('button', { name: 'Apply to your balance' })
    isButton(submit)
    expect(submit).toHaveAttribute('type', 'submit')
    expect(submit.className).toContain('ui:w-full')
    expect(buttonVar(submit, '--ui-button-height')).toBe(componentVars(theme, 'button', { size: 'lg', color: 'primary', appearance: 'solid' })['--ui-button-height'])
    expect(submit).not.toHaveAttribute('aria-busy')
    idle.unmount()
    const busy = render(<RedeemGiftCard actionState={{ loading: true, error: null }} />)
    expect(busy.getByRole('button', { name: 'Apply to your balance' })).toHaveAttribute('aria-busy', 'true')
  })

  it('the OK of a redeemed gift card is the base Button and closes', async () => {
    const onClose = vi.fn()
    const { getByRole } = render(
      <RedeemGiftCard onClose={onClose} redeemedGiftCard={{ type: 'cash', amount: 25 }} />
    )
    const ok = getByRole('button', { name: 'Ok' })
    isButton(ok)
    fireEvent.click(ok)
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
