/**
 * The client's half of the landing's server render (docs/FULL_WEBSITE.md,
 * "render-and-swap"). On `/` of a full website the Worker paints the page
 * before the app boots: the markup in `#landing-ssr`, just before `#root`, its
 * CSS plus the rule that hides `#root` while it exists in `#landing-ssr-style`
 * (worker/landingSsr.js), and the store's data in `window.__LANDING__`. Nothing
 * hydrates: the app renders its own copy and, in the same frame, takes the
 * server's out (LandingPage's layout effect).
 *
 * Plain DOM, no React: the Worker and the page both import it.
 */

export const LANDING_SSR_ID = 'landing-ssr'
export const LANDING_SSR_STYLE_ID = 'landing-ssr-style'

/** The data the Worker injected (`window.__LANDING__`), taken once: read and deleted. Null without it. */
export const takeLandingSeed = () => {
  if (typeof window === 'undefined') return null
  const seed = window.__LANDING__ || null
  delete window.__LANDING__
  return seed
}

/** Takes the server's markup and its style out (the page's own render is already there); harmless without them. */
export const removeLandingSsr = () => {
  if (typeof document === 'undefined') return
  document.getElementById(LANDING_SSR_ID)?.remove()
  document.getElementById(LANDING_SSR_STYLE_ID)?.remove()
}

/** Whether the query carries the Spoonity login (`integration_code=spoonity` with an `integration_token`). */
export const isSpoonityLoginQuery = (search) => {
  const query = new URLSearchParams(search || '')
  return query.get('integration_code') === 'spoonity' && !!query.get('integration_token')
}

/**
 * Whether `/` shows the marketing page, shared by the Worker (whether to paint it) and the app (which
 * screen `/` mounts): never on a kiosk (`use_kiosk`, which opens on its menu) nor with the Spoonity login.
 */
export const isLandingRequest = ({ kiosk, search }) => !kiosk && !isSpoonityLoginQuery(search)
