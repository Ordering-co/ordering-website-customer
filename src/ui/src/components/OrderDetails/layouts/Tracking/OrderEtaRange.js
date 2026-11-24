import React from 'react'
import moment from 'moment'

import { useUtils } from '~components/contexts/UtilsContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { getOrderEtaRange } from './trackingUtils'

export const OrderEtaRange = (props) => {
  const { order, outputFormat, rangeMinutes = 10 } = props

  const [{ parseDate }] = useUtils()
  const [{ configs }] = useConfig()
  const range = getOrderEtaRange(order, rangeMinutes, configs)

  if (!range) return null

  const format = (utcMoment) => outputFormat
    ? moment(utcMoment).local().format(outputFormat)
    : parseDate(utcMoment, { utc: false })

  return (
    <>
      {format(range.startUtc)} – {format(range.endUtc)}
    </>
  )
}
