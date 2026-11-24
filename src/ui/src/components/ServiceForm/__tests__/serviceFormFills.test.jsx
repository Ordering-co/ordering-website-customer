import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent } from '@testing-library/react'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Select } from '~ui/src/design-system/components/Select'
import { Day } from '../styles'

afterEach(cleanup)

const theme = themeWithValues((values) => {
  values.tokens.color = { ...values.tokens.color, surface_alt: '#EAEAEA', border_strong: '#909090' }
  values.components.menu.base = { ...values.components.menu.base, item_hover: '#E1E1E1', item_selected: '#DDEEFF' }
  values.components.date_strip.base = { ...values.components.date_strip.base, background: '#F0F0F0' }
  return values
})

describe('ServiceForm fills under dark text', () => {
  it('the selected professional takes the menu\'s selected color, not border_strong', () => {
    const { getByRole } = renderWith(theme, (
      <Select presentation='anchored-professional' options={[{ value: 1, content: 'Ana' }]} value={1} aria-label='Professionals' />
    ))
    fireEvent.keyDown(getByRole('button', { name: 'Professionals' }), { key: 'Enter' })
    const list = getByRole('listbox')
    const ana = getByRole('option', { name: 'Ana' })
    expect(list.style.getPropertyValue('--ui-menu-item-selected')).toBe('#DDEEFF')
    expect(ana).toHaveAttribute('aria-selected', 'true')
    expect(ana.className).toContain('ui:aria-selected:bg-(--ui-menu-item-selected)')
  })

  it('a day of the strip: hover on the date strip\'s background, not border_strong', () => {
    const { getByText } = renderWith(theme, <Day>Mon</Day>)
    const css = cssFor(getByText('Mon'))
    expect(css).toMatch(/:hover\{[^}]*background:#F0F0F0;/)
    expect(css).not.toContain('background-color:#909090')
  })
})
