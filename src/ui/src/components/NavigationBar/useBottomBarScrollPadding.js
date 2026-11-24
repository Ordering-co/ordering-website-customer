import { useEffect } from 'react'
import { useTheme } from 'styled-components'
import { focusRingReach } from '~ui/src/styles/Focus'
import { BOTTOM_BAR_SELECTOR } from './styles'

/**
 * Tabbing to a control under a bar fixed at the bottom (the navigation, the store's cart bar, the checkout's place
 * order bar) scrolled it only to the viewport's edge, below the bar (implementation notes, M2). The page keeps a
 * `scroll-padding-bottom` as tall as what the bars really cover, measured (their padding and the device's safe area
 * are inside the box), plus the focus ring's reach, so the browser scrolls the control and its ring above them.
 */
export const useBottomBarScrollPadding = () => {
  const theme = useTheme()
  const reach = focusRingReach(theme)
  useEffect(() => {
    const root = document.documentElement
    let frame = 0
    const resizer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => schedule())
    function update () {
      frame = 0
      const height = window.innerHeight
      const covered = [...document.querySelectorAll(BOTTOM_BAR_SELECTOR)].map((bar) => {
        resizer?.observe(bar)
        const box = bar.getBoundingClientRect()
        // a hidden bar has no box; one docked above the navigation covers its own box and the navigation's
        return box.height > 0 ? height - box.top : 0
      })
      const inset = Math.max(0, ...covered)
      if (inset) root.style.scrollPaddingBottom = `${Math.ceil(inset) + reach}px`
      else root.style.removeProperty('scroll-padding-bottom')
    }
    function schedule () {
      if (!frame) frame = requestAnimationFrame(update)
    }
    // bars come and go with the route and the cart; their size follows the theme, the width and the keyboard
    const mutations = new MutationObserver(schedule)
    mutations.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', schedule)
    update()
    return () => {
      cancelAnimationFrame(frame)
      mutations.disconnect()
      resizer?.disconnect()
      window.removeEventListener('resize', schedule)
      root.style.removeProperty('scroll-padding-bottom')
    }
  }, [reach])
}

// The hook as a component, for the app's root (inside the ThemeProvider).
export const BottomBarScrollPadding = () => {
  useBottomBarScrollPadding()
  return null
}
