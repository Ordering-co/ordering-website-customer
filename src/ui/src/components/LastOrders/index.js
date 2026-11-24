import React from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'

import {
  LastOrdersContainer,
  OrderCard,
  WrapperImage,
  Image,
  OrderHeader
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useEvent } from '~components/contexts/EventContext'
import { OrderList as OrderListController } from '~components/components/OrderList'

import { generalUtilities } from '~ui/utils'
import { businessLogoPlaceholder } from '~/utils/themeTokens'
import { themeVisible } from '~/utils/themeVisibility'

export const LastOrdersUI = (props) => {
  const {
    orderList
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  const [events] = useEvent()
  const [{ optimizeImage, parseDate, parsePrice }] = useUtils()
  const { getOrderStatus, getOrderType } = generalUtilities()

  // the pieces of an order's card the theme hides, as on the orders' page (visibility.orders.*)
  const show = {
    logo: themeVisible(theme, 'orders.business_logo'),
    name: themeVisible(theme, 'orders.business_name'),
    number: themeVisible(theme, 'orders.order_number'),
    date: themeVisible(theme, 'orders.date'),
    status: themeVisible(theme, 'orders.order_status'),
    type: themeVisible(theme, 'orders.delivery_type'),
    total: themeVisible(theme, 'orders.total')
  }

  const handleClickOrder = (uuid) => {
    events.emit('go_to_page', { page: 'order_detail', params: { orderId: uuid } })
  }

  return (
    <>
      {!orderList?.loading && orderList?.orders?.length > 0 && (
        <>
          {/* an h2 under the help page's h1 */}
          <h2>{t('LAST_ORDER', 'Last order')}</h2>
          <LastOrdersContainer data-doc-section='help-last-order'>
            {orderList?.loading && <Skeleton height={150} />}
            {!orderList?.loading && orderList?.orders?.length > 0 && orderList?.orders.map((order) => (
              <OrderCard
                key={order.id}
                type='button'
                onClick={() => handleClickOrder(order.uuid)}
              >
                <span className='order-container'>
                  {show.logo && (order.business?.logo || businessLogoPlaceholder(theme)) && (
                    <span className='order-header-left'>
                      <WrapperImage hideContent>
                        <Image bgimage={optimizeImage(order.business?.logo || businessLogoPlaceholder(theme), 'h_50,c_limit')} />
                      </WrapperImage>
                    </span>
                  )}
                  <span className='order-header-right'>
                    <OrderHeader>
                      {show.name && <span className='line business-name'>{order?.business?.name}</span>}
                      {(show.number || show.date) && (
                        <span className='line facts'>
                          {show.number && <>{t('INVOICE_NO', 'No.')} {order?.id}</>}
                          {show.number && show.date && ' • '}
                          {show.date && (order?.delivery_datetime_utc
                            ? parseDate(order?.delivery_datetime_utc)
                            : null)}
                        </span>
                      )}
                    </OrderHeader>
                    {(show.status || show.type) && (
                      <span className='order-type-status'>
                        <span className='line'>
                          {show.status && <span className='green'>{getOrderStatus(order.status)?.value}</span>}
                          {show.status && show.type && ' • '}
                          {show.type && <span className='order-type'>{getOrderType(order.delivery_type)}</span>}
                        </span>
                      </span>
                    )}
                  </span>
                </span>
                {show.total && (
                  <span className='order-price'>
                    <span className='line'>{parsePrice(order?.summary?.total)}</span>
                  </span>
                )}
              </OrderCard>
            ))}
          </LastOrdersContainer>
        </>
      )}
    </>
  )
}

export const LastOrders = (props) => {
  const lastOrdersProps = {
    ...props,
    UIComponent: LastOrdersUI,
    orderStatus: [1, 11, 15],
    useDefualtSessionManager: true,
    paginationSettings: {
      initialPage: 1,
      pageSize: 1,
      controlType: 'infinity'
    },
    noGiftCardOrders: true
  }
  return <OrderListController {...lastOrdersProps} />
}
