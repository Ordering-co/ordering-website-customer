import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { createLanguageWrapper } from '../../../../../__tests__/helpers/languageTestUtils'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { NavigationBar } from '../index'
import { defaultTheme, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

vi.mock('@loadable/component', () => ({
  default: () => () => <div data-testid='lazy-modal-child' />
}))

// the dialogs load on their first opening (lazyOverlay, loadable is mocked here): the real overlays
vi.mock('~ui/src/components/Overlay/lazyOverlay', async () => {
  const { DialogOverlay, SheetOverlay } = await import('~ui/src/components/Overlay/overlays')
  return { LazyDialog: DialogOverlay, LazySheet: SheetOverlay }
})

describe('NavigationBar', () => {

  it.each([
    ['es', 'Inicio', 'Casa'],
    ['bg', 'Начало', 'Дом']
  ])('keeps legacy navigation independent of address labels in %s', async (code, nav, address) => {
    const dictionary = { WEBSITE_HOME: nav, WEBSITE_ADDRESS_HOME: address }
    const { findByText, queryByText, rerender } = renderWithProviders(<NavigationBar />, {
      wrapper: createLanguageWrapper(dictionary, code)
    })
    expect(await findByText(nav)).toBeInTheDocument()
    dictionary.WEBSITE_ADDRESS_HOME = 'Custom address label'
    rerender(<NavigationBar />)
    expect(await findByText(nav)).toBeInTheDocument()
    expect(queryByText('Custom address label')).not.toBeInTheDocument()
  })

  it('renders primary mobile navigation links', () => {
    const { getByText } = renderWithProviders(<NavigationBar />, {
      initialEntries: ['/search'],
      routePath: '/search'
    })
    expect(getByText('Home')).toBeInTheDocument()
    expect(getByText('Explore')).toBeInTheDocument()
    expect(getByText('Orders')).toBeInTheDocument()
    expect(getByText('My cart')).toBeInTheDocument()
    expect(getByText('Profile')).toBeInTheDocument()
  })

  it('opens address modal for guests tapping Home: the base dialog, named by its title; its close closes it', async () => {
    const { getByText } = renderWithProviders(<NavigationBar />, {
      initialEntries: ['/home'],
      routePath: '/home'
    })
    fireEvent.click(getByText('Home'))
    const dialog = await screen.findByRole('dialog', { name: 'Where do we deliver?' })
    expect(dialog).toHaveAttribute('data-slot', 'dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('opens cart modal when My cart is clicked', async () => {
    const { getByText } = renderWithProviders(<NavigationBar />, {
      initialEntries: ['/search'],
      routePath: '/search'
    })
    fireEvent.click(getByText('My cart'))
    const dialog = await screen.findByRole('dialog', { name: 'My cart' })
    expect(within(dialog).getByTestId('lazy-modal-child')).toBeInTheDocument()
  })

  // implementation notesa turn or a fold crosses 576px; the cart it opened (and a product being edited in it) stays
  it('keeps the open cart when the bar is hidden by a wider screen and back', async () => {
    const view = renderWithProviders(<NavigationBar />, { initialEntries: ['/search'], routePath: '/search' })
    fireEvent.click(view.getByText('My cart'))
    const dialog = await screen.findByRole('dialog', { name: 'My cart' })
    const child = within(dialog).getByTestId('lazy-modal-child')
    view.rerender(<NavigationBar hidden />)
    expect(view.queryByText('Explore')).toBeNull()
    expect(screen.getByRole('dialog', { name: 'My cart' })).toBe(dialog)
    expect(within(dialog).getByTestId('lazy-modal-child')).toBe(child)
    view.rerender(<NavigationBar />)
    expect(view.getByText('Explore')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog', { name: 'My cart' })).getByTestId('lazy-modal-child')).toBe(child)
  })

  it('opens login modal when guest taps Explore', async () => {
    const { getByText } = renderWithProviders(<NavigationBar />, {
      initialEntries: ['/search'],
      routePath: '/search'
    })
    fireEvent.click(getByText('Explore'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getAllByTestId('lazy-modal-child').length).toBeGreaterThan(0)
  })

  it('Explore, Orders and Profile follow the theme (visibility bottom_nav.*); Home stays', () => {
    const hidden = themeWithValues((values) => {
      values.visibility['bottom_nav.browse'] = false
      values.visibility['bottom_nav.orders'] = false
      values.visibility['bottom_nav.profile'] = false
      return values
    })
    const themed = renderWithProviders(<NavigationBar />, { theme: hidden, initialEntries: ['/search'], routePath: '/search' })
    expect(themed.getByText('Home')).toBeInTheDocument()
    expect(themed.getByText('My cart')).toBeInTheDocument()
    expect(themed.queryByText('Explore')).toBeNull()
    expect(themed.queryByText('Orders')).toBeNull()
    expect(themed.queryByText('Profile')).toBeNull()
    themed.unmount()
    // the schema defaults show them
    const shown = renderWithProviders(<NavigationBar />, { theme: defaultTheme, initialEntries: ['/search'], routePath: '/search' })
    expect(shown.getByText('Explore')).toBeInTheDocument()
    expect(shown.getByText('Orders')).toBeInTheDocument()
    expect(shown.getByText('Profile')).toBeInTheDocument()
  })

  it('bottom_nav.cart: the theme hides My cart; the default shows it', () => {
    const hidden = themeWithValues((values) => {
      values.visibility['bottom_nav.cart'] = false
      return values
    })
    const themed = renderWithProviders(<NavigationBar />, { theme: hidden, initialEntries: ['/search'], routePath: '/search' })
    expect(themed.queryByText('My cart')).toBeNull()
    expect(themed.getByText('Home')).toBeInTheDocument()
    expect(themed.getByText('Orders')).toBeInTheDocument()
    themed.unmount()
    const shown = renderWithProviders(<NavigationBar />, { theme: defaultTheme, initialEntries: ['/search'], routePath: '/search' })
    expect(shown.getByText('My cart')).toBeInTheDocument()
  })

  it('its icons are the header\'s Lucide glyphs, decorative; the label names each option', () => {
    const { getByText } = renderWithProviders(<NavigationBar />, { initialEntries: ['/search'], routePath: '/search' })
    const glyphs = { Home: 'house', Explore: 'search', Orders: 'clipboard-list', 'My cart': 'shopping-cart', Profile: 'user' }
    Object.entries(glyphs).forEach(([label, glyph]) => {
      const option = getByText(label).closest('button')
      const svg = option.querySelector('svg')
      expect(svg, label).toHaveClass(`lucide-${glyph}`)
      expect(svg.getAttribute('aria-hidden'), label).toBe('true')
      expect(option.querySelectorAll('svg'), label).toHaveLength(1)
    })
  })
})
