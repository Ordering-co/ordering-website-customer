/**
 * Third-party tracking ids (Google Analytics, Facebook Pixel, Segment,
 * OneSignal): sites that never set one up keep the config's filler text
 * ("Add your Google Analytics ID"…) or '0', and mounting the tracker on
 * that produces an avoidable console error on every load. These helpers
 * tell a real id from a blank/placeholder one before it's used.
 */

/** Blank (null/undefined/''/whitespace/'0'/0) or a config's filler text ("Add your…"). */
export const isPlaceholderId = (value) => {
  if (value == null || value === 0) return true
  const text = String(value).trim()
  if (!text || text === '0') return true
  return /^add your/i.test(text)
}

/** The trimmed id if it looks like a GA4 (`G-XXXX`) or UA (`UA-123-1`) id; else null. */
export const validGoogleAnalyticsId = (value) => {
  if (isPlaceholderId(value)) return null
  const text = String(value).trim()
  if (/^G-[A-Za-z0-9]+$/.test(text) || /^UA-\d+-\d+$/.test(text)) return text
  return null
}

/** The trimmed id if it's digits only (a Facebook Pixel id); else null. */
export const validFacebookPixelId = (value) => {
  if (isPlaceholderId(value)) return null
  const text = String(value).trim()
  return /^\d+$/.test(text) ? text : null
}

/** Facebook App ID uses the same `facebook_id` config field and is also digits-only. */
export const validFacebookAppId = validFacebookPixelId

/** The trimmed id if it's a UUID (8-4-4-4-12 hex, a OneSignal app id); else null. */
export const validOneSignalAppId = (value) => {
  if (isPlaceholderId(value)) return null
  const text = String(value).trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text) ? text : null
}

/**
 * The tracking ids App.js mounts the Analytics/FacebookPixel/Segment
 * trackers with: the single business's own id when `singleBusiness` is
 * active, else the project's config id; null (never mount) when that value
 * is blank or a placeholder.
 */
export const integrationIds = ({ configs, settings, singleBusiness } = {}) => {
  const ga = singleBusiness ? settings?.store_google_analytics_id : configs?.track_id_google_analytics?.value
  const pixel = singleBusiness ? settings?.store_facebook_pixel_id : configs?.facebook_id?.value
  const segment = singleBusiness ? settings?.store_segment_id : configs?.segment_track_id?.value

  return {
    gaId: validGoogleAnalyticsId(ga),
    pixelId: validFacebookPixelId(pixel),
    segmentKey: isPlaceholderId(segment) ? null : String(segment).trim()
  }
}
