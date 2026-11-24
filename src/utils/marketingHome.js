/**
 * The site types whose marketing page (src/pages/Landing) paints its own
 * header, so the app's is left out of it. Same list as the modes of
 * MODE_SECTIONS whose map has a `Header`.
 */
export const LANDING_HEADER_MODES = ['single_store', 'franchise', 'marketplace']

/**
 * The site types whose marketing page paints its own footer, which takes the
 * place of the app's (and carries the site's footer content). Same list as
 * the modes of MODE_SECTIONS whose map has a `Footer`.
 */
export const LANDING_FOOTER_MODES = ['single_store', 'franchise']

/**
 * Whether the page at `pathname` is the marketing home with its own header
 * (docs/FULL_WEBSITE.md): '/' of a full website. The kiosk and the Spoonity
 * login keep the menu home at '/', which has the app's header.
 * @param {object} state `{ fullWebsite, mode, isKioskApp, spoonity }`
 */
export const isMarketingHome = (pathname, { fullWebsite, mode, isKioskApp, spoonity }) =>
  !!fullWebsite && pathname === '/' && !isKioskApp && !spoonity && LANDING_HEADER_MODES.includes(mode)
