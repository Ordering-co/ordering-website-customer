import styled from 'styled-components'
import { headingText, themeBorderWidth, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { themeColor } from '~/utils/themeColors'
import { getThemeCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { themeLogoBoxCss } from '~ui/src/styles/Logo'
import { fieldGap, fieldMessageCss } from '~ui/src/styles/Field'

export const Screen = styled.main`
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: ${({ theme }) => themeSpace(theme, 'xl')} ${({ theme }) => themeSpace(theme, 'lg')};
  background: ${({ theme }) => themeColor(theme, 'surface_alt')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ::selection { background: ${({ theme }) => themeColor(theme, 'primary_subtle')}; color: ${({ theme }) => themeColor(theme, 'text')}; }
`

export const Content = styled.section`
  width: 100%;
  max-width: min(100%, 65ch);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

// The site's logo, or its initials on the primary color when it has none
export const LogoImage = styled.img`
  ${({ theme }) => themeLogoBoxCss(theme, 'screen')}
`

export const Initials = styled.div`
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  height: ${({ theme }) => getThemeCss(theme, 'header').base.screen_logo_height};
  border-radius: ${({ theme }) => themeRadius(theme, 'full')};
  background: ${({ theme }) => themeColor(theme, 'primary')};
  color: ${({ theme }) => themeColor(theme, 'on_primary')};
  ${({ theme }) => headingText(theme, 'h3')}
`

export const Name = styled.p`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'label')}
`

export const Title = styled.h1`
  margin: 0;
  text-wrap: balance;
  ${({ theme }) => headingText(theme, 'h1')}
`

export const Rule = styled.span`
  width: ${({ theme }) => themeSpace(theme, 'xxxl')};
  height: ${({ theme }) => themeBorderWidth(theme, 'thick', { fixed: true })};
  border-radius: ${({ theme }) => themeRadius(theme, 'full')};
  background: ${({ theme }) => themeColor(theme, 'primary')};
`

export const Text = styled.p`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'body_lg')}
`

export const Form = styled.form`
  width: 100%;
  max-width: min(100%, 50ch);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: ${({ theme }) => fieldGap(theme)};

  &[hidden] { display: none; }
`

// the field takes the room left by the button; on a phone the button goes under it, full width
export const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};

  @media (max-width: ${MOBILE_WEB_MAX_WIDTH - 1}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const ErrorText = styled.p`
  ${({ theme }) => fieldMessageCss(theme, { error: true })}
  text-align: start;
`
