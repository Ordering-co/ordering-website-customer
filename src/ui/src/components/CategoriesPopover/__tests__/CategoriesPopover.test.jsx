import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { CategoriesPopover } from '../index'

// the sheet loads on its first opening (lazyOverlay): the real loader here
vi.unmock('@loadable/component')

// the window's width when it renders (setupTests fixes it at 1024)
vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ width: window.innerWidth, height: window.innerHeight })
}))

const originalWidth = window.innerWidth
afterEach(() => { window.innerWidth = originalWidth })

describe('CategoriesPopover', () => {
  it('renders popover content when open', () => {
    const { getByText } = renderWithProviders(
      <CategoriesPopover
        open
        onClose={vi.fn()}
        CategoriesPopoverUI={() => <div>Category filters</div>}
      />
    )
    expect(getByText('Category filters')).toBeInTheDocument()
  })

  describe('phone: a bottom sheet (the base Sheet)', () => {
    const Host = ({ onClose, onParentClick }) => {
      const [open, setOpen] = useState(true)
      return (
        <div onClick={onParentClick}>
          <CategoriesPopover
            open={open}
            onClose={() => { onClose(); setOpen(false) }}
            CategoriesPopoverUI={({ onSelect }) => (
              <>
                <button type='button'>Browse</button>
                <button type='button' onClick={onSelect}>Pizza</button>
              </>
            )}
          />
        </div>
      )
    }

    const openSheet = async () => {
      window.innerWidth = 390
      const onClose = vi.fn()
      const onParentClick = vi.fn()
      renderWithProviders(<Host onClose={onClose} onParentClick={onParentClick} />)
      const sheet = await screen.findByRole('dialog', { name: 'Categories' })
      return { sheet, onClose, onParentClick }
    }

    it('a dialog titled Categories; a category chosen closes it, its click not reaching the tree above', async () => {
      const { sheet, onClose, onParentClick } = await openSheet()
      expect(sheet).toHaveAttribute('data-slot', 'sheet-content')
      fireEvent.click(within(sheet).getByRole('button', { name: 'Browse' }))
      const pizza = within(sheet).getByRole('button', { name: 'Pizza' })
      // the window's outside-click handler counts the sheet as inside
      fireEvent.mouseUp(pizza)
      expect(onClose).not.toHaveBeenCalled()
      fireEvent.click(pizza)
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onParentClick).not.toHaveBeenCalled()
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    })

    it('Escape closes it', async () => {
      const { onClose } = await openSheet()
      fireEvent.keyDown(document.activeElement, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(onClose).toHaveBeenCalled()
    })
  })

  // a tablet (under 993, over the phone): the slide bar, the base Sheet from the left
  it('tablet: a left Sheet; a category chosen closes it, its close calls onClose', async () => {
    window.innerWidth = 800
    const onClose = vi.fn()
    renderWithProviders(
      <CategoriesPopover open onClose={onClose} CategoriesPopoverUI={({ onSelect }) => <button type='button' onClick={onSelect}>Pizza</button>} />
    )
    const sheet = await screen.findByRole('dialog')
    expect(sheet).toHaveAttribute('data-slot', 'sheet-content')
    expect(sheet).toHaveAttribute('data-side', 'left')
    expect(sheet.querySelector('[data-doc-section="business-category-popover"]')).toHaveAttribute('data-doc-variant', 'slide-bar')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.mouseUp(within(sheet).getByRole('button', { name: 'Pizza' }))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Pizza' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

it('exposes the anchored desktop popover as the dialog controlled by its opener', () => {
  window.innerWidth = 1440
  renderWithProviders(
    <CategoriesPopover open id='category-test-dialog' onClose={vi.fn()} CategoriesPopoverUI={() => <button type='button'>Pizza</button>} />
  )
  const dialog = screen.getByRole('dialog', { name: 'Categories' })
  expect(dialog).toHaveAttribute('id', 'category-test-dialog')
  expect(dialog).not.toHaveAttribute('aria-modal', 'true')
})
