import React from 'react'
import { describe, it, expect } from 'vitest'
import { CustomerInfo, MenuLink, MenuLinkIcon, SidebarContent, TextInfo, WrappContent, sidebarOverlayColor, sidebarPanelWidth, sidebarShowsIcons, sidebarShowsTitles } from '../styles'
import { cssFor, injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

const theme = (mutate = () => {}) => themeWithValues((values) => {
  const base = values.components.sidebar_menu.base
  base.background = '#FAFAFA'
  base.border = { width: 1, color: '#123456', style: 'solid' }
  base.shadow = { x: 2, y: 2, blur: 0, spread: 0, color: '#000000', opacity: 1 }
  base.item_color = '#111111'
  base.item_active = '#FF5500'
  base.item_danger = '#E63757'
  base.item_hover = '#EEEEEE'
  base.item_radius = 6
  base.icon_size = 24
  base.icon_color = '#222222'
  base.header_text = { size: 26, line: 1.23, weight: 700 }
  base.header_color = '#333333'
  base.item_border = { width: 1, color: '#ABCDEF', style: 'solid' }
  mutate(base)
  return values
})

describe('sidebar menu (components.sidebar_menu)', () => {
  it('the panel: its background, its border and shadow only toward the page', () => {
    const { getByText } = renderWith(theme(), <SidebarContent $open>Menu</SidebarContent>)
    const css = cssFor(getByText('Menu'))
    expect(css).toContain('background-color:#FAFAFA')
    expect(css).toContain('border-right:1px solid #123456')
    expect(css).toContain('box-shadow:2px 0px 0px 0px')
  })

  it('a closed panel shows neither border nor shadow', () => {
    const { getByText } = renderWith(theme(), <SidebarContent>Menu</SidebarContent>)
    const css = cssFor(getByText('Menu'))
    expect(css).toMatch(/box-shadow:none;border:none;/)
  })

  it('options: their colors (active, Logout\'s danger), still hover', () => {
    const { getByText } = renderWith(theme(), (
      <MenuLink>
        <TextInfo>Home</TextInfo>
        <TextInfo active>Orders</TextInfo>
        <TextInfo $danger>Logout</TextInfo>
      </MenuLink>
    ))
    expect(cssFor(getByText('Home'))).toContain('color:#111111')
    expect(cssFor(getByText('Orders'))).toContain('color:#FF5500')
    expect(getByText('Orders')).toHaveAttribute('data-active', 'true')
    expect(cssFor(getByText('Logout'))).toContain('color:#E63757')
    const link = cssFor(getByText('Home').parentElement)
    // full (the default): no radius
    expect(link).toContain('border-radius:0')
    expect(link).toContain('background:#EEEEEE')
    expect(link).toContain('transform:none')
  })

  it('a nav label wraps to two lines before it is cut, never on one line with "…"; its text is the title', () => {
    const { getByText } = renderWith(theme(), <TextInfo>Browse &amp; Search</TextInfo>)
    const el = getByText('Browse & Search')
    expect(el.getAttribute('title')).toBe('Browse & Search')
    const css = cssFor(el).replace(/\s+/g, '')
    expect(css).toMatch(/-webkit-line-clamp:2;/)
    expect(css).toMatch(/overflow-wrap:anywhere;/)
    expect(css).not.toMatch(/white-space:nowrap/)
  })

  it('Logout (danger): its text and icon in the danger color', () => {
    const { getByText } = renderWith(theme(), (
      <MenuLink>
        <MenuLinkIcon $danger>icon</MenuLinkIcon>
        <TextInfo $danger>Logout</TextInfo>
      </MenuLink>
    ))
    expect(cssFor(getByText('icon'))).toContain('color:#E63757')
    expect(cssFor(getByText('Logout'))).toContain('color:#E63757')
  })

  it('the header row is as the header: its height (with its border), bottom border and shadow', () => {
    const withHeader = themeWithValues((values) => {
      values.components.header.base.height = 70
      values.components.header.base.border_bottom = { width: 1, color: '#2F3032', style: 'solid' }
      values.components.header.base.shadow = { x: 2, y: 2, blur: 0, spread: 0, color: '#000000', opacity: 1 }
      return values
    })
    const { getByText } = renderWith(withHeader, <CustomerInfo><p>Hi</p></CustomerInfo>)
    const row = getByText('Hi').parentElement
    const generated = [...row.classList].filter((name) => name !== 'sidebar-header').pop()
    const css = injectedCss().split('}').filter((rule) => rule.includes(`.${generated}`)).join('}')
    expect(css).toContain('min-height:71px')
    expect(css).toContain('border-bottom:1px solid #2F3032')
    expect(css).toContain('box-shadow:0px 2px 0px 0px')
  })

  it('the greeting is the header (header_text, header_color), not a title', () => {
    const { getByText } = renderWith(theme(), <CustomerInfo><p>Hi Ana</p></CustomerInfo>)
    const css = cssFor(getByText('Hi Ana'))
    expect(css).toContain('font-size:26px')
    expect(css).toContain('color:#333333')
  })

  it('each option has item_border (above and below); no separators', () => {
    const { getByText } = renderWith(theme(), <><MenuLink>Opt</MenuLink><MenuLink>Next</MenuLink></>)
    const css = cssFor(getByText('Opt'))
    // the whole width: above and below only, one line between two options
    expect(css).toContain('border-top:1px solid #ABCDEF')
    expect(css).toContain('border-bottom:1px solid #ABCDEF')
    expect(css).not.toContain('border:1px solid #ABCDEF')
    // an option right after another has no top border
    const optionClass = [...getByText('Next').classList].find((name) => name.startsWith('MenuLink-sc-'))
    expect(injectedCss()).toContain(`.${optionClass} + .${optionClass}{border-top:none;}`)
  })

  it('full options: no radius; inset: boxes in the sides, of their radius and whole border, 8px apart', () => {
    const { getByText } = renderWith(theme(), <MenuLink>Full</MenuLink>)
    const full = cssFor(getByText('Full'))
    expect(full).toContain('border-radius:0')
    expect(full).not.toContain('border-radius:6px')
    const { getByText: get } = renderWith(theme((base) => { base.item_style = 'inset' }), <MenuLink>Inset</MenuLink>)
    const inset = cssFor(get('Inset'))
    expect(inset).toContain('border-radius:6px')
    expect(inset).toContain('border:1px solid #ABCDEF')
    expect(inset).toContain('margin:8px 20px 0')
  })

  it('icons: their size and color; hidden with show_icons false', () => {
    const { getByText } = renderWith(theme(), <MenuLinkIcon>i</MenuLinkIcon>)
    const css = cssFor(getByText('i'))
    expect(css).toContain('width:24px')
    expect(css).toContain('color:#222222')
    const hidden = theme((base) => { base.show_icons = false })
    expect(sidebarShowsIcons(hidden)).toBe(false)
    const { getByText: get } = renderWith(hidden, <MenuLinkIcon>j</MenuLinkIcon>)
    expect(cssFor(get('j'))).toContain('display:none')
  })

  it('overlay: none while transparent', () => {
    expect(sidebarOverlayColor(theme((base) => { base.overlay = 'transparent' }))).toBeNull()
    expect(sidebarOverlayColor(theme((base) => { base.overlay = 'rgba(0,0,0,0)' }))).toBeNull()
    expect(sidebarOverlayColor(theme((base) => { base.overlay = '#00000000' }))).toBeNull()
    expect(sidebarOverlayColor(theme((base) => { base.overlay = 'rgba(0,0,0,0.5)' }))).toBe('rgba(0,0,0,0.5)')
  })

  it('the defaults: no overlay nor border, the icons shown', () => {
    expect(sidebarOverlayColor(themeWithValues())).toBeNull()
    expect(sidebarShowsIcons(themeWithValues())).toBe(true)
    const { getByText } = renderWith(themeWithValues(), <SidebarContent $open>Menu</SidebarContent>)
    expect(cssFor(getByText('Menu'))).not.toContain('border-right')
  })

  it('the panel\'s width (width): the open panel and its options; 340px by default', () => {
    expect(sidebarPanelWidth(theme((base) => { base.width = 420 }))).toBe('420px')
    expect(sidebarPanelWidth(themeWithValues())).toBe('340px')
    const themed = renderWith(theme((base) => { base.width = 420 }), <WrappContent>Option</WrappContent>)
    expect(cssFor(themed.getByText('Option'))).toMatch(/@media \(min-width:489px\)\{[^}]*max-width:420px/)
    const byDefault = renderWith(themeWithValues(), <WrappContent>Old</WrappContent>)
    expect(cssFor(byDefault.getByText('Old'))).toMatch(/@media \(min-width:489px\)\{[^}]*max-width:340px/)
  })

  it('show_titles: true by default', () => {
    expect(sidebarShowsTitles(themeWithValues())).toBe(true)
    expect(sidebarShowsTitles(theme((base) => { base.show_titles = false }))).toBe(false)
  })
})
