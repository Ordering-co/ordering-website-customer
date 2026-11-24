import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { formStateFixture, userFixture, validationFieldsFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { UserDetails } from '../index'

vi.mock('~components/components/UserFormDetails', () => ({
  UserFormDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      isEdit={false}
      isModal
      cartStatus={0}
      formState={formStateFixture}
      validationFields={validationFieldsFixture}
      userState={{ loading: false }}
      userData={userFixture}
      loading={false}
      toggleIsEdit={vi.fn()}
      onClose={vi.fn()}
      handleSendVerifyCode={vi.fn()}
      verifyPhoneState={{ result: null }}
      {...rest}
    />
  )
}))

vi.mock('~ui/hooks/useCountdownTimer', () => ({
  useCountdownTimer: () => [60, vi.fn(), vi.fn()]
}))

describe('UserDetails', () => {
  it('renders customer details header and user name', () => {
    const { getByText } = renderWithProviders(<UserDetails />)
    expect(getByText('Customer Details')).toBeInTheDocument()
    expect(getByText(/Jane/)).toBeInTheDocument()
  })

  it('the modal close is a named control that closes as a native button, its icon decorative', () => {
    const onClose = vi.fn()
    const { getByRole } = renderWithProviders(<UserDetails onClose={onClose} />)
    const close = getByRole('button', { name: 'Close' })
    expect(close.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    fireEvent.click(close)
    // a native button: the browser clicks it on Enter and Space
    expect(close.tagName).toBe('BUTTON')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("shows a guest's guest_email even when email is an empty string", () => {
    const guest = { ...userFixture, guest_id: 'g-1', email: '', guest_email: 'guest@shop.test' }
    const { getByText } = renderWithProviders(<UserDetails userData={guest} />)
    expect(getByText('guest@shop.test')).toBeInTheDocument()
  })

  it('shows safe verification feedback in place of the SMS provider response', async () => {
    const rawProviderError = 'Twilio provider request failed'
    const { findByText, queryByText } = renderWithProviders(
      <UserDetails verifyPhoneState={{
        result: { error: true, error_codes: ['ERROR_AUTH_SMS_TOKEN'], result: [rawProviderError] }
      }}
      />
    )
    expect(await findByText('Check the verification code or request a new one.')).toBeInTheDocument()
    expect(queryByText(rawProviderError)).toBeNull()
  })
})
