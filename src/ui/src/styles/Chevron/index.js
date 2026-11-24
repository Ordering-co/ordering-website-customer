import React from 'react'
import styled, { css } from 'styled-components'
import { createIcon } from '~ui/src/design-system/components/createIcon'
import { CHEVRON_DOWN_MASK, CHEVRON_GLYPHS } from '~ui/src/components/Icon/chevronGlyphs'
import { accordionChevronCss, themeIconSize } from '~/utils/themeTokens'
import { motionCss } from '~/utils/themeMotion'
import { getThemeCss } from '~/utils/themeCss'

/**
 * The app's one chevron, always decorative (aria-hidden: the control that
 * holds it says what it does):
 * - `disclose`: an accordion or a collapsible row. chevronDown, pointing down
 *   while closed and turned 180° while open, with the accordion's look
 *   (accordionChevronCss) and motion (`motion`, `accordion` unless a
 *   component of its own animates it, e.g. `product_option`).
 * - `list`: a field or select that opens a list in place. chevronDown of
 *   components.input `icon_size`, in the field's text color (currentColor),
 *   `icon_gap` before it. Turned 180° while its list is open (`open`), with
 *   the menu's motion; a trigger that opens a modal leaves `open` out and
 *   never turns.
 * - `navigate`: a row or button that enters or goes back (`direction`
 *   'forward' | 'back'). chevronRight / chevronLeft in currentColor, mirrored
 *   right to left; its size is its container's (`size`), the md icon
 *   otherwise.
 *
 * `size` (a CSS length) replaces the kind's size, `false` leaves it to the
 * container's rules; `gap={false}` drops the list's gap (a container with its
 * own gap).
 */

// The three glyphs (components/Icon/chevronGlyphs.js), Lucide's: only these, not the whole registry.
const ChevronGlyph = createIcon(CHEVRON_GLYPHS)

const KIND_MOTION = { disclose: 'accordion', list: 'menu' }

/** `transform: scaleX(-1)` right to left: a chevron or arrow that points forward or back. */
export const rtlMirrorCss = (theme) => (theme?.rtl ? 'transform: scaleX(-1);' : '')

// The list chevron's size and gap: components.input icon_size / icon_gap
const inputIconSize = (theme) => getThemeCss(theme, 'input').base.icon_size
const inputIconGap = (theme) => getThemeCss(theme, 'input').base.icon_gap

const sizeCss = (size) => (size ? `font-size: ${size}; width: ${size}; height: ${size};` : '')

const kindSize = (theme, kind) => {
  if (kind === 'list') return inputIconSize(theme)
  if (kind === 'navigate') return themeIconSize(theme, 'md')
  return null
}

const turnCss = (theme, $open, $motion) => {
  if (typeof $open !== 'boolean') return ''
  return `
    transform: rotate(${$open ? 180 : 0}deg);
    ${motionCss(theme, $motion, ['transform'])}
  `
}

// &&& so a container's `svg` rules (the sizes and margins of its own icons)
// do not win over the chevron's
const ChevronSvg = styled(ChevronGlyph)`
  &&& {
    flex-shrink: 0;
    vertical-align: middle;
    ${({ theme, $kind, $open, $size, $gap, $motion }) => {
      if ($kind === 'navigate') {
        return css`
          ${sizeCss($size === undefined ? kindSize(theme, $kind) : $size)}
          ${rtlMirrorCss(theme)}
        `
      }
      if ($kind === 'list') {
        const gap = $gap === false ? null : inputIconGap(theme)
        return css`
          ${sizeCss($size === undefined ? kindSize(theme, $kind) : $size)}
          ${gap ? `margin-inline-start: ${gap};` : ''}
          ${turnCss(theme, $open, $motion)}
        `
      }
      return css`
        ${accordionChevronCss(theme)}
        ${$size ? sizeCss($size) : ''}
        ${turnCss(theme, !!$open, $motion)}
      `
    }}
  }
`

export const ChevronIcon = ({ kind = 'disclose', open, direction = 'forward', size, gap, motion, className, ...rest }) => {
  const name = kind === 'navigate'
    ? (direction === 'back' ? 'chevronLeft' : 'chevronRight')
    : 'chevronDown'
  return (
    <ChevronSvg
      name={name}
      className={className}
      aria-hidden='true'
      focusable='false'
      data-chevron={kind}
      $kind={kind}
      $open={open}
      $size={size}
      $gap={gap}
      $motion={motion || KIND_MOTION[kind]}
      {...rest}
    />
  )
}

/**
 * The list chevron drawn on an element that is not ours (a library's select
 * arrow): the chevronDown glyph as a mask painted in `color` (currentColor,
 * the field's text), of components.input `icon_size`.
 */
export const listChevronMaskCss = (theme, { color = 'currentColor' } = {}) => {
  const size = inputIconSize(theme)
  return `
    width: ${size}; height: ${size};
    background-color: ${color};
    -webkit-mask: ${CHEVRON_DOWN_MASK} center / contain no-repeat;
    mask: ${CHEVRON_DOWN_MASK} center / contain no-repeat;
  `
}

/** components.input `icon_gap` (px), the space before a list chevron. */
export const listChevronGap = inputIconGap
