import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { formStateFixture, userFixture, validationFieldsFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { UserDetails } from '../index'

// implementation notesthe modal's close, and the section's edit / cancel, are the
// design system's icon Button. "Change customer details" (a text link) is
// not: it keeps its native button (migration gap, Button has no link look).

const { toggleIsEdit, toggleEditCalls } = vi.hoisted(() => ({ toggleIsEdit: vi.fn(), toggleEditCalls: { edit: false } }))

vi.mock('~components/components/UserFormDetails', () => ({
  UserFormDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      isEdit={toggleEditCalls.edit}
      cartStatus={0}
      formState={formStateFixture}
      validationFields={validationFieldsFixture}
      userState={{ loading: false }}
      userData={userFixture}
      toggleIsEdit={toggleIsEdit}
      cleanFormState={vi.fn()}
      handleSendVerifyCode={vi.fn()}
      verifyPhoneState={{ result: null }}
      {...rest}
    />
  )
}))
vi.mock('~ui/src/components/UserFormDetails', () => ({
  UserFormDetailsUI: () => <form data-testid='user-form' />
}))
vi.mock('~ui/hooks/useCountdownTimer', () => ({
  useCountdownTimer: () => [60, vi.fn(), vi.fn()]
}))

const theme = themeWithValues()
// an icon Button: the base piece, a square of the size's height, ghost neutral, with a base Icon
const expectIconButton = (button, svgClass) => {
  expect(button.tagName).toBe('BUTTON')
  expect(button).toHaveAttribute('data-slot', 'button')
  expect(button).toHaveAttribute('type', 'button')
  expect(button.className).toContain('ui:w-(--ui-button-height)')
  expect(button.querySelector(svgClass)).toHaveAttribute('aria-hidden', 'true')
}

describe('UserDetails: the pieces', () => {
  it('the modal close is the base icon Button named Close, in a box that only keeps its layer', () => {
    const onClose = vi.fn()
    const { getByRole } = renderWithProviders(<UserDetails isModal onClose={onClose} />, { theme })
    const close = getByRole('button', { name: 'Close' })
    expectIconButton(close, 'svg.lucide-x')
    expect(close.getAttribute('role')).toBeNull()
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('the section\'s edit action is the base icon Button with the pencil', () => {
    toggleEditCalls.edit = false
    toggleIsEdit.mockClear()
    const { getByLabelText } = renderWithProviders(<UserDetails isCheckoutSection />, { theme })
    const edit = getByLabelText('Change customer details')
    expectIconButton(edit, 'svg.lucide-pencil')
    expect(edit).toHaveAttribute('data-doc-control', 'checkout-customer-edit')
    fireEvent.click(edit)
    expect(toggleIsEdit).toHaveBeenCalledTimes(1)
  })

  it('the section\'s cancel action is the base icon Button with the X', () => {
    toggleEditCalls.edit = true
    const { getByLabelText } = renderWithProviders(<UserDetails isCheckoutSection isEdit />, { theme })
    const cancel = getByLabelText('Cancel')
    expectIconButton(cancel, 'svg.lucide-x')
    expect(cancel).toHaveAttribute('data-doc-control', 'checkout-customer-cancel')
    toggleEditCalls.edit = false
  })

  it('the plain header\'s cancel is the base icon Button too, and the text action is a base link Button', () => {
    toggleEditCalls.edit = true
    const { getByLabelText } = renderWithProviders(<UserDetails isEdit />, { theme })
    expectIconButton(getByLabelText('Cancel'), 'svg.lucide-x')
    toggleEditCalls.edit = false
    const view = renderWithProviders(<UserDetails />, { theme })
    const link = view.getByRole('button', { name: 'Change customer details' })
    expect(link).toHaveAttribute('data-slot', 'button')
    expect(link.tagName).toBe('BUTTON')
    expect(link.style.getPropertyValue('--ui-link-color')).toBeTruthy()
  })
})
