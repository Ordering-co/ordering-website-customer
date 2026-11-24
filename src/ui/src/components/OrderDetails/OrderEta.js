import React, { useEffect, useState } from 'react'
import moment from 'moment'

import { useUtils } from '~components/contexts/UtilsContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { orderDeliveryUtc, scheduledOrderEtaUtc } from '~/utils/businessTime'

const deliveryTypes = [1, 7]

const sumStatusTimes = (times) => Object.keys(times || {})
  .filter(key => !key.includes('status_penalty'))
  .reduce((total, key) => total + (times[key] || 0), 0)

/**
 * The order's estimated delivery instant (a UTC moment): its
 * delivery_datetime_utc plus the ETA minutes of the API (eta_* fields,
 * prepared_in, delivered_in). Null without delivery_datetime_utc.
 */
export const getOrderEtaUtc = (order, now = moment(), configs) => {
  const _delivery = orderDeliveryUtc(order)
  if (!_delivery) return null
  let totalEta = 0
  if (order?.delivered_in) totalEta += order?.delivered_in
  if (order?.prepared_in) totalEta += order?.prepared_in
  if (deliveryTypes.includes(order?.delivery_type) && order?.eta_drive_time) {
    totalEta += order?.eta_drive_time
  }
  if (order?.eta_current_status_time) {
    totalEta += order?.eta_current_status_time
    totalEta += sumStatusTimes(order?.eta_previous_status_times)
    totalEta += sumStatusTimes(order?.eta_next_status_times)
    const diffTimeAsSeconds = moment.utc(order?.reporting_data?.at?.[`status:${order.status}`]).add(order?.eta_current_status_time, 'minutes').diff(moment(now).utc(), 'seconds')
    const diffTimeAsMinutes = Math.ceil(diffTimeAsSeconds / 60)
    if (diffTimeAsMinutes <= 0) {
      totalEta += (Math.floor(Math.abs(diffTimeAsMinutes / order?.eta_current_status_time) + 1) * order?.eta_current_status_penalty_time)
    }
  } else {
    totalEta = (order?.eta_time || 0) + totalEta
  }
  const scheduledEta = scheduledOrderEtaUtc(order, totalEta, configs)
  if (scheduledEta) return moment.utc(scheduledEta.valueOf())
  return moment.utc(_delivery).add(totalEta, 'minutes')
}

export const OrderEta = (props) => {
  const {
    order,
    outputFormat
  } = props

  const [{ parseDate }] = useUtils()
  const [{ configs }] = useConfig()
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState(null)

  const getEstimatedDeliveryTime = () => {
    const _delivery = orderDeliveryUtc(order)
    // no delivery time without delivery_datetime_utc: delivery_datetime has
    // no zone, so the ETA is not shown rather than made up from it
    if (!_delivery) return setEstimatedDeliveryTime(null)
    if (order?.status === 13) {
      return setEstimatedDeliveryTime(parseDate(_delivery, { outputFormat }))
    }
    const estimatedUtcTime = getOrderEtaUtc(order, moment(), configs)
    setEstimatedDeliveryTime(outputFormat
      ? moment(estimatedUtcTime).local().format(outputFormat)
      : parseDate(estimatedUtcTime, { utc: false }))
  }

  useEffect(() => {
    getEstimatedDeliveryTime()
    const interval = setInterval(() => {
      getEstimatedDeliveryTime()
    }, 1000)
    return () => clearInterval(interval)
  }, [order, outputFormat, configs])

  return (
    <>
      {estimatedDeliveryTime}
    </>
  )
}
