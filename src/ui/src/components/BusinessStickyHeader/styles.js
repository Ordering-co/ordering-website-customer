import styled, { css } from 'styled-components'
import { themePart, themeShadowDown, themeSize } from '~/utils/themeTokens'
import { headerSide } from '~ui/src/components/Header/styles'
import { HEADER_OFFSET_VAR, HEADER_SCROLL_REVEAL } from '~ui/src/components/Header/scrollBehavior'
import { motionCss } from '~/utils/themeMotion'
import { getThemeCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { rtlMirrorCss } from '~ui/src/styles/Chevron'

/* The business's header, fixed on top once the page scrolls past the name
   (`fixed-name`): a header of components.header (its height, background, text
   color and bottom border; its shadow falls down, the bar spans the whole
   width) with the back arrow (when the page has one), the name and the
   cart. It hangs under what the header covers (`--header-offset`: the header's
   height, 0 while a revealing header is hidden) and moves with it. Over the fixed categories
   (`categories-docked`), theirs is the shadow of both. */
export const StickyHeader = styled.div`
  display: none;

  &.fixed-name {
    display: flex;
    align-items: center;
    gap: ${props => getThemeCss(props.theme, 'header').base.gap};
    position: fixed;
    /* under the header (its offset, which already holds the status area it pads) and, with a revealing
       header out of view, under the system's status area */
    top: max(var(${HEADER_OFFSET_VAR}, 0px), env(safe-area-inset-top, 0px));
    left: 0;
    right: 0;
    z-index: 10001;
    box-sizing: content-box;
    min-height: ${props => getThemeCss(props.theme, 'header').base.height};
    padding: 0 ${props => headerSide(props.theme)}px;
    ${props => themePart(props.theme, 'header', { background: 'base.background', color: 'base.color', 'border-bottom': 'base.border_bottom' })}
    ${props => themeShadowDown(props.theme, 'header')}
  }

  /* the bar goes up and down with the revealing header, by the header's motion */
  html:has([data-app-header][data-scroll-behavior='${HEADER_SCROLL_REVEAL}']) &.fixed-name {
    ${props => motionCss(props.theme, 'header', ['top'])}
  }

  &.fixed-name.categories-docked {
    box-shadow: none;
  }

  /* with a fixed header the row has the store: the bar stays in
     the page, for the elements that look for it, without a box */
  ${props => props.$fused && css`
    &&&.fixed-name {
      display: none;
    }
  `}
`

/* components.header.base.title */
export const StickyTitle = styled.p`
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  ${props => themePart(props.theme, 'header', { text: 'base.title' })}

  @media (width < ${MOBILE_WEB_MAX_WIDTH}px) {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    white-space: normal;
    overflow-wrap: anywhere;
  }
`

/* The brand (implementation notes, Single Restaurant): a small logo, whole and never
   cropped, in place of the name once the bar is fixed. */
export const StickyBrandLogo = styled.img`
  flex: 1 1 auto;
  min-width: 0;
  height: ${props => themeSize(props.theme, 'sm')};
  max-width: 100%;
  object-fit: contain;
`

/* the back arrow points to the start of the line: mirrored right to left */
export const BackArrow = styled.span`
  display: inline-flex;
  ${props => rtlMirrorCss(props.theme)}
`
