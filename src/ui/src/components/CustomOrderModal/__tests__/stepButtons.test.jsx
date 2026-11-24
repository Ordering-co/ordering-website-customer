import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ThemeProvider } from '~ui/contexts/ThemeContext'
import { THEMES } from '~ui/src/design-system/preview/themes'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { Step1 } from '../Step1'
import { Step2 } from '../Step2'

vi.mock('~components/contexts/UtilsContext', () => ({ useUtils: () => [{ parsePrice: (value) => `$${value}` }] }))
vi.mock('~components/components/GoogleMaps', () => ({ GoogleMaps: () => null }))
vi.mock('~components/components/GoogleAutocompleteInput', () => ({ AutocompleteInput: () => null }))

// The piece paints from the theme's variables, written on the element: the ones of its look.
const expectLook = (button, theme, look) => {
  const vars = componentVars(theme, 'button', { size: 'md', ...look })
  ;['--ui-button-height', '--ui-button-background', '--ui-button-color', '--ui-button-padding-x'].forEach((name) => {
    expect(button.style.getPropertyValue(name)).toBe(String(vars[name]))
  })
}
const step1Data = { pickupAddress: 'P', pickupLocation: { lat: 10, lng: 20 }, pickupName: 'Ana', deliveryAddress: 'D', deliveryLocation: { lat: 11, lng: 21 } }

describe.each(['defaults', 'grill'])('CustomOrderModal step buttons, the base Button (%s)', (themeId) => {
  const { theme } = THEMES.find((entry) => entry.id === themeId)
  const draw = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)

  it('Step1: Continue is the primary md button with the arrow at the end edge', () => {
    const { getByRole } = draw(<Step1 pluginConfig={{}} initialData={step1Data} onContinue={vi.fn()} />)
    const next = getByRole('button', { name: 'Continue' })
    expect(next).toHaveAttribute('data-slot', 'button')
    expect(next).toHaveAttribute('data-doc-control', 'custom-order-continue')
    expect(next.querySelector('[data-slot="button-icon-end"] svg')).not.toBeNull()
    expectLook(next, theme, { color: 'primary', appearance: 'solid' })
  })

  it('Step2: Back is the neutral outline, Place order the primary with the arrow; while sending it says Processing and is disabled', () => {
    const props = { distanceKm: 3, pluginConfig: {}, initialData: { items: [{ name: 'Milk', quantity: 1 }] }, onPlaceOrder: vi.fn(), onBack: vi.fn() }
    const { getByRole, rerender } = draw(<Step2 {...props} actionState={{ loading: false, error: null }} />)
    const back = getByRole('button', { name: 'Back' })
    const place = getByRole('button', { name: 'Place order' })
    expect(back).toHaveAttribute('data-doc-control', 'custom-order-back')
    expect(back.querySelector('[data-slot="button-icon-end"]')).toBeNull()
    expectLook(back, theme, { color: 'neutral', appearance: 'outline' })
    expect(place.querySelector('[data-slot="button-icon-end"] svg')).not.toBeNull()
    expectLook(place, theme, { color: 'primary', appearance: 'solid' })
    rerender(<ThemeProvider theme={theme}><Step2 {...props} actionState={{ loading: true, error: null }} /></ThemeProvider>)
    const sending = getByRole('button', { name: 'Processing...' })
    expect(sending).toBeDisabled()
    expect(sending).not.toHaveAttribute('aria-busy')
    expect(getByRole('button', { name: 'Back' })).toBeDisabled()
  })
})
