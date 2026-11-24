import styled from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { themeIconSize, themePart, themeSpace, themeText, blockStill } from '~/utils/themeTokens'
import { bannerBoxCss, bannerSpace } from '~ui/src/styles/Banner'

export const RewardsBannerContainer = styled.div`
  position: relative;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;

  .rewards-kicker {
    position: relative;
    z-index: 1;
    margin: 0;
    text-align: center;
  }

  .rewards-footnote {
    position: relative;
    z-index: 1;
    margin: 0;
    text-align: center;
  }
  /* a content container of the theme (components.card): its font, as wide
     as the column (the order bill's card over it), tokens.space.lg above it;
     the kicker is its title (the theme's label text in the text color) and
     the footnote the theme's caption, muted */
  ${props => `
    /* (its margin at the component's own weight: a screen that spaces its
       sections with a gap sets it to none) */
    margin: ${themeSpace(props.theme, 'lg')} 0 0;
    && {
      ${themePart(props.theme, 'card', { 'font-family': 'base.font_role' })}
    }
    .rewards-kicker {
      ${themeText(props.theme, 'label')}
      color: ${themeColor(props.theme, 'text')};
    }
    .rewards-footnote {
      ${themeText(props.theme, 'caption')}
      color: ${themeColor(props.theme, 'text_muted')};
    }
  `}
  /* a rewards banner of the theme (components.banner): its box
     and padding, its gap between the kicker, the rewards and the footnote */
  ${props => `
    &&& {
      ${bannerBoxCss(props.theme, 'rewards')}
      padding: ${bannerSpace(props.theme, 'rewards', 'padding')};
    }
    .rewards-kicker { margin-bottom: ${bannerSpace(props.theme, 'rewards', 'gap')}; }
    .rewards-footnote { margin-top: ${bannerSpace(props.theme, 'rewards', 'gap')}; }
  `}
`

export const RewardsBannerRow = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: stretch;

  @media (max-width: 480px) {
    flex-direction: column;
  }
  /* the cards sm apart */
  ${props => `&& { gap: ${themeSpace(props.theme, 'sm')}; }`}
`

/* A reward inside the banner's card, not a card of its own (no double
   frame) nor a control (no hover): the icon at the theme's lg icon size, the
   message in the theme's body text and its value, inline, in the label text
   and the primary color. */
export const RewardsBannerCard = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  text-align: center;

  .icon {
    flex-shrink: 0;
    /* the rewards color of the theme (as the wallets) */
    color: ${props => themeColor(props.theme, 'rating')};
    line-height: 1;

    svg {
      display: block;
    }
  }

  span {
    display: block;
  }
  ${props => blockStill(props.theme)}
  ${props => `
    && {
      background: none;
      border: 0;
      border-radius: 0;
      box-shadow: none;
      padding: 0;
    }
    gap: ${themeSpace(props.theme, 'sm')};
    .icon svg { width: ${themeIconSize(props.theme, 'lg')}; height: ${themeIconSize(props.theme, 'lg')}; }
    span {
      ${themeText(props.theme, 'body')}
      color: ${themeColor(props.theme, 'text')};
    }
    span.red {
      display: inline;
      ${themeText(props.theme, 'label')}
      color: ${primaryText(props.theme)};
    }
  `}
`
