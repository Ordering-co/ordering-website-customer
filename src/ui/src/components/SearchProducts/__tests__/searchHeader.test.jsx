import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessProductsListContainer, LogoHeader, SearchBarWrapper, SearchHeader } from '../styles'

// The search opens where the header is: its height, side space and gap
const theme = themeWithValues((values) => {
  values.components.header.base = { ...values.components.header.base, height: 64, gap: 12 }
  return values
})

describe('the product search bar', () => {
  it('the header\'s height and gap, the whole width', () => {
    const { container } = renderWith(theme, <SearchHeader />)
    const css = cssFor(container.firstChild)
    expect(css).toMatch(/min-height:\s*64px/)
    expect(css).toMatch(/gap:\s*12px/)
    expect(css).toMatch(/width:\s*100%/)
    expect(css).not.toMatch(/98%/)
  })

  it('pins only "Clear" to the field\'s end: the magnifier keeps its space off the edge', () => {
    const { container } = renderWith(theme, <SearchBarWrapper />)
    const css = cssFor(container.firstChild)
    expect(css).toMatch(/min-width:\s*0;/)
    expect(css).not.toMatch(/input|span\.clear/)
    expect(css).not.toMatch(/>\s*span\s*\{/)
    expect(css).not.toMatch(/margin:\s*0 \d+px/)
  })

  it('the brand image width is the logo box of the header (no fixed width) and the results end under the measured header', () => {
    const { container } = renderWith(theme, <LogoHeader><img alt='' /></LogoHeader>)
    const css = cssFor(container.firstChild)
    expect(css).not.toContain('170px')
    expect(css).toMatch(/img\{[^}]*width:auto;/)
    const list = renderWith(theme, <BusinessProductsListContainer />)
    const listCss = cssFor(list.container.querySelector('div:last-child') || list.container.firstChild)
    expect(listCss).toContain('max-height:calc(90dvh - var(--header-height,64px));')
    expect(listCss).not.toContain('110px')
  })
})
