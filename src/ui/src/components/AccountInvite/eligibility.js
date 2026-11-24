// The guest's own details, as the sign-up form prefills them (Checkout's `fasterCheckoutSignupProps`).
export const guestEmail = (user) => user?.guest_email || user?.email || ''
export const guestCellphone = (user) => user?.guest_cellphone ?? user?.cellphone

// What SignUpForm does not ask as a field of the guest (`notValidationFields` in SignUpForm/index.js, not
// exported: keep both lists alike), plus the two this flow asks itself.
const NOT_GUEST_FIELDS = ['coupon', 'driver_tip', 'mobile_phone', 'address', 'address_notes', 'email', 'password']

// What the guest already gave, per required field of the sign-up. A field with no entry here is one the
// guest cannot have given: the account cannot be finished in the window.
const GUEST_FIELDS = {
  name: (user) => user.name,
  lastname: (user) => user.lastname,
  cellphone: (user) => guestCellphone(user) && user.country_phone_code
}

/**
 * Can the account be finished in the invitation itself (a password is the only thing missing)? True only
 * when the guest has already given every field the sign-up asks and the sign-up asks nothing the window
 * cannot (recaptcha, terms, a verification code). Anything else falls back to the sign-up form.
 * `configs` is the ConfigContext's, `validationFields` the ValidationsFieldsContext's.
 */
export const canFinishInWindow = ({ user, configs, validationFields } = {}) => {
  if (!user?.guest_id) return false
  const checkout = validationFields?.fields?.checkout
  if (validationFields?.loading !== false || !checkout) return false
  const on = (key, value = '1') => configs?.[key]?.value === value
  // the controller's `useSignUpFullDetails`: with an OTP sign-up, the full form must be enabled
  const otp = on('email_otp_signup_enabled') || on('phone_otp_signup_enabled') || on('whatsapp_otp_login_enabled')
  if (otp && !on('full_details_signup_enabled')) return false
  if (on('security_recaptcha_signup') || on('terms_and_conditions', 'true')) return false
  if (on('verification_email_required') || on('verification_phone_required')) return false
  // by key, not `field.code`: the context stores the phone as `cellphone` and keeps its code `mobile_phone`
  return Object.entries(checkout)
    .filter(([key, field]) => field?.enabled && field?.required && !NOT_GUEST_FIELDS.includes(key))
    .every(([key]) => !!GUEST_FIELDS[key]?.(user))
}
