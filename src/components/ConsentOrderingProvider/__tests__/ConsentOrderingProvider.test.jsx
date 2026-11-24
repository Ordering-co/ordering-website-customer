import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'

const providerProps = vi.fn()

vi.mock('~components/contexts/OrderingContext', () => ({
  OrderingProvider: (props) => {
    providerProps(props)
    return <div data-testid='provider'>{props.children}</div>
  }
}))

// Real consent provider: the banner state is what drives the prop
const settingsMock = vi.hoisted(() => ({ cookie_consent_enabled: true }))
vi.mock('../../../config', () => ({ default: settingsMock }))

// eslint-disable-next-line import/first
import { ConsentOrderingProvider } from '../index'
// eslint-disable-next-line import/first
import { CookieConsentProvider, useCookieConsent } from '../../../contexts/CookieConsentContext'

let consent
const Probe = () => {
  consent = useCookieConsent()
  return null
}

const setup = (props = {}) => render(
  <CookieConsentProvider>
    <Probe />
    <ConsentOrderingProvider {...props}>
      <span>child</span>
    </ConsentOrderingProvider>
  </CookieConsentProvider>
)

const lastProps = () => providerProps.mock.calls.at(-1)[0]

describe('ConsentOrderingProvider', () => {
  beforeEach(() => window.localStorage.clear())

  it('holds referral until the site knows whether the banner applies', () => {
    settingsMock.cookie_consent_enabled = false
    setup()
    expect(lastProps().referralEnabled).toBe(false)
    act(() => consent.setIsConsentEnabled(false))
    expect(lastProps().referralEnabled).toBe(true)
  })

  it('disables referral until the visitor accepts, then enables it', () => {
    settingsMock.cookie_consent_enabled = false
    setup()
    act(() => consent.setIsConsentEnabled(true))
    expect(lastProps().referralEnabled).toBe(false)
    act(() => consent.acceptConsent())
    expect(lastProps().referralEnabled).toBe(true)
  })

  it('disables referral when the visitor opts out', () => {
    settingsMock.cookie_consent_enabled = true
    setup()
    act(() => consent.setIsConsentEnabled(true))
    act(() => consent.acceptConsent())
    expect(lastProps().referralEnabled).toBe(true)
    act(() => consent.optOutConsent())
    expect(lastProps().referralEnabled).toBe(false)
  })

  it('forwards the injected props and the children', () => {
    settingsMock.cookie_consent_enabled = false
    const settings = { project: 'demo' }
    const Alert = () => null
    const initialOptimizationLoad = { a: 1 }
    setup({ settings, Alert, initialOptimizationLoad })
    expect(lastProps()).toMatchObject({ settings, Alert, initialOptimizationLoad })
    expect(screen.getByTestId('provider')).toHaveTextContent('child')
  })
})
