import { complete } from '@orderingco/ordering-theme-engine/runtime'
import { fonts, toCss } from '@orderingco/ordering-theme-engine/css'
import THEME_COMPILED from '../theme.compiled.json'
import { THEME_IMAGE_DEFAULTS } from './bundledImages'

/**
 * Builds the styled-components theme of the app:
 *
 *   { values: <complete values>, css: <its CSS view>, themeMeta: { productType, schemaVersion, preset, siteThemeId, updatedAt } }
 *
 * `values` is the remote theme's values (`{ version: 2, values }`) completed
 * by the theme engine's runtime (`complete` of
 * `@orderingco/ordering-theme-engine/runtime`) with src/theme.compiled.json,
 * the schema compiled for it (`pnpm theme:compile`: the defaults of
 * product.schema.json, what api-core serves for a theme that sets nothing,
 * with the rule of each value): every key of the schema, a value the web does
 * not understand is the default, a number is clamped to its range, a key the
 * schema lacks is dropped. It always carries every key of the schema: without
 * a v2 theme, with a broken one or with a partial one (`complete: false`) the
 * defaults fill in. Each image the theme leaves empty is the bundle's own
 * (THEME_IMAGE_DEFAULTS).
 *
 * A partial theme is completed as it comes: the API sends it resolved, so what
 * follows a token it sets (a component's `{color.primary}`, the derived
 * pressed and subtle colors) keeps the default's value.
 *
 * `css` is the same values as CSS (`toCss` of
 * `@orderingco/ordering-theme-engine/css`): each value converted by its type
 * in the schema once per theme (a component the first time it is read), so
 * the helpers read CSS instead of computing it. Never change either: their
 * objects are shared.
 */

// The schema's defaults: what a theme that sets nothing is
const THEME_DEFAULTS = complete(THEME_COMPILED, null)

export { THEME_DEFAULTS }

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

export const isThemeEnvelope = (remoteTheme) => remoteTheme?.version === 2 && isObject(remoteTheme?.values)

const isPath = (value) => typeof value === 'string' && !!value.trim()

// The bundle's images keyed by the theme's image keys; `local.images` adds or
// replaces some (the tests pass their own).
const localImages = (local) => {
  const own = isObject(local?.images)
    ? Object.fromEntries(Object.entries(local.images).filter(([, value]) => isPath(value)))
    : {}
  return { ...THEME_IMAGE_DEFAULTS, ...own }
}

/**
 * The complete values of a theme: `values` (the remote theme's, or nothing)
 * over the defaults; each image without a URL is the bundle's, or ''.
 */
export const buildThemeValues = (values, images = THEME_IMAGE_DEFAULTS) => {
  const completed = complete(THEME_COMPILED, values ?? null)
  // (an image of the theme is an http(s) URL, or '' for none)
  completed.images = Object.fromEntries(Object.entries(completed.images).map(([key, url]) => [key, url || images[key] || '']))
  return completed
}

const themeMeta = (remoteTheme) => ({
  productType: remoteTheme?.product_type ?? null,
  schemaVersion: remoteTheme?.schema_version ?? null,
  preset: remoteTheme?.preset ?? null,
  siteThemeId: remoteTheme?.site_theme_id ?? null,
  updatedAt: remoteTheme?.updated_at ?? null
})

const appTheme = (values, envelope) => ({ values, css: toCss(THEME_COMPILED, values), themeMeta: themeMeta(envelope) })

// The app's theme of each envelope (and of none: the defaults), built once:
// src/index.js builds it at boot from first_load and App.js gets the same
// envelope from the context, so the boot does not build the theme twice.
const builtThemes = new WeakMap()
const DEFAULTS_KEY = {}

/**
 * Entry point (App.js, src/index.js).
 * @param {object} [local] `{ images }`: images of the bundle by theme key, over THEME_IMAGE_DEFAULTS
 * @param {object} [remoteTheme] the v2 envelope of the site; anything else gives the defaults
 */
export const buildAppTheme = (local, remoteTheme) => {
  const images = localImages(local)
  const envelope = isThemeEnvelope(remoteTheme) ? remoteTheme : null
  const key = local ? null : (envelope || DEFAULTS_KEY)
  if (key && builtThemes.has(key)) return builtThemes.get(key)
  let theme
  try {
    theme = appTheme(buildThemeValues(envelope?.values, images), envelope)
  } catch (_) {
    // A theme this cannot read keeps the defaults instead of taking the app down.
    theme = appTheme(buildThemeValues(null, images), null)
  }
  if (key) builtThemes.set(key, theme)
  return theme
}

// ── Fonts ────────────────────────────────────────────────────────────────

/**
 * The weights CSS blocks keep through the `weight` option of themeText /
 * themePartText (a block keeps its own weight, decided by Luis), by the role
 * of the level they name (headings: display, h1–h4; the rest: body). They
 * are literals in the styles, so they are listed here for the font request;
 * `bold` is 700, `normal` 400. A test scans src/ for themeText / headingText /
 * themePartText / themeTextStyle calls and fails when one keeps a weight
 * this list lacks.
 */
export const KEPT_WEIGHTS = {
  heading: [100, 300, 400, 500, 600, 700, 800],
  body: [300, 400, 500, 600, 700, 800]
}

/**
 * The Google Fonts stylesheets of the theme's two font roles
 * (`tokens.font.heading` / `body`): `{ body: { name, weights, href },
 * heading: { … } }` (`fonts` of the engine's css: every weight the theme
 * paints each font with, and KEPT_WEIGHTS, each the nearest the family has;
 * one stylesheet when both roles are one family). App.js loads them and puts
 * the body family on <body>.
 */
const fontsByView = new WeakMap()

export const themeFonts = (theme) => {
  if (!fontsByView.has(theme.css)) fontsByView.set(theme.css, fonts(theme.css, KEPT_WEIGHTS))
  return fontsByView.get(theme.css)
}

/**
 * The `<link>`s of the theme's fonts, as App.js appends them (`<role>-font-styles`, a stylesheet that
 * another role does not already load): `[{ id, name, href }]`. The server render paints them first so
 * the page does not paint in the fallback font and shift when App.js adds them.
 */
export const themeFontLinks = (theme) => {
  const loaded = new Set()
  return Object.entries(themeFonts(theme))
    .filter(([, font]) => !loaded.has(font.href) && loaded.add(font.href))
    .map(([role, font]) => ({ id: `${role}-font-styles`, name: font.name, href: font.href }))
}
