import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'

// The offer's own surface (tokens.color.surface_alt, which the page's
// background is not), bordered so it reads on a theme whose two are close:
// the text on the left and the action on the right from the phone cut, stacked
// below it
export const Offer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => themeSpace(theme, 'lg')};
  padding: ${({ theme }) => themeSpace(theme, 'xl')};
  border: ${({ theme }) => themeBorderWidth(theme, 'thin')} ${({ theme }) => themeBorderStyle(theme)} ${({ theme }) => themeColor(theme, 'border')};
  border-radius: ${({ theme }) => themeRadius(theme, 'lg')};
  background: ${({ theme }) => themeColor(theme, 'surface_alt')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  @media (width >= ${MOBILE_WEB_MAX_WIDTH}px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: ${({ theme }) => themeSpace(theme, 'xxl')};
  }
`

export const OfferBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  min-width: 0;
`

export const OfferText = styled.p`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'body')}
`
