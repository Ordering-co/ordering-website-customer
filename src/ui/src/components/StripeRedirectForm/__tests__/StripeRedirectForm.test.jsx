import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { StripeRedirectForm } from '../index'

const formState = vi.hoisted(() => ({ isSubmitting: false }))
const form = vi.hoisted(() => ({ register: vi.fn(), unregister: vi.fn(), setValue: vi.fn() }))

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    handleSubmit: (fn) => (e) => {
      e?.preventDefault?.()
      return fn({})
    },
    register: (...args) => { form.register(...args); return null },
    unregister: form.unregister,
    setValue: form.setValue,
    errors: {},
    formState
  })
}))

vi.mock('~components/components/PaymentOptionStripeRedirect/StripeRedirectForm', () => ({
  StripeRedirectForm: ({ UIComponent, ...rest }) => (
    <UIComponent
      paymethods={[{ name: 'Bancontact', value: 'bancontact' }]}
      handleSubmitPaymentMethod={vi.fn()}
      {...rest}
    />
  )
}))

describe('StripeRedirectForm', () => {
  it('renders redirect payment method form', () => {
    const { getByRole } = renderWithProviders(<StripeRedirectForm />)
    expect(getByRole('button', { name: 'OK' })).toBeInTheDocument()
  })

  it('draws the holder and email fields and the submit with the base pieces', () => {
    formState.isSubmitting = false
    const { getByLabelText, getByRole } = renderWithProviders(<StripeRedirectForm />)
    const holder = getByLabelText('Account holder')
    expect(holder).toHaveAttribute('data-slot', 'input')
    expect(holder).toHaveAttribute('autocomplete', 'off')
    const email = getByLabelText('Email')
    expect(email).toHaveAttribute('data-slot', 'input')
    expect(email).toHaveAttribute('type', 'email')
    const submit = getByRole('button', { name: 'OK' })
    expect(submit).toHaveAttribute('data-slot', 'button')
    expect(submit).toHaveAttribute('type', 'submit')
    expect(submit).not.toBeDisabled()
    // the payment method is the base Select: named by its label
    const method = getByLabelText('Select a payment method')
    expect(method).toHaveAttribute('data-slot', 'select-trigger')
    expect(method).toHaveAttribute('role', 'combobox')
  })

  it('shows Loading... and disables the submit while it sends', () => {
    formState.isSubmitting = true
    const { getByRole } = renderWithProviders(<StripeRedirectForm />)
    const submit = getByRole('button', { name: 'Loading...' })
    expect(submit).toHaveAttribute('data-slot', 'button')
    expect(submit).toBeDisabled()
    formState.isSubmitting = false
  })

  // (jsdom has no PointerEvent: a mouse event that carries the pointer's fields, as Select.test does)
  class FakePointerEvent extends MouseEvent {
    constructor (type, init = {}) {
      super(type, init)
      this.pointerType = init.pointerType
    }
  }

  describe('the payment method (a custom field of react-hook-form)', () => {
    beforeEach(() => { vi.stubGlobal('PointerEvent', FakePointerEvent); Object.values(form).forEach(fn => fn.mockClear()) })
    afterEach(() => vi.unstubAllGlobals())

    it('is registered as required and reports the picked method to the form, validating it', async () => {
      const { getByLabelText, findByRole, unmount } = renderWithProviders(<StripeRedirectForm />)
      expect(form.register).toHaveBeenCalledWith({ name: 'type' }, { required: true })
      const method = getByLabelText('Select a payment method')
      method.focus()
      fireEvent.keyDown(method, { key: 'ArrowDown' })
      await findByRole('listbox')
      await waitFor(() => expect(document.activeElement.getAttribute('role')).toBe('option'))
      fireEvent.keyDown(document.activeElement, { key: 'Enter' })
      await waitFor(() => expect(form.setValue).toHaveBeenCalledWith('type', 'bancontact', { shouldValidate: true }))
      unmount()
      expect(form.unregister).toHaveBeenCalledWith('type')
    })
  })
})
