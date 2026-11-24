import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeRadius, themeSize, themeSpace, themeText } from '~/utils/themeTokens'
import { themeLogoBoxCss } from '~ui/src/styles/Logo'

export const Hero = styled.div`
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  width: 100%;
  background: ${props => themeColor(props.theme, 'inverse_surface')};
  overflow: hidden;
  position: relative;

  /* 370 px from 450 px wide, 450 px from 821 px wide, as a share of the screen */
  @media (min-width: 450px) {
    height: 45dvh;
  }

  @media (min-width: 821px) {
    height: 50dvh;
  }
`

export const BgImg = styled.img`
  ${({ src }) => src && css`
    width: 100%;
    height: 100%;
    opacity: 0.4;
    object-fit: cover;
    position: absolute;
  `}
`

export const HeroText = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    /* the text over the inverse surface */
    color: ${props => themeColor(props.theme, 'on_inverse')};
    opacity: .9;
    text-align: center;

  .title {
    ${props => themeText(props.theme, 'display', { props: ['size', 'family'] })}
    margin: ${props => themeSpace(props.theme, 'sm')} 0;
  }

  .sub-title {
      ${props => themeText(props.theme, 'h4', { props: ['size', 'weight', 'line', 'family'], weight: 100 })}
      margin: 0;
      max-width: min(100%, 70ch);
  }

  .terms {
      font-style: italic;
  }
`

export const LogoImg = styled.img`
  ${({ src }) => src && css`
    border-radius: ${props => themeRadius(props.theme, 'sm')};
    margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  `}
  /* the logo of a standalone screen (T6: header.base.screen_logo_height tall, up to screen_logo_width
     wide, never stretched) */
  ${({ src, theme }) => src && themeLogoBoxCss(theme, 'screen')}
`

/* The site's own name, shown instead of a logo when the theme has none: the
   hero's text (on_inverse, inherited from HeroText) and the logo's own
   bottom space. It wraps to two lines before it is cut (title= in index.js
   keeps the whole name). */
export const LogoName = styled.span`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  max-width: 100%;
  overflow: hidden;
  overflow-wrap: anywhere;
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'line', 'family'] })}
`

export const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  width: 100%;
  min-height: calc(3.5 * ${props => themeSize(props.theme, 'xl')});
  background-color: ${props => themeColor(props.theme, 'primary_subtle')};
  text-align: center;

  p {
    font-size: x-large;
    /* the size and line of the theme's h2 */
    ${props => themeText(props.theme, 'h2', { props: ['size', 'line'] })}
    color: ${props => themeColor(props.theme, 'text')};
    margin: 0;
    max-width: min(100%, 75ch);
  }

  button {
    margin-top: ${props => themeSpace(props.theme, 'lg')};
  }
`

export const Segment = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  text-align: center;
  width: 100%;
  text-align: center;

  p {
    font-size: x-large;
    /* the size and line of the theme's h2 */
    ${props => themeText(props.theme, 'h2', { props: ['size', 'line'] })}
    color: ${props => themeColor(props.theme, 'text')};
    margin: 0;
    max-width: min(100%, 82ch);
    margin-bottom: ${props => themeSpace(props.theme, 'xl')};
  }
`

export const InputWrapper = styled.div`
  margin: ${({ theme }) => themeSpace(theme, 'md')} ${({ theme }) => themeSpace(theme, 'xl')} 0px;
  display: flex;

  button {
    margin-left: calc(-1 * ${({ theme }) => themeSpace(theme, 'md')});
    z-index: 100;
  }
    box-sizing: border-box;
    justify-content: center;
    align-items: center;
    position: relative;
    margin: 0;
    margin-top: ${({ theme }) => themeSpace(theme, 'md')};
    margin-bottom: ${({ theme }) => themeSpace(theme, 'xl')};
    width: 100%;
    padding: 0 ${({ theme }) => themeSpace(theme, 'lg')};
    margin-right: ${({ theme }) => themeSpace(theme, 'xl')};

    @media(min-width: 681px){
      width: 60%;
      padding: 0;
    }

    @media(min-width: 1201px){
      width: 50%;
    }
  /* the input and its trailing action (a button of the slot's size, its own
     width) side by side, sm apart */
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  align-items: stretch;
  && button {
    width: auto;
    margin: 0;
    z-index: auto;
    flex-shrink: 0;
  }
`

export const BusinessSearch = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-end;
  position: relative;

  input {
    /* the field is the theme's input (its border, radius and padding) */
    width: 100%;
    box-sizing: border-box;

    @media (min-width: 681px) {
      width: 100%;
    }

  }
`
