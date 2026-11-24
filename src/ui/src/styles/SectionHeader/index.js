import { cssText } from '@orderingco/ordering-theme-engine/css'
import { getThemeComponent, getThemeCss, resolveThemeProps } from '~/utils/themeCss'

/**
 * The one owner of the titles of the site: `components.section_header`. A
 * page's own title (its h1) takes the `page` variant (the h1's typography, a
 * larger space under it); the title of a section (an h2), the base. Each one is
 * a title and, under it, an optional description, aligned by `align`.
 */
export const SECTION_HEADER = 'section_header'

/** The variant of a header whose title is a heading of `level` (h1 → page). */
export const sectionHeaderVariant = (level) => (level === 'h1' ? 'page' : undefined)

/** The resolved props of the header of a `level` title (h1 → page). */
export const sectionHeaderProps = (theme, level) => {
  return resolveThemeProps(getThemeComponent(theme, SECTION_HEADER), { variant: sectionHeaderVariant(level) })
}

/** The same props as CSS (its view). */
export const sectionHeaderLook = (theme, level) => {
  return resolveThemeProps(getThemeCss(theme, SECTION_HEADER), { variant: sectionHeaderVariant(level) })
}

// A text of the header (`key`: title, description) with the font of its role
// (title → heading, the description → body) when the text has none of its
// own: its view names its own, else the engine's cssText paints the role's
const textCss = (theme, level, key, role) => {
  const text = sectionHeaderProps(theme, level)[key]
  if (text.family) return sectionHeaderLook(theme, level)[key].css
  return cssText(text, theme.css.fonts[role].id, true).css
}

/**
 * The title's text and color only (for a spot that lays out its own space);
 * `color: false` leaves the color to the spot (a title over a colored panel).
 */
export const sectionTitleTextCss = (theme, { level, color = true } = {}) => {
  const props = sectionHeaderLook(theme, level)
  return [
    textCss(theme, level, 'title', 'heading'),
    color ? `color: ${props.title_color};` : ''
  ].filter(Boolean).join('\n')
}

/**
 * The title: its text, color and alignment; `alone` (no description under
 * it) also gives it the header's space under it (`margin_bottom`). `spaced:
 * false` leaves the space to the spot (a title among blocks the page spaces);
 * `aligned: false` its alignment (a centered composition: the title and
 * what goes under it are centered together).
 */
export const sectionTitleCss = (theme, { level, alone = true, spaced = true, aligned = true } = {}) => {
  const props = sectionHeaderLook(theme, level)
  return [
    sectionTitleTextCss(theme, { level }),
    aligned ? `text-align: ${props.align};` : '',
    spaced ? `margin-bottom: ${alone ? props.margin_bottom : '0px'};` : ''
  ].filter(Boolean).join('\n')
}

/**
 * The description: its text and color, the header's `gap` from the title
 * and its `margin_bottom` under it.
 */
export const sectionDescriptionCss = (theme, { level } = {}) => {
  const props = sectionHeaderLook(theme, level)
  return [
    textCss(theme, level, 'description', 'body'),
    `color: ${props.description_color};`,
    `text-align: ${props.align};`,
    `margin-top: ${props.gap};`,
    `margin-bottom: ${props.margin_bottom};`
  ].join('\n')
}
