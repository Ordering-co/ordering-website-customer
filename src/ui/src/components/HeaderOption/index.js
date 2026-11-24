import React from 'react'
import { useTheme } from 'styled-components'
import { themeVisible } from '~/utils/themeVisibility'
import { Container, DeliveryType } from './styles'

import { useUtils } from '~components/contexts/UtilsContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'

import { HeaderIcon } from '~ui/src/components/Icon/headerGlyphs'
import { HeaderCartButton } from './HeaderCartButton'

export const HeaderOption = (props) => {
  const {
    variant,
    addressState,
    momentState,
    totalCarts,
    orderTypeList
  } = props

  const [{ parseDate, timeFormat, preorderDateFormat }] = useUtils()
  const [, t] = useLanguage()
  const [orderStatus] = useOrder()
  const theme = useTheme()
  // the cart's count badge, unless the theme hides it (the icon stays)
  const showCartCount = themeVisible(theme, 'header.cart_count')

  if (variant === 'cart') {
    return (
      <HeaderCartButton
        data-doc-control='cart-open'
        count={showCartCount && totalCarts > 0 ? totalCarts : null}
        disabled={!props.onClick}
        style={props.containerStyle}
        onClick={() => props.onClick && props.onClick(variant)}
      />
    )
  }

  return (
    <Container
      variant={variant}
      onClick={() => props.onClick && props.onClick(variant)}
      // without an action (preorder disabled) it does nothing
      disabled={!props.onClick || undefined}
      $isHome={props.isHome}
      style={props.containerStyle}
      // the address is cut with "…" when tight; its full text stays available
      title={variant === 'address' ? (addressState || t('WHAT_IS_YOUR_ADDRESS', 'What\'s your address?')) : undefined}
    >
      {variant === 'address' && (
        <span>
          <HeaderIcon name='mapMarker' />
          {addressState || t('WHAT_IS_YOUR_ADDRESS', 'What\'s your address?')}
        </span>
      )}
      {variant === 'moment' && (
        <>
          {momentState
            ? parseDate(momentState, { outputFormat: `${preorderDateFormat} ${timeFormat}` })
            : t('ASAP_ABBREVIATION', 'ASAP')}
        </>
      )}
      {
        variant === 'delivery' && (
          <DeliveryType>
            {(orderTypeList && orderTypeList[orderStatus?.options.type - 1]) || t('DELIVERY', 'Delivery')}
          </DeliveryType>
        )
      }
    </Container>
  )
}
