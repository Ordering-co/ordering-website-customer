import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../componentVars'
import { buttonSkinCss } from '../buttonSkin'

const [defaults, grill] = THEMES.map(({ theme }) => theme)
const tight = (css) => css.replace(/\s+/g, ' ')

describe('buttonSkinCss: the Button\'s look for an element that is not a React Button', () => {
  it.each([defaults, grill])('declares the variables the Button writes (%#) and paints from them', (theme) => {
    const css = tight(buttonSkinCss(theme, { size: 'sm', color: 'primary', appearance: 'solid' }))
    const vars = componentVars(theme, 'button', { size: 'sm', color: 'primary', appearance: 'solid' })
    Object.entries(vars).forEach(([name, value]) => expect(css).toContain(`${name}: ${value};`))
    expect(css).toContain('height: var(--ui-button-height);')
    expect(css).toContain('border-radius: var(--ui-button-radius);')
    expect(css).toContain('background: var(--ui-button-background);')
    expect(css).toContain('border: var(--ui-button-border);')
  })

  it('the two apps a banner needs: a solid primary text button and a ghost neutral icon one', () => {
    const text = tight(buttonSkinCss(defaults, { size: 'sm', color: 'primary', appearance: 'solid' }))
    expect(text).toContain(`--ui-button-background: ${componentVars(defaults, 'button', { size: 'sm', color: 'primary', appearance: 'solid' })['--ui-button-background']};`)
    expect(text).toContain('padding: 0 var(--ui-button-padding-x);')
    const icon = tight(buttonSkinCss(defaults, { size: 'sm', shape: 'icon', color: 'neutral', appearance: 'ghost' }))
    expect(icon).toContain('width: var(--ui-button-height);')
    expect(icon).toContain('padding: 0;')
    expect(icon).not.toContain('padding: 0 var(--ui-button-padding-x);')
  })

  it('has hover, pressed and disabled that fall back as the Button\'s do', () => {
    const css = tight(buttonSkinCss(defaults))
    expect(css).toContain('&:hover:not(:disabled, [aria-disabled=true]) { background: var(--ui-button-hover-background, var(--ui-button-pressed-background, var(--ui-button-background)));')
    expect(css).toContain('&:active:not(:disabled, [aria-disabled=true]) { background: var(--ui-button-pressed-background, var(--ui-button-background));')
    expect(css).toContain('&:disabled, &[aria-disabled=true] { background: var(--ui-button-disabled-background, var(--ui-button-background));')
    expect(css).toContain('cursor: not-allowed;')
  })

  it('moves as the theme says, and not with reduced motion', () => {
    const css = tight(buttonSkinCss(defaults))
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{ transition: color var\(--ui-button-motion-duration\) var\(--ui-button-motion-easing\), background-color [^;]+;/)
  })

  it('reserves the 44px touch area around it on a coarse pointer, without growing the painted box', () => {
    const css = tight(buttonSkinCss(defaults))
    expect(css).toMatch(/@media \(pointer: coarse\) \{ &::after \{[^}]*\/\* touch-target \*\/ min-width: 44px; \/\* touch-target \*\/ min-height: 44px;/)
    expect(css).toContain('position: relative;')
  })

  // The Button's classes are the source of truth: a variable the piece reads and this skin does not is a drift
  it('reads every --ui-button variable the Button\'s base classes read', () => {
    const source = readFileSync(join(import.meta.dirname, '..', '..', 'components', 'Button.jsx'), 'utf8')
    const base = source.slice(source.indexOf('const BASE = ['), source.indexOf('const MOBILE_TOUCH'))
    const used = new Set(base.match(/--ui-button-[a-z-]+/g))
    expect(used.size).toBeGreaterThan(20)
    const css = buttonSkinCss(defaults)
    // (the icon's size is a descendant rule of the piece; a banner's element has no svg of its own)
    ;[...used].filter((name) => name !== '--ui-button-icon-size').forEach((name) => expect(css, name).toContain(name))
  })
})
