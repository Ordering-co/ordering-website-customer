import React from 'react'
import { expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { THEMES } from '../../preview/themes'
import { RadioGroup } from '../Checkbox'
import { Choice } from '../Choice'

it.each(THEMES.filter(({ id }) => id === 'defaults' || id === 'grill'))('keeps the themed time-slot contract in $id', ({ theme }) => {
  const onClick = vi.fn()
  const { getByRole } = render(<ThemeProvider theme={theme}><RadioGroup value='option'><Choice value='option' variant='time-slot' busy disabled onActivate={onClick}>9:00 AM</Choice></RadioGroup></ThemeProvider>)
  const slot = getByRole('radio', { name: '9:00 AM' })
  expect(slot).toHaveAttribute('aria-checked', 'true')
  expect(slot).toHaveAttribute('data-busy')
  expect(slot).toHaveClass('ui:justify-center')
  expect(slot.style.getPropertyValue('--ui-choice-height')).toBe(theme.css.components.choice.sizes.md.height)
  fireEvent.click(slot)
  expect(onClick).not.toHaveBeenCalled()
})
