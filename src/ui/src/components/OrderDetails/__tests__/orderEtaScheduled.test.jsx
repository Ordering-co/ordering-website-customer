import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useUtils } from '~components/contexts/UtilsContext'
import { OrderEta, getOrderEtaUtc } from '../OrderEta'
import { OrderEtaRange } from '../layouts/Tracking/OrderEtaRange'
import { parseDateLikeApp, withUserTimezone } from '../../../../../__tests__/helpers/userTimezone'

const configTuple = vi.hoisted(() => [{ configs: {} }])

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => configTuple
}))

const enabled = { preorder_eta_requested_time_enabled: { value: '1' } }
const disabled = { preorder_eta_requested_time_enabled: { value: '0' } }

const base = {
  id: 1,
  status: 7,
  delivery_type: 1,
  eta_time: 60,
  reporting_data: { at: {} }
}
const immediate = { ...base, delivery_datetime_utc: '2026-10-20 18:00:00', created_at: '2026-10-20 18:00:20' }
const farAhead = { ...base, delivery_datetime_utc: '2026-10-20 18:00:00', created_at: '2026-10-20 10:00:00' }
const sooner = { ...base, delivery_datetime_utc: '2026-10-20 18:00:00', created_at: '2026-10-20 17:30:00' }
const preorderWithoutCreatedAt = { ...base, status: 13, delivery_datetime_utc: '2026-10-20 18:00:00' }
const statusChain = {
  ...sooner,
  eta_time: undefined,
  eta_drive_time: 10,
  eta_current_status_time: 20,
  eta_previous_status_times: { status_0: 5 },
  eta_next_status_times: { status_9: 15, status_penalty_9: 99 },
  reporting_data: { at: { 'status:7': '2026-10-20 17:35:00' } }
}

let utils
let previousParseDate

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-20T17:35:00Z'))
  utils = useUtils()[0]
  previousParseDate = utils.parseDate
  utils.parseDate = parseDateLikeApp
  configTuple[0].configs = {}
})

afterEach(() => {
  utils.parseDate = previousParseDate
  configTuple[0].configs = {}
  vi.useRealTimers()
})

const etaOf = (order, configs) => getOrderEtaUtc(order, undefined, configs).toISOString()

const renderedText = (element) => withUserTimezone('UTC', () => {
  const { container, unmount } = render(element)
  const text = container.textContent
  unmount()
  return text
})

describe('getOrderEtaUtc of a scheduled order', () => {
  it('is delivery plus the ETA minutes with the config disabled or missing', () => {
    expect(etaOf(farAhead, disabled)).toBe('2026-10-20T19:00:00.000Z')
    expect(etaOf(farAhead, {})).toBe('2026-10-20T19:00:00.000Z')
    expect(etaOf(farAhead)).toBe('2026-10-20T19:00:00.000Z')
    expect(etaOf(sooner, disabled)).toBe('2026-10-20T19:00:00.000Z')
  })

  it('is unchanged for an immediate order with the config enabled', () => {
    expect(etaOf(immediate, enabled)).toBe('2026-10-20T19:00:00.000Z')
  })

  it('is the requested time for an order scheduled far ahead', () => {
    expect(etaOf(farAhead, enabled)).toBe('2026-10-20T18:00:00.000Z')
  })

  it('is created_at plus the ETA minutes when the requested time is sooner', () => {
    expect(etaOf(sooner, enabled)).toBe('2026-10-20T18:30:00.000Z')
  })

  it('uses the same minutes as today, the per-status chain included', () => {
    expect(etaOf(statusChain, disabled)).toBe('2026-10-20T18:50:00.000Z')
    expect(etaOf(statusChain, enabled)).toBe('2026-10-20T18:20:00.000Z')
  })

  it('a preorder (status 13): the same rule with created_at, the requested time without it', () => {
    expect(etaOf({ ...sooner, status: 13 }, enabled)).toBe('2026-10-20T18:30:00.000Z')
    expect(etaOf(preorderWithoutCreatedAt, enabled)).toBe('2026-10-20T18:00:00.000Z')
    expect(etaOf(preorderWithoutCreatedAt, disabled)).toBe('2026-10-20T19:00:00.000Z')
  })
})

describe('OrderEta of a scheduled order', () => {
  it('shows delivery plus the ETA with the config disabled or missing', () => {
    configTuple[0].configs = disabled
    expect(renderedText(<OrderEta order={farAhead} outputFormat='HH:mm' />)).toBe('19:00')
    configTuple[0].configs = {}
    expect(renderedText(<OrderEta order={farAhead} outputFormat='HH:mm' />)).toBe('19:00')
    configTuple[0].configs = undefined
    expect(renderedText(<OrderEta order={farAhead} outputFormat='HH:mm' />)).toBe('19:00')
  })

  it('with the config enabled: immediate unchanged, far ahead the requested time, sooner created_at plus the ETA', () => {
    configTuple[0].configs = enabled
    expect(renderedText(<OrderEta order={immediate} outputFormat='HH:mm' />)).toBe('19:00')
    expect(renderedText(<OrderEta order={farAhead} outputFormat='HH:mm' />)).toBe('18:00')
    expect(renderedText(<OrderEta order={sooner} outputFormat='HH:mm' />)).toBe('18:30')
  })

  it('a preorder (status 13) still shows its requested time, with or without created_at', () => {
    configTuple[0].configs = enabled
    expect(renderedText(<OrderEta order={{ ...sooner, status: 13 }} outputFormat='HH:mm' />)).toBe('18:00')
    expect(renderedText(<OrderEta order={preorderWithoutCreatedAt} outputFormat='HH:mm' />)).toBe('18:00')
    configTuple[0].configs = disabled
    expect(renderedText(<OrderEta order={{ ...sooner, status: 13 }} outputFormat='HH:mm' />)).toBe('18:00')
  })
})

describe('OrderEtaRange of a scheduled order', () => {
  it('adds the offered time with the config disabled or missing', () => {
    configTuple[0].configs = disabled
    expect(renderedText(<OrderEtaRange order={farAhead} outputFormat='HH:mm' />)).toBe('19:00 – 19:10')
    configTuple[0].configs = undefined
    expect(renderedText(<OrderEtaRange order={farAhead} outputFormat='HH:mm' />)).toBe('19:00 – 19:10')
  })

  it('with the config enabled: immediate unchanged, far ahead the requested time, sooner created_at plus the offered time', () => {
    configTuple[0].configs = enabled
    expect(renderedText(<OrderEtaRange order={immediate} outputFormat='HH:mm' />)).toBe('19:00 – 19:10')
    expect(renderedText(<OrderEtaRange order={farAhead} outputFormat='HH:mm' />)).toBe('18:00 – 18:10')
    expect(renderedText(<OrderEtaRange order={sooner} outputFormat='HH:mm' />)).toBe('18:30 – 18:40')
  })

  it('a preorder (status 13): the same rule with created_at, the requested time without it', () => {
    configTuple[0].configs = enabled
    expect(renderedText(<OrderEtaRange order={{ ...sooner, status: 13 }} outputFormat='HH:mm' />)).toBe('18:30 – 18:40')
    expect(renderedText(<OrderEtaRange order={preorderWithoutCreatedAt} outputFormat='HH:mm' />)).toBe('18:00 – 18:10')
    configTuple[0].configs = disabled
    expect(renderedText(<OrderEtaRange order={preorderWithoutCreatedAt} outputFormat='HH:mm' />)).toBe('19:00 – 19:10')
  })
})
