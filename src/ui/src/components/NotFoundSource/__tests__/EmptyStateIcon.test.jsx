import { beforeAll, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'

vi.unmock('~ui-icon')

let EmptyStateIcon

beforeAll(async () => {
  ;({ EmptyStateIcon } = await import('../index'))
})

describe('EmptyStateIcon (the real icon, not the test mock)', () => {
  it('is decorative: aria-hidden, never focusable', () => {
    const { container } = renderWithProviders(<EmptyStateIcon name='bag' />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).not.toHaveAttribute('tabindex')
  })
})
