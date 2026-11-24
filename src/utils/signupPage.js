import { getThemeCss, getThemeMobileCss } from './themeCss'
import { baseCss, baseValue } from './authForm'
import { themeSpace } from './themeTokens'
import { isTransparent, themeColor } from './themeColors'

/**
 * The business and driver sign up pages (`components.signup_page`): the
 * description (title and text), the card of the form (its title is the
 * page title of components.section_header), the page's padding, the width
 * of each side and the ratio of the image band.
 */
export const SIGNUP_PAGE = 'signup_page'

// From this width the description and the form sit side by side
const WIDE = 993

/**
 * The container of the page. Its sections (the description and
 * the form) go in the theme's order: side by side from 993px, one over the
 * other below it (one column, not mirrored); the space between them is the
 * gap (no margin of the description, which would sit on the wrong side once
 * reordered).
 *
 * Its padding follows the page's layout, not the platform: padding_y /
 * padding_x only with two columns (from 993px, this layout's own cut), and
 * their phone values (platforms.mobile_web padding_y / padding_x) whenever the
 * page is one column (below 993px, tablets included: the big padding left a
 * 600px tablet ~340px for the form).
 *
 * A section alone (the description hidden, pages.signup_*.sections) takes the
 * whole width up to max_width, centered, also with two columns.
 */
export const signupContainerCss = (theme) => {
  const { padding_y: padY, padding_x: padX, max_width: maxWidth } = getThemeCss(theme, SIGNUP_PAGE).base
  const phone = getThemeMobileCss(theme, SIGNUP_PAGE).base
  const columnGap = themeSpace(theme, 'xl')
  return `
    && {
      flex-direction: column;
      padding: ${phone.padding_y} ${phone.padding_x};
      row-gap: ${themeSpace(theme, 'xxxl')};
    }
    && > div { max-width: ${maxWidth}; }
    @media (min-width: ${WIDE}px) {
      && {
        flex-direction: row;
        padding: ${padY} ${padX};
        column-gap: ${columnGap};
      }
      && > div { width: calc((100% - ${columnGap}) / 2); }
      && > div:only-child { width: 100%; margin-inline: auto; }
    }
  `
}

/**
 * The description has no margin of its own (the container's
 * gap separates it from the form, on whichever side it is).
 */
export const signupDescriptionContainerCss = (_theme) => '&& { margin: 0; }'

/** The ratio of the image band (`band_ratio`, `16:9` → `16 / 9`). */
export const signupBandRatio = (theme) => baseValue(theme, SIGNUP_PAGE, 'band_ratio').replace(':', ' / ')

// From this width the page has the background image behind the description (T5)
const COVER = 768

/**
 * The veil over the photo behind the description text (`description_overlay`),
 * a CSS color, or null (transparent: none).
 */
export const signupDescriptionVeil = (theme) => {
  const veil = baseValue(theme, SIGNUP_PAGE, 'description_overlay')
  return isTransparent(veil) ? null : veil
}

/**
 * The page's background image from 768px (cover, centered), the page's
 * background color under it (where the image is only the band). `veiled`: the
 * description sits on the photo, so the photo takes the description's veil
 * (description_overlay) as a layer over it; without the description, nothing
 * is written on the photo and it stays as it is.
 */
export const signupBackgroundCss = (theme, image, { veiled = false } = {}) => {
  if (!image) return ''
  const veil = veiled ? signupDescriptionVeil(theme) : null
  const layers = veil ? `linear-gradient(${veil}, ${veil}), url("${image}")` : `url("${image}")`
  return `
    background-color: ${themeColor(theme, 'background')};
    @media (min-width: ${COVER}px) {
      background-image: ${layers};
      background-repeat: no-repeat;
      background-size: cover;
      background-position: center;
    }
  `
}

/**
 * The color of a description part: `<key>_on_page` over the page background
 * (no image, or under 768px where the image is only the band), `<key>` over
 * the background image from 768px.
 */
const descriptionColorCss = (theme, key, hasImage) => {
  const onPage = baseCss(theme, SIGNUP_PAGE, { color: `${key}_on_page` })
  const onImage = hasImage ? baseCss(theme, SIGNUP_PAGE, { color: key }) : ''
  return `${onPage}${onImage ? `\n@media (min-width: ${COVER}px) { ${onImage} }` : ''}`
}

/** The title of the description (`hasImage`: the page has a background image). */
export const signupDescriptionTitleCss = (theme, { hasImage = false } = {}) =>
  `${baseCss(theme, SIGNUP_PAGE, { text: 'description_title_text' })}\n${descriptionColorCss(theme, 'description_title_color', hasImage)}`

/** The text of the description, description_gap under its title. */
export const signupDescriptionTextCss = (theme, { hasImage = false } = {}) =>
  `${baseCss(theme, SIGNUP_PAGE, { text: 'description_text', 'margin-top': 'description_gap' })}\n${descriptionColorCss(theme, 'description_color', hasImage)}`

/** The space inside the card of the form. */
export const signupFormPaddingCss = (theme) => baseCss(theme, SIGNUP_PAGE, { padding: 'form_padding' })

/**
 * A password field with its eye inside, the icon of components.input: the
 * input's end space is its side space (padding_x), the eye (icon_size) and the
 * space between an icon and the text (icon_gap), so the text never runs under
 * the eye, at the input primitive's strength (its error state pads with
 * !important). Logical sides: in RTL the eye and its space are on the left.
 */
export const signupPasswordInputCss = (theme) => {
  const { padding_x: side, icon_size: icon, icon_gap: gap } = getThemeCss(theme, 'input').base
  return `padding-inline-end: calc(${side} + ${icon} + ${gap}) !important;`
}

/** The eye of a password field: at the input's side space from its end. */
export const signupPasswordToggleCss = (theme) => `inset-inline-end: ${getThemeCss(theme, 'input').base.padding_x};`
