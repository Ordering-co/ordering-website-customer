import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../styles/__tests__/themeTestUtils'
import { GiftCardUI } from '../index'

// /wallets?wallet=gift_card as the theme lays it out (pages.wallets, group
// gift_card): the hero (with its line), the purchase and the redeem
vi.mock('~ui/src/components/GiftCard/PurchaseGiftCard', () => ({
  PurchaseGiftCard: () => <div data-testid='purchase' />
}))
vi.mock('~ui/src/components/GiftCard/RedeemGiftCard', () => ({
  RedeemGiftCard: () => <div data-testid='redeem-modal' />
}))

const SPACE = { none: 0, xxs: 3, xs: 5, sm: 9, md: 14, lg: 19, xl: 27 }
const withSections = (sections) => themeWithValues((values) => ({
  ...values,
  tokens: { ...values.tokens, space: SPACE },
  pages: {
    ...values.pages,
    wallets: { ...values.pages.wallets, sections: sections.map(([key, visible = true]) => ({ key, visible })) }
  }
}))

// The page's blocks after its title, in order: hero, line, purchase, redeem
const flow = (container) => {
  const title = container.querySelector('h1')
  return Array.from(title.parentElement.children).slice(1).map((el) => {
    if (el.querySelector('.card-label')) return 'hero'
    if (el.tagName === 'HR') return 'line'
    if (el.querySelector('[data-testid="purchase"]') || el.getAttribute('data-testid') === 'purchase') return 'purchase'
    if (el.querySelector('.gift-card-text')) return 'redeem'
    return el.children.length ? 'other' : 'line'
  })
}

describe('gift card wallet: sections of the theme', () => {
  it('with the schema defaults: hero, its line, purchase, redeem', () => {
    const { container } = renderWithProviders(<GiftCardUI />, { theme: themeWithValues() })
    expect(flow(container)).toEqual(['hero', 'line', 'purchase', 'redeem'])
  })

  it('the theme\'s order, the hero\'s line on its side facing another section; xl between sections', () => {
    const { container } = renderWithProviders(<GiftCardUI />, { theme: withSections([['gift_card_redeem'], ['gift_card_purchase'], ['gift_card_hero']]) })
    expect(flow(container)).toEqual(['redeem', 'purchase', 'line', 'hero'])
    const [redeem, purchase] = Array.from(container.querySelector('h1').parentElement.children).slice(1)
    expect(window.getComputedStyle(redeem).marginTop).toMatch(/^(0px)?$/)
    expect(purchase).toHaveStyle({ marginTop: `${SPACE.xl}px` })
  })

  it('the hero in the middle keeps its line after it', () => {
    const { container } = renderWithProviders(<GiftCardUI />, { theme: withSections([['gift_card_purchase'], ['gift_card_hero'], ['gift_card_redeem']]) })
    expect(flow(container)).toEqual(['purchase', 'hero', 'line', 'redeem'])
  })

  it('the hero and the redeem hidden; the purchase stays and the redeem modal can still mount', () => {
    const { container, queryByText } = renderWithProviders(<GiftCardUI />, { theme: withSections([['gift_card_hero', false], ['gift_card_purchase', false], ['gift_card_redeem', false]]) })
    expect(flow(container)).toEqual(['purchase'])
    expect(queryByText('Redeem')).toBeNull()
  })

  it('the redeem opens its modal (outside the redeem section)', () => {
    const { getByText, getByTestId, container } = renderWithProviders(<GiftCardUI />, { theme: themeWithValues() })
    fireEvent.click(getByText('Redeem'))
    const modal = getByTestId('redeem-modal')
    expect(container.querySelector('.gift-card-text').parentElement.contains(modal)).toBe(false)
  })
})
