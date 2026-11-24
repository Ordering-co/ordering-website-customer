// Adapted from shadcn/ui's Base UI avatar (apps/v4/registry/bases/base/ui/avatar.tsx): its
// parts (Root, Image, Fallback) are shadcn's, the look is the theme's (`components.avatar`).
import React from 'react'
import { useTheme } from 'styled-components'
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'
import { themeTextParts } from '~/utils/themeTokens'
import { User } from 'lucide-react'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { createIcon } from './createIcon'
import '../styles.css'

// The one glyph alone, not the whole icon registry (an avatar is in lists of the first screens).
const UserIcon = createIcon({ user: User })

// Every value is `components.avatar`, written on the root by `componentVars`; `size`
// is the diameter as the theme's view already gives it (a length).
const ROOT = [
  'ui:box-border ui:flex ui:shrink-0 ui:items-center ui:justify-center ui:m-none ui:overflow-hidden',
  'ui:size-(--ui-avatar-size) ui:rounded-(--ui-avatar-radius) ui:[border:var(--ui-avatar-border)] ui:[box-shadow:var(--ui-avatar-shadow)]'
]
// The photo covers the avatar; the fallback paints the theme's background and color only
// where there is no photo (a transparent photo shows what is behind it).
// (not `ui:max-w-none`: this sheet maps `none` to the spacing scale, so it paints `max-width: 0`
// and the photo collapses)
const IMAGE = 'ui:m-none ui:block ui:size-full ui:object-cover'
const PHOTO = 'ui:max-h-full ui:max-w-full ui:rounded-none ui:[border:none]'
// TOKEN-GAP(implementation notes): `components.avatar` has no text style; the initials are drawn at the
// size's `icon_size`, which is the level the size already gives its fallback. The line height is the
// one the text inherits (not `ui:leading-none`: here `none` is the spacing level, `line-height: 0`).
const FALLBACK_PAINT = 'ui:bg-(--ui-avatar-background) ui:text-(--ui-avatar-color)'
const FALLBACK = [
  'ui:flex ui:size-full ui:select-none ui:items-center ui:justify-center',
  'ui:[&_svg]:size-(--ui-avatar-icon-size) ui:[&_svg]:shrink-0'
]

/**
 * The photo of a person (driver, customer, professional) in `components.avatar`
 * of the theme in scope.
 *
 * - `size`: `sm | md | lg | xl` (`md` by default; an unknown one is `md`).
 * - `src`: the photo. Without one, or when it does not load, the fallback shows.
 * - `variant='photo'` displays the native image immediately and shows the
 *   fallback only when the source is absent or fails.
 * - `endSpace='md'`: adds the theme's medium space at the inline end.
 * - `initialsText='display' | 'h2'`: draws review initials with the theme's
 *   display or h2 typography, with the review's bold weight and right space.
 * - `fallback`: what shows without a photo; the user icon by default, or a text
 *   (the initials, which the caller makes) in the avatar's color.
 * - `alt`: names the person (the avatar is an image with that name); without it
 *   the avatar is decoration (a name next to it already says who it is).
 * - Anything else (`className`, `style`, `data-*`) goes to the root; `className`
 *   wins over the piece's classes.
 */
export const Avatar = React.forwardRef(({ className, style, src, alt, size = 'md', fallback, variant, endSpace, initialsText, ...props }, ref) => {
  const theme = useTheme()
  const initials = initialsText === 'display' || initialsText === 'h2'
  const initialsStyle = initials && {
    ...themeTextParts(theme, 'display', { props: ['weight'], weight: 'bold' }),
    ...themeTextParts(theme, initialsText, { props: ['size', 'family'] })
  }
  const [failedSource, setFailedSource] = React.useState(null)
  React.useEffect(() => { setFailedSource(null) }, [src])
  const hasSource = typeof src === 'string' && !!src.trim()
  const directPhoto = variant === 'photo'
  const showPhoto = hasSource && (!directPhoto || failedSource !== src)
  const paintRoot = (directPhoto || initials) && !showPhoto
  const imageProps = { 'data-slot': 'avatar-image', src, alt: '' }
  const fallbackContent = (
    <AvatarPrimitive.Fallback data-slot='avatar-fallback' className={cn(FALLBACK, !paintRoot && FALLBACK_PAINT, !initials && 'ui:text-(length:--ui-avatar-icon-size)')}>
      {fallback ?? <UserIcon name='user' />}
    </AvatarPrimitive.Fallback>
  )
  const named = typeof alt === 'string' && !!alt.trim()
  return (
    <AvatarPrimitive.Root
      ref={ref}
      data-slot='avatar'
      data-size={size}
      {...(named ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': 'true' })}
      {...props}
      style={{
        ...componentVars(theme, 'avatar', { size }),
        ...initials && {
          fontSize: initialsStyle['font-size'],
          fontWeight: initialsStyle['font-weight'],
          fontFamily: initialsStyle['font-family']
        },
        ...style
      }}
      className={cn(ROOT, paintRoot && FALLBACK_PAINT, endSpace === 'md' && 'ui:me-md', initials && 'ui:mr-lg', className)}
    >
      {showPhoto && (directPhoto
        ? <img {...imageProps} onError={() => setFailedSource(src)} className={cn(IMAGE, PHOTO)} />
        : <AvatarPrimitive.Image {...imageProps} className={IMAGE} />)}
      {(!directPhoto || !showPhoto) && fallbackContent}
    </AvatarPrimitive.Root>
  )
})
Avatar.displayName = 'Avatar'
