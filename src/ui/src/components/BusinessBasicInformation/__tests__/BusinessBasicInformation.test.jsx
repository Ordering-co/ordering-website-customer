import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { BusinessBasicInformation } from '../index'
import { defaultTheme, injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { schemaEntry } from '~/utils/themeSchema'
import { themedScroll } from '../../Header/__tests__/scrollTheme'
import { HEADER_STORE_SLOT_ATTRIBUTE } from '../../Header/behindHeader'

// a stable, mockable `emit` (the global setup's own is equally stable but
// not exported); implementation notes's tests assert what the store block publishes
const emit = vi.hoisted(() => vi.fn())
vi.mock('~components/contexts/EventContext', () => ({
  useEvent: () => [{ emit, on: vi.fn(), off: vi.fn() }]
}))

vi.mock('dayjs', () => {
  function dayjs (value) {
    return {
      tz: () => dayjs(value),
      format: () => '2026-07-15',
      isBetween: () => true,
      isValid: () => true,
      extend: () => {}
    }
  }
  dayjs.extend = () => {}
  dayjs.tz = (value) => dayjs(value)
  dayjs.prototype = {
    tz () { return this },
    isValid () { return true },
    format () { return '2026-07-15' }
  }
  return { default: dayjs }
})
vi.mock('dayjs/plugin/utc', () => ({ default: () => {} }))
vi.mock('dayjs/plugin/timezone', () => ({ default: () => {} }))
vi.mock('dayjs/plugin/isBetween', () => ({ default: () => {} }))
vi.mock('dayjs/plugin/isSameOrAfter', () => ({ default: () => {} }))
vi.mock('~components/constants/timezones', () => ({
  TIMEZONES: {},
  createDayjsWithTimezone: () => ({
    format: () => '2026-07-15',
    day: () => 3,
    tz () { return this }
  }),
  parseBusinessDateTime: () => null,
  getPreorderMaxDate: () => new Date('2026-12-31')
}))
vi.mock('~components/components/BusinessController', () => ({
  BusinessController: () => null
}))
vi.mock('~ui/src/components/MomentContent', () => ({
  MomentContent: () => null
}))
vi.mock('~ui/src/components/BusinessInformation', () => ({
  BusinessInformation: (props) => <div data-testid='business-information' data-close-callback={String('onClose' in props)} />
}))
vi.mock('~ui/src/components/BusinessReviews', () => ({
  BusinessReviews: () => <div data-testid='business-reviews' />
}))
vi.mock('~ui/src/components/BusinessPreorder', () => ({
  BusinessPreorder: () => <div data-testid='business-preorder' />
}))
describe('BusinessBasicInformation', () => {
  it('Info and the reviews open the base dialog (data-doc-section kept); its close calls their handler', async () => {
    const setOpenBusinessInformation = vi.fn()
    const business = { ...businessFixture, reviews: { total: 4.5 } }
    const { findByRole, queryByRole, getByRole, rerender } = renderWithProviders(
      <BusinessBasicInformation
        businessState={{ business, loading: false }}
        openBusinessInformation
        setOpenBusinessInformation={setOpenBusinessInformation}
      />
    )
    const info = await findByRole('dialog')
    expect(info.getAttribute('data-slot')).toBe('dialog-content')
    expect(info).toHaveAttribute('data-doc-section', 'business-information-dialog')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    expect(within(info).getByTestId('business-information')).toHaveAttribute('data-close-callback', 'false')
    fireEvent.click(within(info).getByRole('button', { name: 'Close' }))
    expect(setOpenBusinessInformation).toHaveBeenCalled()
    rerender(
      <BusinessBasicInformation
        businessState={{ business, loading: false }}
        openBusinessInformation={false}
        setOpenBusinessInformation={setOpenBusinessInformation}
      />
    )
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())

    fireEvent.click(getByRole('button', { name: 'Reviews: 4.5' }))
    const reviews = await findByRole('dialog')
    expect(reviews).toHaveAttribute('data-doc-section', 'business-reviews-dialog')
    expect(within(reviews).getByTestId('business-reviews')).toBeInTheDocument()
    // the Dialog's own sm size, not a fixed 460px
    const width = document.querySelector('[style*="--ui-modal-width"]').style.getPropertyValue('--ui-modal-width')
    expect(width).not.toBe('460px')
    expect(width).toBe(componentVars(defaultTheme, 'modal', { size: 'sm' })['--ui-modal-width'])
    fireEvent.click(within(reviews).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  it('renders store name from business state (a revealing header: the store\'s own bar repeats it)', () => {
    const { getByRole, container } = renderWithProviders(
      <BusinessBasicInformation
        businessState={{ business: businessFixture, loading: false }}
        openBusinessInformation={false}
        setOpenBusinessInformation={vi.fn()}
      />,
      { theme: themedScroll('reveal') }
    )
    expect(getByRole('heading', { name: 'Demo Store' })).toBeInTheDocument()
    // the bar fixed on scroll (BusinessStickyHeader) repeats the name,
    // hidden from assistive tech
    const bar = container.querySelector('#business_name_bar')
    expect(bar.querySelector('[aria-hidden="true"]')).toHaveTextContent('Demo Store')
  })

  it('with a fixed header (the default) the name goes to the header\'s store slot once it is behind the header', () => {
    const original = global.IntersectionObserver
    const callbacks = []
    global.IntersectionObserver = vi.fn().mockImplementation((cb) => {
      callbacks.push(cb)
      return { observe: vi.fn(), disconnect: vi.fn() }
    })
    const slot = document.createElement('div')
    slot.setAttribute(HEADER_STORE_SLOT_ATTRIBUTE, '')
    document.body.appendChild(slot)
    try {
      const { getByRole, container } = renderWithProviders(
        <BusinessBasicInformation
          businessState={{ business: businessFixture, loading: false }}
          openBusinessInformation={false}
          setOpenBusinessInformation={vi.fn()}
        />,
        { theme: themedScroll(undefined) }
      )
      expect(getByRole('heading', { name: 'Demo Store' })).toBeInTheDocument()
      // the store's own bar stays on the page, empty (others look for it)
      expect(container.querySelector('#business_name_bar')).toBeEmptyDOMElement()
      expect(slot).toBeEmptyDOMElement()
      // the name scrolls up behind the header
      act(() => callbacks.forEach(cb => cb([{ isIntersecting: false, boundingClientRect: { top: -10 }, rootBounds: { top: 0 } }])))
      expect(slot).toHaveTextContent('Demo Store')
    } finally {
      slot.remove()
      global.IntersectionObserver = original
    }
  })

  it('the store\'s cover is the page\'s section business_header (pages.business), which the theme may hide', () => {
    const business = { ...businessFixture, header: 'https://cdn.test/cover.png' }
    const renderWithTheme = (theme) => renderWithProviders(
      <BusinessBasicInformation
        businessState={{ business, loading: false }}
        openBusinessInformation={false}
        setOpenBusinessInformation={vi.fn()}
      />,
      { theme }
    )
    const cover = (view) => view.container.querySelector('#container')
    const shown = renderWithTheme(themeWithValues())
    expect(cover(shown)).not.toBeNull()
    shown.unmount()
    expect(schemaEntry('visibility.business.header')).toBeUndefined()
    const hidden = renderWithTheme(themeWithValues((values) => {
      values.pages.business.sections = [{ key: 'business_header', visible: false }]
      return values
    }))
    expect(cover(hidden)).toBeNull()
    // the rest of the header stays
    expect(hidden.getByRole('heading', { name: 'Demo Store' })).toBeInTheDocument()
  })

  it('the "Closed" under the name of a closed store (visibility business.header.closed), with or without a cover', () => {
    const renderStore = (business, theme) => renderWithProviders(
      <BusinessBasicInformation
        businessState={{ business, loading: false }}
        openBusinessInformation={false}
        setOpenBusinessInformation={vi.fn()}
      />,
      { theme }
    )
    const withCover = { ...businessFixture, header: 'https://cdn.test/cover.png', open: false }
    const shown = renderStore(withCover, themeWithValues())
    const closed = shown.container.querySelector('p.closed')
    expect(closed).toHaveTextContent('Closed')
    // after the name in the DOM (the identity), not over the cover
    const name = shown.getByRole('heading', { name: 'Demo Store' })
    expect(name.compareDocumentPosition(closed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(shown.container.querySelector('#container p.closed')).toBeNull()
    shown.unmount()

    // no cover (business.header null): the notice does not disappear with it
    const noCover = renderStore({ ...withCover, header: null }, themeWithValues())
    expect(noCover.container.querySelector('#container')).toBeNull()
    expect(noCover.container.querySelector('p.closed')).toHaveTextContent('Closed')
    noCover.unmount()

    // an open store has none
    const open = renderStore({ ...withCover, open: true }, themeWithValues())
    expect(open.container.querySelector('p.closed')).toBeNull()
    open.unmount()

    const hidden = renderStore(withCover, themeWithValues((values) => {
      values.visibility['business.header.closed'] = false
      return values
    }))
    expect(hidden.container.querySelector('p.closed')).toBeNull()
    // the cover stays
    expect(hidden.container.querySelector('#container')).not.toBeNull()
  })

  it('the "Closed" is never bigger than the name', () => {
    const business = { ...businessFixture, header: null, open: false }
    renderWithProviders(
      <BusinessBasicInformation
        businessState={{ business, loading: false }}
        openBusinessInformation={false}
        setOpenBusinessInformation={vi.fn()}
      />,
      { theme: themeWithValues() }
    )
    // the rules of the identity block, as styled-components injects them
    const px = (selector) => Number(new RegExp(`${selector}\\{[^}]*?font-size:(\\d+(?:\\.\\d+)?)px`).exec(injectedCss())?.[1])
    const nameSize = px(' h1')
    const closedSize = px('\\.closed')
    expect(nameSize).toBeGreaterThan(0)
    expect(closedSize).toBeGreaterThan(0)
    expect(closedSize).toBeLessThanOrEqual(nameSize)
  })

  describe('body scroll lock', () => {
    afterEach(() => {
      document.body.style.overflow = ''
      document.body.style.overflowY = ''
    })

    const renderInfo = (setOpenSearchProducts = vi.fn()) => renderWithProviders(
      <BusinessBasicInformation
        businessState={{ business: businessFixture, loading: false }}
        openBusinessInformation={false}
        setOpenBusinessInformation={vi.fn()}
        setOpenSearchProducts={setOpenSearchProducts}
      />
    )

    it('keeps the lock of a modal already open when it mounts (product opened from the URL)', () => {
      // the product modal opened from ?category=&product= locks the body before the store info mounts
      document.body.style.overflow = 'hidden'
      renderInfo()
      // an 'auto' here beats the shorthand lock in the browser (overflow: hidden auto)
      expect(document.body.style.overflowY).not.toBe('auto')
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('delegates opening search to the menu layout with the original focus target', () => {
      const openSearch = vi.fn()
      const { getByRole } = renderInfo(openSearch)
      const opener = getByRole('button', { name: 'Search Products' })
      fireEvent.click(opener)
      expect(openSearch).toHaveBeenCalledWith(true, opener)
      expect(document.body.style.overflowY).toBe('')
    })
  })

  describe('the store block, over the event bus', () => {
    let observedCallback
    let callbacks
    let disconnect
    const originalIntersectionObserver = global.IntersectionObserver

    beforeEach(() => {
      observedCallback = null
      callbacks = []
      disconnect = vi.fn()
      global.IntersectionObserver = vi.fn().mockImplementation((cb) => {
        callbacks.push(cb)
        observedCallback = cb
        return { observe: vi.fn(), disconnect }
      })
    })

    afterEach(() => {
      global.IntersectionObserver = originalIntersectionObserver
    })

    const singleStoreTheme = (slug = 'demo-store') => themeWithValues((values) => {
      values.site.mode = 'single_store'
      values.site.business_slug = slug
      return values
    })

    const renderBlock = (theme) => renderWithProviders(
      <BusinessBasicInformation
        businessState={{ business: businessFixture, loading: false }}
        openBusinessInformation={false}
        setOpenBusinessInformation={vi.fn()}
      />,
      { theme }
    )

    it('emits whether the store block is in view, via its IntersectionObserver', () => {
      renderBlock(singleStoreTheme())
      expect(observedCallback).toBeInstanceOf(Function)
      observedCallback([{ isIntersecting: true }])
      expect(emit).toHaveBeenCalledWith('single_store_in_view', true)
      observedCallback([{ isIntersecting: false }])
      expect(emit).toHaveBeenCalledWith('single_store_in_view', false)
    })

    it("emits false on unmount (leaving the store's page restores the header's brand)", () => {
      const { unmount } = renderBlock(singleStoreTheme())
      emit.mockClear()
      unmount()
      expect(disconnect).toHaveBeenCalled()
      expect(emit).toHaveBeenCalledWith('single_store_in_view', false)
    })

    it("publishes the business's logo only when it really is the single store", () => {
      renderBlock(singleStoreTheme('demo-store'))
      expect(emit).toHaveBeenCalledWith('single_store_logo', 'logo.png')
    })

    it('publishes no logo when the page\'s business is not the single store (a different slug)', () => {
      renderBlock(singleStoreTheme('other-store'))
      expect(emit).not.toHaveBeenCalledWith('single_store_logo', 'logo.png')
      expect(emit).toHaveBeenCalledWith('single_store_logo', null)
    })

    it('Marketplace (no singleStoreSlug): no event published at all, not even on mount or when an observer fires', () => {
      renderBlock(themeWithValues())
      // other observers may watch the page (BusinessStickyHeader's, with a
      // fixed header): whatever they report, the store block publishes nothing
      callbacks.forEach(cb => cb([{ isIntersecting: false, boundingClientRect: { top: -10 }, rootBounds: { top: 0 } }]))
      callbacks.forEach(cb => cb([{ isIntersecting: true }]))
      expect(emit).not.toHaveBeenCalledWith('single_store_logo', expect.anything())
      expect(emit).not.toHaveBeenCalledWith('single_store_in_view', expect.anything())
    })

    it('emits single_store_in_view false right away when IntersectionObserver is unsupported (no 1500ms wait needed)', () => {
      delete global.IntersectionObserver
      renderBlock(singleStoreTheme())
      expect(emit).toHaveBeenCalledWith('single_store_in_view', false)
    })
  })
})
