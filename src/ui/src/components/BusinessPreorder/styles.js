import styled, { css } from 'styled-components'
import React from 'react'
import { themeColor, primaryText, withAlpha } from '~/utils/themeColors'
import { headingText, themeBorderStyle, themeBorderWidth, themeFontFamily, themeMedia, themePart, themeScrim, themeSize, themeSpace, themeText, buttonStill } from '~/utils/themeTokens'
import { dividerRules, dividerLineCss } from '~ui/src/styles/Divider'
import { day, dayAttrs } from '~ui/src/components/MomentControl/styles'
import { dateStripNameCss, dateStripNumberCss } from '~ui/src/styles/Calendar'
import { layerBackground } from '~ui/src/styles/Layer'

export const BusinessPreorderContainer = styled.div`
  /* in its modal the content starts where the modal's title does (the
     modal's padding is its side) */
  padding: 0;
`

export const Title = styled.h2`
  margin-top: 0px;
  margin-bottom: ${({ theme }) => themeSpace(theme, 'xl')};
  ${props => headingText(props.theme, 'h2')}
`

export const LogoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${({ theme }) => themeSpace(theme, 'xl')};

  > p {
    ${props => themeText(props.theme, 'h2', { props: ['size', 'weight', 'family'], weight: 600 })}
    margin: 0;
  }
`

const BusinessLogoStyled = styled.div`
  display: flex;
  width: ${({ theme }) => themeMedia(theme, '3xs')};
  min-width: ${({ theme }) => themeMedia(theme, '3xs')};
  height: ${({ theme }) => themeMedia(theme, '3xs')};
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat;
  /* a logo mark is never cropped (contain, not cover) */
  background-size: contain;
  object-fit: contain;
  background-position: center;
  min-height: ${({ theme }) => themeMedia(theme, '3xs')};
  /* the logo is a content container (components.card: border, radius) with
     the store's logo shadow (components.business_header.base.logo_shadow),
     the theme's xl space from the name */
  ${({ theme }) => themePart(theme, 'card', { border: 'base.border', 'border-radius': 'base.radius' })}
  ${({ theme }) => themePart(theme, 'business_header', { 'box-shadow': 'base.logo_shadow' })}
  margin: 0;
  margin-inline-end: ${({ theme }) => themeSpace(theme, 'xl')};

  @media (min-width: 481px){
    width: ${({ theme }) => themeMedia(theme, '2xs')};
    height: ${({ theme }) => themeMedia(theme, '2xs')};
    min-width: ${({ theme }) => themeMedia(theme, '2xs')};
    min-height: ${({ theme }) => themeMedia(theme, '2xs')};
  }
`

export const BusinessLogo = (props) => {
  const style = {}
  if (props.bgimage) {
    style.backgroundImage = `url("${props.bgimage}")`
  }

  return (
    <BusinessLogoStyled {...props} style={style}>
      {props.children}
    </BusinessLogoStyled>
  )
}

export const PreorderTypeWrapper = styled.div`
  margin-bottom: ${({ theme }) => themeSpace(theme, 'xl')};

  > p {
    ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'family'], weight: 600 })}
    margin-top: 0px;
    margin-bottom: ${props => themeSpace(props.theme, 'md')};
  }
`

export const SelectWrapper = styled.div`
  width: 100%;
  font-family: ${props => themeFontFamily(props.theme, 'body')};
`

export const OrderTimeWrapper = styled.div`
  /* "Order time" is a heading of the theme (a section of the
     preorder), a small space over its steps */
  > h2, > h3, > h4 {
    ${({ theme }) => headingText(theme, 'h3')}
    margin: 0 0 ${({ theme }) => themeSpace(theme, 'sm')};
  }
`

export const ButtonWrapper = styled.div`
  width: 100%;
  margin-top: ${({ theme }) => themeSpace(theme, 'xl')};
`

export const TimeListWrapper = styled.div`
  font-family: ${props => themeFontFamily(props.theme, 'body')};
  display: flex;
  flex-direction: column;
  margin: ${props => themeSpace(props.theme, 'xxs')};
  margin-top: ${props => themeSpace(props.theme, 'lg')};
  /* components.menu */
  ${props => themePart(props.theme, 'menu', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow' })}
`

export const TimeItem = styled.div`
  cursor: pointer;
  display: flex;
  padding: ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'xxl')};
  /* components.divider item, on one edge only (adjacent rows
     drew a 2px line between them) */
  ${props => `border-top: none; ${dividerLineCss(props.theme, 'item')}`}

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${props => withAlpha(themeColor(props.theme, 'primary'), 0.12)};
      opacity: 0.8;
    }
  }

  span {
    width: 100%;
    display: flex;
    align-items: center;
    ${props => themeText(props.theme, 'h3', { props: ['size', 'family'] })}
    justify-content: ${props => props?.is12Hours ? 'space-between' : 'center'};

    .time-container {
      display: flex;
      align-items: center;
      gap: ${props => themeSpace(props.theme, 'sm')};

      p#hours, p#minutes {
        margin: 0;
        padding: 0 ${props => themeSpace(props.theme, 'xs')};
      }

      p#separator {
        margin: 0;
        padding: 0 ${props => themeSpace(props.theme, 'xs')};
      }
    }

    p#period {
      margin: 0;
    }
  }

  ${({ active }) => active && css`
    background: ${props => themeColor(props.theme, 'primary')};
    border-color: ${props => themeColor(props.theme, 'primary')};
    color: ${props => themeColor(props.theme, 'on_primary')};

    @media (hover: hover) and (pointer: fine) {
      &:hover {
        background: ${props => themeColor(props.theme, 'primary')};
        opacity: 1;
      }
    }
  `}

  ${({ isDisabled }) => isDisabled && css`
    pointer-events: none;
    opacity: 0.7;
  `}

  ${({ cateringPreorder }) => cateringPreorder && css`
    background: ${props => layerBackground(props.theme)};
    width: 100%;
    min-width: 100%;
    height: ${props => themeSize(props.theme, 'lg')};
    margin: 0;
    border: ${props => themeBorderWidth(props.theme, 'thin')} ${props => themeBorderStyle(props.theme)} ${props => themeColor(props.theme, 'border')};

    span {
      ${props => themeText(props.theme, 'h4', { props: ['size', 'family'] })}
      display: flex;
      align-items: center;
      margin: ${props => themeSpace(props.theme, 'md')} 0;
      margin-left: ${props => themeSpace(props.theme, 'lg')};
      p{
        position: relative;
        bottom: ${props => themeSpace(props.theme, 'xxs')};
      }
    }
    ${({ active }) => active && css`
      background: ${props => themeColor(props.theme, 'primary')};
      color: ${props => themeColor(props.theme, 'on_primary')};
      border-color: ${props => themeColor(props.theme, 'primary')};
      span {
        p{
          bottom: 0;
          margin-left: ${props => themeSpace(props.theme, 'xxs')};
        }
      }
    `}
  `}

  ${({ isAppoint }) => isAppoint && css`
    @media (min-width: 769px) {
      span {
        ${props => themeText(props.theme, 'caption', { props: ['size'] })}
      }
    }
  `}
  ${props => buttonStill(props.theme)}
`

export const TypeContent = styled.div`
  white-space: nowrap;
  color: ${props => themeColor(props.theme, 'text')};
  ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
`

export const Layer = styled.div`
  ${({ nobg }) => !nobg && css`
    /* the page's background at the fixed scrim opacity (0.7) */
    background-color: ${({ theme }) => themeScrim(theme)};
    z-index: 1;
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

export const Day = styled.div.attrs(dayAttrs)`
  display: flex;
  flex-grow: 1;
  color: ${props => themeColor(props.theme, 'text_disabled')};
  cursor: pointer;
  padding: ${props => themeSpace(props.theme, 'md')} 0 ${props => themeSpace(props.theme, 'md')} 0;
  flex-direction: column;
  align-items: center;

  ${({ selected }) => selected && css`
    color: ${props => primaryText(props.theme)};
    background: ${props => withAlpha(themeColor(props.theme, 'primary'), 0.12)};
    border-color: ${props => themeColor(props.theme, 'primary')};
  `}

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${props => withAlpha(themeColor(props.theme, 'primary'), 0.12)};
      opacity: 0.8;
    }
  }
  ${props => buttonStill(props.theme)}
  ${({ theme, selected }) => day(theme, selected)}
`

export const DayName = styled.div`
  display: flex;
  ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
  margin-bottom: ${({ theme }) => themeSpace(theme, 'xs')};
  &:first-letter {
    text-transform: uppercase;
  }
  /* the name of components.date_strip */
  ${({ theme }) => dateStripNameCss(theme)}
`

export const DayNumber = styled.div`
  display: flex;
  ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'line', 'family'], weight: 500 })}
  /* the number of components.date_strip */
  ${({ theme }) => dateStripNumberCss(theme)}
`

export const ClosedBusinessMsg = styled.div`
  text-align: center;
  ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
  width: 100%;
`

export const Divider = styled.div`
  background: ${props => themeColor(props.theme, 'surface_alt')};
  height: ${props => themeBorderWidth(props.theme, 'thick', { fixed: true })};
  /* components.divider section (1px, its spacing around) */
  ${props => dividerRules(props.theme, 'section')}
`

export const ScheduleBody = styled.div`
  overflow: visible;
`
