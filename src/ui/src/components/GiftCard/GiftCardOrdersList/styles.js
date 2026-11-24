import styled from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'
import {
  ProductsListContainer as GiftCardsGroup,
  SingleGiftCardWrapper,
  WrappButton as LoadMoreGiftCards
} from '~ui/src/components/GiftCard/VerticalGiftCardOrdersLayout/styles'
import { sectionTitleTextCss } from '~ui/src/styles/SectionHeader'

/* The gift card tab of the orders page: the groups (Pending, Sent,
   Redeemed) as the groups of orders: a section title (components.
   section_header: text and color) tokens.space.md over its first card, the
   cards md apart, the "load more" md under them, the groups xl apart (an
   empty group takes no space). */
export const Container = styled.div`
  ${({ theme }) => `
    ${GiftCardsGroup} > h2 {
      ${sectionTitleTextCss(theme, { level: 'h2' })}
      margin: 0 0 ${themeSpace(theme, 'md')};
    }
    ${GiftCardsGroup}:not(:empty) ~ ${GiftCardsGroup}:not(:empty) {
      margin-top: ${themeSpace(theme, 'xl')};
    }
    ${SingleGiftCardWrapper} + ${SingleGiftCardWrapper} {
      margin-top: ${themeSpace(theme, 'md')};
    }
    ${LoadMoreGiftCards} {
      margin: ${themeSpace(theme, 'md')} auto 0;
    }
  `}
`
