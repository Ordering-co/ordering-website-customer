import { describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { Footer } from '../index'

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { powered_by_ordering_module: { value: true } } }]
}))

describe('Footer', () => {
  it('shows no vendor credit, even with powered_by_ordering_module on', async () => {
    const { container } = renderWithProviders(<Footer />)
    await waitFor(() => {
      expect(container.querySelector('footer')).toBeInTheDocument()
    })
    expect(container.textContent).not.toMatch(/powered by|ordering/i)
    expect(container.querySelector('a[href*="ordering"]')).toBeNull()
  })
})
