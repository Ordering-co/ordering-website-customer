import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { Pagination } from '../index'

describe('Pagination', () => {
  it('renders page buttons and changes page', () => {
    const handleChangePage = vi.fn()
    const { getByText } = renderWithProviders(
      <Pagination currentPage={1} totalPages={5} handleChangePage={handleChangePage} />
    )
    fireEvent.click(getByText('3'))
    expect(handleChangePage).toHaveBeenCalledWith(3)
  })

  it('its arrows are buttons with a name (Previous / Next)', () => {
    const { getByRole } = renderWithProviders(
      <Pagination currentPage={2} totalPages={5} handleChangePage={vi.fn()} />
    )
    expect(getByRole('button', { name: 'Previous' })).toBeInTheDocument()
    expect(getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })
})
