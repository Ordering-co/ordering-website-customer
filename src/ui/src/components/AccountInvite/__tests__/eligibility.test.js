import { describe, expect, it } from 'vitest'
import { canFinishInWindow } from '../eligibility'

const guest = { guest_id: 'g-1', name: 'Ana', lastname: 'Torres', guest_cellphone: '4155550134', country_phone_code: '1' }
const field = (required = true, enabled = true) => ({ enabled, required })
const fields = (checkout = {}) => ({ loading: false, fields: { checkout: { name: field(), lastname: field(), email: field(), cellphone: field(), ...checkout } } })
const configs = (values = {}) => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value }]))
const can = (overrides = {}) => canFinishInWindow({ user: guest, configs: configs(), validationFields: fields(), ...overrides })

describe('canFinishInWindow', () => {
  it('is true when the guest gave every required field and the sign-up asks nothing else', () => {
    expect(can()).toBe(true)
  })

  it('is false without a guest (a visitor, or an account)', () => {
    expect(can({ user: undefined })).toBe(false)
    expect(can({ user: { ...guest, guest_id: undefined } })).toBe(false)
  })

  it('is false until the validation fields are loaded', () => {
    expect(can({ validationFields: { loading: true, fields: {} } })).toBe(false)
    expect(can({ validationFields: {} })).toBe(false)
    expect(can({ validationFields: { loading: false, fields: {}, error: ['boom'] } })).toBe(false)
  })

  it('needs the full details sign-up when an OTP sign-up is on', () => {
    expect(can({ configs: configs({ email_otp_signup_enabled: '1' }) })).toBe(false)
    expect(can({ configs: configs({ phone_otp_signup_enabled: '1' }) })).toBe(false)
    expect(can({ configs: configs({ whatsapp_otp_login_enabled: '1' }) })).toBe(false)
    expect(can({ configs: configs({ phone_otp_signup_enabled: '1', full_details_signup_enabled: '1' }) })).toBe(true)
    expect(can({ configs: configs({ email_otp_signup_enabled: '0' }) })).toBe(true)
  })

  it('is false with recaptcha, terms or a verification required', () => {
    expect(can({ configs: configs({ security_recaptcha_signup: '1' }) })).toBe(false)
    expect(can({ configs: configs({ terms_and_conditions: 'true' }) })).toBe(false)
    expect(can({ configs: configs({ verification_email_required: '1' }) })).toBe(false)
    expect(can({ configs: configs({ verification_phone_required: '1' }) })).toBe(false)
    expect(can({ configs: configs({ security_recaptcha_signup: '0', terms_and_conditions: 'false' }) })).toBe(true)
  })

  it('is false when a required field is one the guest does not have', () => {
    expect(can({ validationFields: fields({ birthdate: field() }) })).toBe(false)
    expect(can({ validationFields: fields({ middle_name: field() }) })).toBe(false)
    expect(can({ user: { ...guest, lastname: '' } })).toBe(false)
    expect(can({ user: { ...guest, name: undefined } })).toBe(false)
  })

  it('reads the phone as the guest\'s own cellphone and its country code', () => {
    expect(can({ user: { ...guest, guest_cellphone: undefined, cellphone: '4155550999' } })).toBe(true)
    expect(can({ user: { ...guest, guest_cellphone: undefined } })).toBe(false)
    expect(can({ user: { ...guest, country_phone_code: undefined } })).toBe(false)
  })

  it('ignores what is optional, disabled, or asked by the window itself', () => {
    expect(can({ validationFields: fields({ birthdate: field(false), middle_name: field(true, false) }) })).toBe(true)
    expect(can({ validationFields: fields({ coupon: field(), driver_tip: field(), address: field(), address_notes: field() }) })).toBe(true)
    expect(can({ validationFields: fields({ cellphone: field(false) }), user: { ...guest, guest_cellphone: undefined } })).toBe(true)
    // the email is asked in the window when the order has none
    expect(can({ user: { ...guest, guest_email: undefined, email: '' } })).toBe(true)
  })
})
