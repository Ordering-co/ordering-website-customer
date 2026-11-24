import React, { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent } from '~ui/src/design-system/components/Dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~ui/src/design-system/components/Sheet'
import { DialogTitleBridge } from './DialogTitleBridge'
import { useModalLayer } from './useModalLayer'

// Base UI plays the entrance only when `open` turns true after mounting: a layer mounted
// already open (it loads on its first opening, see lazyOverlay) opens from its first effect.
// The legacy Modal's width for a screen that kept its own: from its desktop cut (769px)
// no wider than half the screen, under it the whole width. No design decision: main's look; not a theme value.
const LEGACY_DESKTOP = 769
const legacyWidth = (width, viewport) => {
  if (typeof width !== 'string' || viewport == null) return width
  return viewport >= LEGACY_DESKTOP ? `min(${width}, 50vw)` : '100%'
}

// The window's width while `active` (an open dialog of a legacy width), not a listener per closed dialog
const useViewport = (active) => {
  const [viewport, setViewport] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : undefined))
  useEffect(() => {
    if (!active) return undefined
    const update = () => setViewport(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [active])
  return viewport
}

const useShown = (open) => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return !!open && mounted
}

/**
 * A controlled base Dialog (`open`, `onClose`) among the legacy modals (useModalLayer): its
 * `title`, or the one its content hands (ModalHeading), is its title row. The rest is
 * DialogContent's (`size`, `width`, `phone`, `showCloseButton`, `aria-*`, `data-*`).
 * `closeOnBackdrop` false: a press outside does not close it. `onRemove`: what its close button
 * calls instead of `onClose` (the legacy `authModal`; without `onClose`, only the close closes it).
 * `flush`: a body without padding (the legacy `padding='0'`). `legacyMaxWidth`: a screen moved from the
 * legacy Modal with a width of its own (a string) keeps main's: half the screen at most from 769px, the whole width under it.
 */
export const DialogOverlay = ({ open, onClose, onRemove, title, closeOnBackdrop = true, legacyMaxWidth = false, width, children, ...content }) => {
  const body = useRef(null)
  const shown = useShown(open)
  const viewport = useViewport(legacyMaxWidth && !!open)
  const handleOpenChange = useModalLayer({ shown, contentRef: body, onClose, onRemove })
  return (
    <Dialog open={shown} onOpenChange={handleOpenChange} disablePointerDismissal={!closeOnBackdrop}>
      <DialogContent {...content} width={legacyMaxWidth ? legacyWidth(width, viewport) : width}>
        <DialogTitleBridge title={title}>
          <div ref={body}>{children}</div>
        </DialogTitleBridge>
      </DialogContent>
    </Dialog>
  )
}

/**
 * A controlled base Sheet (`open`, `onClose`) among the legacy modals (useModalLayer), its `title`
 * the row over its content; its clicks do not reach the tree above. The rest
 * is SheetContent's (`side`, default `bottom`; `initialFocus`, `aria-*`, `data-*`).
 */
export const SheetOverlay = ({ open, onClose, title, children, side = 'bottom', ...content }) => {
  const body = useRef(null)
  const shown = useShown(open)
  const handleOpenChange = useModalLayer({ shown, contentRef: body, onClose })
  return (
    // Its clicks stay in it, the backdrop's and the close's too: React takes the events of a portal up
    // the tree that rendered it (a select in a clickable row), as the legacy BottomSheet stopped them.
    // `display: contents`: a box of no size of its own (the sheet is in the portal).
    <div style={{ display: 'contents' }} onClick={(e) => e.stopPropagation()}>
      <Sheet open={shown} onOpenChange={handleOpenChange}>
        <SheetContent side={side} {...content}>
          {title && <SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>}
          <div ref={body}>{children}</div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
