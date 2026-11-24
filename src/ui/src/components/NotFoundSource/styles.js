import styled, { css } from 'styled-components'
import { themeColor, withAlpha } from '~/utils/themeColors'
import { headingText, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { getThemeCss, getThemeMobileCss } from '~/utils/themeCss'

/* The width below which an empty state takes its small screen values
   (components.empty_state platforms.mobile_web): its own break of today. */
export const EMPTY_STATE_NARROW_MAX = 767

/**
 * The resolved props of components.empty_state for a screen (`narrow`:
 * below 768px, its `platforms.mobile_web` over the base) and a `compact` one
 * (its variant over both: a section's empty state, alike at every width), as
 * CSS (its view: lengths with their unit).
 */
export const emptyStateTheme = (theme, { narrow = false, compact = false } = {}) => {
  const component = getThemeCss(theme, 'empty_state')
  return {
    ...component.base,
    ...(narrow && getThemeMobileCss(theme, 'empty_state')?.base),
    ...(compact && component.variants.compact)
  }
}

// The box of an empty state: its margin and, for a box (`empty` or compact),
// its padding and least height
const emptyStateBoxDecl = (props, box) => [
  `margin-top: ${props.margin}; margin-bottom: ${props.margin};`,
  box ? `padding: ${props.padding_y} ${props.padding_x}; min-height: ${props.min_height};` : ''
].filter(Boolean).join(' ')

// Its image: the square box (image_size) and the space under it (image_gap)
const emptyStateImageDecl = (props) =>
  `width: ${props.image_size}; height: ${props.image_size}; margin-bottom: ${props.image_gap};`

/**
 * Components.empty_state on NotFoundSource's box (see
 * emptyStateTheme), over its own CSS: the margin of every empty state, the
 * padding and least height of a box (`box`: the empty variant or a compact
 * one) and the size of its image, with the small screen values below 768px.
 */
export const emptyStateCss = (theme, { box = false, compact = false } = {}) => {
  const wide = emptyStateTheme(theme, { compact })
  const narrow = emptyStateTheme(theme, { compact, narrow: true })
  return `
    &&&& { ${emptyStateBoxDecl(wide, box)} }
    &&&& > img { ${emptyStateImageDecl(wide)} }
    @media (max-width: ${EMPTY_STATE_NARROW_MAX}px) {
      &&&& { ${emptyStateBoxDecl(narrow, box)} }
      &&&& > img { ${emptyStateImageDecl(narrow)} }
    }
  `
}

// Its icon without an image: the circle (icon_box_size) and the icon in it
// (icon_size)
const emptyStateIconDecl = (props) => `
  && { width: ${props.icon_box_size}; height: ${props.icon_box_size}; }
  && svg { width: ${props.icon_size}; height: ${props.icon_size}; }
`

/**
 * The icon of an empty state without an image (EmptyIcon): the circle and
 * the icon in it of components.empty_state, with the small screen sizes
 * below 768px.
 */
export const emptyStateIconCss = (theme) => `
  ${emptyStateIconDecl(emptyStateTheme(theme))}
  @media (max-width: ${EMPTY_STATE_NARROW_MAX}px) {
    ${emptyStateIconDecl(emptyStateTheme(theme, { narrow: true }))}
  }
`

/**
 * The image box of components.empty_state for an image shown
 * on its own (EmptyStateArt), with its small screen size below 768px.
 */
export const emptyStateImageCss = (theme) => `
  &&& { ${emptyStateImageDecl(emptyStateTheme(theme))} }
  @media (max-width: ${EMPTY_STATE_NARROW_MAX}px) {
    &&& { ${emptyStateImageDecl(emptyStateTheme(theme, { narrow: true }))} }
  }
`

export const NotFound = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: auto;
  /* the empty variant's padding (emptyStateCss) adds to width: 100%, not past
     its container, only with border-box */
  box-sizing: border-box;
  /* above and below, components.empty_state margin (emptyStateCss) */
  margin: 0 auto;
  text-align: center;

  h3, .not-found-title {
    ${props => headingText(props.theme, 'h3')}
    text-align: center;
    /* the theme's muted text, not a faded heading */
    color: ${props => themeColor(props.theme, 'text_muted')};
  }

  /* the empty variant is a box (its padding and least height are
     emptyStateCss') */
  ${({ $variant }) => $variant === 'empty' && css`
    max-width: min(100%, 60ch);

    h3, .not-found-title {
      opacity: 1;
      margin: 0;
    }
  `}

  @media (min-width: 768px) {
    ${({ $variant }) => $variant === 'empty' && css`
      max-width: min(100%, 70ch);
    `}
  }

  /* components.empty_state (its margin, the box's padding and
     least height, the image's size and the space under it); compact, the
     empty state of a section under its own title (the groups of
     /profile/orders), takes its compact variant at every width */
  ${({ theme, $variant, $compact }) => emptyStateCss(theme, { box: $variant === 'empty' || !!$compact, compact: !!$compact })}
`

/* the icon of an empty state without an image (EmptyStateIcon): a circle of
   components.empty_state icon_box_size tinted with the theme's primary at
   10% behind an icon in primary, icon_size inside (their small screen sizes
   below 768px). Tripled class on the icon's color: a container's own
   "svg" rule (the cart column, the checkout) does not recolor it. */
export const EmptyIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};
  border-radius: ${props => themeRadius(props.theme, 'full')};
  background-color: ${props => withAlpha(themeColor(props.theme, 'primary'), 0.1)};

  &&& svg {
    color: ${props => themeColor(props.theme, 'primary')};
  }

  @media (min-width: 768px) {
    margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  }
  ${props => emptyStateIconCss(props.theme)}
`

/* the image of the theme in place of the icon (images.empty.*),
   the one box of every empty state (NotFoundSource, EmptyStateArt): a
   square of components.empty_state image_size with image_gap under it (their
   small screen values below 768px; emptyStateImageCss, and emptyStateCss
   inside NotFoundSource), the image contained in it (never cropped or
   stretched); never wider than its column. Doubled class: a container's own
   "img" rule (the cart, the checkout) does not resize it. */
export const EmptyStateImage = styled.img`
  && {
    display: block;
    max-width: 100%;
    object-fit: contain;
    margin: 0 auto;
  }
  ${props => emptyStateImageCss(props.theme)}
`

export const EmptySubtitle = styled.p`
  margin: ${props => themeSpace(props.theme, 'sm')} 0 0;
  ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
  text-align: center;
  /* the theme's muted text */
  color: ${props => themeColor(props.theme, 'text_muted')};

  /* a paragraph: the large body text (not a heading's) */
  @media (min-width: 768px) {
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'line'] })}
  }
`

export const ButtonWrapper = styled.div`
  /* its action under the message: components.empty_state.base.actions_gap */
  margin-top: ${props => emptyStateTheme(props.theme).actions_gap};
`
