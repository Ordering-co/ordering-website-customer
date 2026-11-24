import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { AutoScroll } from '../index'

// implementation notesthe arrows are the base icon Button (neutral solid sm) with the
// base Icon; their classes (side, hidden) stay for the container's layout.

// jsdom has no layout: the scroller overflows (600 in 300) and is scrolled to the middle
const BOX = { scrollWidth: 600, clientWidth: 300, scrollLeft: 150 }
const originals = {}
beforeEach(() => {
  Object.keys(BOX).forEach((name) => {
    originals[name] = Object.getOwnPropertyDescriptor(Element.prototype, name)
    Object.defineProperty(Element.prototype, name, {
      configurable: true,
      get () { return this.getAttribute?.('data-testid') === 'scroller' ? BOX[name] : 0 },
      set () {}
    })
  })
})
afterEach(() => {
  Object.entries(originals).forEach(([name, descriptor]) => {
    if (descriptor) Object.defineProperty(Element.prototype, name, descriptor)
    else delete Element.prototype[name]
  })
})

const renderCarousel = (theme) => renderWithProviders(
  <div data-testid='scroller' style={{ overflowX: 'auto' }}>
    <div>
      <AutoScroll scrollId='carousel'>
        {[0, 1, 2].map(i => <div key={i}>item {i}</div>)}
      </AutoScroll>
    </div>
  </div>,
  { theme }
)

describe('AutoScroll: its arrows are the base icon Button', () => {
  it('named icon Buttons (neutral solid sm) with the base Icon, that scroll', () => {
    const theme = themeWithValues()
    const { getByRole, getByTestId } = renderCarousel(theme)
    const previous = getByRole('button', { name: 'Previous' })
    const next = getByRole('button', { name: 'Next' })
    const look = componentVars(theme, 'button', { size: 'sm', shape: 'icon', color: 'neutral', appearance: 'solid' })
    ;[previous, next].forEach((arrow) => {
      expect(arrow).toHaveAttribute('data-slot', 'button')
      expect(arrow).toHaveAttribute('type', 'button')
      expect(arrow.className).toContain('ui:w-(--ui-button-height)')
      expect(arrow.style.getPropertyValue('--ui-button-height')).toBe(look['--ui-button-height'])
      expect(arrow.style.getPropertyValue('--ui-button-background')).toBe(look['--ui-button-background'])
      expect(arrow.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    })
    expect(previous).toHaveClass('left-autoscroll')
    expect(next).toHaveClass('right-autoscroll')
    expect(next.querySelector('svg.lucide-chevron-right')).toBeInTheDocument()
    const scroller = getByTestId('scroller')
    scroller.scrollBy = vi.fn()
    fireEvent.click(next, { detail: 0 })
    expect(scroller.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 200 }))
    fireEvent.mouseDown(previous)
    expect(scroller.scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -200 }))
  })
})
