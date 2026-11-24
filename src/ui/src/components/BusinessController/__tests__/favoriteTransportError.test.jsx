import React from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BusinessController as Controller } from '~components/components/BusinessController'
import { ToastProvider } from '~components/contexts/ToastContext'
import { Toast } from '~ui/src/styles/Toast'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { BusinessController } from '../index'

vi.unmock('~components/contexts/ToastContext')
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: true, user: { id: 42 }, token: 'test-token' }, {}]
}))
vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (key, fallback) => key === 'NETWORK_ERROR' ? 'Error de red' : fallback]
}))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))

const business = { id: 7, name: 'Demo Store', slug: 'demo-store', enabled: true, open: true }
const LegacyCard = ({ handleFavoriteBusiness }) => (
  <button type='button' onClick={() => handleFavoriteBusiness(true)}>Favorite</button>
)

afterEach(() => vi.unstubAllGlobals())

describe('BusinessController favorite transport failure', () => {
  it.each([
    ['web', true, 'Error de red'],
    ['shared controller without a handler', false, 'Failed to fetch']
  ])('%s shows the expected toast', async (_consumer, isWeb, message) => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetch)
    const card = isWeb
      ? <BusinessController business={business} withLogoAndFavorite />
      : <Controller business={business} UIComponent={LegacyCard} />
    renderWithProviders(
      <ToastProvider>
        {card}
        <Toast />
      </ToastProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Favorite' }))
    expect((await screen.findByRole('alert')).textContent).toBe(message)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
