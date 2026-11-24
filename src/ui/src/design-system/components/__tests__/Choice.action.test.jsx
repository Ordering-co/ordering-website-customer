import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { Choice } from '../Choice'

const defaults = THEMES.find(({ id }) => id === 'defaults').theme
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))

// A row of a list whose choice is an action (change the payment method: Stripe's dialog opens;
// change the language: the page reloads), not a selection among radios.
const List = ({ current = 'card', onPick = () => {}, ...choice }) => (
  <div role='group' aria-label='Payment methods'>
    {['card', 'cash'].map((id) => (
      <Choice key={id} variant='action' selected={current === id} onClick={() => onPick(id)} title={id} {...(id === 'cash' ? choice : {})} />
    ))}
  </div>
)

describe.each(THEMES.filter(({ id }) => id === 'defaults' || id === 'grill'))('Choice variant action in $id', ({ theme }) => {
  it('is a native button that writes components.choice and the radio\'s indicator variables', () => {
    const { getByRole } = draw(<List />, theme)
    const row = getByRole('button', { name: 'card' })
    expect(row.tagName).toBe('BUTTON')
    expect(row).toHaveAttribute('type', 'button')
    expect(row).toHaveAttribute('data-slot', 'choice')
    expect(vars(row)['--ui-choice-height']).toBe(componentVars(theme, 'choice', { variant: 'default' })['--ui-choice-height'])
    expect(vars(row)['--ui-radio-size']).toBe(theme.css.components.radio.base.size)
    expect(!!row.querySelector('[data-slot=choice-indicator]')).toBe(theme.values.components.choice.base.show_indicator !== false)
  })
})

describe('Choice variant action', () => {
  it('says which one is current with aria-pressed and data-checked, not with a radio role', () => {
    const { getByRole, queryByRole } = draw(<List current='cash' />)
    expect(getByRole('button', { name: 'cash' })).toHaveAttribute('aria-pressed', 'true')
    expect(getByRole('button', { name: 'cash' })).toHaveAttribute('data-checked')
    expect(getByRole('button', { name: 'card' })).toHaveAttribute('aria-pressed', 'false')
    expect(getByRole('button', { name: 'card' })).not.toHaveAttribute('data-checked')
    expect(queryByRole('radio')).toBeNull()
  })

  it('a click activates it, also on the one that is already current', () => {
    const onPick = vi.fn()
    const { getByRole } = draw(<List current='card' onPick={onPick} />)
    fireEvent.click(getByRole('button', { name: 'card' }))
    fireEvent.click(getByRole('button', { name: 'cash' }))
    expect(onPick.mock.calls).toEqual([['card'], ['cash']])
  })

  it('the arrows neither select nor move: only a click, Enter or Space acts (the browser\'s button)', () => {
    const onPick = vi.fn()
    const { getByRole } = draw(<List current='card' onPick={onPick} />)
    const card = getByRole('button', { name: 'card' })
    card.focus()
    ;['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].forEach((key) => fireEvent.keyDown(card, { key }))
    expect(onPick).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(card)
    expect(getByRole('button', { name: 'card' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('disabled does nothing, says so and dims by the choice\'s own opacity', () => {
    const onPick = vi.fn()
    const { getByRole } = draw(<List onPick={onPick} disabled />)
    const row = getByRole('button', { name: 'cash' })
    expect(row).toBeDisabled()
    expect(row).toHaveAttribute('data-disabled')
    expect(row.className).toContain('ui:data-disabled:opacity-(--ui-choice-disabled-opacity)')
    fireEvent.click(row)
    expect(onPick).not.toHaveBeenCalled()
  })

  it('paints the same row as a radio choice: title, secondary, icon, trailing and the 44 px floor', () => {
    const { getByRole } = draw(<List secondary='Pay when it arrives' icon={<svg />} trailing='Fee' />)
    const row = getByRole('button', { name: 'cash' })
    expect(row).toHaveAccessibleDescription(/Pay when it arrives/)
    expect([...row.children].map((el) => el.getAttribute('data-slot'))).toEqual(['choice-indicator', 'choice-icon', 'choice-text', 'choice-trailing'])
    expect(row.className).toContain('ui:min-h-(--ui-choice-height)')
    expect(row.className).toContain('ui:max-mobile:after:min-h-[44px]')
    expect(row.className).toContain('ui:pointer-coarse:after:min-h-[44px]')
  })

  it('`indicator={false}` leaves the row with its background and border alone', () => {
    const { getByRole } = draw(<List indicator={false} />)
    expect(getByRole('button', { name: 'cash' }).querySelector('[data-slot=choice-indicator]')).toBeNull()
  })

  it('`aria-label` names it instead of the title', () => {
    const { getByRole } = draw(<List aria-label='Pay in cash' />)
    expect(getByRole('button', { name: 'Pay in cash' })).toBeTruthy()
  })
})
