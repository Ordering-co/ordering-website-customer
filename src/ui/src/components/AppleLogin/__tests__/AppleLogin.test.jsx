import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { THEMES } from '~ui/src/design-system/preview/themes'
import { slotButtonOptions } from '~/utils/themeGroups'
import { AppleLogin } from '../index'

const initLoginApple = vi.fn()
const loading = vi.hoisted(() => ({ value: false }))

vi.mock('~components/components/AppleLogin', () => ({
  AppleLogin: ({ UIComponent, ...rest }) => (
    <UIComponent initLoginApple={initLoginApple} formState={{ loading: loading.value }} {...rest} />
  )
}))
vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (_key, fallback) => fallback]
}))

const [, grill, cafe] = THEMES.map(({ theme }) => theme)
const slot = (theme) => {
  const { shape, ...options } = slotButtonOptions(theme, 'auth_form', 'social', { size: 'lg', color: 'neutral', appearance: 'outline' })
  return componentVars(theme, 'button', options)
}

describe('AppleLogin', () => {
  it('is the base Button named Apple, its brand icon in the social slot, and triggers login', () => {
    loading.value = false
    const { getByRole } = renderWithProviders(<AppleLogin />)
    const button = getByRole('button', { name: 'Apple' })
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button.querySelector('[data-slot=button-social-icon] svg')).toBeTruthy()
    expect(button).not.toHaveAttribute('aria-busy')
    fireEvent.click(button)
    expect(initLoginApple).toHaveBeenCalled()
  })

  it('while it loads it is busy: aria-busy, the spinner in the icon slot, the label stays', () => {
    loading.value = true
    const { getByRole } = renderWithProviders(<AppleLogin />)
    const button = getByRole('button', { name: 'Apple' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('[data-slot=button-social-icon] [data-slot=button-spinner]')).toBeTruthy()
    expect(button.querySelector('[data-slot=button-social-icon] svg')).toBeNull()
    loading.value = false
  })

  it('takes auth_form.slots.social of the real theme (grill, cafe)', () => {
    loading.value = false
    ;[grill, cafe].forEach((theme) => {
      const { getByRole, unmount } = renderWithProviders(<AppleLogin />, { theme })
      const button = getByRole('button', { name: 'Apple' })
      const expected = slot(theme)
      expect(button.style.getPropertyValue('--ui-button-height')).toBe(expected['--ui-button-height'])
      expect(button.style.getPropertyValue('--ui-button-border')).toBe(expected['--ui-button-border'])
      expect(button.style.getPropertyValue('--ui-auth-form-social-icon-size')).toBe(componentVars(theme, 'auth_form')['--ui-auth-form-social-icon-size'])
      unmount()
    })
  })
})
