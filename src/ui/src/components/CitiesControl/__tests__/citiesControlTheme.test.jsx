import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { CitiesControl } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

const cities = [
  { id: 1, name: 'Austin', enabled: true },
  { id: 2, name: 'Boston', enabled: true },
  { id: 3, name: 'Closed City', enabled: false }
]

const theme = (mutate = () => {}) => themeWithValues((values) => {
  const choice = values.components.choice
  choice.base.background = '#FFFFFF'
  choice.variants.default.states.selected = { background: '#FFEBE0', border: { width: 1, color: '#FF5500', style: 'solid' }, color: '#111111' }
  mutate(choice)
  return values
})

const renderCities = (t) => renderWithProviders(
  <CitiesControl cities={cities} onClose={vi.fn()} handleChangeCity={vi.fn()} />,
  { theme: t }
)

describe('CitiesControl (components.choice)', () => {
  it('theme: the enabled cities are a single choice list 10px apart; picking one selects it', () => {
    const { getAllByRole, getByRole, queryByTestId } = renderCities(theme())
    expect(cssFor(getByRole('radiogroup'))).toContain('gap:10px')
    const options = getAllByRole('radio')
    expect(options.map((o) => o.textContent)).toEqual(['Austin', 'Boston'])
    expect(options[0]).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(options[1])
    expect(getAllByRole('radio')[1]).toHaveAttribute('aria-checked', 'true')
    // the piece paints the theme's selected state through its variables
    expect(getAllByRole('radio')[1]).toHaveAttribute('data-checked')
    expect(getAllByRole('radio')[1].style.getPropertyValue('--ui-choice-selected-background')).toBe('#FFEBE0')
    expect(getAllByRole('radio')[1].querySelector('[data-slot="choice-indicator"]')).not.toBeNull()
    expect(queryByTestId('icon-radioOff')).toBeNull()
  })

  it('picking the chosen city again clears it, and continuing sends the new one', () => {
    const handleChangeCity = vi.fn()
    const { getAllByRole, getByText } = renderWithProviders(
      <CitiesControl cities={cities} onClose={vi.fn()} handleChangeCity={handleChangeCity} />,
      { theme: theme() }
    )
    fireEvent.click(getAllByRole('radio')[0])
    expect(getAllByRole('radio')[0]).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(getAllByRole('radio')[0])
    expect(getAllByRole('radio')[0]).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(getAllByRole('radio')[1])
    fireEvent.click(getByText('Continue'))
    expect(handleChangeCity).toHaveBeenCalledWith(2)
  })

  it('theme: no indicator without show_indicator', () => {
    const { getAllByRole } = renderCities(theme((choice) => { choice.base.show_indicator = false }))
    expect(getAllByRole('radio')[0].querySelector('[data-slot="choice-indicator"]')).toBeNull()
  })
})
