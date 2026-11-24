import styled from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'
import { themeBadgeCss, themeSpace } from '~/utils/themeTokens'

/* A badge of the theme (`components.badge`): a short status or label ("Sold
   out", "Pending", the tags of a business) or a count (the offers, the unread
   messages, a quantity).

   - variant: `variants[variant]` (primary, neutral, inverse, warning, danger,
     success; one the theme lacks is the primary): background and color;
   - size: `sizes[size]` (sm, md; sm by default): height and padding_x;
   - count: the count shape (`shapes.count`): as wide as tall at least, its
     radius, the numbers lined up.
   The base gives the radius (a pill: {radius.full}) and the text. */

export const BADGE_VARIANTS = ['primary', 'neutral', 'inverse', 'warning', 'danger', 'success']
export const BADGE_SIZES = ['sm', 'md']

/**
 * The declarations of a badge (see above). Appended last in the badge's block.
 * `weight` is the font-weight the spot declares today: it is kept over the
 * theme's text (the bold a text has is respected, as themeText does).
 */
export const badgeCss = (theme, { variant = 'primary', size = 'sm', count = false, weight } = {}) => {
  const badge = getThemeCss(theme, 'badge')
  const { height, padding_x: paddingX } = badge.sizes[size] || badge.sizes.sm
  const rules = [
    'box-sizing: border-box;',
    'display: inline-flex;',
    'align-items: center;',
    'justify-content: center;',
    'flex-shrink: 0;',
    'white-space: nowrap;',
    'border: none;',
    'box-shadow: none;',
    themeBadgeCss(theme, variant),
    `height: ${height}; min-height: ${height};`
  ]
  if (count) {
    // a count: as wide as tall at least, the smallest space beside a long number
    rules.push(`min-width: ${height};`)
    rules.push(`padding: 0 ${themeSpace(theme, 'xs')};`)
    rules.push('font-variant-numeric: tabular-nums;')
    rules.push(`border-radius: ${badge.shapes.count.radius};`)
  } else {
    rules.push(`padding: 0 ${paddingX};`)
  }
  if ((typeof weight === 'number' || typeof weight === 'string') && /^(\d{3}|bold|bolder|normal)$/.test(String(weight))) {
    rules.push(`font-weight: ${weight};`)
  }
  return rules.filter(Boolean).join('\n')
}

/**
 * A badge of the theme: `$variant`, `$size`, `$count` as badgeCss.
 */
export const Badge = styled.span`
  ${({ theme, $variant, $size, $count }) => badgeCss(theme, { variant: $variant, size: $size, count: $count })}
`
