import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { PageBanner } from '../index'

// implementation notesthe carousel's arrows are the base icon Button of the slot
// promo_carousel.arrow (sm neutral solid by default) with the base Icon, and they
// are Swiper's navigation (the button elements themselves).

const swiper = vi.hoisted(() => ({ params: null }))
// Swiper starts after the arrows are on the page (an effect), as the real one
vi.mock('swiper/react', async () => {
  const { useEffect } = await vi.importActual('react')
  return {
    Swiper: ({ children, onBeforeInit }) => {
      useEffect(() => {
        swiper.params = { navigation: {} }
        onBeforeInit?.({ params: swiper.params })
      }, [])
      return <div data-testid='swiper'>{children}</div>
    },
    SwiperSlide: ({ children }) => <div>{children}</div>
  }
})
vi.mock('swiper/modules', () => ({ Navigation: {}, Thumbs: {} }))
vi.mock('swiper/css', () => ({}))
vi.mock('swiper/css/navigation', () => ({}))
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('~components/components/PageBanner', () => ({
  PageBanner: ({ UIComponent, ...rest }) => (
    <UIComponent pageBannerState={{ loading: false, banner: { items: [{ url: 'a.jpg' }, { url: 'b.jpg' }] } }} {...rest} />
  )
}))

describe('PageBanner: its arrows are the base icon Button', () => {
  it('the default slot: sm neutral solid, named, with the base Icon, and Swiper\'s navigation', () => {
    const theme = themeWithValues()
    const { getByRole } = renderWithProviders(<PageBanner />, { theme })
    const previous = getByRole('button', { name: 'Previous' })
    const next = getByRole('button', { name: 'Next' })
    const look = componentVars(theme, 'button', { size: 'sm', shape: 'icon', color: 'neutral', appearance: 'solid' })
    ;[previous, next].forEach((arrow) => {
      expect(arrow).toHaveAttribute('data-slot', 'button')
      expect(arrow).toHaveAttribute('type', 'button')
      expect(arrow.style.getPropertyValue('--ui-button-height')).toBe(look['--ui-button-height'])
      expect(arrow.style.getPropertyValue('--ui-button-background')).toBe(look['--ui-button-background'])
      expect(arrow.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    })
    expect(previous.querySelector('svg.lucide-chevron-left')).toBeInTheDocument()
    // the action: Swiper moves the slides with these very buttons
    expect(swiper.params.navigation.prevEl).toBe(previous)
    expect(swiper.params.navigation.nextEl).toBe(next)
  })
})
