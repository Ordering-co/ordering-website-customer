import React from 'react'
import { useTheme } from 'styled-components'
import {
  NotFound,
  EmptyIcon,
  EmptyStateImage,
  EmptySubtitle,
  ButtonWrapper
} from './styles'

import { Button } from '~ui/src/design-system/components/Button'

import { EmptyStateGlyph } from '~ui/src/components/Icon/emptyStateGlyphs'
import { themeImage } from '~/utils/themeTokens'

/**
 * The image of an empty state, the one of its own (`image`, e.g.
 * `themeImage(theme, 'empty.sessions')`) or else the theme's `empty.not_found`.
 * Null without either.
 */
export const emptyStateImageSrc = (theme, image) => {
  return (typeof image === 'string' && image.trim()) ? image : themeImage(theme, 'empty.not_found')
}

/**
 * The circle of an empty state without an image: an icon of the registry
 * (`Icon/emptyStateGlyphs`, `name`) over the theme's primary at 10% (EmptyIcon). Reused
 * by NotFoundSource and by the empty states that keep their own layout (the
 * cart column of a store, EmptyStateArt). Decorative: `aria-hidden`, never
 * focusable (the base Icon sets both).
 */
export const EmptyStateIcon = ({ name }) => (
  <EmptyIcon>
    <EmptyStateGlyph name={name} />
  </EmptyIcon>
)

/**
 * The image (and box) of an empty state for the empty states
 * that keep their own layout (the cart column of a store): the image of
 * `emptyStateImageSrc`, or its `children` (the icon it had) without one.
 */
export const EmptyStateArt = ({ image, alt = '', children = null }) => {
  const theme = useTheme()
  const src = emptyStateImageSrc(theme, image)
  return src ? <EmptyStateImage src={src} alt={alt} loading='lazy' /> : children
}

/**
 * Empty / not-found placeholder.
 * - variant `empty`: valid empty lists (no items yet, no matches) — icon
 *   `bag` by default
 * - variant `notFound` (default): errors, missing resources, expired items —
 *   icon `signpost` by default
 * - `icon`: a key of `EMPTY_STATE_GLYPHS` (a subset of the icon registry); the circle of
 *   EmptyStateIcon, the theme's primary at 10% behind it in primary. A theme
 *   image (`image` below) takes its place when there is one.
 * - `headingLevel`: the tag of its message (`h3` by default), one level under
 *   the heading it sits under (`h1` when it is the page's only content)
 * - `headingRef`: optional ref for focusing an error heading as it appears.
 * - `statusMessage`: text announced on change. Pass an empty string to mount
 *   the live region before the first update.
 * - `image`: the image of the theme for this empty state (e.g.
 *   `empty.address_list`); without it, the theme's `empty.not_found`. With
 *   neither the icon stays. Its text is `alt=''`
 *   next to a message that already says it, `imageAlt` otherwise.
 * - `id`: its element's id (`not-found-source` by default); a page with more
 *   than one (the sections of /profile/orders) gives each its own.
 * - `compact`: the empty state of a section under its title, not
 *   of a page: no page height, a short padding and the small image box.
 */
export const NotFoundSource = (props) => {
  const {
    content,
    subtitle,
    statusMessage,
    variant = 'notFound',
    btnTitle,
    onClickButton,
    headingLevel = 'h3',
    headingRef,
    image,
    imageAlt,
    id = 'not-found-source',
    compact,
    icon
  } = props
  const theme = useTheme()
  const Title = /^h[1-6]$/.test(headingLevel) ? headingLevel : 'h3'

  const isEmpty = variant === 'empty'
  const imageSrc = emptyStateImageSrc(theme, image)

  return (
    <NotFound $variant={variant} $compact={compact} id={id}>
      {imageSrc
        ? <EmptyStateImage src={imageSrc} alt={content ? '' : (imageAlt || '')} loading='lazy' />
        : <EmptyStateIcon name={icon || (isEmpty ? 'bag' : 'signpost')} />}
      {content && (
        <Title ref={headingRef} tabIndex={headingRef ? -1 : undefined} className='not-found-title'>{content}</Title>
      )}
      {subtitle && isEmpty && <EmptySubtitle>{subtitle}</EmptySubtitle>}
      {typeof statusMessage === 'string' && <EmptySubtitle role='status'>{statusMessage}</EmptySubtitle>}
      {!onClickButton && props.children && (
        <ButtonWrapper>
          {props.children}
        </ButtonWrapper>
      )}
      {onClickButton && (
        <ButtonWrapper>
          <Button
            appearance='outline'
            size='md'
            onClick={() => onClickButton()}
          >
            {btnTitle}
          </Button>
        </ButtonWrapper>
      )}
    </NotFound>
  )
}
