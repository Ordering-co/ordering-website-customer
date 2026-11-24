import styled from 'styled-components'
import { onPrimary, themeColor } from '~/utils/themeColors'
import { getThemeCss } from '~/utils/themeCss'
import { themeIconSize, themeMedia, themePart, themeRadius, themeShadow, themeSpace, themeText, headingText } from '~/utils/themeTokens'
import { ACCOUNT_PAGE, pageContainerRules, pageTitleRules } from '~ui/src/styles/Page'

/* The box of the account pages: it fills the screen less the header and the
   footer (about four header heights, from the header's measured height). */
export const GiftCardContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 4 * var(--header-height, ${props => getThemeCss(props.theme, 'header').base.height}));
  ${props => pageContainerRules(props.theme, ACCOUNT_PAGE)}
`

/* The page's title (components.section_header, page variant) */
export const Title = styled.h1`
  ${props => pageTitleRules(props.theme)}
`

/* Centered hero block: a gift-card visual + the intro copy, tokens.space.xl apart */
export const Hero = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${props => themeSpace(props.theme, 'xl')};
`

/* The decorative gift card of the hero, of the primary; its width is the
   media scale's 5xl. */
export const HeroCard = styled.div`
  width: ${props => themeMedia(props.theme, '5xl')};
  max-width: 80%;
  aspect-ratio: 1.6 / 1;
  border-radius: ${props => themeRadius(props.theme, 'xl')};
  background: ${props => themeColor(props.theme, 'primary')};
  color: ${props => onPrimary(props.theme)};
  padding: ${props => themeSpace(props.theme, 'xl')};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: ${props => themeShadow(props.theme, 'xl')};

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .brand {
      ${props => themeText(props.theme, 'h4', { props: ['size', 'weight', 'family'], weight: 700 })}
    }

    svg {
      font-size: ${props => themeIconSize(props.theme, 'lg')};
    }
  }

  .card-label {
    ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'family'], weight: 600 })}
  }
`

/* The copy's measure. */
export const HeroCopy = styled.div`
  max-width: min(100%, 70ch);
  margin: 0 auto;

  h2 {
    ${props => headingText(props.theme, 'h3')}
    margin: 0 0 ${props => themeSpace(props.theme, 'md')};
  }

  p {
    ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
    color: ${props => themeColor(props.theme, 'text_muted')};
    margin: 0;
  }
`

/* A section of the gift card wallet (the hero, the purchase,
   the redeem), in the order of the theme: tokens.space.xl from the one
   before; right after the hero's line, its spacing alone. */
export const GiftCardSection = styled.div`
  & + & {
    margin-top: ${props => themeSpace(props.theme, 'xl')};
  }
`

/* The redeem's title: tokens.space.sm from its icon (tokens.icon.md),
   tokens.space.lg over the block */
export const TitleWrapper = styled.div`
  display: flex;
  align-items: center;
  ${({ theme }) => `
    gap: ${themeSpace(theme, 'sm')};
    margin-bottom: ${themeSpace(theme, 'lg')};
    h2 {
      margin: 0;
      ${headingText(theme, 'h3')}
    }
    svg {
      font-size: ${themeIconSize(theme, 'md')};
    }
  `}
`

/* The redeem: a content container (components.card), tokens.space.lg
   inside (xl from 768px), as the cards of the order's page */
export const ActionWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  ${({ theme }) => `
    gap: ${themeSpace(theme, 'lg')};
    ${themePart(theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
    padding: ${themeSpace(theme, 'lg')};
    @media (min-width: 768px) {
      padding: ${themeSpace(theme, 'xl')};
    }

    .gift-card-text {
      display: flex;
      flex-direction: column;
      gap: ${themeSpace(theme, 'xxs')};

      h3 {
        margin: 0;
        ${headingText(theme, 'h4')}
      }

      p {
        margin: 0;
        ${themeText(theme, 'body', { props: ['size'] })}
        color: ${themeColor(theme, 'text_muted')};
      }
    }
  `}
`
