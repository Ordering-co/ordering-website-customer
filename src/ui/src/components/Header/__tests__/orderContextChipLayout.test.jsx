import React from 'react'
import { describe, it, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import { InnerHeader, LeftHeader, OrderContextChipBox, OrderContextChipText } from '../styles'
import { injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// implementation notesjsdom does not lay out, so this fixes the rules that let the
// chip (the header's order context summary) shrink and cut a long address
// with "…" instead of pushing the cart off the screen (+367px at 820px)
const css = (ui) => {
  cleanup()
  renderWith(themeWithValues(), ui)
  return injectedCss().replace(/\s+/g, '')
}

describe('the header\'s order context chip shrinks with a long address', () => {
  it('the three-column row frees its left column from the chip\'s text width', () => {
    const rules = css(<InnerHeader />)
    expect(rules).toMatch(/&?:has\(\[data-doc-section='header-order-context-chip'\]\)\{grid-template-columns:minmax\(0,1fr\)minmax\(0,auto\)minmax\(max-content,1fr\);/)
    expect(rules).toContain('#left-side{min-width:0;justify-self:stretch;}')
  })

  it('the chip takes the room the others leave, never less than a few characters, and cuts its text', () => {
    const box = css(<OrderContextChipBox />)
    expect(box).toMatch(/flex:110%;/) // flex: 1 1 0%
    expect(box).toContain('min-width:min(100%,16ch);')
    const text = css(<OrderContextChipText />)
    expect(text).toContain('overflow:hidden;')
    expect(text).toContain('text-overflow:ellipsis;')
    expect(text).toContain('white-space:nowrap;')
  })

  it('beside the chip the store\'s slot takes only what it needs', () => {
    expect(css(<LeftHeader />)).toMatch(/:has\(\.OrderContextChipBox[\w-]*\)\.HeaderStoreSlot[\w-]*\{[^}]*flex-grow:0;/)
  })
})
