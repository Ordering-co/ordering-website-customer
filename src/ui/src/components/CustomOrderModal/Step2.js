import React, { useId, useState } from 'react'
import { useTheme } from 'styled-components'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import {
  ModalBody,
  StepSubtitle,
  FormGroup,
  Label,
  MinMaxRow,
  MinMaxLink,
  StepActions,
  ItemList,
  ItemRow,
  DeliveryFeeDisplay
} from './styles'

import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Input } from '~ui/src/design-system/components/Input'
import { Radio, RadioGroup } from '~ui/src/design-system/components/Checkbox'
import { Textarea } from '~ui/src/design-system/components/Textarea'
import { themeColor } from '~/utils/themeColors'
import { themeSpace, themeTextStyle } from '~/utils/themeTokens'

export const Step2 = ({ distanceKm, pluginConfig, actionState, initialData, onPlaceOrder, onBack }) => {
  const [, t] = useLanguage()
  // its labels tie to their fields
  const fieldsId = useId()
  const theme = useTheme()
  const [{ parsePrice }] = useUtils()

  const [items, setItems] = useState(initialData?.items?.length > 0 ? initialData.items : [{ name: '', quantity: 1 }])
  const [paymethod, setPaymethod] = useState(initialData?.paymethod || 'cash')
  const [instructions, setInstructions] = useState(initialData?.instructions || '')
  const minDeclaredValue = 30
  const maxDeclaredValue = 5500
  const [declaredValue, setDeclaredValue] = useState(initialData?.declaredValue || String(minDeclaredValue))

  const multiplier = pluginConfig?.delivery_fee_multiplier || 0
  const deliveryFee = distanceKm && multiplier ? Math.round(distanceKm * multiplier * 100) / 100 : 0

  const validItems = items.filter(item => item.name.trim())
  const canPlaceOrder = validItems.length > 0 && !actionState?.loading

  const handleAddItem = () => {
    setItems(prev => [...prev, { name: '', quantity: 1 }])
  }

  const handleUpdateQty = (index, increment) => {
    if (!increment && items[index]?.quantity <= 1) {
      setItems(prev => prev.filter((_, i) => i !== index))
      return
    }
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      return { ...item, quantity: increment ? item.quantity + 1 : item.quantity - 1 }
    }))
  }

  const handlePlaceOrder = () => {
    if (!canPlaceOrder) return
    onPlaceOrder({ items: validItems, paymethod, instructions, declaredValue })
  }

  const maxWeight = pluginConfig?.max_weight || 0

  return (
    <ModalBody data-doc-section='custom-order-step2' data-doc-state={canPlaceOrder ? 'ready' : 'incomplete'}>
      {maxWeight > 0 && (
        <StepSubtitle>
          {t('CUSTOM_ORDER_MAX_WEIGHT_HINT', 'Your order must not exceed _MAX_ kg in weight').replace('_MAX_', maxWeight)}
        </StepSubtitle>
      )}

      <ItemList>
        {items.map((item, index) => (
          <ItemRow key={index}>
            {/* the name and the quantity share one field: the stepper is the input's suffix */}
            <Input
              data-doc-control='custom-order-item-name'
              placeholder={t('CUSTOM_ORDER_ITEM_NAME_PLACEHOLDER', 'Describe the product')}
              aria-label={t('CUSTOM_ORDER_ITEM_NAME_PLACEHOLDER', 'Describe the product')}
              value={item.name}
              onChange={e => {
                const value = e.target.value
                setItems(prev => prev.map((it, i) => i === index ? { ...it, name: value } : it))
              }}
              suffixWide
              suffix={(
                <>
                  <Button type='button' shape='icon' size='xs' color='neutral' appearance='ghost' data-doc-control='custom-order-quantity-decrease' aria-label={t('DECREASE_QUANTITY', 'Decrease quantity')} onClick={() => handleUpdateQty(index, false)}>
                    <Icon name='dashCircle' />
                  </Button>
                  <span className='qty-value' aria-live='polite'>{item.quantity}</span>
                  <Button type='button' shape='icon' size='xs' color='neutral' appearance='ghost' data-doc-control='custom-order-quantity-increase' aria-label={t('INCREASE_QUANTITY', 'Increase quantity')} onClick={() => handleUpdateQty(index, true)}>
                    <Icon name='plusCircle' />
                  </Button>
                </>
              )}
            />
          </ItemRow>
        ))}
        <Button type='button' appearance='ghost' data-doc-control='custom-order-add-item' onClick={handleAddItem}>
          {t('ADD_ANOTHER_PRODUCT', 'Add another product')}
        </Button>
      </ItemList>

      <FormGroup>
        <Label>{t('CUSTOM_ORDER_PAYMENT_METHOD', 'Payment method')}</Label>
        {/* cash / card on delivery: a segmented bar of the theme (components.tabs) */}
        <RadioGroup segmented aria-label={t('CUSTOM_ORDER_PAYMENT_METHOD', 'Payment method')} value={paymethod} onValueChange={setPaymethod}>
          <Radio appearance='segment' value='cash' data-doc-control='custom-order-paymethod-cash' label={t('CASH', 'Cash')} />
          <Radio appearance='segment' value='card_delivery' data-doc-control='custom-order-paymethod-card-delivery' label={t('CARD_ON_DELIVERY', 'Card on delivery')} />
        </RadioGroup>
      </FormGroup>

      {deliveryFee > 0 && (
        <DeliveryFeeDisplay>
          <span className='fee-label'>{t('DELIVERY_FEE', 'Delivery fee')}</span>
          <span className='fee-value'>{parsePrice(deliveryFee)}</span>
        </DeliveryFeeDisplay>
      )}

      <FormGroup>
        <Label htmlFor={`${fieldsId}-instructions`}>{t('CUSTOM_ORDER_INSTRUCTIONS', 'Additional instructions')}</Label>
        <Textarea
          resize='vertical'
          rows={2}
          id={`${fieldsId}-instructions`}
          data-doc-control='custom-order-instructions'
          placeholder={t('CUSTOM_ORDER_INSTRUCTIONS_PLACEHOLDER', 'Write any additional instructions...')}
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor={`${fieldsId}-declared-value`}>{t('CUSTOM_ORDER_DECLARED_VALUE', 'Select declared value')}</Label>
        <Input
          id={`${fieldsId}-declared-value`}
          data-doc-control='custom-order-declared-value'
          type='number'
          min={minDeclaredValue}
          max={maxDeclaredValue}
          step='0.01'
          placeholder={parsePrice(minDeclaredValue)}
          value={declaredValue}
          onChange={e => setDeclaredValue(e.target.value)}
        />
        <MinMaxRow>
          {/* text actions of the theme (components.link) */}
          <MinMaxLink data-doc-control='custom-order-declared-min' onClick={() => setDeclaredValue(String(minDeclaredValue))}>
            <strong>{t('MIN', 'Min')}</strong><br />{parsePrice(minDeclaredValue)}
          </MinMaxLink>
          <MinMaxLink data-doc-control='custom-order-declared-max' style={{ textAlign: 'end' }} onClick={() => setDeclaredValue(String(maxDeclaredValue))}>
            <strong>{t('MAX', 'Max')}</strong><br />{parsePrice(maxDeclaredValue)}
          </MinMaxLink>
        </MinMaxRow>
      </FormGroup>

      {actionState?.error && (
        <p style={themeTextStyle(theme, 'body', { color: themeColor(theme, 'danger_text'), fontSize: true, marginBottom: themeSpace(theme, 'md') })}>{actionState.error}</p>
      )}

      <StepActions>
        <Button fullWidth color='neutral' appearance='outline' size='md' data-doc-control='custom-order-back' onClick={() => onBack({ items, paymethod, instructions, declaredValue })} disabled={actionState?.loading}>
          {t('BACK', 'Back')}
        </Button>
        <Button
          fullWidth
          size='md'
          iconEnd={<Icon name='arrowRight' />}
          data-doc-control='custom-order-place'
          onClick={handlePlaceOrder}
          disabled={!canPlaceOrder}
        >
          {actionState?.loading
            ? t('PROCESSING', 'Processing...')
            : t('PLACE_ORDER', 'Place order')
          }
        </Button>
      </StepActions>
    </ModalBody>
  )
}

export default Step2
