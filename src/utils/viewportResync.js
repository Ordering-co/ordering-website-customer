// implementation notes / implementation notesChrome for iOS sometimes keeps the layout viewport at the size of the previous
// orientation after the window turns or the foldable (iPhone Duo) opens its inner screen. Measured on that device
// with the ?viewport_debug=1 overlay: window.innerWidth/innerHeight and visualViewport update (669x749) but
// document.documentElement.clientWidth/clientHeight stay at 871x547, the `100vw` probe reads 871, the header is 871
// wide and matchMedia('(orientation: portrait)') is false: the content is cut off on the right. In the original report
// it was the other way round (layout ~670 inside a ~870 window), and the fixed bottom bars sat ~630px above the edge
// (same stale layout height). Safari iOS recalculates every state; it is a browser bug, not our CSS.
//
// Mitigation: on resize / orientationchange / visualViewport resize / pageshow, and again 300ms and 1000ms later,
// compare the window width with the layout viewport's. If they differ by more than 2px (and the page is not pinch-zoomed)
// nudge the browser to recalculate, measuring after each step and stopping as soon as they match:
//   1. rewrite the meta viewport (content + ", maximum-scale=10") and restore the exact original on the next frame
//   2. force a reflow of <html> (display none, read offsetHeight, restore)
// At most one cycle per window size (no loops). Guards: touch screens only (pointer: coarse), never while
// html[data-keyboard-open] or html[data-text-entry] (heights differ on purpose with the keyboard up), never without window.
export const TOLERANCE = 2
export const RETRY_DELAYS = [300, 1000]
const KEYBOARD_ATTRIBUTES = ['data-keyboard-open', 'data-text-entry']
const META_NUDGE = ', maximum-scale=10'

let installed = false

export const installViewportResync = ({ win = typeof window === 'undefined' ? undefined : window } = {}) => {
  if (!win || installed) return undefined
  const doc = win.document
  const root = doc?.documentElement
  if (!root || typeof win.matchMedia !== 'function' || !win.matchMedia('(pointer: coarse)').matches) return undefined
  installed = true

  const visual = win.visualViewport
  const raf = (fn) => (win.requestAnimationFrame ? win.requestAnimationFrame(fn) : win.setTimeout(fn, 16))
  // Width only: in Safari iOS innerHeight grows when the toolbar collapses on scroll while clientHeight does not, so a
  // height test would fire on every scroll for every iPhone. The Chrome bug always shows in the width (871 vs 669);
  // the repair recalculates the whole layout viewport, height included (the floating bars of implementation notes).
  const mismatch = () => Math.abs(win.innerWidth - root.clientWidth) > TOLERANCE
  const blocked = () => KEYBOARD_ATTRIBUTES.some((name) => root.hasAttribute(name)) || (visual && Math.abs(visual.scale - 1) > 0.01)

  let timers = []
  let busy = false
  let attempted = '' // window size of the last cycle: the same size is never repaired twice

  const reflow = () => {
    const display = root.style.display
    root.style.display = 'none'
    void root.offsetHeight
    root.style.display = display
  }

  const repair = () => {
    const key = `${win.innerWidth}x${win.innerHeight}`
    if (busy || key === attempted) return
    attempted = key
    const meta = doc.querySelector('meta[name="viewport"]')
    if (!meta) { reflow(); return }
    busy = true
    const original = meta.getAttribute('content') || ''
    meta.setAttribute('content', `${original}${META_NUDGE}`)
    raf(() => {
      meta.setAttribute('content', original)
      raf(() => {
        busy = false
        if (mismatch() && !blocked()) reflow()
      })
    })
  }

  const check = () => {
    if (blocked()) return
    if (!mismatch()) { attempted = ''; return }
    repair()
  }

  const schedule = () => {
    timers.forEach((id) => win.clearTimeout(id))
    check()
    timers = RETRY_DELAYS.map((ms) => win.setTimeout(check, ms))
  }

  win.addEventListener('resize', schedule)
  win.addEventListener('orientationchange', schedule)
  win.addEventListener('pageshow', schedule)
  visual?.addEventListener('resize', schedule)

  return () => {
    installed = false
    timers.forEach((id) => win.clearTimeout(id))
    win.removeEventListener('resize', schedule)
    win.removeEventListener('orientationchange', schedule)
    win.removeEventListener('pageshow', schedule)
    visual?.removeEventListener('resize', schedule)
  }
}
