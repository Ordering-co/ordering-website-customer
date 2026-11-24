import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import {
  Container,
  HeaderContainer,
  CustomerInfoContainer,
  CustomerDetails,
  PaymentDetails,
  CustomerData,
  PhotoWrapper,
  OrderSummary,
  SingleOrderContainer,
  Divider,
  StatusBarContainer,
  StatusProgress,
  HiddenTitle
} from './styles'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { MultiOrdersDetails as MultiOrdersDetailsController } from '~components/components/MultiOrdersDetails'
import { useConfig } from '~components/contexts/ConfigContext'
import { useSite } from '~components/contexts/SiteContext'
import { getSiteName } from '~/utils/siteBranding'

import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { generalUtilities } from '~ui/utils'
import { Image } from '~ui/src/components/Image'
import { Alert } from '~ui/src/components/Confirm'
import { SingleOrderCard } from '~ui/src/components/SingleOrderCard'

import { Icon } from '~ui/src/design-system/components/Icon'
import { themeSpace, themeTextStyle } from '~/utils/themeTokens'
import { themeHidden } from '~/utils/themeVisibility'
import { showsCustomerAddress } from '~/utils/singleStore'
import { usePageSections } from '~ui/hooks/usePageSections'
import { AccountInviteOnEnter } from '~ui/src/components/AccountInvite'

const MultiOrdersDetailsUI = (props) => {
  const {
    customer,
    paymentEvents,
    ordersSummary,
    handleOrderRedirect
  } = props

  const { loading, orders, error } = props.ordersList
  // The invitation to create an account (a guest's) waits for the orders, and stays once they are there: the
  // account made in it changes the session and the orders load again, which must not take it away
  const inviteReady = useRef(false)
  if (!loading && !error && orders?.length > 0) inviteReady.current = true
  const theme = useTheme()
  // the site's name, the title of its dialogs
  const [{ site }] = useSite()
  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()
  const [{ configs }] = useConfig()
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const { isVisible, render: renderSections } = usePageSections('multi_orders')

  const { getOrderStatus, walletName } = generalUtilities()
  // the theme's sm between the payments
  const paymentGap = themeSpace(theme, 'sm')
  // confirmation.customer.* hide the customer's data, as in the order's details
  const hideCustomerPhoto = themeHidden(theme, 'confirmation.customer.photo')
  const hideCustomerEmail = themeHidden(theme, 'confirmation.customer.email')
  const hideCustomerPhone = themeHidden(theme, 'confirmation.customer.phone')
  const hideCustomerAddress = themeHidden(theme, 'confirmation.customer.address')
  const deliveryAddress = orders.find(order => {
    const address = order.customer?.address
    return showsCustomerAddress(order.delivery_type) && typeof address === 'string' && address.trim()
  })?.customer.address

  const progressBarStyle = configs.multi_business_checkout_progress_bar_style?.value
  const showBarInOrder = ['group', 'both']
  const showBarInIndividual = ['individual', 'both']

  const isTaxIncludedOnPrice = orders.every(_order => _order.taxes?.length ? _order.taxes?.every(_tax => _tax.type === 1) : true)

  useEffect(() => {
    if (error) {
      setAlertState({
        open: true,
        content: error
      })
    }
  }, [error])

  // pages.multi_orders, group main: the greeting, the customer, the summary
  // and the orders, siblings of the page in the theme's order (the first
  // three while there are orders to show)
  const showHeader = orders?.length > 0 || loading
  const mainSections = {
    greeting: () => showHeader && (
      <HeaderContainer>
        {loading
          ? (
          <>
            <Skeleton height={36} width={250} style={{ marginBottom: themeSpace(theme, 'sm') }} />
            <Skeleton height={21} />
          </>
            )
          : (
          <>
            <h1>
              <span>{t('HEY', 'Hey')}</span>
              <span className='name'>{customer?.name} {customer?.lastname}</span>
            </h1>
            <p>{t('ORDER_MESSAGE_HEADER_TEXT', 'Once business accepts your order, we will send you an email, thank you!')}</p>
          </>
            )}
      </HeaderContainer>
    ),
    customer: () => showHeader && (
      <>
        {loading
          ? (
          <Skeleton height={220} />
            )
          : (
          <CustomerInfoContainer data-doc-section='multi-order-customer'>
            <CustomerDetails>
              <h2 className='section-title'>{t('CUSTOMER_DETAILS', 'Customer details')}</h2>
              <div>
                {!hideCustomerPhoto && (
                  <PhotoWrapper>
                    <Image
                      src={customer?.photo}
                      fallback={<Icon name="user" />}
                    />
                  </PhotoWrapper>
                )}
                <CustomerData>
                  <p>{customer?.name} {customer?.lastname}</p>
                  {!hideCustomerEmail && <p>{customer?.email}</p>}
                  {!hideCustomerPhone && <p>{customer?.cellphone || customer?.phone}</p>}
                </CustomerData>
              </div>
            </CustomerDetails>
            <PaymentDetails>
              <h2 className='section-title'>{t('PAYMETHOD', 'Payment method')}</h2>
              {paymentEvents.map(event => (
                <p key={event.id}>
                  {event?.wallet_event
                    ? walletName[event?.wallet_event?.wallet?.type]?.name
                    : event?.paymethod?.name}
                </p>
              ))}
              {!hideCustomerAddress && deliveryAddress && (
                <>
                  <h2 className='section-title address'>{t('DELIVERYA_V21', 'Delivery address')}</h2>
                  <p>{deliveryAddress}</p>
                </>
              )}
            </PaymentDetails>
          </CustomerInfoContainer>
            )}
      </>
    ),
    summary: () => showHeader && (
      <>
        {loading
          ? (
          <Skeleton height={250} />
            )
          : (
          <OrderSummary data-doc-section='multi-order-summary'>
            <h2 className='section-title'>{t('ORDER_SUMMARY', 'Order summary')}</h2>
            {(showBarInOrder.includes(progressBarStyle)) && (
              <StatusBarContainer>
                {/* components.progress, active until the order is complete */}
                <StatusProgress
                  size='md'
                  value={getOrderStatus(orders[0]?.status)?.percentage ?? 0}
                  state={getOrderStatus(orders[0]?.status)?.percentage === 100 ? 'complete' : 'active'}
                  aria-label={getOrderStatus(orders[0]?.status)?.value}
                />
                <p className='order-status'>{getOrderStatus(orders[0]?.status)?.value}</p>
              </StatusBarContainer>
            )}
            <table>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>{t('ORDER', 'Order')} #{order.id}</td>
                    <td>{parsePrice(order?.summary?.total ?? order?.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isTaxIncludedOnPrice && (
              <>
                <Divider />
                <table>
                  <tbody>
                    <tr>
                      <td>{t('TOTAL_BEFORE_TAX', 'Total before tax')}:</td>
                      <td>{parsePrice(ordersSummary?.subtotal)}</td>
                    </tr>
                    <tr>
                      <td>{t('ESTIMATED_TAX_TO_BE_COLLECTED', 'Estimated tax to be collected')}:</td>
                      <td>{parsePrice(ordersSummary?.tax)}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
            <Divider />
            <table>
              <tbody>
                <tr>
                  <td>{t('PAYMENT_TOTAL', 'Payment total')}:</td>
                  <td>{parsePrice(ordersSummary?.total)}</td>
                </tr>
              </tbody>
            </table>
            {orders?.some(order => order?.payment_events?.length > 0) && (
              <div style={themeTextStyle(theme, 'body', { margin: `${paymentGap} 0 0`, fontSize: 14 })}>
                <span>{t('PAYMENTS', 'Payments')}</span>
                <div
                  style={{
                    width: '100%',
                    marginTop: paymentGap
                  }}
                >
                  {orders?.map(order => (
                    order?.payment_events?.map(event => {
                      if (!(event?.amount > 0)) return null
                      const isRefund = event?.event === 'refund'
                      const methodName = event?.wallet_event
                        ? walletName[event?.wallet_event?.wallet?.type]?.name
                        : t(event?.paymethod?.name.toUpperCase()?.replace(/ /g, '_'), event?.paymethod?.name)
                      const eventLabel = isRefund
                        ? `${t('REFUND', 'Refund')} (${methodName})`
                        : methodName
                      return (
                      <div
                        key={`${order.id}_${event.id}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: paymentGap
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <span>
                            {eventLabel}
                            {` (#${(order?.id)})`}
                          </span>
                        </div>
                        <span>
                          {isRefund ? '+' : '-'}{parsePrice(event?.amount, { isTruncable: true })}
                        </span>
                      </div>
                      )
                    })
                  ))}
                </div>
              </div>
            )}
          </OrderSummary>
            )}
      </>
    ),
    orders: () => (
      <>
        {loading
          ? (
              [...Array(3).keys()].map(i => (
            <SingleOrderContainer key={i}>
              <Skeleton height={330} />
            </SingleOrderContainer>
              ))
            )
          : (
          <>
            {orders.map(order => (
              <SingleOrderCard
                key={order.id}
                isMultiOrders
                getOrderStatus={getOrderStatus}
                order={order}
                showProgressBar={showBarInIndividual.includes(progressBarStyle)}
              />
            ))}
          </>
            )}
      </>
    )
  }

  return (
    <Container data-doc-section='multi-order-details'>
      {/* without the greeting, the page keeps its title (h1) */}
      {showHeader && !isVisible('greeting') && (
        <HiddenTitle>{t('YOUR_ORDERS', 'Your Orders')}</HiddenTitle>
      )}
      {renderSections(mainSections, { group: 'main' })}
      {inviteReady.current && <AccountInviteOnEnter entry='confirmation' />}
      {!loading && (error || orders?.length === 0) && (
        error?.includes('ERROR_ACCESS_EXPIRED')
          ? (
          <NotFoundSource
            headingLevel='h1'
            icon='receipt'
            content={t(error[0], 'Sorry, the order has expired.')}
          />
            )
          : (
          <NotFoundSource
            headingLevel='h1'
            icon='receipt'
            content={t('NOT_FOUND_ORDER', 'Sorry, we couldn\'t find the requested order.')}
            btnTitle={t('ORDERS_REDIRECT', 'Go to Orders')}
            onClickButton={handleOrderRedirect}
          />
            )
      )}
      <Alert
        title={getSiteName({ theme, site })}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => setAlertState({ open: false, content: [] })}
        onAccept={() => setAlertState({ open: false, content: [] })}
        closeOnBackdrop={false}
      />
    </Container>
  )
}

export const MultiOrdersDetails = (props) => {
  const MultiOrdersDetails = {
    ...props,
    UIComponent: MultiOrdersDetailsUI
  }
  return <MultiOrdersDetailsController {...MultiOrdersDetails} />
}
