import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../../__tests__/helpers/testUtils'
import { SatisfactionSurvey } from '../SatisfactionSurvey'
import { defaultTheme, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'

// jsdom has no PointerEvent, which Base UI builds to click a radio
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

const requests = vi.hoisted(() => ({ order: vi.fn(), driver: vi.fn() }))

vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (_key, fallback) => fallback]
}))
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [{ root: 'https://api.test/v400/en/demo', appId: 'web' }]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ token: null, user: null }]
}))
vi.mock('../surveyRequests', () => ({
  sendOrderSurvey: (...args) => requests.order(...args),
  sendDriverSurvey: (...args) => requests.driver(...args)
}))

const order = { id: 1, business_id: 5, driver: { id: 9, name: 'Luis' } }

const render = (overrides = {}) => renderWithProviders(<SatisfactionSurvey order={{ ...order, ...overrides }} hashKey='abc' image='/bag.png' />, { theme: defaultTheme })

// Base UI dispatches a PointerEvent to its hidden radio.
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

describe('SatisfactionSurvey', () => {
  beforeEach(() => {
    requests.order.mockReset().mockResolvedValue(true)
    requests.driver.mockReset().mockResolvedValue(true)
  })

  it('starts with the intro, the image and the rate action', () => {
    const { getByText, container } = render()
    expect(container.querySelector('img[src="/bag.png"]')).toBeTruthy()
    expect(getByText('Tell us how your delivery and order experience went.')).toBeInTheDocument()
    expect(getByText('Rate')).toBeInTheDocument()
  })

  it('shows the enjoy message when declined and thanks when the order was already reviewed', () => {
    const declined = render()
    fireEvent.click(declined.getByText('Not now'))
    expect(declined.getByText('Enjoy your order.')).toBeInTheDocument()
    declined.unmount()
    const reviewed = render({ review: { id: 1 } })
    expect(reviewed.getByText('Thank you for your feedback!')).toBeInTheDocument()
  })

  it('requires ratings plus a reason before sending, then sends both reviews with the guest hash', async () => {
    const { getByText, container, queryByText } = render()
    fireEvent.click(getByText('Rate'))
    const submit = container.querySelector('[data-doc-control="order-tracking-survey-submit"]')
    expect(submit.disabled).toBe(true)

    fireEvent.click(container.querySelector('[data-doc-control="order-tracking-survey-star-2"]'))
    expect(getByText('What was the problem?')).toBeInTheDocument()
    expect(getByText('Select at least one reason to continue.')).toBeInTheDocument()
    fireEvent.click(getByText('Bad taste'))
    expect(getByText('Answer both questions to send your feedback.')).toBeInTheDocument()

    fireEvent.click(container.querySelector('[data-doc-control="order-tracking-survey-thumb-up"]'))
    expect(getByText('What was the best part?')).toBeInTheDocument()
    fireEvent.click(getByText('Punctuality'))
    expect(queryByText('Answer both questions to send your feedback.')).toBeNull()
    expect(submit.disabled).toBe(false)

    fireEvent.click(submit)
    await waitFor(() => expect(getByText('Thank you for your feedback!')).toBeInTheDocument())
    expect(requests.order).toHaveBeenCalledWith(
      expect.objectContaining({ hashKey: 'abc' }),
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ stars: 2, chips: [expect.objectContaining({ key: 'bad_taste' })] })
    )
    expect(requests.driver).toHaveBeenCalledWith(
      expect.objectContaining({ hashKey: 'abc' }),
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ rating: 5, chips: [expect.objectContaining({ key: 'punctuality' })] })
    )
  })

  it('only asks about the product when there is no driver and shows the error when sending fails', async () => {
    requests.order.mockResolvedValue(false)
    const { getByText, container, queryByText } = render({ driver: null })
    fireEvent.click(getByText('Rate'))
    expect(queryByText('How was the delivery?')).toBeNull()
    fireEvent.click(container.querySelector('[data-doc-control="order-tracking-survey-star-5"]'))
    fireEvent.click(getByText('Good taste'))
    fireEvent.click(container.querySelector('[data-doc-control="order-tracking-survey-submit"]'))
    await waitFor(() => expect(getByText('We could not send your feedback. Please try again.')).toBeInTheDocument())
    expect(requests.driver).not.toHaveBeenCalled()
  })

  it('the order\'s stars are components.rating, a group of radios named by the question', () => {
    const { getByText, getByRole, container } = render()
    fireEvent.click(getByText('Rate'))
    expect(getByRole('radiogroup', { name: 'How was what you ordered?' })).toBeInTheDocument()
    const four = getByRole('radio', { name: '4 of 5 stars' })
    expect(four).toHaveAttribute('data-doc-control', 'order-tracking-survey-star-4')
    fireEvent.click(four)
    expect(four).toHaveAttribute('aria-checked', 'true')
    expect(container.querySelectorAll('[data-doc-control^="order-tracking-survey-star-"]')).toHaveLength(5)
  })
})

describe('SatisfactionSurvey: the delivery question (components.rating_scale mode)', () => {
  beforeEach(() => {
    requests.order.mockReset().mockResolvedValue(true)
    requests.driver.mockReset().mockResolvedValue(true)
  })

  const withMode = (mode) => themeWithValues((values) => {
    values.components.rating_scale.base.mode = mode
    return values
  })
  const renderThemed = (theme) => renderWithProviders(<SatisfactionSurvey order={order} hashKey='abc' />, { theme })

  it('thumbs: a group of two radios named by the question, options of components.choice', () => {
    const { getByText, getByRole } = renderThemed(withMode('thumbs'))
    fireEvent.click(getByText('Rate'))
    const group = getByRole('radiogroup', { name: 'How was the delivery?' })
    const good = getByRole('radio', { name: 'Good' })
    const bad = getByRole('radio', { name: 'Bad' })
    expect(group.contains(good) && group.contains(bad)).toBe(true)
    expect(good).toHaveAttribute('data-doc-control', 'order-tracking-survey-thumb-up')
    // the thumb is decorative: the radio's own label names the option
    expect(group.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2)
    fireEvent.click(bad)
    expect(bad).toBeChecked()
    expect(good).not.toBeChecked()
    expect(getByText('What was the problem?')).toBeInTheDocument()
    expect(group.querySelector('.active')).toBeNull()
  })

  it('scale: components.rating_scale, five points; 4 or more asks for the best part and sends that point', async () => {
    const { getByText, getByRole, queryByRole, container } = renderThemed(withMode('scale'))
    fireEvent.click(getByText('Rate'))
    expect(queryByRole('radio', { name: 'Good' })?.closest('[role="radiogroup"]')?.getAttribute('aria-label')).toBe('How was the delivery?')
    expect(container.querySelector('[data-doc-control="order-tracking-survey-thumb-up"]')).toBeNull()
    fireEvent.click(getByRole('radio', { name: 'Good' }))
    expect(getByText('What was the best part?')).toBeInTheDocument()
    fireEvent.click(getByText('Punctuality'))
    fireEvent.click(container.querySelector('[data-doc-control="order-tracking-survey-star-5"]'))
    fireEvent.click(getByText('Good taste'))
    fireEvent.click(container.querySelector('[data-doc-control="order-tracking-survey-submit"]'))
    await waitFor(() => expect(getByText('Thank you for your feedback!')).toBeInTheDocument())
    expect(requests.driver).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ rating: 4 }))
  })

  it('each comment is a textarea of components.input named by its placeholder; skip is a muted link', () => {
    const { getByText, getByRole, getAllByRole } = renderThemed(withMode('thumbs'))
    expect(getByRole('button', { name: 'Not now' })).toHaveAttribute('type', 'button')
    fireEvent.click(getByText('Rate'))
    fireEvent.click(getByRole('radio', { name: '2 of 5 stars' }))
    fireEvent.click(getByRole('radio', { name: 'Good' }))
    const comments = getAllByRole('textbox', { name: 'Optional comment' })
    expect(comments).toHaveLength(2)
    comments.forEach((box) => expect(box.tagName).toBe('TEXTAREA'))
    expect(getByRole('button', { name: 'Skip survey' })).toBeInTheDocument()
  })
})
