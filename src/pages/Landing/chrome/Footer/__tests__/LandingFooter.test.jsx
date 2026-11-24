import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from 'react-router-dom'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../../../ui/src/styles/__tests__/themeTestUtils'
import { useStoreLanding } from '../../../useStoreLanding'
import { LandingFooter, profileUrl, whatsappUrl } from '../index'

// the site's footer pages (none here, so footer_html is the content): no request leaves the test
const pagesGet = vi.fn(() => Promise.resolve({ content: { error: false, result: [] } }))
vi.mock('~components/contexts/ApiContext', () => ({ useApi: () => [{ pages: () => ({ get: pagesGet }) }] }))

vi.mock('../../../useStoreLanding', async (importOriginal) => ({ ...(await importOriginal()), useStoreLanding: vi.fn() }))

const BUSINESS = {
  id: 7,
  name: 'Casa Lupita',
  logo: null,
  address: '14277 Kuykendahl Rd',
  phone: '(281) 555-0142',
  facebook_profile: 'https://facebook.com/casalupita',
  instagram_profile: '@casalupita',
  tiktok_profile: 'casalupita',
  whatsapp_number: '+1 (281) 555-0142'
}
const landing = (business) => ({ business: { data: business, loading: false, error: null, retry: () => {} } })
const theme = () => themeWithValues((values) => { values.site.experience = 'full_website' })
const draw = (t = theme(), props) => renderWithProviders(<LandingFooter store='casa-lupita' {...props} />, { theme: t })

beforeEach(() => useStoreLanding.mockReturnValue(landing(BUSINESS)))

describe('profileUrl / whatsappUrl', () => {
  it('a link as saved, a handle on the network, anything else nothing', () => {
    expect(profileUrl('facebook', 'https://facebook.com/x')).toBe('https://facebook.com/x')
    expect(profileUrl('instagram', '@casa.lupita')).toBe('https://www.instagram.com/casa.lupita')
    expect(profileUrl('tiktok', 'casa_lupita')).toBe('https://www.tiktok.com/@casa_lupita')
    expect(profileUrl('facebook', 'facebook.com/foo')).toBe('https://facebook.com/foo')
    expect(profileUrl('instagram', 'www.instagram.com/x')).toBe('https://www.instagram.com/x')
    expect(profileUrl('instagram', 'pizza.house')).toBe('https://www.instagram.com/pizza.house') // a handle with a dot
    expect(profileUrl('facebook', 'javascript:alert(1)')).toBeNull()
    expect(profileUrl('facebook', 'javascript://x.com/%0aalert(1)')).toBeNull()
    expect(profileUrl('facebook', 'ftp://facebook.com/x')).toBeNull()
    expect(profileUrl('facebook', 'two words')).toBeNull()
    expect(profileUrl('facebook', '')).toBeNull()
    expect(profileUrl('facebook', null)).toBeNull()
  })

  it('whatsapp: only the digits, wa.me', () => {
    expect(whatsappUrl('+1 (281) 555-0142')).toBe('https://wa.me/12815550142')
    expect(whatsappUrl('no number')).toBeNull()
    expect(whatsappUrl(undefined)).toBeNull()
  })
})

describe('LandingFooter', () => {
  it('reads only the business', () => {
    draw()
    expect(useStoreLanding).toHaveBeenLastCalledWith('casa-lupita', ['business'])
  })

  it('is the page\'s footer, painted as components.footer, with room of its own over the theme\'s padding', () => {
    const custom = themeWithValues((values) => {
      values.site.experience = 'full_website'
      Object.assign(values.components.footer.base, { padding_y: 24, padding_x: 16, border_top: { width: 1, color: '#DDDDDD', style: 'solid' } })
    })
    draw(custom)
    const css = cssFor(screen.getByRole('contentinfo')).replace(/\s+/g, '')
    expect(css).toContain('border-top:1pxsolid#DDDDDD')
    expect(css).toMatch(/padding:calc\(24px\+[^)]+\)calc\(16px\+[^)]+\)/)
  })

  it('the networks the store has, each a link named for it that opens apart', () => {
    draw()
    const links = Object.fromEntries(['Facebook', 'Instagram', 'TikTok', 'WhatsApp'].map((name) => [name, screen.getByRole('link', { name })]))
    expect(links.Facebook).toHaveAttribute('href', 'https://facebook.com/casalupita')
    expect(links.Instagram).toHaveAttribute('href', 'https://www.instagram.com/casalupita')
    expect(links.TikTok).toHaveAttribute('href', 'https://www.tiktok.com/@casalupita')
    expect(links.WhatsApp).toHaveAttribute('href', 'https://wa.me/12815550142')
    Object.values(links).forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link.getAttribute('rel')).toContain('noopener')
    })
  })

  it('only the networks it has', () => {
    useStoreLanding.mockReturnValue(landing({ ...BUSINESS, facebook_profile: '', tiktok_profile: null, whatsapp_number: '' }))
    draw()
    expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument()
    ;['Facebook', 'TikTok', 'WhatsApp'].forEach((name) => expect(screen.queryByRole('link', { name })).toBeNull())
  })

  it('no network at all: no row of them', () => {
    useStoreLanding.mockReturnValue(landing({ ...BUSINESS, facebook_profile: '', instagram_profile: '', tiktok_profile: '', whatsapp_number: '' }))
    draw()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('the address (to the map) and the phone (to call)', () => {
    draw()
    const address = screen.getByRole('link', { name: '14277 Kuykendahl Rd' })
    expect(address.getAttribute('href')).toContain('google.com/maps/search/?api=1&query=14277%20Kuykendahl%20Rd')
    expect(screen.getByRole('link', { name: '(281) 555-0142' })).toHaveAttribute('href', 'tel:2815550142')
  })

  it('a store with neither address nor phone has no Visit us column', () => {
    useStoreLanding.mockReturnValue(landing({ ...BUSINESS, address: '', phone: '', cellphone: '' }))
    draw()
    expect(screen.queryByRole('heading', { name: 'Visit us' })).toBeNull()
  })

  it('the name stands in for a missing logo; a logo is named by the store', () => {
    draw()
    expect(screen.getByText('Casa Lupita')).toBeInTheDocument()
    useStoreLanding.mockReturnValue(landing({ ...BUSINESS, logo: 'https://cdn.example.com/l.png' }))
    draw()
    expect(screen.getByRole('img', { name: 'Casa Lupita' })).toHaveAttribute('src', 'https://cdn.example.com/l.png')
  })

  it('brandName names the logo and stands in for a missing one, instead of the store\'s name', () => {
    draw(theme(), { brandName: 'Taco Group' })
    expect(screen.getByText('Taco Group')).toBeInTheDocument()
    expect(screen.queryByText('Casa Lupita')).toBeNull()
    useStoreLanding.mockReturnValue(landing({ ...BUSINESS, logo: 'https://cdn.example.com/l.png' }))
    draw(theme(), { brandName: 'Taco Group' })
    expect(screen.getByRole('img', { name: 'Taco Group' })).toBeInTheDocument()
  })

  it('locations: a column with the names, in the place of the single store\'s address and phone', () => {
    draw(theme(), { locations: ['Downtown', 'Tomball', 'Katy'] })
    const list = screen.getByRole('heading', { name: 'Our locations' }).parentElement
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Downtown', 'Tomball', 'Katy'])
    expect(screen.queryByRole('heading', { name: 'Visit us' })).toBeNull()
    expect(screen.queryByRole('link', { name: '(281) 555-0142' })).toBeNull()
  })

  it.each([[undefined], [[]]])('without locations (%j) it is the store\'s Visit us column, as before', (locations) => {
    draw(theme(), { locations })
    expect(screen.getByRole('heading', { name: 'Visit us' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Our locations' })).toBeNull()
  })

  it('Order online goes to the menu inside the app: /order with a full website', () => {
    renderWithProviders(<><LandingFooter store='casa-lupita' /><Route render={({ location }) => <output>{location.pathname}</output>} /></>, { theme: theme() })
    const order = screen.getByRole('link', { name: 'Order online' })
    expect(order).toHaveAttribute('href', '/order')
    expect(fireEvent.click(order)).toBe(false)
    expect(within(document.body).getByRole('status')).toHaveTextContent('/order')
  })

  it('carries the site\'s own footer content (footer_html, its legal links), inside the page\'s one footer', async () => {
    const { container } = draw(themeWithValues((values) => { values.site.footer_html = '<p><a href="/pages/privacy">Privacy</a></p>' }))
    await waitFor(() => expect(container).toHaveTextContent('Privacy'))
    expect(container.querySelectorAll('footer')).toHaveLength(1)
    expect(container.querySelector('footer a[href="/pages/privacy"]')).not.toBeNull()
  })

  it('hides as the app\'s footer does: pages.landing.footer, else visibility.footer', () => {
    expect(draw(themeWithValues((values) => { values.visibility.footer = false })).container.querySelector('footer')).toBeNull()
    const shown = themeWithValues((values) => { values.visibility.footer = false; values.pages.landing.footer = true })
    expect(draw(shown).container.querySelector('footer')).not.toBeNull()
    const hidden = themeWithValues((values) => { values.pages.landing.footer = false })
    expect(draw(hidden).container.querySelector('footer')).toBeNull()
  })
})
