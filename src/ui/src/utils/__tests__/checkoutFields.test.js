import { describe, expect, it } from 'vitest'
import { isCustomerDetailRequirement, normalizeCheckoutField, normalizeCheckoutFieldsState } from '../checkoutFields'

const projectField = (enabled, required) => ({ code: 'name', enabled, required })

describe('normalizeCheckoutField', () => {
  it('an order type field left unset (null, as the API creates it) takes the project field', () => {
    const field = normalizeCheckoutField({ enabled: null, required: null, validation_field: projectField(true, true) })
    expect(field).toMatchObject({ enabled: true, required: true })
  })

  it('what the order type sets wins, false included', () => {
    const field = normalizeCheckoutField({ enabled: false, required: true, validation_field: projectField(true, false) })
    expect(field).toMatchObject({ enabled: false, required: true })
  })

  it('without either: disabled and optional', () => {
    expect(normalizeCheckoutField({ enabled: null, required: null })).toMatchObject({ enabled: false, required: false })
  })
})

describe('normalizeCheckoutFieldsState', () => {
  it('normalizes its fields and keeps the rest', () => {
    const state = normalizeCheckoutFieldsState({ loading: false, fields: [{ enabled: null, validation_field: projectField(true, false) }] })
    expect(state.loading).toBe(false)
    expect(state.fields[0]).toMatchObject({ enabled: true, required: false })
  })

  it('a state without fields stays', () => {
    const state = { loading: true, fields: undefined }
    expect(normalizeCheckoutFieldsState(state)).toBe(state)
  })
})

describe('isCustomerDetailRequirement', () => {
  it('keeps the fields the details form can show and store', () => {
    expect(isCustomerDetailRequirement('name')).toBe(true)
    expect(isCustomerDetailRequirement('email')).toBe(true)
    expect(isCustomerDetailRequirement('birthdate')).toBe(true)
  })

  it('drops a required project field the form never draws', () => {
    expect(isCustomerDetailRequirement('runscope')).toBe(false)
    expect(isCustomerDetailRequirement('address')).toBe(false)
  })
})
