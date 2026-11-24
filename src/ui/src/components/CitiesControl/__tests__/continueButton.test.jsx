import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from '~ui/contexts/ThemeContext'
import { THEMES } from '~ui/src/design-system/preview/themes'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { CitiesControl } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))

describe.each(['defaults', 'cafe'])('CitiesControl Continue, the base Button (%s)', (themeId) => {
  it('the primary md button, full width, its arrow in the end slot (no loose icon beside it)', () => {
    const { theme } = THEMES.find((entry) => entry.id === themeId)
    const onClose = vi.fn()
    const { getByRole } = render(
      <ThemeProvider theme={theme}>
        <CitiesControl cities={[{ id: 1, name: 'Austin', enabled: true }]} onClose={onClose} handleChangeCity={vi.fn()} />
      </ThemeProvider>
    )
    const next = getByRole('button', { name: 'Continue' })
    expect(next).toHaveAttribute('data-slot', 'button')
    expect(next.querySelector('[data-slot="button-icon-end"] svg')).not.toBeNull()
    expect(next.parentElement.querySelector(':scope > svg')).toBeNull()
    const vars = componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'solid' })
    ;['--ui-button-height', '--ui-button-background', '--ui-button-padding-x', '--ui-button-icon-size'].forEach((name) => {
      expect(next.style.getPropertyValue(name)).toBe(String(vars[name]))
    })
    fireEvent.click(next)
    expect(onClose).toHaveBeenCalled()
  })
})
