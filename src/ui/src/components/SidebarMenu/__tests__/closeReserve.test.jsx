import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { defaultTheme, injectedCss, renderWith } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { themeSpace } from '~/utils/themeTokens'

const { CustomerInfo } = await vi.importActual('~ui/src/components/SidebarMenu/styles')

// The header leaves room for the close button on the end side: the gutter it sits at, its box and one lg space.
const reserve = (theme) => `calc(${theme.css.tokens.layout.page_gutter} + ${componentVars(theme, 'button', { size: 'md', shape: 'icon' })['--ui-button-height']} + ${themeSpace(theme, 'lg')})`
const tight = (text) => text.replace(/\s+/g, '')
// CustomerInfo's own class comes before the SIDEBAR_HEADER class that attrs adds
const headerCss = (el) => tight(injectedCss().split('}').filter((rule) => el.className.split(' ').some((c) => c && rule.includes(`.${c}`))).join('}'))

describe('SidebarMenu — room for the close button (no fixed 80px)', () => {
  it('the end side of the header reserves the gutter, the button and a space', () => {
    const { container } = renderWith(defaultTheme, <CustomerInfo />)
    const css = headerCss(container.firstChild)
    expect(css).toContain(tight(`padding:${themeSpace(defaultTheme, 'sm')} ${reserve(defaultTheme)} ${themeSpace(defaultTheme, 'sm')} ${defaultTheme.css.tokens.layout.page_gutter};`))
    expect(css).not.toContain('80px')
  })

  it('in rtl the reserve goes to the left, the gutter to the right', () => {
    const rtl = { ...defaultTheme, rtl: true }
    const { container } = renderWith(rtl, <CustomerInfo />)
    expect(headerCss(container.firstChild)).toContain(tight(`padding:${themeSpace(rtl, 'sm')} ${rtl.css.tokens.layout.page_gutter} ${themeSpace(rtl, 'sm')} ${reserve(rtl)};`))
  })
})
