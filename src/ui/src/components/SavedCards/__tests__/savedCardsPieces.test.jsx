import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { SavedCards } from '../index'

// implementation notes"Add card" and the delete of each saved card are the design
// system's Button (the delete an icon Button with the base Icon).

const { confirm, apiTuple } = vi.hoisted(() => ({
  confirm: { props: null },
  apiTuple: [{
    appId: 'app',
    appInternalName: 'web',
    root: 'https://api.test',
    project: 'test',
    language: 'en',
    setAccessToken: () => ({
      paymentCards: () => ({
        get: async () => ({ content: { error: false, result: [{ id: 1, brand: 'visa', last4: '4242' }, { id: 2, brand: 'amex', last4: '0005' }] } })
      })
    })
  }]
}))

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => <div data-testid='skeleton' /> }))
vi.mock('~components/contexts/ApiContext', () => ({ useApi: () => apiTuple }))
vi.mock('~ui/src/components/Confirm', () => ({
  Confirm: (props) => { confirm.props = props; return null }
}))
vi.mock('~ui/src/components/StripeElementsForm', () => ({ StripeElementsForm: () => null }))
vi.mock('../useSavedCardsGateway', () => ({
  useSavedCardsGateway: () => ({ gateway: 'stripe', paymethodId: 1, isAvailable: true, loading: false })
}))

const theme = themeWithValues()

describe('SavedCards: its buttons', () => {
  it('"Add card" is the base Button (primary md)', async () => {
    const { findByRole } = renderWithProviders(<SavedCards />, { theme })
    const add = await findByRole('button', { name: 'Add card' })
    expect(add).toHaveAttribute('data-slot', 'button')
    expect(add).toHaveAttribute('data-doc-control', 'saved-card-add')
    expect(add.style.getPropertyValue('--ui-button-background')).toBe(componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'solid' })['--ui-button-background'])
  })

  it('each delete is the base icon Button (sm ghost danger) with the base Icon, named, and asks to confirm', async () => {
    const { findAllByRole } = renderWithProviders(<SavedCards />, { theme })
    const deletes = await findAllByRole('button', { name: 'Delete card' })
    expect(deletes).toHaveLength(2)
    const look = componentVars(theme, 'button', { size: 'sm', shape: 'icon', color: 'danger', appearance: 'ghost' })
    deletes.forEach((del) => {
      expect(del).toHaveAttribute('data-slot', 'button')
      expect(del).toHaveAttribute('type', 'button')
      expect(del).toHaveAttribute('data-doc-control', 'saved-card-delete')
      expect(del.className).toContain('ui:w-(--ui-button-height)')
      expect(del.style.getPropertyValue('--ui-button-height')).toBe(look['--ui-button-height'])
      expect(del.style.getPropertyValue('--ui-button-color')).toBe(look['--ui-button-color'])
      expect(del.querySelector('svg.lucide-trash-2')).toHaveAttribute('aria-hidden', 'true')
    })
    fireEvent.click(deletes[1])
    await waitFor(() => expect(confirm.props.open).toBe(true))
    expect(confirm.props.title).toBe('Delete card')
  })
})

describe('SavedCards: the add-card dialog', () => {
  it('"Add card" opens the base Dialog named "Add card"; its close closes it', async () => {
    const { findByRole, queryByRole } = renderWithProviders(<SavedCards />, { theme })
    fireEvent.click(await findByRole('button', { name: 'Add card' }))
    const dialog = await findByRole('dialog', { name: 'Add card' })
    expect(within(dialog).getByTestId('skeleton')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })
})
