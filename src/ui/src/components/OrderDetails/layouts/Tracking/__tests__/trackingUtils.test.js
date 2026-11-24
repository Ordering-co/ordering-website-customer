import { describe, expect, it } from 'vitest'
import {
  getTrackingStep,
  getTrackingPercentage,
  canShowLiveMap,
  getDriverPlate,
  getDriverVehicle,
  getOrderEtaRange,
  getTrackingMarkerIcons,
  getTrackingSurveyImage,
  isRejectedStatus,
  isCompletedStatus,
  isDeliveredStatus,
  toLangKey,
  formatRate
} from '../trackingUtils'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'

describe('getTrackingStep', () => {
  it('collapses the order statuses into the four tracking steps', () => {
    [0, 3, 4, 7, 8, 14, 18, 22, 24, 25].forEach((status) => expect(getTrackingStep(status)).toBe(0))
    ;[9, 19, 23].forEach((status) => expect(getTrackingStep(status)).toBe(1))
    expect(getTrackingStep(26)).toBe(2)
    ;[1, 11, 15].forEach((status) => expect(getTrackingStep(status)).toBe(3))
    expect(getTrackingStep('23')).toBe(1)
    expect(getTrackingStep(99)).toBe(0)
  })

  it('fills the bar by thirds', () => {
    expect(getTrackingPercentage(0)).toBe(0)
    expect(getTrackingPercentage(1)).toBeCloseTo(33.33, 1)
    expect(getTrackingPercentage(3)).toBe(100)
  })
})

describe('status helpers', () => {
  it('detects rejected, completed and delivered statuses', () => {
    expect(isRejectedStatus(2)).toBe(true)
    expect(isRejectedStatus('16')).toBe(true)
    expect(isRejectedStatus(23)).toBe(false)
    expect(isCompletedStatus(11)).toBe(true)
    expect(isCompletedStatus(17)).toBe(true)
    expect(isCompletedStatus(23)).toBe(false)
    expect(isDeliveredStatus(11)).toBe(true)
    expect(isDeliveredStatus(2)).toBe(false)
  })
})

describe('canShowLiveMap', () => {
  it('requires a driver location and a tracking status', () => {
    expect(canShowLiveMap({ status: 23 }, { lat: 1, lng: 2 })).toBe(true)
    expect(canShowLiveMap({ status: 0 }, { lat: 1, lng: 2 })).toBe(false)
    expect(canShowLiveMap({ status: 23 }, null)).toBe(false)
  })
})

describe('driver helpers', () => {
  it('reads the plate from the vehicle, the car, the driver or its metafields', () => {
    expect(getDriverPlate({ vehicle: { plate: 'VEH-1' }, plate: 'ABC-123' })).toBe('VEH-1')
    expect(getDriverPlate({ car: { plate: 'CAR-1' } })).toBe('CAR-1')
    expect(getDriverPlate({ plate: 'ABC-123' })).toBe('ABC-123')
    expect(getDriverPlate({ metafields: [{ key: 'plate', value: 'XYZ-9' }] })).toBe('XYZ-9')
    expect(getDriverPlate({ metafields: [] })).toBeNull()
    expect(getDriverPlate(null)).toBeNull()
  })

  it('reads the vehicle name', () => {
    expect(getDriverVehicle({ vehicle: { name: 'Moto' } })).toBe('Moto')
    expect(getDriverVehicle({ vehicle_type: 'bike' })).toBe('bike')
    expect(getDriverVehicle({})).toBeNull()
  })
})

describe('getOrderEtaRange', () => {
  it('adds the offered time to the order time and opens a ten minute window', () => {
    const range = getOrderEtaRange({ delivery_datetime_utc: '2026-09-09 15:00:00', eta_time: 25 })
    expect(range.startUtc.format('HH:mm')).toBe('15:25')
    expect(range.endUtc.format('HH:mm')).toBe('15:35')
  })

  it('accepts a custom range and returns null without a base date', () => {
    const range = getOrderEtaRange({ delivery_datetime_utc: '2026-09-09 15:00:00' }, 20)
    expect(range.endUtc.format('HH:mm')).toBe('15:20')
    expect(getOrderEtaRange({})).toBeNull()
  })

  it('has no range from delivery_datetime alone (it is not UTC)', () => {
    expect(getOrderEtaRange({ delivery_datetime: '2026-09-09 15:00:00', eta_time: 25 })).toBeNull()
  })
})

describe('getOrderEtaRange of a scheduled order', () => {
  const enabled = { preorder_eta_requested_time_enabled: { value: '1' } }
  const disabled = { preorder_eta_requested_time_enabled: { value: '0' } }
  const immediate = { status: 0, delivery_datetime_utc: '2026-09-09 15:00:00', created_at: '2026-09-09 15:00:30', eta_time: 25 }
  const farAhead = { status: 0, delivery_datetime_utc: '2026-09-09 15:00:00', created_at: '2026-09-09 09:00:00', eta_time: 25 }
  const sooner = { status: 0, delivery_datetime_utc: '2026-09-09 15:00:00', created_at: '2026-09-09 14:50:00', eta_time: 25 }
  const hours = (range) => [range.startUtc.format('HH:mm'), range.endUtc.format('HH:mm')]

  it('adds the offered time as today with the config disabled or missing', () => {
    expect(hours(getOrderEtaRange(farAhead, 10, disabled))).toEqual(['15:25', '15:35'])
    expect(hours(getOrderEtaRange(farAhead, 10))).toEqual(['15:25', '15:35'])
    expect(hours(getOrderEtaRange(farAhead, 10, {}))).toEqual(['15:25', '15:35'])
  })

  it('adds the offered time as today for an immediate order with the config enabled', () => {
    expect(hours(getOrderEtaRange(immediate, 10, enabled))).toEqual(['15:25', '15:35'])
  })

  it('starts at the requested time for an order scheduled far ahead', () => {
    expect(hours(getOrderEtaRange(farAhead, 10, enabled))).toEqual(['15:00', '15:10'])
  })

  it('starts at created_at plus the offered time when the requested time is sooner', () => {
    expect(hours(getOrderEtaRange(sooner, 10, enabled))).toEqual(['15:15', '15:25'])
  })

  it('a preorder (status 13): the same rule with created_at, the requested time without it', () => {
    expect(hours(getOrderEtaRange({ ...sooner, status: 13 }, 10, enabled))).toEqual(['15:15', '15:25'])
    expect(hours(getOrderEtaRange({ ...farAhead, status: 13 }, 10, enabled))).toEqual(['15:00', '15:10'])
    expect(hours(getOrderEtaRange({ status: 13, delivery_datetime_utc: '2026-09-09 15:00:00', eta_time: 25 }, 10, enabled))).toEqual(['15:00', '15:10'])
    expect(hours(getOrderEtaRange({ status: 13, delivery_datetime_utc: '2026-09-09 15:00:00', eta_time: 25 }, 10, disabled))).toEqual(['15:25', '15:35'])
  })
})

describe('theme images (map.*, tracking.survey)', () => {
  const completeTheme = (images = {}) => themeWithValues((values) => ({ ...values, images: { ...values.images, ...images } }))

  it('uses the bundled map.* defaults; the store takes the logo first', () => {
    expect(getTrackingMarkerIcons(completeTheme(), { business: { logo: '/burger-logo.png' } }))
      .toEqual({ driver: BUNDLED_IMAGES.map.driver, business: '/burger-logo.png', customer: BUNDLED_IMAGES.map.customer })
    expect(getTrackingMarkerIcons(completeTheme(), { business: {} }).business).toBe(BUNDLED_IMAGES.map.store)
  })

  it('the map.* images of the theme win', () => {
    const theme = completeTheme({ 'map.driver': 'https://cdn.test/moto.png', 'map.store': 'https://cdn.test/brand-store.png', 'map.customer': 'https://cdn.test/home.png' })
    expect(getTrackingMarkerIcons(theme, { business: { logo: '/burger-logo.png' } }))
      .toEqual({ driver: 'https://cdn.test/moto.png', business: 'https://cdn.test/brand-store.png', customer: 'https://cdn.test/home.png' })
  })

  it('the survey shows tracking.survey of the theme, else the business logo', () => {
    expect(getTrackingSurveyImage(completeTheme(), { business: { logo: '/burger-logo.png' } })).toBe('/burger-logo.png')
    expect(getTrackingSurveyImage(completeTheme(), {})).toBeNull()
    expect(getTrackingSurveyImage(completeTheme({ 'tracking.survey': 'https://cdn.test/bag.png' }), { business: { logo: '/burger-logo.png' } })).toBe('https://cdn.test/bag.png')
  })
})

describe('text helpers', () => {
  it('turns arbitrary names into language keys and formats rates', () => {
    expect(toLangKey('Pago Póst-venta')).toBe('PAGO_POST_VENTA')
    expect(toLangKey(undefined)).toBeUndefined()
    expect(formatRate(18)).toBe(18)
    expect(formatRate('7.5')).toBe('7.50')
    expect(formatRate(null)).toBe(0)
  })
})
