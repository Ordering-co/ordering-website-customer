import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cartFixture, productFixture, studentFixture } from '../../__tests__/helpers/cartTestMocks'
import { CartStudentAlert } from '../index'

vi.mock('~components/hooks/useSchoolStudents', () => ({
  useSchoolStudents: () => ({ students: [studentFixture] })
}))

const removeProduct = vi.hoisted(() => vi.fn())

vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [
    { options: { type: 1 }, carts: {} },
    { removeProduct }
  ]
}))

describe('CartStudentAlert', () => {
  it('shows conflict modal for student allergen mismatch', () => {
    const cart = {
      ...cartFixture,
      student_id: 1,
      products: [{ ...productFixture, code: 'BRG-1', allergens: ['peanut'] }]
    }
    const { getByText } = renderWithProviders(<CartStudentAlert cart={cart} />)
    expect(getByText('Items not suitable for student')).toBeInTheDocument()
    expect(getByText('Allergies: peanut')).toBeInTheDocument()
    fireEvent.click(getByText('Keep them'))
  })

  it('is a base dialog named by its title; its close keeps the items and closes it', async () => {
    removeProduct.mockReset()
    const cart = { ...cartFixture, student_id: 1, products: [{ ...productFixture, code: 'BRG-1', allergens: ['peanut'] }] }
    renderWithProviders(<CartStudentAlert cart={cart} />)
    const dialog = await screen.findByRole('dialog', { name: 'Items not suitable for student' })
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(removeProduct).not.toHaveBeenCalled()
  })

  it('its actions are the base buttons: full width, and both locked while removing', async () => {
    let finish
    removeProduct.mockReset()
    removeProduct.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const cart = { ...cartFixture, student_id: 1, products: [{ ...productFixture, code: 'BRG-1', allergens: ['peanut'] }] }
    const { getByText, findByText } = renderWithProviders(<CartStudentAlert cart={cart} />)
    const remove = getByText('Remove these items').closest('button')
    const keep = getByText('Keep them').closest('button')
    expect(remove).toHaveAttribute('data-slot', 'button')
    expect(keep).toHaveAttribute('data-slot', 'button')
    expect(remove).toHaveAttribute('type', 'button')
    expect(remove.className).toContain('ui:w-full')
    expect(keep.className).toContain('ui:w-full')
    fireEvent.click(remove)
    expect(removeProduct).toHaveBeenCalledTimes(1)
    const loading = await findByText('Loading')
    expect(loading.closest('button')).toBeDisabled()
    expect(keep).toBeDisabled()
    await act(async () => { finish() })
  })

  it('takes the theme\'s sm dialog width, not a width of its own', async () => {
    const cart = { ...cartFixture, student_id: 1, products: [{ ...productFixture, code: 'BRG-1', allergens: ['peanut'] }] }
    renderWithProviders(<CartStudentAlert cart={cart} />)
    await screen.findByRole('dialog')
    const box = document.querySelector('[style*="--ui-modal-width"]')
    expect(box.style.getPropertyValue('--ui-modal-width')).toBe('500px')
  })
})
