import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { ProductIngredient } from '../index'

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

const toggleSelect = vi.hoisted(() => vi.fn())

vi.mock('~components/components/ProductIngredient', () => ({
  ProductIngredient: ({ UIComponent, ...rest }) => (
    <UIComponent ingredient={{ id: 1, name: 'Onion' }} toggleSelect={toggleSelect} {...rest} />
  )
}))

const render = (props, theme = themeWithValues()) => renderWithProviders(<ProductIngredient state={{ selected: true }} {...props} />, { theme })

describe('ProductIngredient (theme)', () => {
  it('a Choice of the design system: a named checkbox, checked, with its doc markers', () => {
    toggleSelect.mockClear()
    const utils = render()
    const checkbox = utils.getByRole('checkbox', { name: 'Onion' })
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    expect(checkbox).toHaveAttribute('data-slot', 'choice')
    expect(checkbox).toHaveAttribute('data-doc-control', 'product-ingredient')
    expect(checkbox).toHaveAttribute('data-doc-ingredient-id', '1')
    expect(checkbox).toHaveAttribute('data-doc-selected', 'true')
    fireEvent.click(utils.getByText('Onion'))
    expect(toggleSelect).toHaveBeenCalledTimes(1)
  })

  it('the group\'s scope applies (components.product_option.scope.checkbox)', () => {
    const scoped = themeWithValues((values) => {
      values.components.product_option = { ...values.components.product_option, scope: { checkbox: { ...values.components.checkbox, base: { ...values.components.checkbox.base, size: 31 } } } }
      return values
    })
    expect(render({}, scoped).getByRole('checkbox').style.getPropertyValue('--ui-checkbox-size')).toBe('31px')
  })

  it('its check is the base icon (Lucide glyph), not the legacy one', () => {
    const utils = render()
    expect(utils.getByRole('checkbox').querySelector('[data-slot="checkbox-mark"] svg.lucide-check')).not.toBeNull()
  })

  it('sold out: disabled and unchecked, the row keeps its look and only the check dims', () => {
    toggleSelect.mockClear()
    const utils = render({ isSoldOut: true })
    const checkbox = utils.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-disabled', 'true')
    expect(checkbox).toHaveAttribute('aria-checked', 'false')
    expect(checkbox.getAttribute('class')).not.toContain('ui:data-disabled:opacity')
    expect(checkbox.querySelector('[data-slot="choice-indicator"]').getAttribute('class')).toContain('ui:opacity-(--ui-choice-muted-opacity)')
    fireEvent.click(checkbox)
    expect(toggleSelect).not.toHaveBeenCalled()
  })

  it('read-only (store closed, implementation notes): keeps the real selection, blocks the toggle, no gray block', () => {
    toggleSelect.mockClear()
    const utils = render({ isReadOnly: true })
    const checkbox = utils.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    expect(checkbox).toHaveAttribute('aria-disabled', 'true')
    expect(checkbox.getAttribute('class')).not.toContain('ui:data-disabled:opacity')
    fireEvent.click(checkbox)
    expect(toggleSelect).not.toHaveBeenCalled()
  })

  it('the touch target is 44 px on a phone and with a coarse pointer', () => {
    const classes = render().getByRole('checkbox').getAttribute('class')
    expect(classes).toContain('ui:max-mobile:after:min-h-[44px]')
    expect(classes).toContain('ui:pointer-coarse:after:min-h-[44px]')
  })
})
