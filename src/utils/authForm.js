import { slotButtonProps, slotSize, themeSlot } from './themeGroups'
import { themeVisible } from './themeVisibility'
import { getThemeComponent, getThemeCss, getThemeMobileCss } from './themeCss'

/**
 * The group of the authentication forms (login, sign up, password recovery,
 * business and driver sign up): `components.auth_form`. Its `scope` changes
 * the components inside (wrap the form in <ComponentScope group={AUTH_FORM}>)
 * and its `slots` name the size and look of its pieces.
 */
export const AUTH_FORM = 'auth_form'

/**
 * The props of the form's main action (`slots.submit`), a main
 * action of the screen (`$cta`: full width when the theme says so,
 * components.button.base.cta_full_width and its phone value).
 */
export const authSubmitProps = (theme) => ({ ...slotButtonProps(theme, AUTH_FORM, 'submit'), $cta: true })

/** The props of the form's way back (`slots.cancel`). */
export const authCancelProps = (theme) => slotButtonProps(theme, AUTH_FORM, 'cancel')

/**
 * The props of the bar of authentication methods
 * (`slots.method_tabs`): its size (md by default) and variant.
 */
export const authTabsProps = (theme) => {
  const slot = themeSlot(theme, AUTH_FORM, 'method_tabs')
  return {
    size: slotSize(theme, AUTH_FORM, 'method_tabs', 'md'),
    ...(slot?.variant && { variant: slot.variant })
  }
}

/** The props of the social logins (`slots.social`). */
export const authSocialProps = (theme) => slotButtonProps(theme, AUTH_FORM, 'social')

/** The props of the business and driver sign up buttons (`slots.partner`). */
export const authPartnerProps = (theme) => slotButtonProps(theme, AUTH_FORM, 'partner')

const baseDeclaration = (cssProp, value) => {
  if (value === undefined || value === null) return ''
  return cssProp === 'text' ? value.css : `${cssProp}: ${value};`
}

/**
 * Declarations from the base of a component
 * (`components.<component>.base`, its view: each value CSS already): `map`
 * is `{ cssProp: key }`; `text` takes a text style's declarations. A value
 * the theme leaves null declares nothing. `mobile`: the component's
 * `platforms.mobile_web` over its base.
 */
export const baseCss = (theme, component, map, { mobile = false } = {}) => {
  const base = getThemeCss(theme, component).base
  const small = mobile ? getThemeMobileCss(theme, component)?.base : null
  const values = small ? { ...base, ...small } : base
  return Object.entries(map)
    .map(([cssProp, key]) => baseDeclaration(cssProp, values[key]))
    .filter(Boolean)
    .join('\n')
}

/** One raw value of a component's base. */
export const baseValue = (theme, component, key) => getThemeComponent(theme, component).base[key]

/** The sentence before a redirect link (New on…? / Already have an account?). */
export const authRedirectTextCss = (theme) => baseCss(theme, AUTH_FORM, { text: 'redirect_text' })
export const authRedirectColorCss = (theme) => baseCss(theme, AUTH_FORM, { color: 'redirect_color' })

/**
 * The eye that shows the password, an icon inside a field: the
 * color and size of components.input (icon_color / icon_size; the form's
 * scope.input may change them inside the form).
 */
export const authPasswordToggleCss = (theme) => baseCss(theme, 'input', { 'font-size': 'icon_size', color: 'icon_color' })

/** The label of a checkbox of the form (terms, promotions). */
export const authCheckboxLabelCss = (theme) => baseCss(theme, AUTH_FORM, { text: 'checkbox_label_text', color: 'checkbox_label_color' })

/**
 * The block of social logins (a flex box, a column or a row):
 * `social_margin` over it, `social_gap` between its buttons in both
 * directions (a gap: no space after the last one), `social_icon_size` their
 * icons (CSS of the block; `iconSlot` is the styled icon slot of the
 * buttons).
 */
export const authSocialCss = (theme, iconSlot) => {
  const { social_margin: margin, social_gap: gap, social_icon_size: icon } = getThemeCss(theme, AUTH_FORM).base
  return [
    `margin-top: ${margin};`,
    `gap: ${gap};`,
    iconSlot ? `&& ${iconSlot} { width: ${icon}; height: ${icon}; min-width: ${icon}; min-height: ${icon}; } && ${iconSlot} svg { font-size: ${icon}; }` : ''
  ].filter(Boolean).join('\n')
}

/**
 * Sub-elements of the auth forms the theme may hide (`visibility`): the
 * social logins, the link to sign up (login), the link to log in (sign up,
 * forgot password) and the promotions opt-in.
 */
export const authSocialVisible = (theme) => themeVisible(theme, 'auth.social')
export const authSignupLinkVisible = (theme) => themeVisible(theme, 'auth.signup_link')
export const authLoginLinkVisible = (theme) => themeVisible(theme, 'auth.login_link')
export const signupPromotionsVisible = (theme) => themeVisible(theme, 'signup.promotions_optin')
