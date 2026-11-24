import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { Favorite } from '../index'

// implementation notesthe distance of a favorite is the one to the point the list asked for. The controller
// loads once, when it mounts (as the real one does), so the page remounts it when the point changes.
vi.mock('~ui/utils', () => ({
  checkSiteUrl: (_url, fallback) => fallback,
  generalUtilities: () => ({ getOrderStatus: () => 'pending' }),
  getCateringValues: () => ({}),
  capitalize: (s) => s
}))
vi.mock('~ui/src/components/BusinessController', () => ({
  BusinessController: ({ business, businessDistance, isSkeleton }) => isSkeleton
    ? <div data-testid='business-skeleton' />
    : <div data-testid='business-card' data-distance={String(businessDistance)} data-card-distance={String(business?.distance)}>{business?.name}</div>
}))

// one GET per mount, answered by hand
const gets = vi.hoisted(() => [])
vi.mock('~components/components/FavoriteList', async () => {
  const { useEffect: useEffectMock, useState: useStateMock } = await import('react')
  return {
    FavoriteList: ({ UIComponent, location, ...rest }) => {
      const [list, setList] = useStateMock({ loading: true, error: null, favorites: [] })
      useEffectMock(() => {
        gets.push({ location, answer: (favorites) => setList({ loading: false, error: null, favorites }) })
      }, [])
      return (
        <UIComponent
          {...rest}
          location={location}
          favoriteList={list}
          handleUpdateFavoriteList={vi.fn()}
          pagination={{ currentPage: 1, totalPages: 1, totalItems: list.favorites.length }}
          getFavoriteList={vi.fn()}
          handleReorder={vi.fn()}
          reorderState={{ loading: false }}
        />
      )
    }
  }
})

const contexts = vi.hoisted(() => ({ address: undefined, configs: {} }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 2, address: contexts.address }, carts: {} }, {}]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: contexts.configs }]
}))

describe('Favorite: the distance of the favorite businesses follows the point of the list', () => {
  it('the answer for 0,0 is never drawn with a distance; the one for the chosen address, only after its GET', async () => {
    contexts.address = undefined
    contexts.configs = {}
    const { queryByTestId, getByTestId, rerender } = renderWithProviders(<Favorite />)
    expect(gets).toHaveLength(1)
    expect(gets[0].location).toBe('0,0')
    await act(async () => gets[0].answer([{ id: 1, name: 'Fav Store', slug: 'fav-store', distance: 9999 }]))
    expect(getByTestId('business-card').dataset.distance).toBe('undefined')

    // the person chooses an address without leaving the page
    contexts.address = { address: '1 Main St', location: { lat: 43.5, lng: -79.7 } }
    rerender(<Favorite />)
    expect(gets).toHaveLength(2)
    expect(gets[1].location).toBe('43.5,-79.7')
    // nothing of the 0,0 answer is on screen while the new one is on its way
    expect(queryByTestId('business-card')).toBeNull()

    await act(async () => gets[1].answer([{ id: 1, name: 'Fav Store', slug: 'fav-store', distance: 12 }]))
    expect(getByTestId('business-card').dataset.distance).toBe('12')
  })
})
