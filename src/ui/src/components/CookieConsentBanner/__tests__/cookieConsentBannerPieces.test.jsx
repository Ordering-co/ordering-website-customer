import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { CookieConsentBanner } from '../index'

// implementation notes"Got it" is the base Button inverse solid and "Opt out" its ghost
// (the legacy color='black' and bgtransparent).

const consent = vi.hoisted(() => ({ acceptConsent: vi.fn(), optOutConsent: vi.fn() }))
vi.mock('../../../../../contexts/CookieConsentContext', () => ({
  useCookieConsent: () => ({ consentStatus: 'unknown', isConsentEnabled: true, ...consent })
}))

const varOf = (el, name) => el.style.getPropertyValue(name)

describe('CookieConsentBanner: its buttons are the base Button', () => {
  it('Opt out (inverse ghost) and Got it (inverse solid) keep their actions', () => {
    const theme = themeWithValues()
    const { getByRole } = renderWithProviders(<CookieConsentBanner />, { theme })
    const optOut = getByRole('button', { name: 'Opt Out' })
    const gotIt = getByRole('button', { name: 'Got it' })
    expect(optOut).toHaveAttribute('data-slot', 'button')
    expect(gotIt).toHaveAttribute('data-slot', 'button')
    expect(gotIt).toHaveAttribute('type', 'button')
    expect(varOf(optOut, '--ui-button-color')).toBe(componentVars(theme, 'button', { size: 'md', color: 'inverse', appearance: 'ghost' })['--ui-button-color'])
    expect(varOf(gotIt, '--ui-button-background')).toBe(componentVars(theme, 'button', { size: 'md', color: 'inverse', appearance: 'solid' })['--ui-button-background'])
    fireEvent.click(optOut)
    expect(consent.optOutConsent).toHaveBeenCalledTimes(1)
    fireEvent.click(gotIt)
    expect(consent.acceptConsent).toHaveBeenCalledTimes(1)
  })
})
