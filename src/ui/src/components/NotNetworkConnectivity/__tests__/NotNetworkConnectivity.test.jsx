import { describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { NotNetworkConnectivity } from '../index'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

vi.mock('~ui/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => false
}))

describe('NotNetworkConnectivity', () => {
  it('renders offline message when not online', () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        blob: async () => new Blob(['img'], { type: 'image/png' })
      })
    )

    const { getByText } = renderWithProviders(
      <NotNetworkConnectivity image='https://example.com/offline.png' isOnline={false} />
    )
    expect(getByText('No internet connection')).toBeInTheDocument()
    expect(getByText(/Your connection appears to be off-line/i)).toBeInTheDocument()
  })

  it('its title is the screen\'s h1 (the whole page while offline)', () => {
    global.fetch = vi.fn(() => Promise.resolve({ blob: async () => new Blob(['img'], { type: 'image/png' }) }))
    const { getByRole } = renderWithProviders(<NotNetworkConnectivity image='https://example.com/offline.png' isOnline={false} />)
    expect(getByRole('heading', { level: 1, name: 'No internet connection' })).toBeInTheDocument()
  })

  it('the spaces of tokens.space', () => {
    global.fetch = vi.fn(() => Promise.resolve({ blob: async () => new Blob(['img'], { type: 'image/png' }) }))
    const themed = renderWithProviders(<NotNetworkConnectivity image='https://example.com/offline.png' isOnline={false} />, { theme: themeWithValues() })
    const themedBox = themed.container.querySelector('[data-doc-section="global-offline"]')
    expect(cssFor(themedBox)).toContain('margin:48px auto;')
  })

  it('its image is in the empty states\' box (empty_state image_size), asked for at the 1:1 hint', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ blob: async () => new Blob(['img'], { type: 'image/png' }) }))
    const theme = themeWithValues((values) => {
      values.components.empty_state.base.image_size = 210
      return values
    })
    const { container } = renderWithProviders(<NotNetworkConnectivity image='https://example.com/offline.png' isOnline={false} />, { theme })
    const img = await waitFor(() => {
      const el = container.querySelector('#not-network')
      expect(el).not.toBeNull()
      return el
    })
    expect(img).toHaveAttribute('width', '600')
    expect(img).toHaveAttribute('height', '600')
    const css = cssFor(img).replace(/\s+/g, '')
    expect(css).toContain('width:210px;height:210px;')
    expect(css).not.toContain('300px')
  })

  it('without an image (neither its own nor the theme\'s empty.no_internet): the icon, nothing fetched', () => {
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy
    const { container } = renderWithProviders(<NotNetworkConnectivity isOnline={false} />)
    expect(container.querySelector('svg.lucide-wifi-off')).toBeInTheDocument()
    expect(container.querySelector('#not-network')).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
