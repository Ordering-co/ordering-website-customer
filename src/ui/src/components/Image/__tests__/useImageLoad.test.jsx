import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { IMAGE_LOAD_TIMEOUT_MS, resetImageLoadCache, useImageLoad, withRetryParam } from '../useImageLoad'

// A downloader we drive by hand: each `new Image()` is recorded, and a test
// decides when (and whether) it loads or fails.
const made = []
class FakeImage {
  constructor () {
    this.naturalWidth = 0
    this.requested = []
    this.decode = vi.fn(() => Promise.resolve())
    made.push(this)
  }

  set src (value) { this.requested.push(value) }
  get src () { return this.requested.at(-1) ?? '' }
  // what the browser does when the picture arrives
  arrive (width = 86) { this.naturalWidth = width; return this.onload?.() }
  fail () { return this.onerror?.() }
}

const flush = () => act(async () => { await Promise.resolve() })

beforeEach(() => {
  made.length = 0
  resetImageLoadCache()
  vi.useFakeTimers()
  vi.stubGlobal('Image', FakeImage)
  window.Image = FakeImage
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const URL_A = 'https://img.example.com/h_86,c_limit/burger.jpg'

describe('useImageLoad', () => {
  it('loads: loading while it downloads, loaded once it arrives and decodes', async () => {
    const { result } = renderHook(() => useImageLoad(URL_A))
    expect(result.current).toMatchObject({ status: 'loading', url: URL_A })
    expect(made).toHaveLength(1)
    expect(made[0].decoding).toBe('async')
    expect(made[0].requested).toEqual([URL_A])
    act(() => { made[0].arrive() })
    await flush()
    expect(made[0].decode).toHaveBeenCalledTimes(1)
    expect(result.current).toMatchObject({ status: 'loaded', url: URL_A, src: URL_A })
  })

  it('a picture that decodes with an error but has its size is loaded; with no size it is not', async () => {
    const { result } = renderHook(() => useImageLoad(URL_A))
    made[0].decode = vi.fn(() => Promise.reject(new Error('decode')))
    act(() => { made[0].arrive(86) })
    await flush()
    expect(result.current.status).toBe('loaded')

    const second = renderHook(() => useImageLoad('https://img.example.com/other.jpg'))
    made[1].decode = vi.fn(() => Promise.reject(new Error('decode')))
    act(() => { made[1].arrive(0) })
    await flush()
    // size 0: counts as a failure, one retry follows
    expect(second.result.current.status).toBe('loading')
    expect(made).toHaveLength(3)
  })

  it('works where decode does not exist', async () => {
    const { result } = renderHook(() => useImageLoad(URL_A))
    made[0].decode = undefined
    act(() => { made[0].arrive() })
    await flush()
    expect(result.current.status).toBe('loaded')
  })

  it('error, then the retry loads: loaded, from the retry URL', async () => {
    const { result } = renderHook(() => useImageLoad(URL_A))
    act(() => { made[0].fail() })
    expect(result.current.status).toBe('loading')
    expect(made).toHaveLength(2)
    expect(made[1].requested).toEqual([withRetryParam(URL_A)])
    act(() => { made[1].arrive() })
    await flush()
    expect(result.current).toMatchObject({ status: 'loaded', url: withRetryParam(URL_A), src: URL_A })
  })

  it('error, then the retry fails too: error (and no third attempt)', () => {
    const { result } = renderHook(() => useImageLoad(URL_A))
    act(() => { made[0].fail() })
    act(() => { made[1].fail() })
    expect(result.current.status).toBe('error')
    expect(made).toHaveLength(2)
  })

  it('a picture that stalls: it times out, the retry stalls too, then error', () => {
    const { result } = renderHook(() => useImageLoad(URL_A))
    act(() => { vi.advanceTimersByTime(IMAGE_LOAD_TIMEOUT_MS - 1) })
    expect(result.current.status).toBe('loading')
    expect(made).toHaveLength(1)
    act(() => { vi.advanceTimersByTime(1) })
    // the stalled download is dropped, its late answer is ignored
    expect(made[0].requested.at(-1)).toBe('')
    expect(made).toHaveLength(2)
    expect(result.current.status).toBe('loading')
    act(() => { vi.advanceTimersByTime(IMAGE_LOAD_TIMEOUT_MS) })
    expect(result.current.status).toBe('error')
    expect(made).toHaveLength(2)
  })

  it('a stalled attempt that arrives after the retry started does not decide', async () => {
    const { result } = renderHook(() => useImageLoad(URL_A))
    const first = made[0]
    act(() => { vi.advanceTimersByTime(IMAGE_LOAD_TIMEOUT_MS) })
    expect(first.onload).toBeNull()
    expect(result.current.status).toBe('loading')
    act(() => { made[1].arrive() })
    await flush()
    expect(result.current.status).toBe('loaded')
  })

  it('a slow decode counts inside the time limit', async () => {
    const { result } = renderHook(() => useImageLoad(URL_A))
    made[0].decode = vi.fn(() => new Promise(() => {}))
    act(() => { made[0].arrive() })
    await flush()
    expect(result.current.status).toBe('loading')
    act(() => { vi.advanceTimersByTime(IMAGE_LOAD_TIMEOUT_MS) })
    expect(made).toHaveLength(2)
  })

  it('no src: error at once, nothing downloaded', () => {
    for (const src of [undefined, null, '', false]) {
      const { result } = renderHook(() => useImageLoad(src))
      expect(result.current.status).toBe('error')
    }
    expect(made).toHaveLength(0)
  })

  it('a new src starts over (never the old picture\'s state), the old download is dropped', async () => {
    const { result, rerender } = renderHook(({ src }) => useImageLoad(src), { initialProps: { src: URL_A } })
    act(() => { made[0].arrive() })
    await flush()
    expect(result.current.status).toBe('loaded')
    rerender({ src: 'https://img.example.com/other.jpg' })
    expect(result.current).toMatchObject({ status: 'loading', url: 'https://img.example.com/other.jpg' })
    rerender({ src: undefined })
    expect(result.current.status).toBe('error')
    // and back to the first: it loaded before, so it is there at once
    rerender({ src: URL_A })
    expect(result.current.status).toBe('loaded')
  })

  it('a picture that loaded before is loaded from the first render, with no download', async () => {
    const first = renderHook(() => useImageLoad(URL_A))
    act(() => { made[0].arrive() })
    await flush()
    first.unmount()
    made.length = 0
    const { result } = renderHook(() => useImageLoad(URL_A))
    expect(result.current.status).toBe('loaded')
    expect(made).toHaveLength(0)
  })

  it('unmounting drops the download and its timer: no answer afterwards touches the state', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warns = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { unmount } = renderHook(() => useImageLoad(URL_A))
    const image = made[0]
    unmount()
    expect(image.onload).toBeNull()
    expect(image.onerror).toBeNull()
    expect(image.requested.at(-1)).toBe('')
    expect(vi.getTimerCount()).toBe(0)
    await act(async () => { vi.advanceTimersByTime(IMAGE_LOAD_TIMEOUT_MS * 3) })
    expect(made).toHaveLength(1)
    expect(errors).not.toHaveBeenCalled()
    expect(warns).not.toHaveBeenCalled()
  })

  it('unmounting while the decode runs does not set state', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = renderHook(() => useImageLoad(URL_A))
    let finish
    made[0].decode = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    act(() => { made[0].arrive() })
    unmount()
    await act(async () => { finish() })
    expect(errors).not.toHaveBeenCalled()
  })
})

describe('withRetryParam', () => {
  it('adds the parameter after the query the URL has, before its hash', () => {
    expect(withRetryParam('https://a.test/p.jpg')).toBe('https://a.test/p.jpg?img_retry=1')
    expect(withRetryParam('https://a.test/p.jpg?w=86')).toBe('https://a.test/p.jpg?w=86&img_retry=1')
    expect(withRetryParam('https://a.test/p.jpg#x')).toBe('https://a.test/p.jpg?img_retry=1#x')
  })

  it('leaves a data: or blob: URL as it is', () => {
    expect(withRetryParam('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA')
    expect(withRetryParam('blob:https://a.test/1234')).toBe('blob:https://a.test/1234')
  })
})
