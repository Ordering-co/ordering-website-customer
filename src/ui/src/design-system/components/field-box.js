// The field box of the theme for an element that is not the `<input>`, apart from `SdkField`:
// the header's capsule (the entry) takes it without the field, its label and `Input`.
import { cva } from 'class-variance-authority'
import { componentVars } from '../lib/componentVars'

/**
 * The box of a text field (`components.input`: background, border, radius,
 * shadow, its hover, focus border, error border and disabled look) for an
 * element that is not the `<input>` itself: a third party's iframe or the
 * country control of `InputPhone`. It reads the variables `componentVars` wrote
 * on an ancestor and says its state in two attributes: `data-invalid` and
 * `data-disabled`. A state the theme leaves null falls back to the resting
 * look. Layout (flex, padding, height) is the caller's. It is focused while an element inside has the focus
 * (`:focus-within`) or while its caller says so with `data-focused`: an SDK's iframe does not give the page
 * `:focus-within` in every browser (Safari), only its own focus events.
 * - `ring` (default on): the app's focus ring around the box while an element
 *   inside has the keyboard focus and is invisible (`select:focus-visible`);
 *   off where the theme's focus border is the indicator.
 */
export const fieldBoxVariants = cva([
  'ui:box-border ui:rounded-(--ui-input-radius) ui:bg-(--ui-input-background) ui:text-(--ui-input-text-color) ui:[box-shadow:var(--ui-input-shadow)]',
  'ui:motion-safe:transition-[color,background-color,border-color,box-shadow] ui:motion-safe:duration-(--ui-input-motion-duration) ui:motion-safe:ease-(--ui-input-motion-easing)',
  'ui:not-data-disabled:not-data-invalid:not-focus-within:not-data-focused:hover:bg-[color:var(--ui-input-hover-background,var(--ui-input-background))]',
  'ui:not-data-disabled:not-data-invalid:not-focus-within:not-data-focused:hover:[box-shadow:var(--ui-input-hover-shadow,var(--ui-input-shadow))]',
  'ui:data-disabled:cursor-not-allowed',
  'ui:data-disabled:bg-[color:var(--ui-input-disabled-background,var(--ui-input-background))]',
  'ui:data-disabled:text-[color:var(--ui-input-disabled-text-color,var(--ui-input-text-color))]',
  'ui:data-disabled:[box-shadow:var(--ui-input-disabled-shadow,var(--ui-input-shadow))]'
], {
  variants: {
    sides: {
      all: [
        'ui:[border:var(--ui-input-border)]',
        'ui:not-data-disabled:not-data-invalid:not-focus-within:not-data-focused:hover:[border:var(--ui-input-hover-border,var(--ui-input-border))]',
        'ui:not-data-invalid:focus-within:[border:var(--ui-input-focus-border,var(--ui-input-border))]',
        'ui:not-data-invalid:data-focused:[border:var(--ui-input-focus-border,var(--ui-input-border))]',
        'ui:data-invalid:[border:var(--ui-input-error-border,var(--ui-input-border))]',
        'ui:data-disabled:[border:var(--ui-input-disabled-border,var(--ui-input-border))]'
      ],
      bottom: [
        'ui:rounded-b-none ui:[border-top:none] ui:[border-inline:none] ui:[border-bottom:var(--ui-input-border)]',
        'ui:not-data-disabled:not-data-invalid:not-focus-within:not-data-focused:hover:[border-bottom:var(--ui-input-hover-border,var(--ui-input-border))]',
        'ui:not-data-invalid:focus-within:[border-bottom:var(--ui-input-focus-border,var(--ui-input-border))]',
        'ui:not-data-invalid:data-focused:[border-bottom:var(--ui-input-focus-border,var(--ui-input-border))]',
        'ui:data-invalid:[border-bottom:var(--ui-input-error-border,var(--ui-input-border))]',
        'ui:data-disabled:[border-bottom:var(--ui-input-disabled-border,var(--ui-input-border))]'
      ]
    },
    ring: {
      true: [
        'ui:has-[select:focus-visible]:[outline:var(--ot-focus-ring-width)_solid_var(--ot-focus-ring-color)]',
        'ui:has-[select:focus-visible]:[outline-offset:var(--ot-focus-ring-offset)]'
      ],
      false: ''
    }
  },
  defaultVariants: { sides: 'all', ring: true }
})

/**
 * The field box of the theme for a container that is not a field (the order context capsule): spread
 * `{ className, style }` on any element. `style` is `components.input` as variables, `className` the box
 * with the field's states. `ring` (default off) is `fieldBoxVariants`' ring around a focused `select`.
 */
export const fieldBoxProps = (theme, { ring = false } = {}) => {
  const input = componentVars(theme, 'input', { variant: 'default', radius: 'md' })
  const sides = input['--ui-input-border-sides'] === 'bottom' ? 'bottom' : 'all'
  return { className: fieldBoxVariants({ sides, ring }), style: input }
}
