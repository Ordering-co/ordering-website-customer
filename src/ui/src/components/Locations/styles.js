import styled from 'styled-components'
import { themeRadius, themeShadow, themeSpace, themeText, headingText, themeIconSize } from '~/utils/themeTokens'
import { linkThemeRules } from '~ui/src/styles/Link'
import { primaryText, themeColor } from '~/utils/themeColors'

export const WrapperMap = styled.div`
  width: 100%;
  height: 100%;
  position: relative;

  /* the Mapbox failover (StaticMap) */
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .business-name-map {
    color: ${props => props.colorTitle ?? primaryText(props.theme)};
  }

  /* the phone is a link of the theme (components.link) */
  ${({ theme }) => `&& .business-tel-map a { ${linkThemeRules(theme)} }`}

  /* Clean, UberEats-style info card: rounded, soft shadow, no default chrome */
  .gm-style .gm-style-iw-c {
    padding: 0 !important;
    border-radius: ${props => themeRadius(props.theme, 'lg')} !important;
    box-shadow: ${props => themeShadow(props.theme, 'xl')} !important;
  }

  .gm-style-iw-d {
    overflow: auto !important;
  }
  .gm-style-iw-chr {
    height: ${props => themeIconSize(props.theme, 'md')} !important;
  }

  .bold {
    font-weight: 400;
    color: ${props => themeColor(props.theme, 'text_muted')};
  }

  .custom-marker-icon {
    border-radius: ${props => themeRadius(props.theme, 'full')};
  }
`

export const ContainerCard = styled.div`
  padding: ${({ theme }) => `${themeSpace(theme, 'md')} ${themeSpace(theme, 'lg')} ${themeSpace(theme, 'lg')}`};
  font-family: inherit;
`

export const WrapperBusinessCard = styled.div`
  max-width: min(100%, 35ch);
`

export const BusinessHero = styled.div`
`

export const BusinessContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
`

export const BusinessInfo = styled.div`
  ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
  color: ${props => themeColor(props.theme, 'text')};

  .bold {
    font-weight: 400;
    color: ${props => themeColor(props.theme, 'text_muted')};
  }
`

export const BusinessInfoItem = styled.div`
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
`

export const BusinessName = styled.h4`
  ${props => headingText(props.theme, 'h4')}
  margin: 0 0 ${({ theme }) => themeSpace(theme, 'sm')} !important;
  width: 100%;
`

export const BusinessAddress = styled.p`
  margin: 0;
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
`
