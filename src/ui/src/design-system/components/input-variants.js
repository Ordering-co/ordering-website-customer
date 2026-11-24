// The field box classes of `Input` (and of every control that looks like it), apart from the piece:
// the entry's `Select` needs only these, not the `<input>` and its Base UI field.
import { cva } from 'class-variance-authority'

// Every value is `components.input`, written on the element by
// `componentVars`; a class only says which property reads which variable. A
// state the theme leaves null declares nothing, so each state falls back to
// the resting look (the variable of a state that does not exist would void
// the property). The keyboard focus ring is the app's global one
// (src/ui/src/styles/Focus): it is not repeated here.
const BASE = [
  'ui:box-border ui:block ui:w-full ui:min-w-[0] ui:m-none ui:py-none ui:outline-none',
  'ui:h-(--ui-input-height) ui:rounded-(--ui-input-radius) ui:px-(--ui-input-padding-x)',
  'ui:bg-(--ui-input-background) ui:text-(--ui-input-text-color) ui:[box-shadow:var(--ui-input-shadow)]',
  'ui:font-(family-name:--ui-input-text-family) ui:text-(length:--ui-input-text-size) ui:leading-(--ui-input-text-line) ui:font-(weight:--ui-input-text-weight)',
  // iOS zooms a focused field under the floor (16 px, styles/Rules): on a phone it is never less
  // (src/index.css says the same for the whole app; the piece does not depend on that sheet being loaded)
  'ui:max-mobile:text-[length:max(var(--ui-input-text-size),var(--ui-field-min-text))]',
  'ui:placeholder:text-(--ui-input-placeholder) ui:placeholder:opacity-100',
  'ui:motion-safe:transition-[color,background-color,border-color,box-shadow] ui:motion-safe:duration-(--ui-input-motion-duration) ui:motion-safe:ease-(--ui-input-motion-easing)',
  // the theme's hover, while the field is neither focused nor disabled
  'ui:enabled:not-focus:hover:bg-[color:var(--ui-input-hover-background,var(--ui-input-background))]',
  'ui:enabled:not-focus:hover:[box-shadow:var(--ui-input-hover-shadow,var(--ui-input-shadow))]',
  'ui:read-only:cursor-default',
  // disabled: the theme's, the resting look where it says nothing
  'ui:disabled:cursor-not-allowed',
  'ui:disabled:bg-[color:var(--ui-input-disabled-background,var(--ui-input-background))]',
  'ui:disabled:text-[color:var(--ui-input-disabled-text-color,var(--ui-input-text-color))]',
  'ui:disabled:[box-shadow:var(--ui-input-disabled-shadow,var(--ui-input-shadow))]'
]

export const inputVariants = cva(BASE, {
  variants: {
    // `border_sides`: the border all around, or only a line under the field (its bottom corners square)
    sides: {
      all: [
        'ui:[border:var(--ui-input-border)]',
        'ui:enabled:not-focus:hover:[border:var(--ui-input-hover-border,var(--ui-input-border))]',
        'ui:not-aria-invalid:focus:[border:var(--ui-input-focus-border,var(--ui-input-border))]',
        'ui:aria-invalid:[border:var(--ui-input-error-border,var(--ui-input-border))]',
        'ui:disabled:[border:var(--ui-input-disabled-border,var(--ui-input-border))]'
      ],
      bottom: [
        'ui:rounded-b-none ui:[border-top:none] ui:[border-inline:none] ui:[border-bottom:var(--ui-input-border)]',
        'ui:enabled:not-focus:hover:[border-bottom:var(--ui-input-hover-border,var(--ui-input-border))]',
        'ui:not-aria-invalid:focus:[border-bottom:var(--ui-input-focus-border,var(--ui-input-border))]',
        'ui:aria-invalid:[border-bottom:var(--ui-input-error-border,var(--ui-input-border))]',
        'ui:disabled:[border-bottom:var(--ui-input-disabled-border,var(--ui-input-border))]'
      ]
    },
    // a focus border unlike the resting one is the focus of the field: no ring on top of it
    // (an error border wins over it and keeps the ring)
    ownFocus: { true: 'ui:not-aria-invalid:focus-visible:outline-none!', false: '' },
    start: { true: 'ui:ps-[calc(var(--ui-input-padding-x)+var(--ui-input-icon-size)+var(--ui-input-icon-gap))]', false: '' },
    end: { true: 'ui:pe-[calc(var(--ui-input-padding-x)+var(--ui-input-icon-size)+var(--ui-input-icon-gap))]', false: '' },
    // a suffix of several controls: the room is the suffix's own measured width (`suffixWide`)
    endWide: { true: 'ui:pe-[calc(var(--ui-input-suffix-width,var(--ui-input-icon-size))+var(--ui-input-icon-gap)*2)]', false: '' }
  },
  defaultVariants: { sides: 'all', ownFocus: false, start: false, end: false, endWide: false }
})
