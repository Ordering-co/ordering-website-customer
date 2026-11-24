import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from './themeTestUtils'
import { schemaDefault } from '~/utils/themeSchema'
import { PopupContent } from '../../components/Confirm/styles'
import { PopoverBody as CartPopoverBody } from '../../components/CartPopover/styles'
import { PopoverPanel } from '../../design-system/components/Popover'
import { SidebarContent as CartSidebarContent } from '../../components/CartSidebar/styles'
import { SidebarContent as SidebarMenuContent, MenuLink } from '../../components/SidebarMenu/styles'
import { CardContainer } from '../../components/SingleProductCard/styles'

// What floats over the page (windows, popovers, panels, sheets, menus) and
// the cards on it are of the surface; the page canvas is the background
const PAGE = '#FAFAFA'
const SURFACE = '#111111'
const theme = themeWithValues((values) => {
  values.tokens.color.background = PAGE
  values.tokens.color.surface = SURFACE
  values.components.modal.base.background = SURFACE
  values.components.menu.base.background = SURFACE
  values.components.cart.base.background = SURFACE
  values.components.sidebar_menu.base.background = SURFACE
  values.components.product_card.base.background = SURFACE
  return values
})
const cssOf = (Component) => cssFor(renderWith(theme, <Component data-testid='spot' />).getByTestId('spot'))

describe('the floating layers are of the surface, not of the page background', () => {
  it.each([
    ['the confirm dialog', PopupContent],
    ['the cart popover', CartPopoverBody],
    ['the cart side panel', CartSidebarContent],
    ['the side menu', SidebarMenuContent],
    ['a product card', CardContainer]
  ])('%s', (_, Component) => {
    const css = cssOf(Component)
    expect(css).toContain(SURFACE)
    expect(css).not.toContain(PAGE)
  })

  it('the categories popover uses the menu surface', () => {
    const { getByTestId } = renderWith(theme, <PopoverPanel variant='arrow' data-testid='spot' />)
    const panel = getByTestId('spot')
    expect(panel.style.getPropertyValue('--ui-menu-background')).toBe(SURFACE)
    expect(panel.className).toContain('ui:bg-(--ui-menu-background)')
  })

  it('an option of the side menu shows the panel through (no background of its own)', () => {
    const css = cssOf(MenuLink)
    expect(css).toContain('background:transparent')
    expect(css).not.toContain(PAGE)
  })
})

describe('the schema', () => {
  it('the modal, the side menu, the menus and the cart footer default to the surface', () => {
    expect(schemaDefault('components.modal.base.background')).toBe('{color.surface}')
    expect(schemaDefault('components.sidebar_menu.base.background')).toBe('{color.surface}')
    expect(schemaDefault('components.menu.base.background')).toBe('{color.surface}')
    expect(schemaDefault('components.cart.base.footer_background')).toBe('{color.surface}')
  })

  it('has no raised surface token', () => {
    expect(schemaDefault('tokens.color.surface_raised')).toBeUndefined()
  })
})
