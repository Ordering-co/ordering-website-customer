import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { PWAPrompt } from '../index'
import { renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaDefault } from '~/utils/themeSchema'

const IOS_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'

const languageState = { loading: false }

vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [languageState, (key, fallback) => fallback]
}))

// The real loadable: the library is a lazy chunk (setupTests mocks loadable to null)
vi.unmock('@loadable/component')

vi.mock('react-ios-pwa-prompt', () => ({
  default: (props) => <div data-testid='ios-pwa-prompt' data-close={props.copyClosePrompt} />
}))

describe('PWAPrompt', () => {
  it('renders translated library props when ready on Safari iOS', async () => {
    renderWith(
      themeWithValues(),
      <PWAPrompt
        ready
        userAgent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'
      />
    )

    expect(await screen.findByTestId('ios-pwa-prompt')).toHaveAttribute('data-close', 'Close')
  })

  it('does not load the library off iOS', async () => {
    const { container } = renderWith(
      themeWithValues(),
      <PWAPrompt ready userAgent='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36' />
    )
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(container).toBeEmptyDOMElement()
  })

  it('does not show on the other iOS browsers (CriOS, FxiOS, EdgiOS): no Safari Share button', async () => {
    for (const browser of ['CriOS/120.0.0.0', 'FxiOS/120.0', 'EdgiOS/120.0.0.0']) {
      const { container } = renderWith(
        themeWithValues(),
        <PWAPrompt ready userAgent={`Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ${browser} Mobile/15E148 Safari/604.1`} />
      )
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(container).toBeEmptyDOMElement()
    }
  })

  it('the theme hides it (visibility.pwa_prompt), shown by default', async () => {
    const hidden = themeWithValues((values) => {
      values.visibility = { ...values.visibility, pwa_prompt: false }
      return values
    })
    const { container, unmount } = renderWith(hidden, <PWAPrompt ready userAgent={IOS_SAFARI} />)
    expect(container).toBeEmptyDOMElement()
    unmount()
    expect(schemaDefault('visibility.pwa_prompt')).toBe(true)
    renderWith(themeWithValues(), <PWAPrompt ready userAgent={IOS_SAFARI} />)
    expect(await screen.findByTestId('ios-pwa-prompt')).toBeInTheDocument()
  })

  it('does not render while language is loading', () => {
    languageState.loading = true
    const { container } = renderWith(
      themeWithValues(),
      <PWAPrompt
        ready
        userAgent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'
      />
    )

    expect(container).toBeEmptyDOMElement()
    languageState.loading = false
  })
})
