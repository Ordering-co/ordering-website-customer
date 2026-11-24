import React, { useEffect, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { useHistory } from 'react-router-dom'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useSite } from '~components/contexts/SiteContext'
import { getDateTimeFormats } from '~components/utils/configHelpers'
import { Button } from '~ui/src/design-system/components/Button'
import { Dot } from '~ui/src/design-system/components/Dot'
import { StaticMap } from '~ui/src/components/StaticMap'
import { slotButtonOptions } from '~/utils/themeGroups'
import { isFullWebsite } from '~/utils/siteSettings'
import { singleStorePath } from '~/utils/singleStore'
import { goTo } from '../../chrome/navigate'
import { useFranchiseStores } from '../../useFranchiseStores'
import { LandingSection, LandingSkeleton } from '../shared/LandingSection'
import { ErrorBox, Muted } from '../shared/styles'
import { locationsMapSources } from './map'
import { statusLine } from './status'
import { Action, Address, Card, Cards, MapBox, Status, StoreName } from './styles'

// the clock of the statuses moves on without a reload
const STATUS_REFRESH_MS = 60 * 1000

const useNow = () => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), STATUS_REFRESH_MS)
    return () => clearInterval(id)
  }, [])
  return now
}

const StoreCard = ({ store, now, timeFormat, path, onNavigate, t }) => {
  const theme = useTheme()
  const status = statusLine(store, { now, timeFormat, t })
  const nameId = `landing-locations-store-${store.id}`
  const linkId = `${nameId}-order`
  // no schedule, nothing to say about it: the store is ordered from as it is
  const preorder = status ? !status.open : false
  return (
    <Card>
      <StoreName id={nameId}>{store.name}</StoreName>
      {store.address && <Address>{store.address}</Address>}
      {status && (
        <Status>
          <Dot color={status.open ? 'success' : 'muted'} />
          {status.text}
        </Status>
      )}
      <Action>
        {/* components.business_card.slots.cta; the store's name is part of the link's name: three "Order here" would not tell them apart */}
        <Button
          {...slotButtonOptions(theme, 'business_card', 'cta', { color: 'secondary' })}
          nativeButton={false}
          render={<a id={linkId} href={path} onClick={onNavigate} aria-labelledby={`${linkId} ${nameId}`} />}
        >
          {preorder ? t('PREORDER', 'Preorder') : t('LANDING_ORDER_HERE', 'Order here')}
        </Button>
      </Action>
    </Card>
  )
}

/**
 * "Our locations" of a franchise's marketing page: a card per store (name, address, whether it is open now
 * and until/from when, in its own time zone, and the way to order from it) and, under them, one map with all
 * the stores. The status comes from each store's schedule and zone (status.js); a store without schedule
 * shows only its address. Loading is its skeleton, a failed read of the stores is a message with a retry,
 * and a franchise with no stores draws nothing.
 */
export const LocationsSection = () => {
  const { data: stores, loading, error, retry } = useFranchiseStores()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const [{ site }] = useSite()
  const history = useHistory()
  const theme = useTheme()
  const now = useNow()
  const timeFormat = getDateTimeFormats(configs?.dates_general_format?.value).timeFormat
  const sources = useMemo(
    () => locationsMapSources(theme, stores, configs),
    [theme, stores, configs?.use_alternative_to_google_maps?.value, configs?.google_maps_api_key?.value, configs?.map_box_token?.value]
  )

  const title = t('LANDING_OUR_LOCATIONS', 'Our locations')
  if (!stores) {
    if (loading) return <LandingSkeleton name='locations' tone='alt' items={3} min='30ch' ratio='3 / 2' />
    if (!error) return null
    return (
      <LandingSection name='locations' title={title} tone='alt'>
        <ErrorBox role='alert'>
          <Muted>{t('BUSINESSES_COULD_NOT_LOAD', "We couldn't load the stores")}</Muted>
          <Button type='button' onClick={retry}>{t('RETRY', 'Retry')}</Button>
        </ErrorBox>
      </LandingSection>
    )
  }
  if (!stores.length) return null

  return (
    <LandingSection name='locations' title={title} description={t('LANDING_LOCATIONS_SUBTITLE', 'Pick the one closest to you.')} tone='alt'>
      <Cards>
        {stores.map((store) => {
          const path = singleStorePath(site, store.slug, { fullWebsite: isFullWebsite(theme) })
          return <StoreCard key={store.id} store={store} now={now} timeFormat={timeFormat} path={path} onNavigate={goTo(history, path)} t={t} />
        })}
      </Cards>
      <StaticMap
        sources={sources}
        alt={t('LANDING_LOCATIONS_MAP', 'Map of our locations')}
        loading='lazy'
        wrap={(map) => <MapBox>{map}</MapBox>}
      />
    </LandingSection>
  )
}
