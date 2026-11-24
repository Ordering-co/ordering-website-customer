import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../styles/__tests__/themeTestUtils'
import { GiftCardOrdersList } from '../index'

// The gift card tab of /profile/orders: its groups (Pending, Sent, Redeemed)
// with the controller stubbed per status; Sent is empty
const CARDS = { pending: [{ id: 1 }, { id: 2 }], sent: [], activated: [{ id: 3 }] }

vi.mock('~components/components/GiftCard/GiftCardOrdersList', () => ({
  GiftCardOrdersList: ({ UIComponent, ...rest }) => (
    <UIComponent
      {...rest}
      giftCards={{ loading: false, list: CARDS[rest.defaultStatus] }}
      paginationProps={{ currentPage: 1, totalPages: rest.defaultStatus === 'pending' ? 2 : 1 }}
      loadMoreOrders={vi.fn()}
    />
  )
}))
vi.mock('~ui/src/components/GiftCard/SingleGiftCard', () => ({
  SingleGiftCard: ({ card }) => <div data-testid='gift-card'>{card.id}</div>
}))

const SPACE = { none: 0, xxs: 3, xs: 5, sm: 9, md: 14, lg: 19, xl: 27 }
const spacedTheme = () => themeWithValues((values) => ({ ...values, tokens: { ...values.tokens, space: SPACE } }))

const renderList = (theme) => {
  const view = renderWithProviders(<GiftCardOrdersList />, { theme })
  const [pending, redeemed] = view.getAllByRole('heading', { level: 2 })
  return {
    ...view,
    pending,
    redeemed,
    groups: [pending.parentElement, redeemed.parentElement],
    wrappers: view.getAllByTestId('gift-card').map((card) => card.parentElement),
    // the row (WrappButton) holds the width wrapper that holds the button
    loadMore: view.getByText('Load more orders').closest('button').parentElement.parentElement
  }
}

describe('gift card tab rhythm', () => {
  it('titles md over their cards, cards md apart, load more md under them, groups xl apart (the empty one takes none)', () => {
    const { pending, redeemed, groups, wrappers, loadMore } = renderList(spacedTheme())
    ;[pending, redeemed].forEach((title) => expect(title).toHaveStyle({ marginTop: '0px', marginBottom: `${SPACE.md}px` }))
    // none of its own (0)
    const none = (value) => expect(value).toMatch(/^(0px)?$/)
    none(window.getComputedStyle(groups[0]).marginTop)
    expect(groups[1]).toHaveStyle({ marginTop: `${SPACE.xl}px` })
    const [first, second, third] = wrappers
    ;[first, second, third].forEach((w) => {
      none(window.getComputedStyle(w).paddingTop)
      none(window.getComputedStyle(w).paddingBottom)
    })
    expect(second).toHaveStyle({ marginTop: `${SPACE.md}px` })
    expect(loadMore).toHaveStyle({ marginTop: `${SPACE.md}px`, marginBottom: '0px' })
  })

  it('the group titles are section titles (section_header h2), as the order groups', () => {
    const theme = themeWithValues((values) => {
      values.components.section_header.base.title_color = '#123456'
      return values
    })
    const { pending } = renderList(theme)
    expect(pending).toHaveStyle({ color: '#123456' })
  })
})
