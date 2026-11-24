import styled, { css } from 'styled-components'
import { themeMedia, themePart } from '~/utils/themeTokens'

export const WrapperMap = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  box-sizing: border-box;
  /* no side padding: the page container sets the 20px */
  padding: 0;
  > div, img {
    position: relative !important;
    width: 100% !important;
    /* a map's box is fluid: its width, a 7:5 shape and a share of the
       screen's height (250px at 390 and at 1440 wide, measured) */
    height: auto !important;
    aspect-ratio: 7 / 5;
    max-height: 28dvh;
    /* a short window cannot squeeze the map below the media scale's 4xl (the page scrolls) */
    min-height: ${props => themeMedia(props.theme, '4xl')};
    /* the map is a content container of the theme (components.card) */
    overflow: hidden;
    ${props => themePart(props.theme, 'card', { 'border-radius': 'base.radius', border: 'base.border', 'box-shadow': 'base.shadow' })}
  }
  /* the Mapbox failover (StaticMap) */
  img {
    display: block;
    object-fit: cover;
  }

  ${({ disabled }) => disabled && css`
    pointer-events: none
  `}

  @media(min-width: 681px){
    padding: 0px;
    > div, img {
      width: 75% !important;
    }
  }

  @media(min-width: 1201px){
    > div, img {
      width: 50% !important;
    }
  }

`
