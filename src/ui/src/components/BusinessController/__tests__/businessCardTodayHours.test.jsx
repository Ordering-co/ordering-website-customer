import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { useUtils } from '~components/contexts/UtilsContext'
import { parseTimeLikeApp, withUserTimezone } from '../../../../../__tests__/helpers/userTimezone'
import { BusinessController } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))

vi.mock('~components/components/BusinessController', () => ({
  BusinessController: ({ UIComponent, ...rest }) => (
    <UIComponent
      isBusinessOpen
      handleClick={vi.fn()}
      getBusinessOffer={vi.fn(() => null)}
      orderType={1}
      isSkeleton={false}
      {...rest}
    />
  )
}))

// A New York business open 09:00-22:00 (its wall clock) on the US DST days
const business = {
  id: 1,
  name: 'NY Store',
  slug: 'ny-store',
  enabled: true,
  open: true,
  timezone: 'America/New_York',
  today: {
    enabled: true,
    lapses: [{ open: { hour: 9, minute: 0 }, close: { hour: 22, minute: 0 } }]
  }
}

let utils
let previousParseTime

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  utils = useUtils()[0]
  previousParseTime = utils.parseTime
  utils.parseTime = parseTimeLikeApp
})

afterEach(() => {
  utils.parseTime = previousParseTime
  vi.useRealTimers()
})

const openAtText = () => {
  const { container, unmount } = renderWithProviders(
    <BusinessController business={business} businessState={{ business, loading: false }} fromFavoriteList />
  )
  const text = [...container.querySelectorAll('p')].map(p => p.textContent).find(value => value.includes('OPEN AT'))
  unmount()
  return text
}

describe("BusinessController: today's hours in the user's local time (B2)", () => {
  it.each([
    // "now" 01:00 EST, before the change to EDT: 09:00 EDT = 13:00Z
    ['2026-03-08T06:00:00Z', 'Asia/Kolkata', 'OPEN AT 18:30 - 07:30'],
    ['2026-03-08T06:00:00Z', 'America/Los_Angeles', 'OPEN AT 06:00 - 19:00'],
    ['2026-03-08T06:00:00Z', 'America/New_York', 'OPEN AT 09:00 - 22:00'],
    // "now" 01:00 EDT, before the change to EST: 09:00 EST = 14:00Z
    ['2026-11-01T05:00:00Z', 'Asia/Kolkata', 'OPEN AT 19:30 - 08:30'],
    ['2026-11-01T05:00:00Z', 'America/Los_Angeles', 'OPEN AT 06:00 - 19:00'],
    ['2026-11-01T05:00:00Z', 'America/New_York', 'OPEN AT 09:00 - 22:00']
  ])('at %s a user in %s reads "%s"', (now, zone, expected) => {
    vi.setSystemTime(new Date(now))
    withUserTimezone(zone, () => {
      expect(openAtText()).toBe(expected)
    })
  })
})
