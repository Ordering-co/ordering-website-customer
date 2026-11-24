import React from 'react'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { formStateFixture, userFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { UserProfileForm } from '../index'

vi.unmock('~ui/utils')

vi.mock('~ui/src/components/Confirm', () => ({
  Alert: ({ open, title, content, onAccept }) => open && (
    <div role='alert' data-testid='alert' aria-label={title}>
      {content}
      <button type='button' onClick={onAccept}>Accept</button>
    </div>
  )
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

vi.mock('~ui/src/components/UserFormDetails', () => ({
  UserFormDetailsUI: () => <div data-testid='user-form-details-stub' />
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

describe('UserProfileForm', () => {
  it('renders my account heading', () => {
    const { getByText } = renderWithProviders(<UserProfileForm />)
    expect(getByText('My Account')).toBeInTheDocument()
  })
  it('shows a safe photo upload error and lets the customer select another file', async () => {
    const pendingPhoto = { ...formStateFixture, changes: { photo: 'data:image/png;base64,fake' } }
    const savePhoto = vi.fn()
    const choosePhoto = vi.fn()
    const view = renderWithProviders(<UserProfileForm formState={pendingPhoto} handleButtonUpdateClick={savePhoto} />)
    expect(savePhoto).toHaveBeenCalledWith(null, true)
    view.rerender(<UserProfileForm formState={{
      ...pendingPhoto,
      result: { error: true, result: ['Internal image storage diagnostic'] }
    }} handlechangeImage={choosePhoto}
    />)
    const alert = await view.findByTestId('alert')
    expect(alert).toHaveTextContent('Please try again')
    expect(view.queryByText('Internal image storage diagnostic')).toBeNull()
    fireEvent.click(view.getByText('Accept'))
    await waitFor(() => expect(view.queryByTestId('alert')).toBeNull())
    expect(view.getByRole('button', { name: 'Change profile photo' })).toBeEnabled()
    const file = new File(['fake'], 'photo.png', { type: 'image/png' })
    fireEvent.change(view.container.querySelector('input[type=file]'), { target: { files: [file] } })
    expect(choosePhoto).toHaveBeenCalledWith(file)
  })

  it('links a structured photo failure to the file picker', async () => {
    const pendingPhoto = { ...formStateFixture, changes: { photo: 'data:image/png;base64,fake' } }
    const view = renderWithProviders(<UserProfileForm formState={pendingPhoto} />)
    view.rerender(<UserProfileForm formState={{
      ...pendingPhoto,
      result: { error: true, result: ['Internal photo diagnostic'], error_codes: ['photo.image'] }
    }}
    />)
    await waitFor(() => expect(view.getByRole('button', { name: 'Change profile photo' })).toHaveAccessibleDescription('Check this field and try again.'))
    expect(view.queryByTestId('alert')).toBeNull()
  })

  it('uses a safe send-code alert for the profile phone verification request', async () => {
    const view = renderWithProviders(<UserProfileForm verifyPhoneState={{
      loading: false,
      result: { error: true, result: ['Internal phone diagnostic'], error_codes: ['cellphone.regex'] }
    }}
    />)
    const alert = await view.findByTestId('alert')
    expect(alert).toHaveAccessibleName('Send code')
    expect(alert).toHaveTextContent('Please try again')
    expect(alert).not.toHaveTextContent('Internal phone diagnostic')
  })

  it('opens the code entry again for a structured verification-code save failure', async () => {
    const setFormState = vi.fn()
    const saveCode = vi.fn()
    const rejected = {
      ...formStateFixture,
      changes: { cellphone: userFixture.cellphone, country_phone_code: 1, verification_code: '1234' },
      result: { error: true, result: ['Internal code diagnostic'], error_codes: ['verification_code.invalid'] }
    }
    const view = renderWithProviders(<UserProfileForm formState={rejected} setFormState={setFormState} handleSendVerifyCode={saveCode} />)

    const dialog = await view.findByRole('dialog', { name: 'Enter verification code' })
    const group = within(dialog).getByRole('group', { name: 'Enter verification code' })
    expect(group).toHaveAccessibleDescription('Check this field and try again.')
    expect(view.queryByText('Internal code diagnostic')).toBeNull()
    expect(saveCode).not.toHaveBeenCalled()
    const codeInput = within(group).getAllByRole('textbox')[0]
    fireEvent.paste(codeInput, { clipboardData: { getData: () => '5678' } })
    await waitFor(() => expect(setFormState).toHaveBeenCalledWith(expect.objectContaining({
      changes: { ...rejected.changes, verification_code: '5678' }
    })))
  })

  it('shows safe save feedback when a profile request containing a code fails without structured details', async () => {
    const view = renderWithProviders(<UserProfileForm formState={{
      ...formStateFixture,
      changes: { ...formStateFixture.changes, verification_code: '1234' },
      result: { error: true, result: ['Internal verification diagnostic'] }
    }}
    />)
    const alert = await view.findByTestId('alert')
    expect(alert).toHaveAccessibleName('Update profile')
    expect(alert).toHaveTextContent('Please try again')
    expect(alert).not.toHaveTextContent('Internal verification diagnostic')
  })
})
