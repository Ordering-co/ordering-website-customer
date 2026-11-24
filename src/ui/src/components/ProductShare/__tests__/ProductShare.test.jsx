import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { THEMES } from '~ui/src/design-system/preview/themes'
import { LEGACY_LAYERS } from '~ui/src/styles/Rules'
import { ProductShare } from '../index'
import { defaultTheme } from '../../../styles/__tests__/themeTestUtils'

const updateShowValue = vi.hoisted(() => vi.fn())
const controllerProps = vi.hoisted(() => ({ showShareButton: false }))

vi.mock('../ProductCopyURL', () => ({
  ProductCopyURL: () => <div data-testid='copy-url' />
}))

vi.mock('~components/components/ProductShare', () => ({
  ProductShare: ({ UIComponent, ...rest }) => (
    <UIComponent
      urlToShare='https://example.com/product/1'
      showShareButton={controllerProps.showShareButton}
      updateShowValue={updateShowValue}
      product={{ id: 1, name: 'Burger' }}
      {...rest}
    />
  )
}))

const [, grill, cafe] = THEMES.map(({ theme }) => theme)
const render = (ui = <ProductShare />, options) => renderWithProviders(ui, options)
const kitOf = (container) => container.querySelector('.a2a_kit')

describe('ProductShare', () => {
  it('the share toggle is a button named Share that opens, then closes, the menu', () => {
    updateShowValue.mockClear()
    controllerProps.showShareButton = false
    const closed = render()
    const toggle = closed.getByRole('button', { name: 'Share' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(updateShowValue).toHaveBeenLastCalledWith(true)
    closed.unmount()

    controllerProps.showShareButton = true
    const open = render()
    expect(open.getByRole('button', { name: 'Share' })).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(open.getByRole('button', { name: 'Share' }))
    expect(updateShowValue).toHaveBeenLastCalledWith(false)
  })

  it('the menu sits on its legacy layer (LEGACY_LAYERS.shareMenu), over the product image and its gallery arrows', () => {
    const { container } = render()
    expect(getComputedStyle(kitOf(container).parentElement).zIndex).toBe(String(LEGACY_LAYERS.shareMenu))
  })

  it('the menu keeps AddToAny\'s contract: the kit, the product\'s URL, one button per network and the "+"', () => {
    const { container } = render()
    const kit = kitOf(container)
    expect(kit).toHaveClass('a2a_kit', 'a2a_kit_size_32', 'a2a_vertical_style')
    expect(kit).toHaveAttribute('data-a2a-url', 'https://example.com/product/1')
    ;['a2a_button_facebook', 'a2a_button_whatsapp', 'a2a_button_twitter', 'a2a_button_email', 'a2a_dd'].forEach((name) => {
      expect(kit.querySelector(`a.${name}`)).not.toBeNull()
    })
    expect(kit.querySelector('a.a2a_dd')).toHaveAttribute('href', 'https://www.addtoany.com/share')
    // the copy button first, then the five of AddToAny, in the order they had
    expect(Array.from(kit.children).map((child) => child.tagName)).toEqual(['BUTTON', 'A', 'A', 'A', 'A', 'A'])
  })

  it('every button of the menu has a name: the copy button and each network (their text is i18n)', () => {
    const { container, getByRole } = render()
    const kit = kitOf(container)
    // the copy link is a real button, named by what it does
    expect(getByRole('button', { name: 'Copy URL' }).tagName).toBe('BUTTON')
    expect(Array.from(kit.querySelectorAll('a')).map((link) => link.getAttribute('aria-label'))).toEqual([
      'Share on Facebook', 'Share on WhatsApp', 'Share on Twitter', 'Share by email', 'More sharing options'
    ])
  })

  it('the menu is hidden while closed, and stays in the DOM (AddToAny needs it to run)', () => {
    controllerProps.showShareButton = false
    const closed = render()
    expect(window.getComputedStyle(kitOf(closed.container)).visibility).toBe('hidden')
    closed.unmount()
    controllerProps.showShareButton = true
    const open = render()
    expect(window.getComputedStyle(kitOf(open.container)).visibility).toBe('visible')
  })

  it('a click outside closes it; one inside does not', () => {
    updateShowValue.mockClear()
    const { getByRole, container } = render()
    fireEvent.mouseUp(getByRole('button', { name: 'Share' }))
    fireEvent.mouseUp(kitOf(container))
    expect(updateShowValue).not.toHaveBeenCalled()
    fireEvent.mouseUp(document.body)
    expect(updateShowValue).toHaveBeenCalledWith(false)
  })

  it('the copy button opens the copy window, a Dialog named Copy URL that Escape closes', async () => {
    const { getByRole, queryByRole, findByRole, getByTestId } = render()
    expect(queryByRole('dialog')).toBeNull()
    fireEvent.click(getByRole('button', { name: 'Copy URL' }))
    const dialog = await findByRole('dialog', { name: 'Copy URL' })
    expect(dialog).toHaveAttribute('data-slot', 'dialog-content')
    expect(dialog).toContainElement(getByTestId('copy-url'))
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  it('the copy window takes the Dialog\'s md size, not a fixed 650px', async () => {
    const { getByRole, findByRole } = render()
    fireEvent.click(getByRole('button', { name: 'Copy URL' }))
    await findByRole('dialog', { name: 'Copy URL' })
    const width = document.querySelector('[style*="--ui-modal-width"]').style.getPropertyValue('--ui-modal-width')
    expect(width).not.toBe('650px')
    expect(width).toBe(componentVars(defaultTheme, 'modal', { size: 'md' })['--ui-modal-width'])
  })

  it('AddToAny\'s buttons keep a 44px touch target on a phone and with a coarse pointer', () => {
    render()
    const css = [...document.querySelectorAll('style')].map((style) => style.textContent).join('').replace(/\s+/g, '')
    expect(css).toMatch(/@media\(max-width:575px\),\(pointer:coarse\)\{[^}]*::after\{[^}]*min-width:44px;min-height:44px/)
  })

  it('the icons are the design system\'s: Lucide on Buttons of the theme (icon shape, aria-hidden)', () => {
    const { getByRole } = render(<ProductShare />, { theme: grill })
    const share = getByRole('button', { name: 'Share' })
    const copy = getByRole('button', { name: 'Copy URL' })
    expect(share.querySelector('svg.lucide-share-2')).toHaveAttribute('aria-hidden', 'true')
    expect(copy.querySelector('svg.lucide-link')).not.toBeNull()
    ;[share, copy].forEach((button) => {
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button.style.getPropertyValue('--ui-button-height')).toBe(componentVars(grill, 'button', { size: 'md', shape: 'icon' })['--ui-button-height'])
    })
  })

  it('AddToAny\'s buttons take the box of the icon button, in each theme (the Button\'s own height and radius)', () => {
    ;[grill, cafe].forEach((theme) => {
      const { container, unmount } = render(<ProductShare />, { theme })
      const { '--ui-button-height': height, '--ui-button-radius': radius } = componentVars(theme, 'button', { size: 'md', shape: 'icon' })
      const link = kitOf(container).querySelector('a')
      const box = window.getComputedStyle(link)
      expect([box.width, box.height, box.borderRadius]).toEqual([height, height, radius])
      unmount()
    })
  })

  it('it reads the theme in scope: inside a group it changes, the menu follows the group\'s button (not the header\'s by itself)', () => {
    const own = render(<ProductShare />, { theme: grill })
    const global = componentVars(grill, 'button', { size: 'md', shape: 'icon' })
    expect(own.getByRole('button', { name: 'Share' }).style.getPropertyValue('--ui-button-height')).toBe(global['--ui-button-height'])
    own.unmount()
    const scoped = render(<ComponentScope group='header'><ProductShare /></ComponentScope>, { theme: grill })
    // the grill theme's header group has its own, smaller button
    const header = scoped.getByRole('button', { name: 'Share' }).style.getPropertyValue('--ui-button-height')
    expect(header).not.toBe(global['--ui-button-height'])
  })
})
