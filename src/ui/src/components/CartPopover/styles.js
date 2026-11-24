import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { buttonStill, themePart, themeRadius, themeShadow, themeSpace, themeValue } from '~/utils/themeTokens'
import { layerBackgroundCss } from '~ui/src/styles/Layer'

export const Wrapper = styled.div`
  overflow: hidden;
  box-shadow: ${props => themeShadow(props.theme, 'sm')};
  border-radius: ${props => themeRadius(props.theme, 'md')};

  /* still, like every button, open or not; the box is the cart Button's
     (HeaderCartButton), nothing here clips, paints or moves it */
  ${props => buttonStill(props.theme)}
  box-shadow: none;
  overflow: visible;
`

export const PopoverBody = styled.div`
  background-color: ${(props) => themeColor(props.theme, 'surface')};
  color: ${props => themeColor(props.theme, 'text')};
  padding: ${({ theme }) => themeSpace(theme, 'lg')} ${({ theme }) => themeSpace(theme, 'xs')};
  border-radius: ${props => themeRadius(props.theme, 'md', 'cart')};
  max-width: min(100%, 62ch);
  z-index: 10002;
  box-shadow: ${props => themeShadow(props.theme, 'xl', 'cart')};
  ${props => themePart(props.theme, 'cart', { background: 'base.background' })}
  /* a floating layer (styles/Layer): what is inside it is of its background */
  ${props => layerBackgroundCss(themeValue(props.theme, 'cart', 'base.background'))}
`
