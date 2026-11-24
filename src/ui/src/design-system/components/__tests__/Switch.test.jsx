import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { themeOpacity } from '~/utils/themeTokens'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { Switch } from '../Switch'

// jsdom does not compile Tailwind: these prove the classes, attributes, variables
// and behavior; how it looks is the design spec's (e2e/design/pieces-choice.spec.js).
// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}
const theme = (id) => THEMES.find((entry) => entry.id === id).theme
const defaults = theme('defaults')
const draw = (element, current = defaults) => render(<ThemeProvider theme={current}>{element}</ThemeProvider>)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))

describe.each(['defaults', 'cafe', 'grill'])('Switch in %s', (id) => {
  const current = theme(id)

  it('is a switch that writes components.switch and the disabled opacity on its own element', () => {
    const { getByRole } = draw(<Switch aria-label='Notifications' />, current)
    const root = getByRole('switch')
    expect(root.getAttribute('data-slot')).toBe('switch')
    expect(vars(root)).toEqual({ ...componentVars(current, 'switch', { size: 'md' }), '--ui-switch-disabled-opacity': themeOpacity(current, 'disabled') })
  })

  it('`size` is the theme\'s height of that size', () => {
    const { getByRole } = draw(<Switch aria-label='Notifications' size='lg' />, current)
    expect(vars(getByRole('switch'))['--ui-switch-height']).toBe(current.css.components.switch.sizes.lg.height)
  })
})

describe('Switch', () => {
  it('reads every value from a variable: no literal in its classes', () => {
    const { getByRole, container } = draw(<Switch aria-label='Notifications' />)
    const classes = [getByRole('switch'), container.querySelector('[data-slot=switch-mark]'), container.querySelector('[data-slot=switch-thumb]')].map((el) => el.getAttribute('class')).join(' ')
    // (the 44 px touch floor is the one literal, marked in the piece)
    expect(classes.replaceAll('[44px]', '')).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+px|\d+ms/i)
    expect(classes).toContain('ui:h-(--ui-switch-height)')
    expect(classes).toContain('ui:bg-(--ui-switch-off)')
    expect(classes).toContain('ui:in-data-checked:bg-(--ui-switch-on)')
    expect(classes).toContain('ui:bg-(--ui-switch-thumb)')
    expect(classes).toContain('ui:motion-safe:duration-(--ui-switch-motion-duration)')
  })

  it('the thumb slides along the inline axis, so a right-to-left store mirrors it', () => {
    const { container } = draw(<Switch aria-label='Notifications' />)
    const thumb = container.querySelector('[data-slot=switch-thumb]').getAttribute('class')
    expect(thumb).toContain('ui:[inset-inline-start:')
    expect(thumb).toContain('ui:in-data-checked:[inset-inline-start:')
    expect(thumb).not.toMatch(/translate|\bleft\b|\bright\b/)
  })

  it('toggles with the pointer and with Space, and says so', () => {
    const onCheckedChange = vi.fn()
    const { getByRole } = draw(<Switch aria-label='Notifications' onCheckedChange={onCheckedChange} />)
    const root = getByRole('switch')
    expect(root.getAttribute('aria-checked')).toBe('false')
    expect(root.hasAttribute('data-checked')).toBe(false)
    fireEvent.click(root)
    expect(root.getAttribute('aria-checked')).toBe('true')
    expect(root.hasAttribute('data-checked')).toBe(true)
    expect(onCheckedChange.mock.calls[0][0]).toBe(true)
    fireEvent.keyDown(root, { key: ' ' })
    fireEvent.keyUp(root, { key: ' ' })
    expect(root.getAttribute('aria-checked')).toBe('false')
  })

  it('a controlled `checked` is what is shown', () => {
    const { getByRole, rerender } = draw(<Switch aria-label='Notifications' checked={false} onCheckedChange={() => {}} />)
    expect(getByRole('switch').getAttribute('aria-checked')).toBe('false')
    rerender(<ThemeProvider theme={defaults}><Switch aria-label='Notifications' checked onCheckedChange={() => {}} /></ThemeProvider>)
    expect(getByRole('switch').getAttribute('aria-checked')).toBe('true')
  })

  it('its label is one hit area with the control, and names it', () => {
    const onCheckedChange = vi.fn()
    const { getByRole, getByText } = draw(<Switch label='Marketing emails' onCheckedChange={onCheckedChange} />)
    expect(getByRole('switch', { name: 'Marketing emails' })).toBeTruthy()
    fireEvent.click(getByText('Marketing emails'))
    expect(onCheckedChange).toHaveBeenCalledOnce()
  })

  it('disabled and read only do not change, and say so; disabled dims by the theme\'s opacity', () => {
    const onCheckedChange = vi.fn()
    const { getByRole, rerender } = draw(<Switch aria-label='A' disabled onCheckedChange={onCheckedChange} />)
    const root = getByRole('switch')
    expect(root.hasAttribute('data-disabled')).toBe(true)
    expect(root.getAttribute('class')).toContain('ui:data-disabled:opacity-(--ui-switch-disabled-opacity)')
    fireEvent.click(root)
    expect(onCheckedChange).not.toHaveBeenCalled()
    rerender(<ThemeProvider theme={defaults}><Switch aria-label='A' readOnly onCheckedChange={onCheckedChange} /></ThemeProvider>)
    fireEvent.click(getByRole('switch'))
    expect(onCheckedChange).not.toHaveBeenCalled()
    expect(getByRole('switch').getAttribute('aria-readonly')).toBe('true')
  })

  it('is at least 44px to touch on a phone or a coarse pointer, around the control', () => {
    const { getByRole } = draw(<Switch aria-label='A' />)
    const classes = getByRole('switch').getAttribute('class')
    expect(classes).toContain('ui:max-mobile:after:min-h-[44px]')
    expect(classes).toContain('ui:pointer-coarse:after:min-w-[44px]')
  })

  it('submits with a form through its hidden input', () => {
    const { container } = draw(<form><Switch aria-label='A' name='marketing' defaultChecked /></form>)
    const input = container.querySelector('input[name=marketing]')
    expect(input).toBeTruthy()
    expect(input.checked).toBe(true)
  })

  it('a theme with animated off has no motion duration', () => {
    const still = buildAppTheme(null, { version: 2, values: { components: { switch: { base: { animated: false } } } } })
    const { getByRole } = draw(<Switch aria-label='A' />, still)
    expect(vars(getByRole('switch'))['--ui-switch-motion-duration']).toBe(componentVars(still, 'switch')['--ui-switch-motion-duration'])
  })
})
