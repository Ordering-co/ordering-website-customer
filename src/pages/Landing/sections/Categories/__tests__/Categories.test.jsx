import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { Route } from 'react-router-dom'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../../ui/src/styles/__tests__/themeTestUtils'
import { marketplaceSections } from '../../marketplace'

const Categories = marketplaceSections.categories

vi.mock('~components/contexts/WebsocketContext', () => ({ useWebsocket: () => null }))
// the SDK's base, as the controllers read it (the shared mock of setupTests wraps it in an array)
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [{ root: 'https://api.ordering.test', appId: 'marketplace-test', appInternalName: 'website' }]
}))

const fullWebsite = themeWithValues((values) => {
  values.site.experience = 'full_website'
  return values
})

// The API's answer to GET /business_types (what the controller asks for)
const businessTypes = [
  { id: 1, name: 'Food', enabled: true, image: 'https://cdn.test/food.jpg' },
  { id: 2, name: 'Groceries', enabled: true, image: null },
  { id: 3, name: 'Alcohol', enabled: false, image: null }
]
const answer = (body) => vi.fn(() => Promise.resolve({ json: () => Promise.resolve(body) }))

const page = () => renderWithProviders(
  <>
    <Categories />
    <Route path='*' render={({ location }) => <span data-testid='path'>{location.pathname}</span>} />
  </>,
  { theme: fullWebsite }
)

describe('Categories (landing section)', () => {
  const realFetch = global.fetch
  beforeEach(() => {
    global.fetch = answer({ error: false, result: businessTypes })
  })
  afterEach(() => {
    global.fetch = realFetch
  })

  it('shows its h2 and the enabled types, without the "All" type', async () => {
    const { findByText, getByRole, queryByText, container } = page()
    expect(await findByText('Food')).toBeInTheDocument()
    expect(getByRole('heading', { level: 2, name: 'Browse by craving' })).toBeInTheDocument()
    expect(container.querySelector('section')).toHaveAttribute('id', 'landing-categories')
    expect(queryByText('Groceries')).toBeInTheDocument()
    expect(queryByText('Alcohol')).toBeNull()
    expect(queryByText('All')).toBeNull()
    expect(global.fetch.mock.calls[0][0]).toContain('/business_types?')
  })

  it('a skeleton while it loads, with no heading yet', () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    const { getAllByTestId, queryByRole } = page()
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0)
    expect(queryByRole('heading')).toBeNull()
  })

  it('picking a type takes the customer to the stores (/order)', async () => {
    const { findByText, getByTestId } = page()
    fireEvent.click(await findByText('Groceries'))
    await waitFor(() => expect(getByTestId('path')).toHaveTextContent('/order'))
  })

  it('no types: no section and no title', async () => {
    global.fetch = answer({ error: false, result: [] })
    const { container, queryByRole } = page()
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    await waitFor(() => expect(queryByRole('heading')).toBeNull())
    expect(container.querySelector('section')).toBeNull()
  })

  it('only disabled types: no section', async () => {
    global.fetch = answer({ error: false, result: [businessTypes[2]] })
    const { container } = page()
    await waitFor(() => expect(container.querySelector('section')).toBeNull())
    expect(global.fetch).toHaveBeenCalled()
  })

  it('an error without data: no section and no title', async () => {
    global.fetch = answer({ error: true, result: ['Unauthorized'] })
    const { container, queryByRole } = page()
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    await waitFor(() => expect(container.querySelector('section')).toBeNull())
    expect(queryByRole('heading')).toBeNull()
  })
})
