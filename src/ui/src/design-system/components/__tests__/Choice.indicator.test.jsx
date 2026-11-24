import React from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { THEMES } from '../../preview/themes'
import { CheckboxGroup, RadioGroup } from '../Checkbox'
import { Choice } from '../Choice'

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}
const defaults = THEMES.find(({ id }) => id === 'defaults').theme
const hidden = buildAppTheme(null, { version: 2, values: { components: { choice: { base: { show_indicator: false } } } } })
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const mark = (container) => container.querySelector('[data-slot=choice-indicator]')

describe('Choice: `indicator` per instance', () => {
  it('follows the theme by default and `indicator={false}` hides it in this row only', () => {
    const { container, getAllByRole } = draw(
      <RadioGroup value='a' aria-label='Methods'>
        <Choice value='a' title='Shown' />
        <Choice value='b' title='Hidden' indicator={false} />
      </RadioGroup>
    )
    const [shown, off] = getAllByRole('radio')
    expect(mark(shown)).toBeTruthy()
    expect(mark(off)).toBeNull()
    expect(container.querySelectorAll('[data-slot=choice-indicator]')).toHaveLength(1)
  })

  it('also in a check row and in a tip tile', () => {
    const { getByRole } = draw(
      <>
        <CheckboxGroup value={['x']} aria-label='Extras'><Choice type='check' value='x' title='Balance' indicator={false} /></CheckboxGroup>
        <RadioGroup value='t' aria-label='Tips'><Choice value='t' variant='tip-tile' indicator={false}>10%</Choice></RadioGroup>
      </>
    )
    expect(mark(getByRole('checkbox'))).toBeNull()
    expect(mark(getByRole('radio'))).toBeNull()
  })

  it('never shows what the store\'s theme hides: `indicator` only turns it off', () => {
    const { getByRole } = draw(<RadioGroup value='a' aria-label='M'><Choice value='a' title='A' indicator /></RadioGroup>, hidden)
    expect(mark(getByRole('radio'))).toBeNull()
  })

  it('the row without its indicator is still the control, named and selected as before', () => {
    const { getByRole } = draw(
      <RadioGroup defaultValue='a' aria-label='M'>
        <Choice value='a' title='A' />
        <Choice value='b' title='B' indicator={false} />
      </RadioGroup>
    )
    const b = getByRole('radio', { name: 'B' })
    fireEvent.click(b)
    expect(b).toHaveAttribute('aria-checked', 'true')
    expect(b).toHaveAttribute('data-checked')
  })
})
