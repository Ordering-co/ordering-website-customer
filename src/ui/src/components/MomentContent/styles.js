import styled, { css } from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'
import { themeScrim, themeSpace } from '~/utils/themeTokens'

export const Container = styled.div`
  position: relative;
  padding: 0px ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'lg')};
  margin: 0px ${props => themeSpace(props.theme, 'sm')};
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;

  #moment_control {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  @media (min-width: 769px) {
    padding: 0px;
  }

  ${({ isLoading }) => isLoading && css`
      pointer-events: none;
  `}
  /* in its modal the content starts where the modal's title
     does, at every width (the modal's padding is its side). It scrolls (so it
     clips): room for the shadow of its options and cards, the content where it
     was */
  ${({ theme }) => {
    const reaches = ['choice', 'card'].map((component) => getThemeCss(theme, component).base.shadow.reach)
    const left = Math.max(...reaches.map(reach => reach.left))
    const right = Math.max(...reaches.map(reach => reach.right))
    return `
      && {
        padding-left: ${left}px;
        padding-right: ${right}px;
        margin-left: -${left}px;
        margin-right: -${right}px;
      }
    `
  }}
`

export const Layer = styled.div`
  ${({ nobg }) => !nobg && css`
    /* the page's background at the fixed scrim opacity (0.7) */
    background-color: ${({ theme }) => themeScrim(theme)};
  `}
  position: absolute;
  top: 0;
  width: 100%;
  height: ${({ height }) => height || '100vh'};
  height: ${({ height }) => height || '100dvh'}; /* dvh = visible viewport under mobile URL bars (vh fallback above) */
  ${props => props.theme?.rtl
? css`
    right: 0;
  `
: css`
    left: 0;
  `}
`
