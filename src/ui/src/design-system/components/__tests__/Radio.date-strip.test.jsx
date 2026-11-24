import React from 'react'
import { expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { THEMES } from '../../preview/themes'
import { Radio } from '../Checkbox'

it.each(THEMES.filter(({ id }) => id === 'defaults' || id === 'grill'))('keeps the themed date-strip contract in $id', ({ theme }) => {
  const onClick = vi.fn()
  const { getByRole } = render(<ThemeProvider theme={theme}><Radio appearance='date-strip' closed tabIndex={-1} aria-label='Closed on Monday' onClick={onClick}>Mon</Radio></ThemeProvider>)
  const radio = getByRole('radio', { name: 'Closed on Monday' })
  expect(radio).toHaveAttribute('aria-disabled', 'true')
  expect(radio).toHaveAttribute('tabindex', '-1')
  expect(radio.style.getPropertyValue('--ui-date-strip-padding-y')).toBe(theme.css.components.date_strip.base.padding_y)
  fireEvent.click(radio)
  expect(onClick).not.toHaveBeenCalled()
})
