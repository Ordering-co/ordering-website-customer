import React from 'react'
import { expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { THEMES } from '../../preview/themes'
import { Choice } from '../Choice'

it.each(THEMES.filter(({ id }) => id === 'defaults' || id === 'grill'))('keeps the themed icon-only-rating contract in $id', ({ theme }) => {
  const onClick = vi.fn()
  const { getByRole } = render(<ThemeProvider theme={theme}><Choice variant='icon-only-rating' selected aria-label='Good' onClick={onClick}><svg /></Choice></ThemeProvider>)
  const rating = getByRole('button', { name: 'Good' })
  expect(rating).toHaveAttribute('aria-pressed', 'true')
  expect(rating.style.getPropertyValue('--ui-choice-height')).toBe(theme.css.components.choice.sizes.md.height)
  expect(rating.style.getPropertyValue('--ui-choice-selected-background')).toBe(theme.css.components.choice.variants.default.states.selected.background)
  expect(rating).toHaveClass('ui:px-md')
  fireEvent.click(rating)
  expect(onClick).toHaveBeenCalledOnce()
})
