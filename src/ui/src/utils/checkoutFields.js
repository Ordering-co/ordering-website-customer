/**
 * The checkout fields of the order types (`/validation_field_order_types`):
 * a field an order type leaves unset (`enabled` / `required` null, as the API
 * creates them) takes the project's (its `validation_field`). `null` was read
 * as disabled, so an order type with no fields of its own showed none.
 */
export const normalizeCheckoutField = (field) => {
  if (!field || typeof field !== 'object') return field
  const projectField = field.validation_field || {}
  return {
    ...field,
    enabled: field.enabled ?? projectField.enabled ?? false,
    required: field.required ?? projectField.required ?? false
  }
}

/** The checkout fields state (`{ fields, loading, error }`), normalized. */
export const normalizeCheckoutFieldsState = (state) => {
  if (!state || !Array.isArray(state.fields)) return state
  return { ...state, fields: state.fields.map(normalizeCheckoutField) }
}

// The details form draws these and the user can store them. A required code
// outside this list (a leftover project field) has no input, so it must not
// keep checkout on "Continue to payment".
export const CUSTOMER_DETAIL_FIELD_CODES = ['name', 'middle_name', 'lastname', 'second_lastname', 'email', 'mobile_phone', 'birthdate']

export const isCustomerDetailRequirement = (code) => CUSTOMER_DETAIL_FIELD_CODES.includes(code)
