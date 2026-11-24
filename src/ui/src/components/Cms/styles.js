import styled from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'
import { linkThemeRules } from '~ui/src/styles/Link'
import { pageContainerRules } from '~ui/src/styles/Page'
import { srOnlyCss } from '~ui/src/styles/Rules'

export const CmsContainer = styled.div`
  /* the box of the pages (the body is the page's own HTML) */
  ${props => pageContainerRules(props.theme)}
`

/* The page's own HTML: its links are links of the theme, its images fit the
   box and its blocks are lg apart (the global text styles give the rest). */
export const CmsBody = styled.div`
  ${({ theme }) => `& a { ${linkThemeRules(theme)} }`}

  img {
    max-width: 100%;
    height: auto;
  }

  p, ul, ol, table, blockquote {
    margin-block: ${({ theme }) => themeSpace(theme, 'lg')};
  }
`

/* The page's title for assistive technology, when its HTML has no h1. */
export const CmsTitle = styled.h1`
  ${srOnlyCss}
`

export const SkeletonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

/* skeleton heights: the rough shape of a page while it loads */
export const SkeletonHeader = styled.div`
  width: 100%;
  height: 12dvh;
`

export const SkeletonContent = styled.div`
  width: 100%;
  height: 60dvh;
  display: flex;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

export const SkeletonInformation = styled.div`
  width: 70%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

export const SkeletonSide = styled.div`
  width: 30%;
  height: 100%;
`
