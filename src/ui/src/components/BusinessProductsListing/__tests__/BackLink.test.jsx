import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BackLink } from '../BackLink'

// implementation notes B2: the store's back arrow points to the start of the line, so it is mirrored right to left.
describe('BackLink', () => {
  it.each([[false, 'lucide-arrow-left'], [true, 'lucide-arrow-right']])('rtl %s: the glyph is %s and it still goes back', (rtl, glyph) => {
    const onClick = vi.fn((event) => event.preventDefault())
    const { getByRole } = renderWithProviders(<BackLink label='Back' onClick={onClick} />, { theme: { ...themeWithValues(), rtl } })
    const link = getByRole('link', { name: 'Back' })
    expect(link).toHaveAttribute('id', 'back-arrow')
    expect(link.querySelector('svg')).toHaveClass(glyph)
    fireEvent.click(link)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
