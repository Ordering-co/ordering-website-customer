import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { WrapperBusinessCard } from '../styles'

describe('Locations: fluid card', () => {
  it('the info card of a store is capped by the measure of its text, not a fixed width', () => {
    const { container } = renderWith(themeWithValues(), <WrapperBusinessCard />)
    expect(cssFor(container.firstChild)).toMatch(/max-width:\s*min\(100%,\s*35ch\)/)
  })
})
