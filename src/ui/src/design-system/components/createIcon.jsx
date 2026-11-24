import React from 'react'
import { useTheme } from 'styled-components'
import { themeIconSize } from '~/utils/themeTokens'

// A level of the theme's icon sizes (`tokens.icon`: sm, md, lg), not a length.
const isLevel = (theme, size) => typeof size === 'string' && !!theme?.css?.tokens?.icon && Object.hasOwn(theme.css.tokens.icon, size)

/**
 * The icon component of a registry (`{ name: LucideGlyph }`): `filled` is the
 * set of names drawn solid. It imports no registry itself, so a screen in the
 * entry chunk can have an icon of its few glyphs instead of the whole set
 * (`Icon` is this one with the full registry).
 *
 * - `size`: a level of the theme (`'sm' | 'md' | 'lg'`, `tokens.icon`) or any
 *   length (`'1em'`, the default, follows the text it sits in; a number is px).
 * - `label`: what the icon says. Without it the icon is decoration and hidden
 *   from assistive technology; with it, an `img` with that name (already
 *   translated: the piece has no text of its own).
 * - The color is the text's (`currentColor`); a name in `filled` is filled
 *   with it. The stroke is Lucide's: the theme has no stroke token.
 * - Anything else (`className`, `style`…) goes to the `<svg>`.
 */
export const createIcon = (registry, filled) => {
  const Icon = ({ name, size = '1em', label, className, ...rest }) => {
    const theme = useTheme()
    const Glyph = registry[name]
    if (!Glyph) {
      if (process.env.NODE_ENV !== 'production') console.warn(`Icon: unknown name "${name}"`)
      return null
    }
    const length = isLevel(theme, size) ? themeIconSize(theme, size) : size
    return (
      <Glyph
        size={length}
        className={className}
        {...(filled?.has(name) && { fill: 'currentColor' })}
        {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true', focusable: 'false' })}
        {...rest}
      />
    )
  }
  return Icon
}
