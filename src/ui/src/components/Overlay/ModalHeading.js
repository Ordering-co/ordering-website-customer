import React, { createContext, useContext, useLayoutEffect, useRef } from 'react'

/**
 * A modal with a close lets the content hand it its title, so
 * the title and the close share one row (see Modal). Null elsewhere.
 */
export const ModalTitleContext = createContext(null)

/**
 * The title of a content that can open in a modal. Inside a modal it goes
 * to the modal's title row and renders nothing here; elsewhere (a page) it
 * renders `as` with its props. Its children are
 * the title text (a string), what the modal row shows.
 */
export const ModalHeading = ({ as: Tag = 'h2', children, ...rest }) => {
  const modalTitle = useContext(ModalTitleContext)
  const id = useRef(null)

  // before paint: the close does not jump from its corner to the row
  useLayoutEffect(() => {
    if (!modalTitle) return
    id.current = modalTitle.register(children)
    return () => modalTitle.unregister(id.current)
  }, [modalTitle, children])

  if (modalTitle) return null
  return <Tag {...rest}>{children}</Tag>
}
