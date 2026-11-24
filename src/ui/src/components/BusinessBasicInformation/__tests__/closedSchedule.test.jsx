import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { withUserTimezone } from '../../../../../__tests__/helpers/userTimezone'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { BusinessBasicInformation } from '../index'

vi.mock('~components/components/BusinessController', () => ({
  BusinessController: () => null
}))
vi.mock('~ui/src/components/MomentContent', () => ({
  MomentContent: () => null
}))
vi.mock('~ui/src/components/BusinessInformation', () => ({
  BusinessInformation: () => <div data-testid='business-information' />
}))
vi.mock('~ui/src/components/BusinessReviews', () => ({
  BusinessReviews: () => <div data-testid='business-reviews' />
}))
vi.mock('~ui/src/components/BusinessPreorder', () => ({
  BusinessPreorder: () => <div data-testid='business-preorder' />
}))
vi.mock('~ui/src/components/SearchProducts', () => ({
  SearchProducts: ({ open }) => open && <div data-testid='search-products' />
}))

describe('BusinessBasicInformation: the "Closed" header text', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the next opening next to "Closed" when the business has a schedule', () => {
    // every day 09:00-22:00, no timezone (falls back to the host's): a
    // closed store with a week-round schedule always has a next opening
    const business = {
      ...businessFixture,
      header: 'https://cdn.test/cover.png',
      open: false,
      schedule: Array.from({ length: 7 }, () => ({ enabled: true, lapses: [{ open: { hour: 9, minute: 0 }, close: { hour: 22, minute: 0 } }] }))
    }
    const { container } = renderWithProviders(
      <BusinessBasicInformation
        businessState={{ business, loading: false }}
        openBusinessInformation={false}
        setOpenBusinessInformation={vi.fn()}
      />
    )
    expect(container.querySelector('p.closed')).toHaveTextContent('Closed · Opens')
  })

  it.each([
    ['America/Toronto', 'America/Chicago', 'EST'],
    ['America/Toronto', 'America/Toronto', ''],
    ['America/Toronto', 'Canada/Eastern', ''],
    ['America/New_York', 'America/Toronto', ''],
    ['America/Mexico_City', 'America/Chicago', 'CST']
  ])('labels the %s opening for %s only if the civil zones differ', (timezone, visitorTimezone, abbreviation) => {
    withUserTimezone(visitorTimezone, () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-11-21T14:00:00Z'))
      const business = {
        ...businessFixture,
        open: false,
        timezone,
        schedule: Array.from({ length: 7 }, () => ({
          enabled: true,
          lapses: [{ open: { hour: 10, minute: 0 }, close: { hour: 22, minute: 0 } }]
        }))
      }
      const { container } = renderWithProviders(
        <BusinessBasicInformation businessState={{ business, loading: false }} />
      )
      expect(container.querySelector('p.closed').textContent).toBe(
        ['Closed · Opens 10:00', abbreviation].filter(Boolean).join(' ')
      )
    })
  })
})
