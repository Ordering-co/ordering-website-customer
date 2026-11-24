import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themePart, themePartText, themeSpace, themeText, blockStill } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'
import { dividerLineCss, dividerSpacing } from '~ui/src/styles/Divider'

export const TransactionsContainer = styled.div`
  width: 80%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;

  .transaction-list {
    display: flex;
    flex-direction: column;
    width: 80%;
  }
`

/* a row of the wallet's transactions list (a card): md above
   and below its content, its sides the card's; the divider's item line
   under it (not under the last one) and the divider's spacing between two
   rows, none before the first or after the last. Not a control: no hover.
   */
const itemRowCss = (theme) => {
  return css`
    && {
      padding: ${themeSpace(theme, 'md')} 0;
      margin: 0;
      border-radius: 0;
      list-style: none;
    }
    && + && {
      margin-top: ${dividerSpacing(theme, 'item')};
    }
  `
}

// `$listItem`: a row of a list (an li of the wallet's ul)
export const ItemContainer = styled.div.attrs(props => (props.$listItem ? { as: 'li' } : {}))`
  display: flex;
  flex-direction: column;
  ${props => dividerLineCss(props.theme, 'item')}

  &:last-child {
    border-bottom: none;
  }
  ${props => itemRowCss(props.theme)}
  ${props => blockStill(props.theme)}
`

export const ItemDateBlock = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .left-wrapper {
    display: flex;
    align-items: center;
    ${props => blockStill(props.theme)}
  }
  /* the icon md from the text, the text md from the amount */
  ${({ theme }) => css`
    gap: ${themeSpace(theme, 'md')};
    .left-wrapper {
      gap: ${themeSpace(theme, 'md')};
    }
  `}
`

export const ItemIcon = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  svg {
    ${props => blockStill(props.theme)}
  }
  ${props => itemIconCss(props.theme)}
  ${props => blockStill(props.theme)}
`

/* the arrow of a movement md inside its chip (no size of its
   own); a credit in the credit colors, a debit in the debit ones. Not a
   control: no hover. */
const itemIconCss = (theme) => {
  return css`
    && {
      flex-shrink: 0;
      width: auto;
      height: auto;
      padding: ${themeSpace(theme, 'md')};
      /* a status chip, not a raised control: no shadow */
      box-shadow: none;
    }
    /* components.wallet_transaction: the chip's radius, its icon's size, a
       debit's and a credit's colors */
    &&& {
      ${themePart(theme, 'wallet_transaction', { 'border-radius': 'base.icon_radius', background: 'base.debit_background' })}
    }
    &&& svg {
      ${themePart(theme, 'wallet_transaction', { color: 'base.debit_color' })}
      ${transactionIconSize(theme)}
    }
    &&&.green {
      ${themePart(theme, 'wallet_transaction', { background: 'base.credit_background' })}
    }
    &&&.green svg {
      ${themePart(theme, 'wallet_transaction', { color: 'base.credit_color' })}
    }
  `
}

const transactionIconSize = (theme) => {
  const size = getThemeCss(theme, 'wallet_transaction').base.icon_size
  return `width: ${size}; height: ${size}; font-size: ${size};`
}

export const ItemRight = styled.div`
  /* spaced by its row's gap */
  margin-left: 0;
  ${props => blockStill(props.theme)}
`

export const ItemContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;

  .date {
    ${props => blockStill(props.theme)}
  }

  div.amount {
    width: max-content;
    ${props => blockStill(props.theme)}
  }
  /* the date xs over the description */
  ${({ theme }) => css`
    && .date {
      ${themeText(theme, 'body')}
      margin-bottom: ${themeSpace(theme, 'xs')};
    }
    /* components.wallet_transaction: the date's text and color; the amount's
       text (its weight kept) in the debit or credit color */
    &&& .date {
      ${themePartText(theme, 'wallet_transaction', 'base.date')}
      ${themePart(theme, 'wallet_transaction', { color: 'base.date_color' })}
    }
    &&& div.amount {
      ${themePartText(theme, 'wallet_transaction', 'base.amount', { weight: 600 })}
      ${themePart(theme, 'wallet_transaction', { color: 'base.debit_color' })}
    }
    &&& div.green {
      ${themePart(theme, 'wallet_transaction', { color: 'base.credit_color' })}
    }
  `}
  ${props => blockStill(props.theme)}
`

export const ItemText = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  ${props => blockStill(props.theme)}
`

export const ItemDescriptionBlock = styled.div`
  flex-direction: row;
  flex-wrap: wrap;
  color: ${(props) => themeColor(props.theme, 'text')};
  /* components.wallet_transaction description (its weight kept) */
  ${props => themePartText(props.theme, 'wallet_transaction', 'base.description', { weight: 700 })}

  div {
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const TabsContainer = styled.div`
  margin: ${props => themeSpace(props.theme, 'xl')};

  .tabs {
    width: 100%;
    flex-direction: column;
  }

  .tab {
    padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'xl')};
    margin-bottom: ${props => themeSpace(props.theme, 'md')};

    @media (min-width: 576px) {
      margin-left: ${props => themeSpace(props.theme, 'xl')};
      margin-right: ${props => themeSpace(props.theme, 'xl')};
      margin-bottom: 0px;
    }
    ${props => blockStill(props.theme)}
  }

  @media (min-width: 576px) {
    margin: 0px;
    .tabs {
      flex-direction: row;
      justify-content: center;
    }
  }
`

export const Header = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xxxl')};
  ${props => blockStill(props.theme)}
`
