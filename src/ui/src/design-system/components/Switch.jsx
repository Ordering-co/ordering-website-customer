// Shaped after shadcn/ui's Base UI switch: the `Root` + thumb structure is theirs, the look is the
// theme's (`components.switch`). Listed in docs/third-party/shadcn-ui/provenance.json.
import React from 'react'
import { useTheme } from 'styled-components'
import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { themeOpacity } from '~/utils/themeTokens'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { ROOT, TARGET, withLabel } from './Checkbox'
import '../styles.css'

/**
 * `components.switch` as `--ui-switch-*` (the track's height of `size`, the on, off and thumb colors,
 * the motion) and the disabled opacity of `tokens.opacity` (the theme has no disabled look for it).
 */
export const switchVars = (theme, size) => ({ ...componentVars(theme, 'switch', { size }), '--ui-switch-disabled-opacity': themeOpacity(theme, 'disabled') })

// The track is the height of the switch's size and 40:26 wide; the thumb is what the track leaves
// inside a space.xs margin, and it slides along the inline axis (`inset-inline-start`), so a
// right-to-left store mirrors it. Spelled whole: Tailwind reads the source as text.
const MARK = [
  'ui:relative ui:box-border ui:inline-block ui:shrink-0 ui:h-(--ui-switch-height) ui:w-[calc(var(--ui-switch-height)*40/26)] ui:rounded-full',
  'ui:[--ui-switch-thumb-size:calc(var(--ui-switch-height)-2*var(--ot-space-xs))]',
  'ui:bg-(--ui-switch-off) ui:in-data-checked:bg-(--ui-switch-on)',
  'ui:motion-safe:transition-[background-color] ui:motion-safe:duration-(--ui-switch-motion-duration) ui:motion-safe:ease-(--ui-switch-motion-easing)'
]
const THUMB = [
  'ui:absolute ui:[inset-block-start:var(--ot-space-xs)] ui:size-(--ui-switch-thumb-size) ui:rounded-full ui:bg-(--ui-switch-thumb)',
  'ui:[inset-inline-start:var(--ot-space-xs)] ui:in-data-checked:[inset-inline-start:calc(100%-var(--ui-switch-thumb-size)-var(--ot-space-xs))]',
  'ui:motion-safe:transition-[inset-inline-start,background-color] ui:motion-safe:duration-(--ui-switch-motion-duration) ui:motion-safe:ease-(--ui-switch-motion-easing)'
]

/**
 * The track and thumb of a switch, drawn (they are not an input): the off and on colors, the thumb
 * where its root says. Decoration: the root carries the name and the state. Put it inside a Base UI
 * switch root that declares `switchVars`; a `Choice type='switch'` row does.
 */
export const SwitchMark = ({ className }) => (
  <span data-slot='switch-mark' aria-hidden='true' className={cn(MARK, className)}>
    <span data-slot='switch-thumb' className={cn(THUMB)} />
  </span>
)

/**
 * The theme's switch (`components.switch`): a Base UI switch root (`role='switch'`) with the drawn track.
 * Its name is `label` (the text beside it, one hit area with it) or an `aria-label` / a
 * `<label htmlFor>` with its `id`.
 *
 * - `checked` / `defaultChecked` / `onCheckedChange(checked, details)`, `name`, `value`, `required`,
 *   `disabled`, `readOnly`, `id` (the hidden input's), `inputRef`: Base UI's.
 * - `size`: `sm | md | lg`, the track's height (`components.switch.sizes`).
 * - `label`: any content; with it `className` and `style` go to the label (its layout).
 * - Never under 44 px to touch (phone or coarse pointer); the track is the theme's size.
 * - A row of text and a switch where the whole row is the target is `Choice type='switch'`.
 */
export const Switch = React.forwardRef(({ className, style, label, size, ...props }, ref) => {
  const theme = useTheme()
  const control = (
    <SwitchPrimitive.Root
      ref={ref}
      data-slot='switch'
      {...props}
      style={{ ...switchVars(theme, size), ...(!label && style) }}
      className={cn(ROOT, 'ui:rounded-full ui:data-disabled:opacity-(--ui-switch-disabled-opacity)', !label && TARGET, !label && className)}
    >
      <SwitchMark />
    </SwitchPrimitive.Root>
  )
  return withLabel(control, label, className, style)
})
Switch.displayName = 'Switch'
