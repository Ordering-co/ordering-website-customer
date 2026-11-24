import React from 'react'
import { expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { THEMES } from '../../preview/themes'
import { Choice } from '../Choice'

it.each(THEMES.filter(({ id }) => id === 'defaults' || id === 'grill'))('keeps the themed conversation-row contract in $id', ({ theme }) => {
  const onClick = vi.fn()
  const { getByRole } = render(<ThemeProvider theme={theme}><Choice variant='conversation-row' selected onClick={onClick}>Driver</Choice></ThemeProvider>)
  const row = getByRole('button', { name: 'Driver' })
  expect(row).toHaveAttribute('aria-pressed', 'true')
  expect(row).toHaveClass('ui:px-lg')
  expect(row.style.getPropertyValue('--ui-choice-selected-color')).toBe(theme.css.components.choice.variants.default.states.selected.color)
  fireEvent.click(row)
  expect(onClick).toHaveBeenCalledOnce()
})
