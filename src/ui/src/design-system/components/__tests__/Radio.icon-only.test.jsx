import React from 'react'
import { expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { THEMES } from '../../preview/themes'
import { Radio, RadioGroup } from '../Checkbox'

it.each(THEMES.filter(({ id }) => id === 'defaults' || id === 'grill'))('keeps the themed icon-only contract in $id', ({ theme }) => {
  const { getByRole } = render(<ThemeProvider theme={theme}><RadioGroup value='good'><Radio value='good' appearance='icon-only' aria-label='Good'><svg data-test-glyph='' /></Radio></RadioGroup></ThemeProvider>)
  const radio = getByRole('radio', { name: 'Good' })
  expect(radio).toHaveAttribute('aria-checked', 'true')
  expect(radio.style.getPropertyValue('--ui-choice-height')).toBe(theme.css.components.choice.sizes.md.height)
  expect(radio.querySelector('[data-test-glyph]')).toBeTruthy()
  expect(radio.querySelector('[data-slot=radio-mark]')).toBeNull()
})
