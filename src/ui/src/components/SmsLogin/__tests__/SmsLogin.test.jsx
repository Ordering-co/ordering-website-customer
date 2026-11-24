import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { THEMES } from '~ui/src/design-system/preview/themes'
import { slotButtonOptions } from '~/utils/themeGroups'
import { SmsLoginButton } from '../index'

const handleSmsLogin = vi.fn()

vi.mock('~components/components/LoginForm', () => ({
  LoginForm: ({ UIComponent, ...rest }) => (
    <UIComponent handleSmsLogin={handleSmsLogin} {...rest} />
  )
}))
vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (_key, fallback) => fallback]
}))

const [, grill] = THEMES.map(({ theme }) => theme)

describe('SmsLoginButton', () => {
  it('is the base Button named Login with SMS, its icon in the social slot, and triggers the handler', () => {
    const { getByRole } = renderWithProviders(<SmsLoginButton style={{ order: 1 }} />)
    const button = getByRole('button', { name: 'Login with SMS' })
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).toHaveAttribute('data-doc-control', 'authentication-sms-entry')
    expect(button.style.order).toBe('1')
    expect(button.querySelector('[data-slot=button-social-icon] svg')).toBeTruthy()
    fireEvent.click(button)
    expect(handleSmsLogin).toHaveBeenCalled()
  })

  it('is disabled while another social login loads', () => {
    const { getByRole } = renderWithProviders(<SmsLoginButton disabled />)
    expect(getByRole('button', { name: 'Login with SMS' })).toBeDisabled()
  })

  it('takes auth_form.slots.social of the real theme', () => {
    const { getByRole } = renderWithProviders(<SmsLoginButton />, { theme: grill })
    const { shape, ...options } = slotButtonOptions(grill, 'auth_form', 'social', { size: 'lg', color: 'neutral', appearance: 'outline' })
    expect(getByRole('button', { name: 'Login with SMS' }).style.getPropertyValue('--ui-button-height')).toBe(componentVars(grill, 'button', options)['--ui-button-height'])
  })
})
