import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { DialogOverlay } from '../overlays'

describe('DialogOverlay', () => {
  it('onRemove (the legacy authModal): the close button calls it, Escape calls onClose', async () => {
    const onClose = vi.fn()
    const onRemove = vi.fn()
    const view = renderWithProviders(<DialogOverlay open onClose={onClose} onRemove={onRemove} title='Log in'><input aria-label='Email' /></DialogOverlay>)
    await view.findByRole('dialog', { name: 'Log in' })
    fireEvent.click(view.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(onRemove).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(view.getByLabelText('Email'), { key: 'Escape' })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('onRemove without onClose (HomeHero, NavigationBar): Escape and a press outside call nothing, as in main', async () => {
    const onRemove = vi.fn()
    const view = renderWithProviders(<DialogOverlay open onRemove={onRemove} title='Log in'><input aria-label='Email' /></DialogOverlay>)
    const dialog = await view.findByRole('dialog', { name: 'Log in' })
    fireEvent.keyDown(view.getByLabelText('Email'), { key: 'Escape' })
    const backdrop = dialog.closest('[data-base-ui-portal]').querySelector('[data-slot="dialog-overlay"]')
    fireEvent.pointerDown(backdrop)
    fireEvent.mouseDown(backdrop)
    fireEvent.click(backdrop)
    // what main did: only its close calls onRemove
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(onRemove).not.toHaveBeenCalled()
    fireEvent.click(view.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(onRemove).toHaveBeenCalledTimes(1))
  })

  it('without onRemove the close button calls onClose; flush reaches the body', async () => {
    const onClose = vi.fn()
    const view = renderWithProviders(<DialogOverlay open onClose={onClose} flush title='Photo'><img alt='' /></DialogOverlay>)
    const dialog = await view.findByRole('dialog', { name: 'Photo' })
    expect(dialog.querySelector('.ui\\:p-none')).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})

describe('DialogOverlay: legacyMaxWidth (implementation notes, the legacy Modal\'s cap)', () => {
  const widthAt = async (viewport, props) => {
    window.innerWidth = viewport
    // a title of its own: the portal of the one before may still be leaving
    const title = `Info ${viewport} ${JSON.stringify(props)}`
    const view = renderWithProviders(<DialogOverlay open title={title} {...props}><p>x</p></DialogOverlay>)
    const dialog = await view.findByRole('dialog', { name: title })
    const width = dialog.closest('[data-base-ui-portal]').style.getPropertyValue('--ui-modal-width')
    view.unmount()
    return width
  }

  it('from 769px a width of its own is no wider than half the screen; under it the whole width, as main', async () => {
    expect(await widthAt(1440, { width: '70%', legacyMaxWidth: true })).toBe('min(70%, 50vw)')
    expect(await widthAt(769, { width: '480px', legacyMaxWidth: true })).toBe('min(480px, 50vw)')
    expect(await widthAt(768, { width: '50%', legacyMaxWidth: true })).toBe('100%')
  })

  it('follows the window while open', async () => {
    window.innerWidth = 1440
    const view = renderWithProviders(<DialogOverlay open title='Resized' width='45%' legacyMaxWidth><p>x</p></DialogOverlay>)
    const portal = (await view.findByRole('dialog', { name: 'Resized' })).closest('[data-base-ui-portal]')
    expect(portal.style.getPropertyValue('--ui-modal-width')).toBe('min(45%, 50vw)')
    window.innerWidth = 700
    fireEvent(window, new Event('resize'))
    await waitFor(() => expect(portal.style.getPropertyValue('--ui-modal-width')).toBe('100%'))
    view.unmount()
  })

  it('without it, or with a size of the theme, nothing changes', async () => {
    expect(await widthAt(1440, { width: '70%' })).toBe('70%')
    // a size: the theme's width of that size, as before
    expect(await widthAt(1440, { size: 'lg', legacyMaxWidth: true })).toBe(await widthAt(1440, { size: 'lg' }))
  })
})
