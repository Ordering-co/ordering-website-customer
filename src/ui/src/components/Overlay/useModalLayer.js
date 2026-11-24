import { useEffect, useRef } from 'react'
import { isTopModal, pushOpenModal, removeOpenModal } from './modalStack'

// What a press on another layer is not for this one: the legacy modals (`#app-modals`).
const LEGACY_LAYERS = '#app-modals'
const LEGACY_MODAL_OPEN = '#app-modals .popup-component'
const LEGACY_ROOT_ID = 'app-modals'

/**
 * A base Dialog or Sheet among the legacy modals, as ProductModal does. The legacy
 * Modal is retired; the shared stack still orders the base layers and ProductModal, and the
 * `#app-modals` branches stay for a legacy Popup root (none is rendered today: removable later).
 * while `shown` it is on the legacy stack (`modalStack`), so a legacy modal under it does
 * not take Escape; a legacy modal opened over it keeps its own Escape and presses, and stays
 * readable (Base UI hides from assistive technology what is added to the body while it is open).
 * `contentRef`: an element inside the popup. Returns the `onOpenChange` for the Root, which
 * calls `onClose` when the dialog itself is dismissed; `onRemove`, when given, instead of it
 * for its close button (the legacy `authModal`: Escape and a press outside still call `onClose`).
 */
export const useModalLayer = ({ shown, contentRef, onClose, onRemove }) => {
  const stackKey = useRef({})

  useEffect(() => {
    if (!shown) return undefined
    const key = stackKey.current
    pushOpenModal(key)
    return () => removeOpenModal(key)
  }, [shown])

  useEffect(() => {
    if (!shown) return undefined
    const observer = new MutationObserver((records) => records.forEach(({ addedNodes }) => addedNodes.forEach((node) => {
      if (node.id !== LEGACY_ROOT_ID) return
      node.removeAttribute('aria-hidden')
      node.removeAttribute('data-base-ui-inert')
    })))
    observer.observe(document.body, { childList: true })
    return () => observer.disconnect()
  }, [shown])

  // a legacy modal over this one: opened after it (top of the stack) or, one that does not
  // register there, one that follows its portal in the DOM
  const legacyOver = () => {
    if (!isTopModal(stackKey.current)) return true
    const portal = contentRef?.current?.closest('[data-base-ui-portal]')
    return !!portal && Array.from(document.querySelectorAll(LEGACY_MODAL_OPEN))
      .some((popup) => portal.compareDocumentPosition(popup) & Node.DOCUMENT_POSITION_FOLLOWING)
  }

  return (next, details) => {
    if (next) return
    const target = details?.event?.target
    const overLegacy = (details?.reason === 'outside-press' && target instanceof Element && target.closest(LEGACY_LAYERS)) ||
      (details?.reason === 'escape-key' && legacyOver())
    if (overLegacy) {
      details.cancel()
      details.allowPropagation?.()
      return
    }
    if (onRemove && details?.reason === 'close-press') onRemove()
    else onClose?.()
  }
}
