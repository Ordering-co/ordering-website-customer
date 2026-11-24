import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { NotFoundSource } from '../index'

// implementation notesthe action of an empty state (onClickButton) is the base Button
// (primary outline md); a consumer's own children stay its own.

describe('NotFoundSource: its action is the base Button', () => {
  it('primary outline md, and it calls onClickButton', () => {
    const theme = themeWithValues()
    const onClickButton = vi.fn()
    const { getByRole } = renderWithProviders(<NotFoundSource content='Nothing here' btnTitle='Go back' onClickButton={onClickButton} />, { theme })
    const action = getByRole('button', { name: 'Go back' })
    expect(action).toHaveAttribute('data-slot', 'button')
    expect(action).toHaveAttribute('type', 'button')
    const look = componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'outline' })
    expect(action.style.getPropertyValue('--ui-button-border')).toBe(look['--ui-button-border'])
    expect(action.style.getPropertyValue('--ui-button-color')).toBe(look['--ui-button-color'])
    fireEvent.click(action)
    expect(onClickButton).toHaveBeenCalledTimes(1)
  })
})
