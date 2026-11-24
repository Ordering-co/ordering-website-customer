import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { PREVIEW_STORAGE_KEY, getStorePreviewToken, resetStorePreview } from '../../../utils/storePreview'
import { StorePrivate } from '../index'

const post = vi.fn()
vi.mock('~components/contexts/ApiContext', () => ({ useApi: () => [{ post }] }))
const siteState = vi.hoisted(() => ({ value: { site: { name: 'Casa Lupita' } } }))
vi.mock('~components/contexts/SiteContext', () => ({ useSite: () => [siteState.value] }))

const reply = (content, status = 400) => post.mockResolvedValue({ content, status })

describe('StorePrivate page', () => {
  const replace = vi.fn()
  const realLocation = window.location

  beforeEach(() => {
    siteState.value = { site: { name: 'Casa Lupita' } }
    resetStorePreview()
    window.localStorage.clear()
    post.mockReset()
    replace.mockReset()
    Object.defineProperty(window, 'location', { configurable: true, value: { href: 'https://casa-lupita.example/store/x?q=1', replace } })
  })
  afterEach(() => Object.defineProperty(window, 'location', { configurable: true, value: realLocation }))

  const unlock = async (password) => {
    const view = renderWithProviders(<StorePrivate />)
    fireEvent.click(view.getByRole('button', { name: 'I have a password' }))
    fireEvent.change(view.getByLabelText('Password'), { target: { value: password } })
    fireEvent.submit(view.container.querySelector('form'))
    return view
  }

  it('titles the document with the store name and keeps it out of search engines', async () => {
    renderWithProviders(<StorePrivate />)
    await waitFor(() => expect(document.title).toBe('Casa Lupita'))
    expect(document.head.querySelector('meta[name=robots]')).toHaveAttribute('content', 'noindex, nofollow')
  })

  it('renders with the default theme before the site or its theme have loaded', () => {
    siteState.value = {} // no site yet; renderWithProviders gives the schema's defaults (the "My Site" name counts as none)
    const { getByRole, getByText } = renderWithProviders(<StorePrivate />)
    expect(getByRole('heading', { level: 1 })).toHaveTextContent('We are getting ready to open')
    expect(getByText('This store is preparing its online menu. Come back soon to order.')).toBeInTheDocument()
  })

  it('keeps the token the API returns and reloads the page with it in ?preview=', async () => {
    reply({ error: false, result: { token: 'tok-1' } }, 200)
    await unlock('lupita24')

    await waitFor(() => expect(replace).toHaveBeenCalledWith('https://casa-lupita.example/store/x?q=1&preview=tok-1'))
    expect(post).toHaveBeenCalledWith('store_preview/unlock', { password: 'lupita24' })
    expect(getStorePreviewToken()).toBe('tok-1')
    expect(window.localStorage.getItem(PREVIEW_STORAGE_KEY)).toBe('tok-1')
  })

  it('reads the wrong-password code, not the status', async () => {
    reply({ error: true, result: ['STORE_PREVIEW_WRONG_PASSWORD'], error_codes: ['STORE_PREVIEW_WRONG_PASSWORD'] })
    const { findByRole } = await unlock('nope')

    expect(await findByRole('alert')).toHaveTextContent("That password didn't work")
    expect(replace).not.toHaveBeenCalled()
    expect(getStorePreviewToken()).toBeNull()
  })

  it('says to wait when the API rate-limits the attempts (its code, or a 429)', async () => {
    reply({ error: true, error_codes: ['STORE_PREVIEW_RATE_LIMITED'], wait_for: 40 })
    const first = await unlock('nope')
    expect(await first.findByRole('alert')).toHaveTextContent('Too many attempts')
    first.unmount()

    reply({ error: true }, 429)
    const second = await unlock('nope')
    expect(await second.findByRole('alert')).toHaveTextContent('Too many attempts')
  })

  it('says it could not check when the request fails or the answer is not a token', async () => {
    post.mockRejectedValue(new Error('Internal error'))
    const first = await unlock('x')
    expect(await first.findByRole('alert')).toHaveTextContent("We couldn't check the password")
    first.unmount()

    reply({ error: false, result: {} }, 200)
    const second = await unlock('x')
    expect(await second.findByRole('alert')).toHaveTextContent("We couldn't check the password")
    expect(replace).not.toHaveBeenCalled()
  })
})
