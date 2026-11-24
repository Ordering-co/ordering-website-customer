import React from 'react'
import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeMedia, themeRadius, themeShadow, themeSpace, themeText } from '~/utils/themeTokens'

export const ReviewProfessionalContainer = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`

export const Comments = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  margin-top: ${props => themeSpace(props.theme, 'sm')};

  p {
    margin-top: 0;
    margin-bottom: ${props => themeSpace(props.theme, 'sm')};
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text')};
  }
`
export const ActionBtnWrapper = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  width: 100%;
  /* the action fills the row */
  display: flex;
  flex-direction: column;
  align-items: stretch;
`

// The portrait fills the square its wrapper reserves (the md medium), so the frame, the photo
// and the fallback glyph share one footprint while the review loads.
const DriverPhotoStyled = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat, repeat;
  background-size: cover;
  object-fit: cover;
  background-position: center;
  border-radius: ${props => themeRadius(props.theme, 'sm')};
`

export const DriverPhoto = (props) => {
  const style = {}
  if (props.bgimage) {
    style.backgroundImage = `url("${props.bgimage}")`
  }

  return (
    <DriverPhotoStyled {...props} style={style}>
      {props.children}
    </DriverPhotoStyled>
  )
}

export const WrapperDriverPhoto = styled.div`
  align-self: center;
  width: ${({ theme }) => themeMedia(theme, 'md')};
  aspect-ratio: 1;
  box-shadow: ${props => themeShadow(props.theme, 'sm')};
  border-radius: ${props => themeRadius(props.theme, 'sm')};

  svg {
    width: 100%;
    height: 100%;
  }
`

export const ReviewsProgressWrapper = styled.div`
  width: 100%;
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};

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

export const CommentsList = styled.div`
  /* the chips md apart, wrapping under their title */
  display: flex;
  flex-wrap: wrap;
  gap: ${props => themeSpace(props.theme, 'md')};
  > p {
    width: 100%;
  }

  p {
    margin-top: 0;
    margin-bottom: 0;
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text')};
  }

`

export const DriverInfoBlock = styled.p`
  margin-top: ${props => themeSpace(props.theme, 'lg')};
  margin-bottom: 0;
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  text-align: center;
  color: ${props => themeColor(props.theme, 'text')};
`
