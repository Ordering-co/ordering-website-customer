import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { ProfessionalProfile } from '../index'

// implementation notes"Book" of the professional's profile is the design system's Button (primary solid md).

vi.mock('~ui/src/components/BusinessPreorder', () => ({ BusinessPreorder: () => null }))

describe('ProfessionalProfile: "Book" is the base Button', () => {
  it('primary solid md; it selects the professional and closes', () => {
    const theme = themeWithValues()
    const select = vi.fn()
    const onClose = vi.fn()
    const { getByRole } = renderWithProviders(
      <ProfessionalProfile currentProfessional={{ id: 1, name: 'Casey' }} handleChangeProfessionalSelected={select} onClose={onClose} />,
      { theme }
    )
    const book = getByRole('button', { name: 'Book' })
    expect(book).toHaveAttribute('data-slot', 'button')
    expect(book).toHaveAttribute('data-doc-control', 'professional-profile-book')
    expect(book.style.getPropertyValue('--ui-button-background')).toBe(componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'solid' })['--ui-button-background'])
    fireEvent.click(book)
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
    expect(onClose).toHaveBeenCalled()
  })
})
