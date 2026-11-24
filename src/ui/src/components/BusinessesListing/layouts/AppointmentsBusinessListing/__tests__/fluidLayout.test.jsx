import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { cssFor, defaultTheme, renderWith } from '../../../../../styles/__tests__/themeTestUtils'

const styles = await vi.importActual('~ui/src/components/BusinessesListing/layouts/AppointmentsBusinessListing/styles')
const tight = (text) => text.replace(/\s+/g, '')
const css = (Styled) => {
  const { container } = renderWith(defaultTheme, <Styled />)
  return tight(cssFor(container.firstChild))
}

describe('AppointmentsBusinessListing — fluid columns (no fixed px)', () => {
  it('from 800px the filters and the list are a 1fr / 3fr grid, the column at least 36ch', () => {
    const rules = css(styles.PreorderAndBusinessWrapper)
    expect(rules).toContain('display:grid;grid-template-columns:minmax(36ch,1fr)minmax(0,3fr);')
  })

  it('the filters column and the list fill their tracks instead of 350px / calc(100% - 320px)', () => {
    const filters = css(styles.PreorderWrapper)
    expect(filters).toContain('min-width:min(100%,31ch);')
    expect(filters).not.toMatch(/350px|250px/)
    const list = css(styles.BusinessListWrapper)
    expect(list).toContain('width:auto;')
    expect(list).not.toContain('320px')
  })
})
