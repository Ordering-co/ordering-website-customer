import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useTheme } from 'styled-components'
import { AutoscrollContainer } from './styles'

import { Icon } from '~ui/src/design-system/components/Icon'
import { scrollBehavior } from '~/utils/themeMotion'
import { Button } from '~ui/src/design-system/components/Button'
import { useLanguage } from '~components/contexts/LanguageContext'
import { focusRingReach } from '~ui/src/styles/Focus'

// How much a side may still scroll and count as its end: scrollWidth and
// clientWidth are rounded, scrollLeft may be a fraction.
const SCROLL_TOLERANCE = 1

/**
 * The element that scrolls the carousel: the nearest ancestor of the
 * AutoScroll that clips its content horizontally (the scrollport its sticky
 * arrows stick to). Without one (an unstyled tree), its grandparent, as
 * before.
 */
export const findScrollContainer = (node) => {
  let element = node?.parentElement
  while (element && element !== document.body && element !== document.documentElement) {
    const overflowX = window.getComputedStyle?.(element)?.overflowX
    if (overflowX && overflowX !== 'visible' && overflowX !== 'clip') return element
    element = element.parentElement
  }
  return node?.parentElement?.parentElement || node?.parentElement || null
}

/**
 * Where the container can still scroll, by physical side. In RTL the start
 * is on the right: scrollLeft is 0 there and negative toward the left (the
 * standard, Chrome 85+, Firefox, Safari); the old Chrome model (positive,
 * its maximum at the start) is read too.
 */
export const scrollableSides = (container, rtl) => {
  if (!container) return { left: false, right: false }
  const { scrollWidth, clientWidth, scrollLeft } = container
  const max = scrollWidth - clientWidth
  if (!(max > SCROLL_TOLERANCE)) return { left: false, right: false }
  const fromStart = rtl
    ? (scrollLeft > 0 ? max - scrollLeft : -scrollLeft)
    : scrollLeft
  const canStart = fromStart > SCROLL_TOLERANCE
  const canEnd = fromStart + clientWidth < scrollWidth - SCROLL_TOLERANCE
  return rtl
    ? { left: canEnd, right: canStart }
    : { left: canStart, right: canEnd }
}

/**
 * How far the container must scroll (physical px, positive toward the right) so the focused element shows whole,
 * with its focus ring, between the edges and the visible arrows (they are sticky over the content, and one that
 * appears with the scroll shifts it). 0 when it already does.
 */
export const revealDelta = (container, self, target, reach) => {
  const box = container.getBoundingClientRect()
  const rect = target.getBoundingClientRect()
  let start = box.left
  let end = box.right
  self.querySelectorAll(':scope > .left-autoscroll, :scope > .right-autoscroll').forEach((arrow) => {
    if (!arrow.offsetParent) return
    const bounds = arrow.getBoundingClientRect()
    if (bounds.left + bounds.width / 2 < (box.left + box.right) / 2) start = Math.max(start, bounds.right)
    else end = Math.min(end, bounds.left)
  })
  const cutStart = rect.left - reach - start
  const cutEnd = rect.right + reach - end
  // (less than a pixel is a fraction of the layout, not a cut)
  if (cutStart < -1) return cutStart
  return cutEnd > 1 ? cutEnd : 0
}

export const AutoScroll = (props) => {
  const {
    children,
    modal,
    scrollId,
    onHandleRightEnd,
    isColumnMode,
    isFlex,
    byItem
  } = props

  const theme = useTheme()
  const [, t] = useLanguage()
  const autoScrollId = scrollId || 'autoscroll'
  // the AutoScroll itself, the element that scrolls it and its direction
  const selfRef = useRef(null)
  const containerRef = useRef(null)
  const rtlRef = useRef(!!theme?.rtl)
  const leftArrowRef = useRef(null)
  const rightArrowRef = useRef(null)
  // the sides it can scroll to now (an arrow per side, only where it can)
  const [sides, setSides] = useState({ left: false, right: false })
  const lastScrolled = useRef(0)

  const measure = useCallback(() => {
    const container = containerRef.current
    // going back within the tolerance of its start: at its start (the
    // previous arrow leaving the layout stops a smooth scroll a pixel short
    // of it); never while leaving it (that would stop the scroll there)
    const scrolled = Math.abs(container?.scrollLeft || 0)
    if (container && scrolled !== 0 && scrolled <= SCROLL_TOLERANCE && lastScrolled.current > scrolled) {
      container.scrollLeft = 0
    }
    lastScrolled.current = Math.abs(container?.scrollLeft || 0)
    const next = scrollableSides(container, rtlRef.current)
    setSides(current => (current.left === next.left && current.right === next.right) ? current : next)
  }, [])

  // Measured from the real container, again on its scroll, on a change of
  // size of the container or of the content (an image that loads), and when
  // the items change.
  useLayoutEffect(() => {
    const self = selfRef.current
    if (!self) return
    const container = findScrollContainer(self)
    containerRef.current = container
    rtlRef.current = !!theme?.rtl || (!!container && window.getComputedStyle?.(container)?.direction === 'rtl')
    measure()
    if (!container) return

    container.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    // an image of an item loads (load does not bubble: captured)
    self.addEventListener('load', measure, true)

    // An item that takes the focus (Tab, Shift+Tab) shows whole: the browser's own scroll leaves it under an arrow or
    // cut when an arrow appears with that scroll, so it is repeated until the row stops moving (a few frames).
    const reach = focusRingReach(theme)
    const reveal = (target, settled = 0, frames = 0) => {
      if (document.activeElement !== target || settled >= 3 || frames >= 30) return
      const delta = revealDelta(container, self, target, reach)
      if (delta) container.scrollLeft += delta
      requestAnimationFrame(() => reveal(target, delta ? 0 : settled + 1, frames + 1))
    }
    const onFocus = (event) => {
      const target = event.target
      if (target.matches?.('.left-autoscroll, .right-autoscroll')) return
      reveal(target)
    }
    self.addEventListener('focusin', onFocus)

    let resizeObserver = null
    const observeItems = () => {
      if (!resizeObserver) return
      resizeObserver.disconnect()
      resizeObserver.observe(container)
      resizeObserver.observe(self)
      if (self.parentElement && self.parentElement !== container) resizeObserver.observe(self.parentElement)
      Array.from(self.children).forEach(item => resizeObserver.observe(item))
    }
    if (typeof window.ResizeObserver === 'function') {
      resizeObserver = new window.ResizeObserver(() => measure())
      observeItems()
    }
    let mutationObserver = null
    if (typeof window.MutationObserver === 'function') {
      mutationObserver = new window.MutationObserver(() => {
        observeItems()
        measure()
      })
      mutationObserver.observe(self, { childList: true })
    }

    return () => {
      container.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      self.removeEventListener('load', measure, true)
      self.removeEventListener('focusin', onFocus)
      resizeObserver && resizeObserver.disconnect()
      mutationObserver && mutationObserver.disconnect()
    }
  }, [measure, theme?.rtl, isColumnMode, modal])

  // The end of the scroll: once when the next arrow goes away (the old
  // onHandleRightEnd, for a list that loads more).
  const hadRight = useRef(false)
  useEffect(() => {
    if (hadRight.current && !sides.right && sides.left && onHandleRightEnd) onHandleRightEnd()
    hadRight.current = sides.right
  }, [sides.right, sides.left])

  // An arrow that hides with the focus on it hands it to the other one.
  useLayoutEffect(() => {
    const active = document.activeElement
    if (!sides.left && active && active === leftArrowRef.current && sides.right) rightArrowRef.current?.focus?.()
    if (!sides.right && active && active === rightArrowRef.current && sides.left) leftArrowRef.current?.focus?.()
  }, [sides.left, sides.right])

  // byItem: an arrow shows the item its side cuts, whole: the left one brings
  // the start of the first item cut on the left to the container's start (the
  // first item to 0), the right one the end of the first item cut on the right
  // (and its margin) to the container's end, the last one to the scroll's
  // end. A click while the smooth scroll still runs counts from where it is
  // going.
  const itemTarget = useRef(null)
  const scrollToItem = (left) => {
    const containerElement = containerRef.current
    const items = [...(selfRef.current?.children || [])]
      .filter(item => !item.classList.contains('left-autoscroll') && !item.classList.contains('right-autoscroll'))
    if (!items.length || !containerElement) return false
    const containerLeft = containerElement.getBoundingClientRect().left
    const scrolled = containerElement.scrollLeft
    const width = containerElement.clientWidth
    const max = containerElement.scrollWidth - width
    const pending = itemTarget.current
    const current = pending && Date.now() - pending.at < 800 ? pending.left : scrolled
    const boxes = items.map((item, index) => {
      const rect = item.getBoundingClientRect()
      const start = rect.left - containerLeft + scrolled
      return {
        start: index === 0 ? 0 : start,
        end: start + rect.width + (parseFloat(getComputedStyle(item).marginRight) || 0)
      }
    })
    let target
    if (left) {
      target = [...boxes].reverse().find(box => box.start < current - 1)?.start
    } else {
      const cut = boxes.findIndex(box => box.end > current + width + 1)
      // the last item: the scroll's end (its shadow, whatever follows it)
      if (cut !== -1) target = cut === boxes.length - 1 ? Infinity : boxes[cut].end - width
    }
    if (target === undefined) return true
    const destination = Math.min(Math.max(target, 0), max)
    itemTarget.current = { left: destination, at: Date.now() }
    // the end past the whole width: the browser stops at its exact end
    // (scrollWidth and clientWidth are rounded, its end may be a fraction more)
    const scrollTo = target === Infinity ? containerElement.scrollWidth : destination
    containerElement.scrollTo({ top: 0, left: scrollTo, behavior: scrollBehavior(theme) })
    return true
  }

  const scrolling = (left) => {
    if (byItem && !theme?.rtl && scrollToItem(left)) return
    const containerElement = containerRef.current
    if (!containerElement) return
    // a step of a tenth of the list's width, 200px at least
    const parentElement = selfRef.current?.parentElement || containerElement
    if (left) {
      containerElement.scrollBy({
        top: 0,
        left: (((-parentElement.offsetWidth / 10) > -200) ? -200 : -parentElement.offsetWidth / 10),
        behavior: scrollBehavior(theme)
      })
    } else {
      containerElement.scrollBy({
        top: 0,
        left: (((+parentElement.offsetWidth / 10) < 200) ? 200 : +parentElement.offsetWidth / 10),
        behavior: scrollBehavior(theme)
      })
    }
  }

  // No arrows when the content fits (nor in column mode); otherwise one per
  // side, hidden (out of the layout, the focus and the accessibility tree)
  // while its side has nothing more to show.
  const showArrows = !isColumnMode && (sides.left || sides.right)

  // An arrow is a real button (keyboard, name): the pointer scrolls on press,
  // as before; a click from the keyboard (Enter, Space: no pointer detail)
  // scrolls too. The icon button of the theme (neutral, sm).
  const renderArrow = (left) => (
    <Button
      ref={left ? leftArrowRef : rightArrowRef}
      shape='icon'
      size='sm'
      color='neutral'
      className={`${left ? 'left-autoscroll' : 'right-autoscroll'}${(left ? sides.left : sides.right) ? '' : ' hidden'}`}
      aria-label={left ? t('PREVIOUS', 'Previous') : t('NEXT', 'Next')}
      onMouseDown={() => scrolling(left)}
      onClick={(e) => { if (e.detail === 0) scrolling(left) }}
    >
      <Icon name={left ? 'keyboardArrowLeft' : 'keyboardArrowRight'} />
    </Button>
  )

  return (
    <AutoscrollContainer ref={selfRef} modal={modal} id={`${autoScrollId}`} isColumnMode={isColumnMode} isFlex={isFlex} gap={props?.gap ?? null}>
      {showArrows ? renderArrow(true) : ''}
      {children}
      {showArrows ? renderArrow(false) : ''}
    </AutoscrollContainer>
  )
}
