import styled, { css } from 'styled-components'
import { themePart, themeRadius, themeShadowDown, themeValue } from '~/utils/themeTokens'
import { getThemeCss } from '~/utils/themeCss'
import { themeVisible } from '~/utils/themeVisibility'

/**
 * The icon of the categories' menu (the first tab, it opens the categories'
 * popover): the one of `components.category_tabs.base.menu_icon` (bars: the
 * header's menu, bars_right: menuAltRight), null when
 * `visibility.business.categories.menu` hides the menu.
 */
export const categoriesMenuIconOf = (theme) => {
  if (!themeVisible(theme, 'business.categories.menu')) return null
  const icon = themeValue(theme, 'category_tabs', 'base.menu_icon')
  if (icon === 'bars_right') return { name: 'menuAltRight' }
  return { name: 'menuBars', strokeWidth: 2.4 }
}

/** Whether the bar has the "All" tab: always but with `visibility.business.categories.all` false. */
export const showAllCategory = (theme) => themeVisible(theme, 'business.categories.all')

// The bar's inner space at its sides (category_tabs.base.padding).
const barPadding = (theme) => {
  const value = getThemeCss(theme, 'category_tabs').base.padding
  return `padding-left: ${value}; padding-right: ${value};`
}

export const CategoriesContainer = styled.div`
  display: flex;
  padding: 0px 0px 0px 0px;
  border-radius: ${props => themeRadius(props.theme, 'xxl', 'category_tabs')};
  z-index: 1000;
  position: absolute;
  top: 0;
  text-align: center;
  width: ${props => props.w || '100%'};
  box-sizing: border-box;

  @media (min-width: 769px) {
    ${({ isProfessional }) => isProfessional && css`
      width: 100%;
    `}
  }
  @media (min-width: 992px) {
    ${(props) => props.w && css`
      width: ${props.w};
    `}
  }
  /* components.category_tabs is the bar (its background, border and
     shadow, its tabs inside);
     its tabs are the theme's tabs (components.tabs) */
  ${props => themePart(props.theme, 'category_tabs', { background: 'base.background', border: 'base.border', 'box-shadow': 'base.shadow' })}
  /* fixed on scroll it spans the whole width: its shadow falls down and it
     and its track have no sides and no rounding (edge to edge, square
     against the screen's edges and the bar above); top and bottom stay, its
     tabs' height counts them */
  ${props => props.$fullWidthSticky && css`
    &.sticky-prod-cat {
      /* its shadow while fixed (category_tabs.base.sticky_shadow), cast down */
      ${themeShadowDown(props.theme, 'category_tabs', 'base.sticky_shadow')}
      border-left: none;
      border-right: none;
      border-radius: 0;
      /* under a bar with a bottom border: that border is its top */
      &.categories-joined {
        border-top: none;
      }
    }
  `}
  /* Reserve room for the action hit areas inside the clipping scrollport. */
  @media (pointer: coarse) {
    /* TOUCH: 44px accessibility floor (not a theme value) */
    /* touch-target */ min-height: 44px;
    align-items: center;
  }
`

// The frame keeps its painted border. The scrollport extends into its border
// room on touch so its clip never takes that room from the buttons.
export const CategoriesScrollport = styled.div`
  position: relative;
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  box-sizing: border-box;
  overflow-x: auto;
  scrollbar-width: none;
  ${props => barPadding(props.theme)}

  @media (pointer: coarse) {
    --category-scroll-rim: ${({ theme }) => `${themeValue(theme, 'category_tabs', 'base.border')?.width ?? 0}px`};
    margin-block: calc(-1 * var(--category-scroll-rim));
    padding-block: var(--category-scroll-rim);
    /* touch-target */ min-height: 44px;
    align-items: center;
  }
`
