import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, act } from '@testing-library/react'
import { REFERRAL_STORAGE_KEY, CLICK_ID_STORAGE_KEY } from '~components/utils/referral'
import { CookieConsentProvider, useCookieConsent } from '../index'

let consent
const Probe = () => {
  consent = useCookieConsent()
  return null
}

const setup = () => {
  window.localStorage.setItem(REFERRAL_STORAGE_KEY, '[{"utm_source":"x"}]')
  window.localStorage.setItem(CLICK_ID_STORAGE_KEY, 'token')
  render(<CookieConsentProvider><Probe /></CookieConsentProvider>)
}

describe('CookieConsentContext attribution storage', () => {
  it('optOutConsent removes the stored attribution', () => {
    setup()
    act(() => consent.optOutConsent())
    expect(window.localStorage.getItem(REFERRAL_STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem(CLICK_ID_STORAGE_KEY)).toBeNull()
  })

  it('acceptConsent keeps the stored attribution', () => {
    setup()
    act(() => consent.acceptConsent())
    expect(window.localStorage.getItem(REFERRAL_STORAGE_KEY)).not.toBeNull()
    expect(window.localStorage.getItem(CLICK_ID_STORAGE_KEY)).toBe('token')
  })
})
