import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { cssFor, defaultTheme, renderWith } from '../../../styles/__tests__/themeTestUtils'

const styles = await vi.importActual('~ui/src/components/CartPopover/styles')

describe('CartPopover — body and arrow', () => {
  it('the floating body is capped by a reading measure, not 500px', () => {
    const { container } = renderWith(defaultTheme, <styles.PopoverBody />)
    const css = cssFor(container.firstChild)
    expect(css).toContain('max-width:min(100%,62ch);')
    expect(css).not.toContain('500px')
  })

  it('the arrow is the design system\'s PopoverArrow: no local triangle made of borders', () => {
    expect(styles.PopoverArrow).toBeUndefined()
  })
})
