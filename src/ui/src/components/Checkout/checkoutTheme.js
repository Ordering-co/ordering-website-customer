import { getThemeComponent, getThemeCss } from '~/utils/themeCss'
import { slotButtonProps, themeSlot } from '~/utils/themeGroups'
import { themeColor } from '~/utils/themeColors'
import { rgbOf } from '@orderingco/ordering-theme-engine/colors'

/**
 * The checkout pages (/checkout and /multi-checkout):
 * `components.checkout` (its `multi` variant on the multi-checkout) sets the
 * columns, the section titles, the business of the order, the totals and the
 * mobile bar (the page title is components.section_header's); its `slots` the place order buttons, "Change" of the payment and the
 * "Required" flag. `components.driver_tips` sets the driver tips block (its
 * `multi` variant on the multi-checkout).
 */
export const CHECKOUT = 'checkout'
export const DRIVER_TIPS = 'driver_tips'

// From this width the checkout is two columns side by side
export const CHECKOUT_COLUMNS_MIN = 769

// `component`'s base with its `multi` variant over it (`multi`), from one
// form of it: its values (getThemeComponent) or its CSS (getThemeCss)
const withVariant = (component, multi) => {
  if (!multi) return component.base
  const { states, ...variant } = component.variants?.multi || {}
  return { ...component.base, ...variant }
}

/** The values of `component` (`multi`: its multi variant over the base), to compute with. */
const componentTheme = (theme, component, multi) => withVariant(getThemeComponent(theme, component), multi)

/** The same as CSS (its view): lengths with their unit, texts CssText. */
const componentCss = (theme, component, multi) => withVariant(getThemeCss(theme, component), multi)

export const checkoutTheme = (theme, { multi = false } = {}) => componentTheme(theme, CHECKOUT, multi)
const checkoutCss = (theme, { multi = false } = {}) => componentCss(theme, CHECKOUT, multi)
/** The inset shared by the checkout column and the dividers that bleed across it. */
export const checkoutInlinePadding = (theme, options) => checkoutCss(theme, options).padding_x

const driverTipsCss = (theme, { multi = false } = {}) => componentCss(theme, DRIVER_TIPS, multi)

// A text prop and its color prop of a component's CSS
const textWithColor = (props, textKey, colorKey) => `${props[textKey].css}\ncolor: ${props[colorKey]};`

/** The title of a section of the page (`section_title`, `section_title_color`). */
export const checkoutSectionTitleCss = (theme, options) => textWithColor(checkoutCss(theme, options), 'section_title', 'section_title_color')

/** The name of the business of the order (`business_name`). */
export const checkoutBusinessNameCss = (theme) => checkoutCss(theme).business_name.css

/** The space between the sections of a column (`section_gap`). */
export const checkoutGap = (theme, options) => checkoutCss(theme, options).section_gap

/**
 * One column on wide screens, `main` (details) or `side`
 * (review and submit): its share of the width (`main_width`, the side takes
 * the rest) and its padding (`padding_y`, `padding_x`).
 */
export const checkoutColumnCss = (theme, column, options) => {
  const mainWidth = checkoutTheme(theme, options).main_width
  const width = column === 'main' ? mainWidth : 100 - mainWidth
  const { padding_y: paddingY, padding_x: paddingX } = checkoutCss(theme, options)
  return `@media (min-width: ${CHECKOUT_COLUMNS_MIN}px) { width: ${width}%; padding: ${paddingY} ${paddingX}; }`
}

/**
 * Proposal B's two columns side by side: the details take `main_width` (a
 * percentage of the width), the summary the rest, and the summary never
 * goes under CHECKOUT_SUMMARY_MIN (its rows and the CTA stop fitting).
 */
export const CHECKOUT_SUMMARY_MIN = 340
export const checkoutGridColumns = (theme, options) => {
  const mainWidth = checkoutTheme(theme, options).main_width
  return `minmax(0, ${mainWidth}fr) minmax(${CHECKOUT_SUMMARY_MIN}px, ${100 - mainWidth}fr)`
}

/**
 * implementation notes round 4: the checkout's own padding (`padding_y`, `padding_x`),
 * without a column's width share — proposal B fixes the split at 1.25fr/1fr
 * (the grid itself, in styles.js) instead of `main_width` dividing it; this
 * keeps `padding_y`/`padding_x` theme-adjustable, same as checkoutColumnCss.
 */
export const checkoutPaddingCss = (theme, options) => {
  const { padding_y: paddingY, padding_x: paddingX } = checkoutCss(theme, options)
  return `@media (min-width: ${CHECKOUT_COLUMNS_MIN}px) { padding: ${paddingY} ${paddingX}; }`
}

/**
 * The box of the business logo of a screen's `component` (`checkout`,
 * `order_details`): its `business_logo_size` and `business_logo_radius`; the
 * logo is contained in the box, whole and centered (a wide or tall logo is
 * never cropped, implementation notes). Goes in
 * the block that holds `.business-logo` (and the img and
 * `.business-logo-placeholder` in it). `size` (CSS) replaces
 * `business_logo_size` for a compact row.
 */
export const businessLogoCss = (theme, component, { size } = {}) => {
  const { business_logo_size: logoSize, business_logo_radius: radius } = componentCss(theme, component)
  const box = size || logoSize
  return `
    .business-logo, img, .business-logo-placeholder { width: ${box}; height: ${box}; }
    img, .business-logo-placeholder { border-radius: ${radius}; }
    img { object-fit: contain; object-position: center; }
  `
}

/*
 * Proposal B's store row (the summary card) takes the theme's business
 * values with a cap (implementation notes, option b), so the row stays one compact
 * line however large a theme set them for the old layout:
 * - business_logo_size: up to CHECKOUT_LOGO_MAX px (a smaller one as set);
 * - business_name: its family, letter spacing and case, at most the body
 *   text's size (a smaller one as set), always bold body weight — never the
 *   heading it is in the old layout;
 * - totals_padding: the totals block's room above and below, no card or
 *   border (checkoutTotalsBlockCss).
 */
export const CHECKOUT_LOGO_MAX = 40

/** The store row's logo box: business_logo_size capped at CHECKOUT_LOGO_MAX, the checkout's business_logo_radius. */
export const checkoutStoreRowLogoCss = (theme) => {
  const set = Number(checkoutTheme(theme).business_logo_size)
  const size = Number.isFinite(set) && set > 0 ? Math.min(set, CHECKOUT_LOGO_MAX) : CHECKOUT_LOGO_MAX
  return businessLogoCss(theme, CHECKOUT, { size: `${size}px` })
}

/** The store row's business name: business_name's face at most the body size, bold body weight. */
export const checkoutStoreRowNameCss = (theme) => {
  const name = checkoutCss(theme).business_name || {}
  const nameSize = Number(checkoutTheme(theme).business_name?.size)
  const bodySize = Number(theme?.values?.tokens?.typography?.body?.size)
  const sizes = [nameSize, bodySize].filter((n) => Number.isFinite(n) && n > 0)
  return [
    name.family && `font-family: ${name.family};`,
    sizes.length && `font-size: ${Math.min(...sizes)}px;`,
    'font-weight: 600;',
    name.letter_spacing && `letter-spacing: ${name.letter_spacing};`,
    name.transform && `text-transform: ${name.transform};`
  ].filter(Boolean).join('\n')
}

/** The totals block of the summary: totals_padding above and below it, no card. */
export const checkoutTotalsBlockCss = (theme) => {
  const padding = checkoutCss(theme).totals_padding
  return `padding-top: ${padding}; padding-bottom: ${padding};`
}

/** The padding of the totals' card (`totals_padding`). */
export const checkoutTotalsPadding = (theme, options) => checkoutCss(theme, options).totals_padding

/** The props of a button slot of the checkout (`place_order`, `place_order_mobile`, `payment_change`). */
export const checkoutButtonProps = (theme, slot) => slotButtonProps(theme, CHECKOUT, slot)

/** The badge variant of the "Required" flag (`slots.required`), null: the flag's text in the danger color. */
export const checkoutRequiredVariant = (theme) => themeSlot(theme, CHECKOUT, 'required')?.variant || null

/** The driver tips' subtitle (`subtitle`, `subtitle_color`); its title is a section title of the checkout. */
export const driverTipsSubtitleCss = (theme, options) => textWithColor(driverTipsCss(theme, options), 'subtitle', 'subtitle_color')

/** The space between the tip amounts (`gap`). */
export const driverTipsGap = (theme) => driverTipsCss(theme).gap

/**
 * The items of one column of a page of sections (`sections` of
 * usePageSections) in the theme's order: each section of `group` that is
 * visible, or `forced` (a section the order needs whatever the theme says),
 * calls its renderer with its visibility, which returns its node (or
 * nothing); `dividers[key]` puts a divider after it. With `tidy` (the theme
 * orders and hides) a divider stands between every two
 * painted sections of the column, whichever they are: none at the ends,
 * never two in a row. Without it the dividers stay where the sections put
 * them, as today.
 *
 * Returns `[{ key, node } | { key, divider: true }]`.
 */
export const sectionItems = (sections, group, renderers, { forced = {}, dividers = {}, tidy = false } = {}) => {
  const items = []
  ;(sections || []).forEach(({ key, group: sectionGroup, visible }) => {
    if (sectionGroup !== group || !(visible || forced[key])) return
    const renderer = renderers?.[key]
    if (typeof renderer !== 'function') return
    const node = renderer(visible)
    if (node) items.push({ key, node })
    if (dividers[key]) items.push({ key: `${key}-divider`, divider: true })
  })
  if (!tidy) return items
  const tidied = []
  items.filter((item) => !item.divider).forEach((item, index) => {
    if (index > 0) tidied.push({ key: `${item.key}-divider`, divider: true })
    tidied.push(item)
  })
  return tidied
}

/**
 * The color of the business's marker on the checkout's map: the theme's
 * primary (a hex, rgb() or rgba(), read by the engine's rgbOf) as the Static
 * Maps API writes a color, `0xRRGGBB`.
 */
export const checkoutMapMarkerColor = (theme) => {
  const { r, g, b } = rgbOf(themeColor(theme, 'primary'))
  return `0x${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}
