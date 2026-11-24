import { css } from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'
import { pageGutter, themeSpace } from '~/utils/themeTokens'
import { sectionHeaderLook, sectionTitleTextCss } from '~ui/src/styles/SectionHeader'

/* The pages of the account (favorites, orders, profile, saved places, wallets,
   gift card, help) share one box, so they line up when moving between them: the
   page's side space (tokens.layout.page_gutter, the header's sides), a top
   space (tokens.space.xxl) and a bottom one, and 75% of the screen from 769px.

   An account page passes ACCOUNT_PAGE (`component`): its box is then the
   theme's components.account_page (width, padding_top, padding_bottom).

   The page's title (its h1) is the page variant of components.section_header
   (the one owner of the titles): its title, title_color, align and, under it,
   margin_bottom. */
// The bottom space of a page without a component (no token: 40px is between
// space.xxl (32) and xxxl (48))
export const PAGE_BOTTOM = 40
// The box's width from 769px of a page without a component (percent of the screen)
export const PAGE_WIDTH = 75

/** The components.<component> of the account pages' box */
export const ACCOUNT_PAGE = 'account_page'

// The props of the page's header (section_header, page variant)
const pageHeader = (theme) => sectionHeaderLook(theme, 'h1')

/** The space under the page's title (the page header's margin_bottom), as CSS. */
export const pageTitleGap = (theme) => pageHeader(theme).margin_bottom

/** The padding of the page's box (top, sides, bottom), as CSS. */
export const pagePadding = (theme, component) => {
  const side = `${pageGutter(theme)}px`
  if (!component) return `${themeSpace(theme, 'xxl')} ${side} ${PAGE_BOTTOM}px`
  const base = getThemeCss(theme, component).base
  return `${base.padding_top} ${side} ${base.padding_bottom}`
}

/** The box's width from 769px: the page's `width` (a percent), else PAGE_WIDTH for a page without a component. */
export const pageWidth = (theme, component) => (component ? getThemeCss(theme, component).base.width : `${PAGE_WIDTH}%`)

export const pageContainerRules = (theme, component) => css`
  box-sizing: border-box;
  width: 100%;
  max-width: none;
  margin-left: auto;
  margin-right: auto;
  padding: ${pagePadding(theme, component)};

  /* (restated: the page's own media rule comes after its base one) */
  @media (min-width: 769px) {
    width: ${pageWidth(theme, component)};
    padding: ${pagePadding(theme, component)};
  }
`

/* The page's title: its text and color (the page header's). */
export const pageTitleText = (theme) => sectionTitleTextCss(theme, { level: 'h1' })

export const pageTitleRules = (theme) => {
  return css`
    ${pageTitleText(theme)}
    display: block;
    width: 100%;
    margin: 0 0 ${pageTitleGap(theme)};
    text-align: ${pageHeader(theme).align};
  `
}
