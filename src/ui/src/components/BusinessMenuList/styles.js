import styled from 'styled-components'
import { themeFontFamily, themeSpace, themeText } from '~/utils/themeTokens'

export const BusinessMenuListContainer = styled.div`
  margin-bottom: ${props => themeSpace(props.theme, 'xxl')};

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

/* the text and color of the menu's option and of the field
   (components.menu / components.input), none of its own */
export const Option = styled.div`
  white-space: nowrap;
`
