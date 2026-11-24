import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useBusyLines } from '../useBusyLines'

const deferred = () => {
  const settle = {}
  const promise = new Promise((resolve, reject) => { settle.resolve = resolve; settle.reject = reject })
  return { promise, ...settle }
}

describe('useBusyLines', () => {
  it('marks a line while its work runs and gives back its result', async () => {
    const { result } = renderHook(() => useBusyLines())
    expect(result.current.codes).toEqual([])
    const work = deferred()
    let outcome
    act(() => { outcome = result.current.track('A', () => work.promise) })
    expect(result.current.codes).toEqual(['A'])
    await act(async () => { work.resolve('done') })
    expect(await outcome).toBe('done')
    expect(result.current.codes).toEqual([])
  })

  it('two works on one line keep it marked until the last ends; other lines are independent', async () => {
    const { result } = renderHook(() => useBusyLines())
    const first = deferred()
    const second = deferred()
    const other = deferred()
    act(() => {
      result.current.track('A', () => first.promise)
      result.current.track('A', () => second.promise)
      result.current.track('B', () => other.promise)
    })
    expect(result.current.codes).toEqual(['A', 'A', 'B'])
    await act(async () => { first.resolve() })
    expect(result.current.codes).toEqual(['A', 'B'])
    await act(async () => { other.resolve() })
    expect(result.current.codes).toEqual(['A'])
    await act(async () => { second.resolve() })
    expect(result.current.codes).toEqual([])
  })

  it('a work that fails frees the line and passes its error on', async () => {
    const { result } = renderHook(() => useBusyLines())
    const work = deferred()
    let outcome
    act(() => { outcome = result.current.track('A', () => work.promise) })
    const caught = outcome.catch((error) => error.message)
    await act(async () => { work.reject(new Error('network')) })
    expect(await caught).toBe('network')
    expect(result.current.codes).toEqual([])
  })
})
