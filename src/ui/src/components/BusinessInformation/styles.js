import React from 'react'
import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { headingText, themeBorderWidth, themeFontFamily, themeIconSize, themeMedia, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { dividerRules } from '~ui/src/styles/Divider'
import { layerBackground } from '~ui/src/styles/Layer'

export const BusinessInformationContainer = styled.div`
  width: 100%;
  position: relative;
  overflow: auto;
`

export const BussinessTitle = styled.div`
  z-index: 1000;
  display: inline-flex;
  width: 50%;
  background: ${props => layerBackground(props.theme)};
  align-items: center;
  margin-inline-start: ${props => themeSpace(props.theme, 'md')};
  margin-bottom: ${props => themeSpace(props.theme, 'md')};
  border-radius: ${props => themeRadius(props.theme, 'lg')};
  padding: ${props => themeSpace(props.theme, 'sm')};
`

export const HeaderImage = styled.div`
  width: 20%;
  margin-top: auto;
  > img {
    width: 100%;
    height: 100%;
  }
`

const BusinessLogoStyled = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat;
  /* a logo mark is never cropped (contain, not cover) */
  background-size: contain;
  object-fit: contain;
  background-position: center;
  min-height: ${props => themeMedia(props.theme, '3xs')};
  border-radius: ${props => themeRadius(props.theme, 'md')};
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

export const Information = styled.div`
  display: inline-flex;
  flex-direction: column;
  flex: 1;
  > h5 {
    margin-block-end: 0.8em;
    margin-block-start: 0.8em;
  }
  > p {
    margin-block-end: 0;
    margin-block-start: 0.3em;
    > svg {
      vertical-align: middle;
    }
  }
`

export const BusinessContent = styled.div`
  background: ${props => layerBackground(props.theme)};

  .business-location-container {
    padding: 0 ${props => themeSpace(props.theme, 'sm')};

    @media(min-width: 768px){
      padding: 0 ${props => themeSpace(props.theme, 'lg')};
    }
  }
`

/* a section of the dialog under its title (h2): an h3 in the theme's h4 */
export const SectionTitle = styled.h3`
  ${props => headingText(props.theme, 'h4')}
  color: ${props => themeColor(props.theme, 'text')};
  margin: ${props => themeSpace(props.theme, 'lg')} 0 ${props => themeSpace(props.theme, 'lg')} 0;
`

export const Map = styled.div`
  width: calc(100% + 2 * ${props => themeSpace(props.theme, 'sm')});
  margin-inline-start: calc(-1 * ${props => themeSpace(props.theme, 'sm')});
  /* 13:5 is today's 135px at a phone's 350px; the 15dvh cap keeps it there in the wider desktop dialog */
  aspect-ratio: 13 / 5;
  max-height: 15dvh;
  /* a short window cannot squeeze the map below the media scale's lg (the dialog scrolls) */
  min-height: ${props => themeMedia(props.theme, 'lg')};
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};

  > div, img {
    position: relative !important;
    width: 100% !important;
    height: 100% !important;
    border-radius: ${props => themeRadius(props.theme, 'xxl')};
  }
  img {
    display: block;
    object-fit: cover;
  }
  @media(min-width: 768px){
    width: calc(100% + 2 * ${props => themeSpace(props.theme, 'lg')});
    margin-inline-start: calc(-1 * ${props => themeSpace(props.theme, 'lg')});
  }
`

export const ScheduleSection = styled.div`
  width: 100%;
  /* the divider after it holds the space */
  margin-bottom: 0;
`

export const ScheduleContainer = styled.div`
  width: 100%;
  background: ${props => themeColor(props.theme, 'surface_alt')};
  border-radius: ${props => themeRadius(props.theme, 'xl')};
  padding: ${props => themeSpace(props.theme, 'lg')} 0;
`

export const DeliveryInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin: ${props => themeSpace(props.theme, 'md')} 0 ${props => themeSpace(props.theme, 'md')};

  /* "Delivery time" / "Pickup time": labels of their value, not headings */
  p {
    margin: 0;
    ${props => themeText(props.theme, 'body_lg', { props: ['size'] })}
  }

  > div {
    padding: ${props => themeSpace(props.theme, 'md')} 0;
    width: 100%;
    display: flex;
    flex-direction: column;

    > div {
      ${props => themeText(props.theme, 'body', { props: ['size'] })}
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-inline-end: ${props => themeSpace(props.theme, 'xl')};

      &:nth-last-child(1) {
        margin-top: ${props => themeSpace(props.theme, 'md')};
      }

      svg {
        font-size: ${props => themeIconSize(props.theme, 'sm')};
        margin-bottom: calc(-1 * ${props => themeSpace(props.theme, 'xs')});
        margin-inline-end: ${props => themeSpace(props.theme, 'sm')};
      }

      > div {
        min-width: 9ch;
        display: flex;
        justify-content: flex-start;
      }
    }
  }
`
export const BusinessMediaContent = styled.div`
  padding-bottom: ${props => themeSpace(props.theme, 'lg')};
  overflow: auto hidden;
  ::-webkit-scrollbar {
    width: 0px;
    height: 0px;
  }

  > div {
    display: flex;
    box-sizing: border-box;
    > span {
      > img,
      > iframe {
        object-fit: cover;
        margin: ${props => themeSpace(props.theme, 'md')} ${props => themeSpace(props.theme, 'md')};
        width: auto;
        height: ${props => themeMedia(props.theme, 'lg')};
        aspect-ratio: 3 / 2;
        border-radius: ${props => themeRadius(props.theme, 'xl')};
        cursor: pointer;
      }
    }
  }
`

export const Description = styled.p`
  margin: ${props => themeSpace(props.theme, 'md')} 0 0px;
  font-family: ${props => themeFontFamily(props.theme, 'body')};
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
`

export const ImageContainer = styled.div`
  max-height: 85%;
  img {
    margin-bottom: calc(-1 * ${props => themeSpace(props.theme, 'xxs')});
    width: 100%;
    height: auto;
    aspect-ratio: auto 16 / 9;
    border-bottom-left-radius: ${props => themeRadius(props.theme, 'md')};
    border-bottom-right-radius: ${props => themeRadius(props.theme, 'md')};
  }

  @media (max-width: 768px) {
    height: 85vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`

export const BusinessTitle = styled.h2`
  ${props => headingText(props.theme, 'h2')}
  color: ${props => themeColor(props.theme, 'text')};
  margin-top: 0;
  margin-bottom: 0;
  ${props => props.theme?.rtl && css`
    padding-right: ${props => themeSpace(props.theme, 'xxl')};
    padding-left: 0;
  `}
`

export const BusinessAddress = styled.p`
  display: flex;
  align-items: center;
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text')};
  margin: ${props => themeSpace(props.theme, 'xxl')} 0 ${props => themeSpace(props.theme, 'lg')};

  svg {
    color: ${props => primaryText(props.theme)};
    font-size: ${props => themeIconSize(props.theme, 'sm')};
    margin-inline-end: ${props => themeSpace(props.theme, 'sm')};
  }
`
export const BusinessAddressNotes = styled.p`
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text')};
  margin: ${props => themeSpace(props.theme, 'lg')} 0 ${props => themeSpace(props.theme, 'xl')} 0;
`

export const Divider = styled.div`
  background: ${props => themeColor(props.theme, 'surface_alt')};
  height: ${props => themeBorderWidth(props.theme, 'thick', { fixed: true })};
  /* components.divider section (1px, its spacing around) */
  ${props => dividerRules(props.theme, 'section')}
`
