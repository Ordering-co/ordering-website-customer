import React, { useState } from 'react'
import loadable from '@loadable/component'

// Base UI's dialog and drawer (~20 to 30 kB gzip) load on the first opening: a screen of the
// entry chunk (App, the header, the selects) opens them, and they are not in it (implementation notes, implementation notes).
const DialogOverlay = loadable(() => import('./overlays').then((m) => m.DialogOverlay))
const SheetOverlay = loadable(() => import('./overlays').then((m) => m.SheetOverlay))

// nothing drawn, or loaded, until it first opens; then mounted, so it can leave with its motion
const useOpened = (open) => {
  const [opened, setOpened] = useState(false)
  // adjusted while rendering (not in an effect): it mounts in the same pass it opens
  if (open && !opened) setOpened(true)
  return opened
}

/** The DialogOverlay (see overlays.js), loaded when it first opens. */
export const LazyDialog = (props) => (useOpened(props.open) ? <DialogOverlay {...props} /> : null)

/** The SheetOverlay (see overlays.js), loaded when it first opens. */
export const LazySheet = (props) => (useOpened(props.open) ? <SheetOverlay {...props} /> : null)
