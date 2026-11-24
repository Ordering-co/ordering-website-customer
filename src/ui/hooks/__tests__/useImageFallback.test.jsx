import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useImageFallback } from '../useImageFallback'

// A stand-in for window.Image: the test decides when a probe fails
const probes = []
class FakeImage {
  constructor () { probes.push(this) }
  set src (value) { this._src = value }
  get src () { return this._src }
}

let RealImage
beforeEach(() => {
  RealImage = window.Image
  window.Image = FakeImage
  probes.length = 0
})
afterEach(() => { window.Image = RealImage })

describe('useImageFallback: a background image that fails becomes the placeholder', () => {
  it('its own source while it loads and once it did', () => {
    const { result } = renderHook(() => useImageFallback('logo.png', 'dummy.png'))
    expect(result.current).toBe('logo.png')
    expect(probes[0].src).toBe('logo.png')
  })

  it('the placeholder when it fails', () => {
    const { result } = renderHook(() => useImageFallback('logo.png', 'dummy.png'))
    act(() => { probes[0].onerror() })
    expect(result.current).toBe('dummy.png')
  })

  it('without a source: the placeholder (nothing without one)', () => {
    expect(renderHook(() => useImageFallback(null, 'dummy.png')).result.current).toBe('dummy.png')
    expect(renderHook(() => useImageFallback(null, null)).result.current).toBeFalsy()
  })

  it('without a placeholder a failed source stays (the screen decides)', () => {
    const { result } = renderHook(() => useImageFallback('logo.png', null))
    act(() => { probes[0].onerror() })
    expect(result.current).toBe('logo.png')
  })

  it('a new source is tried again', () => {
    const { result, rerender } = renderHook(({ src }) => useImageFallback(src, 'dummy.png'), { initialProps: { src: 'a.png' } })
    act(() => { probes[0].onerror() })
    expect(result.current).toBe('dummy.png')
    rerender({ src: 'b.png' })
    expect(result.current).toBe('b.png')
  })
})
