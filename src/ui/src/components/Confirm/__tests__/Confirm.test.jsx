import React from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'

vi.unmock('~ui/src/components/Confirm')
// implementation notesthe global mock of ~ui/utils stubs getTraduction to a no-op;
// the "no menus" tests below need the real alias lookup
vi.unmock('~ui/utils')

let Confirm

beforeAll(async () => {
  ;({ ConfirmDialog: Confirm } = await import('../ConfirmDialog'))
})

describe('Confirm', () => {
  it('renders confirmation content when open', () => {
    const { getByText } = renderWithProviders(
      <Confirm open title='Delete item' content='Are you sure?' onAccept={vi.fn()} onClose={vi.fn()} />
    )
    expect(getByText('Delete item')).toBeInTheDocument()
    expect(getByText('Are you sure?')).toBeInTheDocument()
  })

  it('fires onAccept from the accept button', () => {
    const onAccept = vi.fn()
    const { getByText } = renderWithProviders(
      <Confirm open content='Proceed?' onAccept={onAccept} acceptText='Yes' onClose={vi.fn()} />
    )
    fireEvent.click(getByText('Yes'))
    expect(onAccept).toHaveBeenCalled()
  })

  it('Escape closes it; Enter anywhere does not (only the focused button acts)', async () => {
    const onClose = vi.fn()
    const { findByRole } = renderWithProviders(<Confirm open content='Proceed?' onAccept={vi.fn()} onClose={onClose} />)
    await findByRole('button', { name: 'Accept' })
    fireEvent.keyDown(document.activeElement, { key: 'Enter', keyCode: 13 })
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(document.activeElement, { key: 'Escape', keyCode: 27 })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('without a title its close is a real button with a name', () => {
    const onClose = vi.fn()
    const { getByRole } = renderWithProviders(<Confirm open content='Proceed?' onClose={onClose} />)
    fireEvent.click(getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  // implementation notesthe API sends a text or { code, message }; a bullet with no text told nothing
  it('shows the message of a { code, message } item and never an empty bullet', () => {
    const { getByText, getAllByRole } = renderWithProviders(
      <Confirm open title='Error' content={[{ code: 'INVALID_MOMENT', message: 'Selected time is unavailable' }, { code: 'X' }, '']} onAccept={vi.fn()} onClose={vi.fn()} />
    )
    expect(getByText('Selected time is unavailable')).toBeInTheDocument()
    expect(getAllByRole('listitem')).toHaveLength(1)
  })

  it('says the fallback when no item has a text', () => {
    const { getByText, queryAllByRole } = renderWithProviders(
      <Confirm open title='Error' content={[{ code: 'X' }]} fallbackContent='We could not save that time.' onAccept={vi.fn()} onClose={vi.fn()} />
    )
    expect(getByText('We could not save that time.')).toBeInTheDocument()
    expect(queryAllByRole('listitem')).toHaveLength(0)
  })

  it('a closed alert with no content says nothing', () => {
    const { queryByText } = renderWithProviders(
      <Confirm open={false} title='Error' content={[]} onAccept={vi.fn()} onClose={vi.fn()} />
    )
    expect(queryByText('Something went wrong. Please try again.')).toBeNull()
  })

  // implementation notesan open alert never has only a title and Accept
  it.each([
    ['an empty list', []],
    ['null', null],
    ['an empty text', '  '],
    ['an object with no text', { code: 'INVALID_MOMENT' }],
    ['a list of texts that are not shown', [null, '', { code: 'X' }]]
  ])('%s says the generic message', (_name, content) => {
    const { getByText, queryAllByRole } = renderWithProviders(
      <Confirm open title='Error' content={content} onAccept={vi.fn()} onClose={vi.fn()} />
    )
    expect(getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    expect(queryAllByRole('listitem')).toHaveLength(0)
  })

  it('an object with a message says it, with no fallback', () => {
    const { getByText, queryByText } = renderWithProviders(
      <Confirm open title='Error' content={{ code: 'INVALID_MOMENT', message: 'Selected time is unavailable' }} onAccept={vi.fn()} onClose={vi.fn()} />
    )
    expect(getByText('Selected time is unavailable')).toBeInTheDocument()
    expect(queryByText('Something went wrong. Please try again.')).toBeNull()
  })

  it('an alert whose body is only its children, or only its title, says no fallback', () => {
    const withChildren = renderWithProviders(
      <Confirm open title='Error' content={[]} onAccept={vi.fn()} onClose={vi.fn()}><p>The body</p></Confirm>
    )
    expect(withChildren.getByText('The body')).toBeInTheDocument()
    expect(withChildren.queryByText('Something went wrong. Please try again.')).toBeNull()
    withChildren.unmount()
    const titleOnly = renderWithProviders(<Confirm open title='Delete it?' onAccept={vi.fn()} onClose={vi.fn()} />)
    expect(titleOnly.getByText('Delete it?')).toBeInTheDocument()
    expect(titleOnly.queryByText('Something went wrong. Please try again.')).toBeNull()
  })

  // implementation notesthe add-to-cart API's raw "no menus" text confused
  // customers; getTraduction aliases it (and its key) to a clear message
  it('shows a clear message for the API\'s raw "no menus" text', () => {
    const { getByText, queryByText } = renderWithProviders(
      <Confirm open content={['Error adding product, no menus']} onAccept={vi.fn()} onClose={vi.fn()} />
    )
    expect(queryByText('Error adding product, no menus')).toBeNull()
    expect(getByText('There is no menu available for the selected time. Please choose another time and try again.')).toBeInTheDocument()
  })

  it('also resolves the ERROR_ADD_PRODUCT_NOT_MENUS key directly to the same clear message', () => {
    const { getByText } = renderWithProviders(
      <Confirm open content={['ERROR_ADD_PRODUCT_NOT_MENUS']} onAccept={vi.fn()} onClose={vi.fn()} />
    )
    expect(getByText('There is no menu available for the selected time. Please choose another time and try again.')).toBeInTheDocument()
  })
})
