import React from 'react'
import { describe, expect, it } from 'vitest'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { ListHeader, MessagesListingContainer, OrderCard, OrderListContainer, OrderListItems, Title, WrapperImage } from '../styles'

// The conversation cards fill the list (messages-order-list) at every width,
// no card cap that leaves an empty strip on large screens.
describe('MessagesListing layout', () => {
  it('the order card fills its list', () => {
    const { getByText } = renderWith(themeWithValues(), <OrderCard>card</OrderCard>)
    const css = cssFor(getByText('card'))
    expect(css).toContain('width:100%')
    expect(css).toContain('box-sizing:border-box')
    expect(css).not.toContain('max-width')
  })

  it('side by side, the list has its own width', () => {
    const { getByText } = renderWith(themeWithValues(), <OrderListItems>list</OrderListItems>)
    const css = cssFor(getByText('list'))
    expect(css).toMatch(/@media \(min-width:\s?1024px\)\{[^}]*flex:0 0 auto;width:min\(100%,\s?52ch\)/)
    expect(css).toMatch(/@media \(min-width:\s?1300px\)\{[^}]*width:min\(100%,\s?71ch\)/)
  })
})

// implementation notesno fixed px in the layout: the list column is a reading measure
// (ch), the card's floor a multiple of the theme's xl size, the logo box the
// theme's 3xs media level and the room under the header its measured height.
describe('MessagesListing fluid layout', () => {
  const flat = (css) => css.replace(/\s+/g, '')

  it('the inbox fills the room between the header and mobile navigation', () => {
    const { getByText } = renderWith(themeWithValues(), <MessagesListingContainer>box</MessagesListingContainer>)
    const css = flat(cssFor(getByText('box')))
    expect(css).toMatch(/--inbox-header-height:var\(--header-height,\d+px\);/)
    expect(css).toContain('height:calc(100dvh-var(--inbox-header-height)-var(--inbox-bottom-nav-height));')
    expect(css).toMatch(/@media\(width<576px\)\{[^}]*--inbox-bottom-nav-height:\d+px;/)
    expect(css).not.toContain('105px')
  })

  it('the card floor is 1.25 xl sizes (70px with the defaults)', () => {
    const { getByText } = renderWith(themeWithValues(), <OrderCard>card</OrderCard>)
    expect(flat(cssFor(getByText('card')))).toContain('min-height:calc(1.25*56px)')
  })

  it('the logo box of a card without content is the 3xs media level', () => {
    const { getByText } = renderWith(themeWithValues(), <WrapperImage hideContent>img</WrapperImage>)
    expect(flat(cssFor(getByText('img')))).toMatch(/max-width:70px;max-height:70px;height:70px;width:70px;/)
  })
})

// The inbox's title is the page title (section_header.variants.page title,
// the base's title_color), as /profile/orders, /favorite, /sessions…
describe('MessagesListing title', () => {
  it('the page title of components.section_header (title and title_color)', () => {
    const theme = themeWithValues((values) => {
      values.components.section_header.base = { ...values.components.section_header.base, title_color: '#0E0F10' }
      values.components.section_header.variants.page = { ...values.components.section_header.variants.page, title: { size: 41, line: 1.15, weight: 800 } }
      return values
    })
    const { getByText } = renderWith(theme, <Title>Messages</Title>)
    const css = cssFor(getByText('Messages')).replace(/\s+/g, '')
    expect(css).toMatch(/font-size:41px;line-height:1\.15;font-weight:800;[^}]*color:#0E0F10;/)
  })
})

// The inbox is in the box of the account pages
// (components.account_page), its title at the top of it as on the other
// account pages; the list's side room (focus outline) is outside the box.
describe('MessagesListing page box', () => {
  const flat = (css) => css.replace(/\s+/g, '')

  it('the container is the account pages\' box', () => {
    const theme = themeWithValues((values) => {
      values.components.account_page = { ...values.components.account_page, base: { ...values.components.account_page?.base, padding_top: 36, padding_bottom: 44, width: 70 } }
      return values
    })
    const { getByText } = renderWith(theme, <MessagesListingContainer>box</MessagesListingContainer>)
    const css = flat(cssFor(getByText('box')))
    expect(css).toMatch(/padding:36px\d+px44px;/)
    expect(css).toMatch(/@media\(min-width:769px\)\{[^}]*width:70%;/)
  })

  it('the header has no padding of its own (the title at the box\'s top), the title gap less the list\'s sm room under it', () => {
    const { getByText } = renderWith(themeWithValues(), <ListHeader>head</ListHeader>)
    const css = flat(cssFor(getByText('head')))
    expect(css).toMatch(/padding:016px;margin-bottom:calc\(24px-8px\);/)
    expect(css).not.toMatch(/[^-]height:/)
  })

  it('the list column reaches lg out of the box at its sides (at the start only, side by side); the list fills what is left', () => {
    const items = renderWith(themeWithValues(), <OrderListItems>items</OrderListItems>)
    const css = flat(cssFor(items.getByText('items')))
    expect(css).toMatch(/[^-]flex-direction:column;/)
    expect(css).toContain('margin-left:calc(-1*16px);margin-right:calc(-1*16px);')
    expect(css).toMatch(/@media\(min-width:1024px\)\{[^}]*margin-right:0;/)
    const list = renderWith(themeWithValues(), <OrderListContainer>rest</OrderListContainer>)
    expect(flat(cssFor(list.getByText('rest')))).toMatch(/[^-]flex:11auto;min-height:0;/)
  })
})
