import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../../__tests__/helpers/testUtils'
import { injectedCss, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { DeliveryOrderTabs } from '../DeliveryOrderTabs'
import { SatisfactionSurvey } from '../SatisfactionSurvey'

// components.order_tracking slots of the tabs and of the survey (its buttons,
// chips and rating size).

vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (_key, fallback) => fallback]
}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parsePrice: (value) => `$${value}` }]
}))
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [{ root: 'https://api.test', appId: 'web' }]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ token: null, user: null }]
}))
vi.mock('../surveyRequests', () => ({ sendOrderSurvey: vi.fn(), sendDriverSurvey: vi.fn() }))

const order = {
  id: 1,
  business_id: 5,
  delivery_type: 1,
  customer: { name: 'Ana', address: 'Calle 1' },
  driver: { id: 9, name: 'Luis' },
  summary: { subtotal: 20, total: 25 },
  taxes: [],
  fees: [],
  offers: [],
  products: []
}

const withSlots = (slots, base = {}) => themeWithValues((values) => {
  Object.assign(values.components.order_tracking.slots, slots)
  Object.assign(values.components.order_tracking.base, base)
  return values
})

const rulesOf = (el) => {
  const classes = el.className.split(' ')
  return injectedCss().split('}').filter((rule) => classes.some((cls) => rule.includes(`.${cls}`))).join('}')
}

// Base UI dispatches a PointerEvent to its hidden radio.
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

describe('order_tracking slots', () => {
  it('the tabs take the size and variant of slots.tabs', () => {
    const theme = withSlots({ tabs: { component: 'tabs', size: 'lg', variant: 'underline' } })
    const { getByRole } = renderWithProviders(
      <DeliveryOrderTabs order={order} productList={null} productsCount={0} />,
      { theme }
    )
    const bar = getByRole('tablist')
    expect(bar.parentElement.style.getPropertyValue('--ui-tabs-height')).toBe(`${theme.values.components.tabs.sizes.lg.height}px`)
    expect(bar.parentElement).toHaveAttribute('data-variant', 'underline')
    expect(bar.className).toContain('ui:[border-bottom:var(--ui-tabs-baseline,var(--ui-tabs-border))]')
  })

  it('the survey\'s start and submit buttons, chips and rating size', () => {
    const theme = withSlots({
      survey_start: { component: 'button', size: 'lg', appearance: 'outline', color: 'primary', shape: null },
      survey_submit: { component: 'button', size: 'sm', appearance: 'solid', color: 'secondary', shape: null },
      survey_chip: { component: 'chip', size: 'lg' }
    }, { survey_rating_size: 'sm' })
    const buttons = theme.values.components.button.sizes
    const { getByText, container, getByRole } = renderWithProviders(
      <SatisfactionSurvey order={order} hashKey='abc' />,
      { theme }
    )
    expect(getByRole('button', { name: 'Rate' }).style.getPropertyValue('--ui-button-height')).toBe(`${buttons.lg.height}px`)
    fireEvent.click(getByText('Rate'))
    const submit = container.querySelector('[data-doc-control="order-tracking-survey-submit"]')
    expect(submit.style.getPropertyValue('--ui-button-height')).toBe(`${buttons.sm.height}px`)
    // the reasons are chips of slots.survey_chip
    fireEvent.click(container.querySelector('[data-doc-control="order-tracking-survey-thumb-up"]'))
    expect(getByRole('button', { name: /Punctuality/ }).style.getPropertyValue('--ui-chip-height')).toBe(`${theme.values.components.chip.sizes.lg.height}px`)
    // the rating's stars at the sm icon size
    expect(within(getByRole('radiogroup', { name: 'How was what you ordered?' })).getAllByRole('radio')).toHaveLength(5)
    expect(injectedCss()).toContain(`${theme.values.components.rating.sizes.sm.icon_size}px`)
  })
})
