// Not adapted from shadcn/ui: it has no rating. The behavior is a Base UI radio group (a star is a radio,
// the arrows move and choose); the look is `components.rating` (the stars) and `components.rating_scale`
// (the five-point scale) of the theme.
import React from 'react'
import { useTheme } from 'styled-components'
import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { getThemeCss } from '~/utils/themeCss'
import { themeBorderWidth } from '~/utils/themeTokens'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { Icon } from './Icon'
import { RadioGroup, TARGET } from './Checkbox'
import '../styles.css'

export const RATING_MAX = 5

/** The part of star `index` (0-based) a rating fills: 3.5 → 1, 1, 1, 0.5, 0. */
export const starFill = (value, index) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(Math.max(number - index, 0), 1) : 0
}

/**
 * Whether the order's and the driver's reviews ask with two thumbs (true) or with the scale of five
 * points (false): `components.rating_scale.base.mode` (`thumbs` | `scale`).
 */
export const thumbsRating = (theme) => getThemeCss(theme, 'rating_scale').base.mode !== 'scale'

// (every class is written whole: Tailwind reads the source as text)
const GLYPH = 'ui:size-(--ui-rating-icon-size) ui:shrink-0'
const STARS = 'ui:inline-flex ui:items-center ui:gap-(--ui-rating-gap) ui:align-middle ui:leading-[0]'
// The row to vote: as wide as the theme says (its cells and gaps), no wider than the room it has. The gap
// is the room left between the cells, so it narrows on a screen that cannot hold it and the cells (44 px
// to touch) never overlap or leave the screen; only under five cells' width does the row wrap.
const VOTE = [
  'ui:inline-flex ui:w-full ui:flex-wrap ui:items-center ui:justify-between ui:align-middle ui:leading-[0]',
  'ui:[--ui-rating-cell-floor:var(--ui-rating-icon-size)]',
  /* touch-target */ 'ui:max-mobile:[--ui-rating-cell-floor:44px]',
  /* touch-target */ 'ui:pointer-coarse:[--ui-rating-cell-floor:44px]',
  'ui:max-w-[calc(var(--ui-rating-count)*max(var(--ui-rating-cell-floor),var(--ui-rating-icon-size))+(var(--ui-rating-count)-1)*var(--ui-rating-gap))]'
]
const STAR = 'ui:relative ui:inline-flex ui:shrink-0 ui:size-(--ui-rating-icon-size)'
// The filled star cut to its part (its width, inline) over the empty one, from the inline start
const CUT = 'ui:absolute ui:inset-y-none ui:[inset-inline-start:0] ui:inline-flex ui:overflow-hidden'
// A star you can pick. The cell is the touch area: the star is the radio and its `::after` fills the
// cell (the radio is not positioned, so the cell is what it fills), a cell reaching 44 px on a phone
// or with a touch screen; the painted star and the focus ring keep the theme's size.
const CELL = [
  'ui:relative ui:inline-flex ui:items-center ui:justify-center',
  /* touch-target */ 'ui:max-mobile:min-h-[44px] ui:max-mobile:min-w-[44px]',
  /* touch-target */ 'ui:pointer-coarse:min-h-[44px] ui:pointer-coarse:min-w-[44px]'
]
const RADIO = [
  'ui:inline-flex ui:shrink-0 ui:cursor-pointer ui:after:absolute ui:after:inset-none',
  'ui:data-disabled:cursor-default ui:data-disabled:opacity-(--ot-opacity-disabled)'
]

// One star filled to `part` (0–1): the empty star (outline, or filled in the empty color as the theme
// says) and over it the filled one cut to its part
const Star = ({ part, outline }) => (
  <span data-slot='rating-star' aria-hidden='true' className={STAR}>
    {part >= 1
      ? <Icon name='starFilledAi' className={cn(GLYPH, 'ui:text-(color:--ui-rating-color)')} />
      : (
        <>
          <Icon name={outline ? 'starOutline' : 'starFilledAi'} className={cn(GLYPH, 'ui:text-(color:--ui-rating-empty-color)')} />
          {part > 0 && (
            <span data-slot='rating-cut' className={CUT} style={{ width: `${part * 100}%` }}>
              <Icon name='starFilledAi' className={cn(GLYPH, 'ui:text-(color:--ui-rating-color)')} />
            </span>
          )}
        </>
        )}
  </span>
)

/**
 * Stars of `components.rating`, from 1 to `max` (5).
 *
 * - With `onChange(value)` you can vote: a radio group named by `label`, each star a radio named by
 *   `optionLabel(value, max)` (already translated, «3 of 5 stars»); `value` is the one picked (0: none)
 *   and the stars up to it are filled. The arrows move and choose. `optionProps(value)` adds
 *   attributes to each radio; `name` and `disabled` are the group's.
 * - Without it the rating is only shown: one image named by `label` (or `optionLabel(value, max)`),
 *   its stars filled to `value` (halves too).
 * - `size`: `sm | md | lg` (`md` by default, an unknown one too), the stars' icon size
 *   (`components.rating.sizes`). The color, the empty look and the gap are the theme's.
 * - Voting stars reach 44 px to touch (phone or coarse pointer): their cells grow, the stars do not.
 *   The row narrows the theme's gap to fit a narrow screen, never the cells.
 */
export const Rating = ({ value = 0, max = RATING_MAX, size, onChange, label, optionLabel = (n, of) => `${n}/${of}`, optionProps, className, style, ...props }) => {
  const theme = useTheme()
  const outline = getThemeCss(theme, 'rating').base.empty_style !== 'filled'
  const own = { style: { ...componentVars(theme, 'rating', { size }), ...style }, 'data-slot': 'rating' }
  const values = Array.from({ length: max }, (_, index) => index + 1)
  const picked = Math.round(Number(value) || 0)

  if (typeof onChange === 'function') {
    return (
      <RadioGroup aria-label={label} value={picked} onValueChange={onChange} {...own} style={{ ...own.style, '--ui-rating-count': max }} className={cn(VOTE, className)} {...props}>
        {values.map((option) => (
          <span key={option} className={cn(CELL)}>
            <RadioPrimitive.Root value={option} aria-label={optionLabel(option, max)} {...optionProps?.(option)} className={cn(RADIO)}>
              <Star part={option <= picked ? 1 : 0} outline={outline} />
            </RadioPrimitive.Root>
          </span>
        ))}
      </RadioGroup>
    )
  }

  return (
    <span role='img' aria-label={label || optionLabel(value, max)} {...own} className={cn(STARS, className)} {...props}>
      {values.map((option, index) => <Star key={option} part={starFill(value, index)} outline={outline} />)}
    </span>
  )
}

const SCALE = 'ui:relative ui:w-full ui:mb-md ui:pb-[calc(var(--ui-rating-scale-label-size)*var(--ui-rating-scale-label-line))]'
const TRACK = 'ui:relative ui:block ui:w-full ui:mb-sm ui:h-(--ui-rating-scale-height) ui:rounded-(--ui-rating-scale-radius) ui:bg-(--ui-rating-scale-track)'
const FILL = 'ui:h-full ui:max-w-full ui:rounded-[inherit] ui:bg-(--ui-rating-scale-fill)'
const MARK = 'ui:absolute ui:top-none ui:h-full ui:w-(--ui-rating-scale-mark-width) ui:bg-(--ui-rating-scale-mark)'
// An option under its point (its text is its name): the picked one in the active color
const OPTION = [
  'ui:absolute ui:cursor-pointer ui:whitespace-nowrap ui:top-[calc(var(--ui-rating-scale-height)+var(--ot-space-sm))]',
  'ui:font-(family-name:--ui-rating-scale-label-family) ui:text-(length:--ui-rating-scale-label-size) ui:leading-(--ui-rating-scale-label-line) ui:font-(weight:--ui-rating-scale-label-weight)',
  'ui:[letter-spacing:var(--ui-rating-scale-label-letter-spacing,normal)] ui:[text-transform:var(--ui-rating-scale-label-transform,none)]',
  'ui:text-(color:--ui-rating-scale-label-color) ui:data-checked:text-(color:--ui-rating-scale-label-active-color)'
]

/**
 * A scale of five points of `components.rating_scale`: a radio group named by `label`, the track
 * filled up to the option picked (`value`), a mark on each middle point it has not passed and each
 * option's name (`options`: `[{ value, label }]`, in order) under its point, the first at the start
 * and the last at the end. `onChange(value)` picks; the arrows move and choose. Each option reaches
 * 44 px to touch.
 */
export const RatingScale = ({ value = 0, options = [], onChange, label, className, style, ...props }) => {
  const theme = useTheme()
  const last = Math.max(options.length - 1, 1)
  const index = options.findIndex((option) => option.value === value)
  const rtl = !!theme?.rtl
  const at = (position) => rtl ? { right: `${position}%` } : { left: `${position}%` }
  const shift = (position) => `translateX(${rtl ? position : -position}%)`
  return (
    <RadioGroup
      aria-label={label}
      value={value ?? 0}
      onValueChange={onChange}
      data-slot='rating-scale'
      style={{ ...componentVars(theme, 'rating_scale'), '--ui-rating-scale-mark-width': themeBorderWidth(theme, 'thick', { fixed: true }), ...style }}
      className={cn(SCALE, className)}
      {...props}
    >
      <div className={TRACK}>
        <div className={FILL} style={{ width: `${index < 0 ? 0 : (index / last) * 100}%` }} />
        {options.map((option, i) => i > 0 && i < options.length - 1 && i > index && (
          <span key={option.value} aria-hidden='true' className={MARK} style={{ ...at((i / last) * 100), transform: `translateX(${rtl ? 50 : -50}%)` }} />
        ))}
      </div>
      {options.map((option, i) => (
        <RadioPrimitive.Root
          key={option.value}
          value={option.value}
          className={cn(OPTION, TARGET)}
          style={{ ...at((i / last) * 100), transform: shift((i / last) * 100) }}
        >
          {option.label}
        </RadioPrimitive.Root>
      ))}
    </RadioGroup>
  )
}
