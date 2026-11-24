import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { detectStorePrivate, resetStorePreview } from '../storePreview'
import { useStorePrivate } from '../useStorePrivate'

describe('useStorePrivate', () => {
  beforeEach(() => resetStorePreview())

  it('turns true when the API answers 403 STORE_PRIVATE', () => {
    const { result } = renderHook(() => useStorePrivate())
    expect(result.current).toBe(false)

    act(() => detectStorePrivate(403, '{"error":true,"result":["STORE_PRIVATE"]}'))
    expect(result.current).toBe(true)
  })
})
