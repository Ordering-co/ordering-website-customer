import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { pastOrder } from '../../__tests__/helpers/ordersTestMocks'
import { cssFor, injectedCss, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { MultiOrdersDetails } from '../index'

const state = vi.hoisted(() => ({ status: 9 }))

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { multi_business_checkout_progress_bar_style: { value: 'group' } } }]
}))

// the statuses of the orders: their text and percentage
vi.mock('~ui/utils', async (importOriginal) => ({
  ...(await importOriginal()),
  generalUtilities: () => ({
    getOrderStatus: (status) => ({ 9: { value: 'On the way', percentage: 70 }, 1: { value: 'Completed', percentage: 100 } })[status],
    walletName: {}
  })
}))

vi.mock('~components/components/MultiOrdersDetails', () => ({
  MultiOrdersDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      ordersList={{ loading: false, error: null, orders: [{ ...pastOrder, status: state.status }] }}
      customer={{ name: 'Jane', lastname: 'Doe', image: 'avatar.png' }}
      ordersSummary={{ total: 15.5 }}
      paymentEvents={[]}
      handleOrderRedirect={vi.fn()}
      {...rest}
    />
  )
}))

vi.mock('~components/components/OrderDetails', () => ({
  OrderDetails: ({ UIComponent, order, ...rest }) => (
    <UIComponent order={{ loading: false, order }} messages={{ messages: [] }} readMessages={vi.fn()} setMessages={vi.fn()} {...rest} />
  )
}))

vi.mock('~ui/src/components/SingleOrderCard', () => ({
  SingleOrderCard: ({ order }) => <div>{order.business.name}</div>
}))

vi.mock('~ui/src/components/Messages', () => ({ Messages: () => null }))
vi.mock('~ui/src/components/OrderDetails/OrderEta', () => ({ OrderEta: () => <span>ETA</span> }))

const completeTheme = themeWithValues()
const progress = completeTheme.values.components.progress

// CSS rules of every class of the element (the bar and the screen's margin)
const rulesOf = (el) => {
  const classes = el.className.split(' ')
  return injectedCss().split('}').filter((rule) => classes.some((cls) => rule.includes(`.${cls}{`))).join('}')
}

afterEach(() => { state.status = 9 })

describe('MultiOrdersDetails status bar', () => {
  it('the summary bar is components.progress md, active', () => {
    const { getByRole } = renderWithProviders(<MultiOrdersDetails />, { theme: completeTheme })
    const bar = getByRole('progressbar', { name: 'On the way' })
    expect(bar).toHaveAttribute('aria-valuenow', '70')
    expect(rulesOf(bar)).toContain(`height:${progress.sizes.md.height}px`)
    expect(rulesOf(bar)).toContain('margin-bottom:12px')
    expect(cssFor(bar.firstChild)).toMatch(/animation:\S+ 1600ms/)
  })

  it('complete at 100%', () => {
    state.status = 1
    const { getByRole } = renderWithProviders(<MultiOrdersDetails />, { theme: completeTheme })
    expect(cssFor(getByRole('progressbar').firstChild)).toContain(`background:${progress.variants.default.states.complete.fill}`)
  })
})

describe('MultiOrdersDetails page', () => {
  it('the blocks are cards of the theme, their titles sections of the page (h2)', () => {
    const { getByRole } = renderWithProviders(<MultiOrdersDetails />, { theme: completeTheme })
    const card = completeTheme.values.components.card.base
    const summary = getByRole('heading', { level: 2, name: 'Order summary' }).parentElement
    expect(getByRole('heading', { level: 2, name: 'Customer details' })).toBeInTheDocument()
    expect(getByRole('heading', { level: 2, name: 'Payment method' })).toBeInTheDocument()
    expect(cssFor(summary)).toContain(`background:${card.background}`)
    expect(cssFor(summary)).toContain(`padding:${completeTheme.values.tokens.space.lg}px`)
  })
})
