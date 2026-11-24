import styled, { css } from 'styled-components'
import { themeMedia, themeSpace, themeText } from '~/utils/themeTokens'
import { spinnerCss } from '~ui/src/styles/Spinner'

export const Container = styled.div`
  width: 100%;
  ${({ theme, $size }) => $size && $size !== 'lg'
    // sm and md sit inside a block (a form, a layer): their height is the
    // spinner's, with the theme's space above and below it
    ? css`padding-block: ${themeSpace(theme, 'md')};`
    : css`
      height: 100vh;
      height: 100dvh; /* dvh = visible viewport under mobile URL bars (vh fallback above) */
    `}
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2001;
  flex-direction: column;
`

export const Logo = styled.div`
  /* the boot logotype: the xl medium tall, its proportion (266 x 150) reserved before it loads */
  img {
    height: ${props => themeMedia(props.theme, 'xl')};
    width: auto;
    aspect-ratio: 266 / 150;
  }
`

// The loading message: a status, not a heading
export const Content = styled.p`
  ${props => themeText(props.theme, 'h2', { props: ['size', 'weight', 'family'], weight: 'normal' })}
  text-transform: capitalize;
  margin-top: 0px;
  /* tokens.space.xxxl below */
  padding-bottom: ${props => themeSpace(props.theme, 'xxxl')};

  @media (min-width: 768px) {
    ${props => themeText(props.theme, 'h1', { props: ['size', 'family'] })}
  }
`

export const Spinner = styled.div`
  .spinner-content {
    width: 100%;
    height: 100%;
    position: relative;
    transform: translateZ(0) scale(1);
    backface-visibility: hidden;
    transform-origin: 0 0;
    /* in a block the ring is the only content: no line box under it */
    ${props => props.$size && props.$size !== 'lg' ? 'line-height: 0;' : ''}
  }
  /* the spinner of the theme (components.spinner) at its size, lg by default;
     a size the screen gives it stays */
  ${props => `
    .spinner-content > div {
      ${spinnerCss(props.theme, props.$size || 'lg')}
      ${props.iconStyleWidth ? `width: ${props.iconStyleWidth}px; min-width: ${props.iconStyleWidth}px;` : ''}
      ${props.iconStyleHeight ? `height: ${props.iconStyleHeight}px; min-height: ${props.iconStyleHeight}px;` : ''}
    }
  `}
`
