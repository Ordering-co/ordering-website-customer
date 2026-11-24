import React from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'styled-components'
import {
  OrderProgressContainer,
  OrderInfoWrapper,
  ProgressLogo,
  ProgressDescriptionWrapper,
  ProgressBusinessName,
  ProgressBarWrapper,
  ProgressTextWrapper,
  StatusWrapper,
  TimeWrapper,
  OrderProgressWrapper
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useEvent } from '~components/contexts/EventContext'
import { OrderList as OrderListController } from '~components/components/OrderList'

import { OrderEta } from '../OrderDetails/OrderEta'
import { Button } from '~ui/src/design-system/components/Button'
import { ProgressBar as ThemeProgressBar } from '~ui/src/styles/Progress'
import { businessLogoPlaceholder } from '~/utils/themeTokens'
import { useImageFallback } from '~ui/hooks/useImageFallback'
import { generalUtilities } from '~ui/utils'

const OrderProgressUI = (props) => {
  const { orderList } = props

  const [, t] = useLanguage()
  const [{ optimizeImage, /* parseTime, */ parseDate, timeFormat }] = useUtils()
  const theme = useTheme()
  const [events] = useEvent()
  const { getStatusPrefix } = generalUtilities()
  const statusToShow = [0, 3, 4, 7, 8, 9, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26]
  const deliveryTypes = [1, 7]

  const lastOrder = orderList.orders?.length ? orderList.orders?.find(order => !!order.business_id) : null
  const placeholderLogo = businessLogoPlaceholder(theme)
  // the business's logo, the theme's placeholder when it has none or it
  // fails to load (a background image fails silently: an empty box)
  const businessLogo = useImageFallback(lastOrder?.business?.logo && optimizeImage(lastOrder?.business?.logo, 'h_91,c_limit'), placeholderLogo && optimizeImage(placeholderLogo, 'h_91,c_limit'))
  const isPickup = lastOrder?.delivery_type && lastOrder?.delivery_type === 2
  const lastStatus = lastOrder ? getStatusPrefix({ status: lastOrder.status, isPickup }) : null

  // the order shown opens itself: its page, or the multi order page of its
  // group (as the orders list does)
  const orderPage = lastOrder?.cart_group_id
    ? { page: 'multi_orders', params: { orderId: lastOrder.cart_group_id }, href: `/multi-orders/${lastOrder.cart_group_id}` }
    : { page: 'order_detail', params: { orderId: lastOrder?.uuid }, href: `/orders/${lastOrder?.uuid}` }
  const handleOpenOrder = (e) => {
    e.preventDefault()
    events.emit('go_to_page', { page: orderPage.page, params: orderPage.params })
  }

  return (
    <>
      {orderList?.loading && (
        <OrderProgressWrapper>
          <Skeleton height={150} />
        </OrderProgressWrapper>
      )}
      {!orderList?.loading && lastOrder && (
        <>
          <OrderProgressWrapper>
            <OrderProgressContainer>
              <OrderInfoWrapper>
                {businessLogo && (
                  <ProgressLogo
                    bgimage={businessLogo}
                  />
                )}
                <ProgressDescriptionWrapper>
                  <p>{statusToShow.includes(lastOrder?.status) ? t('ORDER_IN_PROGRESS', 'Order in progress') : t('ORDER', 'Order')}</p>
                  {/* a section of the page (its look the h3's) */}
                  <ProgressBusinessName>{lastOrder?.business?.name ?? ''}</ProgressBusinessName>
                </ProgressDescriptionWrapper>
              </OrderInfoWrapper>
              <Button
                color='secondary'
                render={<a href={orderPage.href} onClick={handleOpenOrder} />}
                nativeButton={false}
              >
                {t('VIEW_ORDER', 'View Order')}
              </Button>
            </OrderProgressContainer>
            <ProgressBarWrapper>
              {/* components.progress, active until the order is complete */}
              <ThemeProgressBar
                size='md'
                value={lastStatus?.percentage ?? 0}
                state={lastStatus?.percentage === 100 ? 'complete' : 'active'}
                aria-label={lastStatus?.value || t('ORDER_IN_PROGRESS', 'Order in progress')}
              />
              <ProgressTextWrapper>
                <StatusWrapper>{getStatusPrefix({ status: lastOrder?.status, isPickup })?.value}</StatusWrapper>
                <TimeWrapper>
                  <span>{deliveryTypes?.includes(lastOrder?.delivery_type) ? t('ESTIMATED_DELIVERY_TIME', 'Estimated delivery time') : t('ESTIMATED_TIME', 'Estimated time')}:&nbsp;</span>
                  <span className='time-wrapper'>
                    {/* {lastOrder?.delivery_datetime_utc
                      ? parseTime(lastOrder?.delivery_datetime_utc, { outputFormat: timeFormat || 'HH:mm' })
                      : parseTime(lastOrder?.delivery_datetime, { utc: false })}
                    &nbsp;-&nbsp; */}
                    {statusToShow.includes(lastOrder?.status)
                      ? <OrderEta order={lastOrder} outputFormat={timeFormat || 'HH:mm'} />
                      : parseDate(lastOrder?.reporting_data?.at[`status:${lastOrder.status}`], { outputFormat: timeFormat })}
                  </span>
                </TimeWrapper>
              </ProgressTextWrapper>
            </ProgressBarWrapper>
          </OrderProgressWrapper>
        </>
      )}
    </>

  )
}

export const OrderProgress = (props) => {
  const propsToFetchBusiness = ['name', 'logo', 'slug', 'id']
  const propsToFetch = ['cart', 'business', 'status', 'id', 'uuid', 'cart_group_id', 'business_id', 'delivery_datetime', 'delivery_datetime_utc', 'created_at', 'total', 'summary', 'eta_current_status_time', 'eta_previous_status_times', 'eta_time', 'delivered_in', 'prepared_in', 'eta_drive_time']
  const orderProgressProps = {
    ...props,
    UIComponent: OrderProgressUI,
    orderStatus: [0, 3, 4, 7, 8, 9, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26],
    useDefualtSessionManager: true,
    noGiftCardOrders: true,
    propsToFetchBusiness,
    propsToFetch,
    paginationSettings: {
      initialPage: 1,
      pageSize: props.isCustomerMode ? 1 : 10,
      controlType: 'infinity'
    }
  }
  return <OrderListController {...orderProgressProps} />
}
