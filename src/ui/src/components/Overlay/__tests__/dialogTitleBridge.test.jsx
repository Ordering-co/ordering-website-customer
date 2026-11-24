import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { Dialog, DialogContent } from '~ui/src/design-system/components/Dialog'
import { DialogTitleBridge } from '../DialogTitleBridge'
import { ModalHeading } from '../ModalHeading'

// implementation notesa form that hands its title to the legacy Modal's row (LoginForm, SignUpForm) does
// the same in a base Dialog: the dialog is named by it, and the form does not repeat it.
const Hosted = ({ title, heading = 'Sign up' }) => (
  <Dialog open>
    <DialogContent>
      <DialogTitleBridge title={title}>
        <form><ModalHeading as='h2'>{heading}</ModalHeading><input aria-label='Email' /></form>
      </DialogTitleBridge>
    </DialogContent>
  </Dialog>
)

describe('DialogTitleBridge', () => {
  it('the content\'s title is the dialog\'s title row and its name, once', async () => {
    const view = renderWithProviders(<Hosted />)
    const dialog = await view.findByRole('dialog', { name: 'Sign up' })
    expect(dialog.querySelector('[data-slot="dialog-title"]').textContent).toBe('Sign up')
    expect(view.getAllByText('Sign up')).toHaveLength(1)
  })

  it('the caller\'s title wins over the content\'s', async () => {
    const view = renderWithProviders(<Hosted title='Create account' />)
    expect(await view.findByRole('dialog', { name: 'Create account' })).toBeInTheDocument()
    expect(view.queryByText('Sign up')).toBeNull()
  })

  it('outside a dialog the heading stays on the page', () => {
    const view = renderWithProviders(<ModalHeading as='h2'>Login</ModalHeading>)
    expect(view.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })
})
