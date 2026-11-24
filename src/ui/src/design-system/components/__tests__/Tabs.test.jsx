import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { themeSpace } from '~/utils/themeTokens'
import { getThemeComponent, getThemeCss } from '~/utils/themeCss'
import { scopedTheme } from '~/utils/themeGroups'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { Tabs, TabsAction, TabsScrollArea, TabsNavigation, TabsContent, TabsIndicator, TabsList, TabsTrigger, slotTabsOptions } from '../Tabs'

// jsdom does not compile Tailwind: these prove the classes, attributes, variables
// and behavior; how it looks is the preview page's assertions.
const [defaults, grill, cafe] = THEMES.map(({ theme }) => theme)
const themed = (tabs, header) => buildAppTheme(null, { version: 2, values: { components: { tabs, ...(header && { header }) } } })
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))

const Demo = ({ theme = defaults, root, list, children }) => (
  <ThemeProvider theme={theme}>
    <Tabs defaultValue='left' {...root}>
      <TabsList aria-label='Halves' {...list}>
        <TabsTrigger value='left'>Left half</TabsTrigger>
        <TabsTrigger value='whole'>Whole</TabsTrigger>
        <TabsTrigger value='right'>Right half</TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  </ThemeProvider>
)
const classOf = (el) => el.getAttribute('class')

describe('Tabs: what the theme gives', () => {
  it.each([['defaults', defaults], ['cafe', cafe], ['grill', grill]])('writes components.tabs of %s on its root, for the theme default style', (_, theme) => {
    const { container } = render(<Demo theme={theme} />)
    const root = container.querySelector('[data-slot=tabs]')
    const style = getThemeCss(theme, 'tabs').base.variant
    expect(root.getAttribute('data-variant')).toBe(style)
    expect(vars(root)).toEqual(componentVars(theme, 'tabs', { variant: style, size: 'md' }))
    expect(root.style.getPropertyValue('--ui-tabs-height')).toBe(getThemeCss(theme, 'tabs').sizes.md.height)
  })

  it('a screen can ask for another style; the theme decides when it does not', () => {
    const underlined = themed({ base: { variant: 'underline' } })
    const asked = render(<Demo theme={underlined} />)
    expect(asked.container.querySelector('[data-slot=tabs]').getAttribute('data-variant')).toBe('underline')
    expect(asked.container.querySelector('[data-slot=tabs]').style.getPropertyValue('--ui-tabs-indicator')).toBe(getThemeCss(underlined, 'tabs').variants.underline.indicator)
    asked.unmount()
    const forced = render(<Demo theme={underlined} root={{ variant: 'pill' }} />)
    const root = forced.container.querySelector('[data-slot=tabs]')
    expect(root.getAttribute('data-variant')).toBe('pill')
    expect(root.style.getPropertyValue('--ui-tabs-inset')).toBe(getThemeCss(underlined, 'tabs').variants.pill.inset)
    expect(root.style.getPropertyValue('--ui-tabs-indicator')).toBe('')
    forced.unmount()
    // a name the theme does not have is the theme's own
    const unknown = render(<Demo theme={underlined} root={{ variant: 'square' }} />)
    expect(unknown.container.querySelector('[data-slot=tabs]').getAttribute('data-variant')).toBe('underline')
  })

  it('the size is the bar\'s height and the tab\'s padding and icon', () => {
    const { container } = render(<Demo root={{ size: 'sm' }} />)
    const sizes = getThemeCss(defaults, 'tabs').sizes
    const root = container.querySelector('[data-slot=tabs]')
    expect(root.style.getPropertyValue('--ui-tabs-height')).toBe(sizes.sm.height)
    expect(root.style.getPropertyValue('--ui-tabs-padding-x')).toBe(sizes.sm.padding_x)
    expect(root.style.getPropertyValue('--ui-tabs-icon-size')).toBe(sizes.sm.icon_size)
  })

  it('no value is written in its classes', () => {
    const { container } = render(<Demo root={{ variant: 'underline' }}><TabsContent value='left'>Panel</TabsContent></Demo>)
    // (the 44px touch floor is the one recorded exception, tested apart)
    const all = [...container.querySelectorAll('[class]')].map(classOf).join(' ').replaceAll('44px', '')
    expect(all).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+ms|\d+px/i)
    expect(all).toContain('ui:h-(--ui-tabs-height)')
    expect(all).toContain('ui:motion-safe:duration-(--ui-tabs-motion-duration)')
  })

  it('a theme that moves the tabs moves its variables, inside a group\'s scope too', () => {
    const theme = themed(
      { variants: { pill: { gap: 6 } } },
      { scope: { tabs: { base: { variant: 'plain' }, sizes: { md: { height: 33 } } } } }
    )
    const plain = render(
      <ThemeProvider theme={theme}>
        <Tabs group='header' defaultValue='a'><TabsList aria-label='a'><TabsTrigger value='a'>A</TabsTrigger></TabsList></Tabs>
        <ComponentScope group='header'><Tabs defaultValue='a' data-testid='by-scope'><TabsList aria-label='b'><TabsTrigger value='a'>A</TabsTrigger></TabsList></Tabs></ComponentScope>
        <Tabs defaultValue='a' data-testid='global'><TabsList aria-label='c'><TabsTrigger value='a'>A</TabsTrigger></TabsList></Tabs>
      </ThemeProvider>
    )
    const [byGroup] = plain.container.querySelectorAll('[data-slot=tabs]')
    expect(byGroup.getAttribute('data-variant')).toBe('plain')
    expect(byGroup.style.getPropertyValue('--ui-tabs-height')).toBe('33px')
    expect(vars(byGroup)).toEqual(componentVars(scopedTheme(theme, 'header'), 'tabs', { variant: 'plain', size: 'md' }))
    expect(vars(plain.getByTestId('by-scope'))).toEqual(vars(byGroup))
    // the rest of the page keeps the global tabs
    expect(plain.getByTestId('global').getAttribute('data-variant')).toBe('pill')
    expect(plain.getByTestId('global').style.getPropertyValue('--ui-tabs-gap')).toBe('6px')
  })

  it('a slot gives its size and style, else what the screen defaults to', () => {
    const theme = themed({}, undefined)
    expect(slotTabsOptions(theme, 'header', 'order_type')).toEqual({ size: 'md' })
    expect(slotTabsOptions(theme, 'product_option', 'halves', { size: 'sm' })).toMatchObject({ size: 'sm' })
    const set = buildAppTheme(null, { version: 2, values: { components: { header: { slots: { order_type: { component: 'tabs', size: 'lg', variant: 'underline' } } } } } })
    expect(slotTabsOptions(set, 'header', 'order_type', { size: 'sm' })).toEqual({ size: 'lg', variant: 'underline' })
  })
})

describe('Tabs: the bar and its tabs', () => {
  it('is a tablist of tabs, one selected, each with its slot', () => {
    render(<Demo />)
    const list = screen.getByRole('tablist', { name: 'Halves' })
    expect(list.getAttribute('data-slot')).toBe('tabs-list')
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Left half', 'Whole', 'Right half'])
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false'])
    tabs.forEach((tab) => expect(tab.getAttribute('data-slot')).toBe('tabs-trigger'))
  })

  it('a label is one line that ends in … and the tab keeps its icon', () => {
    render(<Demo />)
    const label = screen.getByRole('tab', { name: 'Whole' }).firstElementChild
    expect(label.tagName).toBe('SPAN')
    expect(classOf(screen.getByRole('tab', { name: 'Whole' }))).toContain('ui:[&>span]:truncate')
    expect(classOf(screen.getByRole('tab', { name: 'Whole' }))).toContain('ui:[&_svg]:size-(--ui-tabs-icon-size)')
  })

  it('the pill: a box with its inset, its tabs\' radius and border', () => {
    render(<Demo root={{ variant: 'pill' }} />)
    const bar = classOf(screen.getByRole('tablist'))
    expect(bar).toContain('ui:rounded-(--ui-tabs-radius)')
    expect(bar).toContain('ui:p-(--ui-tabs-inset)')
    expect(bar).toContain('ui:[border:var(--ui-tabs-border)]')
    const tab = classOf(screen.getAllByRole('tab')[0])
    expect(tab).toContain('ui:rounded-(--ui-tabs-tab-radius)')
    expect(tab).toContain('ui:[border:var(--ui-tabs-tab-border)]')
    expect(tab).toContain('ui:aria-selected:bg-(--ui-tabs-active-background)')
    expect(tab).toContain('ui:aria-selected:text-(--ui-tabs-active)')
    expect(tab).toContain('ui:text-(--ui-tabs-inactive)')
  })

  it('the underline: the line under the whole bar and the active line on the selected tab, as long as the theme says', () => {
    const lengths = { full: 'ui:after:inset-x-none', medium: 'ui:after:w-1/2', small: 'ui:after:w-1/4' }
    Object.entries(lengths).forEach(([length, cls]) => {
      const theme = themed({ base: { variant: 'underline' }, variants: { underline: { indicator_length: length } } })
      const view = render(<Demo theme={theme} />)
      expect(classOf(view.getByRole('tablist'))).toContain('ui:[border-bottom:var(--ui-tabs-baseline,var(--ui-tabs-border))]')
      const tab = classOf(view.getAllByRole('tab')[0])
      expect(tab).toContain(cls)
      expect(tab).toContain('ui:aria-selected:after:bg-(--ui-tabs-indicator)')
      expect(tab).toContain('ui:after:h-(--ui-tabs-indicator-thickness)')
      expect(tab).not.toContain('ui:rounded-(--ui-tabs-tab-radius)')
      view.unmount()
    })
  })

  it('the plain style: only the text color changes, no box', () => {
    render(<Demo root={{ variant: 'plain' }} />)
    const tab = classOf(screen.getAllByRole('tab')[0])
    expect(tab).not.toContain('tab-radius')
    expect(tab).not.toContain('--ui-tabs-indicator')
    expect(tab).toContain('ui:aria-selected:text-(--ui-tabs-active)')
  })

  it('tabs with no space between them share their border; joined squares the inner corners', () => {
    const border = { width: 1, color: '#123456', style: 'solid' }
    const apart = render(<Demo theme={themed({ variants: { pill: { tab_border: border } } })} />)
    expect(classOf(apart.getAllByRole('tab')[1])).not.toContain('border-inline-start-width')
    apart.unmount()
    const gapless = render(<Demo theme={themed({ variants: { pill: { gap: 0, tab_border: border } } })} />)
    expect(classOf(gapless.getAllByRole('tab')[1])).toContain('ui:not-first:[border-inline-start-width:0]')
    expect(classOf(gapless.getAllByRole('tab')[1])).not.toContain('rounded-s-none')
    gapless.unmount()
    const joined = render(<Demo theme={themed({ variants: { pill: { gap: 0, joined: true, tab_border: border } } })} />)
    expect(classOf(joined.getAllByRole('tab')[1])).toContain('ui:not-first:rounded-s-none ui:not-last:rounded-e-none')
  })

  it('a pill with no inset and a border on its tabs lets them be its edge: the bar draws none', () => {
    const border = { width: 1, color: '#123456', style: 'solid' }
    const edge = render(<Demo theme={themed({ variants: { pill: { inset: 0, tab_border: border } } })} />)
    expect(classOf(edge.getByRole('tablist'))).not.toContain('ui:[border:var(--ui-tabs-border)]')
    edge.unmount()
    expect(classOf(render(<Demo />).getByRole('tablist'))).toContain('ui:[border:var(--ui-tabs-border)]')
  })

  it.each([
    ['defaults', defaults, 'underline', 1], ['defaults', defaults, 'pill', 0], ['cafe', cafe, 'pill', 2], ['cafe', cafe, 'underline', 2], ['cafe', cafe, 'plain', 2]
  ])('the bar tells its border\'s room to the touch floor: %s, %s', (_, theme, variant, rim) => {
    const { getByRole } = render(<Demo theme={theme} root={{ variant }} />)
    expect(getByRole('tablist').style.getPropertyValue('--ui-tabs-rim')).toBe(`${rim}px`)
  })

  it('`scroll` keeps the tabs\' size and scrolls the bar inside its container; `fill` shares the width', () => {
    const scroll = render(<Demo />)
    expect(classOf(scroll.getByRole('tablist'))).toContain('ui:overflow-x-auto')
    expect(classOf(scroll.getByRole('tablist'))).toContain('ui:max-w-full')
    expect(classOf(scroll.getAllByRole('tab')[0])).toContain('ui:flex-[1_0_auto]')
    // inside the tab, the ring the page draws (the bar's overflow would cut it outside)
    expect(classOf(scroll.getAllByRole('tab')[0])).toContain('ui:focus-visible:[outline-offset:calc(-1*var(--ot-focus-ring-width))]!')
    scroll.unmount()
    const fill = render(<Demo root={{ layout: 'fill' }} />)
    expect(classOf(fill.getByRole('tablist'))).not.toContain('overflow-x-auto')
    expect(classOf(fill.getAllByRole('tab')[0])).toContain('ui:flex-[1_1_0]')
  })

  it('the 44px touch floor, on a phone or with a touch screen only: a scrolling bar grows to it and, like a filling one, each tab grows its touch area and keeps its box', () => {
    const scroll = render(<Demo />)
    const bar = classOf(scroll.getByRole('tablist'))
    // the floor is the inside of the bar's border (its overflow clips the tabs' touch area there), whose room is `--ui-tabs-rim`
    expect(bar).toContain('ui:max-mobile:min-h-[calc(44px+var(--ui-tabs-rim))]')
    expect(bar).toContain('ui:pointer-coarse:min-h-[calc(44px+var(--ui-tabs-rim))]')
    // never a bare min-height: the screen keeps the theme's height
    expect(bar).not.toMatch(/(^|\s)ui:min-h-/)
    // the bar stretches the tab only as far as its inset, and its overflow clips what sticks out: the tab has the touch area too
    const touch = ['ui:max-mobile:before:min-h-[44px]', 'ui:max-mobile:before:min-w-[44px]', 'ui:pointer-coarse:before:min-h-[44px]', 'ui:pointer-coarse:before:min-w-[44px]']
    touch.forEach((name) => expect(classOf(scroll.getAllByRole('tab')[0])).toContain(name))
    scroll.unmount()
    const fill = render(<Demo root={{ layout: 'fill' }} />)
    const tab = classOf(fill.getAllByRole('tab')[0])
    touch.forEach((name) => expect(tab).toContain(name))
    expect(classOf(fill.getByRole('tablist'))).not.toContain('min-h-')
    // the underline's line is the tab's `after`: the touch area is another pseudo-element
    expect(tab).not.toContain('ui:after:min')
  })

  it('`line`: a scrolling row of text with no box, the theme\'s underline colors, the tabs\' own width and an indicator for the selected one', () => {
    const { container, getByRole } = render(
      <ThemeProvider theme={defaults}>
        <Tabs defaultValue='left' layout='line' variant='underline'>
          <TabsList aria-label='Halves' inset='lg'>
            <TabsTrigger value='left'>Left half</TabsTrigger>
            <TabsTrigger value='whole'>Whole</TabsTrigger>
            <TabsIndicator />
          </TabsList>
        </Tabs>
      </ThemeProvider>
    )
    const bar = getByRole('tablist')
    const bare = classOf(bar)
    expect(bare).toContain('ui:overflow-x-auto')
    expect(bare).toContain('ui:[box-shadow:none]')
    expect(bare).toContain('ui:[border:none]')
    expect(bar.style.paddingInline).toBe(themeSpace(defaults, 'lg'))
    const tab = getByRole('tab', { name: 'Left half' })
    expect(classOf(tab)).toContain('ui:px-[0]')
    expect(classOf(tab)).toContain('ui:flex-none')
    // its line is the indicator, not the tab's `after`
    expect(classOf(tab)).not.toContain('ui:after:bg-transparent')
    const indicator = container.querySelector('[data-slot=tabs-indicator]')
    expect(indicator).not.toBeNull()
    expect(classOf(indicator)).toContain('ui:bg-(--ui-tabs-indicator)')
    expect(classOf(indicator)).toContain('ui:motion-safe:transition-[transform,width]')
  })

  it('`bare` is a bar with no box of its own: its tabs keep their place', () => {
    const { rerender } = render(<Demo />)
    expect(screen.getByRole('tablist').style.getPropertyValue('--ui-tabs-background')).toBe('')
    rerender(<Demo list={{ bare: true }} />)
    const bar = screen.getByRole('tablist')
    expect(bar.style.getPropertyValue('--ui-tabs-background')).toBe('transparent')
    expect(bar.style.getPropertyValue('--ui-tabs-shadow')).toBe('none')
    expect(bar.style.borderColor).toBe('transparent')
    // the bar keeps its height and the room of its border and inset: the tabs are as tall as in a bar with a box
    expect(classOf(bar)).toContain('ui:h-(--ui-tabs-height)')
    expect(classOf(bar)).toContain('ui:p-(--ui-tabs-inset)')
  })

  it('the touch and keyboard floors it has: reduced motion and the theme\'s disabled look', () => {
    render(<Demo />)
    const tab = classOf(screen.getAllByRole('tab')[0])
    expect(tab).toContain('ui:motion-safe:transition-')
    expect(tab).toContain('ui:data-disabled:opacity-(--ot-opacity-disabled)')
    expect(tab).toContain('ui:data-disabled:cursor-not-allowed')
  })
})

describe('Tabs: keyboard and selection', () => {
  it('a click selects; the selection can be controlled', () => {
    const onValueChange = vi.fn()
    const { rerender } = render(
      <ThemeProvider theme={defaults}>
        <Tabs value='left' onValueChange={onValueChange}>
          <TabsList aria-label='t'><TabsTrigger value='left'>L</TabsTrigger><TabsTrigger value='right'>R</TabsTrigger></TabsList>
        </Tabs>
      </ThemeProvider>
    )
    fireEvent.click(screen.getByRole('tab', { name: 'R' }))
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange.mock.calls[0][0]).toBe('right')
    // controlled: it stays where the parent keeps it
    expect(screen.getByRole('tab', { name: 'L' }).getAttribute('aria-selected')).toBe('true')
    rerender(
      <ThemeProvider theme={defaults}>
        <Tabs value='right' onValueChange={onValueChange}>
          <TabsList aria-label='t'><TabsTrigger value='left'>L</TabsTrigger><TabsTrigger value='right'>R</TabsTrigger></TabsList>
        </Tabs>
      </ThemeProvider>
    )
    expect(screen.getByRole('tab', { name: 'R' }).getAttribute('aria-selected')).toBe('true')
  })

  it('arrows, Home and End move the focus and loop; selecting is a press of the focused tab', async () => {
    render(<Demo />)
    const [left, whole, right] = screen.getAllByRole('tab')
    const move = async (from, key, to) => {
      fireEvent.keyDown(from, { key })
      await waitFor(() => expect(document.activeElement).toBe(to))
    }
    left.focus()
    await move(left, 'ArrowRight', whole)
    // moving is not selecting
    expect(left.getAttribute('aria-selected')).toBe('true')
    await move(whole, 'End', right)
    await move(right, 'ArrowRight', left)
    await move(left, 'ArrowLeft', right)
    await move(right, 'Home', left)
    // a tab is a native button: the browser turns Enter and Space into this click
    fireEvent.click(right)
    expect(right.getAttribute('aria-selected')).toBe('true')
  })

  it('in a right-to-left store the arrows follow the eye: Left goes to the next tab, Right to the previous', async () => {
    render(<Demo theme={{ ...defaults, rtl: true }} />)
    const [left, whole] = screen.getAllByRole('tab')
    left.focus()
    fireEvent.keyDown(left, { key: 'ArrowLeft' })
    await waitFor(() => expect(document.activeElement).toBe(whole))
    fireEvent.keyDown(whole, { key: 'ArrowRight' })
    await waitFor(() => expect(document.activeElement).toBe(left))
  })

  it('with activateOnFocus the arrows select as they move', async () => {
    render(<Demo list={{ activateOnFocus: true }} />)
    const [left, whole] = screen.getAllByRole('tab')
    left.focus()
    fireEvent.keyDown(left, { key: 'ArrowRight' })
    await waitFor(() => expect(document.activeElement).toBe(whole))
    expect(whole.getAttribute('aria-selected')).toBe('true')
  })

  it('only the selected tab is in the tab order (the others are reached with the arrows)', () => {
    render(<Demo />)
    expect(screen.getAllByRole('tab').map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])
  })

  it('a disabled tab is not selected and says so', () => {
    render(
      <ThemeProvider theme={defaults}>
        <Tabs defaultValue='a'>
          <TabsList aria-label='t'><TabsTrigger value='a'>A</TabsTrigger><TabsTrigger value='b' disabled>B</TabsTrigger></TabsList>
        </Tabs>
      </ThemeProvider>
    )
    const disabled = screen.getByRole('tab', { name: 'B' })
    fireEvent.click(disabled)
    expect(disabled.getAttribute('aria-selected')).toBe('false')
    expect(disabled.hasAttribute('data-disabled')).toBe(true)
  })

  it('a panel is named by its tab and only the selected one shows', () => {
    render(
      <Demo>
        <TabsContent value='left'>Left panel</TabsContent>
        <TabsContent value='whole'>Whole panel</TabsContent>
      </Demo>
    )
    const panel = screen.getByRole('tabpanel')
    expect(panel.textContent).toBe('Left panel')
    expect(panel.getAttribute('data-slot')).toBe('tabs-content')
    expect(panel).toHaveAccessibleName('Left half')
    expect(screen.queryByText('Whole panel')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Whole' }))
    expect(screen.getByRole('tabpanel').textContent).toBe('Whole panel')
  })

  it('takes a ref and the caller\'s class on the root', () => {
    const ref = React.createRef()
    render(<ThemeProvider theme={defaults}><Tabs ref={ref} className='ui:max-w-[0]' defaultValue='a'><TabsList aria-label='t'><TabsTrigger value='a'>A</TabsTrigger></TabsList></Tabs></ThemeProvider>)
    expect(ref.current.getAttribute('data-slot')).toBe('tabs')
    expect(classOf(ref.current)).toContain('ui:max-w-[0]')
    expect(classOf(ref.current)).not.toContain('ui:max-w-full')
  })
})

describe('Tabs navigation for conditionally shown content', () => {
  it.each([['defaults', defaults], ['grill', grill]])('uses the %s box and keeps conditional actions independent of panels', (_, theme) => {
    const choose = vi.fn()
    render(
      <ThemeProvider theme={theme}>
        <TabsNavigation tone='contrast' scroll>
          <TabsAction active onClick={choose}>Products</TabsAction>
        </TabsNavigation>
      </ThemeProvider>
    )
    const button = screen.getByRole('button', { name: 'Products', pressed: true })
    const bar = button.parentElement
    const tabs = getThemeCss(theme, 'tabs')
    expect(bar.style.getPropertyValue('--ui-tabs-height')).toBe(tabs.sizes.md.height)
    expect(bar.style.getPropertyValue('--ui-tabs-active-background')).toBe(tabs.variants[tabs.base.variant].active_background)
    expect(bar.className).toContain('ui:text-primary-foreground')
    expect(bar.parentElement.className).toContain('ui:overflow-x-auto')
    expect(bar.parentElement.className).toContain('ui:pointer-coarse:[--ui-tabs-touch-floor:44px]')
    fireEvent.click(button)
    expect(choose).toHaveBeenCalledTimes(1)
  })
})

it.each([['defaults', defaults], ['grill', grill]])('fills a panel with equal %s tabs and keeps their themed height', (_, theme) => {
  render(<Demo theme={theme} root={{ layout: 'equal-panel-width' }} />)
  expect(screen.getByRole('tablist').className).toContain('ui:w-full')
  expect(screen.getByRole('tab', { name: 'Whole' }).className).toContain('ui:flex-[1_1_0]')
  expect(screen.getByRole('tab', { name: 'Whole' }).className).toContain('ui:leading-(--ui-tabs-action-line)')
})

it.each([['defaults', defaults], ['grill', grill]])('uses the %s intrinsic track without owning the host views', (_, theme) => {
  render(
    <ThemeProvider theme={theme}>
      <TabsNavigation width='content' tone='primary'>
        <TabsAction active role='tab' aria-selected>Cash wallet</TabsAction>
        <TabsAction active onClick={() => {}}>Newest</TabsAction>
      </TabsNavigation>
    </ThemeProvider>
  )
  const button = screen.getByRole('button', { name: 'Newest', pressed: true })
  const bar = button.parentElement
  expect(bar.style.getPropertyValue('--ui-tabs-height')).toBe(getThemeCss(theme, 'tabs').sizes.md.height)
  expect(bar.className).toContain('ui:w-fit')
  expect(bar.className).toContain('ui:text-primary')
  expect(screen.getByRole('tab', { name: 'Cash wallet', selected: true })).not.toHaveAttribute('aria-pressed')
})

it.each([['defaults', defaults], ['grill', grill]])('reserves the %s bar shadow inside the horizontal viewport', (_, theme) => {
  const { container } = render(
    <ThemeProvider theme={theme}>
      <TabsScrollArea spaceAfter='xl'>
        <TabsNavigation tone='contrast'>
          <TabsAction noWrap onClick={() => {}}>Orders</TabsAction>
        </TabsNavigation>
      </TabsScrollArea>
    </ThemeProvider>
  )
  const viewport = container.querySelector('[data-slot=tabs-scroll-area]')
  const tabs = getThemeCss(theme, 'tabs')
  const { reach } = tabs.variants[tabs.base.variant].shadow
  expect(viewport.className).toContain('ui:overflow-x-auto')
  expect(viewport.style.getPropertyValue('--ui-tabs-shadow-bottom')).toBe(`${reach.bottom}px`)
  expect(viewport.style.getPropertyValue('--ui-tabs-shadow-right')).toBe(`${reach.right}px`)
  expect(screen.getByRole('button', { name: 'Orders' }).className).toContain('ui:min-w-max')
})

// implementation noteson a phone the three favorites tabs shared the bar's width and "Businesses" read "Busine…"
it.each([['defaults', defaults], ['grill', grill]])('a scrolling %s bar keeps every tab as wide as its label; a bar that does not scroll leaves them to share', (_, theme) => {
  const { rerender } = render(
    <ThemeProvider theme={theme}>
      <TabsNavigation tone='contrast' scroll>
        <TabsAction onClick={() => {}}>Businesses</TabsAction>
        <TabsAction onClick={() => {}}>Orders</TabsAction>
      </TabsNavigation>
    </ThemeProvider>
  )
  for (const name of ['Businesses', 'Orders']) expect(screen.getByRole('button', { name }).className).toContain('ui:min-w-max')
  rerender(
    <ThemeProvider theme={theme}>
      <TabsNavigation tone='contrast'>
        <TabsAction onClick={() => {}}>Businesses</TabsAction>
      </TabsNavigation>
    </ThemeProvider>
  )
  expect(screen.getByRole('button', { name: 'Businesses' }).className).not.toContain('ui:min-w-max')
})

it.each([['defaults', defaults], ['grill', grill]])('uses the %s section track without selecting a popover trigger', (_, theme) => {
  const open = vi.fn()
  render(
    <ThemeProvider theme={theme}>
      <TabsNavigation mode='section' edgeToEdge>
        <TabsAction active aria-current='location' onClick={() => {}}>Pantry</TabsAction>
        <TabsAction aria-haspopup='dialog' onClick={open}>Categories</TabsAction>
      </TabsNavigation>
    </ThemeProvider>
  )
  const current = screen.getByRole('button', { name: 'Pantry', current: 'location' })
  expect(current).not.toHaveAttribute('aria-pressed')
  const bar = current.parentElement
  expect(bar.style.getPropertyValue('--ui-tabs-section-rim')).toBe(`${getThemeComponent(theme, 'category_tabs').base.border?.width ?? 0}px`)
  expect(bar.className).toContain('ui:min-w-max')
  const trigger = screen.getByRole('button', { name: 'Categories' })
  expect(trigger).not.toHaveAttribute('aria-pressed')
  fireEvent.click(trigger)
  expect(open).toHaveBeenCalledTimes(1)
})

it.each([['defaults', defaults], ['grill', grill]])('can place a %s themed icon above the label while keeping the track geometry', (_, theme) => {
  render(
    <ThemeProvider theme={theme}>
      <TabsScrollArea inset='lg'>
        <TabsNavigation mode='stacked' width='content' tone='primary'>
          <TabsAction icon={<svg data-testid='icon' />} onClick={() => {}}>Stores</TabsAction>
        </TabsNavigation>
      </TabsScrollArea>
    </ThemeProvider>
  )
  const button = screen.getByRole('button', { name: 'Stores' })
  const bar = button.parentElement
  expect(button.className).toContain('ui:flex-col')
  expect(button.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  expect(bar.style.getPropertyValue('--ui-tabs-icon-size')).toBe(getThemeCss(theme, 'tabs').sizes.md.icon_size)
  expect(bar.parentElement.style.getPropertyValue('--ui-tabs-inset-side')).toBe(themeSpace(theme, 'lg'))
})

it('insets the focus outline when an external tab scrollport clips around the track', () => {
  render(
    <ThemeProvider theme={defaults}>
      <TabsScrollArea>
        <TabsNavigation variant='plain'>
          <TabsAction onClick={() => {}}>First</TabsAction>
          <TabsAction onClick={() => {}}>Last</TabsAction>
        </TabsNavigation>
      </TabsScrollArea>
    </ThemeProvider>
  )
  for (const label of ['First', 'Last']) {
    expect(screen.getByRole('button', { name: label }).className)
      .toContain('ui:focus-visible:[outline-offset:calc(-1*var(--ot-focus-ring-width))]!')
  }
})

it('uses the same mobile variant, border, inset and size for the bar, actions and scrollport', () => {
  const theme = buildAppTheme(null, {
    version: 2,
    values: {
      components: { tabs: { sizes: { md: { height: 40 } }, variants: { pill: { inset: 4 } } } },
      platforms: { mobile_web: { components: { tabs: {
        sizes: { md: { height: 64 } },
        variants: { pill: { inset: 8, border: { width: 2, style: 'solid', color: '#112233' } } }
      } } } }
    }
  })
  const view = (mobile) => (
    <ThemeProvider theme={{ ...theme, platform: mobile ? 'mobile_web' : null }}>
      <TabsScrollArea variant='pill'>
        <TabsNavigation variant='pill'><TabsAction onClick={() => {}}>First</TabsAction></TabsNavigation>
      </TabsScrollArea>
      <Demo theme={{ ...theme, platform: mobile ? 'mobile_web' : null }} root={{ layout: 'equal-panel-width', variant: 'pill' }} />
    </ThemeProvider>
  )
  const { rerender } = render(view(true))
  const action = screen.getByRole('button', { name: 'First' })
  const bar = action.parentElement
  expect(bar.style.getPropertyValue('--ui-tabs-height')).toBe('64px')
  expect(bar.style.getPropertyValue('--ui-tabs-action-height')).toBe('44px')
  expect(bar.parentElement.style.getPropertyValue('--ui-tabs-track-height')).toBe('64px')
  expect(screen.getByRole('tablist').parentElement.style.getPropertyValue('--ui-tabs-action-height')).toBe('44px')
  rerender(view(false))
  expect(bar.style.getPropertyValue('--ui-tabs-height')).toBe('40px')
  expect(bar.style.getPropertyValue('--ui-tabs-action-height')).toBe('32px')
})

it.each([0, 12])('keeps the rim and trigger borders of a migrated pill with gap %s', gap => {
  const theme = themed({ variants: { pill: {
    inset: 0,
    gap,
    border: { width: 2, style: 'solid', color: '#223344' },
    tab_border: { width: 1, style: 'solid', color: '#666777' }
  } } })
  render(
    <ThemeProvider theme={theme}>
      <TabsNavigation variant='pill'>
        <TabsAction onClick={() => {}}>First</TabsAction>
        <TabsAction active onClick={() => {}}>Second</TabsAction>
      </TabsNavigation>
    </ThemeProvider>
  )
  const second = screen.getByRole('button', { name: 'Second' })
  const track = second.parentElement
  expect(track.className).toContain('ui:[border:var(--ui-tabs-border)]')
  expect(track.style.getPropertyValue('--ui-tabs-rim-overlap')).toBe('2px')
  expect(second.className).toContain('ui:[margin-block:calc(-1*var(--ui-tabs-rim-overlap))]')
  expect(second.className).not.toContain('border-inline-start-width:0')
  expect(second.className.includes('ui:not-first:[margin-inline-start:calc(-1*var(--ui-tabs-item-overlap))]')).toBe(gap === 0)
})

it('lets a stacked icon and its label determine the minimum without changing a text-only track', () => {
  const { container, rerender } = render(
    <ThemeProvider theme={defaults}>
      <TabsNavigation mode='stacked'>
        <TabsAction icon={<svg />} onClick={() => {}}>Stores</TabsAction>
      </TabsNavigation>
    </ThemeProvider>
  )
  const track = container.querySelector('[data-slot=tabs-navigation]')
  const action = screen.getByRole('button', { name: 'Stores' })
  expect(action).toHaveAttribute('data-stacked-icon')
  expect(action.className).toContain('ui:h-auto')
  expect(action.className).toContain('ui:[&>span]:shrink-0')
  expect(track.className).toContain('ui:has-[[data-stacked-icon]]:h-auto')
  rerender(
    <ThemeProvider theme={defaults}>
      <TabsNavigation mode='stacked'>
        <TabsAction onClick={() => {}}>Stores</TabsAction>
      </TabsNavigation>
    </ThemeProvider>
  )
  expect(screen.getByRole('button', { name: 'Stores' })).not.toHaveAttribute('data-stacked-icon')
  expect(track.style.getPropertyValue('--ui-tabs-height')).toBe('40px')
})

it.each([
  ['null', null, '2px solid #112233', '36px'],
  ['explicit zero', { width: 0, style: 'solid', color: '#334455' }, '0px solid #334455', '38px']
])('preserves the legacy underline frame with %s baseline', (_, baseline, bottom, height) => {
  const theme = themed({
    variants: {
      underline: { border: { width: 2, style: 'solid', color: '#112233' }, baseline }
    }
  })
  const { container } = render(
    <ThemeProvider theme={theme}>
      <TabsNavigation variant='underline'><TabsAction onClick={() => {}}>Section</TabsAction></TabsNavigation>
      <Tabs variant='underline' layout='equal-panel-width' defaultValue='details'>
        <TabsList><TabsTrigger value='details'>Details</TabsTrigger></TabsList>
      </Tabs>
      <Tabs variant='underline' layout='fill' defaultValue='existing'>
        <TabsList><TabsTrigger value='existing'>Existing</TabsTrigger></TabsList>
      </Tabs>
    </ThemeProvider>
  )
  const [navigation, migrated, existing] = container.querySelectorAll('[data-slot=tabs-navigation], [data-slot=tabs]')
  for (const bar of [navigation, migrated]) {
    expect(bar.style.getPropertyValue('--ui-tabs-baseline').toLowerCase()).toBe(bottom)
    expect(bar.style.getPropertyValue('--ui-tabs-action-height')).toBe(height)
  }
  if (baseline === null) expect(existing.style.getPropertyValue('--ui-tabs-baseline')).toBe('none')
})

describe('TabsAction as a link (navigation to another page)', () => {
  const bar = (theme, children) => render(<ThemeProvider theme={theme}><TabsNavigation aria-label='Profile'>{children}</TabsNavigation></ThemeProvider>)

  it.each([['defaults', defaults], ['grill', grill]])('with href it is an anchor that says where it is (%s)', (_, theme) => {
    bar(theme, <>
      <TabsAction active href='/profile'>My account</TabsAction>
      <TabsAction href='/profile/orders'>My orders</TabsAction>
    </>)
    const current = screen.getByRole('link', { name: 'My account' })
    const other = screen.getByRole('link', { name: 'My orders' })
    expect(current.tagName).toBe('A')
    expect(current).toHaveAttribute('href', '/profile')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current).toHaveAttribute('data-active', '')
    expect(other).not.toHaveAttribute('aria-current')
    expect(other).not.toHaveAttribute('data-active')
    // a link is not a toggle button
    expect(current).not.toHaveAttribute('aria-pressed')
    expect(current).not.toHaveAttribute('type')
    expect(screen.queryByRole('button')).toBeNull()
    // the same tab paint as the buttons, and no underline of the browser's
    expect(current).toHaveClass('ui:data-active:text-(--ui-tabs-active)', 'ui:no-underline')
    expect(current.parentElement.style.getPropertyValue('--ui-tabs-active')).toBe(getThemeCss(theme, 'tabs').variants[getThemeCss(theme, 'tabs').base.variant].active)
  })

  it('keeps the anchor\'s click for the app to navigate, and its icon and label', () => {
    const goTo = vi.fn((event) => event.preventDefault())
    bar(defaults, <TabsAction href='/profile/addresses' title='My addresses' icon={<svg data-testid='icon' />} onClick={goTo}>My addresses</TabsAction>)
    const link = screen.getByRole('link', { name: 'My addresses' })
    expect(link).toHaveAttribute('title', 'My addresses')
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true')
    fireEvent.click(link)
    expect(goTo).toHaveBeenCalledTimes(1)
  })

  it('is in the tab order like any link, and without href it is still the button', () => {
    bar(defaults, <><TabsAction href='/a'>A</TabsAction><TabsAction onClick={() => {}}>B</TabsAction></>)
    expect(screen.getByRole('link', { name: 'A' })).not.toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'false')
  })
})
