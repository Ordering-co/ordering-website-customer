import { transformedImageUrl } from '../src/utils/imageTransform.js'
import { parseInactiveProject } from './inactiveProject.js'
import { product_type as productType, version as schemaVersion } from '../src/theme.compiled.json'
import { APPLE_TOUCH_ICON_TRANSFORM, GENERIC_FAVICON_PATH, businessFaviconLinks, faviconLinks, iconMimeType, pngIconUrl } from '../src/utils/iconLinks.js'
import { resolveSeoDescription } from '../src/utils/seoDescription.js'

export { GENERIC_FAVICON_PATH, businessFaviconLinks }

const ORDERING_DOMAINS = ['tryordering.com', 'ordering.co', 'orderingplus.com']
export const ORDERING_FAVICON = '/favicon.png'

// The white-label placeholder paths this app used to serve. Never injected
// anymore (a white-label site without anything gets no icon links), but a
// theme that still has one stored keeps being read as unconfigured; not
// exported, nothing outside this recognition needs them.
const LEGACY_PLACEHOLDER_LOGO = '/default-logo.png'
const LEGACY_PLACEHOLDER_FAVICON = '/default-favicon.png'
const LEGACY_PLACEHOLDER_ASSETS = new Set([LEGACY_PLACEHOLDER_LOGO, LEGACY_PLACEHOLDER_FAVICON])

// The touch icons index.html shipped as static `<link>`s for every host
// (android/windows → the favicon PNG, four apple-touch-icon sizes for
// iPhone/iPad) before the worker resolved favicons per tenant. Ordering's
// own hosts still need exactly these: injected (defaultAssetPath-prefixed)
// only there, alongside the favicon / apple-touch-icon links below, so an
// Ordering host's markup stays what it was.
export const ORDERING_TOUCH_ICON_LINKS = [
  { rel: 'android-touch-icon', href: '/favicon.png' },
  { rel: 'windows-touch-icon', href: '/favicon.png' },
  { rel: 'apple-touch-icon', href: '/touch-icon-iphone.png' },
  { rel: 'apple-touch-icon', href: '/touch-icon-ipad.png', sizes: '152x152' },
  { rel: 'apple-touch-icon', href: '/touch-icon-iphone-retina.png', sizes: '180x180' },
  { rel: 'apple-touch-icon', href: '/touch-icon-ipad-retina.png', sizes: '167x167' }
]

export const isOrderingHost = (hostname) => {
  if (!hostname) return false
  return ORDERING_DOMAINS.some(d => hostname.includes(d))
}

const brandAssetPath = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    return raw.includes('://') ? new URL(raw).pathname : raw.split('?')[0]
  } catch (_) {
    return raw
  }
}

export const isConfiguredBrandAsset = (value) => {
  const path = brandAssetPath(value)
  return !!path && !LEGACY_PLACEHOLDER_ASSETS.has(path)
}

// A share-image candidate is absent when it is not a usable string: blank,
// the literal 'null'/'undefined' some integrations send, the legacy
// placeholder, or a scheme other than http(s)/relative (data:, javascript:…).
export const isAbsentImage = (value) => {
  if (typeof value !== 'string') return true
  const trimmed = value.trim()
  if (!trimmed) return true
  const lower = trimmed.toLowerCase()
  if (lower === 'null' || lower === 'undefined') return true
  if (!isConfiguredBrandAsset(trimmed)) return true
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed)
  if (scheme && !/^https?$/i.test(scheme[1])) return true
  return false
}

export const presentImage = (value) => (isAbsentImage(value) ? null : value.trim())

/** The bundled favicon path of the host: Ordering's; '' off it (white label, none). */
export const getFallbackFaviconPath = (hostname) =>
  isOrderingHost(hostname) ? ORDERING_FAVICON : ''

/**
 * The tenant's favicon: the theme's configured one, else its app icon, else
 * the site's logo (the API's `site.logo`), else Ordering's fallback on an
 * Ordering host; '' otherwise (white label, nothing configured: no favicon
 * link at all).
 */
export const resolveTenantFaviconUrl = (
  configuredFavicon,
  siteLogo,
  hostname,
  appIcon
) =>
  (isConfiguredBrandAsset(configuredFavicon) ? String(configuredFavicon).trim() : '') ||
  (isConfiguredBrandAsset(appIcon) ? String(appIcon).trim() : '') ||
  (isConfiguredBrandAsset(siteLogo) ? String(siteLogo).trim() : '') ||
  getFallbackFaviconPath(hostname)

export const deriveProjectFromHost = (hostname, baseConfig) => {
  if (!hostname || !baseConfig) return baseConfig?.project ?? null

  let candidate = hostname.split('.').slice(0, 1).join('')
  if (candidate.startsWith('v26-') && hostname.endsWith('orderingplus.com')) {
    candidate = candidate.replace('v26-', '')
  }

  const orderingHost = isOrderingHost(hostname)
  if (baseConfig.use_project_subdomain && orderingHost) return candidate
  if (baseConfig.use_project_domain && !orderingHost) return '_'
  return baseConfig.project ?? null
}

const RESERVED_SEGMENTS = new Set([
  'home',
  'wallets',
  'signup_business',
  'signup-driver',
  'password',
  'profile',
  'verify',
  'messages',
  'help',
  'search',
  'business_search',
  'promotions',
  'checkout',
  'multi-checkout',
  'multi-cart',
  'multi-orders',
  'orders',
  'pages',
  'favorite',
  'sessions',
  'store'
])

const buildBusinessSeoPath = (businessSlug, categoryParam, productParam) => {
  const biz = encodeURIComponent(businessSlug)
  if (categoryParam && productParam) {
    return `/seo/business/${biz}/category/${encodeURIComponent(categoryParam)}/product/${encodeURIComponent(productParam)}`
  }
  if (categoryParam) {
    return `/seo/business/${biz}/category/${encodeURIComponent(categoryParam)}`
  }
  return `/seo/business/${biz}`
}

// decodeURIComponent throws a URIError on a malformed percent-escape (e.g. `/%`).
// The fetch handler has no outer try/catch, so decode defensively and fall back
// to the raw segment rather than 500-ing instead of serving the SPA.
export const safeDecodeURIComponent = (value) => {
  try {
    return decodeURIComponent(value)
  } catch (_) {
    return value
  }
}

export const mapSeoEndpoint = (pathname, searchParams) => {
  const segments = pathname.split('/').filter(Boolean).map(safeDecodeURIComponent)
  const categoryParam = searchParams?.get('category') || null
  const productParam = searchParams?.get('product') || null

  if (segments.length === 0 || segments[0] === 'home') {
    return '/seo/general'
  }

  if (segments[0] === 'pages' && segments[1]) {
    return `/seo/pages/slug/${encodeURIComponent(segments[1])}`
  }

  if (segments[0] === 'store') {
    const rest = segments.slice(1)
    if (rest.length === 1) {
      return buildBusinessSeoPath(rest[0], categoryParam, productParam)
    }
    if (rest.length === 2) {
      return `/seo/business/${encodeURIComponent(rest[0])}/category/${encodeURIComponent(rest[1])}${productParam ? `/product/${encodeURIComponent(productParam)}` : ''}`
    }
    if (rest.length === 3) {
      return `/seo/business/${encodeURIComponent(rest[0])}/category/${encodeURIComponent(rest[1])}/product/${encodeURIComponent(rest[2])}`
    }
    return '/seo/general'
  }

  if (!RESERVED_SEGMENTS.has(segments[0])) {
    if (segments.length === 1) {
      return buildBusinessSeoPath(segments[0], categoryParam, productParam)
    }
    if (segments.length === 2) {
      return `/seo/business/${encodeURIComponent(segments[0])}/category/${encodeURIComponent(segments[1])}${productParam ? `/product/${encodeURIComponent(productParam)}` : ''}`
    }
    if (segments.length === 3) {
      return `/seo/business/${encodeURIComponent(segments[0])}/category/${encodeURIComponent(segments[1])}/product/${encodeURIComponent(segments[2])}`
    }
  }

  return '/seo/general'
}

const DEFAULT_SEO_TTL = 3600
const DEFAULT_FIRST_LOAD_TTL = 300
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024
const DEFAULT_SEO_TIMEOUT_MS = 3000
const DEFAULT_FIRST_LOAD_TIMEOUT_MS = 4000
const DEFAULT_SITEMAP_TTL = 3600
const DEFAULT_SITEMAP_TIMEOUT_MS = 8000

export const resolvePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

// v6: entries carry a Cache-Tag (hostCacheTag); the untagged v5 ones are
// not read back, so a purge by tag reaches everything this worker serves.
const CACHE_VERSION = 'v6'
const SEO_CACHE_KEY_BASE = `https://website-marketplace-v26.internal/${CACHE_VERSION}`

const FIRST_LOAD_PARAMS = 'features,configs,site(name,description,code,domain,temporal_domain,type,logo,header,image,social_share,deployment_provider_settings,business(name,slug),franchise(name,slug)),theme'

// The title of a site whose theme and API have no name (index.html's).
// Without a description the page has none: no vendor line stands in for it.
export const DEFAULT_SEO_TITLE = 'My Site'

export const pickNonEmptyString = (value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const buildSeoCacheKey = (hostname, seoPath) =>
  `${SEO_CACHE_KEY_BASE}/seo?host=${encodeURIComponent(hostname || '')}&path=${encodeURIComponent(seoPath || '')}`

// One key per host, API root (base, version, language, project), site identity (X-App-X), resource and
// store of the Full Website home page (worker/landingData.js). `v=2`: the host-only keys are not read back.
export const buildLandingCacheKey = (hostname, resource, id, config) =>
  `${SEO_CACHE_KEY_BASE}/landing?v=2&host=${encodeURIComponent(hostname || '')}&api=${encodeURIComponent(buildApiBase(config))}&app=${encodeURIComponent(config?.app_id || '')}&resource=${encodeURIComponent(resource || '')}&id=${encodeURIComponent(id ?? '')}`

const buildBusinessShareCacheKey = (hostname, slug) =>
  `${SEO_CACHE_KEY_BASE}/business-share?host=${encodeURIComponent(hostname || '')}&slug=${encodeURIComponent(slug || '')}`

// Theme format this web asks first_load for (`theme_version`): only version 2.
// Its payload cannot share the first-load slot of websites-router, which holds
// a v1 payload: this worker uses its own, versioned key.
export const THEME_VERSION = 2

// The product this web is (`product_type`, the schema's), sent with the
// request like the boot shim does (src/shims/network-boot.js): api-core only
// reads it for a site without a product type whose theme is still v1, to pick
// the schema of the v2 envelope.
export const FIRST_LOAD_PRODUCT_TYPE = productType

// The schema this build is made for (product.schema.json `version`, through
// src/theme.compiled.json): api-core cuts a theme of a newer schema down
// to it, so an older worker never gets keys it does not know.
export const THEME_SCHEMA_VERSION = schemaVersion

// Own key of the v2 first_load. It names the product_type and the schema
// version it was asked with, so a payload cached for another is not read back.
export const buildOwnFirstLoadCacheKey = (origin) =>
  `${SEO_CACHE_KEY_BASE}/first-load?origin=${encodeURIComponent(origin || '')}&theme_version=${THEME_VERSION}&product_type=${FIRST_LOAD_PRODUCT_TYPE}&theme_schema_version=${THEME_SCHEMA_VERSION}`

export const buildFirstLoadUrl = (config) => {
  const base = config?.api?.url?.replace(/\/$/, '') ?? ''
  const version = config?.api?.version ?? 'v400'
  const language = config?.api?.language ?? 'en'
  const params = encodeURIComponent(FIRST_LOAD_PARAMS)
  return `${base}/${version}/${language}/${config.project}/frontends/first_load?params=${params}&theme_version=${THEME_VERSION}&product_type=${FIRST_LOAD_PRODUCT_TYPE}&theme_schema_version=${THEME_SCHEMA_VERSION}`
}

/**
 * Version 2 theme envelope (`{ version: 2, values }`) of first_load.
 */
export const isThemeEnvelope = (theme) =>
  !!theme && theme.version === 2 && !!theme.values && typeof theme.values === 'object'

/**
 * The site's settings of a v2 theme (`values.site`: mode, name, franchise…;
 * product.schema.json `site`), or null. The worker reads only `name` and
 * `franchise_id`, so it does not import src/utils/siteSettings.js (and the
 * schema with it).
 */
export const getThemeSite = (theme) => {
  const site = isThemeEnvelope(theme) ? theme.values.site : null
  return site && typeof site === 'object' && !Array.isArray(site) ? site : null
}

/** `site.name` of a v2 theme, trimmed, or null. */
export const getThemeSiteName = (theme) => {
  const name = getThemeSite(theme)?.name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

/** `site.description` of a v2 theme, trimmed, or null. */
export const getThemeSiteDescription = (theme) => {
  const description = getThemeSite(theme)?.description
  return typeof description === 'string' && description.trim() ? description.trim() : null
}

/** `site.franchise_id` of a v2 theme (a numeric id or a slug), or null. */
export const getThemeFranchiseId = (theme) => {
  const id = getThemeSite(theme)?.franchise_id
  if (typeof id === 'number') return Number.isFinite(id) ? id : null
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

/**
 * The business whose own logo/header the favicon ladder (b/c) may fall back
 * to: the theme's configured business, only on a single-store
 * site (`site.mode === 'single_store'`) — a marketplace never shows a
 * business image as its favicon, on its home or on any `/store/<slug>`.
 * Same resolution as resolveShareBusinessSlug's single-store branch
 * (worker/index.js), on purpose: when they agree, the caller reuses one
 * fetch instead of asking the API for the business twice.
 */
export const getFaviconBusinessSlug = (theme, site) => {
  const themeSite = getThemeSite(theme)
  if (themeSite?.mode !== 'single_store') return null
  return pickNonEmptyString(themeSite?.business_slug) || pickNonEmptyString(site?.business?.slug)
}

/**
 * App icon of a v2 theme (`images.app_icon`, else its isotype
 * `images.isotype`, not the white-label placeholder): the home screen icon
 * of iOS (`apple-touch-icon`). A v1 theme has none.
 */
export const getThemeAppIcon = (theme) => {
  if (!isThemeEnvelope(theme)) return null
  const images = theme.values.images || {}
  const appIcon = typeof images.app_icon === 'string' ? images.app_icon.trim() : ''
  if (appIcon) return appIcon
  return isConfiguredBrandAsset(images.isotype) ? String(images.isotype).trim() : null
}

// iOS takes a 180×180 PNG: the CDN serves the app icon so when it can (any
// other URL goes as it is)
export { APPLE_TOUCH_ICON_TRANSFORM }

export const appleTouchIconUrl = (url) => transformedImageUrl(url, APPLE_TOUCH_ICON_TRANSFORM) || url

const FAVICON_RELS = new Set(['icon', 'shortcut-icon', 'apple-touch-icon'])

/**
 * The `<link>`s the worker injects into index.html: the SEO ones (`seoLinks`)
 * plus the site's icons.
 *
 * - SEO icon links that point at the white-label placeholders go; the
 *   others keep their href with the `type` of their file (or none).
 * - Without an SEO `icon`, the favicon (`faviconUrl`) goes in with its real
 *   `type` (iconLinks.faviconLinks: omitted when it cannot be told) and, for
 *   an SVG, the PNG `fallbackPng` before it. Its `shortcut-icon` too, and an
 *   `apple-touch-icon` that is always a PNG: the favicon's (the CDN's PNG of
 *   it, or the favicon when it is a PNG), else `fallbackPng`.
 * - The v2 app icon (`appIcon`: app_icon, else the isotype) as the CDN's
 *   180×180 PNG (or itself when it is a PNG) is then the only
 *   apple-touch-icon; one that cannot be had as a PNG (an SVG isotype) leaves
 *   the others as they are.
 * - Without a site-level favicon at all (`faviconUrl` falsy) but a
 *   `fallbackIconLinks` (implementation notesthe single-store business's logo/header,
 *   else the bundled generic icon — resolved by the caller, worker/index.js),
 *   its `icon`/`touchIcon` go in as `icon`, `shortcut-icon` and
 *   `apple-touch-icon`, with its own `type`/`sizes` when given (the business
 *   case passes neither: the CDN does not guarantee the format or exact size
 *   it asked for).
 */
export const buildIconLinks = ({ seoLinks = [], faviconUrl, fallbackPng, appIcon, fallbackIconLinks } = {}) => {
  let links = (Array.isArray(seoLinks) ? seoLinks : [])
    .filter(link => !FAVICON_RELS.has(String(link?.rel)) || isConfiguredBrandAsset(link?.href))
    // an SEO icon's `type` is its file's, or none (never a guessed one)
    .map(link => {
      if (!['icon', 'shortcut-icon'].includes(String(link?.rel))) return link
      const { type: _declared, ...rest } = link
      const type = iconMimeType(link.href)
      return type ? { ...rest, type } : rest
    })
  const configuredIcon = links.find(link => link && String(link.rel) === 'icon' && link.href)
  if (!configuredIcon && faviconUrl) {
    const icons = faviconLinks(faviconUrl, fallbackPng)
    const favicon = icons[icons.length - 1]
    const touchIcon = pngIconUrl(faviconUrl) || fallbackPng
    links = [
      ...links,
      ...icons,
      { rel: 'shortcut-icon', ...(favicon.type ? { type: favicon.type } : {}), href: favicon.href },
      ...(touchIcon ? [{ rel: 'apple-touch-icon', type: iconMimeType(touchIcon) || 'image/png', href: touchIcon }] : [])
    ]
  } else if (!configuredIcon && !faviconUrl && fallbackIconLinks) {
    const { icon, touchIcon, type, sizes } = fallbackIconLinks
    const attrs = { ...(type ? { type } : {}), ...(sizes ? { sizes } : {}) }
    links = [
      ...links,
      { rel: 'icon', id: 'favicon', ...attrs, href: icon },
      { rel: 'shortcut-icon', ...attrs, href: icon },
      ...(touchIcon ? [{ rel: 'apple-touch-icon', ...attrs, href: touchIcon }] : [])
    ]
  }
  const appTouchIcon = appIcon ? pngIconUrl(appIcon) : null
  if (appTouchIcon) {
    links = [
      ...links.filter(link => String(link?.rel) !== 'apple-touch-icon'),
      { rel: 'apple-touch-icon', sizes: '180x180', href: appTouchIcon }
    ]
  }
  return links
}

/**
 * Configured favicon of a v2 theme (`images.favicon`), or undefined.
 */
export const getThemeFavicon = (theme) => isThemeEnvelope(theme) ? theme.values.images?.favicon : undefined

const buildCurrentCacheKey = (project) =>
  `${SEO_CACHE_KEY_BASE}/current?project=${encodeURIComponent(project || '')}`

// Keyed per host too (not only per project): a purge by the host's tag
// (hostCacheTag) then drops the sitemap of exactly the host it was cached for.
// v2: bumps only this key (not CACHE_VERSION) to drop pre-`?url=` entries whose <loc> pointed at the wrong host.
const buildSitemapCacheKey = (project, hostname) =>
  `${SEO_CACHE_KEY_BASE}/sitemap-v2?project=${encodeURIComponent(project || '')}&host=${encodeURIComponent(hostname || '')}`

/**
 * Cache-Tag of everything cached for one host: `host-<hostname>`, the
 * hostname all lowercase, without scheme or port (`https://Shop.Example.com:8443`
 * → `host-shop.example.com`). Takes a hostname, a host with a port or an
 * origin URL; null when there is no host. api-core purges the edge cache by
 * these tags (`host-<domain>`, `host-<temporal_domain>`) after a migration, a
 * theme publish or a theme activation. Per-project entries (i18n) are untagged.
 */
export const hostCacheTag = (hostOrOrigin) => {
  const raw = String(hostOrOrigin || '').trim()
  if (!raw) return null
  let hostname
  try {
    hostname = new URL(raw.includes('://') ? raw : `http://${raw}`).hostname
  } catch (_) {
    return null
  }
  hostname = hostname.toLowerCase().replace(/\.$/, '')
  return hostname ? `host-${hostname}` : null
}

const isCacheDisabled = (env) => {
  if (!env) return false
  const v = typeof env.DISABLE_CACHE === 'string' ? env.DISABLE_CACHE.trim().toLowerCase() : env.DISABLE_CACHE
  return v === true || v === 'true' || v === '1'
}

const cacheRead = async (cacheKeyUrl, env) => {
  if (!cacheKeyUrl || isCacheDisabled(env)) return null
  try {
    const cached = await caches.default.match(new Request(cacheKeyUrl, { method: 'GET' }))
    if (!cached) return null
    return await cached.json()
  } catch (_) {
    return null
  }
}

// Every entry is a Response built here (status 200): callers only write
// payloads of a 2xx upstream answer without `error`, never the upstream
// Response itself. `cacheTag` (hostCacheTag) goes as its Cache-Tag header.
const cacheWrite = (cacheKeyUrl, data, ttlSeconds, ctx, env, cacheTag = null) => {
  if (!cacheKeyUrl || !ctx || isCacheDisabled(env)) return
  const headers = {
    'content-type': 'application/json',
    'cache-control': `public, s-maxage=${ttlSeconds}`
  }
  if (cacheTag) headers['cache-tag'] = cacheTag
  const res = new Response(JSON.stringify(data), { headers })
  ctx.waitUntil(caches.default.put(new Request(cacheKeyUrl, { method: 'GET' }), res))
}

const DEFAULT_HARD_TTL = 86400

/**
 * Stale-while-revalidate over the edge cache: entries live for HARD_TTL but
 * are only considered fresh for their soft TTL. Stale entries are served
 * immediately (no origin round trip on the request path) while refreshFn runs
 * in the background via ctx.waitUntil. NOT used for the first_load entry,
 * which expires with its plain FIRST_LOAD_TTL.
 */
export const swrRead = async (cacheKeyUrl, env, softTtlSeconds) => {
  const cached = await cacheRead(cacheKeyUrl, env)
  if (!cached) return null
  if (cached.__swr) {
    return { data: cached.data, isStale: (Date.now() - cached.storedAt) / 1000 > softTtlSeconds }
  }
  return { data: cached, isStale: false } // pre-SWR entry: expires via its own s-maxage
}

// Background refreshes write through here too, with the same tag as the
// first write.
export const swrWrite = (cacheKeyUrl, data, env, ctx, cacheTag = null) =>
  cacheWrite(cacheKeyUrl, { __swr: true, storedAt: Date.now(), data }, resolvePositiveInt(env.HARD_TTL, DEFAULT_HARD_TTL), ctx, env, cacheTag)

export const readJsonWithLimit = async (response, maxBytes) => {
  const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
  if (contentLength > maxBytes) return null

  const text = await response.text()
  if (text.length > maxBytes) return null

  try {
    return JSON.parse(text)
  } catch (_) {
    return null
  }
}

const buildOrderingApiHeaders = (config, origin, requestUrl, accept = 'application/json') => {
  const headers = { accept }
  if (config?.app_id) headers['x-app-x'] = config.app_id
  if (origin) headers.origin = origin
  if (requestUrl) headers.referer = requestUrl
  return headers
}

// The API blocks a project whose subscription is not active with a 401, or
// whose database is archived with a 410 (inactiveProject.js); null for any other failure.
const readInactiveProject = async (response, env) =>
  response.status === 401 || response.status === 410
    ? parseInactiveProject(response.status, await readJsonWithLimit(response, resolvePositiveInt(env.MAX_RESPONSE_BYTES, DEFAULT_MAX_RESPONSE_BYTES)))
    : null

const INACTIVE_MARK_TTL = 60
const buildInactiveMarkCacheKey = (origin) => `${SEO_CACHE_KEY_BASE}/inactive?origin=${encodeURIComponent(origin || '')}`

// A confirmed "inactive" outranks the cached active entries (a stale /current
// revalidated in the background would otherwise leave the app and sitemap
// served): leave a short per-host mark and drop those entries, so the next
// request serves the pause, and the first one after the mark expires asks the API again.
const markInactive = (info, origin, activeKeyUrls, env, ctx) => {
  if (!ctx || isCacheDisabled(env)) return
  cacheWrite(buildInactiveMarkCacheKey(origin), info, INACTIVE_MARK_TTL, ctx, env, hostCacheTag(origin))
  for (const keyUrl of activeKeyUrls) {
    try {
      ctx.waitUntil(Promise.resolve(caches.default.delete(new Request(keyUrl, { method: 'GET' }))).catch(() => {}))
    } catch (_) {}
  }
}

// Only what parseInactiveProject builds counts (a cache that ignores the key must not read as a mark).
const readInactiveMark = async (origin, env) => {
  const mark = await cacheRead(buildInactiveMarkCacheKey(origin), env)
  return typeof mark?.reason === 'string' && 'logo' in mark ? mark : null
}

/**
 * `onInactive(info)` is called when the API says the project is not active;
 * the derived `project` is then returned (never baseConfig.project) and no
 * active entry is cached (a short per-host inactive mark is, see markInactive).
 */
export const validateProjectViaCurrent = async (baseConfig, project, env, ctx, origin, requestUrl, onInactive) => {
  if (!baseConfig?.api?.url || !project) return project ?? null

  const cacheKeyUrl = `${buildCurrentCacheKey(project)}&origin=${encodeURIComponent(origin || '')}`
  const cacheTag = hostCacheTag(origin)

  const fetchAndCache = async () => {
    const base = baseConfig.api.url.replace(/\/$/, '')
    const version = baseConfig.api.version ?? 'v400'
    const language = baseConfig.api.language ?? 'en'
    const url = `${base}/${version}/${language}/${project}/current`

    try {
      const headers = buildOrderingApiHeaders(baseConfig, origin, requestUrl)

      const response = await fetch(url, {
        signal: AbortSignal.timeout(resolvePositiveInt(env.FIRST_LOAD_TIMEOUT_MS, DEFAULT_FIRST_LOAD_TIMEOUT_MS)),
        headers
      })
      if (!response.ok) {
        const inactive = await readInactiveProject(response, env)
        if (inactive) {
          markInactive(inactive, origin, [cacheKeyUrl, buildOwnFirstLoadCacheKey(origin)], env, ctx)
          onInactive?.(inactive)
          return project
        }
        console.warn('validateProjectViaCurrent failed', { status: response.status, project, origin })
        return null
      }
      const json = await readJsonWithLimit(response, resolvePositiveInt(env.MAX_RESPONSE_BYTES, DEFAULT_MAX_RESPONSE_BYTES))
      if (!json || json.error || !json.result?.code) {
        console.warn('validateProjectViaCurrent returned invalid payload', { project, origin, hasJson: !!json, error: json?.error })
        return null
      }

      swrWrite(cacheKeyUrl, { code: json.result.code }, env, ctx, cacheTag)
      return json.result.code
    } catch (error) {
      console.warn('validateProjectViaCurrent threw', { project, origin, message: error?.message })
      return null
    }
  }

  const [cached, mark] = await Promise.all([
    swrRead(cacheKeyUrl, env, resolvePositiveInt(env.FIRST_LOAD_TTL, DEFAULT_FIRST_LOAD_TTL)),
    readInactiveMark(origin, env)
  ])
  if (mark) {
    onInactive?.(mark)
    return project
  }

  if (cached?.data?.code) {
    if (cached.isStale) ctx?.waitUntil?.(fetchAndCache())
    return cached.data.code
  }

  return (await fetchAndCache()) ?? baseConfig.project ?? project
}

export const buildApiBase = (config) => {
  const base = config?.api?.url?.replace(/\/$/, '') ?? ''
  const version = config?.api?.version ?? 'v400'
  const language = config?.api?.language ?? 'en'
  const project = config?.project ?? ''
  return `${base}/${version}/${language}/${project}`
}

export const fetchSeo = async (config, seoPath, env, ctx, hostname) => {
  if (!config || !seoPath) return null

  const url = `${buildApiBase(config)}${seoPath}?type=advanced`
  const cacheKeyUrl = buildSeoCacheKey(hostname, seoPath)
  const cacheTag = hostCacheTag(hostname)

  const fetchAndCache = async () => {
    try {
      const headers = { accept: 'application/json' }
      if (config.app_id) headers['x-app-x'] = config.app_id

      const response = await fetch(url, {
        signal: AbortSignal.timeout(resolvePositiveInt(env.SEO_TIMEOUT_MS, DEFAULT_SEO_TIMEOUT_MS)),
        headers
      })
      if (!response.ok) return null
      const json = await readJsonWithLimit(response, resolvePositiveInt(env.MAX_RESPONSE_BYTES, DEFAULT_MAX_RESPONSE_BYTES))
      if (!json || json.error || !json.result) return null

      swrWrite(cacheKeyUrl, json.result, env, ctx, cacheTag)
      return json.result
    } catch (_) {
      return null
    }
  }

  const cached = await swrRead(cacheKeyUrl, env, resolvePositiveInt(env.SEO_TTL, DEFAULT_SEO_TTL))
  if (cached?.data) {
    if (cached.isStale) ctx?.waitUntil?.(fetchAndCache())
    return cached.data
  }

  return fetchAndCache()
}

/**
 * The business's own share images (public, no auth): `{ seo_image, logo,
 * header }`, each the raw string or null. Same SWR/cache shape as fetchSeo,
 * under its own cache key. Fail-open: null on any error or missing slug.
 */
export const fetchBusinessShareImages = async (config, slug, env, ctx, hostname) => {
  if (!config || !slug) return null

  const url = `${buildApiBase(config)}/business/${encodeURIComponent(slug)}?params=slug,logo,header,seo_image`
  const cacheKeyUrl = buildBusinessShareCacheKey(hostname, slug)
  const cacheTag = hostCacheTag(hostname)

  const fetchAndCache = async () => {
    try {
      const headers = { accept: 'application/json' }
      if (config.app_id) headers['x-app-x'] = config.app_id

      const response = await fetch(url, {
        signal: AbortSignal.timeout(resolvePositiveInt(env.SEO_TIMEOUT_MS, DEFAULT_SEO_TIMEOUT_MS)),
        headers
      })
      if (!response.ok) return null
      const json = await readJsonWithLimit(response, resolvePositiveInt(env.MAX_RESPONSE_BYTES, DEFAULT_MAX_RESPONSE_BYTES))
      if (!json || json.error || !json.result) return null

      const data = {
        seo_image: json.result.seo_image ?? null,
        logo: json.result.logo ?? null,
        header: json.result.header ?? null
      }
      swrWrite(cacheKeyUrl, data, env, ctx, cacheTag)
      return data
    } catch (_) {
      return null
    }
  }

  const cached = await swrRead(cacheKeyUrl, env, resolvePositiveInt(env.SEO_TTL, DEFAULT_SEO_TTL))
  if (cached?.data) {
    if (cached.isStale) ctx?.waitUntil?.(fetchAndCache())
    return cached.data
  }

  return fetchAndCache()
}

export const fetchSitemap = async (config, env, ctx, origin, requestUrl) => {
  if (!config?.api?.url || !config?.project) return null

  // hostname drives the cache key/tag; derived from origin so callers need not pass both.
  let hostname = null
  try {
    hostname = origin ? new URL(origin).hostname : null
  } catch (_) {}

  const ttl = resolvePositiveInt(env.SITEMAP_TTL, DEFAULT_SITEMAP_TTL)
  const cacheKeyUrl = buildSitemapCacheKey(config.project, hostname)
  const cacheTag = hostCacheTag(hostname)

  if (!isCacheDisabled(env)) {
    try {
      const cached = await caches.default.match(new Request(cacheKeyUrl, { method: 'GET' }))
      if (cached) return { xml: await cached.text(), ttl }
    } catch (_) {}
  }

  // api-core resolves the site and builds the sitemap's <loc> from `?url=`,
  // so the request must carry the same origin the API would otherwise guess
  // (X-Domain-X / Origin / Referer) from — without it <loc> points at another host.
  const url = `${buildApiBase(config)}/xml/sitemap?url=${encodeURIComponent(origin || '')}`

  try {
    const headers = buildOrderingApiHeaders(config, origin, requestUrl || (origin ? `${origin}/sitemap.xml` : undefined), 'application/xml')
    if (origin) headers['x-domain-x'] = origin

    const response = await fetch(url, {
      signal: AbortSignal.timeout(resolvePositiveInt(env.SITEMAP_TIMEOUT_MS, DEFAULT_SITEMAP_TIMEOUT_MS)),
      headers
    })
    if (!response.ok) return null

    const xml = await response.text()
    if (!xml || (!xml.includes('<urlset') && !xml.includes('<sitemapindex'))) return null

    if (ctx && !isCacheDisabled(env)) {
      const cacheHeaders = {
        'content-type': 'text/xml; charset=UTF-8',
        'cache-control': `public, s-maxage=${ttl}`
      }
      if (cacheTag) cacheHeaders['cache-tag'] = cacheTag
      const cacheRes = new Response(xml, { headers: cacheHeaders })
      ctx.waitUntil(caches.default.put(new Request(cacheKeyUrl, { method: 'GET' }), cacheRes))
    }

    return { xml, ttl }
  } catch (_) {
    return null
  }
}

// `fresh`: a live read that never looks at the cache (it still rewrites it with what it got), with its own
// `timeoutMs`; for the answers that must not outlive a change of the store's privacy (the Full Website's `/`).
export const fetchFirstLoad = async (config, env, ctx, origin, requestUrl, { fresh = false, timeoutMs } = {}) => {
  if (!config) return null

  const cacheKeyUrl = buildOwnFirstLoadCacheKey(origin)

  // both reads at once: no extra round trip on the page's path. A `fresh` read skips the cache but still
  // honours the inactive mark, which wins over any first_load.
  const [cached, mark] = await Promise.all([fresh ? null : cacheRead(cacheKeyUrl, env), readInactiveMark(origin, env)])
  if (mark) return { inactive_project: mark }
  if (cached) {
    if (cached.result) return cached.result
    return cached
  }

  const urls = [buildFirstLoadUrl(config)]

  const headers = buildOrderingApiHeaders(config, origin, requestUrl)

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs ?? resolvePositiveInt(env.FIRST_LOAD_TIMEOUT_MS, DEFAULT_FIRST_LOAD_TIMEOUT_MS)),
        headers
      })
      if (!response.ok) {
        const inactive = await readInactiveProject(response, env)
        if (inactive) {
          // only first_load's own entry: /current is keyed by the project derived from the host (often "_"),
          // and a cached active /current is harmless while the mark lasts and first_load is asked again after it
          markInactive(inactive, origin, [cacheKeyUrl], env, ctx)
          return { inactive_project: inactive }
        }
        console.warn('fetchFirstLoad failed', { status: response.status, url, origin, project: config.project })
        continue
      }
      const json = await readJsonWithLimit(response, resolvePositiveInt(env.MAX_RESPONSE_BYTES, DEFAULT_MAX_RESPONSE_BYTES))
      if (!json || json.error || !json.result) {
        console.warn('fetchFirstLoad returned invalid payload', { url, origin, project: config.project, hasJson: !!json, error: json?.error })
        continue
      }

      cacheWrite(cacheKeyUrl, json, resolvePositiveInt(env.FIRST_LOAD_TTL, DEFAULT_FIRST_LOAD_TTL), ctx, env, hostCacheTag(origin))
      return json.result
    } catch (error) {
      console.warn('fetchFirstLoad threw', { url, origin, project: config.project, message: error?.message })
    }
  }

  return null
}

const buildBootI18nCacheKey = (project, language, kind) =>
  `${SEO_CACHE_KEY_BASE}/boot-i18n?project=${encodeURIComponent(project || '')}&lang=${encodeURIComponent(language || '')}&kind=${kind}`

/**
 * Pre-fetches the i18n payloads the SPA requests on boot (/translations and the
 * default /languages lookup) so they can be injected as window.__EDGE_XHR__ and
 * served instantly by the client-side XHR shim (src/shims/network-boot.js)
 * instead of blocking the first render. The queries mirror the SDK requests in
 * LanguageContext (refreshTranslations / loadDefaultLanguage). Fail-open: any
 * error drops the entry and the client falls back to the network.
 */
export const fetchBootI18n = async (config, env, ctx, origin, requestUrl) => {
  if (!config?.api?.url || !config?.project) return null

  const language = config.api?.language ?? 'en'
  const apiBase = buildApiBase(config)
  const headers = buildOrderingApiHeaders(config, origin, requestUrl)
  const ttl = resolvePositiveInt(env.FIRST_LOAD_TTL, DEFAULT_FIRST_LOAD_TTL)
  const timeout = resolvePositiveInt(env.FIRST_LOAD_TIMEOUT_MS, DEFAULT_FIRST_LOAD_TIMEOUT_MS)
  const maxBytes = resolvePositiveInt(env.MAX_RESPONSE_BYTES, DEFAULT_MAX_RESPONSE_BYTES)

  const appInternalName = config.app_internal_name || null
  const translationsQuery = appInternalName
    ? `version=v2&where=${encodeURIComponent(JSON.stringify([{ attribute: 'product', value: appInternalName }]))}&mode=dictionary`
    : 'mode=dictionary'
  const targets = [
    { kind: 'translations', url: `${apiBase}/translations?${translationsQuery}` },
    { kind: 'languages_default', url: `${apiBase}/languages?where=${encodeURIComponent(JSON.stringify([{ attribute: 'default', value: true }]))}` }
  ]

  const results = await Promise.all(targets.map(async ({ kind, url }) => {
    const cacheKeyUrl = buildBootI18nCacheKey(config.project, language, kind)

    const fetchAndCache = async () => {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(timeout), headers })
        if (!response.ok) return null
        const json = await readJsonWithLimit(response, maxBytes)
        if (!json || json.error) return null
        // per project, not per host: no Cache-Tag
        swrWrite(cacheKeyUrl, json, env, ctx)
        return json
      } catch (_) {
        return null
      }
    }

    const cached = await swrRead(cacheKeyUrl, env, ttl)
    if (cached?.data) {
      if (cached.isStale) ctx?.waitUntil?.(fetchAndCache())
      return [kind, cached.data]
    }
    return [kind, await fetchAndCache()]
  }))

  const payload = Object.fromEntries(results.filter(([, value]) => value))
  if (!Object.keys(payload).length) return null
  return { language, project: config.project, ...payload }
}

export const getTitle = (seoData) => {
  const innerHtml = seoData?.title?.innerHtml
  if (typeof innerHtml === 'string' && innerHtml.length > 0) return innerHtml

  const metas = seoData?.metas
  if (!Array.isArray(metas)) return null
  const entry = metas.find(m => m?.name === 'title' && typeof m?.content === 'string')
  return entry?.content ?? null
}

/**
 * Builds OG/meta fallbacks from first_load (the theme's site settings, else
 * the API's site) when the SEO API omits fields. The title falls back to
 * index.html's ("My Site"); without a description none is emitted.
 * site.image is the home hero — not used for social previews.
 * logo is what marketplace owners upload in the Website settings.
 */
export const buildSiteSeoFallback = (site, requestUrl, theme = null) => {
  const title = getThemeSiteName(theme) || pickNonEmptyString(site?.name) || DEFAULT_SEO_TITLE
  const description = resolveSeoDescription(getThemeSiteDescription(theme), site?.description)
  const image = pickNonEmptyString(site?.social_share) ||
    pickNonEmptyString(site?.logo) ||
    pickNonEmptyString(site?.header) ||
    null

  const metas = [
    ...(description ? [{ name: 'description', content: description }] : []),
    { property: 'og:title', content: title },
    ...(description ? [{ property: 'og:description', content: description }] : []),
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' }
  ]

  if (requestUrl) {
    metas.push({ property: 'og:url', content: requestUrl })
  }

  if (image) {
    metas.push({ property: 'og:image', content: image })
    metas.push({ name: 'twitter:image', content: image })
  }

  return { title, metas }
}

/**
 * First non-absent og:image/twitter:image content in the SEO API's metas
 * (its own page/category/product/site image), or null.
 */
export const extractApiImage = (seoData) => {
  const metas = Array.isArray(seoData?.metas) ? seoData.metas : []
  for (const meta of metas) {
    const key = meta?.property || meta?.name
    if (key === 'og:image' || key === 'twitter:image') {
      const present = presentImage(meta.content)
      if (present) return present
    }
  }
  return null
}

const SHARE_IMAGE_CONTENT_TRANSFORM = 'w_1200,h_630,c_fill,f_jpg'
// c_pad,b_white returns an empty response on this CDN; c_limit fits the
// logo inside 1200x630 without cropping or padding.
const SHARE_IMAGE_LOGO_TRANSFORM = 'w_1200,h_630,c_limit,f_jpg'

// localhost / 127.0.0.1 / a private dev IP: left relative to the origin
// (its own scheme) instead of forced to https, so a local image loads.
const isDevOrigin = (origin) => {
  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' ||
      /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)
  } catch (_) {
    return false
  }
}

const toAbsoluteShareImageUrl = (value, origin) => {
  let resolved
  try {
    resolved = new URL(value, origin || undefined)
  } catch (_) {
    return null
  }
  if (resolved.protocol === 'http:' && !isDevOrigin(origin)) resolved.protocol = 'https:'
  return resolved.href
}

/**
 * A share image: its CDN-transformed URL when the CDN can transform it
 * (transformedImageUrl), else its own URL unchanged — never with a declared
 * width/height, since we don't control what a third-party/CDN image
 * actually renders at. `kind` picks the transform: 'logo' fits a logo
 * inside the frame without cropping, 'content' crops a photo to fill it,
 * 'generic' is the bundled fallback, the one image we know is really
 * 1200×630.
 */
const buildShareImageResult = (value, kind, origin) => {
  const absolute = toAbsoluteShareImageUrl(value, origin)
  if (!absolute) return null
  if (kind === 'generic') return { url: absolute, width: 1200, height: 630 }
  const transform = kind === 'logo' ? SHARE_IMAGE_LOGO_TRANSFORM : SHARE_IMAGE_CONTENT_TRANSFORM
  const transformed = transformedImageUrl(absolute, transform)
  return { url: transformed || absolute }
}

const CATEGORY_OR_PRODUCT_BUSINESS_PATH = /^\/seo\/business\/[^/]+\/category\//

/**
 * The social-share image for the page, by a fixed ladder (first present
 * candidate wins), normalized to an absolute https URL. Never null:
 * `genericImage` always answers when nothing else does. Only that bundled
 * generic image carries a known width/height; every other candidate is a
 * CDN/third-party image we don't control the real render size of, so it
 * ships with no declared dimensions.
 *
 * - A store route (`seoPath` under `/seo/business/`): a category/product
 *   page first keeps its own `apiImage`. Then the business's own images
 *   (`business.seo_image` → `.header` → `.logo`); if `business` is null
 *   (its fetch failed) `apiImage` again; then the website's own images
 *   (`site.social_share` → `.header` → `.logo`); then the theme's
 *   placeholder; then generic.
 * - Any other route: `/seo/pages/…` keeps its own `apiImage` first. Then
 *   the website's primary image (`site.social_share`, then `apiImage` on
 *   `/seo/general`). Only on a single-store theme (`theme.values.site.mode
 *   === 'single_store'`), the business's `header` → `logo` next. Then the
 *   website's backup images (`site.header` → `.logo`, unchanged marketplace
 *   behavior). Then the theme's placeholder; then generic. A
 *   marketplace/franchise home never looks at a business's own images.
 * - `heroImage` (optional, the photo of the Full Website's hero; only the
 *   `/` of one passes it): on the general route it is the fallback of the
 *   website's primary image (`site.social_share`, `apiImage`: the owner's choice
 *   wins), before the business's own images and the backups. An `apiImage` that
 *   is empty, the legacy placeholder or the bundled generic image is no choice
 *   and does not cover it.
 */
export const resolveShareImage = ({
  seoPath = '',
  site = null,
  theme = null,
  business = null,
  apiImage = null,
  heroImage = null,
  origin,
  genericImage
} = {}) => {
  const themePlaceholder = isThemeEnvelope(theme) ? theme.values.images?.placeholder?.business_header : null
  const isSingleStore = getThemeSite(theme)?.mode === 'single_store'
  const path = typeof seoPath === 'string' ? seoPath : ''
  const isBusinessRoute = path.startsWith('/seo/business/')
  const isPagesRoute = path.startsWith('/seo/pages/')
  const isCategoryOrProduct = isBusinessRoute && CATEGORY_OR_PRODUCT_BUSINESS_PATH.test(path)

  // the bundled generic image is a last resort, not a choice: it never covers the hero
  const isGenericImage = (value) => {
    const generic = buildShareImageResult(genericImage, 'generic', origin)?.url
    return !!generic && toAbsoluteShareImageUrl(presentImage(value), origin) === generic
  }

  const firstOf = (entries) => {
    for (const [value, kind] of entries) {
      const present = presentImage(value)
      if (!present) continue
      const result = buildShareImageResult(present, kind, origin)
      if (result) return result
    }
    return null
  }

  let found = null

  if (isBusinessRoute) {
    if (isCategoryOrProduct) found = firstOf([[apiImage, 'content']])
    found = found || firstOf([
      [business?.seo_image, 'content'],
      [business?.header, 'content'],
      [business?.logo, 'logo'],
      ...(business === null ? [[apiImage, 'content']] : []),
      [site?.social_share, 'content'],
      [site?.header, 'content'],
      [site?.logo, 'logo'],
      [themePlaceholder, 'content']
    ])
  } else {
    const businessEntries = isSingleStore ? [[business?.header, 'content'], [business?.logo, 'logo']] : []
    found = isPagesRoute
      ? firstOf([
        [apiImage, 'content'],
        [site?.social_share, 'content'],
        ...businessEntries,
        [site?.header, 'content'],
        [site?.logo, 'logo'],
        [themePlaceholder, 'content']
      ])
      : firstOf([
        [site?.social_share, 'content'],
        // the bundled generic image only steps aside for a hero photo; every other route keeps it as before
        [heroImage && isGenericImage(apiImage) ? null : apiImage, 'content'],
        [heroImage, 'content'],
        ...businessEntries,
        [site?.header, 'content'],
        [site?.logo, 'logo'],
        [themePlaceholder, 'content']
      ])
  }

  return found || buildShareImageResult(genericImage, 'generic', origin)
}

const metaKey = (meta) => {
  if (!meta) return null
  if (meta.property) return `p:${meta.property}`
  if (meta.name) return `n:${meta.name}`
  return null
}

const normalizeSeoMeta = (meta) => {
  if (!meta || typeof meta !== 'object') return meta
  const key = typeof meta.property === 'string' && meta.property
    ? meta.property
    : (typeof meta.name === 'string' && meta.name ? meta.name : null)
  if (!key) return meta
  if (key === 'description' || key.startsWith('twitter:')) {
    const { property, ...rest } = meta
    return { ...rest, name: key }
  }
  if (key.startsWith('og:')) {
    const { name, ...rest } = meta
    return { ...rest, property: key }
  }
  return meta
}

const DESCRIPTION_META_KEYS = new Set(['description', 'og:description', 'twitter:description'])

/**
 * Merges SEO API metas with site fallbacks. On /seo/general, site fields win;
 * on page-specific routes, SEO API wins and site fills gaps.
 */
export const mergeSeoData = (seoData, siteFallback, { preferSite = false, site = null, theme = null } = {}) => {
  const seoMetas = Array.isArray(seoData?.metas)
    ? seoData.metas.filter(m => m?.name !== 'title')
    : []
  const fallbackMetas = siteFallback?.metas || []
  const mergedMap = new Map()

  const addMeta = (meta) => {
    if (!meta || meta.content === null || meta.content === undefined) return
    const isDescriptionMeta = DESCRIPTION_META_KEYS.has(meta.name) || DESCRIPTION_META_KEYS.has(meta.property)
    const normalized = normalizeSeoMeta(meta)
    const key = metaKey(normalized)
    if (!key || mergedMap.has(key)) return
    if (isDescriptionMeta) {
      const content = resolveSeoDescription(normalized.content)
      if (!content) return
      mergedMap.set(key, { ...normalized, content })
      return
    }
    mergedMap.set(key, normalized)
  }

  if (preferSite) {
    for (const meta of fallbackMetas) addMeta(meta)
    for (const meta of seoMetas) addMeta(meta)
  } else {
    for (const meta of seoMetas) addMeta(meta)
    for (const meta of fallbackMetas) addMeta(meta)
  }

  const mergedDescription = mergedMap.get('n:description')
  const mergedOgDescription = mergedMap.get('p:og:description')
  if (!mergedDescription && mergedOgDescription) {
    mergedMap.set('n:description', { name: 'description', content: mergedOgDescription.content })
  }
  if (!mergedOgDescription && mergedDescription) {
    mergedMap.set('p:og:description', { property: 'og:description', content: mergedDescription.content })
  }

  const seoTitle = getTitle(seoData)
  // the theme's site name, else the API's
  const siteName = getThemeSiteName(theme) || pickNonEmptyString(site?.name)
  const title = preferSite
    ? (siteName || seoTitle || siteFallback?.title || DEFAULT_SEO_TITLE)
    : (seoTitle || siteName || siteFallback?.title || DEFAULT_SEO_TITLE)

  return {
    title,
    metas: [...mergedMap.values()],
    links: seoData?.links || []
  }
}

export const escapeJsonForScript = (value) => {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
