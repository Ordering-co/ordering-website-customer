import React from 'react'
import { Button } from '~ui/src/design-system/components/Button'
import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { headingText, themeFontFamily, themeIconSize, themeSize, themeSpace, themeText } from '~/utils/themeTokens'
import { sectionLineRules } from '~ui/src/styles/DetailsSection'

export const Container = styled.div``

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${props => themeSpace(props.theme, 'xs')};

  h4 {
    ${props => headingText(props.theme, 'h4')}
    color: ${props => themeColor(props.theme, 'text')};
  }
  /* sm between the title and its close */
  ${({ theme }) => css`
    && h4 {
      margin: 0;
      margin-inline-end: ${themeSpace(theme, 'sm')};
    }
  `}
`

export const SideForm = styled.div`
  width: 100%;
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  @media (min-width: 768px) {
    display: flex;
    align-items: center;
  }
  /* in the checkouts: the title row's gap is the only one */
  ${({ $section }) => $section && 'margin-top: 0;'}
`

export const UserName = styled.p`
  font-weight: 600;
`

export const UserData = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  text-align: left;
  font-family: ${props => themeFontFamily(props.theme, 'body')};
  ${props => props.theme?.rtl && css`
    text-align: right;
  `}
  position: relative;
  > * {
    margin: ${props => themeSpace(props.theme, 'xs')} 0;
  }

  p {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text')};
  }

  /* in the checkouts: lines of a details section, as the
     address's: one body line each, no margins (the name keeps its bold) */
  ${({ $section, theme }) => $section && css`
    > * {
      margin: 0;
    }
    p {
      ${sectionLineRules(theme)}
    }
    ${UserName} {
      font-weight: 600;
    }
    /* the phone row: of its line's height */
    > div {
      height: auto;
    }
    > div p {
      margin: 0;
    }
  `}
`

/* The close button's box: only its layer over the title (the button is the piece) */
export const ModalIcon = styled.div`
  display: flex;
  z-index: 2;
`

export const TitleContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: 0;
  h2 {
    margin: auto;
    ${props => headingText(props.theme, 'h2')}
  }
  ${({ isAddressFormOpen }) => isAddressFormOpen && css`
      h2{
        width: 75%;
      }
  `}
`

export const CountryFlag = styled.div`
  margin-right: ${props => themeSpace(props.theme, 'xs')};
  .PhoneInputCountryIcon {
    width: ${props => themeIconSize(props.theme, 'lg')};
  }
  .PhoneInputInput {
    display: none;
  }
  .PhoneInputCountrySelect {
    display: none;
  }
  /* the library's stylesheet is not loaded, so the flag is an
     inline image on a text baseline, with the descender's space under it,
     and it sits above the number's center; a block image in flex boxes
     centers it on the line, at its own size */
  .PhoneInput, .PhoneInputCountry {
    display: flex;
    align-items: center;
  }
  .PhoneInputCountryIconImg {
    display: block;
    width: 100%;
    height: auto;
  }
`

export const PhoneContainer = styled.div`
  display: flex;
  align-items: center;
  height: ${props => themeSize(props.theme, 'sm')};
  p {
    margin: ${props => themeSpace(props.theme, 'lg')} 0;
  }
`

export const SkeletonsContainer = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xl')};
`

export const ChangeCustomerText = styled.div`

  span {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => primaryText(props.theme)};
    cursor: pointer;
    user-select: none;
    &:hover {
        text-decoration: underline;
      }
  }
`

// "Change customer details": a button of components.link (sm)
export const ChangeCustomerLink = (props) => (
  <Button {...props} appearance='link' size='sm' />
)
