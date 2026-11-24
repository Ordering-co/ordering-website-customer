import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { VerifyCodeForm } from '../index'

import { themeWithValues, cssFor } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '../../../design-system/lib/componentVars'

const handleCheckPhoneCode = vi.fn()

vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (_key, fallback) => fallback]
}))

const theme = themeWithValues()

describe('VerifyCodeForm', () => {
  const props = {
    otpLeftTime: 120,
    handleSendOtp: vi.fn(),
    handleCheckPhoneCode,
    credentials: { cellphone: '5551234567', country_phone_code: '+1' },
    email: 'user@example.com',
    isPhone: true
  }
  const paste = (box, text) => fireEvent.paste(box, { clipboardData: { getData: () => text } })

  it('the code is four boxes of the base InputCode, the first one focused, and the code is not asked before the fourth digit', () => {
    handleCheckPhoneCode.mockClear()
    const { getByRole, getByLabelText } = renderWithProviders(<VerifyCodeForm {...props} />, { theme })
    const group = getByRole('group', { name: 'Verification Code' })
    expect(group).toHaveAttribute('data-slot', 'input-code')
    expect(group.querySelectorAll('input')).toHaveLength(4)
    expect(getByLabelText('Verification Code 1/4')).toHaveFocus()
    fireEvent.change(getByLabelText('Verification Code 1/4'), { target: { value: '1' } })
    fireEvent.change(getByLabelText('Verification Code 2/4'), { target: { value: '2' } })
    fireEvent.change(getByLabelText('Verification Code 3/4'), { target: { value: '3' } })
    expect(handleCheckPhoneCode).not.toHaveBeenCalled()
    fireEvent.change(getByLabelText('Verification Code 4/4'), { target: { value: '4' } })
    expect(handleCheckPhoneCode).toHaveBeenCalledWith({ cellphone: '5551234567', country_phone_code: '+1', code: '1234' })
  })

  it('the column is limited in characters (44ch, 62ch from 576 px), not in px', () => {
    const { getByRole } = renderWithProviders(<VerifyCodeForm {...props} />, { theme })
    const css = cssFor(getByRole('group', { name: 'Verification Code' }).parentElement.parentElement).replace(/\s/g, '')
    expect(css).toContain('max-width:min(100%,44ch)')
    expect(css).toMatch(/@media\(min-width:576px\)\{[^}]*max-width:min\(100%,62ch\)/)
  })

  it('a pasted code fills the boxes and a letter is dropped', () => {
    handleCheckPhoneCode.mockClear()
    const { getByLabelText } = renderWithProviders(<VerifyCodeForm {...props} />, { theme })
    fireEvent.change(getByLabelText('Verification Code 1/4'), { target: { value: 'a' } })
    expect(getByLabelText('Verification Code 1/4')).toHaveValue('')
    paste(getByLabelText('Verification Code 1/4'), '9876')
    expect(handleCheckPhoneCode).toHaveBeenCalledWith(expect.objectContaining({ code: '9876' }))
  })

  it('submits OTP when four digits are entered', () => {
    handleCheckPhoneCode.mockClear()
    const { getByLabelText } = renderWithProviders(
      <VerifyCodeForm
        otpLeftTime={120}
        handleSendOtp={vi.fn()}
        handleCheckPhoneCode={handleCheckPhoneCode}
        credentials={{ cellphone: '5551234567', country_phone_code: '+1' }}
        email='user@example.com'
        isPhone
      />,
      { theme }
    )

    paste(getByLabelText('Verification Code 1/4'), '1234')

    expect(handleCheckPhoneCode).toHaveBeenCalledWith({
      cellphone: '5551234567',
      country_phone_code: '+1',
      code: '1234'
    })
  })

  it('Resend code is the base Button, primary ghost, and calls handleSendOtp', () => {
    const handleSendOtp = vi.fn()
    const { getByText } = renderWithProviders(
      <VerifyCodeForm
        otpLeftTime={120}
        handleSendOtp={handleSendOtp}
        handleCheckPhoneCode={handleCheckPhoneCode}
        credentials={{ cellphone: '5551234567', country_phone_code: '+1' }}
        email='user@example.com'
        isPhone
      />,
      { theme }
    )
    const button = getByText('Resend code').closest('button')
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).toHaveAttribute('type', 'button')
    const ghost = componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'ghost' })
    const solid = componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'solid' })
    expect(ghost['--ui-button-background']).not.toBe(solid['--ui-button-background'])
    expect(button.style.getPropertyValue('--ui-button-background')).toBe(ghost['--ui-button-background'])
    expect(button.style.getPropertyValue('--ui-button-color')).toBe(ghost['--ui-button-color'])
    fireEvent.click(button)
    expect(handleSendOtp).toHaveBeenCalledTimes(1)
  })
})
