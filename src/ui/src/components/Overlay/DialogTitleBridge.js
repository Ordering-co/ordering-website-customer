import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import { DialogHeader, DialogTitle } from '~ui/src/design-system/components/Dialog'
import { ModalTitleContext } from './ModalHeading'
import { modalTitleLevel } from './titleLevel'

/**
 * The title row of a base Dialog whose content hands it its title (`ModalHeading`), as the legacy
 * Modal does: the last title mounted is the `DialogTitle` (the dialog's name; the close
 * sits at its end), at the modal title's heading level; with none, no row. `title`, the caller's own,
 * wins over the content's. Inside a `DialogContent` (or `SheetContent`).
 */
export const DialogTitleBridge = ({ title, children }) => {
  const theme = useTheme()
  const next = useRef(0)
  const [titles, setTitles] = useState([])
  const register = useCallback((content) => {
    next.current += 1
    const id = next.current
    setTitles((list) => [...list, { id, content }])
    return id
  }, [])
  const unregister = useCallback((id) => setTitles((list) => list.filter((item) => item.id !== id)), [])
  const value = useMemo(() => ({ register, unregister }), [register, unregister])
  const shown = title || titles[titles.length - 1]?.content
  const Level = modalTitleLevel(theme)
  return (
    <>
      {shown && <DialogHeader><DialogTitle render={<Level />}>{shown}</DialogTitle></DialogHeader>}
      <ModalTitleContext.Provider value={value}>{children}</ModalTitleContext.Provider>
    </>
  )
}
