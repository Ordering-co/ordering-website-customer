import React, { useMemo } from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { getDateTimeFormats } from '~components/utils/configHelpers'
import { Button } from '~ui/src/design-system/components/Button'
import { StaticMap } from '~ui/src/components/StaticMap'
import { getGoogleMapImage } from '~ui/utils'
import { formatScheduleTime, scheduleTimezoneFormatter, userWeeklySchedule } from '~/utils/businessTime'
import { mapboxStaticUrl } from '~/utils/mapboxStaticMap'
import { useStoreLanding } from '../../useStoreLanding'
import { LandingSection, LandingSkeleton } from '../shared/LandingSection'
import { OrderLink } from '../shared/OrderLink'
import { hoursRows } from './hours'
import { Actions, Contact, Hours, MapBox, VisitDetails, VisitLayout } from './styles'

const MAP_SIZE = { size: { w: 640, h: 480 } }

const directionsUrl = (business) => {
  const { lat, lng } = business.location || {}
  const hasPoint = lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
  const destination = hasPoint ? `${lat},${lng}` : encodeURIComponent(business.address)
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`
}

/**
 * Where and when: the address, the phone, the hours (days with the same hours together), a map
 * and the ways to get there or order. The map is a still image (Google, else Mapbox); without
 * a key for either, the rest stays. No address: no section.
 */
export const VisitSection = ({ store }) => {
  const { business } = useStoreLanding(store, ['business'])
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const data = business.data

  const schedule = JSON.stringify(data?.schedule)
  const rows = useMemo(() => {
    if (!data?.schedule) return []
    const { timeFormat } = getDateTimeFormats(configs?.dates_general_format?.value)
    const zone = scheduleTimezoneFormatter(data.timezone)
    const clock = (instant) => formatScheduleTime(instant, timeFormat, zone)
    const full = [7, 1, 2, 3, 4, 5, 6].map((day) => t(`DAY${day}`, ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day % 7]))
    const short = [7, 1, 2, 3, 4, 5, 6].map((day) => t(`DAYSHORT${day}`, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day % 7]))
    return hoursRows(
      userWeeklySchedule(data.schedule, data.timezone),
      (lapse) => `${clock(lapse.open)} - ${clock(lapse.close)}`,
      { full, short },
      t('CLOSED', 'Closed')
    )
  }, [schedule, data?.timezone, configs?.dates_general_format?.value])

  if (business.loading) return <LandingSkeleton name='visit' tone='alt' items={2} min='30ch' ratio='4 / 3' />
  if (!String(data?.address || '').trim()) return null

  const phone = data.phone || data.cellphone
  const googleKey = configs?.use_alternative_to_google_maps?.value === '1' ? null : configs?.google_maps_api_key?.value
  const sources = data.location
    ? [
        googleKey ? getGoogleMapImage(data.location, googleKey, MAP_SIZE) : null,
        mapboxStaticUrl(getGoogleMapImage(data.location, '', MAP_SIZE), configs?.map_box_token?.value)
      ]
    : []

  return (
    <LandingSection name='visit' title={t('LANDING_VISIT_TITLE', 'Visit us')} tone='alt'>
      <VisitLayout>
        <VisitDetails>
          <address>{data.address}</address>
          {phone && <Contact href={`tel:${String(phone).replace(/[^\d+]/g, '')}`}>{phone}</Contact>}
          {rows.length > 0 && (
            <Hours aria-label={t('SCHEDULE', 'Schedule')}>
              {rows.map((row) => (
                <React.Fragment key={row.days}>
                  <dt>{row.days}</dt>
                  <dd>{row.hours}</dd>
                </React.Fragment>
              ))}
            </Hours>
          )}
          <Actions>
            <OrderLink>{t('ORDER_NOW', 'Order now')}</OrderLink>
            <Button appearance='outline' nativeButton={false} render={<a href={directionsUrl(data)} target='_blank' rel='noopener noreferrer' />}>
              {t('GET_DIRECTIONS', 'Get Directions')}
            </Button>
          </Actions>
        </VisitDetails>
        <StaticMap
          sources={sources}
          alt={t('LOCATION_MAP', 'Location map')}
          loading='lazy'
          wrap={(map) => <MapBox>{map}</MapBox>}
        />
      </VisitLayout>
    </LandingSection>
  )
}
