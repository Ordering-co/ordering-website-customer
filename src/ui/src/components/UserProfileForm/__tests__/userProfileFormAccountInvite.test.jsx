import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { formStateFixture, userFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { UserProfileForm } from '../index'

const state = vi.hoisted(() => ({ session: { auth: true, user: {} } }))

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [state.session, { login: vi.fn() }]
}))
vi.mock('~components/components/UserFormDetails', () => ({
  UserFormDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      view='account'
      isEdit={false}
      formState={formStateFixture}
      userData={userFixture}
      user={userFixture}
      toggleIsEdit={vi.fn()}
      handleButtonUpdateClick={vi.fn()}
      handlechangeImage={vi.fn()}
      handleSendOtp={vi.fn()}
      verifyPhoneState={{ result: null }}
      setFormState={vi.fn()}
      showCustomerPicture={false}
      isHiddenAddress
      {...rest}
    />
  )
}))
vi.mock('~ui/src/components/UserFormDetails', () => ({ UserFormDetailsUI: () => <div data-testid='user-form-details-stub' /> }))
vi.mock('~ui/src/components/AddressList', () => ({ AddressList: () => null }))
vi.mock('~ui/src/components/StudentsList', () => ({ StudentsList: () => null }))
vi.mock('~ui/hooks/useCountdownTimer', () => ({ useCountdownTimer: () => [60, vi.fn(), vi.fn()] }))
// the invitation has its own tests: here, whether the page opens it
vi.mock('../../AccountInvite/AccountInvite', () => ({
  AccountInvite: ({ entry, open }) => (open ? <div data-testid='invite' data-entry={entry} /> : null)
}))

describe('UserProfileForm: the invitation to create an account', () => {
  beforeEach(() => {
    state.session = { auth: true, user: { id: 5, guest_id: 'g-1' } }
  })

  it('a guest is invited when the account page is entered', () => {
    renderWithProviders(<UserProfileForm />)
    expect(screen.getByTestId('invite')).toHaveAttribute('data-entry', 'profile')
  })

  it('a user with an account is not', () => {
    state.session = { auth: true, user: { id: 5 } }
    renderWithProviders(<UserProfileForm />)
    expect(screen.queryByTestId('invite')).toBeNull()
  })

  it('the other views of the profile are not where a guest is invited', () => {
    renderWithProviders(<UserProfileForm view='notifications' />)
    expect(screen.queryByTestId('invite')).toBeNull()
  })
})
