import React from 'react'
import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'
import { THEMES } from '../../preview/themes'
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip'
import { Dialog, DialogContent, DialogTitle } from '../Dialog'
import { Sheet, SheetContent, SheetTitle } from '../Sheet'

// jsdom lays nothing out: these prove the parts, the attributes, the variables and the behavior;
// where it sits and how it looks is the browser's (e2e/design/pieces-overlay.spec.js).
const [defaults, grill] = THEMES.map(({ theme }) => theme)

const Demo = ({ theme = defaults, root, trigger, content }) => (
  <ThemeProvider theme={theme}>
    <button type='button'>Elsewhere</button>
    <Tooltip {...root}>
      <TooltipTrigger delay={0} closeDelay={0} {...trigger}>Connection status</TooltipTrigger>
      <TooltipContent {...content}>Verify the server connection</TooltipContent>
    </Tooltip>
  </ThemeProvider>
)
const gone = () => waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull())

describe('Tooltip: behaviour', () => {
  it('is hidden at rest, opens on the pointer and describes its trigger', async () => {
    render(<Demo />)
    const trigger = screen.getByRole('button', { name: 'Connection status' })
    expect(screen.queryByRole('tooltip')).toBeNull()
    fireEvent.pointerEnter(trigger)
    fireEvent.mouseEnter(trigger)
    fireEvent.pointerMove(trigger)
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Verify the server connection')
    expect(tip.getAttribute('data-slot')).toBe('tooltip-content')
    expect(trigger.getAttribute('aria-describedby')).toContain(tip.id)
  })

  it('opens with the keyboard focus and Escape dismisses it, leaving the focus where it is', async () => {
    render(<Demo />)
    const trigger = screen.getByRole('button', { name: 'Connection status' })
    await act(async () => { trigger.focus() })
    const tip = await screen.findByRole('tooltip')
    expect(tip).toBeTruthy()
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    await gone()
    expect(document.activeElement).toBe(trigger)
  })

  it('pressing the trigger dismisses it, as the legacy tip did', async () => {
    render(<Demo />)
    const trigger = screen.getByRole('button', { name: 'Connection status' })
    await act(async () => { trigger.focus() })
    await screen.findByRole('tooltip')
    fireEvent.click(trigger)
    await gone()
  })

  it('is not opened by a disabled root', async () => {
    render(<Demo root={{ disabled: true }} />)
    await act(async () => { screen.getByRole('button', { name: 'Connection status' }).focus() })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})

describe('Tooltip: the theme', () => {
  it.each([['defaults', defaults], ['grill', grill]])('paints components.tooltip in %s, in a portal that carries it', async (_id, theme) => {
    render(<Demo theme={theme} />)
    await act(async () => { screen.getByRole('button', { name: 'Connection status' }).focus() })
    const tip = await screen.findByRole('tooltip')
    const base = getThemeCss(theme, 'tooltip').base
    const portal = tip.closest('[data-base-ui-portal]')
    expect(portal.style.getPropertyValue('--ui-tooltip-background')).toBe(base.background)
    expect(portal.style.getPropertyValue('--ui-tooltip-color')).toBe(base.color)
    expect(portal.style.getPropertyValue('--ui-tooltip-radius')).toBe(base.radius)
    expect(portal.style.getPropertyValue('--ui-tooltip-padding')).toBe(base.padding)
    expect(portal.style.getPropertyValue('--ui-tooltip-max-width')).toBe(base.max_width)
    expect(portal.style.getPropertyValue('--ui-tooltip-offset')).toBe(base.offset)
    expect(portal.style.getPropertyValue('--ui-tooltip-motion-duration')).not.toBe('')
    const classes = tip.className
    ;['ui:bg-(--ui-tooltip-background)', 'ui:text-(--ui-tooltip-color)', 'ui:rounded-(--ui-tooltip-radius)', 'ui:p-(--ui-tooltip-padding)',
      'ui:[border:var(--ui-tooltip-border,none)]', 'ui:[box-shadow:var(--ui-tooltip-shadow,none)]'].forEach((name) => expect(classes).toContain(name))
    expect(classes).toContain('ui:text-(length:--ui-tooltip-text-size)')
  })

  it('sits on the page layer by default and above a modal on layer=modal', async () => {
    const { unmount } = render(<Demo />)
    await act(async () => { screen.getByRole('button', { name: 'Connection status' }).focus() })
    await screen.findByRole('tooltip')
    expect(document.querySelector('[data-slot=tooltip-positioner]').className).toContain('ui:z-10002')
    unmount()
    render(<Demo content={{ layer: 'modal' }} />)
    await act(async () => { screen.getByRole('button', { name: 'Connection status' }).focus() })
    await screen.findByRole('tooltip')
    expect(document.querySelector('[data-slot=tooltip-positioner]').className).toContain('ui:z-20602')
  })

  it('takes the modal layer by itself under a Dialog or a Sheet, and the page layer elsewhere', async () => {
    const tip = <Tooltip><TooltipTrigger delay={0}>Connection status</TooltipTrigger><TooltipContent>Verify the server connection</TooltipContent></Tooltip>
    const hosts = {
      dialog: <Dialog open><DialogContent><DialogTitle>Cart</DialogTitle>{tip}</DialogContent></Dialog>,
      sheet: <Sheet open><SheetContent><SheetTitle>Cart</SheetTitle>{tip}</SheetContent></Sheet>
    }
    for (const host of Object.keys(hosts)) {
      const { unmount } = render(<ThemeProvider theme={defaults}>{hosts[host]}</ThemeProvider>)
      const trigger = screen.getByRole('button', { name: 'Connection status' })
      fireEvent.pointerEnter(trigger)
      fireEvent.mouseEnter(trigger)
      fireEvent.pointerMove(trigger)
      await screen.findByRole('tooltip')
      expect(document.querySelector('[data-slot=tooltip-positioner]').className, host).toContain('ui:z-20602')
      unmount()
    }
  })

  it('never wider than the theme\'s maximum nor than the screen less a gutter on each side', async () => {
    render(<Demo />)
    await act(async () => { screen.getByRole('button', { name: 'Connection status' }).focus() })
    const tip = await screen.findByRole('tooltip')
    expect(tip.className).toContain('ui:max-w-[min(var(--ui-tooltip-max-width),calc(100vw-2*var(--ot-space-lg)))]')
  })
})
