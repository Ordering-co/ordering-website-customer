import React, { useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import { useTheme } from 'styled-components'
import { themeImage, themeLayoutMode } from '~/utils/themeTokens'
import { themeHidden } from '~/utils/themeVisibility'
import { usePageSections } from '~ui/hooks/usePageSections'

import {
  Container,
  MyOrdersMenuContainer,
  Divider,
  Title,
  AppointmentsTitle
} from './styles'

import { useConfig } from '~components/contexts/ConfigContext'
import { isWalletEnabled as isWalletConfigEnabled } from '~components/utils/configHelpers'
import { useLanguage } from '~components/contexts/LanguageContext'

import { TabsAction, TabsNavigation, TabsScrollArea, slotTabsOptions } from '~ui/src/design-system/components/Tabs'
import { Button } from '~ui/src/design-system/components/Button'
import { OrdersOption } from '~ui/src/components/OrdersOption'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { GiftCardOrdersList } from '../GiftCard/GiftCardOrdersList'
import { AccountInviteOnEnter } from '../AccountInvite'

export const MyOrders = (props) => {
  const {
    hideOrders,
    isFromBusinessListingSearch,
    businessesSearchList,
    onProductRedirect,
    onRedirectPage
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  const [{ configs }] = useConfig()
  const layout = themeLayoutMode(theme)
  // the orders page (pages.orders of the theme): its tabs and its groups of
  // orders, ordered and hidden by the theme. Embedded in the search
  // (hideOrders) the page's sections do not apply.
  const { sections, isVisible, render } = usePageSections('orders')
  const pageSectionsOn = !hideOrders
  const showSection = (key) => !pageSectionsOn || isVisible(key)
  const showTabs = showSection('tabs')
  const showUpcoming = showSection('upcoming_orders')
  const showActive = showSection('active_orders')
  const showPast = showSection('past_orders')
  // the bar of tabs of the orders_page.slots.tabs size and style
  const tabsProps = slotTabsOptions(theme, 'orders_page', 'tabs')

  const [isEmptyActive, setIsEmptyActive] = useState({ loading: true, value: false })
  const [isEmptyPast, setIsEmptyPast] = useState({ loading: true, value: false })
  const [isEmptyPreorder, setIsEmptyPreorder] = useState({ loading: true, value: false })
  // embedded in the search (hideOrders) it opens on the first tab the theme
  // shows
  const [selectedOption, setSelectedOption] = useState(!hideOrders ? 'orders' : (themeHidden(theme, 'orders.business_tab') ? 'products' : 'business'))
  const [isEmptyBusinesses, setIsEmptyBusinesses] = useState(false)
  const [businessOrderIds, setBusinessOrderIds] = useState([])

  // a group the theme hides never loads: it counts as loaded and empty;
  // embedded in the search (hideOrders) the groups are not mounted at all
  const loading = !hideOrders && ((showActive && isEmptyActive.loading) || (showPast && isEmptyPast.loading) || (showUpcoming && isEmptyPreorder.loading))
  const emptyActive = !showActive || isEmptyActive.value
  const emptyPast = !showPast || isEmptyPast.value
  const emptyPreorder = !showUpcoming || isEmptyPreorder.value
  // the Business / Products tabs and what each one shows
  // (orders.business_tab / orders.products_tab)
  const hideProductsTab = themeHidden(theme, 'orders.products_tab')
  const hideBusinessTab = themeHidden(theme, 'orders.business_tab')
  const tabHidden = { business: hideBusinessTab, products: hideProductsTab }
  const isWalletEnabled = configs?.cash_wallet?.value && isWalletConfigEnabled(configs)
  const isGiftCardDisabled = configs?.platform_store_giftcard_enabled?.value === '0' || configs?.platform_store_giftcard_enabled?.value === false

  const MyOrdersMenu = [
    { key: 'orders', value: t('ORDERS_MENU_PAGE', 'Orders'), disabled: false },
    { key: 'business', value: t('BUSINESS_MENU_PAGE', 'Business'), disabled: hideBusinessTab },
    { key: 'products', value: t('PRODUCTS_MENU_PAGE', 'Products'), disabled: hideProductsTab },
    // the Gift card tab: the site's gift cards and the theme (orders.gift_cards_tab)
    { key: 'giftCards', value: t('GIFT_CARD_MENU_PAGE', 'Gift card'), disabled: !isWalletEnabled || isGiftCardDisabled || themeHidden(theme, 'orders.gift_cards_tab') }
  ]

  // the page's outline, one h1 and its sections h2 (the groups of orders,
  // the appointments' title)
  const sectionLevel = 'h2'

  // once every group has loaded: each group without orders shows
  // its own empty state (NotFoundSource) under its title: the active ones with
  // images.empty.active_orders, the past ones with images.empty.past_orders,
  // the upcoming ones (preorders)
  // with empty.not_found. No orders at all keeps the one empty state of the
  // page ("You don't have any orders", empty.not_found). Each follows its
  // section: a hidden group shows neither its orders nor its empty state.
  const groupEmpty = !loading
    ? {
        upcoming: { content: t('NO_UPCOMING_ORDERS', 'You have no upcoming orders') },
        active: { image: themeImage(theme, 'empty.active_orders'), content: t('NO_ACTIVE_ORDERS', 'You have no active orders') },
        past: { image: themeImage(theme, 'empty.past_orders'), content: t('NO_PAST_ORDERS', 'You have no past orders') }
      }
    : {}
  // the band between the active and the past orders, while the past orders
  // show (pages.orders past_orders: their orders or their empty state)
  const showOrdersDivider = showPast
  // the groups shown, in the theme's order: the band sits on the side of the
  // past orders that faces another group (before them; after them when they
  // come first)
  const groupKeys = pageSectionsOn
    ? sections.filter(section => section.group === 'main' && section.visible).map(section => section.key)
    : ['upcoming_orders', 'active_orders', 'past_orders']
  const pastAt = groupKeys.indexOf('past_orders')
  const dividerBeforePast = showOrdersDivider && pastAt > 0
  const dividerAfterPast = showOrdersDivider && pastAt === 0 && groupKeys.length > 1

  const notOrderOptions = ['business', 'products', 'professionals']
  const allEmpty = (emptyActive && emptyPast && emptyPreorder) || ((isEmptyBusinesses || businessOrderIds?.length === 0) && hideOrders)

  const groupRenderers = {
    upcoming_orders: () => (
      <OrdersOption
        {...props}
        preOrders
        titleLevel={sectionLevel}
        emptyState={groupEmpty.upcoming}
        setIsEmptyPreorder={setIsEmptyPreorder}
      />
    ),
    active_orders: () => (
      <OrdersOption
        {...props}
        activeOrders
        titleLevel={sectionLevel}
        emptyState={groupEmpty.active}
        setIsEmptyActive={setIsEmptyActive}
      />
    ),
    past_orders: () => (
      <>
        {dividerBeforePast && (
          <Divider />
        )}
        <OrdersOption
          {...props}
          pastOrders
          titleLevel={sectionLevel}
          emptyState={groupEmpty.past}
          setIsEmptyPast={setIsEmptyPast}
          handleRedirectToCheckout={uuid => {
            onRedirectPage && onRedirectPage({ page: 'checkout', params: { cartUuid: uuid } })
          }}
        />
        {dividerAfterPast && (
          <Divider />
        )}
      </>
    )
  }

  return (
    <>
      {/* embedded in the search (hideOrders) it is not the page */}
      {!hideOrders && <AccountInviteOnEnter entry='orders' />}
      {hideOrders && !allEmpty && (
        <h2>{t('PREVIOUSLY_ORDERED', 'Previously ordered')}</h2>
      )}
      <Container data-doc-section='order-history' hideOrders={hideOrders} initialHeight={isFromBusinessListingSearch}>
        <Title>{t('MY_ORDERS', 'My Orders')}</Title>

        {!hideOrders && layout === 'appointments' && (
          <AppointmentsTitle $level={sectionLevel}>{t('MY_APPOINTMENTS', 'My appointments')}</AppointmentsTitle>
        )}
        {!allEmpty && !loading && showTabs && (
          <TabsScrollArea {...tabsProps} spaceAfter='xl'>
            <MyOrdersMenuContainer className='category-lists'>
              <TabsNavigation tone='contrast' {...tabsProps}>
                {MyOrdersMenu.filter(option => (!hideOrders || option.key !== 'orders') && !option.disabled).map(option => (
                  <TabsAction
                    data-doc-control='order-history-tab'
                    data-doc-tab={option.key}
                    noWrap
                    key={option.key}
                    onClick={() => setSelectedOption(option.key)}
                    active={selectedOption === option.key}
                  >
                    {option?.value}
                  </TabsAction>
                ))}
                {layout === 'appointments' && (
                  <TabsAction
                    onClick={() => setSelectedOption('professionals')}
                    active={selectedOption === 'professionals'}
                  >
                    {t('PROFESSIONALS', 'Professionals')}
                  </TabsAction>
                )}
              </TabsNavigation>
            </MyOrdersMenuContainer>
          </TabsScrollArea>
        )}
        {loading && showTabs && (
          <MyOrdersMenuContainer className='category-lists' $standalone>
            <TabsNavigation tone='contrast' {...tabsProps}>
              <Skeleton count={2} />
            </TabsNavigation>
          </MyOrdersMenuContainer>
        )}
        {selectedOption === 'orders' && (
          <>
            {(emptyActive && emptyPast && emptyPreorder)
              ? (
                /* the empty state of the page (a section of its h1), the
                   theme's empty.not_found */
                <div data-doc-section='order-history-empty'>
                  <NotFoundSource
                    variant='empty'
                    headingLevel='h2'
                    icon='receipt'
                    content={t('YOU_DONT_HAVE_ORDERS', 'You don\'t have any orders')}
                  >
                    <Button
                      data-doc-control='order-history-empty-action'
                      color='primary'
                      size='md'
                      onClick={() => onRedirectPage && onRedirectPage({ page: 'search' })}
                    >
                      {t('ORDER_NOW', 'Order now')}
                    </Button>
                  </NotFoundSource>
                </div>
                )
              : (
              <>
                {pageSectionsOn
                  ? render(groupRenderers, { group: 'main' })
                  : groupKeys.map(key => <React.Fragment key={key}>{groupRenderers[key]()}</React.Fragment>)}
              </>
                )}
          </>
        )}
        {notOrderOptions.includes(selectedOption) && !tabHidden[selectedOption]
          ? (<OrdersOption
              {...props}
              titleContent={t('PREVIOUSLY_ORDERED', 'Previously ordered')}
              hideOrders
              isBusiness={selectedOption === 'business'}
              isProducts={selectedOption === 'products'}
              isProfessionals={selectedOption === 'professionals'}
              activeOrders
              pastOrders
              preOrders
              businessesSearchList={businessesSearchList}
              setIsEmptyBusinesses={setIsEmptyBusinesses}
              businessOrderIds={businessOrderIds}
              setBusinessOrderIds={setBusinessOrderIds}
              onProductRedirect={onProductRedirect}
            />)
          : selectedOption !== 'giftCards' && selectedOption !== 'orders' && !hideOrders && (
            /* the empty state of the page, a section of its h1 */
            <NotFoundSource
              variant='empty'
              headingLevel='h2'
              icon='receipt'
              content={t('NOTHING_TO_SHOW', 'Nothing to show')}
            />
          )}
        {selectedOption === 'giftCards' && (
          <GiftCardOrdersList />
        )}
      </Container>
    </>
  )
}
