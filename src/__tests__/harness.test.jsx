import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, defaultTheme } from './helpers/testUtils'

describe('test harness', () => {
  it('exposes a default theme for ThemeProvider', () => {
    expect(defaultTheme.values.tokens.color.primary).toBeTruthy()
  })

  it('renderWithProviders mounts children', () => {
    const { getByText } = renderWithProviders(<div>harness-ok</div>)
    expect(getByText('harness-ok')).toBeInTheDocument()
  })
})
