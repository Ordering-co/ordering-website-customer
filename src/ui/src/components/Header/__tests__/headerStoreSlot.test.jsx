import React from 'react'
import { describe, expect, it } from 'vitest'
import { HeaderStoreSlot, LogoHeader } from '../styles'
import { HEADER_STORE_SLOT_ATTRIBUTE, HEADER_STORE_SLOT_SELECTOR } from '../behindHeader'
import { renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// The store's back arrow and name take the logo's place in the row (implementation notes, fixed header)
const row = (content) => renderWith(themeWithValues(), (
  <div>
    <HeaderStoreSlot data-testid='slot' {...{ [HEADER_STORE_SLOT_ATTRIBUTE]: '' }}>{content}</HeaderStoreSlot>
    <LogoHeader data-testid='logo'><img alt='Logo' src='/logo.png' /></LogoHeader>
  </div>
))

describe('the header\'s store slot', () => {
  it('has the selector the store page looks for', () => {
    const { getByTestId } = row(null)
    expect(getByTestId('slot').matches(HEADER_STORE_SLOT_SELECTOR)).toBe(true)
  })

  it('empty it has no box and the logo shows', () => {
    const { getByTestId } = row(null)
    expect(window.getComputedStyle(getByTestId('slot')).display).toBe('none')
    expect(window.getComputedStyle(getByTestId('logo').parentElement).display).toBe('flex')
  })

  it('with the store in it, the logo gives its place up', () => {
    const { getByTestId } = row(<p>Demo Store</p>)
    expect(window.getComputedStyle(getByTestId('slot')).display).toBe('flex')
    expect(window.getComputedStyle(getByTestId('logo').parentElement).display).toBe('none')
  })
})
