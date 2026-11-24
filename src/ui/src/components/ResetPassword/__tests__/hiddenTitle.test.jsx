import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { HiddenTitle } from '../styles'

// the screen-reader-only pattern, as it was written by hand before it took `srOnlyCss`
describe('ResetPassword HiddenTitle', () => {
  it('stays clipped to a pixel and out of the flow', () => {
    const { getByText } = renderWithProviders(<HiddenTitle>Reset password</HiddenTitle>)
    const style = getComputedStyle(getByText('Reset password'))
    expect(style.position).toBe('absolute')
    expect(style.width).toBe('1px')
    expect(style.height).toBe('1px')
    expect(style.margin).toBe('-1px')
    expect(style.overflow).toBe('hidden')
    expect(style.whiteSpace).toBe('nowrap')
  })
})
