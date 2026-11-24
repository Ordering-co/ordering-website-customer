import React from 'react'
import { useTheme } from 'styled-components'
import { hasOwnFocusBorder } from '~/utils/themeCss'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { inputVariants } from './Input'
import { fieldBoxVariants, fieldBoxProps } from './field-box'
import '../styles.css'

// the box lives in field-box.js, where the entry reaches it without this piece
export { fieldBoxVariants, fieldBoxProps }

// components.field: the label over the control (label_gap), the error under it (message_gap)
const LABEL = 'ui:block ui:w-full ui:text-start ui:mb-(--ui-field-label-gap) ui:text-(--ui-field-label-color) ui:font-(family-name:--ui-field-label-family) ui:text-(length:--ui-field-label-size) ui:leading-(--ui-field-label-line) ui:font-(weight:--ui-field-label-weight)'
const ERROR = 'ui:m-none ui:mt-(--ui-field-message-gap) ui:text-start ui:text-(--ui-field-error-color) ui:font-(family-name:--ui-field-error-family) ui:text-(length:--ui-field-error-size) ui:leading-(--ui-field-error-line) ui:font-(weight:--ui-field-error-weight)'
// A box around a control the SDK draws: at least the field's height, its side space, the control centered
// The SDK's iframe cannot say :focus-visible to the page, and Safari does not give the box `:focus-within` for it either:
// the box takes the app's focus ring while the SDK reports the focus (`data-focused`, from its focus and blur events),
// unless the theme's own focus border is the indicator (as `inputVariants` does for an `<input>`). That border does not
// show on an invalid box, which keeps its error border: there the ring is the indicator.
const FOCUS_RING = 'ui:focus-within:[outline:var(--ot-focus-ring-width)_solid_var(--ot-focus-ring-color)] ui:focus-within:[outline-offset:var(--ot-focus-ring-offset)] ui:data-focused:[outline:var(--ot-focus-ring-width)_solid_var(--ot-focus-ring-color)] ui:data-focused:[outline-offset:var(--ot-focus-ring-offset)]'
const INVALID_FOCUS_RING = 'ui:data-invalid:focus-within:[outline:var(--ot-focus-ring-width)_solid_var(--ot-focus-ring-color)] ui:data-invalid:focus-within:[outline-offset:var(--ot-focus-ring-offset)] ui:data-invalid:data-focused:[outline:var(--ot-focus-ring-width)_solid_var(--ot-focus-ring-color)] ui:data-invalid:data-focused:[outline-offset:var(--ot-focus-ring-offset)]'
const SDK_BOX = 'ui:flex ui:min-h-(--ui-input-height) ui:flex-col ui:justify-center ui:px-(--ui-input-padding-x)'

/**
 * A field whose control a third party's SDK draws (Stripe Elements' card
 * iframes, the input Google Places creates): the label, the box, the focus,
 * the error text and the error border of `Input`, and a hole where the SDK
 * paints. Its look is `components.input` and `components.field` of the theme
 * in scope. What the SDK paints inside (Stripe's iframe text, Google's
 * suggestion list) is styled with `lib/sdkStyle.js`, which translates the same
 * tokens to each SDK's own API.
 *
 * - `children` as an element (Stripe's `CardNumberElement`): the piece draws the
 *   field's box around it; name the element with `id`, which the label points to.
 * - `children` as a function (Google Places, whose SDK creates the `<input>`):
 *   it receives `{ id, className, style, 'aria-invalid', 'aria-describedby' }`
 *   to spread on that input, which then is the box (the same classes as `Input`).
 *   The SDK has to pass `className` and `style` to its input.
 * - `label`: its text (already translated); `error`: the message under the
 *   field, which also marks it invalid and is named by the field
 *   (`aria-describedby`); `invalid` marks it without a message.
 * - `id`: the id of the control (a generated one by default; the function
 *   receives it).
 * - `disabled` dims the box (the SDK's own disabled state is the SDK's).
 * - `className` / `style` go to the wrapper (its layout).
 */
export const SdkField = ({ label, id, error, invalid, disabled, className, style, children, ...props }) => {
  const theme = useTheme()
  const generated = React.useId()
  const fieldId = id ?? `${generated}-field`
  const errorId = `${generated}-error`
  const marked = invalid ?? !!error
  const input = componentVars(theme, 'input', { variant: 'default', radius: 'md' })
  const sides = input['--ui-input-border-sides'] === 'bottom' ? 'bottom' : 'all'
  const ownFocus = hasOwnFocusBorder(input['--ui-input-border'], input['--ui-input-focus-border'])
  const described = error ? errorId : undefined
  // the SDK's element (Stripe's) says its focus with `onFocus` and `onBlur`: the box shows it
  const [focused, setFocused] = React.useState(false)
  const sdk = React.isValidElement(children)
    ? React.cloneElement(children, {
      onFocus: (event) => { setFocused(true); children.props.onFocus?.(event) },
      onBlur: (event) => { setFocused(false); children.props.onBlur?.(event) }
    })
    : children
  const body = typeof children === 'function'
    ? children({
      id: fieldId,
      className: inputVariants({ sides, ownFocus }),
      style: input,
      'aria-invalid': marked || undefined,
      'aria-describedby': described
    })
    : (
      <div
        data-slot='sdk-field-box'
        data-invalid={marked ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        data-focused={focused ? '' : undefined}
        className={cn(fieldBoxVariants({ sides, ring: false }), SDK_BOX, ownFocus ? INVALID_FOCUS_RING : FOCUS_RING)}
      >
        {sdk}
      </div>
      )
  return (
    <div
      {...props}
      data-slot='sdk-field'
      style={{ ...input, ...componentVars(theme, 'field'), ...style }}
      className={cn('ui:flex ui:w-full ui:min-w-[0] ui:flex-col', className)}
    >
      {label && <label htmlFor={fieldId} data-slot='sdk-field-label' className={LABEL}>{label}</label>}
      {body}
      {error && <p id={errorId} role='alert' data-slot='sdk-field-error' className={ERROR}>{error}</p>}
    </div>
  )
}
SdkField.displayName = 'SdkField'
