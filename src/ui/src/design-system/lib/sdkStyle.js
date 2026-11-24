import { getThemeCss } from '~/utils/themeCss'
import { themeColor } from '~/utils/themeColors'
import { themePart, themeSpace } from '~/utils/themeTokens'
import { MOBILE_FIELD_MIN_TEXT } from '~ui/src/styles/Rules'
import { componentVars } from './componentVars'

// What a third party's SDK draws is out of reach of CSS or of our classes, and each SDK has its own way of
// being styled. These helpers translate the theme (the same `components.input` and `components.field` that
// `Input` and `SdkField` paint) to each one:
// - Stripe Elements: options of the element (`style` for the card elements, `appearance` for the Payment Element)
// - Google Places: the CSS of its suggestion list (the input is the SDK's own `<input>`: `SdkField` styles it)

const input = (theme) => componentVars(theme, 'input', { variant: 'default', radius: 'md' })

// Stripe's iframe takes the line in px, and iOS zooms a field under the least text size: on a phone it is never less
const textSize = (theme, vars) => {
  const size = parseFloat(vars['--ui-input-text-size'])
  return theme.platform ? Math.max(size, parseFloat(MOBILE_FIELD_MIN_TEXT)) : size
}

/**
 * The `style` option of a Stripe card element (`CardElement`, `CardNumberElement`, `CardExpiryElement`,
 * `CardCvcElement`): the text of `components.input` (its color, font, size, line and weight), its placeholder
 * color and the danger text color when the card is invalid.
 */
export const stripeElementStyle = (theme) => {
  const vars = input(theme)
  const size = textSize(theme, vars)
  const danger = themeColor(theme, 'danger_text')
  return {
    base: {
      fontSmoothing: 'antialiased',
      color: vars['--ui-input-text-color'],
      iconColor: vars['--ui-input-text-color'],
      fontSize: `${size}px`,
      lineHeight: `${Math.round(size * Number(vars['--ui-input-text-line']) * 100) / 100}px`,
      fontWeight: vars['--ui-input-text-weight'],
      fontFamily: vars['--ui-input-text-family'],
      '::placeholder': { color: vars['--ui-input-placeholder'] }
    },
    invalid: { color: danger, iconColor: danger }
  }
}

/** The options of a Stripe card element: `<CardNumberElement options={stripeElementOptions(theme)} />`. */
export const stripeElementOptions = (theme) => ({ showIcon: true, style: stripeElementStyle(theme) })

/**
 * The `appearance` option of Stripe's `Elements` (the Payment Element and the other elements that draw their own
 * field): no Stripe theme, our colors, font and corner as variables, and the field's box (border, hover, focus,
 * error) and the label and error text as rules.
 */
export const stripeAppearance = (theme) => {
  const vars = input(theme)
  const field = componentVars(theme, 'field')
  const danger = themeColor(theme, 'danger_text')
  const size = textSize(theme, vars)
  const border = (name) => vars[`--ui-input-${name}-border`] ?? vars['--ui-input-border']
  return {
    theme: 'none',
    variables: {
      fontFamily: vars['--ui-input-text-family'],
      fontSizeBase: `${size}px`,
      fontWeightNormal: vars['--ui-input-text-weight'],
      colorPrimary: themeColor(theme, 'primary'),
      colorBackground: vars['--ui-input-background'],
      colorText: vars['--ui-input-text-color'],
      colorTextPlaceholder: vars['--ui-input-placeholder'],
      colorDanger: danger,
      borderRadius: vars['--ui-input-radius']
    },
    rules: {
      '.Input': {
        backgroundColor: vars['--ui-input-background'],
        color: vars['--ui-input-text-color'],
        border: vars['--ui-input-border'],
        borderRadius: vars['--ui-input-radius'],
        boxShadow: vars['--ui-input-shadow'],
        padding: `0 ${vars['--ui-input-padding-x']}`,
        fontFamily: vars['--ui-input-text-family'],
        fontSize: `${size}px`,
        fontWeight: vars['--ui-input-text-weight']
      },
      '.Input:hover': { border: border('hover') },
      '.Input:focus': { border: border('focus'), boxShadow: vars['--ui-input-shadow'], outline: 'none' },
      '.Input--invalid': { border: border('error'), color: danger },
      '.Label': {
        color: field['--ui-field-label-color'],
        fontFamily: field['--ui-field-label-family'],
        fontSize: field['--ui-field-label-size'],
        fontWeight: field['--ui-field-label-weight']
      },
      '.Error': {
        color: field['--ui-field-error-color'],
        fontFamily: field['--ui-field-error-family'],
        fontSize: field['--ui-field-error-size'],
        fontWeight: field['--ui-field-error-weight']
      }
    }
  }
}

// The submodule's list and the legacy widget both set their own styles (inline, a stylesheet): ours must win
const important = (css) => css.replace(/;/g, ' !important;')

/**
 * The CSS of the Google Places suggestion list (`.pac-container`, drawn by the SDK or by the submodule's
 * `GoogleAutocompleteInput` in the body): the box, the rows and the selected row of `components.menu`, with the
 * theme's text. Global CSS: put it in a `createGlobalStyle` (`${({ theme }) => placesSuggestionsCss(theme)}`).
 * Everything is `!important` because the list sets its own inline styles.
 */
export const placesSuggestionsCss = (theme) => {
  const menu = getThemeCss(theme, 'menu').base
  const text = themeColor(theme, 'text')
  const muted = themeColor(theme, 'text_muted')
  return `
.pac-container {
  ${important(themePart(theme, 'menu', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow' }))}
  overflow: hidden !important;
}
.pac-item {
  ${important(themePart(theme, 'menu', { text: 'base.item_text' }))}
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  gap: 0 !important;
  min-height: ${menu.item_height} !important;
  padding: 0 ${menu.padding_x} !important;
  border: 0 !important;
  color: ${muted} !important;
  text-align: start !important;
  background: transparent !important;
}
.pac-item:hover,
.pac-item-selected {
  background-color: ${menu.item_hover} !important;
}
.pac-item-query {
  color: ${text} !important;
  font-size: inherit !important;
  padding: 0 !important;
  padding-inline-end: ${themeSpace(theme, 'xs')} !important;
}
`
}
