import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { OrderTypeSelectorHeader } from '../index'
import { SelectedOption } from '../styles'
import { injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

const changeOrderType = vi.hoisted(() => vi.fn())

// (jsdom has no PointerEvent: a mouse event that carries the pointer's fields)
class FakePointerEvent extends MouseEvent {
  constructor (type, init = {}) {
    super(type, init)
    this.pointerType = init.pointerType
  }
}
beforeEach(() => vi.stubGlobal('PointerEvent', FakePointerEvent))
afterEach(() => vi.unstubAllGlobals())

vi.mock('~components/components/OrderTypeControl', () => ({
  OrderTypeControl: ({ UIComponent, ...rest }) => (
    <UIComponent
      handleChangeOrderType={changeOrderType}
      typeSelected={1}
      configTypes={[1, 2]}
      orderTypes={[
        { value: 1, content: 'Delivery', showOnSelected: 'Delivery' },
        { value: 2, content: 'Pickup', showOnSelected: 'Pickup' }
      ]}
      orderTypeList={['delivery', 'pickup']}
      customView
      {...rest}
    />
  )
}))

describe('OrderTypeSelectorHeader', () => {
  it('the selector is the base Select: capped below 380px by narrowCap, and picking a type reports it', async () => {
    const { getByRole } = renderWithProviders(<OrderTypeSelectorHeader />, { theme: themeWithValues() })
    const trigger = getByRole('combobox')
    expect(trigger.getAttribute('data-slot')).toBe('select-trigger')
    expect(trigger.className).toContain('ui:max-narrow:max-w-[37.5vw]')
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    await screen.findByRole('listbox')
    await waitFor(() => expect(document.activeElement.getAttribute('role')).toBe('option'))
    fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Pickup' }).hasAttribute('data-highlighted')).toBe(true))
    fireEvent.keyDown(document.activeElement, { key: 'Enter' })
    await waitFor(() => expect(changeOrderType).toHaveBeenCalledWith(2))
  })

  // The pilot's map (AddressOrderType ORDER_TYPE_ICONS) over OrderIcon's Lucide glyphs; Reservation keeps
  // the Store it had (shopFilled), not the pilot's calendar.
  const EXPECTED = { 1: 'truck', 2: 'shopping-bag', 3: 'store', 4: 'car-front', 5: 'car', 9: 'store' }

  it('each order type draws its Lucide glyph through OrderIcon (decorative), none from react-icons', async () => {
    const { getByRole, container } = renderWithProviders(<OrderTypeSelectorHeader configTypes={Object.keys(EXPECTED).map(Number)} />, { theme: themeWithValues() })
    const trigger = getByRole('combobox')
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(Object.keys(EXPECTED).length)
    options.forEach((option, i) => {
      const glyph = Object.values(EXPECTED)[i]
      const svg = option.querySelector('svg')
      expect(svg.classList.contains(`lucide-${glyph}`), `option ${i}: lucide-${glyph}, got "${svg.getAttribute('class')}"`).toBe(true)
      expect(svg.getAttribute('aria-hidden')).toBe('true')
    })
    expect(container.querySelector('img')).toBeNull()
    expect(() => screen.getAllByTestId('icon-shoppingBag')).toThrow()
  })
})

describe('SelectedOption (the order type shown as selected)', () => {
  it('gets its text as the title, with no fixed max-width below 380px (no real caller leaves it that tight)', () => {
    const { getByText } = renderWith(themeWithValues(), <SelectedOption>Drive thru</SelectedOption>)
    const el = getByText('Drive thru')
    expect(el.getAttribute('title')).toBe('Drive thru')
    const css = injectedCss().replace(/\s+/g, '')
    const cls = [...el.classList].pop()
    expect(css).not.toMatch(new RegExp(`\\.${cls}\\{[^}]*max-width`))
  })
})
