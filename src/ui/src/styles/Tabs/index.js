import styled, { css } from 'styled-components'
import { getThemeComponent, getThemeCss } from '~/utils/themeCss'
import { themeColor } from '~/utils/themeColors'
import { DEFAULT_CONTROL_SIZE, themeControlHeight } from '~/utils/themeTokens'
import { stateMotionCss } from '~/utils/themeMotion'

const TAB_VARIANTS = ['pill', 'underline', 'plain']

/**
 * The variant of a tab bar: the one the screen fixes (`$variant`), else
 * the theme's default (`tabs.base.variant`).
 */
const tabsThemeKey = (component, forced) => (TAB_VARIANTS.includes(forced) ? forced : component.base.variant)

// The share of the tab an underline indicator spans (`indicator_length`):
// full is the whole tab; medium and small, a stretch centered under the text.
export const INDICATOR_LENGTHS = { full: 100, medium: 50, small: 25 }

/**
 * The line under an active tab: a bar `thickness` high (a CSS length) at the
 * bottom of the tab, of `length` (full, medium, small) and `color`. Drawn on ::after, so it
 * takes no room in the tab (its parent must be positioned).
 */
export const underlineIndicatorCss = ({ color, thickness, length }) => {
  const width = INDICATOR_LENGTHS[length]
  return `&::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: ${(100 - width) / 2}%;
    width: ${width}%;
    height: ${thickness};
    background-color: ${color};
  }`
}

// A border's width; 0 without a border (null).
const borderWidth = (border) => (border ? border.width : 0)

/**
 * How far the bar's shadow (its variant's `shadow`) reaches past
 * each side of the bar, in px (`{ top, right, bottom, left }`). A container
 * that clips it (a row of tabs that scrolls sideways: overflow-x auto clips
 * the other axis too) keeps that much room around the bar. All 0 otherwise.
 */
export const tabsShadowReach = (theme, { variant, size: barSize } = {}) => {
  const tabs = tabsTheme(theme, variant, barSize)
  return tabs.look.shadow.reach
}

const SIDES = ['top', 'right', 'bottom', 'left']

/**
 * The room a container that clips (scrolls sideways) keeps
 * around its tab bar so the bar's shadow is drawn whole, the bar where it
 * was: the reach (tabsShadowReach) added to its padding, taken back from its
 * margins and added to its width. `width`, `margin` and `padding` are the
 * container's own (CSS lengths; `margin` and `padding` by side). Empty with
 * no shadow.
 */
export const tabsShadowRoomCss = (theme, { width = '100%', margin = {}, padding = {}, variant, size: barSize } = {}) => {
  const reach = tabsShadowReach(theme, { variant, size: barSize })
  if (SIDES.every((side) => !reach[side])) return ''
  const pad = (side) => `calc(${padding[side] || '0px'} + ${reach[side]}px)`
  const off = (side) => `calc(${margin[side] || '0px'} - ${reach[side]}px)`
  return `
    box-sizing: border-box;
    padding: ${SIDES.map(pad).join(' ')};
    margin: ${SIDES.map(off).join(' ')};
    width: calc(${width} + ${reach.left + reach.right}px);
  `
}

/**
 * The props of a bar of `$size` (md by default): the variant's, the size's
 * (`sizes[$size]`) and base's as CSS (`look`, `sizeLook`, `baseLook`: its
 * view) and the variant's values to compute with (`props`), and the height
 * of its tabs: the bar's height less what its box takes (pill: its inset and
 * border on both sides; underline: its baseline).
 */
const tabsTheme = (theme, $variant, $size) => {
  const component = getThemeComponent(theme, 'tabs')
  const view = getThemeCss(theme, 'tabs')
  const key = tabsThemeKey(component, $variant)
  const props = component.variants[key]
  const sizeKey = component.sizes[$size] ? $size : DEFAULT_CONTROL_SIZE
  const height = themeControlHeight(theme, 'tabs', $size || DEFAULT_CONTROL_SIZE)
  // Pill tabs with a border right against the bar's border (no inset): they
  // go over it by its width, so the two borders never show double
  const edgeOverlap = key === 'pill' && props.inset === 0 && borderWidth(props.tab_border) > 0 ? borderWidth(props.border) : 0
  let tabHeight = height
  if (key === 'pill') tabHeight = height - 2 * props.inset - 2 * borderWidth(props.border) + 2 * edgeOverlap
  // underline: its border around, the baseline in place of its bottom side;
  // plain: its border around
  if (key === 'underline') tabHeight = height - borderWidth(props.border) - (props.baseline ? borderWidth(props.baseline) : borderWidth(props.border))
  if (key === 'plain') tabHeight = height - 2 * borderWidth(props.border)
  return { key, props, look: view.variants[key], baseLook: view.base, sizeLook: view.sizes[sizeKey], height, edgeOverlap, tabHeight: tabHeight > 0 ? tabHeight : null }
}

/**
 * A height of the bar or of its tabs (px) less what a container's border
 * takes from it: a container that draws a border around the bar (the
 * category bar) sets `--tabs-bar-inset` to its width, so the bar and its
 * tabs, however deep, shrink by it on top and bottom and the whole stays as
 * tall as the size says. Without one, the height as it is.
 */
const insetHeight = (px) => `calc(${px}px - 2 * var(--tabs-bar-inset, 0px))`

/**
 * The bar by its variant, of its size's height (`$size`, md by
 * default). Pill: a box of its background, border, radius and shadow, its
 * tabs `inset` from its edges and `gap` apart. Underline: its background and
 * border, the `baseline` under the whole bar in place of the border's bottom
 * side. Plain: its background and border. Both: their shadow (none unless
 * the theme sets one). Every bar spaces its tabs by its
 * variant's `gap`.
 */
const tabsContainerCss = ({ theme, disableBackground, $variant, $size }) => {
  const tabs = tabsTheme(theme, $variant, $size)
  const { key, props, look } = tabs
  const rules = []
  if (!disableBackground) rules.push(`background-color: ${look.background};`)
  rules.push(`border: ${look.border};`)
  if (key === 'pill') {
    rules.push(`border-radius: ${look.radius};`)
    rules.push(`box-shadow: ${look.shadow.css};`)
    rules.push(`padding: ${look.inset};`)
  } else {
    // underline: the baseline in place of its bottom side
    if (key === 'underline' && props.baseline) rules.push(`border-bottom: ${look.baseline};`)
    rules.push(`border-radius: 0; box-shadow: ${look.shadow.css}; padding: 0;`)
  }
  rules.push(`gap: ${look.gap};`)
  rules.push('box-sizing: border-box;')
  rules.push(`height: ${insetHeight(tabs.height)};`)
  return rules.join('\n')
}

/**
 * One tab of a bar of `$size` (md by default), as tall as the
 * bar less its box (`tabsTheme`), one line centered in it that ends in
 * … when it doesn't fit, `padding_x` at its sides, its icon (`icon_size`)
 * `base.icon_gap` from its text. Still,
 * like every button: no lift, the active one changes at once (or fades, when
 * the theme animates it). Pill: its radius and border, the active one of its
 * background; underline: the active one with the indicator; plain: only the
 * colors.
 */
const tabCss = ({ theme, active, $variant, $size }) => {
  const tabs = tabsTheme(theme, $variant, $size)
  const { key, props, look, baseLook, sizeLook } = tabs
  const rules = [baseLook.text.css]
  const pill = key === 'pill'
  const tabBorder = pill ? borderWidth(props.tab_border) : 0
  rules.push(`border: ${pill ? look.tab_border : 'none'};`)
  rules.push(`border-radius: ${pill ? look.tab_radius : '0'};`)
  rules.push('background-color: transparent;')
  rules.push('box-sizing: border-box; min-width: 0; white-space: nowrap;')
  if (tabs.tabHeight) {
    rules.push(`height: ${insetHeight(tabs.tabHeight)}; line-height: ${insetHeight(Math.max(tabs.tabHeight - 2 * tabBorder, 0))};`)
  }
  rules.push(`padding: 0 ${sizeLook.padding_x};`)
  // One line that ends in … when it doesn't fit. A tab of only text is a
  // block (a bare text in a flex box is an anonymous item that text-overflow
  // never reaches), centered; a tab of elements (its icon, its label in a
  // span…) lays them out centered, icon_gap apart, and each label among them
  // ends in … (icons, and the boxes holding them, keep their size). All of it
  // one class specific, so a tab that sets its own display keeps it.
  rules.push('overflow: hidden; text-overflow: ellipsis; text-align: center;')
  rules.push(`display: inline-flex; align-items: center; justify-content: center; gap: ${baseLook.icon_gap};`)
  rules.push('&:not(:has(> *)) { display: block; }')
  rules.push('& > :where(:not(svg, img):not(:has(svg, img))) { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }')
  rules.push(`svg { width: ${sizeLook.icon_size}; height: ${sizeLook.icon_size}; flex-shrink: 0; }`)
  rules.push(`position: relative; ${stateMotionCss(theme, 'tabs')} &:hover { transform: none; }`)
  // Pill tabs with no space between them: their borders never show double
  // (each tab after the first goes over the one before by its border, the
  // active one on top, its border whole); `joined`, one block: square
  // inside, the tab radius only at its ends.
  if (pill && props.gap === 0) {
    if (tabBorder) {
      rules.push(`&:not(:first-child) { margin-inline-start: -${tabBorder}px; }`)
      if (active) rules.push('z-index: 1;')
    }
    if (props.joined === true) {
      rules.push('&:not(:first-child) { border-start-start-radius: 0; border-end-start-radius: 0; }')
      rules.push('&:not(:last-child) { border-start-end-radius: 0; border-end-end-radius: 0; }')
    }
  }
  // the same against the bar's border when there is no inset: over it on
  // top and bottom, and the end tabs at its sides
  if (tabs.edgeOverlap) {
    const edge = tabs.edgeOverlap
    rules.push(`margin-block: -${edge}px; &:first-child { margin-inline-start: -${edge}px; } &:last-child { margin-inline-end: -${edge}px; }`)
  }
  if (active) {
    // every variant: the active tab of its background (underline: the indicator over it)
    rules.push(`background-color: ${look.active_background};`)
    if (key === 'underline') {
      rules.push(underlineIndicatorCss({ color: look.indicator, thickness: look.indicator_thickness, length: look.indicator_length }))
    }
    rules.push(`color: ${look.active};`)
  } else {
    rules.push(`color: ${look.inactive};`)
  }
  return rules.join('\n')
}

/**
 * A bar of tabs (`$asTabs`, opt-in): `role="tablist"`, its `Tab`s with
 * `$asTab` are tabs (`role="tab"`, `aria-selected`). Without it the bar has
 * no role and its tabs are buttons (see tabControlAttrs). A role given by
 * the consumer is kept.
 */
const tabsAttrs = ({ $asTabs, role }) => ($asTabs && !role ? { role: 'tablist' } : {})

export const Tabs = styled.div.attrs(tabsAttrs)`
  display: flex;
  ${({ variant }) => variant === 'primary' && css`
    width: fit-content;
    color: ${props => themeColor(props.theme, 'primary')};
  `}

  ${({ variant }) => variant === 'secundary' && css`
    color: ${props => themeColor(props.theme, 'text')};
  `}

  ${({ variant }) => variant === 'primaryContrast' && css`
    color: ${props => themeColor(props.theme, 'on_primary')};
  `}

  ${({ disableBackground }) => disableBackground && css`
    background-color: transparent;
  `}
  ${tabsContainerCss}
`

/**
 * A tab drawn as a div that does something (`onClick`) is still a control:
 * a button for the keyboard (focusable, Enter / Space click it), pressed
 * while active; with `$asTab` (in a `Tabs` with `$asTabs`) it is a tab of the
 * tablist instead (`role="tab"`, selected while active). A tab rendered as a
 * button or a link (`as`), or given a role of its own, keeps its semantics
 * (with `$asTab` it still gets `aria-selected`); a key on something inside
 * the tab (a link) is left to it.
 *
 * Usage: `<Tabs $asTabs><Tab $asTab active={…} onClick={…}>…</Tab></Tabs>`
 */
const tabControlAttrs = ({ as, role, tabIndex, onClick, onKeyDown, active, $asTab }) => {
  if ($asTab && (role || (as && as !== 'div'))) return { role: role || 'tab', 'aria-selected': !!active }
  if (typeof onClick !== 'function' || (as && as !== 'div') || role) return $asTab ? { role: 'tab', 'aria-selected': !!active } : {}
  return {
    role: $asTab ? 'tab' : 'button',
    tabIndex: tabIndex ?? 0,
    ...($asTab ? { 'aria-selected': !!active } : { 'aria-pressed': !!active }),
    onKeyDown: (e) => {
      onKeyDown && onKeyDown(e)
      if (e.defaultPrevented || e.target !== e.currentTarget) return
      // (a tab another styled() renders as a button: the browser clicks it)
      const tag = e.currentTarget?.tagName
      if (tag === 'BUTTON' || tag === 'A') return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick(e)
      }
    }
  }
}

export const Tab = styled.div.attrs(tabControlAttrs)`
  cursor: pointer;
  ${tabCss}

  ${({ boldText }) => boldText && css`
    font-weight: 600;
  `}

  ${({ padding }) => padding && css`
    padding: ${padding};
  `}

  ${({ fromCategoryTabs }) => !fromCategoryTabs && css`
    @media (max-width: 480px) {
      flex: 1;
    }
  `}

`
