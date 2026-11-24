import { useEffect, useState } from 'react'

/**
 * How long something must keep loading before a small indicator is worth
 * showing. It is how long a response still feels immediate, not a design
 * value: a save that answers sooner shows nothing instead of a flash.
 */
export const INDICATOR_DELAY_MS = 350

/**
 * `flag`, but only once it has been true for `delay` ms without a break.
 * It turns false as soon as `flag` does, and a flag that stays true (a save
 * that a new keystroke chains to the next one) does not restart the wait.
 */
export const useDelayedFlag = (flag, delay = INDICATOR_DELAY_MS) => {
  const [elapsed, setElapsed] = useState(false)

  useEffect(() => {
    if (!flag) {
      setElapsed(false)
      return undefined
    }
    const timer = setTimeout(() => setElapsed(true), delay)
    return () => clearTimeout(timer)
  }, [flag, delay])

  // `flag &&`: the render in which it turns false must already be false
  return Boolean(flag) && elapsed
}
