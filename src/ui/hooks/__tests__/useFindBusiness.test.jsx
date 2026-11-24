import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Route } from 'react-router-dom'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { useFindBusiness } from '../useFindBusiness'

const orderState = vi.hoisted(() => ({ current: { options: {} } }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [orderState.current]
}))

const Probe = () => {
  const { urlLocation, onFindBusiness } = useFindBusiness()
  return (
    <>
      <span data-testid='url-location'>{JSON.stringify(urlLocation)}</span>
      <button type='button' onClick={onFindBusiness}>find</button>
      <Route path='*' render={({ location }) => <span data-testid='path'>{location.pathname + location.search}</span>} />
    </>
  )
}

describe('useFindBusiness', () => {
  beforeEach(() => {
    orderState.current = { options: {} }
  })

  it('with an address in the order, the search opens /search as it is', () => {
    orderState.current = { options: { address: { location: { lat: 40.7, lng: -74 } } } }
    const { getByText, getByTestId } = renderWithProviders(<Probe />)
    fireEvent.click(getByText('find'))
    expect(getByTestId('path')).toHaveTextContent(/^\/search$/)
  })

  it('without one, it carries the location of the URL, which it also gives', () => {
    const { getByText, getByTestId } = renderWithProviders(<Probe />, { initialEntries: ['/?lat=4.5&lng=-74.1'] })
    expect(getByTestId('url-location')).toHaveTextContent('{"lat":4.5,"lng":-74.1}')
    fireEvent.click(getByText('find'))
    expect(getByTestId('path')).toHaveTextContent('/search?lat=4.5&lng=-74.1')
  })
})
