import React, { useRef } from 'react'
import { OrderTypeControl } from '~components/components/OrderTypeControl'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useOrder } from '~components/contexts/OrderContext'
import { getMaxPreorderDays } from '~components/utils/configHelpers'
import { Select } from '~ui/src/design-system/components/Select'

import { Option, SelectedOption, ContentOption, HeaderItem } from './styles'

import { OrderIcon } from '~ui/src/components/AddressOrderType/OrderIcon'

const OrderTypeSelectorHeaderUI = (props) => {
  const {
    handleChangeOrderType,
    typeSelected,
    defaultValue,
    configTypes,
    orderTypes,
    customView,
    isFullClick,
    orderTypeList
  } = props

  const [{ configs }] = useConfig()
  const [orderStatus] = useOrder()
  const [, t] = useLanguage()
  const maxPreorderDays = getMaxPreorderDays(configs, orderStatus?.options?.type)
  const isPreorderDisabled = maxPreorderDays === -1 || maxPreorderDays === 0
  const referenceElement = useRef()
  const defaultType = configTypes?.includes(typeSelected) ? null : configTypes?.[0]

  return (
    <>
      {customView
        ? <Select
              narrowCap
              aria-label={t('SERVICE_TYPE', 'Service type')}
              options={configTypes
                ? orderTypes.filter(type => configTypes?.includes(type.value))
                : orderTypes
              }
              defaultValue={defaultType || typeSelected || defaultValue}
              onChange={(orderType) => handleChangeOrderType(orderType)}
            />
        : <div
            className='order-type'
            style={{
              ...props.containerStyle,
              ...(isFullClick && { width: '100%', padding: 0 })
            }}
            onClick={isFullClick && props.onClick}
          >
            <HeaderItem
              ref={referenceElement}
              $clickable={!!props.onClick && !isPreorderDisabled && !isFullClick}
              onClick={isPreorderDisabled || isFullClick
                ? null
                : props.onClick}
            >
              {(orderTypeList && orderTypeList[orderStatus?.options.type - 1]) || t('DELIVERY', 'Delivery')}
            </HeaderItem>
          </div>}
    </>
  )
}

export const OrderTypeSelectorHeader = (props) => {
  const [, t] = useLanguage()
  // the pilot's glyphs (AddressOrderType ORDER_TYPE_ICONS); Reservation keeps its Store (not the pilot's calendar)
  const icon = (name) => <OrderIcon name={name} />

  const orderTypeProps = {
    ...props,
    UIComponent: OrderTypeSelectorHeaderUI,
    orderTypes: props.orderTypes || [
      {
        value: 1,
        content: <Option>{icon('truckOutline')}<ContentOption>{t('DELIVERY', 'Delivery')}</ContentOption></Option>,
        showOnSelected: <Option>{icon('truckOutline')}<SelectedOption>{t('DELIVERY', 'Delivery')}</SelectedOption></Option>
      },
      {
        value: 2,
        content: <Option>{icon('bag')}<ContentOption>{t('PICKUP', 'Pickup')}</ContentOption></Option>,
        showOnSelected: <Option>{icon('bag')}<SelectedOption>{t('PICKUP', 'Pickup')}</SelectedOption></Option>
      },
      {
        value: 3,
        content: <Option>{icon('shop')}<ContentOption>{t('EAT_IN', 'Eat in')}</ContentOption></Option>,
        showOnSelected: <Option>{icon('shop')}<SelectedOption>{t('EAT_IN', 'Eat in')}</SelectedOption></Option>
      },
      {
        value: 4,
        content: <Option>{icon('carFront')}<ContentOption>{t('CURBSIDE', 'Curbside')}</ContentOption></Option>,
        showOnSelected: <Option>{icon('carFront')}<SelectedOption>{t('CURBSIDE', 'Curbside')}</SelectedOption></Option>
      },
      {
        value: 5,
        content: <Option>{icon('car')}<ContentOption>{t('DRIVE_THRU', 'Drive thru')}</ContentOption></Option>,
        showOnSelected: <Option>{icon('car')}<SelectedOption>{t('DRIVE_THRU', 'Drive thru')}</SelectedOption></Option>
      },
      {
        value: 9,
        content: <Option>{icon('shop')}<ContentOption>{t('RESERVATION', 'Reservation')}</ContentOption></Option>,
        showOnSelected: <Option>{icon('shop')}<SelectedOption>{t('RESERVATION', 'Reservation')}</SelectedOption></Option>
      }
    ]
  }

  return <OrderTypeControl {...orderTypeProps} />
}
