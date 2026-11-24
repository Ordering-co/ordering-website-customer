import styled from 'styled-components'
import { themeColor, withAlpha } from '~/utils/themeColors'
import { pageGutter, themeSize, themeSpace, themeText } from '~/utils/themeTokens'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { contentColumn, SkeletonBlock } from '../shared/styles'

const phone = `${MOBILE_WEB_MAX_WIDTH - 1}px`

// The store's header photo under a scrim of the theme's overlay; without a photo the page's alternate surface
export const HeroRoot = styled.section`
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  display: flex;
  align-items: flex-end;
  min-height: 70dvh;
  padding-inline: ${({ theme }) => pageGutter(theme)}px;
  overflow: hidden;
  background: ${({ theme, $photo }) => themeColor(theme, $photo ? 'overlay' : 'surface_alt')};
  color: ${({ theme, $photo }) => themeColor(theme, $photo ? 'on_overlay' : 'text')};
`

export const HeroPhoto = styled.img`
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
`

export const HeroScrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(to bottom, ${({ theme }) => withAlpha(themeColor(theme, 'overlay'), 0)} 20%, ${({ theme }) => themeColor(theme, 'overlay')} 100%);
`

export const HeroContent = styled.div`
  ${({ theme }) => contentColumn(theme)}
  padding-block: ${({ theme }) => themeSpace(theme, 'xxxl')};
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => themeSpace(theme, 'md')};

  @media (max-width: ${phone}) {
    padding-block: ${({ theme }) => themeSpace(theme, 'xxl')};
  }
`

export const HeroTitle = styled.h1`
  margin: 0;
  max-width: 20ch;
  text-wrap: balance;
  ${({ theme }) => themeText(theme, 'display')}
`

// The page's h1 while the hero has no store yet: heard, not seen
export const OffscreenTitle = styled.h1`
  position: absolute;
  inline-size: 0;
  block-size: 0;
  margin: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`

// What loads: the hero's own blocks (title, description, the two buttons) on the alternate surface
export const SkeletonTitle = styled(SkeletonBlock)`
  max-width: 20ch;
  min-height: ${({ theme }) => themeSpace(theme, 'xxl')};
`

export const SkeletonText = styled(SkeletonBlock)`
  max-width: 60ch;
`

export const SkeletonActions = styled.div`
  display: flex;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  margin-top: ${({ theme }) => themeSpace(theme, 'sm')};
  & > * {
    width: 12ch;
    min-height: ${({ theme }) => themeSize(theme, 'lg')};
  }
`

export const HeroDescription = styled.p`
  margin: 0;
  max-width: 60ch;
  ${({ theme }) => themeText(theme, 'body_lg')}
`

export const HeroStatus = styled.p`
  margin: 0;
  ${({ theme }) => themeText(theme, 'label')}
`

export const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  margin-top: ${({ theme }) => themeSpace(theme, 'sm')};
`
