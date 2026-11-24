import { CardButton } from '~ui/src/design-system/components/ButtonAppearances'
import React from 'react'
import { Button } from '~ui/src/design-system/components/Button'
import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { getThemeCss } from '~/utils/themeCss'
import { themePart, themePartText, themeSpace, themeText, headingText, blockStill } from '~/utils/themeTokens'
import { ACCOUNT_PAGE, pageContainerRules, pageTitleRules } from '~ui/src/styles/Page'
import { LastOrdersContainer, OrderCardRow as LastOrderCard } from '~ui/src/components/LastOrders/styles'
import { dividerLineCss } from '~ui/src/styles/Divider'

export const HelpContainer = styled.div`
  /* the viewport less the header and the footer (about 4 headers) */
  min-height: calc(100dvh - 4 * var(--header-height, ${({ theme }) => getThemeCss(theme, 'header').base.height}));
  /* the box of the account pages */
  ${props => pageContainerRules(props.theme, ACCOUNT_PAGE)}
  ${props => blockStill(props.theme)}
  /* the open topic's body (a page of the API) in the body text
     of the theme */
  ${({ theme }) => css`
    [data-doc-section='help-topic-body'] {
      ${themeText(theme, 'body')}
      color: ${themeColor(theme, 'text')};
    }
  `}
`

/* The crumbs md over the topic's title; the chevron between
   them (its size, the sm icon, is the ChevronIcon's) xs at each side, in the
   muted text. */
const breadcrumbCss = (theme) => css`
  margin-bottom: ${themeSpace(theme, 'md')};
  && svg {
    margin: 0 ${themeSpace(theme, 'xs')};
    color: ${themeColor(theme, 'text_muted')};
  }
`

export const BreadCrumbContainer = styled.div`
  display: flex;
  align-items: center;

  span {
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text')};
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
  ${props => breadcrumbCss(props.theme)}
`

// The "Help" crumb back to the menu: a button of components.link (muted, sm).
export const BreadCrumbLink = (props) => (
  <Button {...props} appearance='link' linkVariant='muted' size='sm' />
)

export const Title = styled.h1`
  ${props => pageTitleRules(props.theme)}
  ${props => blockStill(props.theme)}
`

// The open topic's title: the page's h1 (the crumbs above are not a
// heading), of the account pages' title.
export const SubTitle = styled.h1`
  ${props => pageTitleRules(props.theme)}
  ${props => blockStill(props.theme)}
`

export const HelpContentWrapper = styled.div`
  ${props => blockStill(props.theme)}
  ${props => helpSectionsCss(props.theme)}
`

/* The line between the topics and the last order (the item
   line of components.divider, xl at each side) is drawn by the last order,
   on its side that faces the topics, whatever the theme's order: above it
   when the topics come first, under it when it comes first. The topics
   never draw it, so a user without a past order (the last order renders
   nothing: an empty block) leaves no line under them. Empty otherwise. */
const helpSectionsCss = (theme) => {
  const xl = themeSpace(theme, 'xl')
  return css`
    && > ${SubPageList} {
      border-bottom: none;
      padding-bottom: 0;
      margin-bottom: 0;
    }
    && > ${SubPageList} + ${LastOrdersListWrapper}:not(:empty) {
      ${dividerLineCss(theme, 'item', { edge: 'top' })}
      padding-top: ${xl};
      margin-top: ${xl};
    }
    && > ${LastOrdersListWrapper}:not(:last-child):not(:empty) {
      ${dividerLineCss(theme, 'item')}
      padding-bottom: ${xl};
      margin-bottom: ${xl};
    }
  `
}

/* The topics are a list (ul) of card rows, md apart (the saved
   places' list); xl down to the line under it and from the line to the next
   section. */
const topicListCss = (theme) => css`
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0 0 ${themeSpace(theme, 'xl')};
  padding: 0 0 ${themeSpace(theme, 'xl')};
  gap: ${themeSpace(theme, 'md')};
`

export const SubPageList = styled.ul`
  ${props => dividerLineCss(props.theme, 'item')}
  ${props => blockStill(props.theme)}
  ${props => topicListCss(props.theme)}
`

// An item of the topics' list (it holds the row's button)
export const SubPageItem = styled.li`
  display: block;
  margin: 0;
  padding: 0;
  list-style: none;
`

/* The chevron at the end of a topic's row, alone (no box), in
   components.help_topic chevron_color (on the svg, so the row's hover color
   does not reach it; its size, chevron_size, is the ChevronIcon's). */
export const SubPageChevron = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  line-height: 0;
  svg {
    ${({ theme }) => themePart(theme, 'help_topic', { color: 'base.chevron_color' })}
  }
`

export const SubPageLabel = styled.span`
  user-select: none;
  ${props => themePartText(props.theme, 'help_topic', 'base.text', { weight: 600 })}
  ${props => blockStill(props.theme)}
`

export const SubPage = (props) => <CardButton {...props} cardLayout='row' />

/* The last order, a section of the page: its h2 md over its
   card, the card with no margin of its own; the page's bottom space ends it.
   Empty otherwise. */
const lastOrdersCss = (theme) => {
  return css`
    margin-bottom: 0;

    h2 {
      ${headingText(theme, 'h2')}
      margin-top: 0;
      margin-bottom: ${themeSpace(theme, 'md')};
    }
    ${LastOrdersContainer} {
      margin: 0;
    }
    ${LastOrderCard} {
      margin: 0;
    }
  `
}

export const LastOrdersListWrapper = styled.div`
  ${props => blockStill(props.theme)}
  ${props => lastOrdersCss(props.theme)}
`
