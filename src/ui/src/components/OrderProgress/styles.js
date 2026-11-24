import styled, { css } from 'styled-components'
import React from 'react'
import { themeColor } from '~/utils/themeColors'
import { headingText, themePart, themeSize, themeSpace, themeText } from '~/utils/themeTokens'

export const OrderProgressContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  /* lg over the progress */
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};
  > div {
    width: 100%;
  }

  @media (min-width: 768px) {
    > div {
      width: 50%;
    }
  }
`

export const OrderProgressWrapper = styled.div`
  /* components.order_card */
  ${props => themePart(props.theme, 'order_card', { background: 'base.background', 'border-radius': 'base.radius', border: 'base.border', 'box-shadow': 'base.shadow', 'font-family': 'base.font_role' })}
  /* lg inside on every screen, the sections' xl under it (no side or top
     margin: the page container sets them) */
  && {
    padding: ${props => themeSpace(props.theme, 'lg')};
    margin: 0 0 ${props => themeSpace(props.theme, 'xl')};
  }
`

export const OrderInfoWrapper = styled.div`
  display: flex;
  align-items: center;
  /* md over the action when they stack */
  margin-bottom: ${props => themeSpace(props.theme, 'md')};

  @media (min-width: 768px) {
    margin-bottom: 0px;
  }
`

export const ProgressLogoStyled = styled.div`
  width: ${props => themeSize(props.theme, 'lg')};
  min-width: ${props => themeSize(props.theme, 'lg')};
  height: ${props => themeSize(props.theme, 'lg')};

  ${({ bgimage }) => bgimage && css`
    background-repeat: no-repeat;
    /* a logo mark is never cropped (contain, not cover); ProgressLogo's
       inline style already forces contain, kept here too for consistency */
    background-size: contain;
    object-fit: contain;
    background-position: center;
  `}

  @media (min-width: 576px) {
    width: ${props => themeSize(props.theme, 'lg')};
    min-width: ${props => themeSize(props.theme, 'lg')};
    height: ${props => themeSize(props.theme, 'lg')};
  }
  /* the border, radius and shadow of its container (order_card) */
  ${props => themePart(props.theme, 'order_card', { 'border-radius': 'base.radius', border: 'base.border', 'box-shadow': 'base.shadow' })}
`

export const ProgressLogo = (props) => {
  const style = {}
  style.backgroundImage = `url("${props.bgimage}")`
  style.backgroundSize = 'contain'

  return (
    <ProgressLogoStyled {...props} style={style}>
      {props.children}
    </ProgressLogoStyled>
  )
}

export const ProgressDescriptionWrapper = styled.div`
  /* lg from the logo on every screen */
  && {
    margin-left: 0;
    margin-right: 0;
    margin-inline-start: ${props => themeSpace(props.theme, 'lg')};
  }

  h3, h2 {
    ${props => headingText(props.theme, 'h3')}
    margin-top: 0;
    margin-bottom: 0px;
  }

  p {
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
    margin: 0;
  }

  a {
    display: flex;
    align-items: center;
    padding: 0px;
    margin-top: 0px;
    ${props => themeText(props.theme, 'caption', { props: ['size', 'line'] })}
    svg {
      margin-left: ${props => themeSpace(props.theme, 'xs')};
      ${props => props.theme.rtl && css`
        margin-left: 0px;
        margin-right: ${props => themeSpace(props.theme, 'xs')};
      `}
    }
    &:hover {
      text-decoration: underline;
    }
  }

  @media (min-width: 576px) {
    p {
      ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
    }
    a {
      ${props => themeText(props.theme, 'body_lg', { props: ['size', 'line'] })}
      margin-top: ${props => themeSpace(props.theme, 'xxs')};
    }
  }
`

// The business of the order: an h2, a section of the page; its look,
// ProgressDescriptionWrapper's
export const ProgressBusinessName = styled.h2``

export const ProgressBarWrapper = styled.div`
  padding: 0px;
  box-sizing: border-box;
`

export const ProgressTextWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${props => themeSpace(props.theme, 'md')};
`

export const StatusWrapper = styled.p`
  margin-top: 0px;
  margin-bottom: 0px;
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  /* sm from the time */
  margin-inline-end: ${props => themeSpace(props.theme, 'sm')};
`

export const TimeWrapper = styled.div`
  ${props => themeText(props.theme, 'caption', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text')};
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex-direction: column;

  .time-wrapper {
    font-weight: 600;
  }

  @media (min-width: 576px) {
    flex-direction: row;
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
  }
`
