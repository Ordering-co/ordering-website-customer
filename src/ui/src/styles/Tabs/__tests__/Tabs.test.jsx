import React from 'react'
import styled from 'styled-components'
import { describe, it, expect } from 'vitest'
import { Tabs, Tab, INDICATOR_LENGTHS, underlineIndicatorCss, tabsShadowReach, tabsShadowRoomCss } from '../index'
import { cssFor, defaultTheme, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'
import { schemaOptions } from '~/utils/themeSchema'

const TEXT = { size: 14, line: 1.43, weight: 500, family: 'archivo' }

// components.tabs as the API serves it (resolved), whole: the tests set every
// value they read, whatever the schema's defaults.
const tabsComponent = () => ({
  base: { variant: 'pill', text: TEXT, icon_gap: 6, animated: false, speed: 200 },
  sizes: {
    sm: { height: 32, padding_x: 10, icon_size: 14 },
    md: { height: 40, padding_x: 16, icon_size: 16 },
    lg: { height: 48, padding_x: 20, icon_size: 20 }
  },
  variants: {
    pill: {
      background: '#F8F9FA',
      border: { width: 1, color: '#DBDCDB', style: 'solid' },
      radius: 12,
      shadow: null,
      inset: 4,
      gap: 2,
      tab_radius: 8,
      tab_border: null,
      active_background: '#FFEBE0',
      active: '#FF5500',
      inactive: '#616161'
    },
    underline: {
      background: 'transparent',
      baseline: { width: 1, color: '#E9ECEF', style: 'solid' },
      gap: 24,
      shadow: null,
      indicator: '#FF5500',
      indicator_thickness: 2,
      indicator_length: 'full',
      active: '#111111',
      inactive: '#616161'
    },
    plain: {
      background: 'transparent',
      gap: 12,
      shadow: null,
      active: '#111111',
      inactive: '#616161'
    }
  }
})

const withTabs = (mutate = () => {}) => themeWithValues((values) => {
  values.components.tabs = tabsComponent()
  mutate(values.components.tabs)
  return values
})

const styleOf = (el) => window.getComputedStyle(el)


// A height of the bar or of its tabs: its px less a container's border
// (`--tabs-bar-inset`, none here), as the CSS declares it (jsdom keeps calc(), as styled-components writes it)
const barPx = (px) => `calc(${px}px - 2 * var(--tabs-bar-inset,0px))`

describe('Tabs', () => {
  it('pill: the bar is a box of its background, border, radius and shadow, its tabs inset and gap apart', () => {
    const theme = withTabs((tabs) => {
      tabs.variants.pill.shadow = { x: 0, y: 1, blur: 4, spread: 0, color: '#000000', opacity: 1 }
    })
    const { container } = renderWith(theme, <Tabs><Tab>A</Tab><Tab>B</Tab></Tabs>)
    const bar = styleOf(container.firstChild)
    expect(bar.backgroundColor).toBe('rgb(248, 249, 250)')
    expect(bar.border).toBe('1px solid rgb(219, 220, 219)')
    expect(bar.borderRadius).toBe('12px')
    expect(bar.boxShadow).toBe('0px 1px 4px 0px rgba(0,0,0,1)')
    expect(bar.padding).toBe('4px')
    expect(bar.gap).toBe('2px')
    // the whole bar is of its size's height
    expect(bar.height).toBe(barPx(40))
    expect(bar.boxSizing).toBe('border-box')
  })

  it('pill: a tab is the bar less its inset and border; one line centered within its own border', () => {
    const theme = withTabs((tabs) => {
      tabs.variants.pill.tab_border = { width: 1, color: '#2F3032', style: 'solid' }
    })
    const { getByText } = renderWith(theme, <Tabs><Tab active>A</Tab><Tab>B</Tab></Tabs>)
    const tab = styleOf(getByText('A'))
    // 40 - 2·4 (inset) - 2·1 (bar border)
    expect(tab.height).toBe(barPx(30))
    expect(tab.boxSizing).toBe('border-box')
    expect(tab.lineHeight).toBe(barPx(28))
    expect(tab.border).toBe('1px solid rgb(47, 48, 50)')
    expect(tab.borderRadius).toBe('8px')
    expect(tab.backgroundColor).toBe('rgb(255, 235, 224)')
    expect(tab.color).toBe('rgb(255, 85, 0)')
    const inactive = styleOf(getByText('B'))
    expect(inactive.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(inactive.color).toBe('rgb(97, 97, 97)')
  })

  it('pill with no space between tabs: bordered tabs never show a double border, the active one on top', () => {
    const theme = withTabs((tabs) => {
      tabs.variants.pill.gap = 0
      tabs.variants.pill.tab_border = { width: 2, color: '#2F3032', style: 'solid' }
    })
    const { getByText } = renderWith(theme, <Tabs><Tab>A</Tab><Tab active>B</Tab><Tab>C</Tab></Tabs>)
    const css = cssFor(getByText('B'))
    expect(css).toMatch(/:not\(:first-child\)\{margin-inline-start:-2px;\}/)
    expect(css).toContain('z-index:1')
    expect(cssFor(getByText('A'))).not.toContain('z-index:1')
    // not joined: each tab keeps its radius
    expect(css).not.toContain('border-start-start-radius')
  })

  it('pill joined with no space between tabs: one block, square inside, the radius at its ends', () => {
    const theme = withTabs((tabs) => {
      tabs.variants.pill.gap = 0
      tabs.variants.pill.joined = true
    })
    const { getByText } = renderWith(theme, <Tabs><Tab>A</Tab><Tab>B</Tab></Tabs>)
    const css = cssFor(getByText('A'))
    expect(css).toMatch(/:not\(:first-child\)\{border-start-start-radius:0;border-end-start-radius:0;\}/)
    expect(css).toMatch(/:not\(:last-child\)\{border-start-end-radius:0;border-end-end-radius:0;\}/)
    // without a tab border nothing overlaps
    expect(css).not.toContain('margin-inline-start')
  })

  it('pill with no inset: bordered tabs go over the bar\'s border, never double, and fill the bar', () => {
    const theme = withTabs((tabs) => {
      tabs.variants.pill.inset = 0
      tabs.variants.pill.border = { width: 2, color: '#2F3032', style: 'solid' }
      tabs.variants.pill.tab_border = { width: 1, color: '#2F3032', style: 'solid' }
    })
    const { getByText } = renderWith(theme, <Tabs><Tab>A</Tab><Tab>B</Tab></Tabs>)
    const tab = styleOf(getByText('A'))
    // 40 - 2·2 (bar border) + 2·2 (over it)
    expect(tab.height).toBe(barPx(40))
    expect(tab.lineHeight).toBe(barPx(38))
    const css = cssFor(getByText('A'))
    expect(css).toContain('margin-block:-2px')
    expect(css).toMatch(/:first-child\{margin-inline-start:-2px;\}/)
    expect(css).toMatch(/:last-child\{margin-inline-end:-2px;\}/)
  })

  it('pill: tabs without a border, or with an inset, stay inside the bar\'s border', () => {
    const noTabBorder = withTabs((tabs) => { tabs.variants.pill.inset = 0 })
    const a = renderWith(noTabBorder, <Tabs><Tab>A</Tab></Tabs>).getByText('A')
    expect(styleOf(a).height).toBe(barPx(38))
    expect(cssFor(a)).not.toContain('margin-block')
    const inset = withTabs((tabs) => { tabs.variants.pill.tab_border = { width: 1, color: '#2F3032', style: 'solid' } })
    const b = renderWith(inset, <Tabs><Tab>B</Tab></Tabs>).getByText('B')
    expect(cssFor(b)).not.toContain('margin-block')
  })

  it('pill with space between tabs: joined does nothing and the borders do not overlap', () => {
    const theme = withTabs((tabs) => {
      tabs.variants.pill.gap = 2
      tabs.variants.pill.joined = true
      tabs.variants.pill.tab_border = { width: 1, color: '#2F3032', style: 'solid' }
    })
    const { getByText } = renderWith(theme, <Tabs><Tab>A</Tab><Tab>B</Tab></Tabs>)
    const css = cssFor(getByText('A'))
    expect(css).not.toContain('margin-inline-start')
    expect(css).not.toContain('border-start-start-radius')
  })

  it('a bar and its tabs of the size the screen gives ($size), md without it or unknown', () => {
    const theme = withTabs((tabs) => {
      tabs.variants.pill.border = null
    })
    const { getByText, container } = renderWith(theme, (
      <>
        <Tabs $size='sm'><Tab $size='sm'>Small</Tab></Tabs>
        <Tabs $size='lg'><Tab $size='lg'>Large</Tab></Tabs>
        <Tabs $size='xl'><Tab $size='xl'>Unknown</Tab></Tabs>
      </>
    ))
    const [sm, lg, unknown] = container.children
    expect(styleOf(sm).height).toBe(barPx(32))
    expect(cssFor(sm)).toContain('border:none;')
    // 32 - 2·4 (inset), no border
    expect(styleOf(getByText('Small')).height).toBe(barPx(24))
    expect(styleOf(lg).height).toBe(barPx(48))
    expect(styleOf(getByText('Large')).height).toBe(barPx(40))
    expect(styleOf(getByText('Large')).padding).toBe('0px 20px')
    expect(styleOf(unknown).height).toBe(barPx(40))
    expect(styleOf(getByText('Unknown')).padding).toBe('0px 16px')
  })

  it('a tab of only text: a centered block of one line that ends in …', () => {
    const { getByText } = renderWith(withTabs(), (
      <Tabs><Tab>A long label that does not fit</Tab></Tabs>
    ))
    const tab = getByText('A long label that does not fit')
    const style = styleOf(tab)
    // a block, so text-overflow reaches its text (in a flex box it would be
    // an anonymous item)
    expect(style.display).toBe('block')
    expect(style.textAlign).toBe('center')
    expect(style.whiteSpace).toBe('nowrap')
    expect(style.overflow).toBe('hidden')
    expect(style.textOverflow).toBe('ellipsis')
    expect(style.minWidth).toBe('0')
    // its height, line and padding as before
    expect(style.height).toBe(barPx(30))
    expect(style.lineHeight).toBe(barPx(30))
    expect(style.padding).toBe('0px 16px')
    // still positioned: the underline indicator hangs from it
    expect(style.position).toBe('relative')
    expect(cssFor(tab)).toMatch(/:not\(:has\(> \*\)\)\{display:block;\}/)
  })

  it('padding_x at its sides, its icon of icon_size, base.icon_gap from its label, which ends in …; still', () => {
    const { getByText } = renderWith(withTabs(), (
      <Tabs $size='sm'><Tab $size='sm'><svg /><span>Label</span></Tab></Tabs>
    ))
    const label = getByText('Label')
    const tab = label.parentElement
    const style = styleOf(tab)
    expect(style.padding).toBe('0px 10px')
    // a tab of elements (its icon): its icon and label centered, icon_gap apart
    expect(style.display).toBe('inline-flex')
    expect(style.alignItems).toBe('center')
    expect(style.justifyContent).toBe('center')
    expect(style.gap).toBe('6px')
    expect(style.whiteSpace).toBe('nowrap')
    // its label (an element, not a bare text) ends in …; the icon keeps its size
    const labelStyle = styleOf(label)
    expect(labelStyle.minWidth).toBe('0')
    expect(labelStyle.overflow).toBe('hidden')
    expect(labelStyle.textOverflow).toBe('ellipsis')
    expect(labelStyle.whiteSpace).toBe('nowrap')
    expect(styleOf(tab.querySelector('svg')).overflow).toBe('')
    expect(styleOf(tab.querySelector('svg')).flexShrink).toBe('0')
    expect(cssFor(tab)).toContain('> :where(:not(svg,img):not(:has(svg,img))){min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}')
    expect(styleOf(tab.querySelector('svg')).width).toBe('14px')
    expect(styleOf(tab.querySelector('svg')).height).toBe('14px')
    // the text of base; no lift
    expect(style.fontSize).toBe('14px')
    expect(cssFor(tab)).toContain('transition:none')
    expect(cssFor(tab)).toMatch(/:hover\{[^}]*transform:none;/)
  })

  it('underline: only the baseline under the bar; the tab is the bar less the baseline, transparent, with the indicator', () => {
    const theme = withTabs((tabs) => {
      tabs.base.variant = 'underline'
      tabs.variants.underline.baseline = { width: 2, color: '#E9ECEF', style: 'solid' }
      tabs.variants.underline.indicator_thickness = 3
      tabs.variants.underline.indicator_length = 'medium'
    })
    const { getByText, container } = renderWith(theme, <Tabs><Tab active>A</Tab><Tab>B</Tab></Tabs>)
    const bar = styleOf(container.firstChild)
    expect(bar.borderBottom).toBe('2px solid rgb(233, 236, 239)')
    expect(cssFor(container.firstChild)).toMatch(/border:none;[^}]*border-bottom:2px solid #E9ECEF;/)
    expect(bar.borderRadius).toBe('0')
    expect(bar.boxShadow).toBe('none')
    expect(bar.padding).toBe('0px')
    expect(bar.gap).toBe('24px')
    expect(bar.height).toBe(barPx(40))
    const tab = styleOf(getByText('A'))
    expect(tab.height).toBe(barPx(38))
    expect(tab.lineHeight).toBe(barPx(38))
    expect(tab.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(cssFor(getByText('A'))).toContain('border:none;')
    expect(tab.borderRadius).toBe('0')
    expect(tab.color).toBe('rgb(17, 17, 17)')
    const active = cssFor(getByText('A'))
    expect(active).toContain('height:3px')
    expect(active).toContain(`width:${INDICATOR_LENGTHS.medium}%`)
    expect(active).toContain('left:25%')
    expect(cssFor(getByText('B'))).not.toContain('::after')
  })

  it('underline and plain: the active tab takes its variant\'s active_background (the indicator over it)', () => {
    const theme = withTabs((tabs) => {
      tabs.variants.underline.active_background = '#FFEBE0'
      tabs.variants.plain.active_background = '#EEEEEE'
    })
    const under = renderWith(theme, <Tabs $variant='underline'><Tab $variant='underline' active>U</Tab><Tab $variant='underline'>V</Tab></Tabs>)
    expect(styleOf(under.getByText('U')).backgroundColor).toBe('rgb(255, 235, 224)')
    expect(styleOf(under.getByText('V')).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(cssFor(under.getByText('U'))).toMatch(/::after\{[^}]*bottom:0;/)
    const plain = renderWith(theme, <Tabs $variant='plain'><Tab $variant='plain' active>P</Tab></Tabs>)
    expect(styleOf(plain.getByText('P')).backgroundColor).toBe('rgb(238, 238, 238)')
  })

  it('underline with a border: around the bar, the baseline in place of its bottom side; the tab inside them', () => {
    const theme = withTabs((tabs) => {
      tabs.variants.underline.border = { width: 1, color: '#2F3032', style: 'solid' }
      tabs.variants.underline.baseline = { width: 2, color: '#E9ECEF', style: 'solid' }
    })
    const { getByText, container } = renderWith(theme, <Tabs $variant='underline'><Tab $variant='underline' active>U</Tab></Tabs>)
    const bar = styleOf(container.firstChild)
    expect(bar.borderTop).toBe('1px solid rgb(47, 48, 50)')
    expect(bar.borderLeft).toBe('1px solid rgb(47, 48, 50)')
    expect(bar.borderBottom).toBe('2px solid rgb(233, 236, 239)')
    // 40 - 1 (top border) - 2 (baseline)
    expect(styleOf(getByText('U')).height).toBe(barPx(37))
    const noBaseline = withTabs((tabs) => {
      tabs.variants.underline.border = { width: 1, color: '#2F3032', style: 'solid' }
      tabs.variants.underline.baseline = null
    })
    const other = renderWith(noBaseline, <Tabs $variant='underline'><Tab $variant='underline'>N</Tab></Tabs>)
    expect(styleOf(other.container.firstChild).borderBottom).toBe('1px solid rgb(47, 48, 50)')
    expect(styleOf(other.getByText('N')).height).toBe(barPx(38))
  })

  it('plain with a border: around the bar, the tab inside it', () => {
    const theme = withTabs((tabs) => {
      tabs.variants.plain.border = { width: 1, color: '#2F3032', style: 'solid' }
    })
    const { getByText, container } = renderWith(theme, <Tabs $variant='plain'><Tab $variant='plain'>P</Tab></Tabs>)
    expect(styleOf(container.firstChild).border).toBe('1px solid rgb(47, 48, 50)')
    expect(styleOf(getByText('P')).height).toBe(barPx(38))
  })

  it('underline and plain: their shadow when the theme sets one, none otherwise', () => {
    const theme = withTabs((tabs) => {
      tabs.variants.underline.shadow = { x: 0, y: 1, blur: 4, spread: 0, color: '#000000', opacity: 1 }
      tabs.variants.plain.shadow = null
    })
    const under = renderWith(theme, <Tabs $variant='underline'><Tab $variant='underline'>U</Tab></Tabs>)
    expect(styleOf(under.container.firstChild).boxShadow).toBe('0px 1px 4px 0px rgba(0,0,0,1)')
    const plain = renderWith(theme, <Tabs $variant='plain'><Tab $variant='plain'>P</Tab></Tabs>)
    expect(styleOf(plain.container.firstChild).boxShadow).toBe('none')
  })

  it('underline without a baseline: no line, the tab of the whole height', () => {
    const theme = withTabs((tabs) => {
      tabs.base.variant = 'underline'
      tabs.variants.underline.baseline = null
    })
    const { getByText, container } = renderWith(theme, <Tabs><Tab active>A</Tab></Tabs>)
    // no border either: no line at all
    expect(cssFor(container.firstChild)).toContain('border:none;')
    expect(cssFor(container.firstChild)).not.toContain('border-bottom:')
    expect(styleOf(getByText('A')).height).toBe(barPx(40))
  })

  it('plain: no box, only the colors; the tab of the whole height', () => {
    const theme = withTabs((tabs) => {
      tabs.base.variant = 'plain'
      tabs.variants.plain.background = '#FAFAFA'
    })
    const { getByText, container } = renderWith(theme, <Tabs><Tab active>A</Tab><Tab>B</Tab></Tabs>)
    const bar = styleOf(container.firstChild)
    expect(bar.backgroundColor).toBe('rgb(250, 250, 250)')
    expect(cssFor(container.firstChild)).toContain('border:none;')
    expect(cssFor(container.firstChild)).not.toContain('border-bottom')
    expect(bar.borderRadius).toBe('0')
    expect(bar.boxShadow).toBe('none')
    expect(bar.padding).toBe('0px')
    expect(bar.gap).toBe('12px')
    const tab = styleOf(getByText('A'))
    expect(tab.height).toBe(barPx(40))
    expect(tab.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(tab.color).toBe('rgb(17, 17, 17)')
    expect(cssFor(getByText('A'))).not.toContain('::after')
    expect(styleOf(getByText('B')).color).toBe('rgb(97, 97, 97)')
  })

  it('a bar follows tabs.base.variant unless the screen fixes one ($variant on the bar and its tabs)', () => {
    const theme = withTabs((tabs) => {
      tabs.base.variant = 'plain'
    })
    const { getByText } = renderWith(theme, (
      <>
        <Tabs><Tab active>Default</Tab></Tabs>
        <Tabs $variant='pill'><Tab active $variant='pill'>Fixed</Tab></Tabs>
      </>
    ))
    expect(styleOf(getByText('Default')).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(styleOf(getByText('Default').parentElement).gap).toBe('12px')
    expect(styleOf(getByText('Fixed')).backgroundColor).toBe('rgb(255, 235, 224)')
    expect(styleOf(getByText('Fixed').parentElement).padding).toBe('4px')
    expect(styleOf(getByText('Fixed').parentElement).borderRadius).toBe('12px')
  })

  it('the box holding an icon keeps its size; a tab that sets its own display keeps it', () => {
    const Own = styled(Tab)`display: flex;`
    const { getByText } = renderWith(withTabs(), (
      <Tabs>
        <Tab><span data-testid='icon-box'><svg /></span><span>Boxed</span></Tab>
        <Own>Own display</Own>
      </Tabs>
    ))
    expect(styleOf(getByText('Boxed').parentElement).display).toBe('inline-flex')
    expect(styleOf(getByText('Boxed').parentElement.firstChild).overflow).toBe('')
    expect(styleOf(getByText('Boxed')).textOverflow).toBe('ellipsis')
    // one class specific: the consumer's display wins, with the tab's icon_gap
    expect(styleOf(getByText('Own display')).display).toBe('flex')
    expect(styleOf(getByText('Own display')).gap).toBe('6px')
  })

  it('disableBackground keeps the bar without its background', () => {
    const { container } = renderWith(withTabs(), <Tabs disableBackground><Tab>A</Tab></Tabs>)
    expect(styleOf(container.firstChild).backgroundColor).toBe('rgba(0, 0, 0, 0)')
  })

  it('underlineIndicatorCss: its thickness, length and color', () => {
    const css = underlineIndicatorCss({ color: '#FF5500', thickness: '3px', length: 'medium' })
    expect(css).toContain('height: 3px')
    expect(css).toContain('width: 50%')
    expect(css).toContain('left: 25%')
    expect(css).toContain('background-color: #FF5500')
  })
})

describe('Tab for the keyboard', () => {
  it('a div tab with onClick is a focusable button that Enter and Space click, pressed while active', () => {
    let clicks = 0
    const { getByText } = renderWith(defaultTheme, <Tabs><Tab active onClick={() => { clicks += 1 }}>A</Tab></Tabs>)
    const tab = getByText('A')
    expect(tab.getAttribute('role')).toBe('button')
    expect(tab.getAttribute('tabindex')).toBe('0')
    expect(tab.getAttribute('aria-pressed')).toBe('true')
    tab.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    tab.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(clicks).toBe(2)
  })

  it('keeps the role of a tab of a tablist, a button tab and a tab without action', () => {
    const { getByText } = renderWith(defaultTheme, (
      <Tabs role='tablist'>
        <Tab role='tab' aria-selected onClick={() => {}}>T</Tab>
        <Tab as='button' onClick={() => {}}>B</Tab>
        <Tab>S</Tab>
      </Tabs>
    ))
    expect(getByText('T').getAttribute('role')).toBe('tab')
    expect(getByText('T').getAttribute('tabindex')).toBe(null)
    expect(getByText('B').getAttribute('role')).toBe(null)
    expect(getByText('S').getAttribute('role')).toBe(null)
    expect(getByText('S').getAttribute('tabindex')).toBe(null)
  })

  it('opt-in tablist: $asTabs is a tablist and $asTab tabs are tabs, selected while active', () => {
    let clicks = 0
    const { getByText, getByRole } = renderWith(defaultTheme, (
      <Tabs $asTabs>
        <Tab $asTab active onClick={() => {}}>One</Tab>
        <Tab $asTab onClick={() => { clicks += 1 }}>Two</Tab>
        <Tab $asTab as='button' type='button' onClick={() => {}}>Three</Tab>
      </Tabs>
    ))
    expect(getByRole('tablist')).toBeTruthy()
    expect(getByText('One').getAttribute('role')).toBe('tab')
    expect(getByText('One').getAttribute('aria-selected')).toBe('true')
    expect(getByText('One').getAttribute('aria-pressed')).toBe(null)
    expect(getByText('Two').getAttribute('aria-selected')).toBe('false')
    expect(getByText('Two').getAttribute('tabindex')).toBe('0')
    getByText('Two').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(clicks).toBe(1)
    expect(getByText('Three').getAttribute('role')).toBe('tab')
    expect(getByText('Three').getAttribute('aria-selected')).toBe('false')
  })

  it('a button tab made by styled() is clicked once by Enter (by the browser only)', () => {
    let clicks = 0
    const ButtonTab = styled(Tab).attrs({ as: 'button', type: 'button' })``
    const { getByText } = renderWith(defaultTheme, <ButtonTab onClick={() => { clicks += 1 }}>X</ButtonTab>)
    getByText('X').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(clicks).toBe(0)
  })
})

describe('tabsShadowRoomCss: room for the bar\'s shadow in a container that clips it', () => {
  const hard = withTabs((tabs) => {
    tabs.variants.pill.shadow = { x: 2, y: 2, blur: 0, spread: 0, color: '#000000', opacity: 1 }
  })

  it('reaches as far as the shadow falls on each side', () => {
    expect(tabsShadowReach(hard)).toEqual({ top: 0, right: 2, bottom: 2, left: 0 })
  })

  it('adds the reach to the padding, takes it from the margins and adds it to the width', () => {
    const css = tabsShadowRoomCss(hard, { width: '80%', margin: { bottom: '16px' }, padding: { top: '15px' } })
    expect(css).toContain('padding: calc(15px + 0px) calc(0px + 2px) calc(0px + 2px) calc(0px + 0px);')
    expect(css).toContain('margin: calc(0px - 0px) calc(0px - 2px) calc(16px - 2px) calc(0px - 0px);')
    expect(css).toContain('width: calc(80% + 2px);')
    expect(css).toContain('box-sizing: border-box;')
  })

  it('is empty without a shadow', () => {
    expect(tabsShadowRoomCss(withTabs())).toBe('')
  })
})

describe('tabs.variants.pill.radius: none', () => {
  it('the schema: none is one of its options', () => {
    expect(schemaOptions('components.tabs.variants.pill.radius')).toEqual(['none', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'full'])
  })

  it('a pill bar of radius none (0, its tabs 0 as the API derives them) is square, the bar and its tabs', () => {
    const theme = withTabs((tabs) => {
      tabs.variants.pill.radius = 0
      tabs.variants.pill.tab_radius = 0
    })
    const { getByText } = renderWith(theme, <Tabs variant='primary'><Tab active>One</Tab></Tabs>)
    const tab = getByText('One')
    expect(styleOf(tab.parentElement).borderRadius).toBe('0px')
    expect(styleOf(tab).borderRadius).toMatch(/^0(px)?$/)
  })
})
