import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { LazyDialog, LazySheet } from '../lazyOverlay'
import { ModalHeading } from '../ModalHeading'

// implementation notesthe base Dialog and Sheet of a screen in the entry chunk load on their first opening
vi.unmock('@loadable/component')

describe('LazyDialog and LazySheet', () => {
  it('nothing until it opens; then the dialog, named by the title its content hands; Escape calls onClose', async () => {
    const onClose = vi.fn()
    const Screen = ({ open }) => (
      <LazyDialog open={open} onClose={onClose} size='sm'>
        <ModalHeading as='h2'>Sign up</ModalHeading><button type='button'>Go</button>
      </LazyDialog>
    )
    const view = renderWithProviders(<Screen />)
    expect(document.querySelector('[data-base-ui-portal]')).toBeNull()
    view.rerender(<Screen open />)
    await view.findByRole('dialog', { name: 'Sign up' })
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('a sheet with its title, closed by its close button', async () => {
    const onClose = vi.fn()
    const view = renderWithProviders(<LazySheet open onClose={onClose} title='Categories'><p>list</p></LazySheet>)
    await view.findByRole('dialog', { name: 'Categories' })
    fireEvent.click(view.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})
