/**
 * Settings of the site (`site` of product.schema.json): what the site is
 * (marketplace, single store, franchise), its name and description, the
 * home and footer HTML, the third-party code, the tracking-only mode, the
 * experience (ordering only or full website) with its main store, and the
 * app store ids of the smart banner. They live in `theme.values.site.*` and are
 * read only through these helpers. The theme engine's runtime (appTheme.js) gives
 * every key, of its default's kind: the texts and HTML are strings, `mode` one
 * of its options, `tracking_only` a boolean, the franchise's slug and id an id
 * (a text, a number or null).
 *
 * Not the `scope` of a component group (`components.<group>.scope.*`,
 * src/utils/themeGroups.js): that one is style.
 */

/**
 * The value of a `site` key (`theme.values.site`).
 * @param {object} theme app theme (src/utils/appTheme.js)
 * @param {string} key dotted key of `site`, e.g. 'smart_banner.apple_id'
 */
export const siteSetting = (theme, key) => key.split('.').reduce((acc, part) => acc[part], theme.values.site)

/** A text of `site`, trimmed. */
const siteText = (theme, key) => siteSetting(theme, key).trim()

/** An HTML of `site` as it is; '' when blank. */
const siteHtml = (theme, key) => {
  const value = siteSetting(theme, key)
  return value.trim() ? value : ''
}

/** An id of `site` (a slug or a numeric id); null when blank. */
const siteId = (theme, key) => {
  const value = siteSetting(theme, key)
  if (typeof value === 'number') return value
  return value?.trim() || null
}

/** What the site is: 'marketplace' (the default), 'single_store' or 'franchise'. */
export const siteMode = (theme) => siteSetting(theme, 'mode')

/**
 * The slug of the single store, or null when the site lists businesses: the
 * site's (`mode` single_store plus its `business_slug`) or the config's
 * (`businessSlug`). Not the kiosk (`use_kiosk`) nor the marketplace
 * (`use_marketplace`) modes, which App.js also treats as "single business".
 * @param {object} theme app theme
 * @param {object} settings src/config.js
 */
export const singleStoreSlug = (theme, settings) => {
  const slug = siteMode(theme) === 'single_store' && siteText(theme, 'business_slug')
  return slug || settings?.businessSlug || null
}

/** Whether the whole site is one store (singleStoreSlug). */
export const isSingleStore = (theme, settings) => !!singleStoreSlug(theme, settings)

/**
 * The franchise the site shows, or null: the site's (`mode` franchise plus
 * its `franchise_id`, else its `franchise_slug`, else its `business_slug`)
 * or the config's (`franchiseSlug`). A slug or a numeric id, as the site keeps it.
 * @param {object} theme app theme
 * @param {object} settings src/config.js
 */
export const franchiseSlug = (theme, settings) => {
  const own = siteMode(theme) === 'franchise' && (siteId(theme, 'franchise_id') ?? siteId(theme, 'franchise_slug') ?? (siteText(theme, 'business_slug') || null))
  return own || settings?.franchiseSlug || null
}

/** Whether the site shows one franchise (franchiseSlug). */
export const isFranchise = (theme, settings) => !!franchiseSlug(theme, settings)

/**
 * The id of the franchise a franchise site was created for (`franchise_id`),
 * or null. The worker passes it to the app as the config's `franchiseSlug`.
 */
export const franchiseId = (theme) => siteId(theme, 'franchise_id')

/** The site's name ('' when it has none). */
export const siteName = (theme) => siteText(theme, 'name')

/** The site's description ('' when it has none). */
export const siteDescription = (theme) => siteText(theme, 'description')

/** HTML of the home page's content ('' when none). */
export const homeHtml = (theme) => siteHtml(theme, 'home_html')

/** HTML of the footer's content ('' when none). */
export const footerHtml = (theme) => siteHtml(theme, 'footer_html')

/**
 * Third-party code of the site (analytics, chats…), shown only with the
 * user's cookie consent: `head` goes into the document head, `body` at the
 * end of the body. '' when none.
 */
export const thirdPartyCode = (theme) => ({
  head: siteHtml(theme, 'third_party_code.head'),
  body: siteHtml(theme, 'third_party_code.body')
})

/**
 * Whether the site only tracks orders (docs/TRACKING_ONLY_MODE.md): no menu,
 * cart, login nor store pages.
 */
export const isTrackingOnly = (theme) => siteSetting(theme, 'tracking_only')

/**
 * Whether the site opens on its own home page (`pages.landing`) with ordering
 * on /order (docs/FULL_WEBSITE.md): `experience` full_website, never in
 * tracking-only mode, which wins.
 */
export const isFullWebsite = (theme) => !isTrackingOnly(theme) && siteSetting(theme, 'experience') === 'full_website'

/**
 * The path of the menu, where every internal "back to the menu" link goes:
 * '/order' on a full website (its '/' is the marketing home page), else '/',
 * which opens the menu as before (the store, the franchise's store selector
 * or the marketplace's home). `settings` (src/config.js) is part of the
 * contract between issues; the path does not depend on it yet.
 * @param {object} theme app theme
 * @param {object} settings src/config.js
 */
export const menuPath = (theme, settings) => (isFullWebsite(theme) ? '/order' : '/')

// product.schema.json site.smart_banner.apple_id / android_id, $extensions['co.ordering'].pattern
const SMART_BANNER_APPLE_ID_PATTERN = /^\d{6,12}$/
const SMART_BANNER_ANDROID_ID_PATTERN = /^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/

/** `value` trimmed when it matches `pattern`, else ''. */
const validId = (value, pattern) => {
  const text = String(value ?? '').trim()
  return pattern.test(text) ? text : ''
}

/**
 * App store ids of the smart app banner: the site's, else the config's
 * (`store_apple_id`, `store_android_id`); '' when neither has a valid one
 * (the schema's pattern for that key; `config.json`'s "0" placeholders are
 * never valid).
 * @param {object} theme app theme
 * @param {object} settings src/config.js
 */
export const smartBanner = (theme, settings) => ({
  appleId: validId(siteText(theme, 'smart_banner.apple_id'), SMART_BANNER_APPLE_ID_PATTERN) ||
    validId(settings?.store_apple_id, SMART_BANNER_APPLE_ID_PATTERN),
  androidId: validId(siteText(theme, 'smart_banner.android_id'), SMART_BANNER_ANDROID_ID_PATTERN) ||
    validId(settings?.store_android_id, SMART_BANNER_ANDROID_ID_PATTERN)
})
