import { useEffect, useState } from 'react'
import { watchBehindHeader } from './behindHeader'

// With a fixed header the bar docked under it (OrderContextUI
// isDocked, below 1024px) scrolls away with the page; once it is out of view
// (behind the header) the header's row shows a chip with its summary. The bar
// reports it on `window`, the header listens: they are different trees.
export const ORDER_CONTEXT_DOCK_EVENT = 'order-context-dock-out'

// The last report: a header that mounts after the bar starts from it
let dockOut = false

const report = (out) => {
  if (dockOut === out) return
  dockOut = out
  window.dispatchEvent(new CustomEvent(ORDER_CONTEXT_DOCK_EVENT, { detail: { out } }))
}

/**
 * Reports whether `node` (the docked bar) is out of view behind the header
 * (see watchBehindHeader). Reports "in view" when disabled or unmounted.
 */
export const useReportDockOut = (node, enabled) => {
  useEffect(() => {
    if (!enabled || !node) return undefined
    const stop = watchBehindHeader(node, report)
    return () => {
      stop()
      report(false)
    }
  }, [node, enabled])
}

/** Whether the docked bar is out of view (what `useReportDockOut` reported last). */
export const useDockOut = () => {
  const [out, setOut] = useState(dockOut)
  useEffect(() => {
    const listener = (event) => setOut(event.detail.out)
    window.addEventListener(ORDER_CONTEXT_DOCK_EVENT, listener)
    setOut(dockOut)
    return () => window.removeEventListener(ORDER_CONTEXT_DOCK_EVENT, listener)
  }, [])
  return out
}
