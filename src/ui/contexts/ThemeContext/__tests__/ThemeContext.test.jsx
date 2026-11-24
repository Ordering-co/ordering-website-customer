import React from 'react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { ServerStyleSheet, useTheme as useStyledTheme } from 'styled-components'
import { bodyTextCss, ThemeProvider, useTheme } from '../index'
import { buildAppTheme } from '~/utils/appTheme'
import { themeVisible } from '~/utils/themeVisibility'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'

// The writer is tested with the tokens (design-system/tokens/__tests__); here
// only that the provider mounts it, with the theme it gives.
vi.mock('~ui/src/design-system/tokens/ThemeCssVariables', async () => {
  const { useTheme: useStyled } = await import('styled-components')
  return { ThemeCssVariables: () => <i data-testid='ot-variables'>{useStyled().values.tokens.color.primary}</i> }
})

// The defaults theme with its own primary color
const baseTheme = (primary) => themeWithValues((values) => { values.tokens.color.primary = primary })

let manager
let current
const Probe = () => {
  const [theme, functions] = useTheme()
  const styled = useStyledTheme()
  manager = functions
  current = theme
  return <span data-testid='probe'>{`${theme.values.tokens.color.primary}|${styled.values.tokens.color.primary}|${theme.extra || ''}`}</span>
}

describe('ThemeProvider', () => {
  it('follows a new theme prop (context and styled-components)', () => {
    const { getByTestId, rerender } = render(<ThemeProvider theme={baseTheme('#111111')}><Probe /></ThemeProvider>)
    expect(getByTestId('probe').textContent).toBe('#111111|#111111|')
    rerender(<ThemeProvider theme={baseTheme('#222222')}><Probe /></ThemeProvider>)
    expect(getByTestId('probe').textContent).toBe('#222222|#222222|')
  })

  it('keeps update and merge working until the prop changes again', () => {
    const first = baseTheme('#111111')
    const { getByTestId, rerender } = render(<ThemeProvider theme={first}><Probe /></ThemeProvider>)
    act(() => manager.merge({ extra: 'merged' }))
    expect(getByTestId('probe').textContent).toBe('#111111|#111111|merged')
    act(() => manager.update(baseTheme('#333333')))
    expect(getByTestId('probe').textContent).toBe('#333333|#333333|')
    // Same prop object: the local update stays.
    rerender(<ThemeProvider theme={first}><Probe /></ThemeProvider>)
    expect(getByTestId('probe').textContent).toBe('#333333|#333333|')
    rerender(<ThemeProvider theme={baseTheme('#444444')}><Probe /></ThemeProvider>)
    expect(getByTestId('probe').textContent).toBe('#444444|#444444|')
  })

  it('keeps the active document direction across rebuilt themes', () => {
    const view = render(<ThemeProvider theme={baseTheme('#111111')} direction='rtl'><Probe /></ThemeProvider>)
    expect(current.rtl).toBe(true)
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')

    view.rerender(<ThemeProvider theme={baseTheme('#222222')} direction='rtl'><Probe /></ThemeProvider>)
    expect(view.getByTestId('probe').textContent).toBe('#222222|#222222|')
    expect(current.rtl).toBe(true)
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')

    view.rerender(<ThemeProvider theme={baseTheme('#222222')} direction='ltr'><Probe /></ThemeProvider>)
    expect(current.rtl).toBe(false)
    expect(document.documentElement).toHaveAttribute('dir', 'ltr')
    view.unmount()
    expect(document.documentElement).not.toHaveAttribute('dir')
  })

  it('merge composes consecutive calls', () => {
    const { getByTestId } = render(<ThemeProvider theme={baseTheme('#111111')}><Probe /></ThemeProvider>)
    act(() => {
      manager.merge({ extra: 'a' })
      manager.merge({ rtl: true })
    })
    expect(getByTestId('probe').textContent).toBe('#111111|#111111|a')
    expect(current.rtl).toBe(true)
  })
})

describe('ThemeProvider: the design system\'s variables', () => {
  it('mounts the writer of the --ot-* variables with the theme, and it follows a new one', () => {
    const { getAllByTestId, rerender } = render(<ThemeProvider theme={baseTheme('#123456')}><Probe /></ThemeProvider>)
    expect(getAllByTestId('ot-variables').map((node) => node.textContent)).toEqual(['#123456'])
    rerender(<ThemeProvider theme={baseTheme('#654321')}><Probe /></ThemeProvider>)
    expect(getAllByTestId('ot-variables').map((node) => node.textContent)).toEqual(['#654321'])
  })

  it('only the innermost provider mounts it (the boot theme\'s variables are not left under the site\'s)', () => {
    const { getAllByTestId } = render(
      <ThemeProvider theme={baseTheme('#0A0B0C')}>
        <ThemeProvider theme={baseTheme('#0D0E0F')}><Probe /></ThemeProvider>
      </ThemeProvider>
    )
    expect(getAllByTestId('ot-variables').map((node) => node.textContent)).toEqual(['#0D0E0F'])
  })
})

describe('ThemeProvider: the text of the page (bodyTextCss)', () => {
  it('is the body style: its size and its line, a ratio of the size (unitless)', () => {
    const theme = themeWithValues((values) => { values.tokens.typography.body = { ...values.tokens.typography.body, size: 15, line: 1.6 } })
    expect(bodyTextCss(theme)).toBe('font-size: 15px; line-height: 1.6;')
  })
})

describe('ThemeProvider: the phone layer of visibility (below 576px)', () => {
  const realWidth = window.innerWidth
  const resize = (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
    window.dispatchEvent(new Event('resize'))
  }
  afterEach(() => resize(realWidth))

  const LogoProbe = () => {
    const styled = useStyledTheme()
    const [theme] = useTheme()
    return <span data-testid='logo'>{`${themeVisible(styled, 'business.header.logo')}|${themeVisible(theme, 'business.header.logo')}`}</span>
  }

  it('themeVisible answers the phone\'s value on phones, from the first render, and follows the width', () => {
    resize(375)
    const theme = buildAppTheme()
    const { getByTestId } = render(<ThemeProvider theme={theme}><LogoProbe /></ThemeProvider>)
    expect(getByTestId('logo').textContent).toBe('false|false')
    act(() => resize(1024))
    expect(getByTestId('logo').textContent).toBe('true|true')
    act(() => resize(400))
    expect(getByTestId('logo').textContent).toBe('false|false')
  })

  it('a resize within one side keeps the very theme object (nothing re-renders for it)', () => {
    resize(1024)
    const seen = []
    const Collect = () => { seen.push(useStyledTheme()); return null }
    const theme = buildAppTheme()
    render(<ThemeProvider theme={theme}><Collect /></ThemeProvider>)
    act(() => resize(1200))
    expect(new Set(seen).size).toBe(1)
    expect(seen[0]).toBe(theme)
  })
})

describe('ThemeProvider: the global rules and the design system\'s pieces', () => {
  const globalCss = () => {
    const sheet = new ServerStyleSheet()
    try {
      renderToString(sheet.collectStyles(<ThemeProvider theme={baseTheme('#111111')}><Probe /></ThemeProvider>))
      return sheet.getStyleTags()
    } finally {
      sheet.seal()
    }
  }

  it('the overlay of a modal is a layer behind its box that fades in with the modal\'s motion; the .popup-component itself never fades', () => {
    const css = (theme) => {
      const sheet = new ServerStyleSheet()
      try {
        renderToString(sheet.collectStyles(<ThemeProvider theme={theme}><Probe /></ThemeProvider>))
        return sheet.getStyleTags().replace(/\s+/g, '').replace(/-(webkit|ms|moz)-/g, '')
      } finally {
        sheet.seal()
      }
    }
    const animated = css(themeWithValues((values) => { values.tokens.motion_style.enabled = true; values.components.modal.base.animated = true }))
    expect(animated).toMatch(/\.popup-component::before\{[^}]*z-index:-1;[^}]*background-color:rgba\(0,0,0,0\.4\);/)
    expect(animated).toMatch(/prefers-reduced-motion:no-preference\)\{[^{]*\.popup-component::before\{animation:theme-fade-in200ms/)
    // no color of its own and no animation on the .popup-component (it would multiply the box's fade)
    expect(animated).toMatch(/\.popup-component\{[^}]*display:flex/)
    expect(animated).not.toMatch(/\.popup-component\{[^}]*(background-color|animation|opacity)/)
    const still = css(themeWithValues((values) => { values.tokens.motion_style.enabled = false }))
    expect(still).toMatch(/\.popup-component::before\{[^}]*animation:none/)
  })

  it('the bare-element rules (headings, form controls\' font) are for the legacy elements: a piece (data-slot) keeps its own text', () => {
    const css = globalCss()
    expect(css).toMatch(/input:where\(:not\(\[data-slot\]\)\),\s*textarea:where\(:not\(\[data-slot\]\)\),\s*button:where\(:not\(\[data-slot\]\)\)\s*\{\s*font-family:\s*inherit/)
    ;['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((level) => {
      expect(css).toMatch(new RegExp(`${level}:where\\(:not\\(\\[data-slot\\]\\)\\)\\s*\\{[^}]*font-size`))
    })
    // no global rule left on a bare heading or control (it would beat a layered utility)
    expect(css).not.toMatch(/(^|\})\s*h[1-6]\s*\{/)
    expect(css).not.toMatch(/(^|\})\s*(input|textarea|button)\s*[,{]/)
  })
})
