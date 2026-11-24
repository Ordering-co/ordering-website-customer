import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { pageGutter, themeBorderStyle, themeMedia, themeBorderWidth, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { sectionDescriptionCss, sectionTitleTextCss } from '~ui/src/styles/SectionHeader'

const phone = `${MOBILE_WEB_MAX_WIDTH - 1}px`

// The column of the home page's content: the header, the hero, every section and the footer put
// their content in it, so their left edges line up. Its width is measured in the body's own
// font (ch), whatever font the band that holds it has. The page's sides (pageGutter) are the
// padding of each band, outside the column.
export const contentColumn = (theme) => css`
  box-sizing: border-box;
  width: 100%;
  max-width: 120ch;
  margin-inline: auto;
  ${themeText(theme, 'body', { props: ['size', 'family'] })}
`

// One band of the home page: the theme's page color (or its alternate surface) from side to
// side, the content in a column of readable measure. The room that anchors from the header
// leave for the sticky header is the page's scroll padding (LandingHeader), not a margin here.
export const SectionRoot = styled.section`
  box-sizing: border-box;
  background: ${({ theme, $tone }) => themeColor(theme, $tone === 'alt' ? 'surface_alt' : 'background')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'body')}
  padding: ${({ theme }) => themeSpace(theme, 'xxxl')} ${({ theme }) => pageGutter(theme)}px;

  @media (max-width: ${phone}) {
    padding-block: ${({ theme }) => themeSpace(theme, 'xxl')};
  }
`

export const SectionInner = styled.div`
  ${({ theme }) => contentColumn(theme)}
`

export const SectionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  margin-bottom: ${({ theme, $attached }) => ($attached ? '0' : themeSpace(theme, 'xl'))};
`

// under the title: the section header's description (its text, color, gap and space under it);
// the title of a band is at the start, so is it (not the header's own alignment)
export const SectionDescription = styled.p`
  ${({ theme }) => sectionDescriptionCss(theme, { level: 'h2' })}
  margin-inline: 0;
  text-align: start;
`

export const SectionTitle = styled.h2`
  margin: 0;
  ${({ theme }) => sectionTitleTextCss(theme, { level: 'h2' })}
`

export const Muted = styled.p`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
`

// What loads: blocks of the final layout in the theme's alternate surface
export const SkeletonBlock = styled.div`
  background: ${({ theme, $tone }) => themeColor(theme, $tone === 'alt' ? 'border' : 'surface_alt')};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  aspect-ratio: ${({ $ratio }) => $ratio || 'auto'};
  min-height: ${({ $ratio, theme }) => ($ratio ? '0' : themeSpace(theme, 'xl'))};
  width: ${({ $width }) => $width || '100%'};
`

export const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${({ theme, $min }) => $min || themeMedia(theme, '3xl')}, 1fr));
  gap: ${({ theme }) => themeSpace(theme, 'lg')};
`

// A failed hero: what happened and the way out
export const ErrorBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

export const Rule = styled.div`
  border-top: ${({ theme }) => themeBorderWidth(theme, 'thin')} ${({ theme }) => themeBorderStyle(theme)} ${({ theme }) => themeColor(theme, 'border')};
`
