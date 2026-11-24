import styled from 'styled-components'
import { headingText, themeSpace, themeText } from '~/utils/themeTokens'
import { themeColor } from '~/utils/themeColors'
import { dividerRules } from '~ui/src/styles/Divider'
import { profileContainerCss, profileDividerBleedCss } from '~ui/src/components/ProfessionalProfile/styles'

export const Container = styled.div`
  position: relative;
  /* the modal's padding */
  ${profileContainerCss}
`

export const PhotoWrapper = styled.div`
  display: flex;
  justify-content: center;
  /* the avatar the theme's lg over the name */
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};
`

export const InfoWrapper = styled.div`
  h2 {
    ${props => headingText(props.theme, 'h2')}
    margin-top: 0px;
    margin-bottom: ${props => themeSpace(props.theme, 'xs')};
  }
`

export const OccupationWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${props => themeSpace(props.theme, 'md')};
  > p {
    margin: 0;
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 400 })}
  }
`

export const Description = styled.p`
  margin-top: 0px;
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};
  ${props => themeText(props.theme, 'body', { props: ['size', 'weight', 'line'], weight: 400 })}
`

export const Divider = styled.div`
  /* components.divider band; it keeps its bleed */
  ${props => dividerRules(props.theme, 'band', { inline: false })}
  ${profileDividerBleedCss}
`

export const ReviewWrapper = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  > h3 {
    ${props => headingText(props.theme, 'h3')}
    margin-top: 0px;
    margin-bottom: ${props => themeSpace(props.theme, 'lg')};
  }
`

export const ReviewItemContatiner = styled.div`
  margin-bottom: ${props => themeSpace(props.theme, 'xxl')};
`

export const ReviewQualityContainer = styled.div`
  display: flex;
  flex-direction: column;
`

export const ReviewBarContainer = styled.div`
  margin: ${props => themeSpace(props.theme, 'lg')} 0;
`

export const ReviewQualityTextContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  p {
    margin: 0px;
    color: ${props => themeColor(props.theme, 'text_disabled')};
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
  }
`

export const Comment = styled.div`
  ${props => themeText(props.theme, 'caption', { props: ['size'] })}
  margin: ${props => themeSpace(props.theme, 'xl')} 0;
`

export const NotReviewed = styled.p`
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
`
