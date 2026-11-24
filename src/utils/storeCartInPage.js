// Where the store page keeps the cart in sight. In the direct menu (design B) the cart is always on
// the page, so adding a product does not open the cart drawer: `aside` (the panel beside the menu) or `bar` (the
// "View cart" bar). `header`: the direct menu without the cart column on the desktop: the cart is the header's drawer,
// which an add does not open either (the icon's count answers). `null`: no cart on the page (designs A and C, kiosk,
// the theme hides the bar), and the header's drawer opens as ever. The store page (BusinessProductsListing) publishes it; the header, in another tree, reads it.
let mode = null

export const setStoreCartInPage = (next) => {
  mode = next || null
}

export const storeCartInPage = () => mode

export const STORE_CART_ASIDE_SELECTOR = '[data-doc-section="business-cart-aside"]'

/**
 * Takes the person to the cart panel beside the menu: scrolls it into view and gives it the focus. False when the
 * panel is not on the page, so the caller falls back to its own behavior.
 */
export const focusStoreCartAside = (behavior = 'auto') => {
  const aside = typeof document !== 'undefined' ? document.querySelector(STORE_CART_ASIDE_SELECTOR) : null
  if (!aside) return false
  aside.scrollIntoView?.({ block: 'nearest', behavior })
  aside.focus({ preventScroll: true })
  return true
}

/**
 * The code of the cart line an add or an update just touched, or null. An update names it (`product.code`); an add
 * does not (the server gives the code), so it is the line whose code was not in the cart before, else the last line
 * of the same product (the server merged it into one that was there).
 */
export const touchedCartLineCode = (product, cart, previousCodes = []) => {
  const lines = cart?.products || []
  if (product?.code && lines.some(line => line.code === product.code)) return product.code
  const added = lines.filter(line => !previousCodes.includes(line.code))
  if (added.length) return added[added.length - 1].code
  // shortcut: with two lines of one product (different options) a merged add may light the other one; compare options if it matters
  const same = lines.filter(line => line.id === product?.id)
  return same.length ? same[same.length - 1].code : null
}
