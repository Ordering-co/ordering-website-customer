import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { FILLED_ICONS, LUCIDE_ICON_REGISTRY } from '../lucideRegistry'
import * as brands from '../brands'
import { ArrowLeftRight, ChevronLeft, ChevronUp, Circle, CircleDot, CircleX, ClipboardList, Dot, LoaderCircle, MapPinned, Maximize2, Search, TextAlignEnd } from 'lucide-react'

describe('lucideRegistry', () => {
  it('has no undefined value (a typo in an import would leave one)', () => {
    for (const [name, Component] of Object.entries(LUCIDE_ICON_REGISTRY)) {
      expect(Component, name).toBeTruthy()
    }
  })

  it('renders every entry as an svg in a 24 box that follows size', () => {
    for (const [name, Component] of Object.entries(LUCIDE_ICON_REGISTRY)) {
      const { container, unmount } = render(<Component size={18} />)
      const svg = container.querySelector('svg')
      expect(svg, name).toBeTruthy()
      expect(svg.getAttribute('viewBox'), name).toBe('0 0 24 24')
      expect(svg.getAttribute('width'), name).toBe('18')
      expect(svg.getAttribute('height'), name).toBe('18')
      unmount()
    }
  })

  // The choices of docs/design-system/iconos-mapa.md §7 (implementation notes, «A en todo»).
  it.each([
    ['closeOctagon', CircleX],
    ['fullscreen', Maximize2],
    ['arrowLeftRight', ArrowLeftRight],
    ['caretLeftFill', ChevronLeft],
    ['caretUpFill', ChevronUp],
    ['dot', Dot],
    ['searchLoading', Search],
    ['loaderCircle', LoaderCircle],
    ['cardChecklist', ClipboardList],
    ['pinMapFill', MapPinned],
    ['menuAltRight', TextAlignEnd],
    ['radioChoiceOff', Circle],
    ['radioChoiceOn', CircleDot]
  ])('%s is the chosen glyph', (name, Glyph) => {
    expect(LUCIDE_ICON_REGISTRY[name]).toBe(Glyph)
  })

  it('fills only where the fill is the information (D9 A)', () => {
    expect([...FILLED_ICONS].sort()).toEqual(['circleFill', 'heartFilled', 'starFilled', 'starFilledAi'])
  })

  it('keeps FILLED_ICONS inside the registry', () => {
    for (const name of FILLED_ICONS) expect(LUCIDE_ICON_REGISTRY, name).toHaveProperty(name)
  })
})

describe('brands', () => {
  it('are the 12 brand glyphs', () => {
    expect(Object.keys(brands).sort()).toEqual(
      ['Apple', 'Facebook', 'Google', 'Instagram', 'Paypal', 'Pinterest', 'Snapchat', 'Stripe', 'StripeCard', 'StripeS', 'Tiktok', 'Whatsapp']
    )
  })

  it.each(Object.entries(brands))('%s is a monochrome svg that follows size, color and rest props', (name, Brand) => {
    const { container } = render(<Brand size={32} color='red' className='x' data-testid='b' />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg.getAttribute('width')).toBe('32')
    expect(svg.getAttribute('height')).toBe('32')
    expect(svg.getAttribute('fill')).toBe('red')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('class')).toBe('x')
    expect(svg.getAttribute('data-testid')).toBe('b')
    expect(svg.querySelector('path')).toBeTruthy()
  })

  it('defaults to 24px and currentColor, and does not leak stroke props to the DOM', () => {
    const { container } = render(<brands.Apple strokeWidth={3} />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('24')
    expect(svg.getAttribute('fill')).toBe('currentColor')
    expect(svg.hasAttribute('strokeWidth')).toBe(false)
    expect(svg.hasAttribute('stroke-width')).toBe(false)
  })
})
