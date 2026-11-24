import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { INDICATOR_DELAY_MS, useDelayedFlag } from '../useDelayedFlag'

describe('useDelayedFlag', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const advance = (ms) => act(() => { vi.advanceTimersByTime(ms) })

  it('is false while the flag is false', () => {
    const { result } = renderHook(() => useDelayedFlag(false))
    advance(INDICATOR_DELAY_MS * 3)
    expect(result.current).toBe(false)
  })

  it('turns true only after the delay of a flag that stays true', () => {
    const { result } = renderHook(() => useDelayedFlag(true))
    expect(result.current).toBe(false)
    advance(INDICATOR_DELAY_MS - 1)
    expect(result.current).toBe(false)
    advance(1)
    expect(result.current).toBe(true)
  })

  it('a flag that ends before the delay never shows', () => {
    const { result, rerender } = renderHook(({ flag }) => useDelayedFlag(flag), { initialProps: { flag: true } })
    advance(INDICATOR_DELAY_MS - 1)
    rerender({ flag: false })
    advance(INDICATOR_DELAY_MS * 3)
    expect(result.current).toBe(false)
  })

  it('turns false in the very render the flag does', () => {
    const seen = []
    const { rerender } = renderHook(({ flag }) => {
      const shown = useDelayedFlag(flag)
      seen.push([flag, shown])
      return shown
    }, { initialProps: { flag: true } })
    advance(INDICATOR_DELAY_MS)
    rerender({ flag: false })
    expect(seen.filter(([flag]) => !flag).every(([, shown]) => shown === false)).toBe(true)
  })

  it('shows again after a new, slow run, again waiting the delay', () => {
    const { result, rerender } = renderHook(({ flag }) => useDelayedFlag(flag), { initialProps: { flag: true } })
    advance(INDICATOR_DELAY_MS)
    expect(result.current).toBe(true)
    rerender({ flag: false })
    expect(result.current).toBe(false)
    rerender({ flag: true })
    expect(result.current).toBe(false)
    advance(INDICATOR_DELAY_MS)
    expect(result.current).toBe(true)
  })

  it('takes the delay it is given', () => {
    const { result } = renderHook(() => useDelayedFlag(true, 50))
    advance(49)
    expect(result.current).toBe(false)
    advance(1)
    expect(result.current).toBe(true)
  })
})
