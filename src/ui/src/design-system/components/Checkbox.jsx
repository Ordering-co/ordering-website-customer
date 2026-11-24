// Shaped after shadcn/ui's Base UI checkbox and radio-group: the parts and the
// `Root` + mark structure are theirs, the look is the theme's (`components.checkbox`,
// `components.radio`).
import React from 'react'
import { useTheme } from 'styled-components'
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { CheckboxGroup as CheckboxGroupPrimitive } from '@base-ui/react/checkbox-group'
import { Check } from 'lucide-react'
import { themeColor } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeOpacity } from '~/utils/themeTokens'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { createIcon } from './createIcon'
import { ROOT, TARGET, withLabel } from './Radio'
import '../styles.css'

// everything of the radio (and the shared parts: `ROOT`, `TARGET`, `withLabel`...) stays reachable from here
export * from './Radio'

// The glyph alone, not the whole icon registry.
const MarkIcon = createIcon({ check: Check })

// (the shared classes, `ROOT`, `TARGET` and `LABEL`, and the radio are in Radio.jsx)
// Only a state's colors move; reduced motion and the theme's own speed decide.
// Spelled whole, once per component: Tailwind reads the source as text and builds nothing from an interpolation.
const MOTION = {
  checkbox: 'ui:motion-safe:transition-[color,background-color,border-color] ui:motion-safe:duration-(--ui-checkbox-motion-duration) ui:motion-safe:ease-(--ui-checkbox-motion-easing)'
}

/**
 * `components.checkbox` as `--ui-checkbox-*`, plus the disabled opacity of
 * `tokens.opacity` (the theme has no disabled look for a checkbox, the legacy
 * one dimmed it by that token). A checkbox the theme gives no border (null)
 * draws it as the legacy icon did: in `border_strong`.
 */
export const checkboxVars = (theme) => {
  const vars = componentVars(theme, 'checkbox')
  if (vars['--ui-checkbox-border'] === 'none') {
    // (joins three helpers' CSS: `cssBorder` takes the raw number and color, which only `theme.values` has, and §7 forbids reading them inline)
    vars['--ui-checkbox-border'] = `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border_strong')}`
  }
  return { ...vars, '--ui-checkbox-disabled-opacity': themeOpacity(theme, 'disabled') }
}

/**
 * The box of a checkbox, drawn (it is not an input): the theme's size and
 * border, filled with `checked` and a check when its root is checked. The
 * corners are an eighth of the size, as the legacy icon's were: the theme gives
 * a checkbox no radius, and an Identity level would turn it into a circle in a
 * pill theme (TOKEN-GAP(implementation notes): `components.checkbox` has no radius, a proportion of
 * its size is used). The check is the surface color, as the legacy cut-out showed
 * what was behind it. Decoration: the root carries the name and the state.
 * Put it inside a Base UI checkbox root that declares `checkboxVars`.
 */
export const CheckboxMark = ({ invalid, className }) => (
  <span
    data-slot='checkbox-mark'
    aria-hidden='true'
    className={cn(
      'ui:box-border ui:flex ui:shrink-0 ui:items-center ui:justify-center ui:size-(--ui-checkbox-size) ui:rounded-[calc(var(--ui-checkbox-size)/8)]',
      'ui:[border:var(--ui-checkbox-border)] ui:text-background',
      'ui:in-data-checked:bg-(--ui-checkbox-checked) ui:in-data-checked:[border-color:var(--ui-checkbox-checked)]',
      // no error property in components.checkbox: TOKEN-GAP(implementation notes) the danger color of the border
      invalid && 'ui:in-data-unchecked:border-destructive',
      MOTION.checkbox,
      className
    )}
  >
    <MarkIcon name='check' className='ui:invisible ui:size-[80%] ui:in-data-checked:visible' />
  </span>
)

/**
 * The theme's checkbox (`components.checkbox`): a Base UI checkbox root with the
 * drawn mark. Its name is `label` (the text beside it, one hit area with it) or an
 * `aria-label` / a `<label htmlFor>` with its `id`.
 *
 * - `checked` / `defaultChecked` / `onCheckedChange(checked, details)`, `value` (in a
 *   `CheckboxGroup`), `name`, `required`, `disabled`, `readOnly`, `id` (the hidden input's),
 *   `inputRef` (a ref to that `<input>`, e.g. a form library's `register`).
 * - `invalid`: `aria-invalid` and the danger border while unchecked. Name the message with
 *   `aria-describedby`.
 * - `label`: any content. A link inside it is not a toggle.
 * - Never under 44 px to touch (phone or coarse pointer); the mark is the theme's size.
 * - Not built: the mixed state (`indeterminate`), which nothing uses.
 */
export const Checkbox = React.forwardRef(({ className, style, label, invalid, ...props }, ref) => {
  const theme = useTheme()
  const control = (
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot='checkbox'
      aria-invalid={invalid || undefined}
      {...props}
      style={{ ...checkboxVars(theme), ...(!label && style) }}
      className={cn(ROOT, 'ui:size-(--ui-checkbox-size) ui:rounded-[calc(var(--ui-checkbox-size)/8)] ui:data-disabled:opacity-(--ui-checkbox-disabled-opacity)', !label && TARGET, !label && className)}
    >
      <CheckboxMark invalid={invalid} />
    </CheckboxPrimitive.Root>
  )
  return withLabel(control, label, className, style)
})
Checkbox.displayName = 'Checkbox'

/** A Base UI checkbox group: `value` (the `value`s checked), `onValueChange`, `disabled`. No layout of its own. */
export const CheckboxGroup = (props) => <CheckboxGroupPrimitive data-slot='checkbox-group' {...props} />
