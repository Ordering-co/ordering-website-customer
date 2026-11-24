import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { NotNetworkConnectivity } from '../index'

// implementation notes"Refresh" is the base Button (primary solid md).

vi.mock('~ui/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => false }))

describe('NotNetworkConnectivity: Refresh is the base Button', () => {
  it('primary solid md, and it reloads the page', () => {
    const reload = vi.fn()
    const original = window.location
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } })
    try {
      const theme = themeWithValues()
      const { getByRole } = renderWithProviders(<NotNetworkConnectivity isOnline={false} />, { theme })
      const refresh = getByRole('button', { name: 'Refresh' })
      expect(refresh).toHaveAttribute('data-slot', 'button')
      expect(refresh).not.toBeDisabled()
      expect(refresh.style.getPropertyValue('--ui-button-background')).toBe(componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'solid' })['--ui-button-background'])
      fireEvent.click(refresh)
      expect(reload).toHaveBeenCalledTimes(1)
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original })
    }
  })
})
