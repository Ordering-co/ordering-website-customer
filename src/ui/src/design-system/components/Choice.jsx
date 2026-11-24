// Shaped after shadcn/ui's Base UI radio-group and checkbox (the whole row is the
// control); the look is the theme's (`components.choice`, with the indicator of
// `components.radio` / `components.checkbox`).
import React, { useId } from 'react'
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { useTheme } from 'styled-components'
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cva } from 'class-variance-authority'
import { getThemeComponent } from '~/utils/themeCss'
import { themeOpacity } from '~/utils/themeTokens'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { CheckboxMark, RadioMark, checkboxVars, radioVars, TARGET } from './Checkbox'
import { choiceIconClass, choicePaint, choiceVars } from './choice-surface'
import { SwitchMark, switchVars } from './Switch'
import '../styles.css'

// `components.choice` is written on the row by `componentVars`, and a class only
// says which property reads which variable. The state the theme leaves null
// declares nothing, so selected falls back to the resting look. The keyboard
// focus ring is the app's global one.
const BASE = [
  'ui:relative ui:box-border ui:flex ui:w-full ui:min-w-[0] ui:items-center ui:gap-sm ui:m-none ui:px-lg ui:py-sm ui:text-start ui:outline-none ui:select-none',
  ...choicePaint,
  // the touch target is at least 44 px high on a phone or with a touch screen (see Checkbox)
  'ui:after:absolute ui:after:left-1/2 ui:after:top-1/2 ui:after:size-full ui:after:-translate-x-1/2 ui:after:-translate-y-1/2',
  /* touch-target */ 'ui:max-mobile:after:min-h-[44px] ui:pointer-coarse:after:min-h-[44px]'
]

const row = cva(BASE, {
  variants: {
    // `unavailable` keeps the row as it is and dims only its indicator and secondary text
    unavailable: { true: '', false: 'ui:data-disabled:opacity-(--ui-choice-disabled-opacity)' }
  },
  defaultVariants: { unavailable: false }
})

const DIM = 'ui:opacity-(--ui-choice-muted-opacity)'

// What a row of the product's options adds: the secondary text (the price) and the image box
// are `components.product_option`'s (as the legacy sub-option's were), not `components.choice`'s.
const optionVars = (theme) => Object.fromEntries(Object.entries(componentVars(theme, 'product_option')).filter(([name]) => /^--ui-product-option-(image-|price)/.test(name)))

const SECONDARY = [
  'ui:text-(--ui-product-option-price-color) ui:font-(family-name:--ui-product-option-price-family) ui:text-(length:--ui-product-option-price-size)',
  'ui:leading-(--ui-product-option-price-line) ui:font-(weight:--ui-product-option-price-weight)',
  'ui:[letter-spacing:var(--ui-product-option-price-letter-spacing,normal)] ui:[text-transform:var(--ui-product-option-price-transform,none)]'
]

// Nothing in the slot reaches the row (Base UI listens on the root for click, Space/Enter and press)
const stop = (event) => event.stopPropagation()
const END_EVENTS = { onClick: stop, onKeyDown: stop, onKeyUp: stop, onPointerDown: stop, onPointerUp: stop, onMouseDown: stop, onMouseUp: stop }
// `contents`: its children are the row's own items. They are positioned above the row's touch area
// (an `after` over the whole row); `!` because the legacy controls inside size themselves outside any layer.
const END = [
  'ui:contents ui:[&>*]:relative ui:[&>*]:z-[1]',
  /* touch-target */ 'ui:max-mobile:[&_button]:min-h-[44px]! ui:max-mobile:[&_button]:min-w-[44px]!',
  /* touch-target */ 'ui:pointer-coarse:[&_button]:min-h-[44px]! ui:pointer-coarse:[&_button]:min-w-[44px]!'
]

const IMAGE = 'ui:inline-block ui:shrink-0 ui:size-(--ui-product-option-image-size) ui:rounded-(--ui-product-option-image-radius) ui:bg-secondary ui:bg-cover ui:bg-center ui:bg-no-repeat'

const action = cva([
  'ui:relative ui:box-border ui:items-center ui:m-none ui:outline-none',
  ...choicePaint,
  ...TARGET
], {
  variants: {
    variant: {
      'icon-only-rating': choiceIconClass,
      'time-slot': 'ui:flex ui:w-full ui:min-w-[0] ui:justify-center ui:gap-sm ui:px-lg ui:py-sm ui:text-start ui:data-checked:text-primary-text! ui:data-busy:[&_span]:line-through ui:data-disabled:opacity-(--ui-choice-disabled-opacity)',
      'card-actions': 'ui:flex ui:px-lg ui:py-sm ui:text-start',
      'conversation-row': 'ui:flex ui:px-lg ui:py-md ui:text-start',
      'tip-tile': 'ui:flex ui:w-auto ui:flex-[0_0_auto] ui:justify-center ui:gap-sm ui:px-lg ui:py-sm ui:whitespace-nowrap ui:text-start'
    },
    compact: {
      true: 'ui:p-xs'
    }
  }
})

// The card paints a choice around independent controls, including a separate
// stretched button that opens the profile. The surface owns no keyboard stop.
// `hovered`: the pointer is on something of the row's that is out of it (the actions of a
// saved address, out of its radiogroup); `interactive={false}`: it picks nothing, so it keeps the arrow.
const ChoiceCard = React.forwardRef(({ as: Surface = 'div', className, style, selected, hovered, interactive = true, size, ...props }, ref) => {
  const theme = useTheme()
  return (
    <Surface
      ref={ref}
      {...props}
      data-slot='choice'
      data-checked={selected ? '' : undefined}
      data-hovered={hovered ? '' : undefined}
      style={{ ...choiceVars(theme, size), ...style }}
      className={cn('ui:flex ui:box-border ui:items-center ui:px-lg ui:py-sm', choicePaint, !interactive && 'ui:cursor-default', className)}
    />
  )
})
ChoiceCard.displayName = 'ChoiceCard'

/**
 * The selection indicator of a row that is not a `Choice` itself (the text of a card whose actions are
 * its own): the radio of `components.radio`, presentational, hidden from assistive technology; the
 * element that is the radio carries the role and `aria-checked`. `checked` paints it on; without it
 * it reads the `data-checked` of the row around it (`Choice variant='card-actions' selected`). It is
 * what the theme's `show_indicator` says, and `indicator={false}` turns it off.
 */
export const ChoiceIndicator = ({ checked, indicator = true, className }) => {
  const theme = useTheme()
  if (indicator === false || getThemeComponent(theme, 'choice').base.show_indicator === false) return null
  return (
    <span data-slot='choice-indicator' data-checked={checked ? '' : undefined} style={radioVars(theme)} className={cn('ui:inline-flex ui:shrink-0', className)}>
      <RadioMark />
    </span>
  )
}

/**
 * The room of a row's actions when they cannot be inside it (a radiogroup owns radios alone): a box
 * with the row's own padding and the room of its border (transparent), at the end and centered, to
 * lay over the row on the same grid line, so the actions sit where they would inside it. `as`: the
 * caller's layout element (the grid item and the space between rows are the caller's); the rest of
 * the props go to it. Its buttons are the caller's.
 */
export const ChoiceActions = React.forwardRef(({ as: Surface = 'div', className, style, ...props }, ref) => {
  const theme = useTheme()
  return (
    <Surface
      ref={ref}
      {...props}
      data-slot='choice-actions'
      style={{ '--ui-choice-border-width': choiceVars(theme)['--ui-choice-border-width'], ...style }}
      className={cn('ui:flex ui:box-border ui:min-w-[0] ui:items-center ui:justify-end ui:self-stretch ui:px-lg ui:py-sm ui:border-solid ui:border-transparent ui:[border-width:var(--ui-choice-border-width)]', className)}
    />
  )
})
ChoiceActions.displayName = 'ChoiceActions'

/**
 * An option of a choice group (`components.choice`): the whole row is the control.
 * Inside a `RadioGroup` (`type='radio'`, the default; the group's `value` is the
 * selection) or a `CheckboxGroup` (`type='check'`; or alone with `checked`), or alone as a
 * switch (`type='switch'`).
 *
 * - `variant='icon-only-rating'`: a pressed button with just the glyph as
 *   its children. Supply an accessible name and the current `selected` state.
 * - `variant='time-slot'`: a centered time label supplied as children, with
 *   `disabled` and `busy` (strikes out the label inside the slot).
 * - `variant='tip-tile'`: a compact radio-style tile with a themed indicator
 *   and children for the amount or custom action.
 *   Both variants take a `value` in a `RadioGroup` and support arrow navigation.
 *   `onActivate` handles clicks and keyboard activation when the consumer needs
 *   to do more than select the value (for example, opening a custom tip editor).
 * - `variant='conversation-row'`: a pressed button with participant content
 *   supplied as children. `compact` reduces the insets for avatar-only buttons,
 *   which need an accessible name. `render` and `nativeButton` follow Base UI.
 * - `variant='card-actions'`: paints the choice around a card with independent
 *   actions supplied as children. `as` can supply the card's layout element.
 *   The surface owns no action unless `action` is set for a card that is itself
 *   the single selection button. In either case, `selected` paints selection.
 *   `hovered` paints the hover while the pointer is on actions that are out of the
 *   card (see `ChoiceActions`); `interactive={false}` keeps the arrow of a card that
 *   picks nothing. `ChoiceIndicator` draws the radio inside the card's own radio.
 * - `type='switch'`: a row of text and a switch (`components.switch`, drawn at the end): the whole
 *   row is the switch (`role='switch'`), so its text is as much a target as the track. `checked`,
 *   `defaultChecked`, `onCheckedChange`, `name`, `inputRef` are Base UI's. The track is the control, so
 *   `show_indicator` and `indicator` do not hide it; on, the row takes the choice's selected look.
 * - `variant='action'`: a row with the look of a choice that is an action, not a selection: a
 *   native button that runs `onClick` (also on the current one), by pointer, Enter or Space, and
 *   that the arrows do not move or select. `selected` paints the current one (`aria-pressed`,
 *   `data-checked`). For a list whose pick opens a dialog or reloads the page; keep it in a
 *   `role='group'` (a radiogroup would promise arrows). Takes `title`, `secondary`, `icon`,
 *   `image`, `trailing` and `indicator` as a radio row; it has no `end`.
 * - `title`: the visible name and the accessible one; `secondary`: optional text
 *   under it (a price), the control's description. `aria-label` replaces the name.
 * - `image`: a URL for the box of `components.product_option` (`image_size`,
 *   `image_radius`); `reserveImage` keeps the empty box for a row without one so a
 *   group aligns. Decoration.
 * - The indicator (a radio or a check, of `components.radio` / `components.checkbox`)
 *   shows when the theme's `show_indicator` is on; without it, the selected state is
 *   the row's background and border. Selected: `data-checked`. `indicator={false}` hides
 *   it in this row alone (a confirmed balance, read only, that has nothing to tick); it
 *   never shows what the store's theme hides.
 * - `value`, `checked`, `defaultChecked`, `onCheckedChange` (check), `disabled`
 *   (the row dims as `components.choice` says), `readOnly`, `name`, `id`, `inputRef`: Base UI's.
 * - `unavailable`: sold out or closed. With `disabled` or `readOnly`, the row keeps its look and
 *   only the indicator and the secondary text dim (`tokens.opacity.disabled`).
 * - `size`: `sm | md | lg`, the row's minimum height. Never under 44 px high to touch.
 * - `icon`: a decorative node (a base `Icon`) after the indicator, before the image; hidden from
 *   assistive technology, the title names the row. `trailing`: text at the end of the row (a
 *   balance, a price); it is part of the row, so a click on it toggles the row, and it describes
 *   it. For a control at the end, which must not toggle the row, use `end`.
 * - `end`: optional content at the end of the row (a quantity stepper, a segmented control). Its
 *   children are items of the row (they wrap onto their own line when the row is full: `ms-auto`
 *   or a full-width basis is the caller's) and sit above the touch area. A click, key or
 *   pointer inside it never toggles the row, and its buttons are at least 44 px high and wide
 *   on a phone or with a coarse pointer. Without it the row is as it always was. Controls inside
 *   a checkbox or radio are not exposed to assistive technology by every browser: use it only
 *   where the row is also usable without them.
 */
export const Choice = React.forwardRef(({ type = 'radio', variant, selected, busy, onActivate, compact, action: interactiveCard, children, title, secondary, image, reserveImage, end, icon, trailing, size, indicator = true, unavailable = false, className, style, ...props }, ref) => {
  const theme = useTheme()
  const id = useId()
  const showIndicator = indicator !== false && getThemeComponent(theme, 'choice').base.show_indicator !== false
  if (variant === 'card-actions' && !interactiveCard) {
    return <ChoiceCard ref={ref} selected={selected} size={size} className={className} style={style} {...props}>{children}</ChoiceCard>
  }
  const tip = variant === 'tip-tile'
  const timeSlot = variant === 'time-slot'
  if (timeSlot || tip) {
    return (
      <RadioPrimitive.Root
        ref={ref}
        data-slot='choice'
        data-busy={timeSlot && busy ? '' : undefined}
        {...props}
        nativeButton
        render={<button type='button' />}
        style={{ ...choiceVars(theme, size), ...(tip && radioVars(theme)), ...style }}
        className={cn(action({ variant }), className)}
        onClick={onActivate ? event => {
          const radio = event.currentTarget
          if (event.defaultPrevented || radio.matches(':disabled, [data-disabled], [data-readonly]')) return
          event.preventDefault()
          onActivate()
        } : props.onClick}
        // Base UI radios activate with Space. Keep Enter for the existing
        // time confirmation and custom-tip actions as well.
        onKeyDownCapture={onActivate ? event => {
          props.onKeyDownCapture?.(event)
          if (event.key === 'Enter' && !event.defaultPrevented) {
            event.preventDefault()
            event.currentTarget.click()
          }
        } : props.onKeyDownCapture}
      >
        {tip && showIndicator && (
          <span data-slot='choice-indicator' className='ui:inline-flex ui:shrink-0'>
            <RadioMark />
          </span>
        )}
        {children}
      </RadioPrimitive.Root>
    )
  }
  if (variant === 'icon-only-rating' || variant === 'conversation-row' || variant === 'card-actions') {
    return (
      <ButtonPrimitive
        ref={ref}
        data-slot='choice'
        data-checked={selected ? '' : undefined}
        aria-pressed={!!selected}
        {...props}
        style={{ ...choiceVars(theme, size), ...style }}
        className={cn(action({ variant, compact }), className)}
      >
        {children}
      </ButtonPrimitive>
    )
  }
  // an action row is a button that looks like a radio and selects nothing: the click is the caller's
  const act = variant === 'action'
  const radio = act || type === 'radio'
  // (a button holds no other control)
  const endSlot = act ? undefined : end
  // a switch row's track is the control itself: the theme's `show_indicator` and `indicator` leave it
  const toggle = type === 'switch' && !act
  const Root = act ? ButtonPrimitive : toggle ? SwitchPrimitive.Root : radio ? RadioPrimitive.Root : CheckboxPrimitive.Root
  const vars = {
    ...choiceVars(theme, size),
    '--ui-choice-muted-opacity': themeOpacity(theme, 'disabled'),
    ...(toggle ? switchVars(theme) : radio ? radioVars(theme) : checkboxVars(theme)),
    ...optionVars(theme)
  }
  const named = props['aria-label'] || props['aria-labelledby']
  return (
    <Root
      ref={ref}
      data-slot='choice'
      aria-labelledby={named ? undefined : `${id}-title`}
      aria-describedby={[secondary && `${id}-secondary`, trailing && `${id}-trailing`].filter(Boolean).join(' ') || undefined}
      {...(act && { 'data-checked': selected ? '' : undefined, 'aria-pressed': !!selected })}
      {...props}
      style={{ ...vars, ...style }}
      className={cn(row({ unavailable }), endSlot && 'ui:flex-wrap', className)}
    >
      {showIndicator && !toggle && (
        <span data-slot='choice-indicator' className={cn('ui:inline-flex ui:shrink-0', unavailable && DIM)}>
          {radio ? <RadioMark /> : <CheckboxMark />}
        </span>
      )}
      {icon && <span data-slot='choice-icon' aria-hidden='true' className='ui:inline-flex ui:shrink-0 ui:items-center'>{icon}</span>}
      {(image || reserveImage) && (
        <span
          data-slot='choice-image'
          aria-hidden='true'
          className={IMAGE}
          style={image ? { backgroundImage: `url(${JSON.stringify(image)})` } : undefined}
        />
      )}
      <span data-slot='choice-text' className={cn('ui:flex ui:min-w-[0] ui:flex-col ui:[overflow-wrap:anywhere]', endSlot ? 'ui:flex-[1_1_auto]' : 'ui:flex-1')}>
        <span id={`${id}-title`} data-slot='choice-title'>{title}</span>
        {secondary && <span id={`${id}-secondary`} data-slot='choice-secondary' className={cn(SECONDARY, unavailable && DIM)}>{secondary}</span>}
      </span>
      {trailing && <span id={`${id}-trailing`} data-slot='choice-trailing' className={cn('ui:ms-auto ui:text-end ui:[overflow-wrap:anywhere]', unavailable && DIM)}>{trailing}</span>}
      {toggle && <SwitchMark />}
      {endSlot && <span data-slot='choice-end' className={cn(END)} {...END_EVENTS}>{endSlot}</span>}
    </Root>
  )
})
Choice.displayName = 'Choice'
