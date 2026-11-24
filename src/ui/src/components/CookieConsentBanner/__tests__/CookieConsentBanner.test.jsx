import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { CookieConsentBanner } from '../index'

const acceptConsent = vi.fn()
const optOutConsent = vi.fn()

vi.mock('../../../../../contexts/CookieConsentContext', () => ({
  useCookieConsent: () => ({
    consentStatus: 'unknown',
    acceptConsent,
    optOutConsent,
    isConsentEnabled: true
  })
}))

// A translation of the dialog's name (COOKIE_CONSENT); the rest, its fallback
vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{}, (key, fallback) => (key === 'COOKIE_CONSENT' ? 'Consentimiento de cookies' : fallback)]
}))

describe('CookieConsentBanner', () => {
  it('renders consent dialog and handles actions', () => {
    const { getByRole, getByText } = renderWithProviders(<CookieConsentBanner />)
    // its name is translated (no fixed English)
    expect(getByRole('dialog', { name: 'Consentimiento de cookies' })).toBeInTheDocument()
    fireEvent.click(getByText('Got it'))
    expect(acceptConsent).toHaveBeenCalled()
    fireEvent.click(getByText('Opt Out'))
    expect(optOutConsent).toHaveBeenCalled()
  })
})
