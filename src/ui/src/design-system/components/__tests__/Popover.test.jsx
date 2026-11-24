import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { getThemeCss } from '~/utils/themeCss'
import { scopedTheme } from '~/utils/themeGroups'
import { isInsideOverlay } from '~/utils/overlay'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { POPOVER_ARROW_HEIGHT } from '~ui/src/styles/Rules'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import {
  Popover, PopoverArrow, PopoverClose, PopoverContent, PopoverPanel, PopoverDescription, PopoverTitle, PopoverTrigger
} from '../Popover'

// jsdom does not compile Tailwind or lay anything out: these prove the classes, the
// attributes, the variables and the behavior; where it sits and how it looks is the
// preview page's and the browser's.
const [defaults, grill, cafe] = THEMES.map(({ theme }) => theme)

const Demo = ({ theme = defaults, root, content, children }) => (
  <ThemeProvider theme={theme}>
    <button type='button'>Elsewhere</button>
    <Popover {...root}>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent {...content}>
        <PopoverTitle>Delivery time</PopoverTitle>
        <PopoverDescription>Pick the moment</PopoverDescription>
        <input aria-label='Time' />
        {children}
        <PopoverClose>Done</PopoverClose>
      </PopoverContent>
    </Popover>
  </ThemeProvider>
)

const open = async () => {
  const trigger = screen.getByText('Open')
  trigger.focus()
  fireEvent.click(trigger)
  return { trigger, popup: await screen.findByRole('dialog') }
}
const portalOf = (el) => el.closest('[data-base-ui-portal]')
const gone = () => waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
const varsOf = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--ui-')).map((name) => [name, el.style.getPropertyValue(name)]))

describe('Popover: behaviour', () => {
  it('opens from its trigger, which says so, and is named by its title and described by its description', async () => {
    render(<Demo />)
    const trigger = screen.getByText('Open')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    const { popup } = await open()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(popup.getAttribute('data-slot')).toBe('popover-content')
    expect(popup).toHaveAccessibleName('Delivery time')
    expect(popup).toHaveAccessibleDescription('Pick the moment')
  })

  it('moves the focus in, closes with Escape and gives the focus back to what opened it', async () => {
    render(<Demo />)
    const { trigger, popup } = await open()
    await waitFor(() => expect(popup.contains(document.activeElement)).toBe(true))
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    await gone()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('a press outside closes it; the page stays usable (it is not modal)', async () => {
    render(<Demo />)
    await open()
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toBeTruthy()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }))
    fireEvent.click(screen.getByRole('button', { name: 'Elsewhere' }))
    await gone()
  })

  it('a press inside does not close it; the close button does, and says why', async () => {
    const onOpenChange = vi.fn()
    render(<Demo root={{ onOpenChange }} />)
    const { popup } = await open()
    fireEvent.pointerDown(popup)
    fireEvent.click(popup)
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)) })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    onOpenChange.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    await gone()
    expect(onOpenChange.mock.calls[0][0]).toBe(false)
    expect(onOpenChange.mock.calls[0][1].reason).toBe('close-press')
  })

  it('is controlled: the header keeps the open state and can refuse a close', async () => {
    const Controlled = () => {
      const [openState, setOpen] = React.useState(false)
      return (
        <ThemeProvider theme={defaults}>
          <button type='button' onClick={() => setOpen(true)}>External</button>
          <Popover open={openState} onOpenChange={(next, details) => { if (details.reason !== 'outside-press') setOpen(next) }}>
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent anchor={() => document.body}><PopoverTitle>Cart</PopoverTitle></PopoverContent>
          </Popover>
        </ThemeProvider>
      )
    }
    render(<Controlled />)
    fireEvent.click(screen.getByText('External'))
    await screen.findByRole('dialog')
    // an outside press the parent refuses leaves it open; Escape is allowed and closes it
    fireEvent.pointerDown(document.body)
    fireEvent.click(document.body)
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)) })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    await gone()
  })

  it('where it opens: below the trigger and centered by default, or the side and alignment asked for', async () => {
    const { unmount } = render(<Demo />)
    const { popup } = await open()
    expect(popup.getAttribute('data-side')).toBe('bottom')
    expect(popup.getAttribute('data-align')).toBe('center')
    unmount()
    render(<Demo content={{ side: 'top', align: 'end' }} />)
    const asked = (await open()).popup
    expect(asked.getAttribute('data-align')).toBe('end')
    expect(['top', 'bottom']).toContain(asked.getAttribute('data-side'))
  })
})

describe('Popover: a layer for legacy click-outside handlers (isInsideOverlay)', () => {
  it('its portal is marked, so a click inside the popover is inside a layer, as in a dialog', async () => {
    render(<Demo />)
    const { popup } = await open()
    const portal = portalOf(popup)
    expect(portal).not.toBeNull()
    expect(portal.parentElement).toBe(document.body)
    expect(isInsideOverlay(popup)).toBe(true)
    expect(isInsideOverlay(screen.getByLabelText('Time'))).toBe(true)
    expect(isInsideOverlay(screen.getByText('Pick the moment'))).toBe(true)
    // the page and the trigger are not
    expect(isInsideOverlay(screen.getByRole('button', { name: 'Elsewhere' }))).toBe(false)
    expect(isInsideOverlay(document.body)).toBe(false)
  })
})

describe('Popover: layers', () => {
  it('a popover of the page is below the legacy Popup and the Dialog (20002) and the Sheet (20601)', async () => {
    render(<Demo />)
    const { popup } = await open()
    const classes = popup.parentElement.getAttribute('class')
    expect(popup.parentElement.getAttribute('data-slot')).toBe('popover-positioner')
    expect(classes).toContain('ui:z-10002')
    expect(classes).not.toContain('ui:z-20')
  })

  it('one opened inside a dialog or a sheet is above both', async () => {
    render(<Demo content={{ layer: 'modal' }} />)
    const { popup } = await open()
    const classes = popup.parentElement.getAttribute('class')
    expect(classes).toContain('ui:z-20602')
    expect(classes).not.toContain('ui:z-10002')
  })
})

describe('Popover: the theme', () => {
  it.each([['defaults', defaults], ['grill', grill], ['cafe', cafe]])('the portal carries components.menu of %s', async (_, theme) => {
    render(<Demo theme={theme} />)
    const portal = portalOf((await open()).popup)
    const menu = getThemeCss(theme, 'menu')
    expect(varsOf(portal)).toEqual(componentVars(theme, 'menu', { radius: 'md' }))
    expect(portal.style.getPropertyValue('--ui-menu-background')).toBe(menu.base.background)
    expect(portal.style.getPropertyValue('--ui-menu-radius')).toBe(menu.base.radius)
    expect(portal.style.getPropertyValue('--ui-menu-shadow')).toBe(menu.base.shadow.css)
    expect(portal.style.getPropertyValue('--ui-menu-max-width')).toBe(menu.base.max_width)
    expect(portal.style.getPropertyValue('--ui-menu-border')).toBe(menu.base.border ?? 'none')
  })

  it('a theme that moves the menu moves the popover', async () => {
    const theme = buildAppTheme(null, { version: 2, values: { components: { menu: { base: { radius: 3, max_width: 320, border: { width: 1, color: '#123456', style: 'solid' } } } } } })
    render(<Demo theme={theme} />)
    const portal = portalOf((await open()).popup)
    expect(varsOf(portal)).toMatchObject({ '--ui-menu-radius': '3px', '--ui-menu-max-width': '320px', '--ui-menu-border': '1px solid #123456' })
  })

  it('it takes the theme in context where it is opened from, in the portal too; no group scopes the menu, so a group is the global one', async () => {
    render(<ThemeProvider theme={defaults}><ComponentScope group='header'><Demo theme={cafe} /></ComponentScope></ThemeProvider>)
    const portal = portalOf((await open()).popup)
    expect(portal.parentElement).toBe(document.body)
    expect(varsOf(portal)).toEqual(componentVars(scopedTheme(cafe, 'header'), 'menu', { radius: 'md' }))
    expect(varsOf(portal)).toEqual(componentVars(cafe, 'menu', { radius: 'md' }))
    expect(portal.style.getPropertyValue('--ui-menu-radius')).not.toBe(componentVars(defaults, 'menu', {})['--ui-menu-radius'])
  })

  it('its motion is the menu\'s: 0ms when the theme does not animate', async () => {
    const still = buildAppTheme(null, { version: 2, values: { tokens: { motion_style: { enabled: false } } } })
    render(<Demo theme={still} />)
    expect(portalOf((await open()).popup).style.getPropertyValue('--ui-menu-motion-duration')).toBe('0ms')
  })

  it('no value is written in its classes: it reads the menu\'s variables, tokens by name and the layer', async () => {
    render(<Demo content={{ width: 'menu' }} />)
    const { popup } = await open()
    const classes = `${popup.getAttribute('class')} ${popup.parentElement.getAttribute('class')} ${screen.getByText('Delivery time').getAttribute('class')}`
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+ms|\d+px/i)
    ;['ui:bg-(--ui-menu-background)', 'ui:rounded-(--ui-menu-radius)', 'ui:[border:var(--ui-menu-border,none)]', 'ui:[box-shadow:var(--ui-menu-shadow,none)]',
      'ui:motion-safe:duration-(--ui-menu-motion-duration)', 'ui:motion-safe:ease-(--ui-menu-motion-easing)', 'ui:data-starting-style:opacity-0',
      'ui:max-h-(--available-height)', 'ui:w-(--ui-menu-max-width)'].forEach((name) => expect(classes).toContain(name))
    // the room off the trigger is a level of the scale, on the side it opens from
    expect(classes).toContain('ui:data-[side=bottom]:mt-xs')
  })

  it('its width: the content\'s up to the menu\'s maximum, the menu\'s, or the trigger\'s', async () => {
    const widths = { content: 'ui:w-max', menu: 'ui:w-(--ui-menu-max-width)', anchor: 'ui:w-(--anchor-width)' }
    for (const [width, cls] of Object.entries(widths)) {
      const view = render(<Demo content={{ width }} />)
      const { popup } = await open()
      expect(popup.getAttribute('class')).toContain(cls)
      expect(popup.getAttribute('class')).toContain('ui:max-w-[min(var(--ui-menu-max-width),var(--available-width))]')
      fireEvent.keyDown(document.activeElement, { key: 'Escape' })
      await gone()
      view.unmount()
    }
  })

  it('the title and description are the menu\'s text; className wins over the piece\'s classes', async () => {
    render(<Demo content={{ className: 'ui:rounded-none' }} />)
    const { popup } = await open()
    expect(popup.getAttribute('class')).toContain('ui:rounded-none')
    expect(popup.getAttribute('class')).not.toContain('ui:rounded-(--ui-menu-radius)')
    expect(screen.getByText('Delivery time').getAttribute('class')).toContain('ui:text-(length:--ui-menu-item-text-size)')
    expect(screen.getByText('Pick the moment').getAttribute('class')).toContain('ui:text-muted-foreground')
    expect(screen.getByText('Delivery time').getAttribute('data-slot')).toBe('popover-title')
  })
})

it.each(THEMES.filter(({ id }) => ['defaults', 'grill'].includes(id)))('arrow panel uses the menu box and scrollbar in $id', ({ theme }) => {
  const { container } = render(
    <ThemeProvider theme={theme}>
      <PopoverPanel variant='arrow' arrow={{ style: { left: 10 } }}>Categories</PopoverPanel>
    </ThemeProvider>
  )
  const panel = container.querySelector('[data-slot=popover-content]')
  expect(panel.style.getPropertyValue('--ui-menu-background')).toBe(theme.css.components.menu.base.background)
  expect(panel.style.getPropertyValue('--ui-select-scrollbar-size')).toBe(theme.css.identity.scrollbar.size)
  const arrow = panel.querySelector('[data-slot=popover-arrow]')
  expect(arrow.style.left).toBe('10px')
  expect(arrow).toHaveAttribute('aria-hidden', 'true')
  // the panel still trims the store's menu width, now by a share of its container and of the line length, not 500 px
  expect(panel.className).toContain('ui:max-w-[min(100%,62ch)]')
  expect(panel.className).not.toContain('500px')
})

describe('PopoverArrow: the pointer of an externally placed popover', () => {
  it('is a decorative triangle that takes the placement engine\'s ref and style, above the panel by its own height', () => {
    const ref = React.createRef()
    render(<ThemeProvider theme={defaults}><PopoverArrow ref={ref} style={{ left: 10 }} /></ThemeProvider>)
    const arrow = ref.current
    expect(arrow.getAttribute('data-slot')).toBe('popover-arrow')
    expect(arrow).toHaveAttribute('aria-hidden', 'true')
    expect(arrow.style.left).toBe('10px')
    // the geometry is the piece's: a 7:4 triangle whose height lifts it above the panel; it follows no store spacing
    expect(arrow.className).toContain('ui:aspect-[7/4]')
    expect(arrow.className).toContain('ui:top-[calc(-1*var(--ui-popover-arrow-height))]')
    expect(arrow.className).toContain('ui:h-(--ui-popover-arrow-height)')
    expect(arrow.className).not.toMatch(/ui:(h|w|top)-(xs|sm|md|lg)/)
    // its 8 px is the named rule, written on the element, whatever the store's spacing
    expect(POPOVER_ARROW_HEIGHT).toBe('8px')
    expect(arrow.style.getPropertyValue('--ui-popover-arrow-height')).toBe(POPOVER_ARROW_HEIGHT)
  })

  it('paints the menu\'s background unless the caller gives the surface it points from', () => {
    const { rerender } = render(<ThemeProvider theme={defaults}><PopoverArrow data-testid='a' /></ThemeProvider>)
    expect(screen.getByTestId('a').className).toContain('ui:bg-(--ui-popover-arrow-background,var(--ui-menu-background))')
    expect(screen.getByTestId('a').style.getPropertyValue('--ui-popover-arrow-background')).toBe('')
    rerender(<ThemeProvider theme={defaults}><PopoverArrow data-testid='a' background='#112233' /></ThemeProvider>)
    expect(screen.getByTestId('a').style.getPropertyValue('--ui-popover-arrow-background')).toBe('#112233')
  })

  it('the arrow variant of the panel is this same piece', () => {
    const { container } = render(<ThemeProvider theme={defaults}><PopoverPanel variant='arrow' arrow={{ background: '#445566' }}>Cart</PopoverPanel></ThemeProvider>)
    expect(container.querySelector('[data-slot=popover-arrow]').style.getPropertyValue('--ui-popover-arrow-background')).toBe('#445566')
  })
})
