import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeValue } from '~/utils/themeTokens'
import { linkThemeRules } from '~ui/src/styles/Link'
import { layerBackgroundCss } from '~ui/src/styles/Layer'

// The text of an alert or a confirmation, in the base Dialog: a floating layer (styles/Layer),
// what is inside it is of the modal's background.
export const PopupContent = styled.div`
  ${props => layerBackgroundCss(themeValue(props.theme, 'modal', 'base.background'))}
  text-align: left;
  letter-spacing: 0px;
  color: ${props => themeColor(props.theme, 'text')};
  opacity: 1;
  ${props => props.theme?.rtl && css`
    text-align: right;
  `}
  ul {
    padding-left: var(--ot-space-xxl);
    ${props => props.theme?.rtl && css`
      padding-right: var(--ot-space-xxl);
      padding-left: 0;
    `}
    li {
      margin-top: var(--ot-space-sm);
      margin-bottom: var(--ot-space-sm);
    }
  }
  /* the links of the list (e.g. the dashboard one) */
  ${({ theme }) => `&& ul li a { ${linkThemeRules(theme)} }`}
`
