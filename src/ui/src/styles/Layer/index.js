import { themeColor } from '~/utils/themeColors'
import { cssValue } from '~/utils/themeCss'

/* What a screen paints sits on a layer: the page canvas (tokens.color
   .background) or a floating layer over it (a modal, a sheet, a popover, a
   side panel, a menu: tokens.color.surface, or its component's background).
   Each layer says its background in one custom property, set on the body for
   the page and on the box of every floating layer; a bar that must hide what
   scrolls under it (a sticky footer, a fixed header) and that is shown both on
   a page and inside a floating layer paints that property, so it is always
   of the layer it is in. */

export const LAYER_BACKGROUND = '--layer-background'

/**
 * The background of the layer an element is in (`var(--layer-background)`),
 * the page's (tokens.color.background) where no layer says it.
 */
export const layerBackground = (theme) => `var(${LAYER_BACKGROUND}, ${themeColor(theme, 'background')})`

/**
 * The declaration a layer makes of its own background (`color`), for what is
 * inside it; empty for a value that is not one CSS value.
 */
export const layerBackgroundCss = (color) => {
  const value = cssValue(color)
  return value ? `${LAYER_BACKGROUND}: ${value};` : ''
}
