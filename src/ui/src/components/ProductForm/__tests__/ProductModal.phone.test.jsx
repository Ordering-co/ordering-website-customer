import React, { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Dialog, DialogContent } from '~ui/src/design-system/components/Dialog'
import { withModalBase } from './productModalTheme'

const { ProductModal } = await import('../ProductModal')

const initialWidth = window.innerWidth
const setWidth = (width) => { window.innerWidth = width }
beforeEach(() => setWidth(initialWidth))
afterEach(() => setWidth(initialWidth))

const theme = (layout) => withModalBase(themeWithValues(), { layout })
const popup = () => document.querySelector('[data-slot=dialog-content], [data-slot=sheet-content]')
const zOf = (el) => el.parentElement.className.match(/ui:z-\d+/)[0]
const modal = (children = <p>Form</p>) => <ProductModal open onClose={vi.fn()}>{children}</ProductModal>

describe('ProductModal: drag to close on a phone', () => {
  it('sheet on a phone is a bottom sheet with its handle, not a dialog', async () => {
    setWidth(390)
    renderWithProviders(modal(), { theme: theme('sheet') })
    await screen.findByRole('dialog')
    expect(document.querySelector('[data-slot=dialog-content]')).toBeNull()
    const sheet = document.querySelector('[data-slot=sheet-content][data-side=bottom]')
    expect(sheet).not.toBeNull()
    expect(sheet.querySelector('[data-slot=sheet-handle]')).not.toBeNull()
  })

  it('sheet on a desktop stays a dialog', async () => {
    setWidth(1440)
    renderWithProviders(modal(), { theme: theme('sheet') })
    await screen.findByRole('dialog')
    expect(popup().getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('[data-slot=sheet-content]')).toBeNull()
  })

  it('a resize across the cut keeps the root: the customer\'s selections are not wiped', async () => {
    setWidth(390)
    const Counter = () => {
      const [n, setN] = useState(0)
      return <button type='button' onClick={() => setN(n + 1)}>count {n}</button>
    }
    renderWithProviders(modal(<Counter />), { theme: theme('sheet') })
    fireEvent.click(await screen.findByRole('button', { name: 'count 0' }))
    const before = popup()
    act(() => { setWidth(1440); window.dispatchEvent(new Event('resize')) })
    expect(popup()).toBe(before)
    expect(before.getAttribute('data-slot')).toBe('sheet-content')
    expect(screen.getByRole('button', { name: 'count 1' })).toBeInTheDocument()
  })

  it('on a phone a Dialog opened from inside is on the same layer, not under the sheet', async () => {
    setWidth(390)
    const Opener = () => {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type='button' onClick={() => setOpen(true)}>Nested</button>
          <Dialog open={open} onOpenChange={setOpen}><DialogContent aria-label='Child'>Child</DialogContent></Dialog>
        </>
      )
    }
    renderWithProviders(modal(<Opener />), { theme: theme('sheet') })
    fireEvent.click(await screen.findByRole('button', { name: 'Nested' }))
    const child = await screen.findByRole('dialog', { name: 'Child' })
    // the sheet's own layer (z 20601) would cover the child
    expect(zOf(document.querySelector('[data-slot=sheet-content]'))).toBe('ui:z-20002')
    expect(zOf(child)).toBe('ui:z-20002')
  })

  it('steps stays a panel from the right at any width', async () => {
    for (const width of [390, 1440]) {
      setWidth(width)
      const { unmount } = renderWithProviders(modal(), { theme: theme('steps') })
      await screen.findByRole('dialog')
      expect(popup().getAttribute('data-slot')).toBe('sheet-content')
      expect(popup().getAttribute('data-side')).toBe('right')
      unmount()
    }
  })
})
