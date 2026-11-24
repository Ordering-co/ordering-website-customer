import { describe, expect, it } from 'vitest'
import { getFormApiFeedback } from '../formApiFeedback'

const t = (_key, fallback) => fallback

describe('form API feedback', () => {
  it('uses a site translation for a recognized code', () => {
    const translate = (key, fallback) => key === 'FORM_LOGIN_CREDENTIALS' ? 'Revisa tus datos de acceso.' : fallback
    expect(getFormApiFeedback(translate, { result: ['ERROR_AUTH_CREDENTIALS'] })).toEqual({
      fields: {},
      message: 'Revisa tus datos de acceso.'
    })
  })

  it('uses structured codes to place validation next to the rendered fields', () => {
    expect(getFormApiFeedback(t, {
      error_codes: ['email.unique', 'password.min'],
      result: ['database details', 'rule text']
    }, { fields: ['email', 'password'] })).toEqual({
      fields: { email: 'This email is already in use.', password: 'Check this field and try again.' },
      message: null,
      duplicates: ['email']
    })
  })

  // implementation notes
  describe('a duplicate email or phone', () => {
    const masked = 'j***@example.com'

    it('soft: comes back as a duplicate, with no field error or message, and never shows the other account', () => {
      const feedback = getFormApiFeedback(t, {
        error_codes: ['cellphone.unique'],
        result: [`The cellphone has already been taken by ${masked}`]
      }, { fields: ['email', 'cellphone'], softDuplicates: ['cellphone'] })
      expect(feedback).toEqual({ fields: {}, message: null, duplicates: ['cellphone'] })
      expect(JSON.stringify(feedback)).not.toContain(masked)
    })

    it('reads the sentence when there are no codes, and the field names of a validation object', () => {
      expect(getFormApiFeedback(t, { result: ['The email has already been taken.'] }, { softDuplicates: ['email'] }))
        .toEqual({ fields: {}, message: null, duplicates: ['email'] })
      expect(getFormApiFeedback(t, { errors: { email: ['The email has already been taken.'] } }, { fields: ['email'], softDuplicates: ['email'] }))
        .toEqual({ fields: {}, message: null, duplicates: ['email'] })
    })

    it('not drawn by the form: told with its own translated sentence, not "Please try again"', () => {
      expect(getFormApiFeedback(t, { error_codes: ['cellphone.unique'], result: [`taken by ${masked}`] }, { fields: ['email'] }))
        .toEqual({ fields: {}, message: 'This phone number is already in use.', duplicates: ['cellphone'] })
    })

    it('does not change the response it reads', () => {
      const response = { error_codes: ['email.unique'], result: ['x'] }
      getFormApiFeedback(t, { ...response, errors: { email: ['already been taken'] } }, { fields: ['email'] })
      expect(response.error_codes).toEqual(['email.unique'])
    })
  })

  it('keeps general feedback when part of the response cannot be resolved to a visible field', () => {
    expect(getFormApiFeedback(t, {
      error_codes: ['email.email', 'hidden_field.required'],
      result: ['database details']
    }, { fields: ['email'] })).toEqual({
      fields: { email: 'Invalid email address' },
      message: 'Please try again'
    })
  })

  it('can use the field names in a structured validation object without displaying its values', () => {
    expect(getFormApiFeedback(t, { errors: { comments: ['technical content'] } }, { fields: ['comments'] })).toEqual({
      fields: { comments: 'Check this field and try again.' },
      message: null
    })
  })

  it.each([null, 'Private details', ['Private details', 'More private details'], { stack: 'Private details' }])(
    'uses one translated fallback for unrecognized results',
    (result) => expect(getFormApiFeedback(t, { result })).toEqual({ fields: {}, message: 'Please try again' })
  )
})
