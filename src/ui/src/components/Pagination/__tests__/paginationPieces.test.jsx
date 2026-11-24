import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { Pagination } from '../index'

// implementation notesprevious and next are the base icon Button (neutral ghost md), the
// page numbers the base Chip (selected for the current page), the three together.

describe('Pagination: its controls are the pieces', () => {
  it('the arrows: named icon Buttons, disabled at the ends, that change the page', () => {
    const theme = themeWithValues()
    const handleChangePage = vi.fn()
    const { getByRole } = renderWithProviders(<Pagination currentPage={1} totalPages={3} handleChangePage={handleChangePage} />, { theme })
    const previous = getByRole('button', { name: 'Previous' })
    const next = getByRole('button', { name: 'Next' })
    const look = componentVars(theme, 'button', { size: 'md', shape: 'icon', color: 'neutral', appearance: 'ghost' })
    ;[previous, next].forEach((arrow) => {
      expect(arrow).toHaveAttribute('data-slot', 'button')
      expect(arrow.className).toContain('ui:w-(--ui-button-height)')
      expect(arrow.style.getPropertyValue('--ui-button-color')).toBe(look['--ui-button-color'])
    })
    expect(previous).toBeDisabled()
    expect(next).not.toBeDisabled()
    fireEvent.click(next)
    expect(handleChangePage).toHaveBeenCalledWith(2)
  })

  it('the page numbers: Chips, the current one selected and the page', () => {
    const handleChangePage = vi.fn()
    const { getByRole } = renderWithProviders(<Pagination currentPage={1} totalPages={3} handleChangePage={handleChangePage} />, { theme: themeWithValues() })
    const first = getByRole('button', { name: '1' })
    const third = getByRole('button', { name: '3' })
    expect(first).toHaveAttribute('data-slot', 'chip')
    expect(first).toHaveAttribute('data-selected')
    expect(first).toHaveAttribute('aria-pressed', 'true')
    expect(first).toHaveAttribute('aria-current', 'page')
    expect(third).toHaveAttribute('aria-pressed', 'false')
    expect(third).not.toHaveAttribute('aria-current')
    fireEvent.click(third)
    expect(handleChangePage).toHaveBeenCalledWith(3)
  })

  // the current page paints the theme's selected chip (it followed the primary as the legacy chip did)
  it.each([['red', '#aa0000'], ['green', '#00aa00']])('the current page reads the selected chip of the theme: %s', (_label, background) => {
    const theme = themeWithValues((values) => {
      values.components.chip.variants.default.states.selected.background = background
    })
    const { getByRole } = renderWithProviders(<Pagination currentPage={2} totalPages={3} handleChangePage={vi.fn()} />, { theme })
    const page = getByRole('button', { name: '2' })
    const vars = componentVars(theme, 'chip', { size: 'md', variant: 'default' })
    expect(vars['--ui-chip-selected-background']).toBeTruthy()
    expect(page.style.getPropertyValue('--ui-chip-selected-background')).toBe(vars['--ui-chip-selected-background'])
    expect(vars['--ui-chip-selected-background'].toLowerCase()).toContain(background)
  })
})
