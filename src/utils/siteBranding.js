import { publicAssetUrl } from './publicAssetUrl'
import { BUNDLED_IMAGES } from './bundledImages'
import { siteName } from './siteSettings'
import { themeImage } from './themeTokens'
import { GENERIC_FAVICON_PATH } from './iconLinks'

export const ORDERING_DOMAINS = ['tryordering.com', 'ordering.co', 'orderingplus.com']
export const ORDERING_FAVICON = '/favicon.png'

// The white-label placeholder paths this app used to serve ("My Brand" logo,
// "MB" favicon). Never shown anymore (a white-label site without a logo gets
// none), but a site that still has one of these stored keeps being read as
// unconfigured, not exported: nothing outside this recognition needs them.
const LEGACY_PLACEHOLDER_LOGO = '/default-logo.png'
const LEGACY_PLACEHOLDER_FAVICON = '/default-favicon.png'
const LEGACY_PLACEHOLDER_ASSETS = new Set([LEGACY_PLACEHOLDER_LOGO, LEGACY_PLACEHOLDER_FAVICON])

const currentHostname = () =>
  typeof window === 'undefined' ? '' : window.location.hostname

const brandAssetPath = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    return raw.includes('://') ? new URL(raw).pathname : raw.split('?')[0]
  } catch (_) {
    return raw
  }
}

export const isOfficialOrderingHost = (hostname = currentHostname()) => {
  if (!hostname) return false
  return ORDERING_DOMAINS.some(domain => String(hostname).includes(domain))
}

export const isConfiguredBrandAsset = (value) => {
  const path = brandAssetPath(value)
  return !!path && !LEGACY_PLACEHOLDER_ASSETS.has(path)
}

/** The site's logo: a configured one, else Ordering's on an Ordering host; '' otherwise (white label, no logo). */
export const getSiteLogoUrl = (
  configuredLogo,
  orderingLogo,
  hostname = currentHostname()
) => publicAssetUrl(
  (isConfiguredBrandAsset(configuredLogo) ? String(configuredLogo).trim() : '') ||
  (isOfficialOrderingHost(hostname) ? orderingLogo : '')
)

/**
 * The favicon's source: the theme's configured favicon, else its app icon
 * (getThemeAppIcon), else the site's logo (the API's `site.logo`, implementation notes),
 * else Ordering's on an Ordering host; '' otherwise (white label, nothing
 * configured: no favicon link at all).
 */
export const resolveSiteFaviconSource = (
  configuredFavicon,
  siteLogo,
  hostname = currentHostname(),
  appIcon
) =>
  (isConfiguredBrandAsset(configuredFavicon) ? String(configuredFavicon).trim() : '') ||
  (isConfiguredBrandAsset(appIcon) ? String(appIcon).trim() : '') ||
  (isConfiguredBrandAsset(siteLogo) ? String(siteLogo).trim() : '') ||
  (isOfficialOrderingHost(hostname) ? ORDERING_FAVICON : '')

export const getSiteFaviconUrl = (
  configuredFavicon,
  siteLogo,
  hostname = currentHostname(),
  appIcon
) => publicAssetUrl(resolveSiteFaviconSource(configuredFavicon, siteLogo, hostname, appIcon))

/** The bundled favicon of the host (a PNG): Ordering's; '' off it (white label, none). */
export const getFallbackFaviconUrl = (hostname = currentHostname()) =>
  publicAssetUrl(isOfficialOrderingHost(hostname) ? ORDERING_FAVICON : '')

/**
 * The bundled generic favicon: a neutral square icon, no
 * letters or brand, applied when neither the site nor (on a single-store
 * site) its own business has anything configured. The last resort of the
 * client's favicon fallback (App.js) when the worker's own choice
 * (`window.__CONFIG__.favicon_fallback`, which may be this site's business
 * logo/header instead) is not available — `pnpm start` without the worker.
 */
export const getGenericFaviconUrl = () => publicAssetUrl(GENERIC_FAVICON_PATH)

/**
 * The logo of the site: the theme's (`images.logotype`; with `mobile`,
 * `images.isotype` first) or, without one, the brand of the host
 * (getSiteLogoUrl with the bundled logotype).
 */
export const getThemeLogoUrl = (theme, { mobile = false, hostname = currentHostname() } = {}) => getSiteLogoUrl(
  (mobile && themeImage(theme, 'isotype')) || themeImage(theme, 'logotype'),
  BUNDLED_IMAGES.logos.logotype,
  hostname
)

/**
 * The app's icon: the theme's (`images.app_icon`), else its isotype
 * (`images.isotype`, not the white-label placeholder); null with neither.
 */
export const getThemeAppIcon = (theme) => {
  const isotype = themeImage(theme, 'isotype')
  return themeImage(theme, 'app_icon') || (isConfiguredBrandAsset(isotype) ? isotype.trim() : null)
}

/**
 * The theme's logo for dark backgrounds: with `mobile` the isotype
 * (`images.isotype_inverse`, else the isotype: `images.isotype`, not the
 * white-label placeholder), else the logotype (`images.logotype_inverse`);
 * '' without one, for the caller's logotype.
 */
export const getThemeInverseLogo = (theme, { mobile = false } = {}) => {
  if (!mobile) return themeImage(theme, 'logotype_inverse') || ''
  const isotype = themeImage(theme, 'isotype')
  return themeImage(theme, 'isotype_inverse') || (isConfiguredBrandAsset(isotype) ? isotype.trim() : '')
}

/**
 * Which brand the header shows (implementation notes, Single Restaurant): the site's
 * own logo image (`logotypeSrc`/`isotypeSrc`), else — only when the whole
 * site is one store (`singleStore`) — that store's own logo (`storeLogo`),
 * else its name as text; null with nothing to show at all (no LogoHeader).
 * `logoSrc` is whichever single image a caller with no desktop/mobile pair
 * (BusinessStickyHeader) can use as-is.
 * @param {{logotypeSrc?: string, isotypeSrc?: string, storeLogo?: string, name?: string, singleStore?: boolean}} args
 */
export const headerBrand = ({ logotypeSrc, isotypeSrc, storeLogo, name, singleStore } = {}) => {
  if (logotypeSrc || isotypeSrc) {
    return { kind: 'site', logotypeSrc: logotypeSrc || null, isotypeSrc: isotypeSrc || null, logoSrc: logotypeSrc || isotypeSrc }
  }
  if (singleStore && storeLogo) return { kind: 'store', storeLogo, logoSrc: storeLogo }
  if (name) return { kind: 'name', name }
  return null
}

/**
 * Whether the header's brand repeats what the store block shows, so it hides
 * while the block is in view: the store's own logo, or a name
 * equal to the store's (trimmed, case-insensitive). The site's own logo, or a
 * site name other than the store's, stays. A name with the store's name not
 * known yet (`storeName` null) counts as repeating it until it arrives. The
 * store's own logo only repeats it when the block actually paints it at this
 * width (`storeShowsLogo`, implementation notes); otherwise the header's logo stays.
 */
export const brandRepeatsStore = (brand, storeName, storeShowsLogo = true) => {
  if (brand?.kind === 'store') return storeShowsLogo
  if (brand?.kind !== 'name') return false
  if (storeName == null) return true
  const norm = value => String(value || '').trim().toLowerCase()
  return norm(brand.name) === norm(storeName)
}

// The header's last-known Single Restaurant store logo, kept
// across reloads of a page with neither a live business nor a cart of the
// store to read it from (orders, profile). shortcut: one value per store
// slug, never cleared besides being overwritten; a stale logo from a since
// rebranded store only shows until the next time the store's own page is
// visited and publishes a fresh one.
const storedBrandLogoKey = (slug) => `header_store_logo:${slug}`

/** The slug's last published store logo (`writeStoredBrandLogo`), or null. try/catch: localStorage can throw (Safari private mode, quota); losing the cached logo is cosmetic, never a crash. */
export const readStoredBrandLogo = (slug) => {
  if (!slug) return null
  try {
    return window.localStorage.getItem(storedBrandLogoKey(slug)) || null
  } catch (_) {
    return null
  }
}

/** Persists `logo` as the slug's last published store logo; clears it when falsy. */
export const writeStoredBrandLogo = (slug, logo) => {
  if (!slug) return
  try {
    if (logo) window.localStorage.setItem(storedBrandLogoKey(slug), logo)
    else window.localStorage.removeItem(storedBrandLogoKey(slug))
  } catch (_) {}
}

/** The site's name when neither the theme nor the site has one. */
export const DEFAULT_SITE_NAME = 'My Site'

/**
 * The site's name: the theme's (`site.name`), else the site's (the API's
 * `site.name`), else `fallback` ('My Site'). The app's own name
 * (`settings.app_name`) is the vendor's, never the site's: it is not read.
 */
export const getSiteName = ({ theme, site, fallback = DEFAULT_SITE_NAME } = {}) => {
  const trim = (value) => String(value ?? '').trim()
  return siteName(theme) || trim(site?.name) || fallback
}
