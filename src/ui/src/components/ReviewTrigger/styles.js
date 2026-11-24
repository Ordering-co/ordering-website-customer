import React from 'react'
import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeMedia, themeRadius, themeShadow, themeSize, themeSpace, themeText } from '~/utils/themeTokens'

export const ReviewOrderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`
export const StarWrapper = styled.div`
  display: flex;
  align-items: center;

  > svg {
    height: ${props => themeSize(props.theme, 'sm')};
    width: ${props => themeSize(props.theme, 'sm')};
    cursor: pointer
  }
  justify-content: center;
  gap: ${props => themeSpace(props.theme, 'xs')};
`

export const PlacedDate = styled.p`
  text-align: center;
`
export const Send = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  width: 100%;
`

const BusinessLogoStyled = styled.div`
  display: flex;
  width: ${props => themeMedia(props.theme, '3xs')};
  height: ${props => themeMedia(props.theme, '3xs')};
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat;
  /* a logo mark is never cropped (contain, not cover) */
  background-size: contain;
  object-fit: contain;
  background-position: center;
  min-height: ${props => themeMedia(props.theme, '3xs')};
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  @media (min-width: 481px){
    width: 100%;
    height: 100%;
    min-height: ${props => themeMedia(props.theme, '3xs')};
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

export const BusinessName = styled.p`
  text-align: center;
  ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
`
export const WrapperBusinessLogo = styled.div`
  align-self: center;
  width: ${props => themeMedia(props.theme, '3xs')};
  height: ${props => themeMedia(props.theme, '3xs')};
  min-height: ${props => themeMedia(props.theme, '3xs')};
  max-width: ${props => themeMedia(props.theme, '3xs')};
  box-shadow: ${props => themeShadow(props.theme, 'sm')};
  border-radius: ${props => themeRadius(props.theme, 'lg')};
`

export const ReviewsProgressWrapper = styled.div`
  padding: 0 ${props => themeSpace(props.theme, 'sm')};
  width: min(100%, 26ch);
  margin: 0 auto;
  p {
    margin-top: 0;
    margin-bottom: ${props => themeSpace(props.theme, 'lg')};
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text')};
  }
`

export const LogoAndReviewWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
`
