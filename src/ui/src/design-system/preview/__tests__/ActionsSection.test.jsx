import React from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { THEMES } from '../themes'
import { ActionsSection } from '../sections/ActionsSection'

// The page of the browser spec draws without errors and its stateful demos answer.
describe('ActionsSection (the preview of the action pieces)', () => {
  it.each(THEMES.map(({ id, theme }) => [id, theme]))('draws every demo in %s and the stepper counts', (_, theme) => {
    render(<ThemeProvider theme={theme}><ActionsSection /></ThemeProvider>)
    ;['stepper-sm', 'stepper-md', 'stepper-lg', 'stepper-remove', 'stepper-compact', 'stepper-input', 'tabs-link-bar', 'icon-working', 'stop-on', 'dots', 'foreign-skin'].forEach((id) => expect(screen.getByTestId(id)).toBeInTheDocument())
    expect(screen.getByTestId('stepper-count')).toHaveTextContent('1')
    fireEvent.click(within(screen.getByTestId('stepper-remove')).getByRole('button', { name: 'Remove' }))
    expect(screen.getByTestId('stepper-count')).toHaveTextContent('0')
    fireEvent.click(within(screen.getByTestId('stepper-remove')).getByRole('button', { name: 'Increase quantity' }))
    expect(screen.getByTestId('stepper-count')).toHaveTextContent('1')
    fireEvent.click(screen.getByTestId('sr-submit'))
    expect(screen.getByTestId('sr-sent')).toHaveTextContent('1')
    expect(screen.getByRole('link', { name: 'My account' })).toHaveAttribute('aria-current', 'page')
  })
})
