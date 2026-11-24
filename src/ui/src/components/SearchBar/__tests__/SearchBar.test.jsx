import React from 'react'
import { act, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { SearchBar } from '../index'

describe('SearchBar', () => {
  it('renders search input with accessible label', () => {
    const { getByLabelText } = renderWithProviders(
      <SearchBar onSearch={vi.fn()} placeholder='Search stores' />
    )
    expect(getByLabelText('Search stores')).toHaveAttribute('placeholder', 'Search stores')
  })

  it('without a placeholder its name is the translated "Search"', () => {
    const { getByRole } = renderWithProviders(<SearchBar onSearch={vi.fn()} />)
    expect(getByRole('textbox', { name: 'Search' })).toBeInTheDocument()
  })

  it('keeps keyup search, Enter and the textual clear action', () => {
    const onSearch = vi.fn()
    const onEnter = vi.fn()
    const Example = () => {
      const [search, setSearch] = React.useState('')
      const updateSearch = (value) => {
        onSearch(value)
        setSearch(value)
      }
      return <SearchBar search={search} restoreFocusOnClear onSearch={updateSearch} handleCustomEnter={onEnter} />
    }
    const { getByRole } = renderWithProviders(<Example />)
    const field = getByRole('textbox', { name: 'Search' })
    fireEvent.change(field, { target: { value: 'pizza' } })
    expect(onSearch).not.toHaveBeenCalled()
    fireEvent.keyUp(field, { keyCode: 65 })
    expect(onSearch).toHaveBeenLastCalledWith('pizza')
    fireEvent.keyUp(field, { keyCode: 13 })
    expect(onEnter).toHaveBeenCalledWith('pizza')
    fireEvent.click(getByRole('button', { name: 'Clear' }))
    expect(onSearch).toHaveBeenLastCalledWith('')
    expect(field).toHaveValue('')
    expect(field).toHaveFocus()
  })
})


describe('SearchBar with the base Input', () => {
  it('searches pasted text without a key event and shows Clear immediately', () => {
    const onSearch = vi.fn()
    const { getByRole } = renderWithProviders(<SearchBar baseInput onSearch={onSearch} />)
    const field = getByRole('textbox')
    fireEvent.input(field, { inputType: 'insertFromPaste', target: { value: 'pizza' } })
    expect(onSearch.mock.calls).toEqual([['pizza']])
    expect(getByRole('button', { name: 'Clear' })).toBeInTheDocument()
  })

  it('can clear the first edit before a deferred search runs', () => {
    const onSearch = vi.fn()
    const { getByRole } = renderWithProviders(<SearchBar baseInput lazyLoad restoreFocusOnClear onSearch={onSearch} />)
    const field = getByRole('textbox')
    vi.useFakeTimers()
    try {
      fireEvent.input(field, { target: { value: 'z' }, inputType: 'insertText' })
      expect(onSearch).not.toHaveBeenCalled()
      fireEvent.click(getByRole('button', { name: 'Clear' }))
      act(() => vi.advanceTimersByTime(750))
      expect(onSearch.mock.calls).toEqual([['']])
      expect(field).toHaveValue('')
      expect(field).toHaveFocus()
    } finally {
      vi.useRealTimers()
    }
  })

  it('submits committed composition once and invokes Enter only outside composition', () => {
    const onSearch = vi.fn()
    const onEnter = vi.fn()
    const { getByRole } = renderWithProviders(<SearchBar baseInput onSearch={onSearch} handleCustomEnter={onEnter} />)
    const field = getByRole('textbox')
    fireEvent.compositionStart(field)
    fireEvent.input(field, { inputType: 'insertCompositionText', isComposing: true, target: { value: 'に' } })
    fireEvent.keyDown(field, { key: 'Enter', isComposing: true })
    expect(onSearch).not.toHaveBeenCalled()
    expect(onEnter).not.toHaveBeenCalled()
    fireEvent.compositionEnd(field, { data: '日本', target: { value: '日本' } })
    fireEvent.input(field, { inputType: 'insertText', target: { value: '日本' } })
    expect(onSearch.mock.calls).toEqual([['日本']])
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onEnter.mock.calls).toEqual([['日本']])
  })
})
