import { useLayoutEffect } from 'react'
import { isPageScroll, scrollParent, stickyTopBottom } from '~/utils/scrollContainer'

export const useProductActionsScroll = (infoRef, actionsRef, sticky, showcaseColumn) => {
  useLayoutEffect(() => {
    const info = infoRef.current
    const actions = actionsRef.current
    if (!sticky || !info || !actions) return
    const form = info.parentElement

    let scroller
    let previousPadding
    let footerHeight
    let frame
    // Content scrolls under the pinned bar while the scroller has more below its edge: the bar then needs a separation (data-overlaid)
    const markOverlaid = () => actions.toggleAttribute('data-overlaid', !!scroller && Math.ceil(scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight) > 0)
    const restorePadding = () => {
      if (scroller) scroller.style.scrollPaddingBlockEnd = previousPadding
    }

    const revealFocus = () => {
      window.cancelAnimationFrame(frame)
      // The browser can perform its own focus scroll after dispatching focusin.
      frame = window.requestAnimationFrame(() => {
        const focused = document.activeElement
        if (!scroller || !info.contains(focused)) return
        // Group headings and error sections are focused by explicit scroll
        // actions. Let those actions finish scrolling to their own offsets.
        if (focused.tabIndex < 0) return
        const { top, bottom } = focused.getBoundingClientRect()
        const covered = bottom - actions.getBoundingClientRect().top
        if (covered <= 0) return
        const visibleTop = scroller.getBoundingClientRect().top + stickyTopBottom(scroller)
        scroller.scrollTop += Math.min(covered, Math.max(0, top - visibleTop))
      })
    }

    const handleFocus = () => {
      if (!scroller) return
      const focused = document.activeElement
      const inInfo = info.contains(focused)
      // The inset is for the controls above the footer. The footer itself
      // and programmatically focused error sections have their own scrolls.
      const useInset = !actions.contains(focused) && (!inInfo || focused.tabIndex >= 0)
      scroller.style.scrollPaddingBlockEnd = useInset ? `${footerHeight}px` : previousPadding
      if (inInfo && useInset) revealFocus()
    }

    const measure = () => {
      // Showcase has its own column scroller only at wider widths.
      const parent = scrollParent(info)
      const next = isPageScroll(parent) ? null : parent
      if (next !== scroller) {
        restorePadding()
        scroller?.removeEventListener('scroll', markOverlaid)
        next?.addEventListener('scroll', markOverlaid, { passive: true })
        scroller = next
        previousPadding = scroller?.style.scrollPaddingBlockEnd
      }
      // The sticky footer already occupies this height in the flow. Use the
      // same space for the scrollport's inset, including any wrapped text.
      footerHeight = actions.getBoundingClientRect().height
      markOverlaid()
      handleFocus()
    }

    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(actions)
    // the form grows or shrinks (a group opens, an error shows): what is under the bar changes
    const formObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(markOverlaid) : null
    formObserver?.observe(info)
    if (showcaseColumn || !observer) window.addEventListener('resize', measure)
    form.addEventListener('focusin', handleFocus)
    return () => {
      observer?.disconnect()
      formObserver?.disconnect()
      scroller?.removeEventListener('scroll', markOverlaid)
      actions.removeAttribute('data-overlaid')
      window.removeEventListener('resize', measure)
      form.removeEventListener('focusin', handleFocus)
      window.cancelAnimationFrame(frame)
      restorePadding()
    }
  }, [infoRef, actionsRef, sticky, showcaseColumn])
}
