// Not adapted from shadcn/ui: it has no chip (its Badge is a static label with no
// selection). The behaviour is a Base UI button (a toggle when it has `selected`);
// the look is `components.chip` of the theme.
import React from 'react'
import { useTheme } from 'styled-components'
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva } from 'class-variance-authority'
import { Check, CircleAlert } from 'lucide-react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { cn } from '../lib/cn'
import { getThemeComponent } from '~/utils/themeCss'
import { themeControlHeight, themeSpace } from '~/utils/themeTokens'
import { componentVars } from '../lib/componentVars'
import { createIcon } from './createIcon'
import '../styles.css'

// The two status glyphs alone, not the whole icon registry: a chip is in lists of the
// first screens (business types, filters) and the registry weighs ~16 kB gzip.
const StatusIcon = createIcon({ complete: Check, missing: CircleAlert })

// Every value is `components.chip`, written on the element by `componentVars`; a
// class only says which property reads which variable. A state the theme leaves
// null declares nothing, so each state falls back to the resting look. The chip
// fixes its look, not its layout: it never stretches or aligns itself, so a row
// that scrolls sideways and a column of steps both just place it.
const BASE = [
  'ui:relative ui:box-border ui:inline-flex ui:shrink-0 ui:items-center ui:justify-center ui:m-none ui:py-none ui:select-none ui:whitespace-nowrap ui:no-underline ui:outline-none',
  'ui:h-(--ui-chip-height) ui:px-(--ui-chip-padding-x) ui:gap-(--ui-chip-gap) ui:rounded-(--ui-chip-radius)',
  'ui:bg-(--ui-chip-background) ui:text-(--ui-chip-color)',
  'ui:font-(family-name:--ui-chip-text-family) ui:text-(length:--ui-chip-text-size) ui:leading-(--ui-chip-text-line) ui:font-(weight:--ui-chip-text-weight)',
  'ui:[letter-spacing:var(--ui-chip-text-letter-spacing,normal)] ui:[text-transform:var(--ui-chip-text-transform,none)]',
  // an icon is drawn in the chip's color and keeps its size
  'ui:[&_svg]:pointer-events-none ui:[&_svg]:shrink-0',
  // only a theme with animation moves (its duration is 0ms otherwise) and never with reduced motion
  'ui:motion-safe:transition-[color,background-color,border-color] ui:motion-safe:duration-(--ui-chip-motion-duration) ui:motion-safe:ease-(--ui-chip-motion-easing)',
  // picked: the theme's selected colors (the resting ones where it says nothing)
  'ui:data-selected:bg-[color:var(--ui-chip-selected-background,var(--ui-chip-background))]',
  'ui:data-selected:text-[color:var(--ui-chip-selected-color,var(--ui-chip-color))]',
  // disabled: the theme's opacity, as the legacy chip
  'ui:data-disabled:opacity-(--ot-opacity-disabled) ui:data-disabled:cursor-not-allowed'
]

const COMPENSATED_CONTOUR = 'ui:px-(--ui-chip-content-padding) ui:motion-safe:transition-[background-color,color,border-color,box-shadow,opacity]'

// `contour`: the theme gives the chip a border of its own; without one its border is as
// wide as a control's thin border (Identity aside) and the color of its background.
// `selectedBorder`: `own` the selected state's border; otherwise the selected chip keeps
// the contour's width and style and takes its selected background as color.
export const chipVariants = cva(BASE, {
  variants: {
    variant: {
      default: 'ui:min-w-[0] ui:max-w-full',
      content: [
        COMPENSATED_CONTOUR,
        'ui:min-w-fit ui:shadow-none',
        'ui:[&_svg]:text-current'
      ],
      'compensated-contour': [
        COMPENSATED_CONTOUR,
        'ui:min-w-[0] ui:max-w-full ui:[box-shadow:none]'
      ]
    },
    contour: {
      true: 'ui:[border:var(--ui-chip-border)]',
      false: 'ui:border-solid ui:border-(length:--ot-border-fixed-thin) ui:border-(color:--ui-chip-background)'
    },
    selectedBorder: {
      own: 'ui:data-selected:[border:var(--ui-chip-selected-border)]',
      color: 'ui:data-selected:[border-color:var(--ui-chip-selected-background,var(--ui-chip-background))]'
    },
    interactive: {
      // hovered or pressed and not picked, the theme's `pressed` background (a picked chip keeps its colors);
      // a chip without a contour takes it for its border too
      true: [
        'ui:cursor-pointer',
        'ui:not-data-disabled:not-data-selected:hover:bg-[color:var(--ui-chip-pressed-background,var(--ui-chip-background))]',
        'ui:not-data-disabled:not-data-selected:active:bg-[color:var(--ui-chip-pressed-background,var(--ui-chip-background))]',
        // the touch target is at least 44 px on a phone or with a touch screen, whatever the theme's
        // height: it grows around the chip and changes nothing of its box (an accessibility floor)
        'ui:after:absolute ui:after:left-1/2 ui:after:top-1/2 ui:after:size-full ui:after:-translate-x-1/2 ui:after:-translate-y-1/2',
        /* touch-target */ 'ui:max-mobile:after:min-h-[44px] ui:max-mobile:after:min-w-[44px]',
        /* touch-target */ 'ui:pointer-coarse:after:min-h-[44px] ui:pointer-coarse:after:min-w-[44px]'
      ],
      false: ''
    },
    // (a chip without a contour: its border follows the hover too)
    hoverBorder: {
      true: [
        'ui:not-data-disabled:not-data-selected:hover:[border-color:var(--ui-chip-pressed-background,var(--ui-chip-background))]',
        'ui:not-data-disabled:not-data-selected:active:[border-color:var(--ui-chip-pressed-background,var(--ui-chip-background))]'
      ],
      false: ''
    }
  },
  compoundVariants: [
    {
      variant: 'compensated-contour',
      interactive: true,
      // These chips sit in reserved touch lanes, including on hybrid computers.
      class: [
        /* touch-target */ 'ui:[@media(any-pointer:coarse)]:after:min-h-[44px] ui:[@media(any-pointer:coarse)]:after:min-w-[44px]'
      ]
    }
  ],
  defaultVariants: { variant: 'default', contour: false, selectedBorder: 'color', interactive: true, hoverBorder: false }
})

// A label that does not fit ends in … (the chip keeps its height)
const withEllipsis = (children) => React.Children.map(children, (child) => (
  typeof child === 'string' || typeof child === 'number' ? <span className='ui:min-w-[0] ui:truncate'>{child}</span> : child
))

// Business types put the image as far from the leading edge as from the
// top and bottom of the chip, with corners concentric to the chip's end.
const edgeImageVars = (theme, size) => {
  const wanted = getThemeComponent(theme, 'business_types').base.pill_image_size
  const height = themeControlHeight(theme, 'chip', size)
  const least = parseFloat(themeSpace(theme, 'xs'))
  const side = Math.max(Math.min(wanted, height - 2 * least), 0)
  const inset = (height - side) / 2
  const radius = getThemeComponent(theme, 'chip').base.radius
  return {
    '--ui-chip-image-size': `${side}px`,
    '--ui-chip-image-padding-start': `${Math.max(inset - theme.values.tokens.border.thin, 0)}px`,
    '--ui-chip-image-radius': radius >= height / 2 ? '50%' : `${Math.max(radius - inset, 0)}px`
  }
}

// What the status says, spoken after the label, and the glyph and color that show it
// (TOKEN-GAP(implementation notes): `components.chip` has no status colors nor icon size; the
// glyph is drawn in the semantic `success_text` / `danger_text` and at `tokens.icon.sm`).
const STATUS = {
  complete: { key: 'COMPLETED', fallback: 'Completed', color: 'ui:text-success-text' },
  missing: { key: 'REQUIRED', fallback: 'Required', color: 'ui:text-danger-text' }
}

/**
 * A chip of the theme: an option of a filter or a choice, a quick reply, a
 * page number, or a step of a form. Its look is `components.chip` of the theme in
 * scope (a `ComponentScope` group's), through `componentVars`.
 *
 * - `size`: a size of the theme (`sm`, `md` by default, `lg`).
 * - `variant='content'`: keeps the label at its intrinsic width in wrapping lists.
 *   The side padding compensates for an outlined chip so the contour preserves its fit.
 * - `variant='compensated-contour'`: offsets the themed border width with side
 *   padding, keeping the default label truncation. Reserve a touch lane for each
 *   chip, including on devices with a secondary coarse pointer.
 * - `edgeImage`: the decorative business type image at the leading edge,
 *   sized by `components.business_types` and inset within the chip's corners.
 * - `suffix`: a decorative trailing glyph, separated by the theme's xs space in
 *   addition to the chip's gap.
 * - `selected`: picked. A chip that is a button then says it with `aria-pressed`
 *   (a button that is an action, with no `selected`, has none).
 * - `interactive` (default true): a button, with the pointer, hover, the keyboard
 *   and a 44 px touch target on a phone or with a touch screen. `interactive={false}`
 *   is a label: a `<span>` that does not answer the pointer.
 * - `disabled`: the theme's disabled opacity and no hover.
 * - `status`: `'complete'` or `'missing'` for a step of a form (an option group with
 *   its choice made, or a required one still pending). It draws a glyph after the
 *   label and says the status to assistive technology (translated here:
 *   `COMPLETED`, `REQUIRED`); the visible label is the caller's.
 * - `render` and `nativeButton={false}` make the button another element (Base UI),
 *   as `Button`'s do. Anything else goes to the element; `className` wins over the
 *   piece's classes.
 */
export const Chip = React.forwardRef(({
  className, style, children, size = 'md', variant, edgeImage, suffix, selected, interactive = true, status, disabled = false, ...props
}, ref) => {
  const theme = useTheme()
  const [, t] = useLanguage()
  const vars = componentVars(theme, 'chip', { size, variant: 'default' })
  const contour = !!vars['--ui-chip-border'] && vars['--ui-chip-border'] !== 'none'
  const picked = !!selected
  if (variant === 'content' || variant === 'compensated-contour') {
    // Use the same platform and state that will paint the border.
    const border = (picked && vars['--ui-chip-selected-border']) || vars['--ui-chip-border']
    const width = Number.parseFloat(border)
    const thin = theme.values.tokens.border.thin
    const extraBorder = Number.isNaN(width) ? 0 : width - thin
    vars['--ui-chip-content-padding'] = `calc(${vars['--ui-chip-padding-x']} - ${extraBorder}px)`
  }
  if (edgeImage) Object.assign(vars, edgeImageVars(theme, size))
  const classes = cn(
    chipVariants({
      variant,
      contour,
      selectedBorder: '--ui-chip-selected-border' in vars ? 'own' : 'color',
      interactive,
      hoverBorder: interactive && !contour
    }),
    edgeImage && [
      'ui:ps-(--ui-chip-image-padding-start)',
      'ui:[&_[data-slot=chip-edge-image]_svg]:text-[color:var(--ui-chip-color)]',
      'ui:data-selected:[&_[data-slot=chip-edge-image]_svg]:text-[color:var(--ui-chip-selected-color,var(--ui-chip-color))]'
    ],
    className
  )
  const state = STATUS[status]
  const content = (
    <>
      {edgeImage && (
        <span data-slot='chip-edge-image' aria-hidden='true' className='ui:inline-flex ui:shrink-0 ui:size-(--ui-chip-image-size) ui:[&>*]:size-full ui:[&>*]:rounded-(--ui-chip-image-radius)'>
          {edgeImage}
        </span>
      )}
      {variant === 'content' ? children : withEllipsis(children)}
      {suffix && <span data-slot='chip-suffix' aria-hidden='true' className='ui:inline-flex ui:ms-xs'>{suffix}</span>}
      {state && (
        <>
          <StatusIcon name={status} size='sm' className={picked ? undefined : state.color} data-slot='chip-status' />
          <span className='ui:sr-only'>{', '}{t(state.key, state.fallback)}</span>
        </>
      )}
    </>
  )
  const common = {
    'data-slot': 'chip',
    'data-selected': picked ? '' : undefined,
    'data-status': state ? status : undefined,
    style: { ...vars, ...style },
    className: classes
  }
  if (!interactive) return <span ref={ref} {...common} {...props}>{content}</span>
  return (
    <ButtonPrimitive
      ref={ref}
      aria-pressed={typeof selected === 'boolean' ? selected : undefined}
      disabled={disabled}
      {...common}
      {...props}
    >
      {content}
    </ButtonPrimitive>
  )
})
Chip.displayName = 'Chip'
