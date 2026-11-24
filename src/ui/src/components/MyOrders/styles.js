import styled, { css } from 'styled-components'
import { themeSpace, headingText } from '~/utils/themeTokens'
import { ACCOUNT_PAGE, pageContainerRules, pageTitleRules } from '~ui/src/styles/Page'
import { dividerCss, dividerTheme } from '~ui/src/styles/Divider'
import { sectionTitleTextCss } from '~ui/src/styles/SectionHeader'
import { OptionTitle, OrdersContainer } from '~ui/src/components/OrdersOption/styles'
import { Container as OrderCard } from '~ui/src/components/SingleOrderCard/styles'
import { WrappButton as LoadMoreOrders } from '~ui/src/components/VerticalOrdersLayout/styles'
import { NotFound as EmptyState } from '~ui/src/components/NotFoundSource/styles'

/* The orders page (not embedded in the search): the rhythm of
   the saved places, from the theme's spaces (tokens.space). A group's title
   (Upcoming, Active, Past orders) on the page's edge, md over its first card;
   its cards one column flush with it, md apart (no margins of their own); its
   "load more" md under them. The groups xl apart: the next title xl down, or
   the divider xl above and below it. A group without orders: its empty
   state (NotFoundSource) md under its title, no margin of its own (its
   padding keeps the room around the image and the message). */
/* "My appointments" (the appointments layout): a section of the page's h1
   ($level h2), md over the tabs */
export const AppointmentsTitle = styled.h1.attrs(props => (props.$level ? { as: props.$level } : {}))`
  ${props => props.$level && css`
    ${headingText(props.theme, props.$level)}
    margin: 0 0 ${themeSpace(props.theme, 'md')};
  `}
`

const ordersRhythm = (theme) => {
  const md = themeSpace(theme, 'md')
  const xl = themeSpace(theme, 'xl')
  return css`
    ${OptionTitle} {
      margin: 0 0 ${md};
      padding: 0;
    }
    ${OptionTitle} ~ ${OptionTitle} {
      margin-top: ${xl};
    }
    ${Divider} + ${OptionTitle} {
      margin-top: 0;
    }
    ${OrdersContainer} {
      gap: ${md};
    }
    ${OrderCard} {
      margin: 0;
    }
    ${LoadMoreOrders} {
      margin: ${md} auto 0;
    }
    ${OptionTitle} + ${EmptyState} {
      margin: 0 auto;
    }
    /* a group's title (Upcoming, Active, Past orders) and the appointments'
       one: section titles (components.section_header: text and color) */
    ${OptionTitle} h2, ${AppointmentsTitle} {
      ${sectionTitleTextCss(theme, { level: 'h2' })}
    }
  `
}

export const Title = styled.h1`
  ${props => headingText(props.theme, 'h1')}
  ${props => pageTitleRules(props.theme)}
`
export const Container = styled.div`
  padding: ${props => themeSpace(props.theme, 'lg')};
  overflow: hidden;
  min-height: auto;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  ${({ initialHeight }) => !initialHeight && css`
    min-height: 60dvh;
  `}

  @media (min-width: 769px) {
    ${({ hideOrders }) => !hideOrders
? css`
      padding: 0 ${props => themeSpace(props.theme, 'xxl')} ${props => themeSpace(props.theme, 'xxl')};
      width: 75%;
    `
: css`
      padding: 0;
      width: 100%;

      @media (min-width: 993px) {
        min-height: 'auto';
      }
    `}
    margin-left: auto;
    margin-right: auto;
  }

  /* the box of the account pages (not embedded in the search),
     its titles the page's */
  ${props => !props.initialHeight && !props.hideOrders && pageContainerRules(props.theme, ACCOUNT_PAGE)}
  > h1 {
    ${props => headingText(props.theme, 'h1')}
    ${props => pageTitleRules(props.theme)}
  }
  ${props => !props.initialHeight && !props.hideOrders && ordersRhythm(props.theme)}
`

/* Between two groups of orders: the divider the page chooses
   (orders_page.base.divider: the band, a section line or none; the band by
   default) of components.divider (its color and thickness) in the page's
   rhythm, xl above and below (the divider's own spacing is not added).
   `none`, or a divider without a line, draws nothing and keeps the groups xl
   apart. */
const ordersBand = (theme) => {
  const xl = themeSpace(theme, 'xl')
  const variant = theme.values.components.orders_page.base.divider
  const nothing = `&& { height: 0; background: none; border: none; margin: ${xl} 0 0; }`
  if (variant === 'none' || !dividerTheme(theme, variant).line) return nothing
  return `&& { ${dividerCss(theme, variant)} margin-top: ${xl}; margin-bottom: ${xl}; }`
}

export const Divider = styled.div`
  ${props => ordersBand(props.theme)}
`

export const OrderGroupFilterWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  padding-bottom: ${props => themeSpace(props.theme, 'lg')};
`

export const MyOrdersMenuContainer = styled.div`
  display: flex;
  z-index: 1000;
  position: sticky;
  top: 0;
  text-align: center;
  width: 100%;
  /* inside the tabs' box none; alone (loading) xl over the list */
  margin-bottom: ${props => props.$standalone ? themeSpace(props.theme, 'xl') : 0};
  div.category {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    padding: ${props => themeSpace(props.theme, 'sm')} 0px;
    margin: 0 ${props => themeSpace(props.theme, 'lg')};
    &:nth-of-type(1) {
      margin-left: 0;
      ${props => props.theme.rtl && css`
        margin-left: ${themeSpace(props.theme, 'lg')};
        margin-right: ${themeSpace(props.theme, 'lg')};
      `}
    }
  }

  div.special {
    ${props => !props.featured && css`
      display: none
    `}
  }

  @media (min-width: 992px) {
    width: auto;
  }
`
