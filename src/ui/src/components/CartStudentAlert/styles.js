import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeRadius, themeText, themeSpace } from '~/utils/themeTokens'
import { alertRules } from '~ui/src/styles/Alert'

export const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'lg')};
  padding: ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'xxs')} ${props => themeSpace(props.theme, 'sm')};
`

export const Intro = styled.p`
  margin: 0;
  ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
  color: ${({ theme }) => themeColor(theme, 'text')};

  strong {
    font-weight: 600;
  }
`

export const ItemList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'sm')};
`

/* a warning alert of the theme (an item of the list, not a live
   message: no role); its name and reason keep their own text */
export const Item = styled.li`
  padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'md')};
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  background: ${props => themeColor(props.theme, 'warning_subtle')};
  border: ${props => themeBorderWidth(props.theme, 'thin')} ${props => themeBorderStyle(props.theme)} ${props => themeColor(props.theme, 'warning')};

  .name {
    ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 600 })}
    color: ${({ theme }) => themeColor(theme, 'text')};
  }

  .reason {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'on_warning')};
  }
  ${props => alertRules(props.theme, 'warning')}
  && {
    flex-direction: column;
  }
  && .reason {
    color: inherit;
  }
`

export const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'md')};
  margin-top: ${props => themeSpace(props.theme, 'sm')};
`
