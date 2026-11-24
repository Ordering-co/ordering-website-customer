import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../__tests__/helpers/testUtils'
import { cssFor } from '../../../../styles/__tests__/themeTestUtils'
import { AddressMapBoxList } from '../index'

const retrieveSuggestResult = vi.hoisted(() => vi.fn())
const handleChangeAddress = vi.hoisted(() => vi.fn())
const handleChangeInput = vi.hoisted(() => vi.fn())
const onBlurInput = vi.hoisted(() => vi.fn())

describe('AddressMapBoxList', () => {
  it('renders suggestions and handles selection', () => {
    retrieveSuggestResult.mockClear()
    const suggests = [
      { mapbox_id: 'mb-1', full_address: '123 Main St, NY' },
      { mapbox_id: 'mb-2', name: 'Broadway' }
    ]
    const { getByText } = renderWithProviders(
      <AddressMapBoxList
        mapBoxSuggests={suggests}
        retrieveSuggestResult={retrieveSuggestResult}
        handleChangeAddress={handleChangeAddress}
        handleChangeInput={handleChangeInput}
        onBlurInput={onBlurInput}
      />
    )
    // each suggestion is the base MenuItemButton: a button of components.menu, not a native one of its own
    const row = getByText('123 Main St, NY').closest('button')
    expect(row).toHaveAttribute('data-slot', 'button')
    expect(row).toHaveAttribute('type', 'button')
    expect(row.style.getPropertyValue('--ui-menu-item-height')).not.toBe('')
    expect(getByText('Broadway').closest('button')).not.toBe(row)
    fireEvent.click(getByText('123 Main St, NY'))
    expect(retrieveSuggestResult).toHaveBeenCalledWith('mb-1', handleChangeAddress)
    expect(handleChangeInput).toHaveBeenCalledWith({ target: { name: 'address', value: '123 Main St, NY' } })
    expect(onBlurInput).toHaveBeenCalled()
  })

  // implementation notesthe box and the scroll are the MenuSurface's; the container only places and caps it
  it('the suggestions are in the menu surface of the theme, named, under the field, a share of the screen at most', () => {
    const { getByText } = renderWithProviders(
      <AddressMapBoxList
        mapBoxSuggests={[{ mapbox_id: 'mb-1', full_address: '123 Main St, NY' }]}
        retrieveSuggestResult={retrieveSuggestResult}
        handleChangeAddress={handleChangeAddress}
        handleChangeInput={handleChangeInput}
        onBlurInput={onBlurInput}
      />
    )
    const surface = getByText('123 Main St, NY').closest('[data-slot="menu-surface"]')
    expect(surface).not.toBeNull()
    expect(surface).toHaveAttribute('role', 'group')
    expect(surface).toHaveAccessibleName('Address suggestions')
    const css = cssFor(surface.parentElement).replace(/\s+/g, '')
    expect(css).toContain('position:absolute;top:100%;inset-inline:0;')
    expect(css).toContain('max-height:40dvh;')
    // the rows are the MenuItemButton's own: the container writes no rule over them
    expect(css).not.toMatch(/button/)
    // the legacy box and scrollbar of the menu are not written over it
    expect(css).not.toContain('::-webkit-scrollbar')
    expect(css).not.toContain('box-shadow')
  })

  // implementation notesthe device's location is one more row of the menu, there with no suggestion at all
  it('offers "Use my current location" with no suggestions, as a row that asks only when pressed', () => {
    const onUseLocation = vi.fn()
    const { getByText, getByRole } = renderWithProviders(
      <AddressMapBoxList mapBoxSuggests={[]} retrieveSuggestResult={retrieveSuggestResult} handleChangeAddress={handleChangeAddress} handleChangeInput={handleChangeInput} onBlurInput={onBlurInput} onUseLocation={onUseLocation} />
    )
    expect(onUseLocation).not.toHaveBeenCalled()
    const row = getByText('Use my current location').closest('button')
    expect(row).toHaveAttribute('type', 'button')
    expect(getByRole('group')).toContainElement(row)
    fireEvent.click(row)
    expect(onUseLocation).toHaveBeenCalledTimes(1)
  })

  it('while locating the row is busy and cannot be pressed again; without the prop there is no row', () => {
    const onUseLocation = vi.fn()
    const props = { mapBoxSuggests: [], retrieveSuggestResult, handleChangeAddress, handleChangeInput, onBlurInput }
    const { getByText, queryByText, rerender } = renderWithProviders(<AddressMapBoxList {...props} onUseLocation={onUseLocation} locating />)
    const row = getByText('Use my current location').closest('button')
    expect(row).toBeDisabled()
    expect(row).toHaveAttribute('aria-busy', 'true')
    rerender(<AddressMapBoxList {...props} />)
    expect(queryByText('Use my current location')).toBeNull()
  })
})
