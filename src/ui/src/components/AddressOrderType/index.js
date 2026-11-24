import React, { useEffect, useState } from 'react'
import { useTheme } from 'styled-components'
import {
  OrderTypeBar,
  OrderTypeLabel,
  OrderTypesContainer,
  AddressOrderTypeWrapper,
  OrderTypeStatic,
  VisuallyHidden
} from './styles'

import { useConfig } from '~components/contexts/ConfigContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { OrderTypeControl } from '~components/components/OrderTypeControl'

import { OrderIcon } from './OrderIcon'
import { Spinner } from '~ui/src/styles/Spinner'
import { Radio, RadioGroup } from '~ui/src/design-system/components/Radio'
import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValue } from '~ui/src/design-system/components/Select'
import { slotTabsOptions } from '~ui/src/design-system/components/tabs-bar'

// With more than two order types the tabs are two groups, a dropdown when
// the group has more than one: delivery (and catering delivery), and the
// ones picked up (and catering pickup, reservation)
const ORDER_TYPE_GROUPS = [[1, 7], [2, 3, 4, 5, 8, 9]]

// The icon of each order type: the tabs, the rich listbox (this component's
// group dropdown and OrderContextUI's quick switch) all share it. All
// outline, like bag/shop/carFront/calendar (truckOutline and car — the
// registry's shared truckDelivery/carSide are solid glyphs other screens
// already rely on, so this reuses different keys instead of restyling them).
export const ORDER_TYPE_ICONS = {
  1: 'truckOutline',
  2: 'bag',
  3: 'shop',
  4: 'carFront',
  5: 'car',
  7: 'truckOutline',
  8: 'bag',
  9: 'calendar'
}

// The order types this control knows by default (a caller's own
// `orderTypes` prop replaces it); OrderContextUI's quick switch (the cart
// line, the narrow checkout fallback) reuses it so every surface describes
// the same types the same way.
export const defaultOrderTypes = (t) => [
  { value: 1, text: t('DELIVERY', 'Delivery'), description: t('ORDERTYPE_DESCRIPTION_DELIVERY', 'We bring your order to your door'), icon: ORDER_TYPE_ICONS[1] },
  { value: 2, text: t('PICKUP', 'Pickup'), description: t('ORDERTYPE_DESCRIPTION_PICKUP', 'Order ahead and pick it up at the store'), icon: ORDER_TYPE_ICONS[2] },
  { value: 3, text: t('EAT_IN', 'Eat in'), description: t('ORDERTYPE_DESCRIPTION_EATIN', 'Order ahead and enjoy it at the restaurant'), icon: ORDER_TYPE_ICONS[3] },
  { value: 4, text: t('CURBSIDE', 'Curbside'), description: t('ORDERTYPE_DESCRIPTION_CURBSIDE', 'We bring your order out to your car'), icon: ORDER_TYPE_ICONS[4] },
  { value: 5, text: t('DRIVE_THRU', 'Drive thru'), description: t('ORDERTYPE_DESCRIPTION_DRIVETHRU', 'Pick up your order without leaving your car'), icon: ORDER_TYPE_ICONS[5] },
  { value: 7, text: t('CATERING_DELIVERY', 'Catering Delivery'), description: t('ORDERTYPE_DESCRIPTION_CATERING_DELIVERY', 'Food for groups, delivered to your event'), icon: ORDER_TYPE_ICONS[7] },
  { value: 8, text: t('CATERING_PICKUP', 'Catering Pickup'), description: t('ORDERTYPE_DESCRIPTION_CATERING_PICKUP', 'Food for groups, ready for you to pick up'), icon: ORDER_TYPE_ICONS[8] },
  { value: 9, text: t('RESERVATION', 'Reservation'), description: t('ORDERTYPE_DESCRIPTION_RESERVATION', 'Book a table in advance'), icon: ORDER_TYPE_ICONS[9] }
]

const orderTypeControllerProps = (t, configState, props) => ({
  ...props,
  configTypes: configState?.configs?.order_types_allowed?.value?.split('|').map((value) => Number(value)) || [],
  orderTypes: props.orderTypes || defaultOrderTypes(t)
})

// The rich list of a group's order types (icon, name, one line of description
// and a check on the chosen one): the base Select's, shared by the capsule's
// group segment below and by the quick switch.
const RichTypes = ({ types, ...props }) => (
  <SelectContent variant='rich' {...props}>
    {types.map((type) => (
      <SelectItem
        key={type.value}
        value={type.value}
        icon={type.icon ? <OrderIcon name={type.icon} aria-hidden='true' /> : undefined}
        description={type.description}
        indicator
      >
        {type.text}
      </SelectItem>
    ))}
  </SelectContent>
)

// What a type shows once chosen: its icon (a spinner while it is the one changing) and name
const typeItem = (type, pending) => ({
  value: type.value,
  label: (
    <>
      {pending ? <Spinner $size='sm' /> : <OrderIcon name={type.icon} aria-hidden='true' />}
      <OrderTypeLabel title={type.text}>{type.text}</OrderTypeLabel>
    </>
  )
})

/**
 * A segment of the bar whose order types open in a rich list under it (icon,
 * name, one line of description): the base Select's, scrolled when the screen
 * has no room. It shows the chosen one of them, else the first, and is marked
 * only when the chosen type is one of its own.
 */
const OrderTypeGroupSegment = ({ types, typeSelected, disabled, pending, onSelect }) => {
  const matched = types.find((type) => type.value === typeSelected)
  const selected = matched || types[0]
  return (
    // no value while the chosen type is another group's: the trigger keeps the first type's label, the list marks nothing
    <SelectRoot
      value={matched ? matched.value : null}
      disabled={disabled}
      onValueChange={(value) => onSelect(value)}
      items={types.map((type) => typeItem(type, pending === type.value))}
    >
      <SelectTrigger variant='segment' active={!!matched} aria-busy={pending != null || undefined} title={selected.text}>
        <SelectValue>{matched ? undefined : typeItem(selected, pending === selected.value).label}</SelectValue>
      </SelectTrigger>
      <RichTypes types={types} aria-label={selected.text} />
    </SelectRoot>
  )
}

export const AddressOrderTypeUI = (props) => {
  const {
    handleChangeOrderType,
    orderTypes,
    configTypes,
    typeSelected,
    setOrderTypeValue,
    hideOrderTypes
  } = props

  const [, t] = useLanguage()
  const [orderState] = useOrder()
  const theme = useTheme()
  const loading = !!orderState?.loading
  const [pendingValue, setPendingValue] = useState(null)

  const orderTypesAllowed = orderTypes && (configTypes ? orderTypes.filter(type => configTypes?.includes(type.value)) : orderTypes)
  // no order type to choose (the configuration still loading, or none
  // allowed): no tabs at all, not an empty box
  const hasOrderTypes = orderTypesAllowed?.length > 0

  // the pending spinner clears once the order has finished changing
  useEffect(() => {
    if (!loading) setPendingValue(null)
  }, [loading])

  const handleChangeOrderTypeCallback = async (orderType) => {
    if (!loading) {
      setPendingValue(orderType)
      setOrderTypeValue && setOrderTypeValue(orderType)
      await handleChangeOrderType(orderType)
    }
  }

  const tabs = !hasOrderTypes || hideOrderTypes
    ? []
    : (orderTypesAllowed.length > 2 ? ORDER_TYPE_GROUPS : orderTypesAllowed.map((type) => [type.value]))
        .map((group) => orderTypesAllowed.filter((type) => group.includes(type.value)))
        .filter((types) => types.length > 0)

  if (!hasOrderTypes || hideOrderTypes) {
    return <AddressOrderTypeWrapper hideOrderTypes={hideOrderTypes} />
  }

  // a single allowed type: a label (icon + name), nothing to choose
  if (orderTypesAllowed.length === 1) {
    const only = orderTypesAllowed[0]
    return (
      <AddressOrderTypeWrapper>
        <OrderTypesContainer data-doc-section='header-order-types' className='order-type'>
          <OrderTypeStatic>
            <VisuallyHidden>{t('ORDER_TYPE_PREFIX', 'Order type: ')}</VisuallyHidden>
            {only.icon && <OrderIcon name={only.icon} aria-hidden='true' />}
            <OrderTypeLabel title={only.text}>{only.text}</OrderTypeLabel>
          </OrderTypeStatic>
        </OrderTypesContainer>
      </AddressOrderTypeWrapper>
    )
  }

  const pendingLabel = pendingValue != null ? orderTypesAllowed.find((type) => type.value === pendingValue)?.text : null
  // the radio chosen is the single type selected; a type of a group is the select's
  const single = tabs.find((types) => types.length === 1 && types[0].value === typeSelected)

  return (
    <AddressOrderTypeWrapper>
      <OrderTypesContainer data-doc-section='header-order-types' className='order-type'>
        <OrderTypeBar>
          {/* the header's tabs (header.scope.tabs, else the global), the slot's size and variant */}
          <RadioGroup
            segmented
            capsule
            activation='manual'
            group='header'
            {...slotTabsOptions(theme, 'header', 'order_type')}
            aria-label={t('ORDER_TYPE', 'Order type')}
            value={single ? String(single[0].value) : ''}
            onValueChange={(value) => handleChangeOrderTypeCallback(Number(value))}
            disabled={loading}
          >
            {tabs.map((types) => types.length === 1
              ? (
                <Radio
                  key={types[0].value}
                  appearance='segment'
                  value={String(types[0].value)}
                  title={types[0].text}
                  icon={loading && pendingValue === types[0].value
                    ? <Spinner $size='sm' />
                    : <OrderIcon name={types[0].icon} aria-hidden='true' />}
                  label={<OrderTypeLabel>{types[0].text}</OrderTypeLabel>}
                />
                )
              : (
                <OrderTypeGroupSegment
                  key={types[0].value}
                  types={types}
                  typeSelected={typeSelected}
                  disabled={loading}
                  pending={loading && types.some((type) => type.value === pendingValue) ? pendingValue : null}
                  onSelect={handleChangeOrderTypeCallback}
                />
                ))}
          </RadioGroup>
        </OrderTypeBar>
        {pendingLabel && (
          <VisuallyHidden role='status'>
            {t('CHANGING_ORDER_TYPE_TO', 'Changing order type to _TYPE_…').replace('_TYPE_', pendingLabel)}
          </VisuallyHidden>
        )}
      </OrderTypesContainer>
    </AddressOrderTypeWrapper>
  )
}

export const AddressOrderType = (props) => {
  const [, t] = useLanguage()
  const [configState] = useConfig()

  const orderTypeProps = {
    ...orderTypeControllerProps(t, configState, props),
    UIComponent: AddressOrderTypeUI
  }

  return <OrderTypeControl {...orderTypeProps} />
}

/**
 * A quick switch (OrderContextUI's cart line, its narrow checkout fallback):
 * a trigger the caller renders (`renderTrigger(triggerProps, selected, open)`)
 * that opens the same rich list as the capsule's group segment, over every
 * allowed order type (flat, not grouped) — no modal.
 */
export const OrderTypeQuickSwitch = (props) => {
  const { renderTrigger, ariaLabel, ...rest } = props
  const [, t] = useLanguage()
  const [configState] = useConfig()

  const orderTypeProps = {
    ...orderTypeControllerProps(t, configState, rest),
    UIComponent: (ctrlProps) => (
      <OrderTypeQuickSwitchUI {...ctrlProps} renderTrigger={renderTrigger} ariaLabel={ariaLabel} />
    )
  }

  return <OrderTypeControl {...orderTypeProps} />
}

const OrderTypeQuickSwitchUI = (props) => {
  const { handleChangeOrderType, orderTypes, configTypes, typeSelected, renderTrigger, ariaLabel } = props
  const [orderState] = useOrder()
  const orderTypesAllowed = orderTypes && (configTypes ? orderTypes.filter((type) => configTypes.includes(type.value)) : orderTypes)

  if (!orderTypesAllowed?.length) return null
  const matched = orderTypesAllowed.find((type) => type.value === typeSelected)
  const selected = matched || orderTypesAllowed[0]

  return (
    <SelectRoot
      value={matched ? matched.value : null}
      disabled={!!orderState?.loading}
      onValueChange={(value) => handleChangeOrderType(value)}
      items={orderTypesAllowed.map((type) => typeItem(type, false))}
    >
      {/* the caller's own trigger (a link, a field button): the select only lends it its behavior (focus, keys, aria); a combobox takes its name from a label, not from its text */}
      <SelectTrigger
        render={({ className, style, children, ...triggerProps }, state) => renderTrigger({ ...triggerProps, 'aria-label': ariaLabel }, selected, state.open)}
      />
      <RichTypes types={orderTypesAllowed} aria-label={ariaLabel} />
    </SelectRoot>
  )
}
