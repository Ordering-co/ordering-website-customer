import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { baseResetPasswordUIProps } from '../../__tests__/helpers/authTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

import { ResetPassword } from '../index'

const { resetPropsRef } = vi.hoisted(() => ({ resetPropsRef: { current: null } }))

vi.mock('react-hook-form', () => {
  const { createStableUseFormMock } = require('../../__tests__/helpers/authUiTestMocks.js')
  return createStableUseFormMock()
})
vi.mock('~components/components/ResetPassword', () => ({
  ResetPassword: ({ UIComponent, ...rest }) => (
    <UIComponent {...rest} {...resetPropsRef.current} />
  )
}))
vi.mock('~ui/src/components/LoginForm', () => ({
  LoginForm: () => <div data-testid='login-form-modal' />
}))

describe('ResetPassword UI', () => {
  it('renders reset password form when code and random exist', () => {
    resetPropsRef.current = { ...baseResetPasswordUIProps }
    const { getByText } = renderWithProviders(<ResetPassword code='abc' random='xyz' />)
    expect(getByText('Reset password')).toBeInTheDocument()
    expect(getByText('Change password')).toBeInTheDocument()
  })

  it('renders code entry form when code and random are missing', () => {
    resetPropsRef.current = {
      ...baseResetPasswordUIProps,
      code: null,
      random: null
    }
    const { getByText } = renderWithProviders(<ResetPassword />)
    expect(getByText('Please insert the codes')).toBeInTheDocument()
  })

  it('submits password reset', () => {
    const handleResetPassword = vi.fn()
    resetPropsRef.current = {
      ...baseResetPasswordUIProps,
      handleResetPassword
    }
    const { container, getByText } = renderWithProviders(<ResetPassword code='abc' random='xyz' />)
    expect(getByText('Change password')).toBeInTheDocument()
    fireEvent.submit(container.querySelector('form'))
    expect(handleResetPassword).toHaveBeenCalled()
  })

  it('shows error alert when reset fails', async () => {
    resetPropsRef.current = {
      ...baseResetPasswordUIProps,
      formState: { loading: false, result: { error: true, result: ['Invalid code'] } }
    }
    const { getByTestId } = renderWithProviders(<ResetPassword code='abc' random='xyz' />)
    await waitFor(() => {
      expect(getByTestId('alert')).toHaveTextContent('Please try again')
      expect(getByTestId('alert')).not.toHaveTextContent('Invalid code')
    })
  })

  it('associates structured API validation with the password and keeps the submit enabled', () => {
    resetPropsRef.current = {
      ...baseResetPasswordUIProps,
      formState: { loading: false, result: { error: true, error_codes: ['password.min'], result: ['raw password validation'] } }
    }
    const { getByLabelText, getByRole, queryByTestId } = renderWithProviders(<ResetPassword code='abc' random='xyz' />)
    expect(getByLabelText('New password')).toHaveAccessibleDescription('Check this field and try again.')
    expect(queryByTestId('alert')).toBeNull()
    expect(getByRole('button', { name: 'Change password' })).toBeEnabled()
  })

  it('opens login modal after successful reset: the base dialog, whose close closes it', async () => {
    resetPropsRef.current = {
      ...baseResetPasswordUIProps,
      formState: { loading: false, result: { error: null, result: ['ok'] } }
    }
    const { findByRole, queryByRole } = renderWithProviders(<ResetPassword code='abc' random='xyz' />)
    const dialog = await findByRole('dialog')
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    expect(within(dialog).getByTestId('login-form-modal')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })
})

describe('ResetPassword — pieces of the design system', () => {
  const submitOf = (container) => container.querySelector('button[type="submit"]')

  it('the new password fields and the submit are the base Input and Button', () => {
    resetPropsRef.current = { ...baseResetPasswordUIProps }
    const { getByLabelText, container } = renderWithProviders(<ResetPassword code='abc' random='xyz' />)
    ;['New password', 'Confirm Password'].forEach((name) => {
      expect(getByLabelText(name)).toHaveAttribute('data-slot', 'input')
      expect(getByLabelText(name)).toHaveAttribute('type', 'password')
    })
    expect(submitOf(container)).toHaveAttribute('data-slot', 'button')
    expect(submitOf(container)).toHaveAttribute('data-doc-control', 'password-reset-submit')
    expect(submitOf(container)).not.toBeDisabled()
  })

  it('the code and random fields and "Submit codes" are pieces too', () => {
    resetPropsRef.current = { ...baseResetPasswordUIProps, code: null, random: null }
    const { getByLabelText, container, getByRole } = renderWithProviders(<ResetPassword />)
    expect(getByLabelText('Code')).toHaveAttribute('data-slot', 'input')
    expect(getByLabelText('Random')).toHaveAttribute('data-slot', 'input')
    expect(getByRole('button', { name: 'Submit codes' })).toBe(submitOf(container))
    expect(submitOf(container)).toHaveAttribute('data-slot', 'button')
    expect(submitOf(container)).not.toBeDisabled()
  })

  it('both submits take the slot the theme chose', () => {
    const theme = themeWithValues((values) => {
      values.components.auth_form.slots.submit = { component: 'button', size: 'md', appearance: 'outline', color: 'secondary', shape: null }
      return values
    })
    const chosen = componentVars(theme, 'button', { size: 'md', color: 'secondary', appearance: 'outline' })
    ;[{ code: 'abc', random: 'xyz' }, { code: null, random: null }].forEach((ids) => {
      resetPropsRef.current = { ...baseResetPasswordUIProps, ...ids }
      const { container, unmount } = renderWithProviders(<ResetPassword />, { theme })
      const style = submitOf(container).style
      expect(style.getPropertyValue('--ui-button-height')).toBe(chosen['--ui-button-height'])
      expect(style.getPropertyValue('--ui-button-background')).toBe(chosen['--ui-button-background'])
      expect(style.getPropertyValue('--ui-button-border')).toBe(chosen['--ui-button-border'])
      unmount()
    })
  })

  it('while it sends: busy, secondary (where the slot leaves its color open), keeps its name and shows no "Loading" text', () => {
    resetPropsRef.current = { ...baseResetPasswordUIProps, formState: { loading: true, result: null } }
    const theme = themeWithValues((values) => {
      values.components.auth_form.slots.submit = { ...values.components.auth_form.slots.submit, color: null }
      return values
    })
    const { container, getByRole, queryByText } = renderWithProviders(<ResetPassword />, { theme })
    const submit = getByRole('button', { name: 'Change password' })
    expect(submit).toBe(submitOf(container))
    expect(submit).toHaveAttribute('aria-busy', 'true')
    expect(submit.querySelector('[data-slot="button-spinner"]')).not.toBeNull()
    expect(queryByText('Loading')).toBeNull()
    const secondary = componentVars(theme, 'button', { size: 'lg', color: 'secondary', appearance: 'solid' })
    expect(submit.style.getPropertyValue('--ui-button-background')).toBe(secondary['--ui-button-background'])
  })

  it('with a result it is disabled (a true boolean), secondary and not busy', () => {
    resetPropsRef.current = { ...baseResetPasswordUIProps, formState: { loading: false, result: { error: null, result: ['ok'] } } }
    const { container } = renderWithProviders(<ResetPassword />)
    expect(submitOf(container)).toBeDisabled()
    expect(submitOf(container)).not.toHaveAttribute('aria-busy')
  })
})
