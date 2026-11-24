import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../../__tests__/helpers/testUtils'
import { MenuNavigationItem } from '~ui/src/design-system/components/Menu'

// implementation notesthe rows of this list are the menu_index template's index, so each one is a control
describe('CategoryTab keyboard', () => {
  it('is a native button in the tab order and exposes the current section', () => {
    const onClick = vi.fn()
    const { getByRole } = renderWithProviders(<MenuNavigationItem current onClick={onClick}><span>Sides</span></MenuNavigationItem>)
    const row = getByRole('button', { name: 'Sides' })
    expect(row.tagName).toBe('BUTTON')
    expect(row.tabIndex).toBe(0)
    expect(row).toHaveAttribute('aria-current', 'true')
    fireEvent.click(row)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
