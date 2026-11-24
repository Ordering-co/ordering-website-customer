import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { getThemeComponent, getThemeCss } from '~/utils/themeCss'
import { Icon } from '~ui/src/design-system/components/Icon'

// The sizes of components.avatar: sm 36 (the chat), md 44 (a row: the driver
// of the tracking, of a finished order, of a review; a review's author in a
// column), lg 65 (the driver of an active order, a professional, a review's
// author), xl 100 (a person's block of the tracking)
export const AVATAR_SIZES = ['sm', 'md', 'lg', 'xl']
export const DEFAULT_AVATAR_SIZE = 'md'

/**
 * The resolved look of an avatar of components.avatar, its base with the size
 * over it (`{ size, icon_size, radius, background, color, border, shadow }`); an
 * unknown size is md.
 */
const avatarProps = (avatar, size = DEFAULT_AVATAR_SIZE) => ({ ...avatar.base, ...(avatar.sizes[size] || avatar.sizes[DEFAULT_AVATAR_SIZE]) })

export const avatarTheme = (theme, size) => avatarProps(getThemeComponent(theme, 'avatar'), size)

/**
 * The declarations of an avatar's box (`size`: sm | md | lg | xl): its size (it
 * does not shrink in a row), rounding, border and shadow; its photo covers it;
 * without a photo (`hasPhoto` false) the user icon at the size's icon_size,
 * centered on the avatar's background in its color. For a box drawn by a screen
 * (its own class).
 */
export const avatarBoxCss = (theme, size = DEFAULT_AVATAR_SIZE, { hasPhoto = true } = {}) => {
  // (its view: the same look as CSS)
  const look = avatarProps(getThemeCss(theme, 'avatar'), size)
  const box = look.size
  const icon = look.icon_size
  return [
    `width: ${box}; height: ${box}; min-width: ${box}; max-width: ${box}; max-height: ${box};`,
    'flex-shrink: 0; box-sizing: border-box; overflow: hidden; display: flex; align-items: center; justify-content: center; margin: 0;',
    `border-radius: ${look.radius};`,
    `border: ${look.border};`,
    `box-shadow: ${look.shadow.css};`,
    // doubled class: over a row's own img / svg rules (an icon size of its own)
    '&& img { width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: cover; display: block; margin: 0; border-radius: 0; border: none; }',
    !hasPhoto && `background: ${look.background};`,
    !hasPhoto && `color: ${look.color};`,
    !hasPhoto && `&& svg { width: ${icon}; height: ${icon}; min-width: ${icon}; margin: 0; color: inherit; }`
  ].filter(Boolean).join('\n')
}

// Its size, rounding and colors are components.avatar's (avatarBoxCss)
const AvatarBox = styled.span`
  ${({ theme, $size, $hasPhoto }) => avatarBoxCss(theme, $size, { hasPhoto: $hasPhoto })}
`

/**
 * The photo of a person (driver, customer, professional) in
 * components.avatar: `size` sm | md | lg | xl (md by default). Without a
 * photo, or when it fails to load, the user icon. `alt` names the person
 * (the avatar is an image with that name); without it the avatar is
 * decorative (a name next to it already says who it is).
 */
export const Avatar = ({ src, alt, size = DEFAULT_AVATAR_SIZE, className, ...props }) => {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])
  const hasPhoto = typeof src === 'string' && !!src.trim() && !failed
  const named = typeof alt === 'string' && !!alt.trim()
  return (
    <AvatarBox
      className={className}
      $size={size}
      $hasPhoto={hasPhoto}
      {...(named ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': 'true' })}
      {...props}
    >
      {hasPhoto
        ? <img src={src} alt='' onError={() => setFailed(true)} />
        : <Icon name='user' aria-hidden='true' />}
    </AvatarBox>
  )
}
