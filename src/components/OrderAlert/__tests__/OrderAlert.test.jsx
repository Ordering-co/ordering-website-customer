import React from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { markMomentSave } from '../../../ui/src/components/MomentControl/momentSave'

vi.unmock('@loadable/component')
vi.unmock('~ui/src/components/Confirm')
vi.unmock('~ui/utils')

let OrderAlert
beforeAll(async () => {
  ;({ OrderAlert } = await import('../index'))
})
afterEach(() => markMomentSave(false))

const renderAlert = (content, props) => renderWithProviders(
  <OrderAlert open title='Error' content={content} onAccept={vi.fn()} onClose={vi.fn()} {...props} />
)

// implementation notesthe rejected time showed an empty bullet
describe('OrderAlert', () => {
  it.each([
    ['a text', ['Selected time is unavailable']],
    ['a { code, message }', [{ code: 'INVALID_MOMENT', message: 'Selected time is unavailable' }]]
  ])('shows the reason of %s rejection', async (_name, content) => {
    const { findByText } = renderAlert(content)
    expect(await findByText('Selected time is unavailable')).toBeInTheDocument()
  })

  it('a rejected time with no reason says the time was not saved', async () => {
    markMomentSave(true)
    const { findByText } = renderAlert([{ code: 'INVALID_MOMENT' }])
    expect(await findByText('We couldn\'t save that time. Choose another time or try again.')).toBeInTheDocument()
  })

  // implementation notesa 403 that is not JSON reaches the alert as the SDK's technical text when the
  // remote dictionary has no INVALID_JSON_RESPONSE; the code carries its own fallback
  it('a non-JSON response says the order could not be confirmed, even with an empty dictionary', async () => {
    const { findByText, queryByText } = renderAlert(['Invalid JSON response'])
    expect(await findByText('We couldn\'t confirm your order. Your cart and details are saved, please try again.')).toBeInTheDocument()
    expect(queryByText('Invalid JSON response')).not.toBeInTheDocument()
  })

  it('a reason that is not the technical text is left as it is', async () => {
    const { findByText } = renderAlert(['Selected time is unavailable', 'Invalid JSON response'])
    expect(await findByText('Selected time is unavailable')).toBeInTheDocument()
    expect(await findByText(/We couldn't confirm your order/)).toBeInTheDocument()
  })

  it('any other rejection with no reason is generic', async () => {
    const { findByText } = renderAlert([null])
    expect(await findByText('Something went wrong. Please try again.')).toBeInTheDocument()
  })

  it('what it says about the time is decided when it opens: a mark set later does not change an open alert, and closing it forgets it', async () => {
    const view = renderAlert([{ code: 'X' }], { open: false })
    markMomentSave(true)
    view.rerender(<OrderAlert open title='Error' content={[{ code: 'X' }]} onAccept={vi.fn()} onClose={vi.fn()} />)
    expect(await view.findByText('We couldn\'t save that time. Choose another time or try again.')).toBeInTheDocument()
    markMomentSave(false)
    view.rerender(<OrderAlert open={false} title='Error' content={[{ code: 'X' }]} onAccept={vi.fn()} onClose={vi.fn()} />)
    view.rerender(<OrderAlert open title='Error' content={[{ code: 'X' }]} onAccept={vi.fn()} onClose={vi.fn()} />)
    expect(await view.findByText('Something went wrong. Please try again.')).toBeInTheDocument()
  })
})
