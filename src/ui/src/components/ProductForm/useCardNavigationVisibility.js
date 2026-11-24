import { useLayoutEffect, useState } from 'react'
import { containerTop, isPageScroll, scrollParent } from '~/utils/scrollContainer'

export const useCardNavigationVisibility = (infoRef, actionsRef, sectionIds, stickyActions, inlineFallback) => {
  const [visible, setVisible] = useState(false)

  useLayoutEffect(() => {
    const info = infoRef.current
    if (!info || !sectionIds) {
      setVisible(false)
      return
    }

    const scroller = scrollParent(info)
    if (!info.closest('[data-product-layout]') || isPageScroll(scroller)) {
      setVisible(inlineFallback)
      return
    }

    const sections = sectionIds.split(' ').map(id => info.querySelector(`#${id}`)).filter(Boolean)
    const actions = actionsRef.current
    const measure = () => {
      // Translate the current positions back to scrollTop=0. A scroll while
      // editing the product must not change what counts as the first frame.
      const footerHeight = stickyActions && actions ? actions.getBoundingClientRect().height : 0
      const bottom = containerTop(scroller) + scroller.clientHeight - footerHeight
      setVisible(sections.some(section => section.getBoundingClientRect().bottom + scroller.scrollTop > bottom + 1))
    }

    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    for (const node of [scroller, info, info.parentElement, actions, ...sections]) {
      if (node) observer?.observe(node)
    }
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [infoRef, actionsRef, sectionIds, stickyActions, inlineFallback])

  return visible
}
