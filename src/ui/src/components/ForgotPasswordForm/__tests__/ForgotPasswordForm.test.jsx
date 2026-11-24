import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { baseForgotPasswordUIProps } from '../../__tests__/helpers/authTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

import { ForgotPasswordForm } from '../index'

const { forgotPropsRef, formErrorsRef } = vi.hoisted(() => ({ forgotPropsRef: { current: null }, formErrorsRef: { current: {} } }))

// The button and the field are the design system's pieces, real; the form's
// errors are the test's (formErrorsRef)
vi.mock('react-hook-form', () => {
  const { createStableUseFormMock } = require('../../__tests__/helpers/authUiTestMocks.js')
  const form = createStableUseFormMock().useForm()
  return {
    useForm: () => ({
      ...form,
      get errors () { return formErrorsRef.current }
    })
  }
})
vi.mock('../styles', () => {
  const { createAuthUiPrimitives } = require('../../__tests__/helpers/authUiTestMocks.js')
  const { Primitive, FormInput } = createAuthUiPrimitives()
  return {
    ForgotPasswordContainer: Primitive,
    FormSide: Primitive,
    FormInput,
    RedirectLink: Primitive,
    ReCaptchaWrapper: Primitive,
    ValidationText: Primitive
  }
})
vi.mock('~components/components/ForgotPasswordForm', () => ({
  ForgotPasswordForm: ({ UIComponent, ...rest }) => (
    <UIComponent {...rest} {...forgotPropsRef.current} />
  )
}))

describe('ForgotPasswordForm', () => {
  it('renders recover password form', () => {
    forgotPropsRef.current = { ...baseForgotPasswordUIProps }
    const { getByPlaceholderText, getByText } = renderWithProviders(<ForgotPasswordForm />)
    expect(getByText('Forgot your password?')).toBeInTheDocument()
    expect(getByPlaceholderText('Email')).toBeInTheDocument()
    expect(getByText('Recover Password')).toBeInTheDocument()
  })

  it('submits forgot password request', () => {
    const handleButtonForgotPasswordClick = vi.fn()
    forgotPropsRef.current = {
      ...baseForgotPasswordUIProps,
      handleButtonForgotPasswordClick
    }
    const { container } = renderWithProviders(<ForgotPasswordForm />)
    fireEvent.submit(container.querySelector('form'))
    expect(handleButtonForgotPasswordClick).toHaveBeenCalled()
  })

  it('shows error alert when request fails', async () => {
    forgotPropsRef.current = {
      ...baseForgotPasswordUIProps,
      formState: { loading: false, result: { error: true, result: ['User not found'] } }
    }
    const { getByTestId } = renderWithProviders(<ForgotPasswordForm />)
    await waitFor(() => {
      expect(getByTestId('alert')).toHaveTextContent('Please try again')
      expect(getByTestId('alert')).not.toHaveTextContent('User not found')
    })
  })

  it('associates structured API validation with email and permits another attempt', async () => {
    forgotPropsRef.current = {
      ...baseForgotPasswordUIProps,
      formState: { loading: false, result: { error: true, error_codes: ['email.email'], result: ['raw email validation'] } }
    }
    const { getByRole, queryByTestId } = renderWithProviders(<ForgotPasswordForm />)
    expect(getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription('Invalid email address')
    expect(queryByTestId('alert')).toBeNull()
    expect(getByRole('button', { name: 'Recover Password' })).toBeEnabled()
  })

  it('shows success state after submit completes', async () => {
    const handleButtonForgotPasswordClick = vi.fn()
    forgotPropsRef.current = {
      ...baseForgotPasswordUIProps,
      handleButtonForgotPasswordClick,
      formState: { loading: false, result: { error: null, result: ['sent'] } }
    }
    const { container, getByText } = renderWithProviders(<ForgotPasswordForm />)
    fireEvent.submit(container.querySelector('form'))
    await waitFor(() => {
      expect(handleButtonForgotPasswordClick).toHaveBeenCalled()
      expect(getByText('Link Sent')).toBeInTheDocument()
    })
  })

  it('renders login redirect link when provided', () => {
    forgotPropsRef.current = {
      ...baseForgotPasswordUIProps,
      elementLinkToLogin: <a href='/login'>Sign in</a>
    }
    const { getByText } = renderWithProviders(<ForgotPasswordForm />)
    expect(getByText('Do you want to sign in?')).toBeInTheDocument()
    expect(getByText('Sign in')).toBeInTheDocument()
  })
})

describe('ForgotPasswordForm — pieces of the design system', () => {
  const submitOf = (container) => container.querySelector('button[type="submit"]')

  it('the email field and the submit are the base Input and Button', () => {
    forgotPropsRef.current = { ...baseForgotPasswordUIProps }
    const { getByPlaceholderText, container } = renderWithProviders(<ForgotPasswordForm />)
    expect(getByPlaceholderText('Email')).toHaveAttribute('data-slot', 'input')
    expect(submitOf(container)).toHaveAttribute('data-slot', 'button')
    expect(submitOf(container)).toHaveAttribute('data-doc-control', 'password-recovery-submit')
  })

  it('the submit is the primary lg of the default slot, and takes the slot the theme chose', () => {
    forgotPropsRef.current = { ...baseForgotPasswordUIProps }
    const byDefault = renderWithProviders(<ForgotPasswordForm />, { theme: themeWithValues() })
    const lg = componentVars(themeWithValues(), 'button', { size: 'lg', color: 'primary', appearance: 'solid' })
    expect(submitOf(byDefault.container).style.getPropertyValue('--ui-button-height')).toBe(lg['--ui-button-height'])
    expect(submitOf(byDefault.container).style.getPropertyValue('--ui-button-background')).toBe(lg['--ui-button-background'])
    byDefault.unmount()

    const theme = themeWithValues((values) => {
      values.components.auth_form.slots.submit = { component: 'button', size: 'md', appearance: 'outline', color: 'secondary', shape: null }
      return values
    })
    const chosen = componentVars(theme, 'button', { size: 'md', color: 'secondary', appearance: 'outline' })
    const { container } = renderWithProviders(<ForgotPasswordForm />, { theme })
    const style = submitOf(container).style
    expect(style.getPropertyValue('--ui-button-height')).toBe(chosen['--ui-button-height'])
    expect(style.getPropertyValue('--ui-button-height')).not.toBe(lg['--ui-button-height'])
    expect(style.getPropertyValue('--ui-button-background')).toBe(chosen['--ui-button-background'])
    expect(style.getPropertyValue('--ui-button-border')).toBe(chosen['--ui-button-border'])
  })

  it('while it sends: busy, keeps its name (no "Loading..." text), answers no click', () => {
    forgotPropsRef.current = { ...baseForgotPasswordUIProps, formState: { loading: true, result: null } }
    const { container, getByRole, queryByText } = renderWithProviders(<ForgotPasswordForm />)
    const submit = getByRole('button', { name: 'Recover Password' })
    expect(submit).toBe(submitOf(container))
    expect(submit).toHaveAttribute('aria-busy', 'true')
    expect(submit.querySelector('[data-slot="button-spinner"]')).not.toBeNull()
    expect(queryByText('Loading...')).toBeNull()
  })

  it('after sending it stays disabled (not busy) with the "Link Sent" label', async () => {
    forgotPropsRef.current = {
      ...baseForgotPasswordUIProps,
      formState: { loading: false, result: { error: null, result: ['sent'] } }
    }
    const { container } = renderWithProviders(<ForgotPasswordForm />)
    expect(submitOf(container)).not.toBeDisabled()
    fireEvent.submit(container.querySelector('form'))
    await waitFor(() => {
      expect(submitOf(container)).toBeDisabled()
      expect(submitOf(container)).toHaveTextContent('Link Sent')
    })
    expect(submitOf(container)).not.toHaveAttribute('aria-busy')
  })

  it('sending while the result is still empty does not break the label', () => {
    forgotPropsRef.current = { ...baseForgotPasswordUIProps, formState: { loading: true, result: null } }
    const { container } = renderWithProviders(<ForgotPasswordForm />)
    expect(() => fireEvent.submit(container.querySelector('form'))).not.toThrow()
  })

  it('the email with an error is invalid and points at its message', () => {
    formErrorsRef.current = { email: { type: 'required', message: 'The field Email is required' } }
    forgotPropsRef.current = { ...baseForgotPasswordUIProps }
    const { getByPlaceholderText, getByText } = renderWithProviders(<ForgotPasswordForm />)
    const email = getByPlaceholderText('Email')
    expect(email).toHaveAttribute('aria-invalid', 'true')
    const message = getByText(/The field Email is required/)
    expect(email.getAttribute('aria-describedby')).toBe(message.id)
    formErrorsRef.current = {}
  })

  it('without an error the email is not invalid', () => {
    forgotPropsRef.current = { ...baseForgotPasswordUIProps }
    const { getByPlaceholderText } = renderWithProviders(<ForgotPasswordForm />)
    expect(getByPlaceholderText('Email')).not.toHaveAttribute('aria-invalid')
    expect(getByPlaceholderText('Email')).not.toHaveAttribute('aria-describedby')
  })

  it('the email goes lower case and without forbidden characters, as before', () => {
    const hanldeChangeInput = vi.fn()
    forgotPropsRef.current = { ...baseForgotPasswordUIProps, hanldeChangeInput }
    const { getByPlaceholderText } = renderWithProviders(<ForgotPasswordForm />)
    fireEvent.change(getByPlaceholderText('Email'), { target: { value: 'Us er@Test.com' } })
    expect(hanldeChangeInput).toHaveBeenCalledWith({ target: { name: 'email', value: 'user@test.com' } })
  })
})
