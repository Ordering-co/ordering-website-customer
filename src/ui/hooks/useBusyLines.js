import { useCallback, useState } from 'react'

/**
 * The cart's lines (a product's `code`) that a request is changing right now.
 *
 * `track(code, work)` marks the line, awaits `work()` and unmarks it when it
 * ends, however it ends (an answer, an error). A line can be marked by more
 * than one request at a time (two quick taps on +): it stays marked until the
 * last one ends. `codes` is the list of marked lines, in the order they began.
 */
export const useBusyLines = () => {
  const [codes, setCodes] = useState([])

  const track = useCallback(async (code, work) => {
    setCodes((previous) => [...previous, code])
    try {
      return await work()
    } finally {
      setCodes((previous) => {
        const index = previous.indexOf(code)
        return index < 0 ? previous : [...previous.slice(0, index), ...previous.slice(index + 1)]
      })
    }
  }, [])

  return { codes, track }
}
