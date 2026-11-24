import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { SmartAppBanner } from '../index'
import { smartBannerRules } from '../styles'
import { schemaDefault } from '~/utils/themeSchema'
import { buttonSkinCss } from '~ui/src/design-system/lib/buttonSkin'

vi.mock('~components/components/SmartAppBanner', () => ({
  SmartAppBanner: ({ UIComponent, ...rest }) => <UIComponent {...rest} />
}))

describe('SmartAppBanner', () => {
  it('wires controller with empty presentation shell', () => {
    const { container } = renderWithProviders(<SmartAppBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('the schema shows it by default', () => {
    expect(schemaDefault('visibility.smart_app_banner')).toBe(true)
  })

  // The global style injects on a layout effect of the browser build only
  // (jsdom runs the node build): the rules are checked as a string
  it('drawn from the tokens, over index.html\'s rules (the root\'s class first)', () => {
    const theme = themeWithValues((values) => {
      values.tokens.color.surface = '#FAFAF0'
      values.tokens.size.xl = 60
      values.tokens.space.md = 10
      return values
    })
    // without the buttons' fade (animated by default): its nested block would end a `[^}]*`
    const css = smartBannerRules(theme).replace(/\s+/g, ' ').replace(/@media \(prefers-reduced-motion: no-preference\) \{[^}]*\}/g, '')
    // the icon (size.xl) and space.md above and below
    expect(css).toContain('html.smartbanner-show { margin-top: 80px; }')
    expect(css).toMatch(/html\.smartbanner-show \.smartbanner \{ height: 80px; line-height: normal; background: #FAFAF0;/)
    expect(css).toMatch(/\.smartbanner \.smartbanner-icon \{[^}]*width: 60px; height: 60px;/)
    // "View": a primary solid button of the theme (sm), the close a ghost one
    // (the skin of the base Button: its variables, then the rules that read them)
    expect(css).toMatch(/\.smartbanner \.smartbanner-button \{[^}]*--ui-button-background: #1E72E3;[^}]*--ui-button-height: 32px;[^}]*height: var\(--ui-button-height\);[^}]*background: var\(--ui-button-background\);/)
    expect(css).toMatch(/\.smartbanner \.smartbanner-close \{[^}]*--ui-button-background: transparent;[^}]*width: var\(--ui-button-height\);/)
    // no skin of the library's platforms
    expect(css).toMatch(/\.smartbanner \.smartbanner-button-text \{[^}]*background: none;/)
  })

  it('its links wear the base Button\'s skin (buttonSkinCss), not the legacy button rules', () => {
    const theme = themeWithValues()
    const css = smartBannerRules(theme)
    expect(css).toContain(buttonSkinCss(theme, { color: 'primary', appearance: 'solid', size: 'sm' }))
    expect(css).toContain(buttonSkinCss(theme, { color: 'neutral', appearance: 'ghost', size: 'sm', shape: 'icon' }))
    // the touch area of the Button, on a coarse pointer
    expect(css).toContain('/* touch-target */ min-width: 44px;')
  })

  it('with the default tokens: 80px tall, as today', () => {
    expect(smartBannerRules(themeWithValues())).toContain('margin-top: 80px;')
  })
})
