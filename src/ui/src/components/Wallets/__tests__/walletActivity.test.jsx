import React from 'react'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { Wallets } from '../index'

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: {
    wallet_cash_enabled: { value: '1' },
    wallet_credit_point_enabled: { value: '1' }
  } }]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: true, user: { id: 10 }, token: 'test-token' }]
}))
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [{
    root: 'https://api.test',
    users: () => ({ select: () => ({ get: async () => ({ content: { result: {} } }) }) })
  }]
}))
vi.mock('~components/contexts/WebsocketContext', () => ({ useWebsocket: () => null }))

const list = [{ id: 1, type: 'cash', balance: 25 }, { id: 2, type: 'credit_point', balance: 100 }]
const response = (body) => ({ json: async () => body })
const transaction = (description) => ({
  amount: 10,
  created_at: '2026-07-01',
  description,
  event_type: 'credit'
})

const setup = async () => {
  const requests = { 1: [], 2: [] }
  vi.stubGlobal('fetch', vi.fn(url => {
    if (url.endsWith('/wallets')) return Promise.resolve(response({ result: list }))
    const id = Number(/\/wallets\/(\d+)\/events/.exec(url)[1])
    return new Promise(resolve => requests[id].push(resolve))
  }))
  renderWithProviders(<Wallets />)
  await screen.findByRole('tab', { name: 'Cash Wallet' })
  await waitFor(() => expect(requests[1].length).toBeGreaterThan(0))
  return {
    requests,
    cash: () => screen.getByRole('tab', { name: 'Cash Wallet' }),
    points: () => screen.getByRole('tab', { name: 'Credit Points Wallet' }),
    resolve: (id, body) => act(async () => {
      requests[id].forEach(resolve => resolve(response(body)))
    })
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('activity from the real wallet controller', () => {
  it('keeps cached cash history free of a points error on return', async () => {
    const wallet = await setup()
    await wallet.resolve(1, { result: [transaction('Cash deposit')] })
    expect(await screen.findByText('Cash deposit')).toBeVisible()
    fireEvent.click(wallet.points())
    await waitFor(() => expect(wallet.requests[2].length).toBeGreaterThan(0))
    await wallet.resolve(2, { error: true, result: ['Points request failed'] })
    expect(document.querySelector('[data-doc-section=credit-points-wallet]')).toHaveAttribute('data-doc-state', 'error')

    wallet.cash().focus()
    fireEvent.click(wallet.cash(), { detail: 0 })
    expect(wallet.cash()).toHaveFocus()
    expect(screen.getByText('Cash deposit')).toBeVisible()
    expect(document.querySelector('[data-doc-section=cash-wallet]')).toHaveAttribute('data-doc-state', 'activity')
    expect(wallet.requests[1]).toHaveLength(1)
  })

  it('keeps both histories when a cash request resolves after points', async () => {
    const wallet = await setup()
    fireEvent.click(wallet.points())
    await waitFor(() => expect(wallet.requests[2].length).toBeGreaterThan(0))
    await wallet.resolve(2, { result: [transaction('Points earned')] })
    expect(await screen.findByText('Points earned')).toBeVisible()

    await wallet.resolve(1, { result: [transaction('Late cash deposit')] })
    expect(screen.getByText('Points earned')).toBeVisible()
    fireEvent.click(wallet.cash())
    expect(screen.getByText('Late cash deposit')).toBeVisible()
    fireEvent.click(wallet.points())
    expect(screen.getByText('Points earned')).toBeVisible()
    expect(wallet.requests[1]).toHaveLength(1)
    expect(wallet.requests[2]).toHaveLength(1)
  })
})
