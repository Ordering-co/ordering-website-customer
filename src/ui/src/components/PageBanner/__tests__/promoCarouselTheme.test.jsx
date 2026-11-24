import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { schemaDefault, schemaEntry } from '~/utils/themeSchema'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { PageBanner } from '../index'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { BannerContainer, BannerTitle, BannerWrapper, ImageWrapper, promoCarouselNumber } from '../styles'

vi.mock('swiper/react', () => ({
  Swiper: ({ children, speed }) => <div data-testid='swiper' data-speed={speed}>{children}</div>,
  SwiperSlide: ({ children }) => <div data-testid='swiper-slide'>{children}</div>
}))
vi.mock('swiper/modules', () => ({ Navigation: {}, Thumbs: {} }))
vi.mock('swiper/css', () => ({}))
vi.mock('swiper/css/navigation', () => ({}))
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))

vi.mock('~components/components/PageBanner', () => ({
  PageBanner: ({ UIComponent, ...rest }) => (
    <UIComponent
      pageBannerState={{ loading: false, banner: { items: [{ url: 'a.jpg' }, { url: 'b.jpg' }] } }}
      {...rest}
    />
  )
}))

const tight = (css) => css.replace(/\s+/g, '')

const custom = themeWithValues((values) => {
  // the title: a section title (components.section_header)
  Object.assign(values.components.section_header.base, { title: { size: 28, line: 1.21, weight: 700 } })
  Object.assign(values.components.promo_carousel.base, {
    radius: 6,
    shadow: { x: 0, y: 2, blur: 4, spread: 0, color: '#000000', opacity: 0.1 },
    margin_y: 32,
    gap: 12,
    slide_ratio: 0.25,
    card_width: 300,
    card_height: 150
  })
  values.components.promo_carousel.variants.default.states.hover.shadow = { x: 0, y: 6, blur: 12, spread: 0, color: '#000000', opacity: 0.2 }
  values.components.promo_carousel.slots.arrow = { component: 'button', size: 'md', appearance: 'outline', color: 'primary', shape: 'icon' }
  return values
})

describe('components.promo_carousel in the schema', () => {
  it('today\'s carousel: 18% slides, 356×169 cards, no shadow nor hover, small neutral arrows', () => {
    const base = (prop) => schemaEntry(`components.promo_carousel.base.${prop}`)
    expect(base('slide_ratio')).toMatchObject({ type: 'number', value: 0.18 })
    expect(base('card_width')).toMatchObject({ type: 'number', value: 356 })
    expect(base('card_height')).toMatchObject({ type: 'number', value: 169 })
    expect(base('radius')).toMatchObject({ type: 'radius', value: '{radius.md}' })
    expect(base('shadow')).toMatchObject({ type: 'shadow', value: '{shadow.none}' })
    expect(schemaEntry('components.promo_carousel.variants.default.states.hover.shadow')).toMatchObject({ type: 'shadow', value: '{shadow.none}' })
    expect(schemaDefault('components.promo_carousel.slots.arrow')).toEqual({ component: 'button', size: 'sm', appearance: 'solid', color: 'neutral', shape: 'icon' })
  })
})

describe('the promo carousel (components.promo_carousel)', () => {
  it('helpers: the theme\'s number', () => {
    expect(promoCarouselNumber(custom, 'gap')).toBe(12)
  })

  it('title, margins, gap, slide proportion and the image\'s radius', () => {
    const title = renderWith(custom, <BannerTitle>Promos</BannerTitle>).getByText('Promos')
    expect(tight(cssFor(title))).toContain('font-size:28px;line-height:1.21;font-weight:700;')
    const row = renderWith(custom, <BannerContainer isHorizontal data-testid='r' />).getByTestId('r')
    expect(tight(cssFor(row))).toContain('margin:32px0;gap:12px;')
    const slide = renderWith(custom, <ImageWrapper data-testid='s' />).getByTestId('s')
    const slideCss = tight(cssFor(slide))
    expect(slideCss).toContain('padding-top:25%;')
    expect(slideCss).toContain('.banner-img{border-radius:6px;')
    const card = renderWith(custom, <ImageWrapper isHorizontal data-testid='h' />).getByTestId('h')
    expect(tight(cssFor(card))).not.toContain('padding-top:25%')
  })

  it('a card: its size, radius, shadow and the hover the theme gives', () => {
    const card = renderWith(custom, <BannerWrapper $clickable data-testid='c' />).getByTestId('c')
    const css = tight(cssFor(card))
    expect(css).toContain('width:300px;height:150px;border-radius:6px;box-shadow:0px2px4px0pxrgba(0,0,0,0.1);')
    expect(css).toContain(':hover{box-shadow:0px6px12px0pxrgba(0,0,0,0.2);')
    expect(css).not.toMatch(/translateY\(-4px\)[^}]*$/)
  })

  it('a card without an action is not a control: no hover of the theme', () => {
    const card = renderWith(custom, <BannerWrapper data-testid='c' />).getByTestId('c')
    expect(tight(cssFor(card))).not.toContain(':hover{box-shadow:0px6px12px0pxrgba(0,0,0,0.2);')
  })

  it('a banner of the slider that opens something: the focus ring inside its edge (the slide clips)', () => {
    const slide = renderWith(custom, <ImageWrapper $clickable data-testid='s' />).getByTestId('s')
    expect(tight(cssFor(slide))).toMatch(/:focus-visible\{outline-offset:-\d+px!important;/)
    const row = renderWith(custom, <ImageWrapper $clickable isHorizontal data-testid='h' />).getByTestId('h')
    expect(tight(cssFor(row))).not.toContain('outline-offset')
  })

  it('the arrows take the arrow slot', () => {
    const { getByRole } = renderWithProviders(<PageBanner />, { theme: custom })
    const prev = getByRole('button', { name: 'Previous' })
    // the base icon Button of the slot's look: md, primary outline
    expect(prev).toHaveAttribute('data-slot', 'button')
    const look = componentVars(custom, 'button', { size: 'md', shape: 'icon', color: 'primary', appearance: 'outline' })
    expect(prev.style.getPropertyValue('--ui-button-height')).toBe(look['--ui-button-height'])
    expect(prev.style.getPropertyValue('--ui-button-border')).toBe(look['--ui-button-border'])
    expect(prev.style.getPropertyValue('--ui-button-color')).toBe(look['--ui-button-color'])
  })

  it('the slide changes at the carousel\'s own speed (animated / speed), at once when it does not animate', () => {
    const fast = themeWithValues((values) => {
      Object.assign(values.components.promo_carousel.base, { animated: true, speed: 450 })
      return values
    })
    const view = renderWithProviders(<PageBanner />, { theme: fast })
    expect(view.getByTestId('swiper')).toHaveAttribute('data-speed', '450')
    view.unmount()
    // animated by default: its own speed
    const byDefault = renderWithProviders(<PageBanner />, { theme: themeWithValues() })
    expect(byDefault.getByTestId('swiper')).toHaveAttribute('data-speed', '200')
    byDefault.unmount()
    // animated: false, the slide changes at once
    const still = themeWithValues((values) => {
      values.components.promo_carousel.base.animated = false
      return values
    })
    expect(renderWithProviders(<PageBanner />, { theme: still }).getByTestId('swiper')).toHaveAttribute('data-speed', '0')
  })
})
