import { THEME_DEFAULTS } from '~/utils/appTheme'

/**
 * What the API sends for a `complete: true` theme that sets nothing: the
 * defaults of product.schema.json (THEME_DEFAULTS: the theme engine's runtime
 * over src/theme.compiled.json). A fresh copy each time, so a test can
 * change it.
 */
export const buildCompleteValues = () => JSON.parse(JSON.stringify(THEME_DEFAULTS))

export const envelope = (values, { complete = true } = {}) => ({
  version: 2,
  complete,
  product_type: complete ? 'marketplace_website' : null,
  schema_version: '26.0',
  preset: complete ? { id: 3, version: 2 } : null,
  site_theme_id: 41,
  updated_at: '2026-10-09 10:00:00',
  values
})

/**
 * The local images a test passes to buildAppTheme (`{ images }` by theme
 * image key), over the bundle's.
 */
export const buildLocalTheme = () => ({
  images: {
    home_hero: '/home-hero-wide.webp',
    'signup.business_background': '/business-signup-background.jpg',
    'signup.driver_background': '/driver-signup-background.jpg',
    'placeholder.product': '/product.png',
    'placeholder.business_logo': '/store.png',
    'order_types.delivery': '/delivery.png'
  }
})
