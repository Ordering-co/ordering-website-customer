import React, { useState, useRef } from 'react'

import {
  DriverTipContainer,
  FormDriverTip,
  WrapperInput,
  TipInputSlot,
  WrapperTips,
  TipChips
} from './styles'

import { DriverTips as DriverTipsController } from '~components/components/DriverTips'
import { useUtils } from '~components/contexts/UtilsContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { Input } from '~ui/src/design-system/components/Input'
import { Button } from '~ui/src/design-system/components/Button'
import { RadioGroup } from '~ui/src/design-system/components/Checkbox'
import { Choice } from '~ui/src/design-system/components/Choice'
import { Icon } from '~ui/src/design-system/components/Icon'

const CUSTOM_TIP = 'custom'

const DriverTipsUI = (props) => {
  const {
    driverTip,
    driverTipsOptions,
    isDriverTipUseCustom,
    handlerChangeOption
  } = props
  const [{ parsePrice }] = useUtils()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()

  const [value, setvalue] = useState('')
  // the custom tip field shows only while adding or editing one
  const [isEditingTip, setIsEditingTip] = useState(false)
  const customChoiceRef = useRef(null)
  const [tipDraft, setTipDraft] = useState(null)
  const isFixedPriceType = parseInt(configs?.driver_tip_type?.value, 10) === 1

  const tipLabel = (tip) => isFixedPriceType ? parsePrice(tip) : `${tip}%`

  // a current tip that is none of the options is a custom amount,
  // a choice of its own (in place of Custom) that opens the field to edit it
  const isCurrentTip = (option) => Number(option) === Number(driverTip)
  const hasCustomTip = isDriverTipUseCustom && parseFloat(driverTip || 0) > 0 && !driverTipsOptions.some(isCurrentTip)
  const savedTip = isEditingTip || hasCustomTip ? CUSTOM_TIP : driverTipsOptions.find(isCurrentTip) ?? null
  // Moving through the radio group does not write to the active cart.
  const draftAvailable = tipDraft === CUSTOM_TIP ? isDriverTipUseCustom : driverTipsOptions.includes(tipDraft)
  const selectedTip = draftAvailable ? tipDraft : savedTip

  const closeCustomTip = ({ restoreFocus = false } = {}) => {
    setTipDraft(null)
    setIsEditingTip(false)
    setvalue('')
    if (restoreFocus) customChoiceRef.current?.focus()
  }

  const dismissCustomTip = () => closeCustomTip({ restoreFocus: true })

  const toggleCustomTip = () => {
    if (isEditingTip) return closeCustomTip()
    setTipDraft(null)
    setvalue(hasCustomTip ? String(driverTip) : '')
    setIsEditingTip(true)
  }

  const choosePreset = (option) => {
    handlerChangeOption(option)
    closeCustomTip()
  }

  const handleChangeDriverTip = (e) => {
    const inputValue = e?.target?.value
    if ((!isFixedPriceType && inputValue.length > 3) || (inputValue.length > 10)) return

    const tip = Number(inputValue)
    if ((isNaN(tip) || tip < 0)) return
    setvalue(inputValue)
  }

  const placeholderCurrency = !isFixedPriceType
    ? '0%'
    : (configs?.currency_position?.value || 'left') === 'left'
        ? `${configs?.format_number_currency?.value}0`
        : `0${configs?.format_number_currency?.value}`

  return (
    <DriverTipContainer id='driver-tip-container'>
      <>
        <WrapperTips isDriverTipUseCustom={isDriverTipUseCustom}>
          <RadioGroup render={<TipChips />} value={selectedTip} onValueChange={setTipDraft} aria-label={t('DRIVER_TIPS', 'Driver Tips')}>
            {/* a single choice row of components.choice */}
            {driverTipsOptions.map((option, i) => (
              <Choice
                variant='tip-tile'
                key={i}
                value={option}
                onActivate={() => choosePreset(option)}
              >
                {tipLabel(option)}
              </Choice>
            ))}
            {isDriverTipUseCustom && (
              <Choice ref={customChoiceRef} variant='tip-tile' value={CUSTOM_TIP} onActivate={toggleCustomTip}>
                {hasCustomTip ? tipLabel(driverTip) : t('CUSTOM_TIP', 'Custom')}
                {/* the amount can be changed: a hint of the edit it opens */}
                {hasCustomTip && <Icon name='pencil' aria-hidden='true' />}
              </Choice>
            )}
          </RadioGroup>
          {isEditingTip &&
            <FormDriverTip
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return
                event.preventDefault()
                event.stopPropagation()
                dismissCustomTip()
              }}
            >
                <WrapperInput>
                  <TipInputSlot>
                    <Input
                      name='drivertip'
                      type='number'
                      value={value}
                      placeholder={placeholderCurrency}
                      onChange={handleChangeDriverTip}
                      // it opens on demand, ready to type; Escape closes it
                      autoFocus
                    />
                  </TipInputSlot>
                  <Button
                    color='primary'
                    // md, the size of the fields
                    size='md'
                    disabled={parseFloat(value || 0) < 0 || parseFloat(value || 0) === driverTip || value === ''}
                    onClick={() => {
                      handlerChangeOption(value)
                      // The new amount shows as the selected custom choice.
                      dismissCustomTip()
                    }}
                  >
                    {t('APPLY_TIP', 'Apply Tip')}
                  </Button>
                  <Button type='button' shape='icon' size='md' color='neutral' appearance='ghost' aria-label={t('CANCEL', 'Cancel')} onClick={dismissCustomTip}>
                    <Icon name='close' />
                  </Button>
                </WrapperInput>
            </FormDriverTip>
          }
          {/* the amount is already the selected choice and the bill shows
              what it costs: no message repeats it */}
        </WrapperTips>
      </>
    </DriverTipContainer>
  )
}

export const DriverTips = (props) => {
  const driverTipsProps = {
    ...props,
    UIComponent: DriverTipsUI
  }

  return <DriverTipsController {...driverTipsProps} />
}
