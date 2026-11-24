import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { headingText, themeText, themeSpace, themeBorderWidth, themeMedia } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'
import { dividerRules } from '~ui/src/styles/Divider'
import { alertRules } from '~ui/src/styles/Alert'

/* the spaces of the theme (md around, xs under each block) */
export const Container = styled.div`
  padding: 0px ${props => themeSpace(props.theme, 'md')};

  div:not(:last-child) {
    padding-bottom: ${props => themeSpace(props.theme, 'xs')};
  }

  @media (min-width: 769px) {
    padding: ${props => themeSpace(props.theme, 'md')};
    /*
     * implementation notesin a modal or drawer the body's own padding is what comes after the cart (the layer says
     * so with --layer-end-gap, 0), so this space under it left a hole under the sticky footer and made it
     * jump at the end of the list. Elsewhere (the store's column, the checkout) the variable is unset: the md above.
     */
    margin-bottom: var(--layer-end-gap, ${props => themeSpace(props.theme, 'md')});
    padding-bottom: var(--layer-end-gap, ${props => themeSpace(props.theme, 'md')});
  }
`

export const WrapperContainer = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
`

export const NotCarts = styled.div`
  height: 35dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 80%;
  margin: auto;

  ${({ isSlideBar }) => isSlideBar && css`
    height: auto;
    /* the header and the panel's close above it */
    min-height: calc(100vh - 2 * var(--header-height, ${props => getThemeCss(props.theme, 'header').base.height}));
    min-height: calc(100dvh - 2 * var(--header-height, ${props => getThemeCss(props.theme, 'header').base.height}));
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;

    #not-found-source {
      box-sizing: border-box;
      max-width: 100%;
    }
  `}

  img {
    width: ${props => themeMedia(props.theme, '4xl')};
    height: auto;
    aspect-ratio: attr(width) / attr(height)
  }
  /* NotFoundSource's message (an h3): its own typography */
  h3 {
    margin: ${props => themeSpace(props.theme, 'xs')} 0px 0px;
    text-align: center;
    /* secondary text of the theme (text_muted), not a faded one */
    color: ${props => themeColor(props.theme, 'text_muted')};
  }
`

export const Title = styled.h3`
  ${props => headingText(props.theme, 'h3')}
  color: ${props => themeColor(props.theme, 'text')};
  margin-bottom: ${props => themeSpace(props.theme, 'sm')};
  margin-top: 0;
  text-align: center;

  @media (min-width: 576px) {
    text-align: left;
  }
`

export const CartGroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${props => themeSpace(props.theme, 'sm')};

  button {
    flex-shrink: 0;
  }
`

export const CartGroupTitle = styled.h3`
  ${props => headingText(props.theme, 'h3')}
  /* the spacing it had as a paragraph */
  margin-top: ${props => themeSpace(props.theme, 'lg')};
  margin-bottom: ${props => themeSpace(props.theme, 'sm')};
  display: flex;
  align-items: center;
  min-width: 0;
`

export const CartGroupCheckoutPrice = styled.span`
  margin-inline-start: ${props => themeSpace(props.theme, 'xs')};
`

export const PendingBadge = styled.span`
  color: ${props => primaryText(props.theme)};
  ${props => themeText(props.theme, 'caption', { props: ['size'] })}
  margin-left: ${props => themeSpace(props.theme, 'xs')};
`

export const CartGroupDivider = styled.div`
  height: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })};
  background-color: ${props => themeColor(props.theme, 'border')};
  width: 100%;
  left: 0px;
  /* components.divider section, in the flow between the groups (the
     container's padding-bottom of its divs is not its spacing) */
  position: static;
  ${props => dividerRules(props.theme, 'section', { specificity: 3 })}
`

/* a section of the theme apart (space xl), its rows xs */
export const MultiCartPriceContainer = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: ${props => themeSpace(props.theme, 'xs')};
    margin-bottom: ${props => themeSpace(props.theme, 'xs')};
    /* "Total for all carts" and its amount: text, not headings */
    > p.total {
      ${props => themeText(props.theme, 'h4')}
      color: inherit;
      margin: 0;
    }
  }
  > span {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${props => themeSpace(props.theme, 'xs')};
  }
  p {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text_muted')};
    margin: 0;
  }
`

/* The note under the totals of a group of carts (a span of
   MultiCartPriceContainer): an info alert of the theme, not a
   live message (no role) */
export const CartGroupMessage = styled.span`
  ${props => alertRules(props.theme, 'info')}
  && {
    margin-top: ${props => themeSpace(props.theme, 'md')};
  }
`
