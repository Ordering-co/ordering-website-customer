import React from 'react'
import { expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { THEMES } from '../../preview/themes'
import { Choice } from '../Choice'

it.each(THEMES.filter(({ id }) => id === 'defaults' || id === 'grill'))('keeps the themed card-actions contract in $id', ({ theme }) => {
  const onClick = vi.fn()
  const { getByRole, getByTestId } = render(
    <ThemeProvider theme={theme}>
      <Choice variant='card-actions' selected as='article' data-testid='card'>
        <button onClick={onClick}>Profile</button>
        <button>Favorite</button>
      </Choice>
    </ThemeProvider>
  )
  const card = getByTestId('card')
  expect(card.tagName).toBe('ARTICLE')
  expect(card).toHaveAttribute('data-checked')
  expect(card.style.getPropertyValue('--ui-choice-height')).toBe(theme.css.components.choice.sizes.md.height)
  fireEvent.click(getByRole('button', { name: 'Favorite' }))
  expect(onClick).not.toHaveBeenCalled()
  fireEvent.click(getByRole('button', { name: 'Profile' }))
  expect(onClick).toHaveBeenCalledOnce()
})
