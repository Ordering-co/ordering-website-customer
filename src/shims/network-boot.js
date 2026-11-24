/**
 * Boot-time network shims. Must be the FIRST import in src/index.js so they
 * are installed before any SDK/context code runs.
 *
 * The shared components submodule (off-limits for edits) blocks the first
 * render on network requests the Cloudflare worker can answer ahead of time:
 *
 * 1. Geo — Config loading awaits a third-party fetch(https://ipapi.co/json/)
 *    whose data is only a fallback for the default country code. The worker
 *    knows the visitor's country (request.cf.country) and injects it as
 *    window.__GEO__; the fetch shim answers that request locally.
 * 2. i18n — LanguageContext always fetches /translations (and, on first
 *    visit, the default /languages) via the SDK's XMLHttpRequest before the
 *    spinner can clear. The worker pre-fetches both (edge-cached) and injects
 *    them as window.__EDGE_XHR__; the XHR shim serves them instantly, once —
 *    later requests (e.g. switching language) go to the network as usual.
 * 3. Theme — without the worker's first_load (local dev, edge failure) the
 *    submodule asks `frontends/first_load` itself, without `theme_version`,
 *    and gets the v1 theme; the web then asks `theme?theme_version=2` apart
 *    (src/utils/remoteTheme.js). The fetch shim asks first_load for the v2
 *    theme, as the worker does, so it comes in the same request.
 *
 * 4. Private store — `?preview=<token>` is kept and taken off the
 *    URL, and every request to the API origin (XHR and fetch, never a third
 *    party) carries it as X-Preview-Token-X; a 403 STORE_PRIVATE answer from the
 *    API flags the store as private (src/utils/storePreview.js).
 *
 * The geo and XHR shims are fail-open: without the injected globals (local
 * dev, worker fetch failure) every request goes through unchanged.
 */
import { product_type as productType, version as schemaVersion } from '../theme.compiled.json'
import settings from '../config'
import { PREVIEW_HEADER, captureStorePreviewToken, detectStorePrivate, getStorePreviewToken, isApiUrl } from '../utils/storePreview'
const IPAPI_URL = 'https://ipapi.co/json/'

// The theme the web asks first_load for, as src/utils/remoteTheme.js asks
// `theme`: version 2, the product (the schema's; the API uses it only for a
// site without one whose theme is still v1) and the schema version this build
// is made for (api-core cuts a newer theme down to it).
const FIRST_LOAD_PARAMS = {
  theme_version: '2',
  product_type: productType,
  theme_schema_version: schemaVersion
}

/**
 * `…/frontends/first_load` with this build's `theme_version`, `product_type`
 * and `theme_schema_version`, whatever the caller put in them. Any other URL
 * (or one that does not parse) comes back as it is.
 */
export const withFirstLoadThemeVersion = (url) => {
  if (typeof url !== 'string' || !url.includes('/frontends/first_load')) return url
  try {
    const parsed = new URL(url)
    if (!parsed.pathname.endsWith('/frontends/first_load')) return url
    Object.entries(FIRST_LOAD_PARAMS).forEach(([key, value]) => parsed.searchParams.set(key, value))
    return parsed.toString()
  } catch {
    return url
  }
}

const buildGeoResponse = async (countryCode) => {
  const { CODES } = await import('~components/constants/code-numbers')
  const phoneCode = CODES.find((code) => code.countryCode === countryCode)?.phoneCode
  return new Response(
    JSON.stringify({
      country_code: countryCode,
      ...(phoneCode && { country_calling_code: `+${phoneCode}` })
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
}

const installFetchShim = () => {
  const nativeFetch = window.fetch.bind(window)
  window.fetch = async (resource, options) => {
    const countryCode = window.__GEO__?.country_code
    const url = typeof resource === 'string' ? resource : resource?.url
    if (countryCode && url === IPAPI_URL) {
      return buildGeoResponse(countryCode)
    }
    if (!isApiUrl(url || resource?.href, settings.api?.url)) return nativeFetch(withFirstLoadThemeVersion(resource), options)

    const token = getStorePreviewToken()
    let init = options
    if (token) {
      // init.headers replaces a Request's own, so start from them
      const headers = new Headers(options?.headers || resource?.headers)
      headers.set(PREVIEW_HEADER, token)
      init = { ...options, headers }
    }
    const response = await nativeFetch(withFirstLoadThemeVersion(resource), init)
    if (response.status === 403) response.clone().text().then((body) => detectStorePrivate(403, body), () => {})
    return response
  }
}

/**
 * Matches a GET request against the injected __EDGE_XHR__ payloads and takes
 * (one-shot) the matching one. URLs look like {api}/v400/{lang}/{project}/...
 * with the query unencoded by the SDK; matching is loose (endpoint + language
 * + project + distinguishing query marker) so it survives param reordering.
 */
const takeInjectedXhrPayload = (method, url) => {
  const store = window.__EDGE_XHR__
  if (!store || method?.toUpperCase() !== 'GET') return null
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const segments = parsed.pathname.split('/').filter(Boolean)
  const [, lang, project, endpoint] = segments
  if (segments.length !== 4 || lang !== store.language || project !== store.project) return null

  let search
  try {
    search = decodeURIComponent(parsed.search)
  } catch {
    search = parsed.search
  }
  if (endpoint === 'translations' && store.translations && search.includes('mode=dictionary')) {
    const payload = store.translations
    store.translations = null
    return payload
  }
  if (endpoint === 'languages' && store.languages_default && search.includes('"attribute":"default"')) {
    const payload = store.languages_default
    store.languages_default = null
    return payload
  }
  return null
}

const installXhrShim = () => {
  const XHR_RESPONSE_FIELDS = { status: 200, statusText: 'OK', readyState: 4 }

  window.XMLHttpRequest = class extends window.XMLHttpRequest {
    open (method, url, ...rest) {
      this._interceptMethod = method
      this._interceptUrl = url
      return super.open(method, url, ...rest)
    }

    send (body) {
      const payload = this._interceptUrl && takeInjectedXhrPayload(this._interceptMethod, this._interceptUrl)
      if (!payload) {
        if (isApiUrl(this._interceptUrl, settings.api?.url)) {
          const token = getStorePreviewToken()
          if (token) super.setRequestHeader(PREVIEW_HEADER, token)
          this.addEventListener('load', () => {
            try { detectStorePrivate(this.status, this.responseText) } catch {}
          })
        }
        return super.send(body)
      }

      const responseText = JSON.stringify(payload)
      Object.entries({ ...XHR_RESPONSE_FIELDS, response: responseText, responseText }).forEach(([key, value]) => {
        Object.defineProperty(this, key, { value, configurable: true })
      })
      queueMicrotask(() => {
        this.onreadystatechange?.(new Event('readystatechange'))
        this.onload?.(new ProgressEvent('load'))
        this.onloadend?.(new ProgressEvent('loadend'))
      })
    }
  }
}

captureStorePreviewToken()
installFetchShim()
installXhrShim()
