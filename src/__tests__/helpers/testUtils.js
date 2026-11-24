/**
 * Shared test helpers for website-marketplace-v26 (Vitest + Testing Library).
 */
import React from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter, Route } from 'react-router-dom'
import { vi } from 'vitest'
import { buildAppTheme } from '../../utils/appTheme'
import { buildLocalTheme } from '../../utils/__tests__/fixtures/themeFixtures'
import { PlatformThemeProvider } from '../../ui/src/styles/__tests__/themeTestUtils'

// The app theme without a remote one: the schema's defaults (theme.values).
export const defaultTheme = buildAppTheme(buildLocalTheme(), null)

/**
 * @param {React.ReactElement} ui
 * @param {{
 *   initialEntries?: Array<string | { pathname: string, state?: object, search?: string }>,
 *   routePath?: string,
 *   theme?: object,
 *   wrapper?: React.ComponentType
 * }} options
 */
export const renderWithProviders = (ui, options = {}) => {
  const {
    initialEntries = ['/'],
    routePath,
    theme = defaultTheme,
    wrapper: ExtraWrapper,
    ...renderOptions
  } = options

  const Wrapper = ({ children }) => {
    const routed = routePath
      ? <Route path={routePath}>{children}</Route>
      : children

    const content = (
      <PlatformThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>
          {routed}
        </MemoryRouter>
      </PlatformThemeProvider>
    )
    return ExtraWrapper ? <ExtraWrapper>{content}</ExtraWrapper> : content
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

export const mockFetch = (data, options = {}) => {
  const { ok = true, status = 200 } = options
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      status,
      json: async () => data,
      text: async () => JSON.stringify(data)
    })
  )
}

export const mockFetchError = (error) => {
  const errorObj = typeof error === 'string' ? new Error(error) : error
  global.fetch = vi.fn(() => Promise.reject(errorObj))
}
