import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PULSE_ATTRIBUTE, restartErrorPulse } from '../errorPulse'

describe('restartErrorPulse', () => {
  let target
  let timers
  beforeEach(() => {
    vi.useFakeTimers()
    target = document.createElement('div')
    timers = new Map()
  })
  afterEach(() => vi.useRealTimers())

  it('puts the attribute on for the animation and takes it off at its end', () => {
    restartErrorPulse(target, timers, 1100)
    expect(target.getAttribute(PULSE_ATTRIBUTE)).toBe('true')
    vi.advanceTimersByTime(1099)
    expect(target.hasAttribute(PULSE_ATTRIBUTE)).toBe(true)
    vi.advanceTimersByTime(1)
    expect(target.hasAttribute(PULSE_ATTRIBUTE)).toBe(false)
    expect(timers.size).toBe(0)
  })

  it('restarts on each call: attribute off then on, and the old timer never cuts the new pulse', () => {
    restartErrorPulse(target, timers, 1100)
    vi.advanceTimersByTime(600)
    const removed = vi.spyOn(target, 'removeAttribute')
    restartErrorPulse(target, timers, 1100)
    expect(removed).toHaveBeenCalledWith(PULSE_ATTRIBUTE)
    expect(target.hasAttribute(PULSE_ATTRIBUTE)).toBe(true)
    expect(timers.size).toBe(1)
    // 1100 ms after the first call: its timer was cancelled
    vi.advanceTimersByTime(500)
    expect(target.hasAttribute(PULSE_ATTRIBUTE)).toBe(true)
    vi.advanceTimersByTime(600)
    expect(target.hasAttribute(PULSE_ATTRIBUTE)).toBe(false)
  })

  it('does not pulse without motion (0 ms)', () => {
    restartErrorPulse(target, timers, 0)
    expect(target.hasAttribute(PULSE_ATTRIBUTE)).toBe(false)
    expect(timers.size).toBe(0)
  })

  it('a call with no motion takes a running pulse off', () => {
    restartErrorPulse(target, timers, 1100)
    restartErrorPulse(target, timers, 0)
    expect(target.hasAttribute(PULSE_ATTRIBUTE)).toBe(false)
    vi.advanceTimersByTime(2000)
    expect(timers.size).toBe(0)
  })
})
