import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { formStateFixture, userFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { UserProfileForm } from '../index'

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

vi.mock('~ui/src/components/UserFormDetails', () => ({
  UserFormDetailsUI: ({ setWillVerifyOtpState }) => <button type='button' onClick={() => setWillVerifyOtpState(true)}>Verify phone</button>
}))

vi.mock('~ui/src/components/VerifyCodeForm', () => ({
  VerifyCodeForm: () => <input aria-label='Code' />
}))

vi.mock('~ui/src/components/AddressList', () => ({
  AddressList: () => null
}))

vi.mock('~ui/src/components/StudentsList', () => ({
  StudentsList: () => null
}))

vi.mock('~ui/hooks/useCountdownTimer', () => ({
  useCountdownTimer: () => [60, vi.fn(), vi.fn()]
}))

describe('UserProfileForm: the verification code dialog', () => {
  it('is the base Dialog named by its title, lg, a centered card on a phone (the legacy height 420px), closed by its close', async () => {
    const view = renderWithProviders(<UserProfileForm />)
    fireEvent.click(view.getByRole('button', { name: 'Verify phone' }))
    const dialog = await view.findByRole('dialog', { name: 'Enter verification code' })
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    expect(dialog.parentElement.className).toContain('ui:max-mobile:p-lg')
    // no fixed height (main's 420px on a phone): the card is as tall as its content (decided, P3b)
    expect(dialog.style.height).toBe('')
    expect(dialog.className).not.toMatch(/ui:(max-mobile:)?h-/)
    expect(dialog.className).not.toContain('ui:max-mobile:h-full')
    fireEvent.click(view.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull())
  })
})
