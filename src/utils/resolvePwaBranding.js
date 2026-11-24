import { DEFAULT_SITE_NAME, getSiteFaviconUrl, getSiteName, getThemeAppIcon, getThemeLogoUrl } from './siteBranding'
import { siteDescription } from './siteSettings'
import { themeColor } from './themeColors'
import { themeImage } from './themeTokens'
import { iconMimeType, pngIconUrl } from './iconLinks'
import { THEME_DEFAULTS } from './appTheme'

const trim = (value) => String(value ?? '').trim()

// an icon of the manifest with its file's type, or none when it cannot be told
const withType = (icon) => {
  const type = iconMimeType(icon.src)
  return type ? { ...icon, type } : icon
}

export const resolvePwaBranding = ({
  theme,
  site,
  languageCode,
  hostname
} = {}) => {
  const logo = getThemeLogoUrl(theme, { mobile: true, hostname })
  // The app's icon (images.app_icon, else images.isotype) is every icon of
  // the installed app. Its format is the upload's (or what the CDN serves),
  // so the entries carry no `type`. Only the app icon (a square 1024 upload
  // with its motif inside the maskable safe zone) is the maskable one: the
  // isotype has no such zone and would be cropped.
  const appIcon = getThemeAppIcon(theme)
  const favicon = getSiteFaviconUrl(themeImage(theme, 'favicon'), site?.logo, hostname, appIcon)
  const icons = (appIcon
    ? [
        { src: appIcon, sizes: '192x192' },
        { src: appIcon, sizes: '512x512' },
        ...(themeImage(theme, 'app_icon') ? [{ src: appIcon, sizes: '512x512', purpose: 'maskable' }] : [])
      ]
    : [
        withType({ src: favicon, sizes: '192x192' }),
        withType({ src: logo || favicon, sizes: '512x512' })
      ]
  // a white-label site with nothing configured resolves no favicon/logo: no icon, not one with an empty src
  ).filter((icon) => icon.src)

  return {
    // the site's name, else "My Site" (never the app's own name)
    name: getSiteName({ theme, site }),
    description: siteDescription(theme) || trim(site?.description),
    lang: trim(languageCode),
    themeColor: themeColor(theme, 'primary'),
    backgroundColor: themeColor(theme, 'background'),
    icons,
    // the home-screen icon of iOS, always a PNG: the CDN's 180×180 PNG of
    // the app icon, or the app icon when it is a PNG (null: keep the
    // document's own, the worker's, which is a PNG too)
    appleTouchIcon: appIcon ? pngIconUrl(appIcon) : null
  }
}

/**
 * The site's own name, or '' without one: the site's own (getSiteName with
 * an empty fallback, so the "My Site" default never counts as own),
 * discarded when it is the schema's default (`site.name`, read from
 * THEME_DEFAULTS instead of hardcoding it) or the app's placeholder name
 * (DEFAULT_SITE_NAME, "My Site", which a site may have stored as its name). Used to gate the smart app
 * banner, the PWA prompt and the iOS home-screen title, and to show instead
 * of a logo where one would otherwise be a brand header (Header, HomeHero…).
 */
export const ownSiteName = ({ theme, site } = {}) => {
  const name = trim(getSiteName({ theme, site, fallback: '' }))
  const schemaDefaultName = trim(THEME_DEFAULTS?.values?.site?.name)
  return (!name || name === schemaDefaultName || name === DEFAULT_SITE_NAME) ? '' : name
}

/**
 * The site's OWN branding (name and app icon), or null without either: used
 * to gate the smart app banner and the PWA prompt on a site that actually
 * has one, instead of showing them over the schema's defaults (a gray icon,
 * "My Site"). `icon` is the theme's app icon (getThemeAppIcon, which already
 * excludes the white-label placeholder).
 */
export const ownAppBranding = ({ theme, site } = {}) => {
  const name = ownSiteName({ theme, site })
  if (!name) return null

  const icon = getThemeAppIcon(theme)
  if (!icon) return null

  return { name, icon }
}
