import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { fieldIcon, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { SearchBar } from '../index'

describe('SearchBar: the magnifier (§2.5)', () => {
  it.each([false, true])('retains the approved magnifier and uses the field theme (override: %s)', (override) => {
    const theme = themeWithValues((values) => {
      if (override) {
        values.components.input.base.icon_color = '#123456'
        values.components.input.base.icon_size = 24
        delete values.components.search_bar.base.icon_color
        delete values.components.search_bar.base.icon_size
      }
      return values
    })
    const { getByRole } = renderWithProviders(<SearchBar onSearch={vi.fn()} placeholder='Search' />, { theme })
    const input = getByRole('textbox', { name: 'Search' })
    const group = input.closest('[data-slot=input-group]')
    const suffix = group.querySelector('[data-slot=input-suffix]')
    const icon = suffix.querySelector('svg')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveAttribute('viewBox', '0 0 16 16')
    expect(suffix.className).toContain('ui:pointer-events-none')
    expect(suffix.className).toContain('ui:end-md')
    expect(input.className).toContain('var(--ot-space-md)+var(--ui-input-icon-size)+var(--ot-space-sm)')
    expect(group.style.getPropertyValue('--ui-input-icon-color')).toBe(fieldIcon(theme, 'search_bar').color)
    expect(group.style.getPropertyValue('--ui-input-icon-size')).toBe(fieldIcon(theme, 'search_bar').size)
  })
})
