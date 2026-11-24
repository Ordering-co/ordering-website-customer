import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { THEMES } from '../../preview/themes'
import { Choice } from '../Choice'
import { Icon } from '../Icon'

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}
const defaults = THEMES.find(({ id }) => id === 'defaults').theme
const draw = (element) => render(<ThemeProvider theme={defaults}>{element}</ThemeProvider>)

describe('Choice: `icon` and `trailing` (a balance row)', () => {
  const row = (props) => draw(
    <Choice type='check' title='Pay with wallet credits' icon={<Icon name='walletCash' size='md' />} trailing='12 Wallet credits' defaultChecked {...props} />
  )

  it('the icon opens the row after the indicator, decoration; the trailing text closes it, at the end', () => {
    const { getByRole } = row()
    const root = getByRole('checkbox')
    const slots = [...root.children].map((el) => el.getAttribute('data-slot'))
    expect(slots).toEqual(['choice-indicator', 'choice-icon', 'choice-text', 'choice-trailing'])
    const icon = root.querySelector('[data-slot=choice-icon]')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon.querySelector('svg')).toBeTruthy()
    expect(icon.className).toContain('ui:shrink-0')
    const trailing = root.querySelector('[data-slot=choice-trailing]')
    expect(trailing.textContent).toBe('12 Wallet credits')
    expect(trailing.className).toContain('ui:ms-auto')
    expect(trailing.className).toContain('ui:text-end')
  })

  it('the row is named by its title and described by the trailing text', () => {
    const { getByRole } = row()
    const root = getByRole('checkbox', { name: 'Pay with wallet credits' })
    expect(root.getAttribute('aria-describedby')).toBe(root.querySelector('[data-slot=choice-trailing]').id)
    const both = draw(<Choice type='check' title='T' secondary='S' trailing='X' />)
    const ids = both.getAllByRole('checkbox')[1].getAttribute('aria-describedby').split(' ')
    expect(ids).toHaveLength(2)
  })

  it('a click on the trailing text toggles the row (it is not an `end` control)', () => {
    const onCheckedChange = vi.fn()
    const { getByText } = row({ defaultChecked: false, onCheckedChange })
    fireEvent.click(getByText('12 Wallet credits'))
    expect(onCheckedChange).toHaveBeenCalledOnce()
    expect(onCheckedChange.mock.calls[0][0]).toBe(true)
  })

  it('works in a row without an indicator and keeps the text growing', () => {
    const { getByRole } = row({ indicator: false })
    const root = getByRole('checkbox')
    expect([...root.children].map((el) => el.getAttribute('data-slot'))).toEqual(['choice-icon', 'choice-text', 'choice-trailing'])
    expect(root.querySelector('[data-slot=choice-text]').className).toContain('ui:flex-1')
  })

  it('without them the row is as it was: no slot', () => {
    const { container } = draw(<Choice type='check' title='Plain' />)
    expect(container.querySelector('[data-slot=choice-icon]')).toBeNull()
    expect(container.querySelector('[data-slot=choice-trailing]')).toBeNull()
  })
})
