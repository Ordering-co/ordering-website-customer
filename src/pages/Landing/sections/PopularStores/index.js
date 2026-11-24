import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { BusinessList } from '~components/components/BusinessList'
import { useConfig } from '~components/contexts/ConfigContext'
import { useEvent } from '~components/contexts/EventContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useSite } from '~components/contexts/SiteContext'
import { BusinessController } from '~ui/src/components/BusinessController'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { Button } from '~ui/src/design-system/components/Button'
import { checkSiteUrl } from '~ui/utils'
import settings from '../../../../config'
import { searchPoint } from '../../../../utils/searchQueryLocation'
import { menuPath } from '../../../../utils/siteSettings'
import { MarketplaceSection } from '../MarketplaceSection'
import { Grid } from './styles'

export const POPULAR_STORES_MAX = 8

// what a card shows (time, rating, fee, distance, offer, ribbon, closed state)
// and links with (slug); no more than the page needs
export const POPULAR_STORES_PARAMS = [
  'id', 'name', 'slug', 'header', 'logo', 'location', 'schedule', 'timezone', 'open', 'today', 'enabled', 'disabled_reason',
  'delivery_time', 'pickup_time', 'delivery_price', 'distance', 'reviews', 'featured', 'types', 'ribbon', 'offers'
]

const PopularStoresUI = ({ businessesList, getBusinesses, handleBusinessClick, businessUrlTemplate }) => {
  const [, t] = useLanguage()
  const [orderState] = useOrder()
  const orderType = orderState?.options?.type
  const theme = useTheme()
  const loading = !!businessesList.loading
  const businesses = (businessesList.businesses ?? []).slice(0, POPULAR_STORES_MAX)

  // stores that could not be asked for (an error, and none from before): say so, with a way to ask again
  const failed = !loading && !!businessesList.error && businesses.length === 0
  // none to show: no section
  if (!loading && !failed && businesses.length === 0) return null

  return (
    <MarketplaceSection
      id='landing-popular_stores'
      title={t('LANDING_POPULAR_STORES_TITLE', 'Popular near you')}
      loading={loading}
      action={!loading && !failed && (
        <Button appearance='link' nativeButton={false} role='link' render={<Link to={menuPath(theme, settings)} />}>
          {t('LANDING_SEE_ALL', 'See all')}
        </Button>
      )}
    >
      {failed
        ? (
          <NotFoundSource icon='shop' compact headingLevel='h3' content={t('BUSINESSES_COULD_NOT_LOAD', "We couldn't load the stores")}>
            <Button appearance='outline' onClick={() => getBusinesses(true)}>{t('RETRY', 'Retry')}</Button>
          </NotFoundSource>
          )
        : (
          <Grid>
            {loading
              ? [...Array(POPULAR_STORES_MAX).keys()].map((i) => (
                <BusinessController key={i} m='0' business={{}} isSkeleton withLogoAndFavorite orderType={orderType} />
                ))
              : businesses.map((business) => (
                <BusinessController
                  key={business.id}
                  m='0'
                  business={business}
                  isBusinessOpen={business.open && business.enabled !== false}
                  handleCustomClick={handleBusinessClick}
                  orderType={orderType}
                  businessUrlTemplate={businessUrlTemplate}
                  withLogoAndFavorite
                  // under the section's h2
                  nameAs='h3'
                />
              ))}
          </Grid>
          )}
    </MarketplaceSection>
  )
}

// The stores the project features, near the order's address, else near the
// project's default location; with neither point there is nothing to ask for.
export const PopularStores = () => {
  const [orderState] = useOrder()
  const [{ configs }] = useConfig()
  const [{ site }] = useSite()
  const [events] = useEvent()
  const { lat, lng } = searchPoint(orderState?.options?.address?.location, configs) ?? {}
  const customLocation = useMemo(() => (lat !== undefined ? { lat, lng } : null), [lat, lng])
  if (!customLocation) return null

  const businessUrlTemplate = checkSiteUrl(site?.business_url_template, '/store/:business_slug')
  // as the listing opens a store (src/pages/BusinessesList)
  const onBusinessClick = (business) => {
    if (businessUrlTemplate === '/store/:business_slug' || businessUrlTemplate === '/:business_slug') {
      events.emit('go_to_page', { page: 'business', params: { business_slug: business.slug } })
    } else {
      events.emit('go_to_page', { page: 'business', search: `?${businessUrlTemplate.split('?')[1].replace(':business_slug', '')}${business.slug}` })
    }
  }

  return (
    <BusinessList
      UIComponent={PopularStoresUI}
      isFeatured
      customLocation={customLocation}
      paginationSettings={{ initialPage: 1, pageSize: POPULAR_STORES_MAX, controlType: 'infinity' }}
      propsToFetch={POPULAR_STORES_PARAMS}
      avoidRefreshUserInfo
      businessUrlTemplate={businessUrlTemplate}
      onBusinessClick={onBusinessClick}
    />
  )
}
