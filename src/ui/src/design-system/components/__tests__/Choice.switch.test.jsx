import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { THEMES } from '../../preview/themes'
import { Choice } from '../Choice'
import { switchVars } from '../Switch'

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}
const defaults = THEMES.find(({ id }) => id === 'defaults').theme
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))

describe.each(THEMES.filter(({ id }) => id === 'defaults' || id === 'grill'))('Choice type switch in $id', ({ theme }) => {
  it('is a switch row: components.choice for the row, components.switch for the track', () => {
    const { getByRole } = draw(<Choice type='switch' title='Marketing emails' />, theme)
    const row = getByRole('switch', { name: 'Marketing emails' })
    expect(row).toHaveAttribute('data-slot', 'choice')
    expect(vars(row)['--ui-choice-height']).toBe(theme.css.components.choice.sizes.md.height)
    expect(vars(row)['--ui-switch-on']).toBe(switchVars(theme)['--ui-switch-on'])
    expect(vars(row)['--ui-switch-height']).toBe(switchVars(theme)['--ui-switch-height'])
  })
})

describe('Choice type switch', () => {
  it('the whole row is the switch: its text, the row and Space toggle it', () => {
    const onCheckedChange = vi.fn()
    const { getByRole, getByText } = draw(<Choice type='switch' title='Marketing emails' onCheckedChange={onCheckedChange} />)
    const row = getByRole('switch')
    expect(row).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(getByText('Marketing emails'))
    expect(row).toHaveAttribute('aria-checked', 'true')
    expect(row).toHaveAttribute('data-checked')
    expect(onCheckedChange.mock.calls[0][0]).toBe(true)
    fireEvent.click(row)
    expect(row).toHaveAttribute('aria-checked', 'false')
    expect(onCheckedChange).toHaveBeenCalledTimes(2)
  })

  it('the track is the last thing of the row, decoration; the text takes the room', () => {
    const { getByRole } = draw(<Choice type='switch' title='Marketing emails' trailing='Weekly' />)
    const row = getByRole('switch')
    expect([...row.children].map((el) => el.getAttribute('data-slot')).filter(Boolean)).toEqual(['choice-text', 'choice-trailing', 'switch-mark'])
    expect(row.querySelector('[data-slot=switch-mark]')).toHaveAttribute('aria-hidden', 'true')
    expect(row.querySelector('[data-slot=choice-text]').className).toContain('ui:flex-1')
  })

  it('the track is the control, so no theme or `indicator` hides it, and no radio or check is drawn', () => {
    const hidden = buildAppTheme(null, { version: 2, values: { components: { choice: { base: { show_indicator: false } } } } })
    const { getByRole } = draw(<Choice type='switch' title='Marketing emails' indicator={false} />, hidden)
    const row = getByRole('switch')
    expect(row.querySelector('[data-slot=switch-mark]')).toBeTruthy()
    expect(row.querySelector('[data-slot=choice-indicator]')).toBeNull()
  })

  it('on it paints the selected look of the choice, and disabled dims the row once, not the track again', () => {
    const { getByRole } = draw(<Choice type='switch' title='Marketing emails' checked disabled onCheckedChange={() => {}} />)
    const row = getByRole('switch')
    expect(row).toHaveAttribute('data-checked')
    expect(row).toHaveAttribute('data-disabled')
    expect(row.className).toContain('ui:data-disabled:opacity-(--ui-choice-disabled-opacity)')
    expect(row.querySelector('[data-slot=switch-mark]').className).not.toContain('opacity')
    fireEvent.click(row)
    expect(row).toHaveAttribute('aria-checked', 'true')
  })

  it('submits with a form: `name` and `inputRef` are the hidden input\'s', () => {
    const inputRef = React.createRef()
    const { container } = draw(<form><Choice type='switch' title='M' name='marketing' defaultChecked inputRef={inputRef} /></form>)
    expect(container.querySelector('input[name=marketing]')).toBe(inputRef.current)
    expect(inputRef.current.checked).toBe(true)
  })

  it('is at least 44px high to touch, as every row', () => {
    const { getByRole } = draw(<Choice type='switch' title='M' />)
    expect(getByRole('switch').className).toContain('ui:max-mobile:after:min-h-[44px]')
  })
})
