import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { ContinueButton, WrappNotAddresses } from '../styles'

const flat = (css) => css.replace(/\s+/g, '')

// implementation notesthe empty-state box, its illustration and the sticky Continue
// come from the theme (4xl media level, hairline) and the screen (dvh).
describe('AddressList fluid layout', () => {
  it('the customer picker\'s illustration box and image are the 4xl media level', () => {
    const { getByText } = renderWith(themeWithValues(), <WrappNotAddresses isCustomerMode>box</WrappNotAddresses>)
    const css = flat(cssFor(getByText('box')))
    expect(css).toContain('min-height:200px;height:200px;')
    expect(css).toContain('width:200px')
  })

  it('the standard empty state reserves a share of the screen, not 350px', () => {
    const { getByText } = renderWith(themeWithValues(), <WrappNotAddresses>box</WrappNotAddresses>)
    const css = flat(cssFor(getByText('box')))
    expect(css).toContain('min-height:40dvh')
    expect(css).not.toContain('350px')
  })

  it('the sticky Continue stops a hairline of the theme short of the bottom', () => {
    const { getByText } = renderWith(themeWithValues(), <ContinueButton>go</ContinueButton>)
    expect(flat(cssFor(getByText('go')))).toContain('bottom:1px')
  })
})
