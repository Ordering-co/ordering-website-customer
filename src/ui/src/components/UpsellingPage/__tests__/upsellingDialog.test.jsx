import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { UpsellingPage } from '../index'

// implementation notesthe upselling modal is the base Dialog;
// a press or Escape in the product opened over it (a sibling Dialog) must not close the upselling.

const product = vi.hoisted(() => ({ id: 10, name: 'Burger', price: 9.5, images: 'burger.jpg' }))
const handleUpsellingPage = vi.hoisted(() => vi.fn())

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => <div data-testid='skeleton' /> }))
vi.mock('~ui/src/components/ProductForm', () => ({ ProductForm: () => <div data-testid='product-form'>form</div> }))
vi.mock('~ui/src/components/AutoScroll', () => ({ AutoScroll: ({ children }) => <div>{children}</div> }))
vi.mock('~components/components/UpsellingPage', () => ({
  UpsellingPage: ({ UIComponent, ...rest }) => (
    <UIComponent
      upsellingProducts={{ products: [product], loading: false, error: null }}
      handleUpsellingPage={handleUpsellingPage}
      openUpselling
      canOpenUpselling
      business={{ id: 1, slug: 'demo-store' }}
      {...rest}
    />
  )
}))

const press = (element) => {
  fireEvent.pointerDown(element)
  fireEvent.mouseDown(element)
  fireEvent.pointerUp(element)
  fireEvent.mouseUp(element)
  fireEvent.click(element)
}

describe('UpsellingPage\'s modal', () => {
  beforeEach(() => handleUpsellingPage.mockClear())

  it('is the base Dialog named by its title; its close calls handleUpsellingPage', async () => {
    renderWithProviders(<UpsellingPage />)
    const dialog = await screen.findByRole('dialog', { name: 'Do you want something else?' })
    expect(dialog).toHaveAttribute('data-slot', 'dialog-content')
    expect(dialog.closest('[data-base-ui-portal]')).not.toBeNull()
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(handleUpsellingPage).toHaveBeenCalled()
  })

  it('a press inside the product opened from it does not close the upselling', async () => {
    renderWithProviders(<UpsellingPage />)
    await screen.findByRole('dialog', { name: 'Do you want something else?' })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    const form = await screen.findByTestId('product-form')
    await waitFor(() => expect(form.closest('[data-slot="dialog-content"], [data-slot="sheet-content"]')).not.toBeNull())
    press(form)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(handleUpsellingPage).not.toHaveBeenCalled()
    // Escape closes the product only (the top layer)
    fireEvent.keyDown(form, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByTestId('product-form')).toBeNull())
    expect(handleUpsellingPage).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Do you want something else?' })).toBeInTheDocument()
  })
})
