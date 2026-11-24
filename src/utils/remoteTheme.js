import { useEffect, useState } from 'react'
import { isThemeEnvelope } from './appTheme'
import { product_type as productType, version as schemaVersion } from '../theme.compiled.json'

/**
 * The site's version 2 theme. The web reads only version 2.
 *
 * In production the worker asks first_load for the v2 theme and injects it in
 * `window.__FIRST_LOAD__`, and OrderingThemeContext (submodule) holds it.
 * Without the worker (Vite dev, or an edge failure) the context falls back to
 * `GET {root}/theme` without a version and receives a v1 tree, which the web
 * ignores; the provider has no option to ask for v2, so this asks for it.
 */

export const THEME_VERSION = 2
// The product and the schema version this build is made for
// (product.schema.json `product_type` and `version`, through
// src/theme.compiled.json): api-core cuts a theme of
// a newer schema down to it
export const THEME_PRODUCT_TYPE = productType
export const THEME_SCHEMA_VERSION = schemaVersion

export const buildSiteThemeUrl = (root) =>
  `${String(root || '').replace(/\/$/, '')}/theme?theme_version=${THEME_VERSION}&product_type=${THEME_PRODUCT_TYPE}&theme_schema_version=${THEME_SCHEMA_VERSION}`

/**
 * The v2 envelope of a `GET theme` response, or null. Accepts the envelope as
 * `result` or, like the v1 response, under `result.values`.
 */
export const extractSiteTheme = (json) => {
  if (!json || json.error) return null
  const result = json.result
  if (isThemeEnvelope(result)) return result
  if (isThemeEnvelope(result?.values)) return result.values
  return null
}

/**
 * The v2 envelope, or null on any failure (network, non-2xx, a body that is
 * not JSON): the app then paints the defaults. Never rejects.
 */
export const fetchSiteTheme = async ({ root, appId, fetchImpl = fetch }) => {
  try {
    const response = await fetchImpl(buildSiteThemeUrl(root), {
      method: 'GET',
      headers: { 'X-App-X': appId }
    })
    if (!response?.ok) return null
    return extractSiteTheme(await response.json())
  } catch (_) {
    return null
  }
}

/**
 * Remote theme for buildAppTheme: the context's when it is a v2 envelope;
 * otherwise (a v1 tree, nothing) the v2 envelope fetched here, or null (the
 * app paints the defaults). `loading` stays true until that request settles,
 * so the app does not paint the defaults first.
 */
export const useSiteThemeFallback = ({ root, appId, contextTheme, contextLoading, project }) => {
  const contextHasTheme = isThemeEnvelope(contextTheme)
  const shouldFetch = !!root && !!project && !contextLoading && !contextHasTheme
  const [state, setState] = useState({ key: null, theme: null, settled: false })
  const key = shouldFetch ? `${root}|${project}` : null

  useEffect(() => {
    if (!key || state.key === key) return
    let cancelled = false
    setState({ key, theme: null, settled: false })
    fetchSiteTheme({ root, appId })
      .catch(() => null)
      .then((theme) => {
        if (!cancelled) setState({ key, theme, settled: true })
      })
    return () => { cancelled = true }
  }, [key])

  if (!shouldFetch) return { theme: contextHasTheme ? contextTheme : null, loading: false }
  const settled = state.key === key && state.settled
  return { theme: settled ? state.theme : null, loading: !settled }
}
