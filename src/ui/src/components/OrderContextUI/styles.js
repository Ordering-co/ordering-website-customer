import styled, { css } from 'styled-components'
import { pageGutter, themeSpace, themeText } from '~/utils/themeTokens'
import { themeColor } from '~/utils/themeColors'
import React from 'react'
import { Button } from '~ui/src/design-system/components/Button'
import { headerDockedRules, HEADER_HEIGHT_VAR, HEADER_LAYER } from '~ui/src/components/Header/styles'
import { HEADER_SCROLL_REVEAL, HEADER_STATE_HIDDEN } from '~ui/src/components/Header/scrollBehavior'
import { motionCss } from '~/utils/themeMotion'
import { ORDER_CONTEXT_BAR_ONE_ROW } from '~ui/src/components/Header/orderContextPlacement'

export const Container = styled.div`
  /* the business list's sides are the page's */
  ${({ isBusinessList, theme }) => isBusinessList && css`
    width: 100%;
    padding: 0 ${pageGutter(theme)}px;
    box-sizing: border-box;
  `}
  ${({ hero, isCheckOut }) => (hero && !isCheckOut) && css`
    position: absolute;
    top: 10%;
  `}
  /* md above it */
  margin-top: ${({ theme }) => themeSpace(theme, 'md')};
  /* docked (small screens: the business list, the store, the checkout): a bar of the whole width right under the header that continues
     it (its background and shadow), the page's sides, space.lg above and
     below its controls and space.xl (the sections' rhythm) from the content.
     The page puts it at the top, full width. */
  ${({ $docked, theme }) => $docked && css`
    width: 100%;
    box-sizing: border-box;
    margin: 0 0 ${themeSpace(theme, 'xl')};
    padding: ${themeSpace(theme, 'lg')} ${pageGutter(theme)}px;
    ${headerDockedRules(theme)}
    /* with a revealing header (scroll_behavior reveal) the bar is its dock:
       pegged right under it, and it hides and comes back with it by the
       header's motion (the header's height plus its own, so both move as one).
       With a fixed header it stays in the flow, as always. */
    html:has([data-app-header][data-scroll-behavior='${HEADER_SCROLL_REVEAL}']) & {
      position: sticky;
      top: var(${HEADER_HEIGHT_VAR}, 0px);
      /* just under the header (its layer), over the page */
      z-index: ${HEADER_LAYER - 1};
      ${motionCss(theme, 'header', ['transform'])}
    }
    html:has([data-app-header][data-scroll-state='${HEADER_STATE_HIDDEN}']) & {
      transform: translateY(calc(-100% - var(${HEADER_HEIGHT_VAR}, 0px)));
    }
    /* the capsule's address takes the room the type and the moment leave and
       cuts its text with an ellipsis (its title has the whole one) */
    [data-doc-control='order-address-open'] {
      flex: 1 1 auto;
      min-width: 0;
      > span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: start;
      }
    }
    /* the type's segments and the moment keep their whole width */
    [data-doc-control='order-moment-open'],
    [role='group'] > :has(> [data-doc-section='header-order-types']) {
      flex: 0 0 auto;
    }
    /* from 576px: one row of the content's whole width (its sides the
       page's), the address the rest of it, cut with an ellipsis */
    @media (min-width: ${ORDER_CONTEXT_BAR_ONE_ROW}px) {
      display: flex;
      align-items: center;
      gap: ${themeSpace(theme, 'md')};
      /* the address Button takes the rest of the row; its own min-width is 0, so its text ends in … */
      > button {
        flex: 1 1 auto;
        margin-bottom: 0;
      }
      > div {
        width: auto;
        flex: 1 1 auto;
        min-width: 0;
      }
      > div > button {
        flex: 0 0 auto;
      }
    }
  `}
`

// The address is a base Button (md ghost neutral, like the header's): its row spaces it from
// the controls under it, and its text is cut with an ellipsis before it pushes the icon out
export const AddressMenuRow = styled.div`
  margin-bottom: ${props => themeSpace(props.theme, 'md')};
`

export const AddressLabel = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: start;
`

export const FeatureItems = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  /* the order type and the moment never touch */
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

/* The order type and the moment of the bar, each a button with
   the look of a field of components.input (its box, height, text and side
   space; the theme's states, no hover of its own): its icon, its value and a
   chevron, xs apart. It opens its modal. The two share the row. */
export const FieldButton = React.forwardRef((props, ref) => <Button {...props} ref={ref} appearance='input-trigger' />)
FieldButton.displayName = 'FieldButton'

/* the cart's line of the order (isCart): the order type and the moment, two
   links a muted dot apart, under the cart's title */
export const CartContextLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  margin-bottom: ${({ theme }) => themeSpace(theme, 'sm')};
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'body', { props: ['size'] })}
`
