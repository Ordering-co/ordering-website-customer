import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { PageBanner } from '../index'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'

vi.mock('swiper/react', () => ({
  Swiper: ({ children }) => <div data-testid='swiper'>{children}</div>,
  SwiperSlide: ({ children, onClick }) => (
    <div data-testid='swiper-slide' onClick={onClick} role='button'>
      {children}
    </div>
  )
}))
vi.mock('swiper/modules', () => ({ Navigation: {}, Thumbs: {} }))
vi.mock('swiper/css', () => ({}))
vi.mock('swiper/css/navigation', () => ({}))
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))

const bannerState = vi.hoisted(() => ({
  current: {
    loading: false,
    banner: {
      items: [{ url: 'https://example.com/banner.jpg', action: { type: 'business', url: 'store/demo' } }]
    }
  }
}))

const emit = vi.hoisted(() => vi.fn())

vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [{ emit, on: vi.fn(), off: vi.fn() }]
}))

vi.mock('~components/components/PageBanner', () => ({
  PageBanner: ({ UIComponent, ...rest }) => (
    <UIComponent
      pageBannerState={bannerState.current}
      title='Home banner'
      {...rest}
    />
  )
}))

describe('PageBanner', () => {
  beforeEach(() => {
    emit.mockClear()
    bannerState.current = {
      loading: false,
      banner: {
        items: [{ url: 'https://example.com/banner.jpg', action: { type: 'business', url: 'store/demo' } }]
      }
    }
  })

  it('renders banner slides when data is loaded', () => {
    const { getByTestId, getByText } = renderWithProviders(<PageBanner />)
    expect(getByText('Home banner')).toBeInTheDocument()
    expect(getByTestId('swiper')).toBeInTheDocument()
    expect(getByTestId('swiper-slide')).toBeInTheDocument()
  })

  it('emits navigation when a business banner is clicked', () => {
    const { getByTestId } = renderWithProviders(<PageBanner />)
    fireEvent.click(getByTestId('swiper-slide').querySelector('button'))
    expect(emit).toHaveBeenCalled()
  })

  it('renders loading skeletons', () => {
    bannerState.current = { loading: true, banner: null }
    const { getAllByTestId } = renderWithProviders(<PageBanner />)
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('renders horizontal banners without swiper', () => {
    const { queryByTestId, container } = renderWithProviders(<PageBanner isHorizontal />)
    expect(queryByTestId('swiper')).not.toBeInTheDocument()
    expect(container.querySelector('.banner-img')).toBeTruthy()
  })

  it('the carousel arrows are theme buttons with a name', () => {
    bannerState.current = {
      loading: false,
      banner: { items: [{ url: 'https://example.com/a.jpg' }, { url: 'https://example.com/b.jpg' }] }
    }
    const { getByRole, unmount } = renderWithProviders(<PageBanner />, { theme: themeWithValues() })
    expect(getByRole('button', { name: 'Previous' })).toHaveAttribute('type', 'button')
    expect(getByRole('button', { name: 'Next' })).toBeInTheDocument()
    unmount()
  })

  describe('the banner\'s alt (a clickable banner is a button named by it)', () => {
    const business = {
      name: 'Demo Store',
      slug: 'demo',
      categories: [{ id: 3, products: [{ id: 7, name: 'Burger' }] }]
    }
    const altOf = (item, props = {}) => {
      bannerState.current = { loading: false, banner: { items: [item] } }
      const { container, unmount } = renderWithProviders(<PageBanner isHorizontal {...props} />)
      const alt = container.querySelector('.banner-img').getAttribute('alt')
      unmount()
      return alt
    }

    it('no business: a generic, translatable name', () => {
      expect(altOf({ url: 'a.jpg', action: { type: 'business', url: 'store/demo' } })).toBe('Promotional banner')
      expect(altOf({ url: 'a.jpg' })).toBe('Promotional banner')
    })

    it('in a business: the product it opens, else the business', () => {
      expect(altOf({ url: 'a.jpg', action: { type: 'product', url: 'store/demo?category=3&product=7' } }, { business })).toBe('Burger')
      expect(altOf({ url: 'a.jpg', action: { type: 'business', url: 'store/demo' } }, { business })).toBe('Demo Store')
      expect(altOf({ url: 'a.jpg' }, { business })).toBe('Demo Store')
    })

    it('in a business, a banner that opens another one: the generic name', () => {
      expect(altOf({ url: 'a.jpg', action: { type: 'business', url: 'store/other' } }, { business })).toBe('Promotional banner')
    })

    it('the carousel\'s banner button is named by it', () => {
      const { getAllByRole } = renderWithProviders(<PageBanner />)
      // (the Swiper mock's slide is a role=button too)
      const button = getAllByRole('button', { name: 'Promotional banner' }).find((el) => el.tagName === 'BUTTON')
      expect(button).toHaveAttribute('type', 'button')
    })
  })
})
