import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'
import { ChevronIcon } from '~ui/src/styles/Chevron'
import { scrollBehavior } from '~/utils/themeMotion'
import { isPageScroll, scrollParent } from '~/utils/scrollContainer'
import { NavigationArrow, NavigationTrack, NavigationViewport } from './styles'

const TOLERANCE = 1

// `fade`: the tabs row has no arrow; it fades out on the end side while more tabs wait there,
// and the bar says when it is stuck under the top of what scrolls (data-stuck: its shadow).
export const ProductNavigationScroll = ({ scrollRef, sectionIds, fade = false, children }) => {
  const theme = useTheme()
  const [, t] = useLanguage()
  const trackRef = useRef(null)
  const [overflow, setOverflow] = useState(false)
  const [atEnd, setAtEnd] = useState(false)

  useLayoutEffect(() => {
    const track = trackRef.current
    const scroller = scrollRef.current
    if (!scroller) return
    const measure = () => {
      // Compare with the room before the arrow takes its share. Otherwise
      // the arrow could keep the list overflowing after the window grows.
      setOverflow(scroller.scrollWidth > track.clientWidth + TOLERANCE)
      const position = Math.abs(scroller.scrollLeft) + scroller.clientWidth
      setAtEnd(position >= scroller.scrollWidth - TOLERANCE)
    }
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(track)
    observer?.observe(scroller)
    for (const shortcut of scroller.children) observer?.observe(shortcut)
    scroller.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer?.disconnect()
      scroller.removeEventListener('scroll', measure)
    }
  }, [scrollRef, sectionIds])

  useEffect(() => {
    const nav = fade && trackRef.current?.closest('nav')
    if (!nav) return
    const container = scrollParent(nav)
    const target = isPageScroll(container) ? window : container
    // the sentinel keeps the bar's place in the flow: the bar is stuck once the sticky offset has moved it from there
    const sentinel = nav.previousElementSibling
    const update = () => {
      // (an element in display: none has no box: it is not stuck)
      const stuck = !!sentinel && nav.offsetHeight > 0 && nav.getBoundingClientRect().top - sentinel.getBoundingClientRect().top > TOLERANCE
      nav.toggleAttribute('data-stuck', stuck)
    }
    update()
    target.addEventListener('scroll', update, { passive: true })
    return () => {
      target.removeEventListener('scroll', update)
      nav.removeAttribute('data-stuck')
    }
  }, [fade, sectionIds])

  const move = () => {
    const scroller = scrollRef.current
    scroller.scrollTo({
      left: atEnd ? 0 : (theme.rtl ? -1 : 1) * scroller.scrollWidth,
      behavior: scrollBehavior(theme)
    })
  }

  return (
    <NavigationTrack ref={trackRef}>
      <NavigationViewport data-fade={fade && overflow && !atEnd ? '' : undefined}>{children}</NavigationViewport>
      {overflow && !fade && (
        <NavigationArrow>
          <Button
            type='button'
            shape='icon'
            size='md'
            color='neutral'
            appearance='ghost'
            coarseTouch
            aria-label={atEnd ? t('PREVIOUS', 'Previous') : t('NEXT', 'Next')}
            onClick={move}
          >
            <ChevronIcon kind='navigate' direction={atEnd ? 'back' : 'forward'} size={false} />
          </Button>
        </NavigationArrow>
      )}
    </NavigationTrack>
  )
}
