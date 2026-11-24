import React from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { Dialog, DialogContent, DialogTitle } from '~ui/src/design-system/components/Dialog'

// implementation notesan Alert opened over a base Dialog (AccountInvite's sign-up, implementation notes) stays
// usable: above it, outside nothing inert, Escape closes only the Alert, the focus goes back.

// the Alert's dialog loads on its first opening (loadable): the real one here
vi.unmock('@loadable/component')

vi.unmock('~ui/src/components/Confirm')

let Alert
beforeAll(async () => {
  ;({ Alert } = await import('../index'))
})

const usable = (el) => !el.closest('[inert], [data-base-ui-inert], [aria-hidden="true"]')

const DialogWithAlert = ({ alert, onCloseDialog, onCloseAlert }) => (
  <Dialog open onOpenChange={(next) => !next && onCloseDialog()}>
    <DialogContent>
      <DialogTitle>Sign up</DialogTitle>
      <button type='button'>Create account</button>
      <Alert open={alert} title='Error' content='Email taken' onAccept={onCloseAlert} onClose={onCloseAlert} />
    </DialogContent>
  </Dialog>
)

describe('Alert over a base Dialog', () => {
  it('is usable, Escape closes only the Alert and the focus goes back to its opener', async () => {
    const onCloseDialog = vi.fn()
    const onCloseAlert = vi.fn()
    const props = { onCloseDialog, onCloseAlert }
    const view = renderWithProviders(<DialogWithAlert {...props} />)
    const opener = await view.findByText('Create account')
    opener.focus()
    view.rerender(<DialogWithAlert {...props} alert />)
    const accept = await view.findByRole('button', { name: 'Accept' })
    await waitFor(() => expect(usable(accept)).toBe(true))
    fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape', keyCode: 27 })
    await waitFor(() => expect(onCloseAlert).toHaveBeenCalledTimes(1))
    expect(onCloseDialog).not.toHaveBeenCalled()
    view.rerender(<DialogWithAlert {...props} />)
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })
})
