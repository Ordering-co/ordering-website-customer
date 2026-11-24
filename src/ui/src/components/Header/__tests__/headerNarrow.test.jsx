import React from 'react'
import { describe, it, expect } from 'vitest'
import { Header, HeaderStoreSlot, InnerHeader, LeftHeader, LeftSide, LogoHeader, LogoHeaderName, OrderContextChipBox } from '../styles'
import { injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

const theme = themeWithValues()

// The header's row up to 768px: the right side's controls (map pin, cart,
// language) never overflow onto the logo. Returns the CSS (no spaces) and
// the generated class of each part
const narrowHeader = (t) => {
  const { getByTestId } = renderWith(t, (
    <InnerHeader data-testid='row'>
      <LeftSide data-testid='left'>
        <div id='left-side'>
          <LogoHeader data-testid='logo'><img alt='Logo' src='/logo.png' /></LogoHeader>
        </div>
        <div id='center-side'>Delivery</div>
      </LeftSide>
      <div id='right-side'>Cart</div>
    </InnerHeader>
  ))
  const classOf = (id) => [...getByTestId(id).classList].pop()
  return { css: injectedCss().replace(/\s+/g, ''), row: classOf('row'), left: classOf('left'), logo: [...getByTestId('logo').parentElement.classList].pop() }
}

describe('the header up to 768px', () => {
  it('the right side is as wide as its controls, the left side takes the rest', () => {
    const { css, row, left } = narrowHeader(theme)
    expect(css).toContain(`.${row}#right-side{width:auto;`)
    expect(css).toMatch(new RegExp(`\\.${row}#left-side\\{width:auto;[^}]*flex:110%;min-width:0;\\}`))
    expect(css).toMatch(new RegExp(`\\.${row}\\{[^}]*flex-wrap:wrap;`))
    // the left side's parts are laid out by the header's row
    expect(css).toContain(`.${left}{display:contents;}`)
  })

  it('the order context the row has stays in it, as wide as its controls', () => {
    const { css, row } = narrowHeader(theme)
    expect(css).toMatch(new RegExp(`\\.${row}#center-side\\{[^}]*flex:01auto;[^}]*width:auto;min-width:0;margin:0;\\}`))
  })

  it('the logo is never wider than the room it has', () => {
    const { css, logo } = narrowHeader(theme)
    expect(css).toMatch(new RegExp(`\\.${logo}img\\{max-width:min\\(200px,calc\\(100%-\\d+px\\)\\);\\}`))
  })
})

describe('the site name without a logo', () => {
  const nameCss = () => {
    const { getByTestId } = renderWith(theme, <LogoHeaderName data-testid='name' title='Nabe & Don 日式简餐'>Nabe & Don 日式简餐</LogoHeaderName>)
    return { css: injectedCss().replace(/\s+/g, ''), name: [...getByTestId('name').classList].pop() }
  }

  // implementation notesat 360px, scrolled, beside the order context chip the name read "Cha / Sha"
  it('is one line cut with "…", never two lines: the room the chip leaves is not enough for a wrap', () => {
    const { css, name } = nameCss()
    expect(css).toMatch(new RegExp(`\\.${name}\\{[^}]*white-space:nowrap`))
    expect(css).toMatch(new RegExp(`\\.${name}\\{[^}]*text-overflow:ellipsis`))
    expect(css).toMatch(new RegExp(`\\.${name}\\{[^}]*overflow:hidden`))
    expect(css).toMatch(new RegExp(`\\.${name}\\{[^}]*min-width:0`))
    expect(css).not.toMatch(new RegExp(`\\.${name}\\{[^}]*line-clamp`))
    expect(css).not.toMatch(new RegExp(`\\.${name}\\{[^}]*-webkit-box`))
  })

  it('computed: nowrap, ellipsis, hidden, no line clamp, title keeps the whole name', () => {
    const { getByTestId } = renderWith(theme, <LogoHeaderName data-testid='name' title='Cha Sha'>Cha Sha</LogoHeaderName>)
    const el = getByTestId('name')
    const cs = window.getComputedStyle(el)
    expect(cs.whiteSpace).toBe('nowrap')
    expect(cs.textOverflow).toBe('ellipsis')
    expect(cs.overflow).toBe('hidden')
    expect(cs.display).toBe('block')
    expect(cs.webkitLineClamp || '').not.toBe('2')
    expect(el.getAttribute('title')).toBe('Cha Sha')
  })

  it('up to 768px it takes all the left side leaves, not a share of the viewport', () => {
    const { css, name } = nameCss()
    expect(css).toMatch(new RegExp(`@media\\(max-width:768px\\)\\{\\.${name}\\{max-width:none;\\}`))
    expect(css).not.toContain('40vw')
  })
})

describe('the header from 769px: the order context centered', () => {
  it('logo on the left: three columns, the order context in the middle one of the whole row', () => {
    const { css, row, left } = narrowHeader(theme)
    expect(css).toMatch(new RegExp(`@media\\(min-width:769px\\)\\{\\.${row}\\{display:grid;grid-template-columns:minmax\\(min-content,1fr\\)minmax\\(0,auto\\)minmax\\(max-content,1fr\\);`))
    expect(css).toContain(`.${row}#center-side{grid-column:2;}`)
    expect(css).toContain(`.${row}#right-side{grid-column:3;justify-self:end;}`)
    // the logo and the order context are the row's own columns
    expect(css).toMatch(new RegExp(`@media\\(min-width:769px\\)\\{\\.${left}\\{[^}]*display:contents;`))
  })

  it('centered, an empty left side (menu button and logo hidden) adds no margin that would push it off the center', () => {
    const { css } = narrowHeader(theme)
    expect(css).not.toContain('#left-side:empty+#center-side')
  })

  it('lets a long name shrink in the left column even without the order context chip', () => {
    const { getByTestId } = renderWith(theme, (
      <InnerHeader data-testid='row'>
        <LeftSide>
          <LeftHeader id='left-side'>
            <HeaderStoreSlot data-header-store-slot='' />
            <LogoHeader>
              <LogoHeaderName data-testid='name'>A restaurant with a very long name and no logo</LogoHeaderName>
            </LogoHeader>
          </LeftHeader>
          <div id='center-side' />
        </LeftSide>
        <div id='right-side'>Cart</div>
      </InnerHeader>
    ))
    const row = [...getByTestId('row').classList].pop()
    const name = [...getByTestId('name').classList][0]
    const css = injectedCss().replace(/\s+/g, '')

    expect(css).toContain(`.${row}:has(#left-side.${name})`)
    expect(css).toMatch(/:has\(#left-side\.[^)]+\)[^{]*\{grid-template-columns:minmax\(0,1fr\)minmax\(0,auto\)minmax\(max-content,1fr\);\}/)
    expect(css).toMatch(/:has\(#left-side\[data-header-store-slot\]:not\(:empty\)\)[^{]*\{grid-template-columns:minmax\(0,1fr\)/)
  })

  it.each(['center', 'right'])('logo on the %s: the row as before, no columns', (position) => {
    const { css, row } = narrowHeader(themeWithValues((values) => { values.components.header.base.logo_position = position }))
    expect(css).not.toContain(`.${row}{display:grid;`)
  })
})

// implementation notesscrolled, under 390px, the chip keeps its 16ch and the name left no room ("Cha …")
describe('the site name beside the order context chip under 390px', () => {
  const row = (chip = true) => {
    const { getByTestId } = renderWith(theme, (
      <LeftHeader data-testid='left'>
        <LogoHeader data-testid='logo'><LogoHeaderName>Cha Sha</LogoHeaderName></LogoHeader>
        {chip && <OrderContextChipBox>Calle 1</OrderContextChipBox>}
      </LeftHeader>
    ))
    return { css: injectedCss().replace(/\s+/g, ''), left: [...getByTestId('left').classList].pop(), logo: [...getByTestId('logo').parentElement.classList].pop() }
  }

  it('with the chip in the row, the logo box holding only the name is display:none (no space, not read)', () => {
    const { css, left } = row()
    expect(css).toMatch(new RegExp(`@media\\(width<390px\\)\\{\\.${left}:has\\(\\.[\\w-]+\\)\\.[\\w-]+:has\\(\\.[\\w-]+\\)\\{display:none;\\}`))
  })

  it('only under 390px: the rule is inside that media query and nothing hides the name outside it', () => {
    const { css } = row()
    const outside = css.replace(/@media\(width<390px\)\{(?:[^{}]|\{[^{}]*\})*\}/g, '')
    expect(outside).not.toMatch(/:has\([^)]*\)\.[\w-]+:has\([^)]*\)\{display:none/)
  })
})

// implementation notes (Sergio's choice, over implementation notes V01): under 576px the store's name yields and the time chip shares the
// first line with the menu and the cart; it never drops alone to a second line
describe('the order context chip in the store\'s row (under 576px)', () => {
  it('the left side does not wrap and the right side is not pinned to the first line', () => {
    const { getByTestId } = renderWith(theme, (
      <InnerHeader data-testid='row'>
        <LeftSide>
          <LeftHeader id='left-side' data-testid='left'>
            <HeaderStoreSlot data-header-store-slot=''><span>Store</span></HeaderStoreSlot>
            <OrderContextChipBox>ASAP</OrderContextChipBox>
          </LeftHeader>
        </LeftSide>
        <div id='right-side'>Cart</div>
      </InnerHeader>
    ))
    const css = injectedCss().replace(/\s+/g, '')
    const left = [...getByTestId('left').classList].pop()
    expect(css).not.toMatch(new RegExp(`\\.${left}[^{]*\\{[^}]*flex-wrap:wrap`))
    expect(css).not.toContain('data-order-context-moment')
    expect(css).not.toContain('align-self:flex-start')
  })
})

// implementation notesthe installed web app on iOS draws under the status area; the header's row starts under it
describe('the header and the safe area', () => {
  it('pads its top with the safe area inset (0 where there is none)', () => {
    const { getByTestId } = renderWith(theme, <Header data-testid='root' />)
    const root = [...getByTestId('root').classList].pop()
    expect(injectedCss().replace(/\s+/g, '')).toMatch(new RegExp(`\\.${root}\\{[^}]*padding-top:env\\(safe-area-inset-top,0px\\);`))
  })
})
