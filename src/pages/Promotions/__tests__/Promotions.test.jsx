import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { Promotions } from '../index'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'

vi.mock('../../../config', () => ({
  default: { franchiseSlug: 'franchise-a' }
}))
vi.mock('../../../components/HelmetTags', () => ({
  HelmetTags: ({ page }) => <div data-testid='helmet-tags' data-page={page} />
}))
vi.mock('~ui/src/components/Promotions', () => ({
  Promotions: ({ franchiseId }) => (
    <div data-testid='promotions-ui' data-franchise-id={franchiseId || ''} />
  )
}))

const themeWithFranchise = themeWithValues((values) => {
  values.site.mode = 'franchise'
  values.site.franchise_slug = 'theme-franchise'
  return values
})

describe('Promotions page', () => {
  it('renders promotions helmet tags and passes franchise id from theme', () => {
    const { getByTestId } = renderWithProviders(<Promotions />, {
      theme: themeWithFranchise
    })

    expect(getByTestId('helmet-tags')).toHaveAttribute('data-page', 'promotions')
    expect(getByTestId('promotions-ui')).toHaveAttribute('data-franchise-id', 'theme-franchise')
  })
})
