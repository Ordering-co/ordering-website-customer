import React from 'react'
import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// The photo's swiper says what it got as its navigation
const swipers = vi.hoisted(() => ({ navigation: [], onBeforeInit: null }))

vi.mock('swiper/react', () => ({
  Swiper: ({ children, navigation, className, onBeforeInit, onSwiper, onSlideChange, onUpdate, onResize }) => {
    if (className === 'mySwiper2') {
      swipers.navigation.push(navigation)
      Object.assign(swipers, { onBeforeInit, onSwiper, onSlideChange, onUpdate, onResize })
    }
    return <div data-testid={className || 'swiper'}>{children}</div>
  },
  SwiperSlide: ({ children }) => <div>{children}</div>
}))
vi.mock('swiper/modules', () => ({ Navigation: class Navigation {} }))
vi.mock('swiper/css', () => ({}))
vi.mock('swiper/css/navigation', () => ({}))

const productState = vi.hoisted(() => ({ current: null }))

vi.mock('~components/components/ProductForm', () => ({
  ProductForm: ({ UIComponent, ...rest }) => (
    <UIComponent
      productObject={{ product: productState.current, loading: false, error: null }}
      professionalListState={{ loading: false, professionals: [] }}
      professionalSelected={null}
      handleSave={vi.fn()}
      isSoldOut={false}
      maxProductQuantity={99}
      handleCreateGuestUser={vi.fn()}
      business={{ id: 1 }}
      productCart={null}
      actionStatus={{ loading: false }}
      {...rest}
    />
  )
}))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))

const { ServiceForm } = await import('../index')

const service = { id: 50, name: 'Haircut', price: 45, duration: 30, images: 'cover.jpg', gallery: [{ file: 'side.jpg' }] }

const renderForm = (theme, product = service) => {
  productState.current = product
  swipers.navigation = []
  return renderWithProviders(<ServiceForm businessSlug='demo-store' />, { theme })
}

describe('ServiceForm photo arrows (the product gallery\'s, product_modal.slots.gallery_arrow)', () => {
  it('the product gallery\'s arrows, icon buttons with a name handed to Swiper', () => {
    const utils = renderForm(themeWithValues())
    const prev = utils.getByRole('button', { name: 'Previous' })
    const next = utils.getByRole('button', { name: 'Next' })
    expect(prev).toHaveAttribute('data-slot', 'button')
    expect(next).toHaveAttribute('data-slot', 'button')
    expect(prev.querySelector('svg.lucide-chevron-left[aria-hidden=true]')).toBeInTheDocument()
    expect(next.querySelector('svg.lucide-chevron-right[aria-hidden=true]')).toBeInTheDocument()
    expect(utils.getByTestId('mySwiper2')).toContainElement(prev)
    expect(typeof swipers.navigation[swipers.navigation.length - 1]).toBe('object')
    const swiper = { params: { navigation: { prevEl: null, nextEl: null } } }
    swipers.onBeforeInit(swiper)
    expect(swiper.params.navigation.prevEl).toBe(prev)
    expect(swiper.params.navigation.nextEl).toBe(next)
  })

  it('the slot\'s size, as the product\'s arrows', () => {
    const theme = themeWithValues((values) => {
      values.components.product_modal.slots.gallery_arrow = { component: 'button', size: 'lg', appearance: 'solid', color: 'neutral', shape: 'icon' }
      return values
    })
    const utils = renderForm(theme)
    expect(utils.getByRole('button', { name: 'Previous' }).style.getPropertyValue('--ui-button-height'))
      .toBe(`${theme.values.components.button.sizes.lg.height}px`)
  })

  it('paints the correct disabled arrow after initialization, navigation and carousel updates', () => {
    const utils = renderForm(themeWithValues())
    const prev = utils.getByRole('button', { name: 'Previous' })
    const next = utils.getByRole('button', { name: 'Next' })
    const assertEnds = (beginning, end) => {
      expect(prev.disabled).toBe(beginning)
      expect(next.disabled).toBe(end)
      expect(prev.hasAttribute('data-disabled')).toBe(beginning)
      expect(next.hasAttribute('data-disabled')).toBe(end)
    }
    // Swiper also writes the native property. React needs the same state for Button.
    const carousel = { isBeginning: true, isEnd: false }
    act(() => swipers.onSwiper?.(carousel))
    assertEnds(true, false)
    act(() => swipers.onSlideChange?.(Object.assign(carousel, { isBeginning: false, isEnd: true })))
    assertEnds(false, true)
    act(() => swipers.onUpdate?.(Object.assign(carousel, { isBeginning: false, isEnd: false })))
    assertEnds(false, false)
    act(() => swipers.onResize?.(Object.assign(carousel, { isBeginning: true, isEnd: false })))
    assertEnds(true, false)
  })

  it('one photo has no arrows', () => {
    const utils = renderForm(themeWithValues(), { ...service, gallery: [] })
    expect(utils.queryByRole('button', { name: 'Previous' })).toBeNull()
    expect(swipers.navigation[swipers.navigation.length - 1]).toBe(false)
  })
})
