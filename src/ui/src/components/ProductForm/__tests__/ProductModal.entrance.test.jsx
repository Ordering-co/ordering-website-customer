import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { withModalBase } from './productModalTheme'

// What Root is given as `open`, render by render: the callers mount ProductModal already open, and Base UI
// plays the entrance (data-starting-style) only for an `open` that turns true after the mount.
const opens = { dialog: [], sheet: [] }
vi.mock('~ui/src/design-system/components/Dialog', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, Dialog: (props) => { opens.dialog.push(props.open); return actual.Dialog(props) } }
})
vi.mock('~ui/src/design-system/components/Sheet', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, Sheet: (props) => { opens.sheet.push(props.open); return actual.Sheet(props) } }
})

const { ProductModal } = await import('../ProductModal')

describe('ProductModal: the entrance', () => {
  it.each([['sheet', 'dialog'], ['steps', 'sheet']])('%s: the first render is closed and it opens right after mounting, so Base UI plays the entrance', async (layout, root) => {
    opens[root].length = 0
    renderWithProviders(<ProductModal open onClose={vi.fn()}><p>Form</p></ProductModal>, { theme: withModalBase(themeWithValues(), { layout }) })
    await screen.findByRole('dialog')
    expect(opens[root][0]).toBe(false)
    expect(opens[root].at(-1)).toBe(true)
  })

  it('stays closed while the screen says it is closed', () => {
    opens.dialog.length = 0
    renderWithProviders(<ProductModal open={false} onClose={vi.fn()}><p>Form</p></ProductModal>)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(opens.dialog.every((open) => open === false)).toBe(true)
  })
})
