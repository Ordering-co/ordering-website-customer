import { LANDING_SSR_ID, LANDING_SSR_STYLE_ID } from '../src/pages/Landing/ssrSwap.js'
import { loadLandingSsr } from './landingSsrBundle.js'
import { buildApiBase, escapeJsonForScript, getThemeSite, pickNonEmptyString } from './seo.js'

/**
 * The landing's server render in the Worker (implementation notes, docs/FULL_WEBSITE.md
 * "render-and-swap"). The page's own components, bundled by vite.ssr.config.js
 * into ./generated/landing-ssr.mjs (`pnpm build`), paint `/`; the client
 * swaps that markup out once its own render is up (src/pages/Landing/ssrSwap.js).
 *
 * What the Worker puts in the page:
 * - `landingSsrMarkup(...)` BEFORE `#root`: the style (the server's CSS and the
 *   rule that hides `#root` while the markup exists) and the markup itself;
 * - `<script>${LANDING_SSR_GUARD}</script>` after it.
 * `landingSsrInjection` builds the whole piece for a request: the markup, the store's data for the
 * client (`window.__LANDING__`, which the page seeds its cache with) and the guard.
 * Without JS the style leaves the markup visible and the empty `#root` hidden.
 * With JS there is never a second page nor a blank one: the markup stays until
 * the app swaps it or the guard drops it.
 */

const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// the longest the markup waits for the app to swap it, in ms
export const LANDING_SSR_MAX_WAIT_MS = 10000

/**
 * What goes before `#root`: the theme's font links (`fonts`, themeFontLinks: the same id and href App.js gives
 * its own, so the page does not paint in the fallback font and shift; they stay after the swap), the style
 * (hides `#root`, then the server's CSS) and the markup.
 */
export const landingSsrMarkup = ({ html, css, fonts = [] }) => {
  // the CSS lives in a raw-text element: nothing in it may close the tag
  const safeCss = String(css || '').replace(/<\/style/gi, '<\\/style')
  // `data-font-name`: App.js compares the link's `name` property (which markup cannot set; the guard does)
  const links = fonts.map(({ id, name, href }) => `<link id="${escapeHtml(id)}" rel="stylesheet" href="${escapeHtml(href)}" data-font-name="${escapeHtml(name)}">`).join('')
  return `${links}<style id="${LANDING_SSR_STYLE_ID}">#root{display:none}${safeCss}</style><div id="${LANDING_SSR_ID}">${html}</div>`
}

/**
 * Inline script (its source, without the tag): gives the font links the `name` App.js compares (so it keeps
 * them, not a second copy) and, as App.js would, puts the body's family on <body> (App.js skips both when the
 * link is already there), then drops the markup and its style, which shows `#root`, when the app left `/`
 * before mounting the landing (kiosk, a login in the query, verification: App redirects), or, after
 * LANDING_SSR_MAX_WAIT_MS, when `#root` already has the app's own page (an empty `#root` keeps the markup:
 * never a blank page). It stops when the markup is gone.
 */
export const LANDING_SSR_GUARD = `(function(){var s=Date.now(),i,f=document.querySelectorAll('link[data-font-name]');for(var k=0,m;k<f.length;k++){m=f[k].getAttribute('data-font-name');f[k].name=m;if(f[k].id==='body-font-styles')document.body.style.fontFamily=JSON.stringify(m)+', sans-serif'}function c(){var n=document.getElementById('${LANDING_SSR_ID}');if(!n){clearInterval(i);return}var r=document.getElementById('root');if(location.pathname!=='/'||(Date.now()-s>=${LANDING_SSR_MAX_WAIT_MS}&&r&&r.firstChild)){clearInterval(i);n.remove();var y=document.getElementById('${LANDING_SSR_STYLE_ID}');if(y)y.remove()}}c();i=setInterval(c,250)})()`

/**
 * The markup to put before `#root` for these `renderLanding` arguments (see
 * src/pages/Landing/ssr/render.jsx), or null on any error: the page then goes out as
 * before, without the server's paint (fail-open). The bundle is imported on the call,
 * so the routes that never paint the landing do not evaluate it.
 */
export const renderLandingHtml = async (args) => {
  try {
    const { renderLanding } = await loadLandingSsr()
    return landingSsrMarkup(renderLanding(args))
  } catch (_) {
    return null
  }
}

/** Whether the request is a phone's: the client hint when it is there, else the user agent. */
export const isMobileRequest = (request) => {
  const hint = request.headers.get('sec-ch-ua-mobile')
  if (hint) return hint === '?1'
  return /Mobi|Android|iPhone|iPod/i.test(request.headers.get('user-agent') || '')
}

/**
 * What goes before `#root` on `/` of a Full Website, as a string, or null when this page is not painted
 * on the server (no store data, a franchise without stores or with a list the Worker could not read whole) or the render failed: the page then ships
 * as it does without it. `landingData`: fetchLandingData's answer;
 * `config`: the request's config with the site's app id; `firstLoad`: first_load's result;
 * `bootI18n`: fetchBootI18n's.
 */
export const landingSsrInjection = async ({ landingData, theme, site, config, firstLoad, bootI18n, request }) => {
  if (!landingData) return null
  try {
    return await inject({ landingData, theme, site, config, firstLoad, bootI18n, request })
  } catch (_) {
    return null
  }
}

// The fields useFranchiseStores asks for (its STORE_PARAMS; a test keeps them equal): the Worker's list has
// more (header, phone...) that the cards never read and the page would carry for nothing.
export const FRANCHISE_STORE_FIELDS = ['id', 'name', 'slug', 'address', 'location', 'schedule', 'timezone', 'logo', 'open']
const pickStore = (store) => Object.fromEntries(FRANCHISE_STORE_FIELDS.filter((field) => field in store).map((field) => [field, store[field]]))

// the stores as the client's fetchStores leaves them: objects only, each id once (the first wins)
const pickStores = (list) => list
  .filter((store) => store && typeof store === 'object')
  .map(pickStore)
  .filter((store, index, all) => all.findIndex((seen) => seen.id === store.id) === index)

// the visitor's zone for the hours (Cloudflare's `request.cf.timezone`), only when it is a zone Intl knows
const visitorZoneOf = (request) => {
  const zone = request.cf?.timezone
  if (typeof zone !== 'string') return undefined
  try { return Intl.DateTimeFormat('en', { timeZone: zone }) && zone } catch (_) { return undefined }
}

const inject = async ({ landingData, theme, site, config, firstLoad, bootI18n, request }) => {
  const { mode, business, featured, services, reviews, franchiseBusinesses, franchiseTruncated } = landingData
  // only what the sections show (the Worker's reads are already the public ones: reviewers' names are initials)
  let landing = null
  if (mode === 'single_store') {
    if (!business) return null
    landing = { business, featured, services, reviews }
  } else if (mode === 'franchise') {
    // a list the Worker stopped reading (its page cap) may be cut: the client's refresh would change the cards after the swap
    if (!Array.isArray(franchiseBusinesses) || !franchiseBusinesses.length || franchiseTruncated) return null
    const franchiseStores = pickStores(franchiseBusinesses)
    if (!franchiseStores.length) return null
    landing = { business, featured, services, reviews, franchiseStores }
  } else if (mode !== 'marketplace') return null
  const markup = await renderLandingHtml({
    envelope: theme,
    landing,
    api: { root: buildApiBase(config), appId: config.app_id, appInternalName: config.app_internal_name },
    store: pickNonEmptyString(getThemeSite(theme)?.business_slug) || pickNonEmptyString(site?.business?.slug) || business?.slug || null,
    dictionary: bootI18n?.translations?.result || {},
    configs: { ...firstLoad?.configs, ...firstLoad?.features },
    mobile: isMobileRequest(request),
    language: config.api?.language ?? 'en',
    hostname: new URL(request.url).hostname,
    visitorZone: visitorZoneOf(request)
  })
  if (!markup) return null
  const seed = landing ? `<script>window.__LANDING__ = ${escapeJsonForScript(landing)};</script>` : ''
  return `${markup}${seed}<script>${LANDING_SSR_GUARD}</script>`
}
