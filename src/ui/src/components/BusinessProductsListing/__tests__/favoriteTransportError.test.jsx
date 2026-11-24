import React from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BusinessAndProductList } from '~components/components/BusinessAndProductList'
import { ToastProvider } from '~components/contexts/ToastContext'
import { Toast } from '~ui/src/styles/Toast'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { BusinessProductsListing } from '../index'

vi.unmock('~components/contexts/ToastContext')
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: true, user: { id: 42 }, token: 'test-token' }, {}]
}))
vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{ language: { code: 'en' } }, (key, fallback) => key === 'NETWORK_ERROR' ? 'Error de red' : fallback]
}))
vi.mock('~components/hooks/useFreeDeliveryProgress', () => ({
  useFreeDeliveryProgress: () => ({ status: 'none' })
}))
vi.mock('~ui/src/components/Cart', () => ({ Cart: () => null }))
vi.mock('~ui/src/components/ProductForm', () => ({ ProductForm: () => null }))

const business = { id: 7, name: 'Demo Store', slug: 'demo-store', open: true, enabled: true, categories: [] }
const ordering = {
  root: 'https://api.ordering.test',
  businesses: () => ({
    select: () => ({
      parameters: () => ({ get: async () => ({ content: { error: false, result: business } }) })
    })
  })
}

const LegacyHeader = ({ businessState, handleFavoriteBusiness }) => {
  if (businessState.loading) return null
  return (
    <button type='button' onClick={() => handleFavoriteBusiness(true)}>Favorite</button>
  )
}

beforeEach(() => {
  vi.spyOn(window, 'scroll').mockImplementation(() => {})
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('BusinessProductsListing header favorite transport failure', () => {
  it.each([
    ['web', true, 'Error de red'],
    ['shared controller without a handler', false, 'Failed to fetch']
  ])('%s shows the expected toast', async (_consumer, isWeb, message) => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetch)
    const header = isWeb
      ? <BusinessProductsListing slug={business.slug} ordering={ordering} notLoadProducts />
      : <BusinessAndProductList slug={business.slug} ordering={ordering} notLoadProducts UIComponent={LegacyHeader} />
    renderWithProviders(
      <ToastProvider>
        <style id='styles' />
        {header}
        <Toast />
      </ToastProvider>
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Favorite' }))
    expect((await screen.findByRole('alert')).textContent).toBe(message)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.ordering.test/users/42/favorite_businesses',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ object_id: 7 }) })
    )
  })
})
