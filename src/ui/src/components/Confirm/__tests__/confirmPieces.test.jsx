import React from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'

// implementation notesCancel and Accept of the dialog's actions are the design system's
// Button (Cancel neutral outline, Accept primary solid, md); the close stays legacy.

vi.unmock('~ui/src/components/Confirm')

let Confirm
beforeAll(async () => {
  ;({ ConfirmDialog: Confirm } = await import('../ConfirmDialog'))
})

const varOf = (el, name) => el.style.getPropertyValue(name)
const look = (theme, color, appearance) => componentVars(theme, 'button', { size: 'md', color, appearance })

describe('Confirm: its actions are the base Button', () => {
  it('Cancel (neutral outline) and Accept (primary solid) keep their actions', () => {
    const theme = themeWithValues()
    const onCancel = vi.fn()
    const onAccept = vi.fn()
    const { getByRole } = renderWithProviders(<Confirm open content='Sure?' onCancel={onCancel} onAccept={onAccept} onClose={vi.fn()} />, { theme })
    const cancel = getByRole('button', { name: 'Cancel' })
    const accept = getByRole('button', { name: 'Accept' })
    ;[cancel, accept].forEach((button) => {
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button).toHaveAttribute('type', 'button')
      expect(button).not.toBeDisabled()
    })
    expect(varOf(cancel, '--ui-button-border')).toBe(look(theme, 'neutral', 'outline')['--ui-button-border'])
    expect(varOf(accept, '--ui-button-background')).toBe(look(theme, 'primary', 'solid')['--ui-button-background'])
    fireEvent.click(cancel)
    expect(onCancel).toHaveBeenCalledTimes(1)
    fireEvent.click(accept)
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('Accept follows the theme: another primary solid background, another --ui-button-background', () => {
    const backgroundIn = (theme) => {
      const view = renderWithProviders(<Confirm open content='Sure?' onAccept={vi.fn()} onClose={vi.fn()} />, { theme })
      const value = varOf(view.getByRole('button', { name: 'Accept' }), '--ui-button-background')
      view.unmount()
      return value
    }
    const plain = themeWithValues()
    const branded = themeWithValues((values) => {
      values.components.button.variants.primary.solid.background = '#7A1FA2'
      return values
    })
    const a = backgroundIn(plain)
    const b = backgroundIn(branded)
    expect(a).toBe(look(plain, 'primary', 'solid')['--ui-button-background'])
    expect(b).toBe(look(branded, 'primary', 'solid')['--ui-button-background'])
    expect(a).not.toBe(b)
  })
})

describe('Confirm: the base Dialog', () => {
  it('the modal\'s sm width, a centered card on a phone, its title names it', async () => {
    const theme = themeWithValues((values) => { values.components.modal.sizes.sm.width = 480; return values })
    const { findByRole } = renderWithProviders(<Confirm open title='Remove' content='Sure?' onAccept={vi.fn()} onClose={vi.fn()} />, { theme })
    const dialog = await findByRole('dialog', { name: 'Remove' })
    expect(dialog.closest('[data-base-ui-portal], [style*="--ui-modal-width"]').style.getPropertyValue('--ui-modal-width')).toBe('480px')
    expect(dialog.parentElement.className).toContain('ui:max-mobile:p-lg')
  })
})
