import React from 'react'
import { describe, it, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import { AddressMenu, InnerHeader, LanguageSelectorWrapper, LogoHeaderName, MomentMenu, Menu } from '../styles'
import { Container as HeaderOptionBox } from '../../HeaderOption/styles'
import { injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// A theme with its own side space of the inputs, page side space and
// header gap
const theme = themeWithValues((values) => {
  values.components.input.base.padding_x = 24
  values.tokens.space.xs = 6
  values.tokens.layout.page_gutter = 28
  values.components.header.base.gap = 12
  return values
})

// The CSS (no spaces) and the generated class of the part
const styleOf = (t, ui) => {
  cleanup()
  const { getByTestId } = renderWith(t, ui)
  const element = getByTestId('part')
  return { css: injectedCss().replace(/\s+/g, ''), cls: [...element.classList].pop(), element }
}

describe('the header selects: their side space is the inputs\' (components.input.base.padding_x)', () => {
  it('the moment of the tablet row', () => {
    const option = styleOf(theme, <HeaderOptionBox data-testid='part' variant='moment'>ASAP</HeaderOptionBox>)
    expect(option.element.style.getPropertyValue('--ui-input-padding-x')).toBe('24px')
  })

  // The language is a base Select (`size` of the slot): the wrapper only places
  // it, it no longer reaches into the piece through its `#select-input` id
  it('the language wrapper only places the select (margin xs on its start side), with no rule on the piece', () => {
    const language = styleOf(theme, <LanguageSelectorWrapper data-testid='part'><div id='select-input'><div>EN</div></div></LanguageSelectorWrapper>)
    expect(language.css).toContain('margin-inline-start:var(--ot-space-xs);')
    // its end edge is the page's side: no margin there
    expect(language.css).not.toMatch(/margin-inline:|margin-inline-end:|margin-right:/)
    expect(language.css).not.toContain('#select-input')
  })

  // implementation noteswith one language the select paints nothing; the empty wrapper
  // must not keep its margin + the Menu's gap (it pushed the cart 24px inward)
  it('an empty language wrapper takes no space (display none)', () => {
    const empty = styleOf(theme, <LanguageSelectorWrapper data-testid='part' />)
    expect(empty.element).toBeEmptyDOMElement()
    expect(empty.css).toContain('.' + empty.cls + ':empty{display:none;}')
  })
})

describe('the header\'s brand and moment column are fluid (no fixed px)', () => {
  it('the moment column is in ch and the text brand is capped at a share of its row', () => {
    const { css } = styleOf(theme, <Menu data-testid='part' />)
    expect(css).toMatch(/\.moment-popover\{[^}]*width:24ch;/)
    expect(css).not.toMatch(/\.moment-popover\{[^}]*width:\d+px/)
    const brand = styleOf(theme, <LogoHeaderName data-testid='part'>Shop</LogoHeaderName>)
    expect(brand.css).toContain('max-width:min(100%,26ch);')
  })
})

// implementation notesthe header's moment, inside the order context capsule, no
// longer carries its own field box (the capsule's is) — its side space is
// space.xs, not the input's padding_x
describe('the header\'s moment: no box of its own, the capsule\'s is', () => {
  it('its side space is tokens.space.xs', () => {
    const moment = styleOf(theme, <MomentMenu data-testid='part'><div>ASAP</div></MomentMenu>)
    expect(moment.element).toHaveClass('ui:[&>div]:px-xs')
  })
})

// implementation notesASAP reads like the tabs it sits beside: the inactive color of
// the variant the order type tabs take (header.slots.order_type, else the theme's)
describe('the header\'s moment: the inactive tabs\' color', () => {
  const moment = (t) => styleOf(t, <MomentMenu data-testid='part'><div>ASAP</div></MomentMenu>)
  const colored = (variant, slotVariant) => themeWithValues((values) => {
    values.components.tabs.base.variant = variant
    values.components.tabs.variants.pill.inactive = '#111111'
    values.components.tabs.variants.underline.inactive = '#222222'
    values.components.tabs.variants.plain.inactive = '#333333'
    if (slotVariant) values.components.header.slots = { ...values.components.header.slots, order_type: { variant: slotVariant } }
    return values
  })

  it('the theme\'s tabs variant, not the field\'s text color', () => {
    const m = moment(colored('underline'))
    expect(m.element.style.getPropertyValue('--ui-capsule-inactive-color')).toBe('#222222')
  })

  it('the variant the order type slot chooses wins', () => {
    const m = moment(colored('underline', 'plain'))
    expect(m.element.style.getPropertyValue('--ui-capsule-inactive-color')).toBe('#333333')
  })
})

describe('the rows of the header', () => {
  it('up to 768px the order context the row has sits in it, between the logo and the right side (no row of its own)', () => {
    const { css, cls } = styleOf(theme, <InnerHeader data-testid='part' />)
    expect(css).toMatch(new RegExp(`\\.${cls}#center-side\\{[^}]*flex:01auto;[^}]*width:auto;min-width:0;margin:0;\\}`))
    expect(css).not.toMatch(/order:3/)
  })

  it('without menu button and logo, the order options start at the page\'s side (from 769px; logo on the right, so not centered)', () => {
    const logoRight = themeWithValues((values) => {
      values.tokens.layout.page_gutter = 28
      values.components.header.base.logo_position = 'right'
      return values
    })
    const { css, cls } = styleOf(logoRight, <InnerHeader data-testid='part' />)
    expect(css).toContain(`.${cls}#left-side:empty+#center-side{margin-left:28px;}`)
  })
})

// The address of the order context capsule is a button with no box of its own,
// like the moment: without the reset the browser's grey fill and outset border show
describe('the header\'s address in the capsule: no browser button box', () => {
  it('has no border nor background of its own (the capsule paints them)', () => {
    const address = styleOf(theme, <AddressMenu data-testid='part'><span>What&apos;s your address?</span></AddressMenu>)
    expect(address.element).toHaveClass('ui:border-none', 'ui:bg-transparent')
  })
})
