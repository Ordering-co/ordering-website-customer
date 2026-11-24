import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import { usePopper } from 'react-popper'
import { PopoverPanel } from '~ui/src/design-system/components/Popover'

import { SheetOverlay } from '~ui/src/components/Overlay/overlays'
import { LazySheet } from '~ui/src/components/Overlay/lazyOverlay'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { useLanguage } from '~components/contexts/LanguageContext'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { isInsideOverlay } from '~/utils/overlay'

export const CategoriesPopover = (props) => {
  const { id = 'categories-popover', open, onClose, getSelectionFocus, CategoriesPopoverUI } = props
  const theme = useTheme()
  const windowSize = useWindowSize()
  // Placed by Popper under the categories' menu tab that opens it, at its
  // start (its end in RTL), its arrow on the tab; fixed, as the bar may be
  const [referenceElement, setReferenceElement] = useState(null)
  const [popperElement, setPopperElement] = useState(null)
  const [arrowElement, setArrowElement] = useState(null)
  const popperRef = useRef(null)
  const referenceRef = useRef(null)
  const selected = useRef(false)
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    strategy: 'fixed',
    placement: theme?.rtl ? 'bottom-end' : 'bottom-start',
    modifiers: [
      { name: 'arrow', options: { element: arrowElement } },
      { name: 'offset', options: { offset: [0, 12] } }
    ]
  })
  const setPopoverElement = useCallback((element) => {
    popperRef.current = element
    setPopperElement(element)
  }, [])

  const [, t] = useLanguage()
  const isSlideBar = windowSize.width < 993
  // On small screens (where the bottom navigation is): a bottom sheet, as the
  // selects
  const isSheet = windowSize.width < MOBILE_WEB_MAX_WIDTH
  const isDesktopPopover = !isSheet && !isSlideBar
  const selectionFocus = useCallback(() => getSelectionFocus?.() ?? (
    referenceRef.current?.isConnected ? referenceRef.current : null
  ), [getSelectionFocus])
  const onSelect = () => {
    selected.current = true
    onClose?.()
  }
  const finalFocus = !open && selected.current ? selectionFocus : undefined

  // The menu tab lives after the anchored popover in the DOM. Move focus
  // into the list when that tab opens it so the next Tab stays in order.
  useLayoutEffect(() => {
    if (!open) return
    selected.current = false
    const bar = document.getElementById('category-lists')
    const focused = document.activeElement
    const focusedToggle = focused?.matches('#category-lists .category-popover-toggle') ? focused : null
    const toggle = focusedToggle || bar?.querySelector('.category-popover-toggle') || bar
    referenceRef.current = toggle
    setReferenceElement(toggle)
    if (isDesktopPopover && focusedToggle) {
      popperRef.current?.querySelector('[tabindex="0"], button:not([disabled])')?.focus({ preventScroll: true })
    }
  }, [open, isDesktopPopover])

  // The live results control is in a sibling subtree whose ref is assigned
  // during the same commit that removes the selected row.
  useEffect(() => {
    if (!open && isDesktopPopover && selected.current) {
      selected.current = false
      selectionFocus()?.focus({ preventScroll: true })
    }
  }, [open, isDesktopPopover, selectionFocus])

  useEffect(() => {
    if (!open || !isDesktopPopover) return
    const panel = popperRef.current
    const toggle = referenceRef.current
    const inPanel = (target) => panel?.contains(target)
    const isToggle = (target) => toggle?.matches('.category-popover-toggle') && toggle.contains(target)
    const inGroup = (target) => inPanel(target) || isToggle(target)
    let pointerOnToggle = false
    let dismissed = false
    const dismiss = () => {
      if (dismissed || selected.current) return
      dismissed = true
      onClose?.()
    }
    const handlePointerDown = (event) => { pointerOnToggle = isToggle(event.target) }
    const clearPointer = () => { pointerOnToggle = false }
    const handleFocusIn = ({ target, relatedTarget }) => {
      if (!inGroup(relatedTarget) || inPanel(target) || isInsideOverlay(target)) return
      // A pointer press on the toggle must reach its click to close it. Tab
      // from the last row can land on the same toggle and dismisses here.
      if (isToggle(target) && (pointerOnToggle || isToggle(relatedTarget))) return
      dismiss()
    }
    const handleClickOutside = ({ target }) => {
      if (!inGroup(target) && !isInsideOverlay(target)) dismiss()
    }
    const handleEscape = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !inGroup(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      dismiss()
      referenceRef.current?.focus({ preventScroll: true })
    }
    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('pointerup', clearPointer, true)
    window.addEventListener('pointercancel', clearPointer, true)
    window.addEventListener('focusin', handleFocusIn)
    window.addEventListener('mouseup', handleClickOutside)
    panel?.addEventListener('keydown', handleEscape)
    toggle?.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('pointerup', clearPointer, true)
      window.removeEventListener('pointercancel', clearPointer, true)
      window.removeEventListener('focusin', handleFocusIn)
      window.removeEventListener('mouseup', handleClickOutside)
      panel?.removeEventListener('keydown', handleEscape)
      toggle?.removeEventListener('keydown', handleEscape)
    }
  }, [open, isDesktopPopover, onClose])

  const popStyle = { ...styles.popper, visibility: open ? 'visible' : 'hidden' }

  if (!open) {
    popStyle.transform = 'translate3d(0px, 0px, 0px)'
  }

  return (
    <div style={{ overflow: 'hidden' }}>
      {isSheet
        ? (
          <LazySheet id={id} open={!!open} onClose={onClose} finalFocus={finalFocus} title={t('CATEGORIES', 'Categories')}>
              {/* its clicks stay in it: the React tree above the portal would get them too */}
              <div onClick={(e) => e.stopPropagation()}>
                <div data-doc-section='business-category-popover' data-doc-variant='bottom-sheet'>
                  {CategoriesPopoverUI({ onSelect })}
                </div>
              </div>
          </LazySheet>
          )
        : isSlideBar
          ? (
            <SheetOverlay id={id} aria-label={t('CATEGORIES', 'Categories')} open={!!open} onClose={onClose} finalFocus={finalFocus} side='left'>
              <div data-doc-section='business-category-popover' data-doc-variant='slide-bar'>
                {CategoriesPopoverUI({ onSelect })}
              </div>
            </SheetOverlay>
            )
          : (
            <PopoverPanel variant='arrow' arrow={{ ref: setArrowElement, style: styles.arrow }} data-doc-section='business-category-popover' data-doc-variant='popover' id={id} role='dialog' aria-label={t('CATEGORIES', 'Categories')} className='categories-popover' ref={setPopoverElement} style={popStyle} {...attributes.popper}>
              {open && CategoriesPopoverUI({ onSelect })}
            </PopoverPanel>
            )}
    </div>
  )
}
