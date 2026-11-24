import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { baseSignupUIProps } from '../../__tests__/helpers/authTestUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

import { SignUpBusiness } from '../index'

// The real react-hook-form (no mock of useForm): the terms box is the base Checkbox,
// registered through its inputRef, and it must decide whether the form is sent.

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

const { signupUIPropsRef } = vi.hoisted(() => ({ signupUIPropsRef: { current: null } }))

vi.mock('~components/components/SignupForm', () => ({
  SignupForm: ({ UIComponent, ...rest }) => <UIComponent {...rest} {...signupUIPropsRef.current} />
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { verification_phone_required: { value: '0' }, terms_and_conditions: { value: 'true' } } }]
}))
vi.mock('~components/contexts/SiteContext', () => ({
  useSite: () => [{ site: { name: 'Mi Marketplace' } }]
}))
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [{ pages: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ content: { error: true, result: null } }) })) }]
}))

const renderForm = async (handleButtonSignupClick) => {
  signupUIPropsRef.current = { ...baseSignupUIProps, handleButtonSignupClick }
  const view = renderWithProviders(<SignUpBusiness />, { theme: themeWithValues() })
  await waitFor(() => expect(view.getByText('Sign up now')).toBeInTheDocument())
  return view
}

describe('SignUpBusiness — the terms checkbox with the real react-hook-form', () => {
  it('unchecked, it blocks the submit and says why; checked, the form is sent', async () => {
    const send = vi.fn()
    const { container, getByRole } = await renderForm(send)
    const form = container.querySelector('form')
    const terms = getByRole('checkbox')

    fireEvent.submit(form)
    await waitFor(() => expect(terms).toHaveAttribute('aria-invalid', 'true'))
    expect(send).not.toHaveBeenCalled()
    expect(container.querySelector(`#${CSS.escape(terms.getAttribute('aria-describedby'))}`)).toHaveTextContent('You must accept the Terms & Conditions.')

    fireEvent.click(terms)
    await waitFor(() => expect(terms).toHaveAttribute('aria-checked', 'true'))
    fireEvent.submit(form)
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
  })
})
