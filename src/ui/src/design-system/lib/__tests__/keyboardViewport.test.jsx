import { afterEach, describe, expect, it } from 'vitest'
import { keyboardCovers } from '../keyboardViewport'

describe('keyboardCovers', () => {
  afterEach(() => { window.innerHeight = 768 })

  it('is true only when the visual viewport is much shorter than the layout one', () => {
    window.innerHeight = 800
    expect(keyboardCovers({ height: 800, scale: 1 })).toBe(false)
    expect(keyboardCovers({ height: 500, scale: 1 })).toBe(true)
  })

  it('a browser bar sliding away or a pinch zoom is not the keyboard', () => {
    window.innerHeight = 800
    expect(keyboardCovers({ height: 740, scale: 1 })).toBe(false)
    expect(keyboardCovers({ height: 500, scale: 2 })).toBe(false)
  })
})
