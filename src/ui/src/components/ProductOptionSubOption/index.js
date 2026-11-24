import React, { useState, useEffect, useRef } from 'react'
import { SubOptionRow, SubOptionExtras, StepperEnd, HalvesRow, HalfGlyph } from './styles'
import { SubOptionRadioGroup, useJoinSubOptionGroup } from './SubOptionRadioGroup'

import { useTheme } from 'styled-components'
import { ProductOptionSuboption as ProductSubOptionController } from '~components/components/ProductOptionSuboption'
import { useUtils } from '~components/contexts/UtilsContext'
import { useLanguage } from '~components/contexts/LanguageContext'

// the form's own alert (a Dialog nested in the product's window, so it is over it whatever is under)
import { ProductAlert } from '~ui/src/components/ProductForm/ProductDialogs'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { Stepper } from '~ui/src/design-system/components/Stepper'
import { OptionLimit } from '~ui/src/components/ProductOption/styles'
import { Choice } from '~ui/src/design-system/components/Choice'
import { Radio, RadioGroup } from '~ui/src/design-system/components/Checkbox'
import { Icon } from '~ui/src/design-system/components/Icon'
import { slotTabsOptions } from '~ui/src/design-system/components/Tabs'

import { hasImage, isSingleChoice, reservesImageBox, showsPrice, suboptionMaxReached } from '~/utils/productOptionTheme'
import { themeVisible } from '~/utils/themeVisibility'

// The halves of a sub-option of a group with halves (pizza): one segmented control
const HALVES = [
  // circleHalf fills its left half: the right one is it turned
  { position: 'left', icon: 'circleHalf', reverse: false, key: 'LEFT_HALF', fallback: 'Left half' },
  { position: 'whole', icon: 'circleFill', reverse: false, key: 'WHOLE', fallback: 'Whole' },
  { position: 'right', icon: 'circleHalf', reverse: true, key: 'RIGHT_HALF', fallback: 'Right half' }
]

const ProductOptionSubOptionPropsAreEqual = (prevProps, nextProps) => {
  return JSON.stringify(prevProps.state) === JSON.stringify(nextProps.state) &&
    JSON.stringify(prevProps.pizzaState) === JSON.stringify(nextProps.pizzaState) &&
    prevProps.balance === nextProps.balance &&
    // implementation notesisSoldOut can now flip (closed -> scheduled) without a
    // remount (schedulePending keeps the same key while the picker is still
    // open) and with every other compared prop unchanged — missing it here
    // left suboptions stuck disabled after reactivating
    prevProps.isSoldOut === nextProps.isSoldOut &&
    // implementation notesisReadOnly (the store closed, apart from isSoldOut) flips
    // the same way once a schedule is confirmed
    prevProps.isReadOnly === nextProps.isReadOnly &&
    JSON.stringify(prevProps.productCart) === JSON.stringify(nextProps.productCart)
}

const ProductOptionSubOptionUI = React.memo((props) => {
  const {
    state,
    increment,
    decrement,
    balance,
    option,
    suboption,
    toggleSelect,
    changePosition,
    isSoldOut,
    isReadOnly,
    setIsScrollAvailable,
    usePizzaValidation,
    pizzaState
  } = props

  const maxByPosition = state.position === 'whole'
    ? suboption?.max
    : suboption?.max * 2

  const shouldApplyHalfLogic = option?.with_half_option && option?.allow_suboption_quantity && option?.limit_suboptions_by_max

  const wouldExceedMaxInWhole = shouldApplyHalfLogic && state.position === 'whole' && option?.max != null
    ? (balance - state.quantity + (state.quantity + 1)) > option?.max
    : false

  const pizzaAtOrOverMax = option?.max != null && pizzaState?.[`option:${option?.id}`]?.value >= option?.max

  const disableIncrement =
    option?.with_half_option
      ? shouldApplyHalfLogic
        ? state.quantity === maxByPosition || pizzaAtOrOverMax || wouldExceedMaxInWhole
        : pizzaAtOrOverMax
      : option?.limit_suboptions_by_max
        ? (balance === option?.max || state.quantity === suboption.max)
        : state.quantity === suboption?.max || (!state.selected && balance === option?.max)

  const price = option?.with_half_option && suboption?.half_price && state.position !== 'whole' ? suboption?.half_price : suboption?.price
  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()
  const [showMessage, setShowMessage] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const dirtyRef = useRef(null)

  const handleSuboptionClick = () => {
    dirtyRef.current = true
    toggleSelect()
    const minMaxValidation = option?.with_half_option ? usePizzaValidation : (balance === option?.max && option?.suboptions?.length > balance && !(option?.min === 1 && option?.max === 1))
    if (!state.selected && minMaxValidation) {
      setShowMessage(true)
      setShowAlert(true)
    }
  }

  useEffect(() => {
    const minMaxValidation = option?.with_half_option ? usePizzaValidation : (!state.selected && balance === option?.max && option?.suboptions?.length > balance && !(option?.min === 1 && option?.max === 1))
    if (!minMaxValidation) {
      setShowMessage(false)
    }
  }, [balance, pizzaState?.[`option:${option?.id}`]?.value])

  useEffect(() => {
    if (balance === option?.max && state?.selected && dirtyRef) {
      if (dirtyRef?.current !== null) {
        dirtyRef.current = false
        setIsScrollAvailable(true)
      }
    }
  }, [state?.selected])

  const theme = useTheme()
  const single = isSingleChoice(option)
  // implementation notessold out or the store closed (read-only) look the same: the row keeps its look,
  // only the control and the price dim (`unavailable`); maxReached alone dims the whole row
  const readOnlyLook = !!isSoldOut || !!isReadOnly
  // a single choice is blocked only while sold out or read-only, as it always was
  const disabled = readOnlyLook || (!single && suboptionMaxReached({ option, state, balance, usePizzaValidation }))
  // a single choice inside a SubOptionRadioGroup (the radiogroup ProductOption puts around the
  // rows) is chosen through it: by the arrows too, with this same handler
  const inGroup = useJoinSubOptionGroup(suboption?.id, () => { if (!disabled) handleSuboptionClick() })
  // the "+ price" under the name (visibility product.options.price)
  const showPrice = themeVisible(theme, 'product.options.price')

  // the sub-option is an option of a choice list (a Choice of the design system,
  // components.choice): a single choice with the radio indicator, a multiple one with its
  // checkbox; selected, disabled while sold out or, unselected, when its group reached its max
  // (not clickable: no max alert). Its image box, the price under the name (none at 0), the
  // stepper and the halves (the row's own `end` slot in a multiple choice, under the row in a single one) take the group's components (scope).
  const renderThemeRow = () => {
    const showStepper = !(option?.max === 1 && option?.min === 1) && option?.allow_suboption_quantity && state?.selected
    const docProps = {
      'data-doc-control': 'product-suboption',
      'data-doc-suboption-id': suboption?.id,
      'data-doc-selected': state?.selected ? 'true' : 'false'
    }
    // the image box exists only in a group with images (and visible): then a row without one keeps it empty
    const reserveImage = reservesImageBox(theme, option)
    const choiceProps = {
      ...docProps,
      title: suboption?.name,
      secondary: showPrice && showsPrice(price) ? `+ ${parsePrice(price)}` : undefined,
      image: reserveImage && hasImage(suboption?.image) ? suboption.image : undefined,
      reserveImage,
      disabled,
      unavailable: readOnlyLook
    }
    const stepper = showStepper && (
      <Stepper
        compact
        value={state.quantity}
        onDecrement={() => decrement()}
        onIncrement={() => increment()}
        decrementDisabled={state.quantity === 0 || isSoldOut || isReadOnly}
        incrementDisabled={disableIncrement || isSoldOut || isReadOnly || usePizzaValidation}
      />
    )
    // a segmented radio group: the `halves` slot's size and style, else small and the group's default
    // style of the tabs (slotTabsOptions); the arrows choose the half
    const halves = option?.with_half_option && state?.selected && (
      <HalvesRow>
        <RadioGroup
          segmented
          {...slotTabsOptions(theme, 'product_option', 'halves', { size: 'sm' })}
          aria-label={suboption?.name}
          value={state.position}
          onValueChange={(position) => changePosition(position)}
          disabled={readOnlyLook}
        >
          {HALVES.map(half => (
            <Radio
              key={half.position}
              appearance='segment'
              value={half.position}
              title={t(half.key, half.fallback)}
              icon={<HalfGlyph $reverse={half.reverse}><Icon name={half.icon} /></HalfGlyph>}
              label={t(half.key, half.fallback)}
            />
          ))}
        </RadioGroup>
      </HalvesRow>
    )
    // A single choice inside a SubOptionRadioGroup (the one ProductOption puts around the option's
    // rows) is one of its radios: a click on an unselected row, the arrows and the group's
    // value do the choosing; only the selected row's own click (to unselect) is ours. Without
    // that group it is a group of one, as it was.
    if (single) {
      const row = inGroup
        ? <Choice {...choiceProps} value={String(suboption?.id)} onClick={() => { if (!disabled && state?.selected) handleSuboptionClick() }} />
        : (
          <RadioGroup value={state?.selected ? 'on' : ''} aria-label={option?.name}>
            <Choice {...choiceProps} value='on' onClick={() => { if (!disabled) handleSuboptionClick() }} />
          </RadioGroup>
          )
      return (
        <SubOptionRow>
          {row}
          {(stepper || halves) && <SubOptionExtras>{stepper}{halves}</SubOptionExtras>}
        </SubOptionRow>
      )
    }
    // a multiple choice: the stepper and the halves are the row's own, at its end
    return (
      <Choice
        {...choiceProps}
        type='check'
        checked={!!state?.selected}
        onCheckedChange={() => { if (!disabled) handleSuboptionClick() }}
        end={(stepper || halves) ? <>{stepper && <StepperEnd>{stepper}</StepperEnd>}{halves}</> : undefined}
      />
    )
  }

  return (
    <>
      <ComponentScope group='product_option'>{renderThemeRow()}</ComponentScope>
      {/* the group's limits text (components.product_option description) in
          its error color */}
      {showMessage && <OptionLimit $error>{`${t('OPTIONS_MAX_LIMIT', 'Maximum options to choose')}: ${option?.max}`}</OptionLimit>}
      <ProductAlert
        title={t('PRODUCT_FORM', 'Product form')}
        content={[`${t('OPTIONS_MAX_LIMIT', 'Maximum options to choose')}: ${option?.max}`]}
        open={showAlert && showMessage}
        onClose={() => setShowAlert(false)}
      />
    </>
  )
}, ProductOptionSubOptionPropsAreEqual)

export { SubOptionRadioGroup }

export const ProductOptionSubOption = (props) => {
  const productOptionSubOptionProps = {
    ...props,
    UIComponent: ProductOptionSubOptionUI,
    isOrigin: true
  }

  return (
    <ProductSubOptionController {...productOptionSubOptionProps} />
  )
}
