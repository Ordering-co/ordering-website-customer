import React from 'react'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { Messages as MessagesController } from '~components/components/Messages'
import { Messages } from '../index'

vi.mock('~ui/src/components/Confirm', () => ({
  Alert: ({ open, title, content, onAccept }) => open && (
    <div role='alert' data-testid='alert' aria-label={title}>
      {content}
      <button type='button' onClick={onAccept}>Accept</button>
    </div>
  )
}))

vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [{ root: 'https://api.ordering.test' }]
}))

vi.mock('~components/contexts/WebsocketContext', () => {
  const socket = { on: vi.fn(), off: vi.fn(), getId: () => 'socket-id' }
  return { useWebsocket: () => socket }
})

const renderChat = () => {
  const setMessages = vi.fn()
  const view = renderWithProviders(<Messages
    orderId={activeOrder.id}
    order={activeOrder}
    messages={{ loading: false, messages: [] }}
    messagesToShow={{ messages: [] }}
    setMessages={setMessages}
    onMessages={vi.fn()}
    onClose={vi.fn()}
    business
  />)
  return { ...view, setMessages }
}

describe('Messages', () => {
  it('renders messages title and composer', () => {
    const { getByText, getByPlaceholderText } = renderChat()
    expect(getByText('Messages')).toBeInTheDocument()
    expect(getByPlaceholderText('Type your message here')).toBeInTheDocument()
  })
  it('shows safe feedback after a send failure and allows resubmission when dismissed', async () => {
    mockFetch({ error: true, result: ['Internal chat diagnostic'] })
    const view = renderChat()
    const input = view.getByPlaceholderText('Type your message here')
    const send = view.getByRole('button', { name: 'Send message' })
    fireEvent.change(input, { target: { value: 'Please call on arrival' } })
    fireEvent.click(send)

    const alert = await view.findByTestId('alert')
    expect(alert).toHaveAccessibleName('Send message')
    expect(alert).toHaveTextContent('Please try again')
    expect(alert).not.toHaveTextContent('Internal chat diagnostic')
    expect(view.setMessages).not.toHaveBeenCalled()
    fireEvent.click(view.getByText('Accept'))
    expect(send).toBeEnabled()
    expect(input).toHaveValue('Please call on arrival')

    const sent = { id: 23, comment: 'Please call on arrival' }
    mockFetch({ error: false, result: sent })
    fireEvent.click(send)
    await waitFor(() => expect(view.setMessages).toHaveBeenCalledWith({ loading: false, messages: [sent] }))
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toMatchObject({ comment: sent.comment })
    await waitFor(() => expect(input).toHaveValue(''))
  })

  it.each([
    { error: true, error_codes: ['comment.max'] },
    { error: true, error_codes: ['comment.max'], result: ['Internal chat diagnostic'], errors: { debug: ['Internal detail'] } },
    { error_codes: ['comment.max'] }
  ])('keeps the draft and marks the field when the API reports comment.max', async (payload) => {
    mockFetch(payload)
    const view = renderChat()
    const input = view.getByPlaceholderText('Type your message here')
    fireEvent.change(input, { target: { value: 'Please call on arrival' } })
    fireEvent.click(view.getByRole('button', { name: 'Send message' }))

    const fieldError = await view.findByText('Shorten your message and try again.')
    expect(input).toHaveAccessibleDescription(fieldError.textContent)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveValue('Please call on arrival')
    expect(view.setMessages).not.toHaveBeenCalled()
    expect(view.queryByTestId('alert')).toBeNull()
  })

  it.each([
    [{ result: { id: 23 } }, {}],
    [{ error: false }, {}],
    [{ error: false, result: { id: 23 } }, { ok: false, status: 500 }]
  ])('keeps the draft when the send response does not confirm delivery', async (payload, options) => {
    mockFetch(payload, options)
    const view = renderChat()
    const input = view.getByPlaceholderText('Type your message here')
    fireEvent.change(input, { target: { value: 'Please call on arrival' } })
    fireEvent.click(view.getByRole('button', { name: 'Send message' }))

    expect(await view.findByTestId('alert')).toHaveTextContent('Please try again')
    expect(input).toHaveValue('Please call on arrival')
    expect(view.setMessages).not.toHaveBeenCalled()
  })

  it.each([false, true])('exposes the complete response only with includeResponse=%s', async (includeResponse) => {
    const payload = { error: true, result: ['Diagnostic'], error_codes: ['comment.max'], errors: { comment: ['max'] } }
    mockFetch(payload)
    let controller
    const Capture = (props) => {
      controller = props
      return null
    }
    renderWithProviders(<MessagesController
      UIComponent={Capture}
      orderId={activeOrder.id}
      messages={{ loading: false, messages: [] }}
      setMessages={vi.fn()}
      includeResponse={includeResponse || undefined}
    />)
    await act(async () => { await controller.handleSend() })
    const legacyState = { loading: false, error: payload.result }
    expect(controller.sendMessage).toEqual(includeResponse
      ? { ...legacyState, outcome: { success: false, response: payload } }
      : legacyState)
  })
})
