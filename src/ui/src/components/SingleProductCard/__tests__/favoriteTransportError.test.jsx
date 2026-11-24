import React from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SingleProductCard as Controller } from '~components/components/SingleProductCard'
import { ToastProvider } from '~components/contexts/ToastContext'
import { Toast } from '~ui/src/styles/Toast'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { SingleProductCard } from '../index'

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
vi.mock('~ui/hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => [{ current: null }, true]
}))

const product = { id: 7, name: 'Demo Product' }
const LegacyCard = ({ handleFavoriteProduct }) => (
  <button type='button' onClick={() => handleFavoriteProduct(true)}>Favorite</button>
)

afterEach(() => vi.unstubAllGlobals())

describe('SingleProductCard favorite transport failure', () => {
  it.each([
    ['web', true, 'Error de red'],
    ['shared controller without a handler', false, 'Failed to fetch']
  ])('%s shows the expected toast', async (_consumer, isWeb, message) => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetch)
    const card = isWeb
      ? <SingleProductCard product={product} />
      : <Controller product={product} UIComponent={LegacyCard} />
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
