import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Route } from 'react-router-dom'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../../ui/src/styles/__tests__/themeTestUtils'
import { marketplaceSections } from '../../marketplace'

const MarketplaceHero = marketplaceSections.hero

const orderState = vi.hoisted(() => ({ current: { options: {}, loading: false, carts: {} } }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [orderState.current, { refreshOrderOptions: vi.fn() }]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: false, loading: false, user: {} }, { login: vi.fn() }]
}))
vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => <div data-testid='address-form' /> }))
vi.mock('~ui/src/components/AddressList', () => ({ AddressList: () => null }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))

const page = (props) => renderWithProviders(
  <>
    <MarketplaceHero />
    <Route path='*' render={({ location }) => <span data-testid='path'>{location.pathname + location.search}</span>} />
  </>,
  { theme: themeWithValues(), ...props }
)

describe('MarketplaceHero (landing section)', () => {
  beforeEach(() => {
    orderState.current = { options: {}, loading: false, carts: {} }
  })

  it('is the home\'s hero: its title is the one h1', () => {
    const { container, getByRole } = page()
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(getByRole('heading', { level: 1 })).toHaveTextContent('Shop easily, quickly, and securely.')
  })

  it('searching with an address in the order takes the customer to the stores (/search)', () => {
    orderState.current = { options: { address: { address: '350 5th Ave', location: { lat: 40.7, lng: -74 } } }, loading: false, carts: {} }
    const { getByRole, getByTestId } = page()
    fireEvent.click(getByRole('button', { name: 'Search' }))
    expect(getByTestId('path')).toHaveTextContent(/^\/search$/)
  })

  it('with only the location of the URL it carries it to /search', () => {
    const { getByRole, getByTestId } = page({ initialEntries: ['/?lat=40.7&lng=-74'] })
    fireEvent.click(getByRole('button', { name: 'Search' }))
    expect(getByTestId('path')).toHaveTextContent('/search?lat=40.7&lng=-74')
  })

  it('without any location it asks for the address instead of leaving', async () => {
    const { getByRole, getByTestId, findByTestId } = page()
    fireEvent.click(getByRole('button', { name: 'Search' }))
    expect(await findByTestId('address-form')).toBeInTheDocument()
    expect(getByTestId('path')).toHaveTextContent(/^\/$/)
  })
})
