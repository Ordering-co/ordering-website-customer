import React from 'react'
import { useTheme } from 'styled-components'
import { themeBorderWidth, themeIconSize } from '~/utils/themeTokens'
import { cn } from '../lib/cn'
import '../styles.css'

// TOKEN-GAP(implementation notes): the theme has no size under its small icon, and a dot is smaller than any
// icon. Its sizes are fractions of `tokens.icon.sm`, so they follow the store's icon scale: 6, 8 and
// 12 with the default 16 (the bullets of a card's details, the connection status and the larger bullet).
const SIZES = { xs: (icon) => `calc(${icon} * 3 / 8)`, sm: (icon) => `calc(${icon} / 2)`, md: (icon) => `calc(${icon} * 3 / 4)` }
// (every class is written whole: the Tailwind scanner reads text, not code)
const COLORS = {
  success: 'ui:bg-success',
  warning: 'ui:bg-warning',
  danger: 'ui:bg-danger',
  primary: 'ui:bg-primary',
  muted: 'ui:bg-border-strong',
  current: 'ui:bg-current'
}

// the same colors as a ring (every class is written whole)
const RING_COLORS = {
  success: 'ui:border-success',
  warning: 'ui:border-warning',
  danger: 'ui:border-danger',
  primary: 'ui:border-primary',
  muted: 'ui:border-border-strong',
  current: 'ui:border-current'
}

/**
 * A small round mark: a bullet between details, or the state of something (connected,
 * connecting, failed).
 *
 * - `size`: `xs`, `sm` (default) or `md`: fractions of the theme's small icon (3/8, 1/2 and 3/4),
 *   not px, so the dot follows the store's icon scale. An unknown size is `sm`.
 * - `color`: `success`, `warning`, `danger`, `primary`, `muted` (the strong border color) or
 *   `current` (default: the text's color). An unknown color is `current`.
 * - `outline`: a ring with a clear centre, in the same size and color; the origin of a slider. Its line is
 *   the theme's fixed thin line (a drawn shape, not the boxes' border, which a store can set to none), never
 *   thinner than an eighth of the dot (`--ui-dot-border-width`), so it stays visible. Off by default.
 * - It is decoration, hidden from assistive technology. When the dot is the only thing that says
 *   a state, give it `label` (already translated): it becomes an image with that name.
 * - Anything else (`className`, `style`, `data-*`) goes to the span; `className` wins.
 */
export const Dot = React.forwardRef(({ className, style, size = 'sm', color = 'current', outline = false, label, ...props }, ref) => {
  const theme = useTheme()
  const length = (SIZES[size] ?? SIZES.sm)(themeIconSize(theme, 'sm'))
  return (
    <span
      ref={ref}
      data-slot='dot'
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' })}
      {...props}
      style={{ '--ui-dot-size': length, ...(outline && { '--ui-dot-border-width': `max(${themeBorderWidth(theme, 'thin', { fixed: true })}, calc(var(--ui-dot-size) / 8))` }), ...style }}
      className={cn('ui:inline-block ui:shrink-0 ui:rounded-full ui:size-(--ui-dot-size)', outline ? ['ui:box-border ui:bg-transparent ui:border-solid ui:border-(length:--ui-dot-border-width)', RING_COLORS[color] ?? RING_COLORS.current] : COLORS[color] ?? COLORS.current, className)}
    />
  )
})
Dot.displayName = 'Dot'
