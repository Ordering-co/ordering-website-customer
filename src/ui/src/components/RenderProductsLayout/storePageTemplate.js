import { themeValue } from '~/utils/themeTokens'
import { themeVisible } from '~/utils/themeVisibility'

// `menu_index`: the direct menu (a short cover, the search and the categories always at hand, dishes in rows), the
// default. `classic`: the cover and the categories as tabs (a low cover, the store's data in one line, the search
// and the tabs in a fixed bar, dishes as cards in columns). `showcase`: the visual showcase (a large cover with
// the name on it and a grid of big photos). `menu_index_no_cart`: the direct menu without the cart column (the cart
// is the header's drawer on the desktop; the phone is the direct menu's).
export const STORE_TEMPLATE_CLASSIC = 'classic'
export const STORE_TEMPLATE_MENU_INDEX = 'menu_index'
export const STORE_TEMPLATE_MENU_INDEX_NO_CART = 'menu_index_no_cart'
export const STORE_TEMPLATE_SHOWCASE = 'showcase'

const TEMPLATES = [STORE_TEMPLATE_CLASSIC, STORE_TEMPLATE_MENU_INDEX, STORE_TEMPLATE_SHOWCASE, STORE_TEMPLATE_MENU_INDEX_NO_CART]

// From this width (px) the menu has the categories beside it (and the cart, in the direct menu); below it the
// phone's layout. TOKEN-GAP(implementation notes): the cut the repo already uses for the desktop columns, no token.
export const DESKTOP_MIN_WIDTH = 1000

// The store page's template, by `components.store_page.base.template`. A theme without it, or with a value this
// code does not know, is `menu_index`, the schema's default.
export const storePageTemplate = (theme) => {
  // Development only: `?store_template=<value>` forces a design to compare them without publishing a theme. The
  // condition is static, so the production build drops it.
  const forced = import.meta.env.DEV && typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('store_template')
    : null
  const template = TEMPLATES.includes(forced) ? forced : themeValue(theme, 'store_page', 'base.template')
  return TEMPLATES.includes(template) ? template : STORE_TEMPLATE_MENU_INDEX
}

/**
 * The design the store page paints with the new header and menu: `menu` (the direct menu, with or without the
 * cart column), `showcase` (the visual
 * showcase), `cover` (`classic`) or null: the kiosk keeps its own whatever the theme says. A store with
 * `front_layout` groceries is painted as `food` (the same design, whatever `use_parent_category` says): the field
 * is not rewritten, it is just not read here.
 */
export const storePageVariant = (theme, { useKioskApp } = {}) => {
  if (useKioskApp) return null
  const template = storePageTemplate(theme)
  if (template === STORE_TEMPLATE_MENU_INDEX || template === STORE_TEMPLATE_MENU_INDEX_NO_CART) return 'menu'
  return template === STORE_TEMPLATE_SHOWCASE ? 'showcase' : 'cover'
}

/**
 * Whether the direct menu has the store's cart in a column beside it on the desktop: every template but
 * `menu_index_no_cart`, whose cart is the header's drawer, and also that one when the theme hides the header's cart
 * (`visibility.header.cart`): the drawer would have no icon to open it. Only meaningful where the variant is `menu`.
 */
export const storeCartColumn = (theme) => storePageTemplate(theme) !== STORE_TEMPLATE_MENU_INDEX_NO_CART || !themeVisible(theme, 'header.cart')
