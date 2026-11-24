import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { LogoWrapper, WrapInput } from '../styles'

// implementation notesthe field lane and the logo keep no fixed px.
describe('HomeHero: fluid sizes', () => {
  it('the field lane gives up one xl space of 70% to the button beside it', () => {
    const { container } = renderWith(themeWithValues(), <WrapInput $withIcon />)
    expect(cssFor(container.firstChild)).toMatch(/width:\s*calc\(70% - 24px\)/)
  })

  it('the logo box has no width of its own: it follows the image up to the hero', () => {
    const { container } = renderWith(themeWithValues(), <LogoWrapper />)
    const css = cssFor(container.firstChild)
    expect(css).not.toMatch(/150px/)
    expect(css).toMatch(/width:\s*auto/)
  })
})
