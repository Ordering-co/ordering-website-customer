// Adapted from shadcn/ui base textarea (a styled native element), commit
// 7c9eaba1c0a6404c990c144a654792e3313c650d. MIT notice and source hash:
// docs/third-party/shadcn-ui/provenance.json.
import React from 'react'
import { useTheme } from 'styled-components'
import { hasOwnFocusBorder } from '~/utils/themeCss'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { fieldBorderDeltas } from './field-spacing'
import { inputVariants } from './Input'
import '../styles.css'

/**
 * The theme's multi-line text field: the look of `Input` (`components.input`,
 * the same variables, states, error border and 16 px text on a phone), taller.
 *
 * - `variant='compact-resizable'`: two rows by default, vertical resize and
 *   no minimum based on the single-line input height.
 * - `rows`: the lines it shows (the browser's; default 3). The field never
 *   gets shorter than the theme's field height.
 * - `resize`: `'none'` (default, as the legacy `TextArea`) or `'vertical'`, which lets the user drag its height
 *   (the custom order's field did).
 * - `invalid`, `disabled` and `readOnly` as in `Input` (name the message with
 *   `aria-describedby`).
 * - Anything else goes to the `<textarea>`; `className` wins over the piece's classes.
 */
export const Textarea = React.forwardRef(({ className, style, invalid, resize = 'none', rows, variant, ...props }, ref) => {
  const theme = useTheme()
  const compact = variant === 'compact-resizable'
  const vars = componentVars(theme, 'input', { variant: 'default', radius: 'md' })
  const sides = vars['--ui-input-border-sides'] === 'bottom' ? 'bottom' : 'all'
  const focusBorder = vars['--ui-input-focus-border']
  const classes = inputVariants({
    sides,
    ownFocus: hasOwnFocusBorder(vars['--ui-input-border'], focusBorder)
  })
  return (
    <textarea
      ref={ref}
      rows={rows ?? (compact ? 2 : 3)}
      data-slot='textarea'
      data-field-padding={compact ? 'textarea' : undefined}
      data-field-border={compact ? sides : undefined}
      aria-invalid={invalid || undefined}
      {...props}
      style={{ ...vars, ...(compact && fieldBorderDeltas(vars)), ...style }}
      className={cn(
        classes,
        // the height is its rows' (and a drag's), not the theme's field height; the space the
        // legacy `TextArea` gives its text on every side is the field's side space
        'ui:h-auto ui:py-(--ui-input-padding-x)',
        !compact && 'ui:min-h-(--ui-input-height)',
        compact && 'ui:[letter-spacing:var(--ui-input-text-letter-spacing,normal)] ui:[text-transform:var(--ui-input-text-transform,none)]',
        compact || resize === 'vertical' ? 'ui:resize-y' : 'ui:resize-none',
        className
      )}
    />
  )
})
Textarea.displayName = 'Textarea'
