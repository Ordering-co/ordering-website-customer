import React, { forwardRef } from 'react'

/**
 * Brand glyph with the same call shape as a lucide-react icon: 24x24 box,
 * `size` sets width/height, `color` defaults to currentColor, rest goes to <svg>.
 * Monochrome on purpose: the storefront is white-label and the theme sets the color.
 */
export const createBrandIcon = (displayName, children) => {
  const BrandIcon = forwardRef(({ size = 24, color = 'currentColor', strokeWidth, absoluteStrokeWidth, ...rest }, ref) => (
    <svg
      ref={ref}
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      width={size}
      height={size}
      fill={color}
      aria-hidden='true'
      {...rest}
    >
      {children}
    </svg>
  ))
  BrandIcon.displayName = displayName
  return BrandIcon
}
