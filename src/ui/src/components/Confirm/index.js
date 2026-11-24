import React, { useState } from 'react'
import { useTheme } from 'styled-components'
import loadable from '@loadable/component'

// The dialog (Base UI's, ~20 kB gzip) loads when the first alert opens: Confirm is in the entry chunk
// (src/index.js, App.js), the dialog is not (implementation notes, implementation notes).
const ConfirmDialog = loadable(() => import('./ConfirmDialog'))

/**
 * An alert or a confirmation (see ConfirmDialog for its props). Nothing is drawn, or loaded,
 * until it first opens; then it stays mounted, so it can leave with its motion.
 */
export const Confirm = (props) => {
  const theme = useTheme()
  const [used, setUsed] = useState(false)
  // adjusted while rendering (not in an effect): the dialog mounts in the same pass it opens
  if (props.open && !used) setUsed(true)
  // the theme loads before the first alert: nothing to draw without it (as the legacy one)
  return theme && used ? <ConfirmDialog {...props} /> : null
}

export const Alert = Confirm

export default Confirm
