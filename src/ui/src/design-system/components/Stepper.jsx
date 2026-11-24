// The quantity control (− value +) of a line, a product or a sub-option. It is made of the base
// `Button` (the − and the +) in the box and the value of `components.stepper`.
import React from 'react'
import { useTheme } from 'styled-components'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { getThemeComponent } from '~/utils/themeCss'
import { DEFAULT_CONTROL_SIZE } from '~/utils/themeTokens'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { Button } from './Button'
import { createIcon } from './createIcon'
import '../styles.css'

// The three glyphs alone, not the whole icon registry (a quantity is in the first screens).
const StepperIcon = createIcon({ minus: Minus, plus: Plus, remove: Trash2 })

const SIZES = ['sm', 'md', 'lg']
const APPEARANCES = ['solid', 'outline', 'tonal', 'ghost']
const stepperSize = (size) => (SIZES.includes(size) ? size : DEFAULT_CONTROL_SIZE)

// Every value is `components.stepper`, written on the root by `componentVars`; a class only says
// which property reads which variable. The value's text style is inherited by the editable input.
const BOX = 'ui:box-border ui:inline-flex ui:shrink-0 ui:items-center ui:justify-between ui:max-w-full ui:gap-xs'
const FRAME = 'ui:h-(--ui-stepper-height) ui:rounded-(--ui-stepper-radius) ui:[border:var(--ui-stepper-border)]'
const VALUE_TEXT = [
  'ui:font-(family-name:--ui-stepper-value-family) ui:text-(length:--ui-stepper-value-size) ui:leading-(--ui-stepper-value-line) ui:font-(weight:--ui-stepper-value-weight)',
  'ui:[letter-spacing:var(--ui-stepper-value-letter-spacing,normal)] ui:[text-transform:var(--ui-stepper-value-transform,none)]',
  'ui:text-(--ui-stepper-value-color) ui:text-center ui:tabular-nums'
]
const VALUE = ['ui:min-w-[2ch] ui:px-xs ui:m-none ui:whitespace-nowrap', ...VALUE_TEXT]
// An editable value has no box of its own: the stepper's is the one. (the width is its characters)
const INPUT = [
  'ui:box-border ui:w-[calc(var(--ui-stepper-input-chars)*1ch)] ui:min-w-[2ch] ui:h-auto ui:p-none ui:m-none',
  'ui:[border:none] ui:rounded-none ui:[box-shadow:none] ui:bg-transparent ui:select-text ui:[font-family:inherit]',
  // the typed value answers in 44 x 44 px (its neighbors' areas end in the gap, so none overlaps it); the box has
  // no paint, and the frame keeps its height (the field centers on it and overflows it)
  /* touch-target */ 'ui:max-mobile:min-h-[44px] ui:max-mobile:min-w-[44px] ui:pointer-coarse:min-h-[44px] ui:pointer-coarse:min-w-[44px]',
  ...VALUE_TEXT
]

/**
 * The quantity control of the theme in scope: a group of two real buttons (the base `Button`)
 * around the value, in `components.stepper`.
 *
 * - `value`, `onDecrement`, `onIncrement`: the value is text (`aria-live='polite'`); a button
 *   with no handler, or with `decrementDisabled` / `incrementDisabled`, is disabled.
 * - `size`: `sm`, `md` (default) or `lg`: the height of the box and the size of its buttons.
 *   Inside a border the buttons are the square within it.
 * - `removable`: at a value of 1 the − is a trash named Remove (`decrementLabel` wins): the
 *   caller's `onDecrement` is the one that removes.
 * - `compact`: for a quantity that sits inside a row (a sub-option): no frame of its own (no
 *   height, radius or border) and the buttons of the theme's `xs` size.
 * - `decrementLabel`, `incrementLabel`: the names (translated; defaults are the English ones);
 *   `decrementProps`, `incrementProps`: anything else for each button (`data-*`).
 * - `children` replace the value text: `StepperInput` for a quantity that can be typed.
 * - The buttons are `components.stepper.base.button_appearance` (ghost when it is unknown) in the primary.
 */
export const Stepper = React.forwardRef(({
  className, style, value, onDecrement, onIncrement, decrementDisabled, incrementDisabled, size,
  removable = false, compact = false, decrementLabel, incrementLabel, decrementProps, incrementProps, children, ...props
}, ref) => {
  const theme = useTheme()
  const [, t] = useLanguage()
  const stepSize = stepperSize(size)
  const base = getThemeComponent(theme, 'stepper').base
  const appearance = APPEARANCES.includes(base.button_appearance) ? base.button_appearance : 'ghost'
  const vars = componentVars(theme, 'stepper', { size: stepSize })
  if (compact) ['--ui-stepper-height', '--ui-stepper-radius', '--ui-stepper-border'].forEach((name) => delete vars[name])
  const rim = compact ? 0 : (base.border?.width ?? 0)
  const buttonStyle = rim > 0 ? { '--ui-button-height': `calc(var(--ui-stepper-height) - ${2 * rim}px)` } : undefined
  const buttonProps = { type: 'button', shape: 'icon', color: 'primary', appearance, size: compact ? 'xs' : stepSize, style: buttonStyle }
  const remove = removable && value === 1
  return (
    <div
      ref={ref}
      role='group'
      data-slot='stepper'
      data-compact={compact ? '' : undefined}
      {...props}
      style={{ ...vars, ...style }}
      className={cn(BOX, !compact && FRAME, className)}
    >
      <Button
        {...buttonProps}
        aria-label={decrementLabel || (remove ? t('REMOVE', 'Remove') : t('DECREASE_QUANTITY', 'Decrease quantity'))}
        disabled={!!decrementDisabled || !onDecrement}
        onClick={onDecrement}
        {...decrementProps}
      >
        <StepperIcon name={remove ? 'remove' : 'minus'} />
      </Button>
      {children ?? <span aria-live='polite' className={cn(VALUE)}>{value}</span>}
      <Button
        {...buttonProps}
        aria-label={incrementLabel || t('INCREASE_QUANTITY', 'Increase quantity')}
        disabled={!!incrementDisabled || !onIncrement}
        onClick={onIncrement}
        {...incrementProps}
      >
        <StepperIcon name='plus' />
      </Button>
    </div>
  )
})
Stepper.displayName = 'Stepper'

/**
 * An editable value for `Stepper` (a product's quantity, which can be typed): the value's text
 * and color of the stepper, with no box of its own. `chars` is its width in characters (4 by
 * default). Name it with `aria-label`; the rest goes to the `<input>`.
 */
export const StepperInput = React.forwardRef(({ className, style, chars = 4, ...props }, ref) => (
  <input
    ref={ref}
    data-slot='stepper-input'
    {...props}
    style={{ '--ui-stepper-input-chars': Number(chars) > 0 ? Number(chars) : 4, ...style }}
    className={cn(INPUT, className)}
  />
))
StepperInput.displayName = 'StepperInput'
