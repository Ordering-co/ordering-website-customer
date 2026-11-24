import React from 'react'
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../../ui/src/styles/__tests__/themeTestUtils'
import { AppSection } from '../index'

const withIds = (apple, android) => themeWithValues((values) => {
  values.site.smart_banner.apple_id = apple
  values.site.smart_banner.android_id = android
})

describe('AppSection', () => {
  it('a link to each store with the id the site has, opened safely', () => {
    renderWithProviders(<AppSection />, { theme: withIds('123456789', 'com.demo.orders') })
    expect(screen.getByRole('heading', { name: 'Get our app' })).toBeInTheDocument()
    const apple = screen.getByRole('link', { name: 'Download on the App Store' })
    const play = screen.getByRole('link', { name: 'Get it on Google Play' })
    expect(apple).toHaveAttribute('href', 'https://apps.apple.com/app/id123456789')
    expect(play).toHaveAttribute('href', 'https://play.google.com/store/apps/details?id=com.demo.orders')
    ;[apple, play].forEach((link) => expect(link.getAttribute('rel')).toContain('noopener'))
  })

  it('only the store it has an id for', () => {
    renderWithProviders(<AppSection />, { theme: withIds('', 'com.demo.orders') })
    expect(screen.queryByRole('link', { name: 'Download on the App Store' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Get it on Google Play' })).toBeInTheDocument()
  })

  it('an id that is not one is not linked', () => {
    renderWithProviders(<AppSection />, { theme: withIds('0', 'not an id') })
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('no id at all: nothing is drawn', () => {
    const { container } = renderWithProviders(<AppSection />, { theme: withIds('', '') })
    expect(container).toBeEmptyDOMElement()
  })
})
