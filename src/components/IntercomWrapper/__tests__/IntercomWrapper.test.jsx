import React from 'react'
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { IntercomWrapper, getVerticalPadding, mobileLauncherBottom } from '../index'

const intercomFn = vi.fn()

const { sessionTuple, configTuple, consentState } = vi.hoisted(() => ({
  sessionTuple: [{
    user: {
      id: 1,
      email: 'user@example.com',
      name: 'Jane',
      lastname: 'Doe',
      cellphone: '5551234567',
      country_phone_code: '1',
      created_at: '2026-01-01T00:00:00.000Z',
      intercom_user_jwt: 'jwt-token'
    },
    auth: true
  }],
  configTuple: [{
    configs: {
      intercom_enabled: { value: '1' },
      intercom_app_id: { value: 'app-123' },
      intercom_api_base: { value: 'https://api-iam.intercom.io' }
    }
  }],
  consentState: { hasConsented: true, isConsentEnabled: true }
}))

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => sessionTuple
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => configTuple
}))
vi.mock('../../../contexts/CookieConsentContext', () => ({
  useCookieConsent: () => consentState
}))

describe('IntercomWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.Intercom = intercomFn
    window.intercomSettings = undefined
    document.getElementById('intercom_widget')?.remove()
    document.getElementById('intercom_mobile_position_override')?.remove()
    Object.defineProperty(document, 'readyState', { configurable: true, value: 'complete' })
    sessionTuple[0] = {
      user: {
        id: 1,
        email: 'user@example.com',
        name: 'Jane',
        lastname: 'Doe',
        cellphone: '5551234567',
        country_phone_code: '1',
        created_at: '2026-01-01T00:00:00.000Z',
        intercom_user_jwt: 'jwt-token'
      },
      auth: true
    }
    configTuple[0].configs = {
      intercom_enabled: { value: '1' },
      intercom_app_id: { value: 'app-123' },
      intercom_api_base: { value: 'https://api-iam.intercom.io' }
    }
    consentState.hasConsented = true
    consentState.isConsentEnabled = true
  })

  it('boots intercom when enabled and user is authenticated', () => {
    const { getByText } = renderWithProviders(
      <IntercomWrapper><span>boot-child</span></IntercomWrapper>
    )
    expect(getByText('boot-child')).toBeInTheDocument()
    expect(document.getElementById('intercom_widget')).toBeTruthy()
    expect(document.getElementById('intercom_mobile_position_override')).toBeTruthy()
    expect(intercomFn).toHaveBeenCalledWith('boot', expect.objectContaining({
      app_id: 'app-123',
      intercom_user_jwt: 'jwt-token',
      phone: '+1 5551234567'
    }))
  })

  it('shuts down intercom when feature is disabled', () => {
    configTuple[0].configs.intercom_enabled = { value: '0' }
    renderWithProviders(<IntercomWrapper><span>off</span></IntercomWrapper>)
    expect(intercomFn).toHaveBeenCalledWith('shutdown')
    expect(document.getElementById('intercom_widget')).toBeFalsy()
  })

  it('shuts down intercom for internal ordering.co emails', () => {
    sessionTuple[0].user.email = 'agent@ordering.co'
    renderWithProviders(<IntercomWrapper><span>blocked</span></IntercomWrapper>)
    expect(intercomFn).toHaveBeenCalledWith('shutdown')
  })

  it('updates intercom settings on resize when widget already exists', () => {
    document.body.appendChild(Object.assign(document.createElement('script'), { id: 'intercom_widget' }))
    window.intercomSettings = { app_id: 'app-123' }
    renderWithProviders(<IntercomWrapper><span>resize</span></IntercomWrapper>)
    fireEvent(window, new Event('resize'))
    expect(intercomFn).toHaveBeenCalledWith('update', expect.objectContaining({ app_id: 'app-123' }))
  })

  it('does not boot when cookie consent is required but missing', () => {
    consentState.hasConsented = false
    consentState.isConsentEnabled = true
    renderWithProviders(<IntercomWrapper><span>no-consent</span></IntercomWrapper>)
    expect(intercomFn).toHaveBeenCalledWith('shutdown')
  })

  describe('the launcher above the bottom navigation', () => {
    const setWidth = (width) => Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
    const launcherCss = () => document.getElementById('intercom_mobile_position_override').textContent.replace(/\s+/g, '')
    afterEach(() => setWidth(1024))

    it('the navigation\'s real height plus the xl space on phones, the xl space wider', () => {
      const theme = themeWithValues()
      const gap = theme.values.tokens.space.xl
      const bottom = theme.values.components.bottom_nav.base.height + gap
      renderWithProviders(<IntercomWrapper><span>themed</span></IntercomWrapper>, { theme })
      expect(launcherCss()).toContain(`bottom:${bottom}px!important`)
      expect(intercomFn).toHaveBeenCalledWith('boot', expect.objectContaining({ vertical_padding: gap }))
      setWidth(390)
      expect(getVerticalPadding(theme)).toBe(bottom)
      setWidth(1024)
      expect(getVerticalPadding(theme)).toBe(gap)
    })

    it('the notifications frame sits a launcher (lg size) and a md space above the launcher', () => {
      const theme = themeWithValues()
      const bottom = theme.values.components.bottom_nav.base.height + theme.values.tokens.space.xl
      renderWithProviders(<IntercomWrapper><span>themed</span></IntercomWrapper>, { theme })
      const above = `${theme.values.tokens.size.lg}px+${theme.values.tokens.space.md}px`
      expect(launcherCss()).toContain(`bottom:calc(${bottom}px+${above})!important`)
      expect(launcherCss()).not.toContain('+60px')
    })

    it('a taller navigation, or none (visibility bottom_nav)', () => {
      const tall = themeWithValues((values) => { values.components.bottom_nav.base.height = 80; return values })
      expect(mobileLauncherBottom(tall)).toBe(80 + tall.values.tokens.space.xl)
      const hidden = themeWithValues((values) => { values.visibility.bottom_nav = false; return values })
      expect(mobileLauncherBottom(hidden)).toBe(hidden.values.tokens.space.xl)
    })
  })
})
