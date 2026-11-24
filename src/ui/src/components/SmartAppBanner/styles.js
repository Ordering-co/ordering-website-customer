import { createGlobalStyle } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeFontFamily, themeIconSize, themeRadius, themeShadow, themeSize, themeSpace, themeText } from '~/utils/themeTokens'
import { buttonSkinCss } from '~ui/src/design-system/lib/buttonSkin'

// The banner of the smart-app-banner library: a node it appends to the body
// (outside React) and the class it puts on the root while it shows; the
// rules below outrank the `.smartbanner` rules of index.html.
const SHOWN = 'html.smartbanner-show'
const BANNER = `${SHOWN} .smartbanner`

/**
 * The smart app banner drawn from the theme, the same on every
 * platform (none of the library's iOS / Android / Windows skins): a bar of the
 * surface with the text color, the body font and the theme's small shadow;
 * the app icon of size.xl rounded with radius.md; its name in the label
 * style and its description in the caption style, muted; the close as a ghost
 * icon button and "View" as a primary solid button, both sm. Its height is
 * the icon plus space.md above and below (80px with the default tokens, as
 * today), the page's sides.
 * Its selectors outrank index.html's (the root's class first).
 */
export const smartBannerRules = (theme) => {
  const icon = themeSize(theme, 'xl')
  const space = themeSpace(theme, 'md')
  // (px: the icon and the md space above and below, the theme's numbers)
  const { size, space: spaces } = theme.values.tokens
  const height = size.xl + spaces.md * 2
  return `
    ${SHOWN} {
      margin-top: ${height}px;
    }
    ${BANNER} {
      height: ${height}px;
      line-height: normal;
      background: ${themeColor(theme, 'surface')};
      background-image: none;
      color: ${themeColor(theme, 'text')};
      font-family: ${themeFontFamily(theme, 'body')};
      box-shadow: ${themeShadow(theme, 'sm')};
      -webkit-font-smoothing: auto;
    }
    ${BANNER} .smartbanner-container {
      display: flex;
      align-items: center;
      gap: ${space};
      box-sizing: border-box;
      height: 100%;
      padding: 0 ${theme.css.tokens.layout.page_gutter};
    }
    ${BANNER} .smartbanner-close {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      text-decoration: none;
      text-shadow: none;
      font-family: inherit;
      line-height: 1;
      background-image: none;
      box-shadow: none;
      ${buttonSkinCss(theme, { color: 'neutral', appearance: 'ghost', size: 'sm', shape: 'icon' })}
      /* the × is a glyph: of the icon's size, not of the button's text */
      font-size: ${themeIconSize(theme, 'md')};
    }
    ${BANNER} .smartbanner-icon {
      flex-shrink: 0;
      width: ${icon};
      height: ${icon};
      margin: 0;
      border-radius: ${themeRadius(theme, 'md')};
      background-color: transparent;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      box-shadow: none;
    }
    ${BANNER} .smartbanner-info {
      flex: 1 1 auto;
      min-width: 0;
      width: auto;
      color: ${themeColor(theme, 'text_muted')};
      text-shadow: none;
      ${themeText(theme, 'caption')}
    }
    ${BANNER} .smartbanner-info > div {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    ${BANNER} .smartbanner-title {
      color: ${themeColor(theme, 'text')};
      ${themeText(theme, 'label')}
    }
    ${BANNER} .smartbanner-button {
      position: static;
      flex-shrink: 0;
      min-width: 0;
      margin: 0;
      text-shadow: none;
      text-transform: none;
      background-image: none;
      box-shadow: none;
      ${buttonSkinCss(theme, { color: 'primary', appearance: 'solid', size: 'sm' })}
    }
    ${BANNER} .smartbanner-button-text {
      display: inline;
      padding: 0;
      background: none;
      box-shadow: none;
      text-shadow: none;
      text-transform: none;
    }
  `
}

export const SmartBannerTheme = createGlobalStyle`
  ${({ theme }) => smartBannerRules(theme)}
`
