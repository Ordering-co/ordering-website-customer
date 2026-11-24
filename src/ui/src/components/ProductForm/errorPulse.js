// The error pulse of a required group (WrapHeader in ProductOption/styles.js
// runs it while its option has this attribute)
export const PULSE_ATTRIBUTE = 'data-just-snapped'

/**
 * Starts the pulse on `target` again: the attribute comes off, the browser
 * lays the element out (so the animation restarts, a repeated attribute would
 * not), and it goes back on for `ms`, the animation's own duration. One timer
 * per target in `timers` (a Map), cancelled whenever it restarts, so an old
 * click never cuts the new pulse. With `ms` 0 (no motion) there is no pulse.
 */
export const restartErrorPulse = (target, timers, ms) => {
  clearTimeout(timers.get(target))
  timers.delete(target)
  target.removeAttribute(PULSE_ATTRIBUTE)
  if (!(ms > 0)) return
  void target.offsetWidth
  target.setAttribute(PULSE_ATTRIBUTE, 'true')
  timers.set(target, setTimeout(() => {
    target.removeAttribute(PULSE_ATTRIBUTE)
    timers.delete(target)
  }, ms))
}
