import styled from 'styled-components'
import { themeIconSize, themeRadius } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'
import { motionCss } from '~/utils/themeMotion'

export const LanguageSelectorListContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0 auto;
  ${({ theme }) => motionCss(theme, 'choice', ['gap'])}

  /* the options of components.choice, the choice lists' gap apart */
  gap: ${({ theme }) => getThemeCss(theme, 'choice').base.gap};
`

/* The flag is an icon of the theme (tokens.icon.lg) */
export const Flag = styled.span`
  display: flex;
  flex-shrink: 0;
  width: ${({ theme }) => themeIconSize(theme, 'lg')};
  height: ${({ theme }) => themeIconSize(theme, 'lg')};
  overflow: hidden;
  border-radius: ${({ theme }) => themeRadius(theme, 'sm')};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`
