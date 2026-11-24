// DEV ONLY, never in the production build: vite.config.js adds it to the dev
// server's index.html when it starts with DS_REVIEW=1 (`apply: 'serve'`).
// It lets someone review the app on the dev server against the real API
// without being able to change anything there, with a chosen test theme:
//  a) every write (a method other than GET, HEAD or OPTIONS) to the API, or to a
//     third-party telemetry host, is answered with a simulated error and a
//     console.warn, in fetch and in XMLHttpRequest;
//  b) `?ds_theme=defaults|grill|cafe|grocery|typefaces` serves that fixture (preview/themes.js,
//     THEME_ENVELOPES) as the store's theme; it is kept in sessionStorage so it
//     survives navigating inside the SPA, and a small fixed label changes it
//     (`store` brings the store's own).
// c) the dev server's own project has no store to review, so the one named by
//    `VITE_DS_REVIEW_PROJECT` (`.env.example`, set in `.env.local`, never in the
//    code) is put in `window.__CONFIG__`, the runtime override src/config.js
//    already reads, unless a `__CONFIG__` is already set: a JSON such as
//    {"project":"…","app_id":"…","site_id":1} (the api is the default one unless
//    it names `api`). Without it the app runs on the repo's own project, and the
//    console and the label say so. Reads are real: orders and payments are never
//    made (a).
// It is plain DOM with its own inline styles: not app UI, so the theme rules
// (THEMING.md §7) do not apply to it.
// (the JSON, not src/config.js: that one reads `__CONFIG__` when it loads, which
// is set just below)
import baseSettings from '~/config.json'

const NO_STORE = 'VITE_DS_REVIEW_PROJECT is not set: the app runs on the repo\'s own project, not on a store to review (see .env.example)'
const storeFromEnv = () => {
  const raw = import.meta.env.VITE_DS_REVIEW_PROJECT
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch { /* falls through to the warning */ }
  console.warn('[DS_REVIEW] VITE_DS_REVIEW_PROJECT is not a JSON object: ignored')
  return {}
}
const reviewStore = storeFromEnv()
const hasStore = Object.keys(reviewStore).length > 0
if (!hasStore) console.warn(`[DS_REVIEW] ${NO_STORE}`)
window.__CONFIG__ = { ...reviewStore, ...(window.__CONFIG__ || {}) }

const READ_METHODS = ['GET', 'HEAD', 'OPTIONS']
const TELEMETRY = [/(^|\.)sentry\.io$/, /(^|\.)segment\.(io|com)$/]
const KEY = 'ds_review_theme'
const CHOICES = ['defaults', 'grill', 'cafe', 'grocery', 'typefaces']

const apiHosts = [baseSettings.api.url, window.__CONFIG__.api?.url].map((url) => { try { return new URL(url).hostname } catch { return null } })
const isBlocked = (method, rawUrl) => {
  if (READ_METHODS.includes(String(method || 'GET').toUpperCase())) return false
  try {
    const { hostname } = new URL(rawUrl, window.location.href)
    return apiHosts.includes(hostname) || hostname === 'ordering.co' || hostname.endsWith('.ordering.co') || TELEMETRY.some((host) => host.test(hostname))
  } catch {
    return false
  }
}
const warn = (method, url) => console.warn(`[DS_REVIEW] blocked ${method} ${url}: writes to the API are off on this server`)
const BLOCKED_BODY = JSON.stringify({ error: true, result: ['Blocked: this dev server (DS_REVIEW) does not write to the API'] })

const store = {
  get () { try { return window.sessionStorage.getItem(KEY) } catch { return null } },
  set (value) { try { window.sessionStorage.setItem(KEY, value) } catch { /* private mode: the URL still decides */ } }
}

// the URL's choice wins and is kept; `store` is the store's own theme
const param = new URLSearchParams(window.location.search).get('ds_theme')
if (param) store.set(param)
const chosen = store.get()
const themeId = CHOICES.includes(chosen) ? chosen : null

const themed = async (json) => {
  if (!themeId || !json?.result) return json
  const { THEME_ENVELOPES } = await import('./themes')
  // first_load carries the theme inside its result, `GET theme` is the envelope
  if (json.result.theme) json.result.theme = THEME_ENVELOPES[themeId]
  else if (json.result.version === 2) json.result = THEME_ENVELOPES[themeId]
  return json
}
const isThemeRequest = (url, method) => String(method || 'GET').toUpperCase() === 'GET' && /\/(frontends\/first_load|theme)(\?|$)/.test(String(url))

const nativeFetch = window.fetch.bind(window)
window.fetch = async (resource, options) => {
  const url = typeof resource === 'string' ? resource : resource?.url || String(resource)
  const method = options?.method || resource?.method || 'GET'
  if (isBlocked(method, url)) {
    warn(method, url)
    return new Response(BLOCKED_BODY, { status: 403, headers: { 'content-type': 'application/json' } })
  }
  const response = await nativeFetch(resource, options)
  if (!themeId || !isThemeRequest(url, method) || !response.ok) return response
  try {
    const json = await themed(await response.clone().json())
    return new Response(JSON.stringify(json), { status: response.status, statusText: response.statusText, headers: { 'content-type': 'application/json' } })
  } catch {
    return response
  }
}

const nativeOpen = window.XMLHttpRequest.prototype.open
const nativeSend = window.XMLHttpRequest.prototype.send
window.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  this._dsMethod = method
  this._dsUrl = String(url)
  return nativeOpen.call(this, method, url, ...rest)
}
window.XMLHttpRequest.prototype.send = function (body) {
  if (!isBlocked(this._dsMethod, this._dsUrl)) return nativeSend.call(this, body)
  warn(this._dsMethod, this._dsUrl)
  Object.entries({ status: 403, statusText: 'Blocked', readyState: 4, response: BLOCKED_BODY, responseText: BLOCKED_BODY }).forEach(([name, value]) => {
    Object.defineProperty(this, name, { value, configurable: true })
  })
  setTimeout(() => {
    this.onreadystatechange?.(new Event('readystatechange'))
    this.onload?.(new ProgressEvent('load'))
    this.onloadend?.(new ProgressEvent('loadend'))
    this.dispatchEvent(new ProgressEvent('load'))
  })
}

const choose = (id) => {
  const next = new URL(window.location.href)
  next.searchParams.set('ds_theme', id === 'store' ? 'store' : id)
  window.location.assign(next)
}

const mountLabel = () => {
  const label = document.createElement('div')
  label.setAttribute('data-ds-review', '')
  label.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483647;padding:4px 8px;border-radius:6px;background:#111;color:#fff;font:12px/1.4 system-ui,sans-serif;opacity:.85'
  if (!hasStore) {
    label.title = NO_STORE
    label.append('Sin VITE_DS_REVIEW_PROJECT · ')
  }
  label.append(`Tema de prueba: ${themeId || 'tienda'} · cambiar: `)
  ;[...CHOICES, 'store'].forEach((id, index) => {
    if (index) label.append(' | ')
    const link = document.createElement('a')
    link.href = `?ds_theme=${id}`
    link.textContent = id === 'store' ? 'tienda' : id
    link.style.cssText = 'color:#8cf;text-decoration:underline'
    link.addEventListener('click', (event) => { event.preventDefault(); choose(id) })
    label.append(link)
  })
  document.body.append(label)
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountLabel)
else mountLabel()
