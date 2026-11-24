import React, { useState, useEffect } from 'react'
import { useTheme } from 'styled-components'
import { businessLogoPlaceholder, themeRadius } from '~/utils/themeTokens'
import { themeHidden, themeVisible } from '~/utils/themeVisibility'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import {
  MessagesListingContainer,
  OrderListItems,
  ListHeader,
  InnerTabsContainer,
  Title,
  OrderListContainer,
  OrdersListContainer,
  OrderCard,
  MessageContainer,
  OrderHeader,
  CardContent,
  BusinessInfo,
  WrapperImage,
  UnreadMessageCounter,
  Image,
  LoadMoreButtonWrap,
  DriverInfo,
  OptionContent,
  DriverNameContainer,
  DriverName,
  DriverText,
  NotFoundSourceWrapper
} from './styles'
import '~ui/src/components/Icon/chatEmptyStateGlyph'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useEvent } from '~components/contexts/EventContext'
import { OrderList as OrderListController } from '~components/components/OrderList'
import { OrderDetails as OrderDetailsController } from '~components/components/OrderDetails'
import { Button } from '~ui/src/design-system/components/Button'
import { Avatar } from '~ui/src/design-system/components/Avatar'
import { TabsAction, TabsNavigation, TabsScrollArea } from '~ui/src/design-system/components/Tabs'
import { generalUtilities } from '~ui/utils'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { Messages } from '~ui/src/components/Messages'

const OrdersListingUI = (props) => {
  const {
    orderList,
    selectedOrderCard,
    handleOrderCardClick,
    handleUpdateDriverLocation,
    pagination,
    loadMoreOrders,
    small,
    setOrderListStatus
  } = props
  const [, t] = useLanguage()
  const theme = useTheme()
  const [events] = useEvent()
  const [{ parseDate, optimizeImage }] = useUtils()
  const deliveryTypes = [1, 7]

  // the store and the driver under each conversation (visibility.messages.card_details, off by default)
  const hideCardContent = themeHidden(theme, 'messages.card_details')
  // the pieces of an order's card the theme hides, as on the orders' page (visibility.orders.*)
  const show = {
    logo: themeVisible(theme, 'orders.business_logo'),
    name: themeVisible(theme, 'orders.business_name'),
    number: themeVisible(theme, 'orders.order_number'),
    date: themeVisible(theme, 'orders.date'),
    status: themeVisible(theme, 'orders.order_status'),
    type: themeVisible(theme, 'orders.delivery_type')
  }
  const { getOrderStatus, getOrderType } = generalUtilities()

  const handleOrderClick = (e, order) => {
    const isInvalid = e.target.closest('.view-details') || e.target.closest('.driver-selector')
    if (isInvalid) return
    handleOrderCardClick(order)
  }

  // the card opens its conversation from the keyboard too (Enter, Space)
  const handleOrderKeyDown = (e, order) => {
    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return
    e.preventDefault()
    handleOrderCardClick(order)
  }

  const handleGoToPage = (data) => {
    events.emit('go_to_page', data)
  }

  useEffect(() => {
    if (orderList.loading || !selectedOrderCard) return
    const updatedOrder = orderList?.orders.find(order => order.id === selectedOrderCard?.id)
    if (updatedOrder) {
      handleUpdateDriverLocation && handleUpdateDriverLocation(updatedOrder)
    }
  }, [orderList?.orders])

  useEffect(() => {
    if (orderList.loading || selectedOrderCard) return
    if (orderList?.orders.length > 0) {
      handleOrderCardClick(orderList.orders[0])
    }
  }, [orderList, selectedOrderCard])

  useEffect(() => {
    setOrderListStatus(orderList)
  }, [orderList])

  return (
    <OrdersListContainer data-doc-section='messages-order-list'>
      {/* skeletons only before the first page: loading the next one keeps
          the conversations on screen (the scroll stays where it is) */}
      {orderList.loading && !(orderList.orders?.length > 0)
        ? (
            [...Array(10).keys()].map(i => (
          // the card while loading: the same blocks as a conversation (its
          // logo's box and radius, its three lines), not a control
          <OrderCard key={i} $skeleton aria-hidden='true'>
            {show.logo && (
              <div className='order-header-left'>
                <WrapperImage hideContent={hideCardContent} isSkeleton>
                  <Skeleton
                    width={hideCardContent ? 70 : 45}
                    height={hideCardContent ? 70 : 45}
                    borderRadius={themeRadius(theme, 'md')}
                    style={{ display: 'block' }}
                  />
                </WrapperImage>
              </div>
            )}
            <div className='order-header-right'>
              <OrderHeader>
                <p className='business-name'><Skeleton width={150} /></p>
                <p><Skeleton width={200} /></p>
              </OrderHeader>
              <div className='order-type-status'>
                <p><Skeleton width={120} /></p>
              </div>
              {!hideCardContent && (
              <CardContent>
                <BusinessInfo>
                  <WrapperImage>
                    <Skeleton width={45} height={45} circle />
                  </WrapperImage>
                  <div className='info'>
                    <p className='bold'><Skeleton width={120} /></p>
                    <p><Skeleton width={80} /></p>
                  </div>
                </BusinessInfo>
                <DriverInfo>
                  <WrapperImage>
                    <Skeleton width={45} height={45} circle />
                  </WrapperImage>
                  <OptionContent>
                    <DriverNameContainer>
                      <DriverName><Skeleton width={100} /></DriverName>
                      <DriverText><Skeleton width={60} /></DriverText>
                    </DriverNameContainer>
                  </OptionContent>
                </DriverInfo>
              </CardContent>
              )}
            </div>
          </OrderCard>
            ))
          )
        : (
        <>
          {orderList.orders?.map(order => (
            <OrderCard
              key={order.id}
              active={selectedOrderCard?.id === order.id}
              data-doc-item='messages-order'
              data-doc-state={selectedOrderCard?.id === order.id ? 'selected' : 'available'}
              role='button'
              tabIndex={0}
              aria-current={selectedOrderCard?.id === order.id ? 'true' : undefined}
              onClick={(e) => handleOrderClick(e, order)}
              onKeyDown={(e) => handleOrderKeyDown(e, order)}
            >
              {show.logo && (order.business?.logo || businessLogoPlaceholder(theme)) && (
                <div className='order-header-left'>
                  <WrapperImage hideContent={hideCardContent}>
                    <Image bgimage={optimizeImage(order.business?.logo || businessLogoPlaceholder(theme), 'h_50,c_limit')} />
                  </WrapperImage>
                </div>
              )}
              <div className='order-header-right'>
                <OrderHeader>
                  {show.name && <p className='business-name'>{order?.business?.name}</p>}
                  {(show.number || show.date) && (
                    <p className='facts'>
                      {show.number && <>{t('INVOICE_NO', 'No.')} {order?.id}</>}
                      {show.number && show.date && ' • '}
                      {show.date && (order?.delivery_datetime_utc
                        ? parseDate(order?.delivery_datetime_utc)
                        : null)}
                    </p>
                  )}
                </OrderHeader>
                {order?.unread_count > 0 && (
                  <UnreadMessageCounter data-doc-section='messages-unread-count'>
                    {order?.unread_count}
                  </UnreadMessageCounter>
                )}
                {(show.status || show.type) && (
                  <div className='order-type-status'>
                    <p>
                      {show.status && <span className='green'>{getOrderStatus(order.status)?.value}</span>}
                      {show.status && show.type && ' • '}
                      {show.type && <span className='order-type'>{getOrderType(order.delivery_type)}</span>}
                    </p>
                  </div>
                )}
                {!hideCardContent && (
                  <CardContent>
                    <BusinessInfo>
                      {(order.business?.logo || businessLogoPlaceholder(theme)) && (
                        <WrapperImage>
                          <Image bgimage={optimizeImage(order.business?.logo || businessLogoPlaceholder(theme), 'h_50,c_limit')} />
                        </WrapperImage>
                      )}
                      <div className='info'>
                        <p className='bold' title={order?.business?.name}>{order?.business?.name}</p>
                        <p title={order?.business?.city?.name}>{order?.business?.city?.name}</p>
                      </div>
                    </BusinessInfo>
                    {deliveryTypes?.includes(order?.delivery_type) && (
                      <DriverInfo>
                        {/* components.avatar md (the name beside it says who it is) */}
                        <Avatar variant='photo' src={order?.driver?.photo && optimizeImage(order?.driver?.photo, 'h_50,c_limit')} size='md' />
                        {order?.driver
                          ? (
                          <OptionContent>
                            <DriverNameContainer small={small}>
                              <DriverName small={small}>{order?.driver.name} {order?.driver.lastname}</DriverName>
                              <DriverText small={small}>{t('DRIVER', 'Driver')}</DriverText>
                            </DriverNameContainer>
                          </OptionContent>
                            )
                          : (
                          <OptionContent>
                            <DriverName small={small}>
                              {t('NO_DRIVER', 'No Driver')}
                            </DriverName>
                          </OptionContent>
                            )}
                      </DriverInfo>
                    )}
                  </CardContent>
                )}
              </div>
            </OrderCard>
          ))}
          {pagination?.totalPages && pagination?.currentPage < pagination?.totalPages && (
            <LoadMoreButtonWrap>
              <Button
                className='load-orders'
                appearance='outline'
                disabled={orderList.loading}
                loading={orderList.loading}
                onClick={loadMoreOrders}
              >
                {t('LOAD_MORE_ORDERS', 'Load more orders')}
              </Button>
            </LoadMoreButtonWrap>
          )}
        </>
          )}
      {!orderList?.loading && orderList?.orders.length === 0 && (
        <NotFoundSourceWrapper data-doc-section='messages-empty'>
          <NotFoundSource
            headingLevel='h2'
            variant='empty'
            icon='chat'
            content={t('NO_CONVERSATIONS_YET', 'No conversations yet')}
            subtitle={t('NO_CONVERSATIONS_YET_DESC', 'Messages about your orders will appear here.')}
            btnTitle={t('GO_HOME', 'Go to home')}
            onClickButton={() => handleGoToPage({ page: 'home' })}
          />
        </NotFoundSourceWrapper>
      )}
    </OrdersListContainer>
  )
}

export const IdOrderList = (props) => {
  const orderListProps = {
    ...props,
    UIComponent: OrdersListingUI,
    orderStatus: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
    useDefualtSessionManager: true,
    noGiftCardOrders: true,
    orderBy: 'id',
    orderDirection: 'desc'
  }

  return <OrderListController {...orderListProps} />
}

export const NewestOrderList = (props) => {
  const orderListProps = {
    ...props,
    UIComponent: OrdersListingUI,
    orderStatus: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
    useDefualtSessionManager: true,
    profileMessages: true,
    noGiftCardOrders: true,
    orderBy: 'last_direct_message_at',
    orderDirection: 'asc'
  }

  return <OrderListController {...orderListProps} />
}

const OrderDetailsUI = (props) => {
  const {
    messages,
    setMessages,
    readMessages
  } = props
  const [openMessages, setOpenMessages] = useState({ business: false, driver: false })
  const { order } = props.order
  const handleOpenMessages = (data) => {
    setOpenMessages(data)
    readMessages()
  }
  const handleChangeOpenMessages = (data) => {
    handleOpenMessages(data)
  }

  useEffect(() => {
    handleOpenMessages({ driver: false, business: true })
  }, [])

  return (
    <Messages
      orderId={order?.id}
      order={order}
      business={openMessages.business}
      driver={openMessages.driver}
      messages={messages}
      setMessages={setMessages}
      readMessages={readMessages}
      onMessages={setOpenMessages}
      onClose={() => setOpenMessages({ driver: false, business: false })}
      profileMessages
      handleChangeOpenMessages={handleChangeOpenMessages}
    />
  )
}

export const MessageControler = (props) => {
  const userCustomer = JSON.parse(window.localStorage.getItem('user-customer'))
  const orderDetailsProps = {
    ...props,
    userCustomerId: userCustomer?.id,
    googleMapsControls: {
      defaultZoom: 15,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeId: 'roadmap', // 'roadmap', 'satellite', 'hybrid', 'terrain'
      mapTypeControl: true,
      mapTypeControlOptions: {
        mapTypeIds: ['roadmap', 'satellite']
      }
    },
    UIComponent: OrderDetailsUI
  }
  return <OrderDetailsController {...orderDetailsProps} />
}

export const MessagesListing = (props) => {
  const { onRedirectPage } = props
  const [orderByOption, setOrderByOption] = useState('last_direct_message_at')
  const [, t] = useLanguage()
  const [selectedOrder, setSelectedOrder] = useState(null)
  const theme = useTheme()

  // the tabs that sort the chats, newest or by order number (visibility.messages.sort_tabs, off by default)
  const hideTabs = themeHidden(theme, 'messages.sort_tabs')
  const [orderListStatus, setOrderListStatus] = useState({
    error: null,
    loading: true,
    orders: []
  })

  const handleOpenOrderDetail = (order) => {
    onRedirectPage({ page: 'order_detail', params: { orderId: order?.uuid } })
  }

  const handleOrderCardClick = (order) => {
    setSelectedOrder({ ...order })
  }

  return (
    <>
    <MessagesListingContainer data-doc-section='messages-inbox'>
        <OrderListItems $sortTabs={!hideTabs}>
          <ListHeader>
            <Title>
              {t('MESSAGES', 'Messages')}
            </Title>
            {!hideTabs && (
              <TabsScrollArea flex shadow={false}>
                <InnerTabsContainer>
                  <TabsNavigation width='content' tone='primary'>
                    <TabsAction
                      active={orderByOption === 'last_direct_message_at'}
                      onClick={() => setOrderByOption('last_direct_message_at')}
                    >
                      {t('NEWEST', 'Newest')}
                    </TabsAction>
                    <TabsAction
                      active={orderByOption === 'id'}
                      onClick={() => setOrderByOption('id')}
                    >
                      {t('ORDER_NUMBER', 'Order number')}
                    </TabsAction>
                  </TabsNavigation>
                </InnerTabsContainer>
              </TabsScrollArea>
            )}
          </ListHeader>
          <OrderListContainer>
            {orderByOption === 'id' && (
              <IdOrderList
                {...props}
                handleOrderCardClick={handleOrderCardClick}
                selectedOrderCard={selectedOrder}
                handleOpenOrderDetail={handleOpenOrderDetail}
                setOrderListStatus={setOrderListStatus}
              />
            )}
            {orderByOption === 'last_direct_message_at' && (
              <NewestOrderList
                {...props}
                handleOrderCardClick={handleOrderCardClick}
                selectedOrderCard={selectedOrder}
                handleOpenOrderDetail={handleOpenOrderDetail}
                setOrderListStatus={setOrderListStatus}
              />
            )}
          </OrderListContainer>
        </OrderListItems>
        <MessageContainer data-doc-section='messages-selected-conversation'>
          {selectedOrder && (
            <MessageControler
              order={selectedOrder}
              orderListStatus={orderListStatus}
            />
          )}
        </MessageContainer>
      </MessagesListingContainer>
    </>
  )
}
