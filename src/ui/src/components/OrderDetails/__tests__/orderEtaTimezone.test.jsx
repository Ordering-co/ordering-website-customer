import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useUtils } from '~components/contexts/UtilsContext'
import { OrderEta, getOrderEtaUtc } from '../OrderEta'
import { OrderEtaRange } from '../layouts/Tracking/OrderEtaRange'
import { parseDateLikeApp, withUserTimezone } from '../../../../../__tests__/helpers/userTimezone'

// An order of a New York business: its delivery time, 14:00 in New York,
// comes as delivery_datetime_utc 18:00 (UTC); delivery_datetime is the
// business's wall clock and has no zone.
const order = {
  id: 1,
  status: 7,
  delivery_type: 1,
  delivery_datetime: '2026-10-20 14:00:00',
  delivery_datetime_utc: '2026-10-20 18:00:00',
  eta_time: 30,
  reporting_data: { at: {} }
}
const withoutUtc = { ...order, delivery_datetime_utc: undefined }

let utils
let previousParseDate

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-20T17:00:00Z'))
  utils = useUtils()[0]
  previousParseDate = utils.parseDate
  utils.parseDate = parseDateLikeApp
})

afterEach(() => {
  utils.parseDate = previousParseDate
  vi.useRealTimers()
})

describe('getOrderEtaUtc (B3)', () => {
  it('is delivery_datetime_utc plus the ETA minutes', () => {
    expect(getOrderEtaUtc(order).toISOString()).toBe('2026-10-20T18:30:00.000Z')
  })

  it('is null without delivery_datetime_utc (delivery_datetime is never read as UTC)', () => {
    expect(getOrderEtaUtc(withoutUtc)).toBeNull()
  })
})

describe('OrderEta in the user\'s local time (B3)', () => {
  it.each([
    ['Asia/Kolkata', '00:00'],
    ['America/Los_Angeles', '11:30'],
    ['America/New_York', '14:30'],
    ['UTC', '18:30'],
    ['Pacific/Auckland', '07:30']
  ])('a user in %s sees %s', (zone, expected) => {
    withUserTimezone(zone, () => {
      const { container, unmount } = render(<OrderEta order={order} outputFormat='HH:mm' />)
      expect(container.textContent).toBe(expected)
      unmount()
    })
  })

  it('without an output format it uses parseDate, also local', () => {
    withUserTimezone('Asia/Kolkata', () => {
      const { container, unmount } = render(<OrderEta order={order} />)
      expect(container.textContent).toBe('2026-10-21 00:00')
      unmount()
    })
  })

  it('a preorder (status 13) shows its delivery time, local', () => {
    withUserTimezone('America/Los_Angeles', () => {
      const { container, unmount } = render(<OrderEta order={{ ...order, status: 13 }} outputFormat='HH:mm' />)
      expect(container.textContent).toBe('11:00')
      unmount()
    })
  })

  it('shows nothing without delivery_datetime_utc', () => {
    withUserTimezone('Asia/Kolkata', () => {
      const { container, unmount } = render(<OrderEta order={withoutUtc} outputFormat='HH:mm' />)
      expect(container.textContent).toBe('')
      unmount()
    })
  })
})

describe('OrderEtaRange in the user\'s local time (B3)', () => {
  it.each([
    ['Asia/Kolkata', '00:00 – 00:10'],
    ['America/Los_Angeles', '11:30 – 11:40']
  ])('a user in %s sees %s', (zone, expected) => {
    withUserTimezone(zone, () => {
      const { container, unmount } = render(<OrderEtaRange order={order} outputFormat='HH:mm' />)
      expect(container.textContent).toBe(expected)
      unmount()
    })
  })

  it('shows nothing without delivery_datetime_utc', () => {
    const { container } = render(<OrderEtaRange order={withoutUtc} outputFormat='HH:mm' />)
    expect(container.textContent).toBe('')
  })
})
