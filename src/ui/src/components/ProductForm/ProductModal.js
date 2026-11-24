import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import { useLanguage } from '~components/contexts/LanguageContext'
import { themeValue } from '~/utils/themeTokens'
import { platformOfWidth } from '~/utils/themeVisibility'
import { Dialog, DialogContent } from '~ui/src/design-system/components/Dialog'
import { Sheet, SheetContent } from '~ui/src/design-system/components/Sheet'
import { isTopModal, pushOpenModal, removeOpenModal } from '~ui/src/components/Overlay/modalStack'
import { PRODUCT_NAME_ID, productModalLayout } from './productModalSettings'
import { ProductModalFlush } from './styles'

// What a press or a key on another layer is not for this one: a legacy Popup root (`#app-modals`;
// the legacy Modal is retired, implementation notesthe forms opened from the product are base Dialogs nested
// in this one, and Base UI gives them their own Escape and press) and
// AddToAny's own panels (appended to the body by its script, their classes `a2a_*`).
// shortcut: the AddToAny classes are its script's, not checked against a live panel; check them in a browser.
const OTHER_LAYERS = '#app-modals, [class*="a2a_"]'
const LEGACY_MODAL_OPEN = '#app-modals .popup-component'
const LEGACY_ROOT_ID = 'app-modals'

/**
 * The window of a product (its form, or its loading and not-found states), by
 * `components.product_modal.base.layout`: `card`, `showcase` and `sheet` use a
 * bottom sheet on phones and a centered dialog on wider screens. `steps` is a panel from the
 * right (full screen on a phone). Its close is the `product_modal.slots.close`
 * button at the top end; Escape, a press outside and the close call `onClose`.
 *
 * `width`: a number is the theme's (px), a string a CSS width (the theme's
 * `product_modal.base.width` without one). `hideCloseDefault`: no close button
 * (the screen closes it). `dataDocSection`: the marker of the window.
 * The window is named by the product's name (PRODUCT_NAME_ID); the label is
 * for what has no name yet (loading, not found).
 */
export const ProductModal = ({ open = true, onClose, width, hideCloseDefault, dataDocSection, contentRef, children }) => {
  const theme = useTheme()
  const [, t] = useLanguage()
  const layout = productModalLayout(theme)
  const steps = layout === 'steps'
  // Decided once, not on resize: another root type remounts the children and would wipe the customer's selections.
  const [phone] = useState(() => typeof window !== 'undefined' && platformOfWidth(window.innerWidth) === 'mobile_web')
  // a phone's sheet layout is a bottom sheet with the drag to close; a wide screen's is the dialog
  const drawer = steps || phone
  const Root = drawer ? Sheet : Dialog
  const Content = drawer ? SheetContent : DialogContent

  // The callers mount this already open, and Base UI only plays the entrance (data-starting-style:
  // the overlay's fade, the sheet's and the panel's slide) when `open` turns true after mounting:
  // it opens right after, from the first effect.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // The legacy modals keep a stack (Escape is the top one's, `isTopModal`): while this is open it is on it, so a legacy
  // modal under it (the upselling, opened from the cart) does not take the key; one opened over it is above.
  const stackKey = useRef({})
  const internalContent = useRef(null)
  const content = contentRef ?? internalContent
  const shown = open && mounted
  useEffect(() => {
    if (!shown) return undefined
    const key = stackKey.current
    pushOpenModal(key)
    return () => removeOpenModal(key)
  }, [shown])

  // Whether a legacy modal is over this window: one opened after it (on top of the stack) or, for one that does not
  // register there, one that follows its portal in the DOM. A legacy root that was there before is under it.
  const legacyOver = () => {
    if (!isTopModal(stackKey.current)) return true
    const portal = content.current?.closest('[data-base-ui-portal]')
    return !!portal && Array.from(document.querySelectorAll(LEGACY_MODAL_OPEN))
      .some((popup) => portal.compareDocumentPosition(popup) & Node.DOCUMENT_POSITION_FOLLOWING)
  }

  // Base UI hides from assistive technology whatever is added to the body while its dialog is
  // open, `#app-modals` too: the legacy modals opened over this one (the address list's form, the
  // student's) must stay readable. A root that was there before this opened is under it: it stays hidden.
  useEffect(() => {
    const observer = new MutationObserver((records) => records.forEach(({ addedNodes }) => addedNodes.forEach((node) => {
      if (node.id !== LEGACY_ROOT_ID) return
      node.removeAttribute('aria-hidden')
      node.removeAttribute('data-base-ui-inert')
    })))
    observer.observe(document.body, { childList: true })
    return () => observer.disconnect()
  }, [])

  const handleOpenChange = (next, details) => {
    if (next) return
    const target = details?.event?.target
    // a layer over this one owns its presses and its Escape (it closes itself: the key goes on to it)
    const overLegacy = (details?.reason === 'outside-press' && target instanceof Element && target.closest(OTHER_LAYERS)) ||
      (details?.reason === 'escape-key' && legacyOver())
    if (overLegacy) {
      details.cancel()
      details.allowPropagation()
      return
    }
    onClose?.()
  }

  return (
    <Root open={shown} onOpenChange={handleOpenChange}>
      <Content
        // `layer`: what the form opens over it (login, the maximum alert, Copy URL: Dialogs) is above it, as over the dialog
        {...(drawer ? { side: steps ? 'right' : 'bottom', layer: 'dialog', flush: !steps } : { phone: 'sheet' })}
        width={width ?? themeValue(theme, 'product_modal', 'base.width')}
        closeGroup='product_modal'
        data-product-layout={layout}
        showCloseButton={!hideCloseDefault}
        aria-labelledby={PRODUCT_NAME_ID}
        aria-label={t('PRODUCT', 'Product')}
        data-doc-section={dataDocSection}
      >
        <ProductModalFlush ref={content} $fill={steps}>{children}</ProductModalFlush>
      </Content>
    </Root>
  )
}
