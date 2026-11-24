import React from 'react'
import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { headingText, themeSize, themeSpace, themeRadius, themeShadow, themeText, blockStill } from '~/utils/themeTokens'
import { Button } from '~ui/src/design-system/components/Button'
import { dividerRules } from '~ui/src/styles/Divider'
import { modalSectionLevel } from '~ui/src/components/Overlay/titleLevel'
import { layerBackground } from '~ui/src/styles/Layer'

export const ReviewProductContainer = styled.form`
  .subtitle {
    margin: 0 0 ${props => themeSpace(props.theme, 'xl')};
    ${props => themeText(props.theme, 'h4', { props: ['size', 'family'] })}
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const ActionBlock = styled.div`
  /* the action fills the row */
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  width: 100%;

  /* keep the primary CTA visible while the product list scrolls on mobile */
  @media (max-width: 768px) {
    position: sticky;
    bottom: 0;
    background-color: ${props => layerBackground(props.theme)};
    padding: ${props => themeSpace(props.theme, 'sm')} 0;
    z-index: 10;
  }
  ${props => blockStill(props.theme)}
`

export const SingleProductReviewContainer = styled.div`
  ${props => blockStill(props.theme)}
`

export const LogoAndReviewWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;

  .comments-title {
    margin-top: 0px;
    margin-bottom: 0px;
    ${props => themeText(props.theme, 'body_lg', { props: ['size', 'weight'], weight: 600 })}
    ${props => blockStill(props.theme)}
  }

  .product-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .product-text {
      p {
        margin: 0;
        ${props => themeText(props.theme, 'body', { props: ['size'] })}
        ${props => blockStill(props.theme)}
      }
      .bold {
        ${props => blockStill(props.theme)}
        /* the section's title is a heading one level below the modal's
           title, of that level's typography */
        margin: 0;
        ${props => headingText(props.theme, modalSectionLevel(props.theme))}
      }
    }
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const ReviewsProgressWrapper = styled.div`
  width: 100%;
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  margin-bottom: ${props => themeSpace(props.theme, 'sm')};

  ${({ useSimpleRating }) => useSimpleRating && css`
    margin-top: ${props => themeSpace(props.theme, 'lg')};
  `}

  p {
    margin-top: 0;
    margin-bottom: ${props => themeSpace(props.theme, 'lg')};
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text')};
    ${props => blockStill(props.theme)}
  }

  .rating-container {
    display: flex;
    gap: ${props => themeSpace(props.theme, 'md')};
    justify-content: flex-start;
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const AdditionCommentsWrapper = styled.div`
  ${props => blockStill(props.theme)}
`

// "Additional comments" (shows / hides the field): a
// button of components.link.
export const AddCommentHideShow = ({ active, ...props }) => (
  <Button {...props} appearance='link' aria-expanded={!!active} style={{ userSelect: 'none' }} />
)

export const Comments = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'sm')};

  p {
    margin-top: 0;
    margin-bottom: ${props => themeSpace(props.theme, 'sm')};
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text')};
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const CommentsList = styled.div`
  padding: ${props => themeSpace(props.theme, 'xxs')};
  margin-top: ${props => themeSpace(props.theme, 'sm')};
  margin-bottom: ${props => themeSpace(props.theme, 'sm')};
  display: flex;
  flex-wrap: wrap;
  gap: ${props => themeSpace(props.theme, 'md')};
  ${props => blockStill(props.theme)}
`

export const WrapperProductLogo = styled.div`
  align-self: center;
  width: ${props => themeSize(props.theme, 'lg')};
  height: ${props => themeSize(props.theme, 'lg')};
  min-height: ${props => themeSize(props.theme, 'lg')};
  max-width: ${props => themeSize(props.theme, 'lg')};
  box-shadow: ${props => themeShadow(props.theme, 'sm')};
  border-radius: ${props => themeRadius(props.theme, 'md')};
  ${props => blockStill(props.theme)}
`

const ProductLogoStyled = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  background-repeat: no-repeat, repeat;
  background-size: cover;
  object-fit: cover;
  background-position: center;
  min-height: ${props => themeSize(props.theme, 'lg')};
  border-radius: ${props => themeRadius(props.theme, 'md')};

  @media (min-width: 481px){
    min-height: ${props => themeSize(props.theme, 'lg')};
  }
  ${props => blockStill(props.theme)}
`

export const ProductLogo = (props) => {
  const style = {}
  if (props.bgimage) {
    style.backgroundImage = `url("${props.bgimage}")`
  }

  return (
    <ProductLogoStyled {...props} style={style}>
      {props.children}
    </ProductLogoStyled>
  )
}

export const Divider = styled.div`
  ${props => blockStill(props.theme)}
  /* components.divider section */
  ${props => dividerRules(props.theme, 'section')}
`
