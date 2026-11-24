import React, { useState } from 'react'
import { useTheme } from 'styled-components'
import { themeHidden } from '~/utils/themeVisibility'
import { themeLayoutMode } from '~/utils/themeTokens'
import { favoritesLocation, hasFavoritesLocation } from '~/utils/searchQueryLocation'

import {
  FavoritesContainer,
  Title,
  TabsContainer,
  ContentWrapper
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { FavoriteList } from '~ui/src/components/FavoriteList'
import { TabsAction, TabsNavigation } from '~ui/src/design-system/components/Tabs'
import { usePageSections } from '~ui/hooks/usePageSections'

export const Favorite = (props) => {
  const [, t] = useLanguage()
  const [orderState] = useOrder()
  const [{ configs }] = useConfig()
  const theme = useTheme()
  const layout = themeLayoutMode(theme)

  const [tabSelected, setTabSelected] = useState('businesses')
  // the bar of tabs (pages.favorites section tabs); without it the page
  // shows the first tab's favorites
  const { isVisible } = usePageSections('favorites')
  const showTabs = isVisible('tabs')

  // a tab whose hearts the theme hides is left out, nothing could be added
  // to it (business.header.favorite, product.favorite, orders.favorite)
  const tabHidden = {
    businesses: themeHidden(theme, 'business_card.favorite') && themeHidden(theme, 'business.header.favorite'),
    products: themeHidden(theme, 'product.favorite'),
    orders: themeHidden(theme, 'orders.favorite')
  }
  const tabList = [
    { key: 'businesses', name: t('BUSINESSES', 'Businesses') },
    { key: 'products', name: t('PRODUCTS', 'Products') },
    { key: 'orders', name: t('ORDERS', 'Orders') }
  ].filter((item) => !tabHidden[item.key])
  const tabKeys = [...tabList.map((item) => item.key), ...(layout === 'appointments' ? ['professionals'] : [])]
  // the selected tab, else the first one the theme shows
  const currentTab = tabKeys.includes(tabSelected) ? tabSelected : tabKeys[0]
  // The point the businesses' distances are measured from. The list loads once, when it mounts: a new point
  // remounts it, so the distances of the previous one (0,0 without an address) are never shown for this one
  const businessesLocation = favoritesLocation(orderState.options?.address?.location, configs)

  return (
    <FavoritesContainer data-doc-section='favorites' data-doc-state={currentTab}>
      <Title>{t('MY_FAVORITES', 'My Favorites')}</Title>
      {showTabs && tabKeys.length > 0 && (
        <TabsContainer>
          <TabsNavigation tone='contrast' scroll>
            {tabList.map((item, i) => (
              <TabsAction
                data-doc-control='favorites-tab'
                data-doc-tab={item.key}
                key={i}
                active={item.key === currentTab}
                onClick={() => setTabSelected(item.key)}
              >
                {item?.name}
              </TabsAction>
            ))}
            {layout === 'appointments' && (
              <TabsAction
                data-doc-control='favorites-tab'
                data-doc-tab='professionals'
                active={currentTab === 'professionals'}
                onClick={() => setTabSelected('professionals')}
              >
                {t('PROFESSIONALS', 'Professionals')}
              </TabsAction>
            )}
          </TabsNavigation>
        </TabsContainer>
      )}
      <ContentWrapper>
        {currentTab === 'businesses' && (
          <FavoriteList
            key={businessesLocation}
            isBusiness
            favoriteURL='favorite_businesses'
            originalURL='business'
            location={businessesLocation}
            hideDistance={!hasFavoritesLocation(orderState.options?.address?.location, configs)}
            propsToFetch={['id', 'name', 'header', 'logo', 'location', 'address', 'ribbon', 'timezone', 'schedule', 'open', 'delivery_price', 'distance', 'delivery_time', 'pickup_time', 'reviews', 'featured', 'offers', 'food', 'laundry', 'alcohol', 'groceries', 'slug', 'description', 'today', 'enabled', 'disabled_reason', 'available_drivers_count', 'activated_orders']}
          />
        )}
        {currentTab === 'products' && (
          <FavoriteList
            favoriteURL='favorite_products'
            originalURL='products'
            isProduct
          />
        )}
        {currentTab === 'orders' && (
          <FavoriteList
            favoriteURL='favorite_orders'
            originalURL='orders'
            isOrder
          />
        )}
        {currentTab === 'professionals' && (
          <FavoriteList
            favoriteURL='favorite_users'
            originalURL='users'
            isProfessional
          />
        )}
      </ContentWrapper>
    </FavoritesContainer>
  )
}
