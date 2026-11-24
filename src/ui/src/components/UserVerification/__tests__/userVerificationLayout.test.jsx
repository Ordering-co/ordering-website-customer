import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// setupTests.js mocks these styles globally: the real CSS here.
const { Container, FormInput, InputWrapper, WrapperText } = await vi.importActual('~ui/src/components/UserVerification/styles')

// /verify with the theme: the space of components.field between
// the rows, the page title's space (components.section_header, page variant)
// under the title block,
// the whole width on a phone and the room under the header.

describe('UserVerification — its layout', () => {
  it('the rows of the form are the gap of components.field apart; the whole width under 768px', () => {
    const theme = themeWithValues((values) => { values.components.field.base.gap = 14; return values })
    const { container } = renderWith(theme, <FormInput />)
    const css = cssFor(container.firstChild)
    expect(css).toContain('gap:14px;')
    expect(css).toMatch(/@media \(max-width:767px\)\{\.[\w-]+\{width:100%;/)
  })

  it('the title block keeps the page title\'s space (section_header.variants.page.margin_bottom) to the form, less its gap', () => {
    const theme = themeWithValues((values) => {
      values.components.section_header.variants.page = { ...values.components.section_header.variants.page, margin_bottom: 30 }
      values.components.field.base.gap = 12
      return values
    })
    const { container } = renderWith(theme, <WrapperText><h1>Verification Code</h1></WrapperText>)
    expect(cssFor(container.firstChild)).toContain('margin-bottom:max(0px,calc(30px - 12px));')
  })

  it('the page fills the room under the header (no 100vh under it), with the side space of the page', () => {
    const theme = themeWithValues(values => {
      values.components.header.base.height = 80
      return values
    })
    const { container } = renderWith(theme, <Container />)
    const css = cssFor(container.firstChild)
    expect(css).toContain('height:auto;')
    expect(css).toContain('min-height:calc(100dvh - var(--header-height,80px));')
    expect(css).toMatch(/padding:32px 16px;/)
  })

  it('the phone field is the base InputPhone: its wrapper writes no alignment, border, radius or padding over its input (the piece centers the number by its align)', () => {
    const { container } = renderWith(themeWithValues(), <InputWrapper />)
    const css = cssFor(container.firstChild).replace(/\s+/g, '')
    expect(css).not.toMatch(/\.PhoneInput(\{|input)|text-align|border|padding/i)
  })
})
