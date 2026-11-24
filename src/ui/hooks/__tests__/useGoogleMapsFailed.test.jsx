import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GOOGLE_MAPS_FAILURE_TIMEOUT_MS, resetGoogleMapsFailed, useGoogleMapsFailed } from '../useGoogleMapsFailed'

afterEach(() => {
  resetGoogleMapsFailed()
  delete window.google
  vi.useRealTimers()
})

describe('useGoogleMapsFailed', () => {
  it('fails immediately without an apiKey', () => {
    const { result } = renderHook(() => useGoogleMapsFailed(null))
    expect(result.current).toBe(true)
  })

  it('a missing key (configs still loading) fails only that map, and a key arriving later recovers it', () => {
    const { result, rerender } = renderHook(({ apiKey }) => useGoogleMapsFailed(apiKey), { initialProps: { apiKey: null } })
    expect(result.current).toBe(true)
    const { result: other } = renderHook(() => useGoogleMapsFailed('test-google-key'))
    expect(other.current).toBe(false)
    rerender({ apiKey: 'test-google-key' })
    expect(result.current).toBe(false)
  })

  it('stops its clock once no map is mounted', () => {
    vi.useFakeTimers()
    const { unmount } = renderHook(() => useGoogleMapsFailed('test-google-key'))
    unmount()
    act(() => { vi.advanceTimersByTime(GOOGLE_MAPS_FAILURE_TIMEOUT_MS) })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('fails once window.gm_authFailure runs (rejected key, referrer, quota)', () => {
    const { result } = renderHook(() => useGoogleMapsFailed('test-google-key'))
    expect(result.current).toBe(false)
    act(() => { window.gm_authFailure() })
    expect(result.current).toBe(true)
  })

  it('chains a previous window.gm_authFailure instead of replacing it', () => {
    const previous = vi.fn()
    window.gm_authFailure = previous
    renderHook(() => useGoogleMapsFailed('test-google-key'))
    act(() => { window.gm_authFailure() })
    expect(previous).toHaveBeenCalledTimes(1)
  })

  it('fails when google.maps never shows up a whole timeout after #google-maps-sdk was added', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useGoogleMapsFailed('test-google-key'))
    const script = document.createElement('script')
    script.id = 'google-maps-sdk'
    document.body.appendChild(script)
    act(() => { vi.advanceTimersByTime(GOOGLE_MAPS_FAILURE_TIMEOUT_MS) })
    expect(result.current).toBe(false)
    act(() => { vi.advanceTimersByTime(GOOGLE_MAPS_FAILURE_TIMEOUT_MS) })
    expect(result.current).toBe(true)
    document.body.removeChild(script)
  })

  it('never times out while no map has loaded the SDK (static maps only)', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useGoogleMapsFailed('test-google-key'))
    act(() => { vi.advanceTimersByTime(GOOGLE_MAPS_FAILURE_TIMEOUT_MS * 5) })
    expect(result.current).toBe(false)
  })

  it('does not fail from the timeout once google.maps is ready, but a later gm_authFailure still counts', () => {
    vi.useFakeTimers()
    window.google = { maps: {} }
    const { result } = renderHook(() => useGoogleMapsFailed('test-google-key'))
    act(() => { vi.advanceTimersByTime(GOOGLE_MAPS_FAILURE_TIMEOUT_MS) })
    expect(result.current).toBe(false)
    act(() => { window.gm_authFailure() })
    expect(result.current).toBe(true)
  })

  it('fails when the #google-maps-sdk script errors', () => {
    const script = document.createElement('script')
    script.id = 'google-maps-sdk'
    document.body.appendChild(script)
    const { result } = renderHook(() => useGoogleMapsFailed('test-google-key'))
    act(() => { script.dispatchEvent(new Event('error')) })
    expect(result.current).toBe(true)
    document.body.removeChild(script)
  })

  it('a failure already seen by another map fails a map that mounts afterwards', () => {
    const { result: first } = renderHook(() => useGoogleMapsFailed('test-google-key'))
    act(() => { window.gm_authFailure() })
    expect(first.current).toBe(true)
    const { result: second } = renderHook(() => useGoogleMapsFailed('test-google-key'))
    expect(second.current).toBe(true)
  })
})
