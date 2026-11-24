import React from 'react'
import { describe, expect, it } from 'vitest'
import { schemaEntry, schemaKeys } from '~/utils/themeSchema'
import { Button } from '../../design-system/components/Button'
import { renderWith, themeWithValues } from './themeTestUtils'

// A group of the schema: exactly these props, each of this type and default
const expectGroup = (path, props) => {
  expect([...schemaKeys(path)].sort()).toEqual(Object.keys(props).sort())
  Object.entries(props).forEach(([prop, entry]) => expect(schemaEntry(`${path}.${prop}`)).toMatchObject(entry))
}

// The spacing of the controls (section 5.2 of the audit): side space, icon
// gap, the inline action size, the chip's pressed state, the choice list's
// gap and the menu's side space and width are in the schema.
describe('schema: spacing of the controls', () => {
  it('button: icon_gap, padding_x per size and the xs size of an inline action', () => {
    expect(schemaEntry('components.button.base.icon_gap')).toMatchObject({ type: 'space', value: '{space.sm}' })
    ;['sm', 'md', 'lg'].forEach((size) => expect(schemaEntry(`components.button.sizes.${size}.padding_x`)).toMatchObject({ type: 'space', value: '{space.lg}' }))
    expectGroup('components.button.sizes.xs', {
      height: { type: 'icon', value: '{icon.lg}' },
      icon_size: { type: 'icon', value: '{icon.md}' },
      padding_x: { type: 'space', value: '{space.sm}' },
      text: { type: 'text', value: '{typography.button}' }
    })
  })

  it('chip: padding_x per size, gap and a pressed state', () => {
    ;['sm', 'md', 'lg'].forEach((size) => expect(schemaEntry(`components.chip.sizes.${size}.padding_x`)).toMatchObject({ type: 'space', value: 14 }))
    expect(schemaEntry('components.chip.base.gap')).toMatchObject({ type: 'space', value: 6 })
    expectGroup('components.chip.variants.default.states.pressed', { background: { type: 'color', value: '{color.border_strong}' } })
  })

  it('choice: gap; menu: padding_x and max_width', () => {
    expect(schemaEntry('components.choice.base.gap')).toMatchObject({ type: 'space', value: 10 })
    expect(schemaEntry('components.menu.base.padding_x')).toMatchObject({ type: 'space', value: '{space.lg}' })
    expect(schemaEntry('components.menu.base.max_width')).toMatchObject({ type: 'number', value: 450 })
  })
})

describe('button: the xs size of an inline action', () => {
  it('an inline action is the xs ghost icon Button: a real button of the theme\'s xs, its border reserved', () => {
    const themed = renderWith(themeWithValues(), <Button size='xs' shape='icon' appearance='ghost' borderInset aria-label='Info'>i</Button>)
    const button = themed.getByRole('button', { name: 'Info' })
    expect(button.getAttribute('type')).toBe('button')
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button.style.getPropertyValue('--ui-button-height')).toBe('24px')
    expect(button.style.getPropertyValue('--ui-button-border')).toMatch(/solid transparent/)
  })
})
