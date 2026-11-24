import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { baseForgotPasswordUIProps } from '../../__tests__/helpers/authTestUtils'

// The real react-hook-form against the base Input: the field
// registers through its ref, validates on submit and marks itself invalid.
const { forgotPropsRef } = vi.hoisted(() => ({ forgotPropsRef: { current: null } }))

vi.mock('~components/components/ForgotPasswordForm', () => ({
  ForgotPasswordForm: ({ UIComponent, ...rest }) => (
    <UIComponent {...rest} {...forgotPropsRef.current} />
  )
}))

import { ForgotPasswordForm } from '../index'

describe('ForgotPasswordForm — validation with the real form', () => {
  it('an empty email does not send, says so and is invalid', async () => {
    const handleButtonForgotPasswordClick = vi.fn()
    forgotPropsRef.current = { ...baseForgotPasswordUIProps, handleButtonForgotPasswordClick }
    const { container, getByPlaceholderText, findByText } = renderWithProviders(<ForgotPasswordForm />)
    fireEvent.submit(container.querySelector('form'))
    expect(await findByText(/The field Email is required/)).toBeInTheDocument()
    expect(getByPlaceholderText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(handleButtonForgotPasswordClick).not.toHaveBeenCalled()
  })

  it('a typed email is read from the field and sends', async () => {
    const handleButtonForgotPasswordClick = vi.fn()
    forgotPropsRef.current = { ...baseForgotPasswordUIProps, handleButtonForgotPasswordClick }
    const { container, getByPlaceholderText } = renderWithProviders(<ForgotPasswordForm />)
    fireEvent.change(getByPlaceholderText('Email'), { target: { value: 'User@Test.com' } })
    fireEvent.submit(container.querySelector('form'))
    await waitFor(() => expect(handleButtonForgotPasswordClick).toHaveBeenCalled())
    expect(getByPlaceholderText('Email')).not.toHaveAttribute('aria-invalid')
  })

  it('an invalid email says so', async () => {
    forgotPropsRef.current = { ...baseForgotPasswordUIProps }
    const { container, getByPlaceholderText, findByText } = renderWithProviders(<ForgotPasswordForm />)
    fireEvent.change(getByPlaceholderText('Email'), { target: { value: 'not-an-email' } })
    fireEvent.submit(container.querySelector('form'))
    expect(await findByText(/Invalid email address/)).toBeInTheDocument()
  })
})
