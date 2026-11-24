import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { LinkableText } from '../index'

describe('LinkableText', () => {
  it('linkifies URLs in plain text', () => {
    const { getByRole } = renderWithProviders(<LinkableText text='Visit https://example.com today' />)
    expect(getByRole('link', { name: 'https://example.com' })).toHaveAttribute('href', 'https://example.com')
  })
})
