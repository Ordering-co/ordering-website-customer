import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { StripeRedirectForm } from '../index'

// implementation notes M2: with the real react-hook-form, the payment method is the first invalid field
const onSubmit = vi.hoisted(() => vi.fn())

vi.mock('~components/components/PaymentOptionStripeRedirect/StripeRedirectForm', () => ({
  StripeRedirectForm: ({ UIComponent, ...rest }) => (
    <UIComponent paymethods={[{ name: 'Bancontact', value: 'bancontact' }]} handleSubmitPaymentMethod={onSubmit} {...rest} />
  )
}))

class FakePointerEvent extends MouseEvent {
  constructor (type, init = {}) {
    super(type, init)
    this.pointerType = init.pointerType
  }
}

describe('StripeRedirectForm validation (real react-hook-form)', () => {
  beforeEach(() => { vi.stubGlobal('PointerEvent', FakePointerEvent); onSubmit.mockClear() })
  afterEach(() => vi.unstubAllGlobals())

  const fill = (utils) => {
    fireEvent.change(utils.getByLabelText('Account holder'), { target: { value: 'Ana' } })
    fireEvent.change(utils.getByLabelText('Email'), { target: { value: 'ana@example.com' } })
  }

  it('an empty method blocks the submit, is named by the trigger and takes the focus', async () => {
    const utils = renderWithProviders(<StripeRedirectForm />)
    fill(utils)
    const method = utils.getByLabelText('Select a payment method')
    fireEvent.click(utils.getByRole('button', { name: 'OK' }))
    const error = await utils.findByText('This field is required')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(method).toHaveAttribute('aria-invalid', 'true')
    expect(method.getAttribute('aria-describedby')).toBe(error.id)
    await waitFor(() => expect(document.activeElement).toBe(method))
  })

  it('a picked method sends type, holder and email', async () => {
    const utils = renderWithProviders(<StripeRedirectForm />)
    fill(utils)
    const method = utils.getByLabelText('Select a payment method')
    method.focus()
    fireEvent.keyDown(method, { key: 'ArrowDown' })
    await utils.findByRole('listbox')
    await waitFor(() => expect(document.activeElement.getAttribute('role')).toBe('option'))
    fireEvent.keyDown(document.activeElement, { key: 'Enter' })
    await waitFor(() => expect(method).not.toHaveAttribute('aria-invalid'))
    fireEvent.click(utils.getByRole('button', { name: 'OK' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ type: 'bancontact', name: 'Ana', email: 'ana@example.com' })
  })
})
