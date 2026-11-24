import React, { useEffect, useRef, useState } from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { getTraduction } from '~ui/utils'
import { Button } from '~ui/src/design-system/components/Button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~ui/src/design-system/components/Dialog'
import { useModalLayer } from '~ui/src/components/Overlay/useModalLayer'
import { PopupContent } from './styles'

// A list item is a text or the API's { code, message }; one with no text is not shown
const itemText = (item) => {
  const raw = typeof item === 'string' ? item : item?.message
  return typeof raw === 'string' && raw.trim() ? getTraduction(raw) : null
}

/**
 * An alert or a confirmation: the base Dialog, a centered card of the modal's
 * `sm` size also on a phone. `title` names it (the close sits at the title's end; without a
 * title the close alone). `content`: a text, or a list of texts (translated) followed by
 * `links`; then `children`. `onCancel` / `onAccept` add their actions (`cancelText`,
 * `acceptText`). Escape, the close and a press outside (unless `closeOnBackdrop` is false)
 * call `onClose`. Opened over a legacy Modal it is on the legacy stack (Escape is its own);
 * opened from inside a Dialog it is nested in it. An open alert whose `content` (given, not
 * `undefined`) has no text to show, and no children, says `fallbackContent` or the generic
 * error (implementation notesit was an empty bullet, or only a title).
 */
export const ConfirmDialog = (props) => {
  const {
    open,
    title,
    children,
    content,
    links,
    fallbackContent,
    onAccept,
    onCancel,
    onClose,
    acceptText,
    cancelText,
    closeOnBackdrop = true
  } = props
  const [, t] = useLanguage()
  const body = useRef(null)
  // Base UI plays the entrance only when `open` turns true after mounting: an alert mounted
  // already open opens from its first effect
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const shown = !!open && mounted
  // a text, a list of them, or one { code, message }
  const text = typeof content === 'string' && content.trim() ? content : null
  const items = Array.isArray(content)
    ? content.map(itemText).filter(Boolean)
    : content && typeof content === 'object' ? [itemText(content)].filter(Boolean) : null
  const showsList = items?.length > 0 || (items && links?.length > 0)
  // implementation notescontent was given and there is nothing to read in it (nor children): an alert is never only a title
  const isEmpty = content !== undefined && !text && !showsList && React.Children.toArray(children).length === 0
  const handleOpenChange = useModalLayer({ shown, contentRef: body, onClose })

  return (
    <Dialog open={shown} onOpenChange={handleOpenChange} disablePointerDismissal={!closeOnBackdrop}>
      <DialogContent size='sm' phone='center' data-doc-section={props['data-doc-section']}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        <PopupContent ref={body}>
          {text}
          {shown && isEmpty && (fallbackContent ?? t('ALERT_GENERIC_ERROR', 'Something went wrong. Please try again.'))}
          {showsList && (
            <ul>
              {items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
              {links?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
          {children}
        </PopupContent>
        {/* no empty row of actions (only a close) under the content */}
        {(onCancel || onAccept) && (
          <DialogFooter>
            {onCancel && <Button color='neutral' appearance='outline' size='md' onClick={() => onCancel()}>{cancelText || t('CANCEL', 'Cancel')}</Button>}
            {onAccept && <Button size='md' onClick={() => onAccept()}>{acceptText || t('ACCEPT', 'Accept')}</Button>}
          </DialogFooter>)}
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDialog
