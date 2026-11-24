import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { headingText, themeIconSize, themePart, themePartText, themeSpace, blockStill } from '~/utils/themeTokens'
import { getThemeCss, getThemeMobileCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { ACCOUNT_PAGE, pageContainerRules, pageTitleRules } from '~ui/src/styles/Page'
import { NotFound as EmptyState } from '~ui/src/components/NotFoundSource/styles'

// The look of components.card (a block of the page, not a control)
const CARD = { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' }

/* the wallets page (/wallets, ?wallet=cash | credit_point) is
   one box of the account pages: the outer container (WalletsUI) is that box
   whatever the query, and the wallet it shows (cash, credit points) is
   $nested in it, with no box of its own (no second width, padding or
   height). The empty state of a wallet (NotFoundSource, the one of the
   app): xl under the balance. */
const containerCss = ({ theme, $nested }) => {
  return css`
    ${$nested
      ? css`
        && {
          width: 100%;
          margin: 0;
          padding: 0;
          min-height: 0;
        }
      `
      : pageContainerRules(theme, ACCOUNT_PAGE)}
    > ${EmptyState} {
      margin: ${themeSpace(theme, 'xl')} auto 0;
    }
  `
}

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  box-sizing: border-box;
  /* the page fills most of the screen under the header and above the footer
     (it was the screen minus 280px) */
  min-height: 70dvh;
  /* the box of the account pages (see containerCss) */
  ${props => containerCss(props)}
  ${props => blockStill(props.theme)}
`

export const Title = styled.h1`
  ${props => headingText(props.theme, 'h1')}

  /* the theme's h1 at every width, as the other account pages */
  ${props => pageTitleRules(props.theme)}
  ${props => blockStill(props.theme)}
`

export const TabsContainer = styled.div`
  /* the Tabs primitive draws its own bar (its variant's border
     or baseline); a section of the page, xl over the wallet */
  border-bottom: none;
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  ${props => blockStill(props.theme)}
`

export const SectionWrapper = styled.div`
  display: flex;

  ${(props) => !props.isLoading && css`
    align-items: center;
  `};

  @media (min-width: 768px) {
    ${(props) => !props.isLoading && css`
      align-items: flex-start;
    `};
  }
  /* the balance right under the title (the title's gap alone);
     the loading rows sm apart */
  padding-top: ${props => props.isLoading ? themeSpace(props.theme, 'sm') : '0px'};
  ${props => blockStill(props.theme)}
`

/* the transactions are one list (ul) in a card of
   components.card, its rows lg in from its sides; each row is a
   WalletTransactionItem with the divider's item line. */
const transactionsListCss = (theme) => {
  return css`
    list-style: none;
    margin: 0;
    padding: 0 ${themeSpace(theme, 'lg')};
    ${themePart(theme, 'card', CARD)}
  `
}

export const TransactionsWrapper = styled.ul`
  display: flex;
  flex-direction: column;
  ${props => transactionsListCss(props.theme)}
  ${props => blockStill(props.theme)}
`

/* The title of the transactions: an h2 of the page, the theme's h2, md over
   the card, at the start (over the list's `.transactions_list h2` rules). */
export const TransactionsTitle = styled.h2`
  ${({ theme }) => css`
    &&& {
      ${headingText(theme, 'h2')}
      margin: 0 0 ${themeSpace(theme, 'md')};
      text-align: start;
    }
  `}
`

/* the wallet's icon in front of its balance (as the checkout's
   wallet: the registry's icon in the rating / favorite color), sm apart */
export const BalanceValue = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${props => themeSpace(props.theme, 'sm')};

  svg {
    flex-shrink: 0;
  }
`

export const BalanceElement = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;

  /* a card that is not a control: no hover or press */

  .balance_element {
    display: flex;
    align-items: center;
    justify-content: center;
    ${props => blockStill(props.theme)}
  }

  .balance_element-points {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;

    .amount {
      ${props => blockStill(props.theme)}
    }

    span {
      ${props => blockStill(props.theme)}
    }
    ${props => blockStill(props.theme)}
  }

  /* the balance: an amount, not a heading */
  .amount {
    margin: 0;
    padding: 0;
    ${props => blockStill(props.theme)}
  }

  span {
    ${props => blockStill(props.theme)}
  }

  @media (min-width: 768px) {
    flex-direction: row;
  }
  /* components.card */
  ${props => themePart(props.theme, 'card', CARD)}
  ${props => balanceCss(props.theme)}
  ${props => blockStill(props.theme)}
`

/* the balance card of components.wallet_balance: its padding
   at every width, its blocks md apart. Its title is an h2 of the page
   (the h3 look of a card title); the balance its `amount` text and color
   (platforms.mobile_web.amount below 576px; its weight kept), its unit
   (Wallet credits, Available Credit Points) its `label` text and color, xs
   from it. */
const balanceCss = (theme) => {
  const mobileAmount = getThemeMobileCss(theme, 'wallet_balance').base.amount.css
  return css`
    && {
      padding: ${getThemeCss(theme, 'wallet_balance').base.padding};
      gap: ${themeSpace(theme, 'md')};
    }
    && h2 {
      ${headingText(theme, 'h3')}
      margin: 0;
      padding: 0;
    }
    && .balance_element,
    && .balance_element-points {
      margin: 0;
      gap: ${themeSpace(theme, 'xs')};
    }
    &&& .amount {
      ${themePartText(theme, 'wallet_balance', 'base.amount', { weight: 'bold' })}
      ${themePart(theme, 'wallet_balance', { color: 'base.amount_color' })}
    }
    @media (max-width: ${MOBILE_WEB_MAX_WIDTH - 1}px) {
      &&& .amount {
        ${mobileAmount}
        font-weight: bold;
      }
    }
    && .balance_element > span,
    && .balance_element-points > span {
      margin: 0;
    }
    &&& .balance_element > span,
    &&& .balance_element-points > span {
      ${themePartText(theme, 'wallet_balance', 'base.label')}
      ${themePart(theme, 'wallet_balance', { color: 'base.label_color' })}
    }
  `
}

export const WrapContent = styled.div`
  width: 100%;
  display: flex;
  /* the wallet's sections in the order of the theme */
  flex-direction: column;
  ${props => blockStill(props.theme)}
`

export const Transactions = styled.div`

  .transactions_list {
    h2 {
      text-align: center;
      ${props => blockStill(props.theme)}
    }
    ${props => blockStill(props.theme)}
  }

  @media (min-width: 768px) {
    margin: 0;

    .transactions_list h2 {
      text-align: left;
    }
  }
  /* the balance and the transactions (in the theme's order) xl
     apart; nothing when the list is empty (the empty state spaces itself) */
  ${({ theme }) => css`
    && {
      display: flex;
      flex-direction: column;
      gap: ${themeSpace(theme, 'xl')};
    }
    && .transactions_list {
      margin-top: 0;
    }
    && .transactions_list:empty {
      display: none;
    }
    /* the transactions' empty state is the section itself: the xl between
       the sections spaces it, not its own margin (empty_state.margin) */
    &&& .transactions_list > ${EmptyState} {
      margin-top: 0;
      margin-bottom: 0;
    }
  `}
  ${props => blockStill(props.theme)}
`

export const LoyaltyContent = styled.div`
  display: flex;
  align-items: center;

  span.loyalty_name {
    ${props => blockStill(props.theme)}
  }

  /* the level is not a control: no hover; its image md from its
     name, the name in the text color */
  ${({ theme }) => css`
    gap: ${themeSpace(theme, 'md')};
    span.loyalty_name {
      margin: 0;
      color: ${themeColor(theme, 'text')};
    }
    /* the level's name: components.wallet_balance loyalty_name (its weight kept) */
    && span.loyalty_name {
      ${themePartText(theme, 'wallet_balance', 'base.loyalty_name', { weight: 'bold' })}
    }
  `}
  ${props => blockStill(props.theme)}
`

/* the level's image (or its placeholder) of components.
   wallet_balance: loyalty_image_size (a square) and loyalty_image_radius.
   */
const loyaltyImageCss = (theme) => {
  const size = themePart(theme, 'wallet_balance', { width: 'base.loyalty_image_size', height: 'base.loyalty_image_size' })
  const radius = themePart(theme, 'wallet_balance', { 'border-radius': 'base.loyalty_image_radius' })
  return css`
    && { ${size} }
    && img, && .loyalty_placeholder { ${radius} }
  `
}

export const LoyaltyWrapp = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    ${props => blockStill(props.theme)}
  }

  /* Neutral placeholder shown when the level image is missing/fails — keeps the
     slot the same size so the "Level X" text never shifts. */
  .loyalty_placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  /* the placeholder of the theme's alternate surface, its
     trophy the lg icon in the muted text (the image itself has no hover) */
  ${({ theme }) => {
    const icon = themeIconSize(theme, 'lg')
    return css`
      && .loyalty_placeholder {
        margin: 0;
        background: ${themeColor(theme, 'surface_alt')};
        color: ${themeColor(theme, 'text_muted')};
      }
      && .loyalty_placeholder svg { width: ${icon}; height: ${icon}; font-size: ${icon}; }
    `
  }}
  ${props => blockStill(props.theme)}
  &:hover img { transform: none; }
  ${props => loyaltyImageCss(props.theme)}
`
