import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessesListing } from '../index'
import { themeLayoutMode } from '~/utils/themeTokens'

vi.mock('../layouts/OriginalBusinessesListing', () => ({
  OriginalBusinessesListing: () => <div data-testid='original-listing' />
}))
vi.mock('../layouts/AppointmentsBusinessListing', () => ({
  AppointmentsBusinessListing: () => <div data-testid='appointments-listing' />
}))

describe('BusinessesListing', () => {
  it('renders original layout by default', () => {
    const { getByTestId } = renderWithProviders(<BusinessesListing />)
    expect(getByTestId('original-listing')).toBeInTheDocument()
  })

  it('renders appointments layout when theme says so', () => {
    const theme = themeWithValues((values) => {
      values.tokens.layout.mode = 'appointments'
      return values
    })
    const { getByTestId, queryByTestId } = renderWithProviders(<BusinessesListing />, { theme })
    expect(getByTestId('appointments-listing')).toBeInTheDocument()
    expect(queryByTestId('original-listing')).not.toBeInTheDocument()
  })

  it('renders the original layout for a mode the schema does not list', () => {
    const theme = themeWithValues((values) => {
      values.tokens.layout.mode = 'grid'
      return values
    })
    const { getByTestId, queryByTestId } = renderWithProviders(<BusinessesListing />, { theme })
    expect(getByTestId('original-listing')).toBeInTheDocument()
    expect(queryByTestId('appointments-listing')).not.toBeInTheDocument()
  })

  it('themeLayoutMode: the theme\'s tokens.layout.mode, the default without one', () => {
    expect(themeLayoutMode(themeWithValues((values) => { values.tokens.layout.mode = 'appointments'; return values }))).toBe('appointments')
    expect(themeLayoutMode(themeWithValues((values) => { delete values.tokens.layout.mode; return values }))).toBe('original')
    expect(themeLayoutMode(themeWithValues((values) => { values.tokens.layout.mode = 'grid'; return values }))).toBe('original')
  })
})
