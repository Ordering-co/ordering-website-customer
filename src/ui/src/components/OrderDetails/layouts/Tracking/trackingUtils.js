import moment from 'moment'
import { orderMapMarker } from '~/utils/mapMarkers'
import { themeImage } from '~/utils/themeTokens'
import { orderDeliveryUtc, scheduledOrderEtaUtc } from '~/utils/businessTime'

export const TRACKING_MAP_STATUSES = [3, 8, 9, 18, 19, 23, 26]
export const REJECTED_STATUSES = [2, 5, 6, 10, 12, 16, 17]
export const COMPLETED_STATUSES = [1, 2, 5, 6, 10, 11, 12, 15, 16, 17]
export const DELIVERED_STATUSES = [1, 11, 15]
export const TRACKING_STEPS = ['preparing', 'on_the_way', 'arrived', 'delivered']
const DELIVERY_TYPES = [1, 7]
const STATUS_TO_STEP = {
  0: 0,
  3: 0,
  4: 0,
  7: 0,
  8: 0,
  14: 0,
  18: 0,
  22: 0,
  24: 0,
  25: 0,
  9: 1,
  19: 1,
  23: 1,
  26: 2,
  1: 3,
  11: 3,
  15: 3
}

export const isRejectedStatus = (status) => REJECTED_STATUSES.includes(parseInt(status, 10))

export const isCompletedStatus = (status) => COMPLETED_STATUSES.includes(parseInt(status, 10))

export const isDeliveredStatus = (status) => DELIVERED_STATUSES.includes(parseInt(status, 10))

export const isDeliveryOrder = (deliveryType) => DELIVERY_TYPES.includes(parseInt(deliveryType, 10))

export const getTrackingStep = (status) => STATUS_TO_STEP[parseInt(status, 10)] ?? 0

export const getTrackingPercentage = (step) => (step / (TRACKING_STEPS.length - 1)) * 100

export const canShowLiveMap = (order, driverLocation) => {
  if (!order || !driverLocation) return false
  return TRACKING_MAP_STATUSES.includes(parseInt(order.status, 10))
}

export const getDriverPlate = (driver) => {
  if (!driver) return null
  const direct = driver.vehicle?.plate || driver.car?.plate || driver.plate
  if (direct) return direct
  const metafield = Array.isArray(driver.metafields)
    ? driver.metafields.find((field) => field?.key === 'plate')
    : null
  return metafield?.value || null
}

export const getDriverVehicle = (driver) => {
  if (!driver) return null
  return driver.vehicle?.name || driver.car?.name || driver.vehicle_type || null
}

// From delivery_datetime_utc only (UTC): delivery_datetime has no zone, so
// without the UTC field there is no range rather than one made up from it
export const getOrderEtaRange = (order, rangeMinutes = 10, configs) => {
  const base = orderDeliveryUtc(order)
  if (!base) return null
  const scheduledStart = scheduledOrderEtaUtc(order, order?.eta_time || 0, configs)
  const startUtc = scheduledStart
    ? moment.utc(scheduledStart.valueOf())
    : moment.utc(base).add(order?.eta_time || 0, 'minutes')
  const endUtc = startUtc.clone().add(rangeMinutes, 'minutes')
  return { startUtc, endUtc }
}

// The map.* images of the theme, as in every map (src/utils/mapMarkers)
export const getTrackingMarkerIcons = (theme, order) => ({
  driver: orderMapMarker(theme, 'driver'),
  business: orderMapMarker(theme, 'store', order?.business?.logo),
  customer: orderMapMarker(theme, 'customer')
})

export const getTrackingSurveyImage = (theme, order) => (
  themeImage(theme, 'tracking.survey') || order?.business?.logo || null
)

export const toLangKey = (value) => value
  ?.normalize('NFD')
  ?.replace(/[̀-ͯ]/g, '')
  ?.trim()
  ?.toUpperCase()
  ?.replace(/[^A-Z0-9]+/g, '_')
  ?.replace(/^_+|_+$/g, '')

export const formatRate = (value) => {
  const number = parseFloat(value) || 0
  return Number.isInteger(number) ? number : number.toFixed(2)
}
