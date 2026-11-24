import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { EmptyStateArt, NotFoundSource } from '../index'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

describe('NotFoundSource', () => {
  it('renders not-found content and action button', () => {
    const onClickButton = vi.fn()
    const { getByText } = renderWithProviders(
      <NotFoundSource content='Nothing here' btnTitle='Go back' onClickButton={onClickButton} />
    )
    fireEvent.click(getByText('Go back'))
    expect(getByText('Nothing here')).toBeInTheDocument()
    expect(onClickButton).toHaveBeenCalled()
  })

  it('its message is an h3 by default, or the heading level it is given', () => {
    const { getByText, unmount } = renderWithProviders(<NotFoundSource content='Default' />)
    expect(getByText('Default').tagName).toBe('H3')
    unmount()
    const { getByText: get2 } = renderWithProviders(<NotFoundSource content='Page' headingLevel='h1' />)
    expect(get2('Page').tagName).toBe('H1')
    expect(get2('Page')).toHaveClass('not-found-title')
  })
})

// A theme whose empty.not_found is empty (no bundle image either)
const imageless = (mutate) => {
  const theme = themeWithValues(mutate)
  theme.values.images['empty.not_found'] = ''
  return theme
}

describe('NotFoundSource — images of the theme', () => {
  const NF = 'https://cdn.test/not-found.png'
  const ADDR = 'https://cdn.test/no-addresses.png'
  const withImages = (images) => themeWithValues((values) => ({ ...values, images: { ...values.images, ...images } }))

  it('paints the image it is given in place of the icon, alt empty next to its message', () => {
    const { container } = renderWithProviders(
      <NotFoundSource variant='empty' image={ADDR} content='No addresses' />,
      { theme: withImages({ 'empty.not_found': NF }) }
    )
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', ADDR)
    expect(img).toHaveAttribute('alt', '')
    expect(container.querySelector('#not-found-source').firstElementChild).toBe(img)
    // a square box of components.empty_state image_size (its mobile_web
    // value below 768px), the image contained in it, never wider than its column
    const css = cssFor(img).replace(/\s+/g, '')
    expect(css).toContain('max-width:100%;object-fit:contain')
    expect(css).toMatch(/\{width:240px;height:240px;margin-bottom:24px;\}/)
    expect(css).toMatch(/@media\(max-width:767px\)\{[^{]*\{width:160px;height:160px;margin-bottom:16px;/)
    expect(css).not.toContain('300px')
  })

  it('the box stands over a container\'s own img rule (doubled class)', () => {
    const { container } = renderWithProviders(
      <NotFoundSource variant='empty' image={ADDR} content='No addresses' />,
      { theme: withImages({}) }
    )
    const img = container.querySelector('img')
    const cls = img.className.split(' ').pop()
    expect(cssFor(img)).toContain(`.${cls}.${cls}{`)
  })

  it('compact (a section\'s empty state): its variant (no page height, lg padding, the small image box) at every width', () => {
    const { container } = renderWithProviders(
      <NotFoundSource variant='empty' compact image={ADDR} content='No active orders' />,
      { theme: withImages({}) }
    )
    const box = container.querySelector('#not-found-source')
    const css = cssFor(box).replace(/\s+/g, '')
    expect(css).toMatch(/margin-top:0px;margin-bottom:0px;padding:16px0px;min-height:0px;/)
    expect(css).toMatch(/>img\{width:160px;height:160px;margin-bottom:16px;/)
  })

  it('an id of its own when it is given one (a page with several)', () => {
    const { container } = renderWithProviders(
      <NotFoundSource variant='empty' id='orders-empty-active' content='Nothing' />,
      { theme: themeWithValues() }
    )
    expect(container.querySelector('#orders-empty-active')).not.toBeNull()
    expect(container.querySelector('#not-found-source')).toBeNull()
  })

  it('without an image of its own, the theme\'s empty.not_found (both variants)', () => {
    const theme = withImages({ 'empty.not_found': NF })
    const { container, unmount } = renderWithProviders(<NotFoundSource content='Nothing' />, { theme })
    expect(container.querySelector('img')).toHaveAttribute('src', NF)
    unmount()
    const { container: c2 } = renderWithProviders(<NotFoundSource variant='empty' imageAlt='No results' />, { theme })
    // no message beside it: the alt it is given
    expect(c2.querySelector('img')).toHaveAttribute('alt', 'No results')
  })

  it('the icon without an image: its circle and icon of empty_state (icon_box_size, icon_size), the mobile_web ones below 768px', () => {
    const theme = imageless((values) => {
      values.components.empty_state.base.icon_box_size = 90
      values.components.empty_state.base.icon_size = 40
      values.platforms.mobile_web.components.empty_state.base.icon_box_size = 70
      values.platforms.mobile_web.components.empty_state.base.icon_size = 30
    })
    const { container } = renderWithProviders(<NotFoundSource variant='empty' content='Nothing' />, { theme })
    const css = cssFor(container.querySelector('#not-found-source').firstElementChild).replace(/\s+/g, '')
    expect(css).toMatch(/\{width:90px;height:90px;\}[^@]*svg\{width:40px;height:40px;\}/)
    expect(css).toMatch(/@media\(max-width:767px\)\{[^}]*\{width:70px;height:70px;\}[^}]*svg\{width:30px;height:30px;/)
    expect(css).not.toMatch(/width:(72|96|32|44)px/)
  })

  it('without any image (neither the theme\'s nor the bundle\'s): the icon', () => {
    const { container } = renderWithProviders(<NotFoundSource variant='empty' content='Nothing' />, { theme: imageless() })
    expect(container.querySelector('img')).toBeNull()
    // the icon's box (EmptyIcon / NotFoundImage) leads, as today
    expect(container.querySelector('#not-found-source').firstElementChild.tagName).toBe('DIV')
  })
})

describe('NotFoundSource — icon', () => {
  const imageless = (mutate) => {
    const theme = themeWithValues(mutate)
    theme.values.images['empty.not_found'] = ''
    return theme
  }

  it('its default icon is bag for empty, signpost for notFound', () => {
    const { container, unmount } = renderWithProviders(
      <NotFoundSource variant='empty' content='Nothing' />,
      { theme: imageless() }
    )
    expect(container.querySelector('svg.lucide-shopping-bag')).toBeInTheDocument()
    unmount()
    const { container: container2 } = renderWithProviders(
      <NotFoundSource content='Nothing' />,
      { theme: imageless() }
    )
    expect(container2.querySelector('svg.lucide-signpost')).toBeInTheDocument()
  })

  it('`icon` is a key of the registry, read directly (no mapping of its own)', () => {
    const { container } = renderWithProviders(
      <NotFoundSource variant='empty' icon='star' content='No reviews' />,
      { theme: imageless() }
    )
    expect(container.querySelector('svg.lucide-star')).toBeInTheDocument()
  })

  it('a theme image still wins over `icon`', () => {
    const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, 'empty.not_found': 'https://cdn.test/not-found.png' } }))
    const { container } = renderWithProviders(
      <NotFoundSource variant='empty' icon='star' content='No reviews' />,
      { theme }
    )
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/not-found.png')
    expect(container.querySelector('svg.lucide-star')).toBeNull()
  })
})

describe('EmptyStateArt (the empty states that keep their own layout)', () => {
  const NF = 'https://cdn.test/not-found.png'
  const OWN = 'https://cdn.test/own.png'
  const withImages = (images) => themeWithValues((values) => ({ ...values, images: { ...values.images, ...images } }))
  const Fallback = () => <span data-testid='icon' />

  it('its own image, else empty.not_found, in the box of the empty states', () => {
    const { container, unmount } = renderWithProviders(<EmptyStateArt image={OWN}><Fallback /></EmptyStateArt>, { theme: withImages({ 'empty.not_found': NF }) })
    expect(container.querySelector('img')).toHaveAttribute('src', OWN)
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
    expect(container.querySelector('[data-testid="icon"]')).toBeNull()
    unmount()
    const { container: c2 } = renderWithProviders(<EmptyStateArt><Fallback /></EmptyStateArt>, { theme: withImages({ 'empty.not_found': NF }) })
    expect(c2.querySelector('img')).toHaveAttribute('src', NF)
  })

  it('without any image: its children (the icon it had)', () => {
    const { container } = renderWithProviders(<EmptyStateArt><Fallback /></EmptyStateArt>, { theme: imageless() })
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-testid="icon"]')).not.toBeNull()
  })
})
