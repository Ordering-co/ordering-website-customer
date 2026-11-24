import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeMedia, themeSize, themeSpace, headingText } from '~/utils/themeTokens'
import { sectionTitleGap } from '~ui/src/styles/DetailsSection'

export const PlaceSpotContainer = styled.div`
  min-height: calc(1.5 * ${({ theme }) => themeSize(theme, 'xl')});
  position: relative;
  .title {
    margin-top: ${({ theme }) => themeSpace(theme, 'md')};
    margin-bottom: ${({ theme }) => themeSpace(theme, 'md')};
  }
  img{
    ${({ isCheckout, theme }) => isCheckout && css`
      height: ${themeMedia(theme, 'xl')};
      width: auto;
      aspect-ratio: 170 / 150;
    `}
  }
  #not-found-source {
    h3{
      ${props => headingText(props.theme, 'h3')}
    }
  }
`

export const PlaceGroupContainer = styled.div`
  margin-top: ${({ theme }) => themeSpace(theme, 'xl')};
`

// The title of a section of the checkout (as Customer Details, Delivery
// Address): the h4 of the theme, one gap over its fields
export const Title = styled.h4`
  ${({ theme }) => headingText(theme, 'h4')}
  color: ${({ theme }) => themeColor(theme, 'text')};
  margin: 0 0 ${({ theme }) => sectionTitleGap(theme)};
`

export const ButtonWrapper = styled.div`
  position: absolute;
  bottom: 0;
  width: 100%;
  display: flex;
`

export const WrapperInput = styled.div``

// the update action under the spot field: the lg space over it
export const WrapperAction = styled.div`
  display: flex;
  margin-top: ${({ theme }) => themeSpace(theme, 'lg')};
`

// A single gutter on each cell edge; the list bleeds by that same amount
// so the outer fields stay aligned with the rest of the checkout.
const optionInset = (theme) => themeSpace(theme, 'sm')

export const WrapperOption = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 30ch;
  flex: 1;
  padding: 0 ${({ theme }) => optionInset(theme)};
`

export const WrapperOptionList = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: calc(100% + 2 * ${({ theme }) => optionInset(theme)});
  margin-left: calc(-1 * ${({ theme }) => optionInset(theme)});

  @media (min-width: 1600px) {
    display:grid;
    grid-template-columns: 1fr 1fr;
    grid-column-gap: ${({ theme }) => themeSpace(theme, 'xl')};
    grid-row-gap: ${({ theme }) => themeSpace(theme, 'xl')};
  }
`
