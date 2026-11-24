import React, { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { HelmetTags } from '../../components/HelmetTags'
import settings from '../../config'
import { franchiseSlug, singleStoreSlug } from '../../utils/siteSettings'
import { parseSearchQueryLocation } from '../../utils/searchQueryLocation'

import { useSite } from '~components/contexts/SiteContext'
import { useEvent } from '~components/contexts/EventContext'
import { BusinessesListing } from '~ui/src/components/BusinessesListing'
import { checkSiteUrl } from '~ui/utils'

export const BusinessesList = (props) => {
  const { search } = useLocation()
  const [events] = useEvent()
  const [{ site }] = useSite()
  const theme = useTheme()
  const customLocation = useMemo(() => parseSearchQueryLocation(search), [search])
  const businessUrlTemplate = checkSiteUrl(site?.business_url_template, '/store/:business_slug')

  const updatedBusinessSlug = singleStoreSlug(theme, settings)
  const updatedFranchiseSlug = franchiseSlug(theme, settings)

  const businessListingProps = {
    ...props,
    customLocation,
    isSearchByName: true,
    isSearchByDescription: true,
    franchiseId: updatedFranchiseSlug,
    businessId: updatedBusinessSlug,
    avoidRefreshUserInfo: true,
    businessUrlTemplate,
    onBusinessClick: (business) => {
      if (businessUrlTemplate === '/store/:business_slug' || businessUrlTemplate === '/:business_slug') {
        events.emit('go_to_page', { page: 'business', params: { business_slug: business.slug } })
      } else {
        events.emit('go_to_page', { page: 'business', search: `?${businessUrlTemplate.split('?')[1].replace(':business_slug', '')}${business.slug}` })
      }
    },
    currentPageParam: 0,
    propsToFetch: ['id', 'name', 'description', 'header', 'logo', 'types', 'location', 'address', 'ribbon', 'timezone', 'schedule', 'open', 'delivery_price', 'distance', 'delivery_time', 'pickup_time', 'reviews', 'featured', 'offers', 'food', 'laundry', 'alcohol', 'groceries', 'slug', 'city', 'city_id', 'configs', 'today', 'enabled', 'disabled_reason', 'available_drivers_count', 'activated_orders'],
    onRedirectPage: (data) => events.emit('go_to_page', data)
  }

  return (
    <>
      <HelmetTags page='search' />
      <BusinessesListing {...businessListingProps} />
    </>
  )
}

export default BusinessesList
