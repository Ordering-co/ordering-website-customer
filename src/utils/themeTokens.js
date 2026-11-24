import { alpha, snapWeight } from '@orderingco/ordering-theme-engine/css'
import { getThemeCss } from './themeCss'
import { motionCss, stateMotionCss } from './themeMotion'
import { themeVisible } from './themeVisibility'

/**
 * Non-color tokens of the theme (shadows, radii, typography, border
 * widths). The theme is always complete and valid (the engine's runtime,
 * appTheme.js), and its CSS is built once per theme (its view, `theme.css`):
 * the helpers read that CSS as it is, and compute nothing a theme already
 * has.
 *
 * `component` names a component of the schema (`business_card`, `modal`…):
 * when the theme defines that prop for it (`components.<name>.base`), it wins
 * over the loose token.
 */

const componentBase = (theme, component) => (component ? getThemeCss(theme, component).base : null)

// `component` or `{ component, fixed, … }`.
const tokenOptions = (options) => typeof options === 'string' ? { component: options } : (options || {})

/**
 * The shadow of a level (`tokens.shadow[level]`: `sm`, `md`, `lg`, `xl`,
 * `none`), a CssShadow. A spot paints it with the theme-wide shadow size
 * (`tokens.shadow_style.size`, chosen in Identity: the view's `identity`),
 * which replaces the level like the API does for the components. `fixed`
 * keeps the level: a state (hover, focus, active, one step up) or a spot
 * without a background, which would draw a box around nothing. `none` stays
 * none.
 */
const levelShadow = (theme, level, fixed) => (fixed ? theme.css.tokens.shadow : theme.css.identity.shadow)[level]

/**
 * The shadow of a level or of a component (`options` as themeShadow) as a
 * CssShadow: `css` (`box-shadow`), the same shadow cast `down`, `up`,
 * `right` and `left`, as a `filter` (`drop`) and how far it reaches past
 * its box (`reach`, px).
 */
export const themeShadowParts = (theme, level, options) => {
  const { component, fixed } = tokenOptions(options)
  const base = componentBase(theme, component)
  return base && 'shadow' in base ? base.shadow : levelShadow(theme, level, fixed)
}

/**
 * `box-shadow` value: `tokens.shadow[level]` (`sm`, `md`, `lg`, `xl`, `none`)
 * or the component's shadow; `none` for a null shadow. `options` is a
 * component name or `{ component, fixed }` (see levelShadow).
 */
export const themeShadow = (theme, level, options) => themeShadowParts(theme, level, options).css

/**
 * `border-radius` value: `tokens.radius[level]` (`none` … `full`) or the
 * component's radius, as a CSS length. A level is painted with the
 * theme-wide rounding (`tokens.border_style.radius`, chosen in Identity: the
 * view's `identity`), except `none` and `full` (squares, circles and pills
 * stay so).
 */
export const themeRadius = (theme, level, component) => {
  const base = componentBase(theme, component)
  return base && 'radius' in base ? base.radius : theme.css.identity.radius[level]
}

/**
 * `border-width` value: `tokens.border.thin` / `thick`. With the theme-wide
 * border width (`tokens.border_style.width`, chosen in Identity) the box of
 * an element takes it: `thin` / `thick` replace the level, `none` removes
 * the border (0px). `options` `{ fixed: true }` keeps the level: dividers,
 * underlines, states, checkbox and radio boxes, borders that draw a shape
 * (buttons, chips, circles), like the API does for the components.
 */
export const themeBorderWidth = (theme, level, options) =>
  (tokenOptions(options).fixed ? theme.css.tokens.border : theme.css.identity.border)[level]

/**
 * `border-style` of the box of an element: the theme-wide style
 * (`tokens.border_style.style`: solid, dashed, dotted).
 */
export const themeBorderStyle = (theme) => theme.css.identity.border_style

const HEADING_STYLES = new Set(['display', 'h1', 'h2', 'h3', 'h4'])

// The font role of a typography level: headings `heading`, the rest `body`
const roleOf = (style) => (HEADING_STYLES.has(style) ? 'heading' : 'body')

// Each CSS property of a text style, by the CssText part it reads
const TEXT_PARTS = [['family', 'font-family'], ['size', 'font-size'], ['line', 'line-height'], ['weight', 'font-weight'], ['letter_spacing', 'letter-spacing'], ['transform', 'text-transform']]

// The declarations of a text's parts (`parts`: its CssText's, some replaced),
// in a CssText's order; a part that is null or left out declares nothing.
const textDeclarations = (parts) => TEXT_PARTS
  .filter(([part]) => parts[part] !== null && parts[part] !== undefined)
  .map(([part, property]) => `${property}: ${parts[part]};`)
  .join('\n')

// The CSS of themeText, once per text and options (its view keeps the text,
// so the same theme gives the same string without building it again).
const textCache = new WeakMap()

const cachedText = (text, key, build) => {
  if (!textCache.has(text)) textCache.set(text, new Map())
  const byKey = textCache.get(text)
  if (!byKey.has(key)) byKey.set(key, build())
  return byKey.get(key)
}

/**
 * Text declarations of a typography style: `tokens.typography[style]` or the
 * component's text, with the font of its role (headings → `font.heading`, the
 * rest → `font.body`) when the style names none.
 *
 * `options` is a component name or `{ component, props, important, weight }`:
 * `props` limits the output to the properties the block declares
 * (`size`, `weight`, `line`, `family`, `letter_spacing`, `transform`), so what
 * it inherits keeps coming from its parent; `important` adds `!important`
 * to each declaration.
 *
 * `weight` is the weight the block keeps (600, 'bold'…; decided by Luis: the
 * bold a text has is respected), painted instead of the level's when `props`
 * has `weight`; the theme sets size, line and family. Either weight is the
 * nearest one the font has (snapWeight of the engine's css), so the text is
 * painted with a loaded face.
 */
export const themeText = (theme, style, options) => {
  const { component, props, important, weight } = tokenOptions(options)
  const own = componentBase(theme, component)?.text
  const text = own || theme.css.tokens.typography[style]
  const source = own ? theme.values.components[component].base.text : theme.values.tokens.typography[style]
  // the font it is painted with: its own, else its level's role's
  const role = theme.css.fonts[roleOf(style)]
  const fontId = source.family || role.id
  const key = `${fontId}|${props ? props.join(',') : '*'}|${weight ?? ''}|${important ? 1 : 0}`
  return cachedText(text, key, () => {
    const keep = Array.isArray(props) ? new Set(props) : null
    const parts = Object.fromEntries(TEXT_PARTS.map(([part]) => [part, !keep || keep.has(part) ? text[part] : null]))
    if (!keep || keep.has('family')) parts.family = source.family ? text.family : role.family
    if (!keep || keep.has('weight')) parts.weight = snapWeight(fontId, (keep && weight) ?? source.weight)
    const css = textDeclarations(parts)
    return important ? css.replace(/;/g, ' !important;') : css
  })
}

/**
 * `themeText` as a map of its declarations (`{ 'font-size': '16px', … }`), for
 * what takes a text style one property at a time (CSS variables).
 */
export const themeTextParts = (theme, style, options) => Object.fromEntries(
  themeText(theme, style, options).split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const match = line.match(/^([a-z-]+):\s*(.*);$/)
      if (!match) throw new Error(`themeTextParts: unexpected declaration "${line}"`)
      return [match[1], match[2]]
    })
)

// The typography of each heading level; the theme has no h5 / h6, they are
// its smallest heading (h4).
const HEADING_TEXT = { h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h4', h6: 'h4' }

/**
 * The whole typography of a heading level (`h1`…`h6`) (size, line, weight,
 * family, letter spacing, transform): a heading is what the theme says,
 * nothing of its own.
 */
export const headingText = (theme, level) => themeText(theme, HEADING_TEXT[level] || 'h4')

/**
 * Base rule of every heading element (global
 * style): the typography of its level, for the headings without a rule of
 * their own.
 */
export const headingsCss = (theme) => {
  return Object.keys(HEADING_TEXT)
    .map((level) => `${level} { ${headingText(theme, level)} }`)
    .join('\n')
}

/**
 * Font family of a role (`heading` / `body`), as CSS (`'Inter', sans-serif`):
 * the containers that use `fonts.special` today read the body font, the
 * titles the heading font.
 */
export const themeFontFamily = (theme, role) => theme.css.fonts[role].family

/**
 * `filter` value of `tokens.shadow[level]` as drop shadows: one
 * `drop-shadow()`, or four for a solid "around" shadow (drop-shadow() has no
 * spread: an outline is drawn as four offset by it), or `none`.
 */
export const themeDropShadow = (theme, level, options) => levelShadow(theme, level, tokenOptions(options).fixed).drop

const STYLE_KEYS = { fontSize: 'size', lineHeight: 'line', fontWeight: 'weight', fontFamily: 'family' }

/**
 * themeText for a React style object: `current` is the object of today
 * (`{ fontSize: 14 }`); the same keys come from the
 * typography style, the rest of the object is kept.
 */
export const themeTextStyle = (theme, style, current = {}) => {
  const text = theme.css.tokens.typography[style]
  const font = theme.css.fonts[roleOf(style)]
  const out = { ...current }
  Object.entries(STYLE_KEYS).forEach(([key, prop]) => {
    if (!(key in current)) return
    if (prop === 'family') {
      out[key] = font.family
      return
    }
    // The weight of today is kept (see themeText), as the nearest one the
    // level's font has.
    if (prop === 'weight') {
      out[key] = snapWeight(theme.values.tokens.typography[style].family || font.id, current[key])
      return
    }
    // (the line is a ratio of the size: a unitless lineHeight)
    out[key] = text[prop]
  })
  return out
}

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const getPath = (source, path) => path.split('.').reduce((node, key) => (isPlainObject(node) ? node[key] : undefined), source)

// A value of the view as the CSS of `cssProp`: a text style its declarations,
// a shadow its `box-shadow`, a font role its family, the rest as it is
const partDeclaration = (theme, cssProp, value) => {
  if (value === null || value === undefined) return ''
  if (cssProp === 'text') return value.css
  if (cssProp === 'font-family') return `font-family: ${theme.css.fonts[value].family};`
  if (cssProp === 'box-shadow') return `box-shadow: ${value.css};`
  return `${cssProp}: ${value};`
}

/**
 * Declarations from one component of the theme
 * (`components.<component>`, its CSS: getThemeCss): `map` is
 * `{ cssProp: 'path' }`, e.g. `{ background: 'base.background', border:
 * 'base.border', 'box-shadow': 'base.shadow', 'border-radius': 'base.radius',
 * text: 'base.name' }`. Each value is CSS already (a length with its unit, a
 * border or `none`, a color); `text` takes a text style's declarations,
 * `box-shadow` a shadow's, `font-family` the family of a font role. A value
 * the theme leaves null declares nothing. Appended last in the element's
 * block, it wins over the current CSS.
 */
export const themePart = (theme, component, map) => {
  const comp = getThemeCss(theme, component)
  return Object.entries(map)
    .map(([cssProp, path]) => partDeclaration(theme, cssProp, getPath(comp, path)))
    .filter(Boolean)
    .join('\n')
}

// `box-shadow` declaration of a component's shadow (`components.<component>.
// <path>`) cast to `side`; empty for a component without that shadow
const sideShadow = (theme, component, path, side) => {
  const shadow = getPath(getThemeCss(theme, component), path)
  return shadow ? `box-shadow: ${shadow[side]};` : ''
}

/**
 * `box-shadow` declaration of a component's shadow (`components.<component>.
 * <path>`) cast down whatever the theme's direction: a bar that spans the
 * whole width (the header, a bar fixed on scroll) only has a side below.
 * Empty for a component without that shadow.
 */
export const themeShadowDown = (theme, component, path = 'base.shadow') => sideShadow(theme, component, path, 'down')

/**
 * `box-shadow` declaration of a component's shadow cast up whatever the
 * theme's direction: a bar that spans the whole width at the bottom (the
 * bottom navigation, the cart bar) only has a side above. Empty for a
 * component without that shadow.
 */
export const themeShadowUp = (theme, component, path = 'base.shadow') => sideShadow(theme, component, path, 'up')

/**
 * `box-shadow` declaration of a component's shadow cast to `side` (`right`,
 * `left`…) whatever the theme's direction: a side panel the full height of
 * the screen only has the side facing the page. Empty for a component
 * without that shadow.
 */
export const themeShadowToward = (theme, component, side, path = 'base.shadow') => sideShadow(theme, component, path, side)

/**
 * One raw value of a component of the theme
 * (`components.<component>.<path>`), for JS (gradients, inline styles); null
 * where the theme says none (a nullable border, shadow or overlay).
 */
export const themeValue = (theme, component, path) => getPath(theme.values.components[component], path)

/**
 * The chevron of a collapsible (an accordion's open/close icon):
 * `components.accordion.base.chevron_color` as its color
 * and `chevron_size` (px) as its size. Goes in the rule of the chevron's svg
 * (react-icons paint with currentColor; a `size` prop is only the svg's
 * width/height attributes, which CSS overrides).
 */
export const accordionChevronCss = (theme) => {
  const { chevron_color: color, chevron_size: size } = getThemeCss(theme, 'accordion').base
  return `color: ${color}; font-size: ${size}; width: ${size}; height: ${size};`
}

/**
 * The contour of a chip of the theme in its state: `base.border`
 * not selected, `variants.default.states.selected.border` selected (without
 * one, the base's width in its background color, so selecting it does not
 * change its size), or null when the theme gives it none (the chip's border
 * is then the color of its background).
 */
export const chipBorder = (theme, selected) => {
  const chip = theme.values.components.chip
  const base = chip.base.border
  const own = selected ? chip.variants.default.states.selected.border : null
  if (own) return own
  if (selected && base) return { width: base.width, style: base.style, color: null }
  return base
}

/**
 * A chip of the theme (`components.chip`): base colors, radius,
 * border and text, `variants.default.states.selected` when selected; hovered
 * or pressed (not selected) its `pressed` background, selected its colors.
 */
export const chipCss = (theme, selected) => {
  const { base, variants } = theme.values.components.chip
  const { background, color } = selected ? variants.default.states.selected : base
  // hovered or pressed, a chip that is not selected takes its `pressed` state
  // (`variants.default.states.pressed`); selected, it keeps its colors
  // (restated over the hover of its own CSS)
  const hover = selected ? background : variants.default.states.pressed.background
  // its contour (chipBorder): a border of its own color stays on hover;
  // without one the border is the color of its background
  const border = chipBorder(theme, selected)
  const borderColor = border?.color
  const line = border
    ? `border: ${border.width}px ${border.style || 'solid'} ${borderColor || background};`
    : `border-color: ${background};`
  const { radius, text } = getThemeCss(theme, 'chip').base
  return `
    background: ${background};
    color: ${color};
    ${line}
    border-radius: ${radius};
    ${text.css}
    svg { color: ${color}; }
    &:hover, &:active {
      background: ${hover};
      color: ${color};
      border-color: ${borderColor || hover};
    }
    &:hover svg, &:active svg { color: ${color}; }
  `
}

/**
 * `tokens.opacity[level]` (`disabled`, `pressed`).
 */
export const themeOpacity = (theme, level) => theme.css.tokens.opacity[level]

/**
 * A badge of the theme (`components.badge`) in one of its variants
 * (`primary`, `danger`; a variant the theme lacks is the primary): the
 * variant's background and color, the base radius (a pill is `{radius.full}`)
 * and text.
 */
export const themeBadgeCss = (theme, variant = 'primary') => {
  const key = variant in theme.values.components.badge.variants ? variant : 'primary'
  return themePart(theme, 'badge', {
    background: `variants.${key}.background`,
    color: `variants.${key}.color`,
    'border-radius': 'base.radius',
    text: 'base.text'
  })
}

/**
 * The header and modal controls that are not a button of the theme (close,
 * share, favorite, the address, the selects): still,
 * like every button. Their states change at once, or fade their colors as
 * the button's (`components.button.base.animated`), and hover or press do
 * not move them; appended last in the block, it replaces each one's own
 * motion (scales, lifts).
 */
export const buttonStill = (theme) => {
  return `
    ${stateMotionCss(theme, 'button')}
    &:hover, &:active {
      transform: none;
    }
  `
}

/**
 * A block that is not a control (a card, a section, an image, a
 * text, a badge) does not move: no transition of its own and no lift or zoom
 * on hover or press. A hover that changes its color or shadow does it at
 * once. Appended last in the block, it replaces its own motion. A block
 * placed with a transform (centered with translate) restates that transform
 * on hover instead.
 */
export const blockStill = (theme) => {
  return `
    transition: none;
    &:hover, &:active {
      transform: none;
    }
  `
}

/**
 * The hover of a card (`business_card`, `product_card`,
 * `order_card`): its `variants.default.states.hover.shadow` (none when null),
 * never a movement; the shadow fades at the card's speed when the theme
 * animates it (`base.animated`), else changes at once. Appended last in the
 * card's block.
 */
export const cardHoverCss = (theme, component) => {
  const hover = getThemeCss(theme, component).variants.default.states.hover
  return `${motionCss(theme, component, ['box-shadow'])}\n&:hover { box-shadow: ${hover.shadow.css}; }`
}

//  The size every control takes when the screen chooses none
export const DEFAULT_CONTROL_SIZE = 'md'

/**
 * The height of a control of the theme (`components.<component>.
 * sizes[size].height`, sm | md | lg, md by default; a size the component
 * lacks is its md). Every control's height comes from these sizes:
 * a button, a field and a tab of the same size line up.
 */
export const themeControlHeight = (theme, component, size = DEFAULT_CONTROL_SIZE) => {
  const sizes = theme.values.components[component].sizes
  return (sizes[size] || sizes[DEFAULT_CONTROL_SIZE]).height
}

/**
 * A space of the theme (`tokens.space[level]`: none, xxs, xs,
 * sm, md, lg, xl, xxl, xxxl) in px.
 */
export const themeSpace = (theme, level) => theme.css.tokens.space[level]

/**
 * A size of the theme (`tokens.size[level]`: sm, md, lg, xl) in px: the
 * height of a control by level, and what lines up with it (a logo the
 * size of a control).
 */
export const themeSize = (theme, level) => theme.css.tokens.size[level]

/**
 * A media box of the theme (`components.media.base[level]`: 3xs, 2xs, xs, sm,
 * md, lg, xl, 2xl, 3xl, 4xl, 5xl) in px: the side of a store logo, product
 * thumbnail, portrait or artwork. Not a control size (`themeSize`) and not an
 * icon (`themeIconSize`): it reserves the box an image takes before it loads.
 * A banner, a map or a 16:9 photo is fluid (width 100% and an aspect-ratio),
 * not a level. The sizes of the levels and the px each screen moves are in
 * docs/design-system/px-map.md («Medios»).
 */
export const themeMedia = (theme, level) => getThemeCss(theme, 'media').base[level]

/**
 * The side space of the page in px (`tokens.layout.page_gutter`, a number):
 * the header's sides, the account pages, the side menu, the business list.
 */
export const pageGutter = (theme) => theme.values.tokens.layout.page_gutter

/**
 * The layout of the business listing and the account pages
 * (`tokens.layout.mode`: `original`, `appointments`).
 */
export const themeLayoutMode = (theme) => theme.values.tokens.layout.mode

/**
 * The keyboard focus ring of the theme (`tokens.focus_ring`): its
 * `width` (a level of `tokens.border`), its `offset` off the control (a level
 * of `tokens.space`) and its `color` (a key of `tokens.color`), as
 * `{ width, offset, color }` in CSS.
 */
export const themeFocusRing = (theme) => theme.css.identity.focus_ring

/**
 * The scrollbar of the theme (`tokens.scrollbar`): its `size` (the
 * width of a vertical one, the height of a horizontal one) and its thumb's
 * `radius`, in px.
 */
export const themeScrollbar = (theme) => theme.css.identity.scrollbar

/** The opacity of a loading layer's veil (fixed). */
export const SCRIM_OPACITY = 0.7

/**
 * The veil of a loading layer over the page (a list being refreshed under
 * it): `tokens.color.background` at `SCRIM_OPACITY` (transparent for a
 * transparent background).
 */
export const themeScrim = (theme) => alpha(theme.values.tokens.color.background, SCRIM_OPACITY)

/**
 * An icon size of the theme (`tokens.icon[level]`: sm, md, lg) in px.
 */
export const themeIconSize = (theme, level) => theme.css.tokens.icon[level]

/**
 * The URL of an image of the theme (`images[key]`, a key of
 * `product.schema.json` images such as 'empty.not_found'), or null. An image
 * the theme leaves empty is the bundle's own (THEME_IMAGE_DEFAULTS of
 * src/utils/bundledImages.js, put there by buildAppTheme), or null when the
 * bundle has none.
 */
export const themeImage = (theme, key) => theme.values.images[key] || null

/**
 * The generic store logo (`images.placeholder.business_logo`), only when
 * `visibility.business.dummy_logo` shows it; null otherwise (no business
 * logo element, instead of a broken/empty one).
 */
export const businessLogoPlaceholder = (theme) =>
  themeVisible(theme, 'business.dummy_logo') ? themeImage(theme, 'placeholder.business_logo') : null

/**
 * The declarations of a text prop of a component
 * (`components.<component>.<path>`, e.g. 'base.total'), a text that is not a
 * heading: its size, line, family, letter spacing and transform; its weight
 * unless `options.weight` keeps the block's own (as themeText keeps it).
 */
export const themePartText = (theme, component, path, { weight } = {}) => {
  const text = getPath(getThemeCss(theme, component), path)
  if (weight === undefined || weight === null) return text.css
  return cachedText(text, `weight|${weight}`, () => {
    const family = getPath(theme.values.components[component], path).family
    // painted with its own font, else the one its view names (its role's or the body's)
    const font = family || Object.values(theme.css.fonts).find((role) => role?.family === text.family)?.id
    return text.css.replace(/font-weight: [^;]*;/, `font-weight: ${snapWeight(font, weight)};`)
  })
}
