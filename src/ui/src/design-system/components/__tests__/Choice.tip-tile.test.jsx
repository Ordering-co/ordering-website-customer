import React from 'react'
import { expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { THEMES } from '../../preview/themes'
import { RadioGroup } from '../Checkbox'
import { Choice } from '../Choice'

it.each(THEMES.filter(({ id }) => id === 'defaults' || id === 'grill'))('keeps the themed tip-tile contract in $id', ({ theme }) => {
  const onClick = vi.fn()
  const { getByRole } = render(<ThemeProvider theme={theme}><RadioGroup value='option'><Choice value='option' variant='tip-tile' onActivate={onClick}>Custom</Choice></RadioGroup></ThemeProvider>)
  const tip = getByRole('radio', { name: 'Custom' })
  expect(tip).toHaveAttribute('aria-checked', 'true')
  expect(tip).toHaveClass('ui:w-auto')
  expect(tip.style.getPropertyValue('--ui-radio-size')).toBe(theme.css.components.radio.base.size)
  expect(!!tip.querySelector('[data-slot=choice-indicator]')).toBe(theme.values.components.choice.base.show_indicator !== false)
  fireEvent.click(tip)
  expect(onClick).toHaveBeenCalledOnce()
})

it.each(['readOnly', 'disabled'])('does not activate a radio when its group is %s', (restriction) => {
  const onActivate = vi.fn()
  const { getByRole } = render(
    <ThemeProvider theme={THEMES[0].theme}>
      <RadioGroup value='custom' {...{ [restriction]: true }}>
        <Choice value='custom' variant='tip-tile' onActivate={onActivate}>Custom</Choice>
      </RadioGroup>
    </ThemeProvider>
  )
  const radio = getByRole('radio', { name: 'Custom' })
  fireEvent.click(radio)
  fireEvent.keyDown(radio, { key: 'Enter' })
  expect(onActivate).not.toHaveBeenCalled()
})
