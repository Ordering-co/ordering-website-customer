import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { FavoriteList } from '../index'

// implementation notesthe preorder of a favorite store is the base Dialog, with a Select inside
// that opens its list in a Sheet on a phone: Escape closes the top layer only.

// the Select's sheet loads on its first opening (lazyOverlay): the real loader here
vi.unmock('@loadable/component')

vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ width: window.innerWidth, height: window.innerHeight })
}))
vi.mock('~ui/utils', () => ({
  checkSiteUrl: (_url, fallback) => fallback,
  generalUtilities: () => ({ getOrderStatus: () => 'pending' }),
  getCateringValues: () => ({}),
  capitalize: (s) => s
}))
vi.mock('~ui/src/components/BusinessController', () => ({
  BusinessController: ({ business, onPreorderBusiness }) => (
    <button type='button' onClick={() => onPreorderBusiness(business)}>{business?.name}</button>
  )
}))
// the preorder hands its title to the dialog and has a Select (its time, its date)
vi.mock('~ui/src/components/BusinessPreorder', async () => {
  const { ModalHeading } = await import('~ui/src/components/Overlay/ModalHeading')
  const { Select } = await import('~ui/src/design-system/components/Select')
  return {
    BusinessPreorder: () => (
      <div data-testid='preorder'>
        <ModalHeading>Preorder</ModalHeading>
        <Select presentation='mobile-sheet' options={[{ value: 'a', content: 'Today' }, { value: 'b', content: 'Tomorrow' }]} defaultValue='a' onChange={() => {}} keepOpenOnTriggerClick />
      </div>
    )
  }
})
vi.mock('~components/components/FavoriteList', () => ({
  FavoriteList: ({ UIComponent, ...rest }) => (
    <UIComponent
      favoriteList={{ loading: false, error: null, favorites: [{ id: 1, name: 'Fav Store', slug: 'fav-store' }] }}
      handleUpdateFavoriteList={vi.fn()}
      pagination={{ currentPage: 1, totalPages: 1, totalItems: 1 }}
      getFavoriteList={vi.fn()}
      handleReorder={vi.fn()}
      reorderState={{ loading: false }}
      {...rest}
    />
  )
}))

const originalWidth = window.innerWidth
afterEach(() => { window.innerWidth = originalWidth })

describe('FavoriteList: the preorder dialog', () => {
  it('a base Dialog named by its content\'s title; on a phone its Select\'s sheet takes Escape first; Close closes it', async () => {
    window.innerWidth = 390
    renderWithProviders(<FavoriteList isBusiness favoriteURL='favorite_businesses' originalURL='business' />)
    fireEvent.click(screen.getByRole('button', { name: 'Fav Store' }))

    const dialog = await screen.findByRole('dialog', { name: 'Preorder' })
    expect(dialog).toHaveAttribute('data-slot', 'dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()

    fireEvent.click(await within(dialog).findByRole('button', { name: 'Today' }))
    const sheet = await waitFor(() => {
      const found = document.querySelector('[data-slot="sheet-content"]')
      expect(found).not.toBeNull()
      return found
    })
    fireEvent.keyDown(sheet, { key: 'Escape' })
    await waitFor(() => expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull())
    expect(screen.getByRole('dialog', { name: 'Preorder' })).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByTestId('preorder')).toBeNull())
  })
})
