import React from 'react'
import dayjs from 'dayjs'
import { renderToString } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { StaticRouter } from 'react-router-dom'
import { buildAppTheme, themeFontLinks } from '~/utils/appTheme'
import { withVisitorZone } from '~/utils/businessTime'
import { ThemeProvider } from '~ui/contexts/ThemeContext'
import { ApiContext } from '~components/contexts/ApiContext'
import { LanguageContext } from '~components/contexts/LanguageContext'
import { ConfigContext } from '~components/contexts/ConfigContext'
import { SessionContext } from '~components/contexts/SessionContext'
import { SiteContext } from '~components/contexts/SiteContext'
import { OrderContext } from '~components/contexts/OrderContext'
import { UtilsProviders } from '~components/contexts/UtilsContext'
import { LandingPage } from '../index'
import { seedLanding } from '../useFranchiseStores'
import { resetStoreLandingCache } from '../useStoreLanding'

/**
 * Server render of the marketing home page (`/` of a full website), for the
 * Worker (implementation notes, docs/FULL_WEBSITE.md "render-and-swap"): the real
 * `LandingPage`, as the client's first render paints it, to a string. It is
 * bundled for workerd by vite.ssr.config.js into worker/generated/landing-ssr.mjs
 * and called from worker/landingSsr.js. Nothing hydrates: the client renders
 * its own copy and swaps this one out (ssrSwap.js).
 *
 * What the client reads from the network or the visitor, the server cannot:
 * - the store's data comes in `landing` (what worker/landingData.js reads) and is
 *   seeded into useStoreLanding's cache (a franchise's stores into useFranchiseStores'); without it the sections paint their
 *   loading state, as the client's first render does;
 * - the marketplace's sections depend on the visitor's location: they are not
 *   asked here and paint their skeletons (no effect runs on the server);
 * - there is no session, order or site state: the visitor is a guest. The prices and numbers
 *   are the real UtilsProviders' (parsePrice) over the project's `configs`.
 */

// A phone's width for the render (below MOBILE_WEB_MAX_WIDTH, src/utils/themeBreakpoint.mjs), and a desktop's.
const MOBILE_WIDTH = 390
const DESKTOP_WIDTH = 1440

/**
 * Runs `fn` with the window the client's first render would have (the server has none): useThemePlatform
 * reads `window.innerWidth`, HomeHero `window.localStorage`, and siteBranding the host
 * (`window.location.hostname`: the logo and favicon depend on whether it is an Ordering host). A window that
 * already exists (tests, jsdom) only has its width lent, and only for a phone.
 */
const withWindow = ({ mobile, hostname }, fn) => {
  if (typeof window !== 'undefined') {
    if (!mobile) return fn()
    const width = window.innerWidth
    window.innerWidth = MOBILE_WIDTH
    try { return fn() } finally { window.innerWidth = width }
  }
  const origin = `https://${hostname}`
  globalThis.window = {
    innerWidth: mobile ? MOBILE_WIDTH : DESKTOP_WIDTH,
    localStorage: { getItem: () => null },
    location: { hostname, host: hostname, origin, pathname: '/', href: `${origin}/`, search: '' }
  }
  try { return fn() } finally { delete globalThis.window }
}

// The client sets dayjs's global locale once its language loads (UtilsProvider's effect: its AM/PM are the
// translations'); the server's render would print the default 'am'/'pm'. Same meridiem, restored after.
const withMeridiem = (t, fn) => {
  const previous = dayjs.locale()
  dayjs.locale('auto', { ...dayjs.Ls[previous], name: 'auto', meridiem: (hour) => (hour >= 12 ? t('PM', 'PM') : t('AM', 'AM')) })
  try { return fn() } finally { dayjs.locale(previous) }
}

// What the client's `t` does (LanguageProvider): the app's prefix first, then the bare key, then the fallback.
const translator = (dictionary, appInternalName) => (key, fallback = null) => {
  let bare = key
  if (appInternalName) {
    if (typeof key !== 'string') return fallback ?? key
    const prefix = `${appInternalName.toUpperCase()}_`
    if (key.startsWith(prefix)) bare = key.substring(prefix.length)
    else key = `${prefix}${key}`
  }
  return dictionary?.[key] ?? dictionary?.[bare] ?? fallback ?? key
}

// A sheet's tags minus what the client's styled-components would take as its own: it adopts (and
// removes) every <style data-styled> in the document when it loads, which would eat this sheet before
// the swap. Plain CSS, in a tag the markup names (worker/landingSsr.js).
const plainCss = (tags) => tags
  .replace(/^<style[^>]*>|<\/style>$/g, '')
  .replace(/data-styled\.g\d+\[id="[^"]*"\]\{content:"[^"]*"\}/g, '')
  .replace(/\/\*!sc\*\/\n?/g, '')

/**
 * @param {object} args
 * @param {object} args.envelope the site's theme envelope (first_load `theme`)
 * @param {object} [args.landing] `{ business, featured, services, reviews }` of the store (see useStoreLanding), plus `franchiseStores` (see useFranchiseStores) for a franchise; null paints loading states
 * @param {{ root: string, appId?: string, appInternalName?: string }} args.api the API's ordering (as useStoreLanding reads it)
 * @param {string|number} args.store the store the Worker read (slug or id); the theme's own name for it wins, as the sections ask for it
 * @param {object} [args.dictionary] the translations (`result` of the boot `translations` payload, window.__EDGE_XHR__)
 * @param {object} [args.configs] the project's configs by key (first_load `configs`), for the currency and number format
 * @param {boolean} [args.mobile] the visitor's phone: the theme's phone values and sections
 * @param {string} [args.language] the language code
 * @param {string} [args.hostname] the request's host (what the client reads from `window.location`)
 * @param {string} [args.visitorZone] the visitor's IANA zone (Cloudflare's `request.cf.timezone`); without it, the store's
 * @returns {{ html: string, css: string, fonts: {id: string, name: string, href: string}[] }} `fonts`: the theme's font links (themeFontLinks)
 */
export const renderLanding = ({ envelope, landing, api, store, dictionary = {}, configs = {}, mobile = false, language = 'en', hostname = '', visitorZone }) => {
  // The cache is module state that outlives a request: each render starts from nothing and leaves nothing.
  resetStoreLandingCache()
  const sheet = new ServerStyleSheet()
  try {
    const theme = buildAppTheme(undefined, envelope)
    // the sections ask for the store as the theme names it (the client's key); `store` is what the Worker read it by
    if (landing) seedLanding(api.root, theme, landing, store)
    const t = translator(dictionary, api.appInternalName)
    const render = () => renderToString(
      sheet.collectStyles(
        <ApiContext.Provider value={[api, {}]}>
          <LanguageContext.Provider value={[{ loading: false, dictionary, language: { code: language, rtl: false } }, t]}>
            <ConfigContext.Provider value={[{ loading: false, configs }, {}]}>
              <SessionContext.Provider value={[{ auth: false, loading: false }, {}]}>
                <SiteContext.Provider value={[{ site: {} }, {}]}>
                  <OrderContext.Provider value={[{ options: {}, order: {} }, {}]}>
                    <UtilsProviders>
                      <ThemeProvider theme={theme}>
                        <StaticRouter location='/' context={{}}>
                          <LandingPage />
                        </StaticRouter>
                      </ThemeProvider>
                    </UtilsProviders>
                  </OrderContext.Provider>
                </SiteContext.Provider>
              </SessionContext.Provider>
            </ConfigContext.Provider>
          </LanguageContext.Provider>
        </ApiContext.Provider>
      )
    )
    // the visitor's zone, else the store's own (a visitor there; a franchise whose main store could not be read, its first store's): either way the zone label of the hours is the client's
    const html = withWindow({ mobile, hostname }, () => withMeridiem(t, () => withVisitorZone(visitorZone || landing?.business?.timezone || landing?.franchiseStores?.[0]?.timezone, render)))
    return { html, css: plainCss(sheet.getStyleTags()), fonts: themeFontLinks(theme) }
  } finally {
    sheet.seal()
    resetStoreLandingCache()
  }
}
