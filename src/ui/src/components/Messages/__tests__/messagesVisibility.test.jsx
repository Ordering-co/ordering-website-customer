import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Messages } from '../index'

// The pieces of the chat a theme can hide: the picture's button
// (messages.image_upload) and the bubble of the order's placement
// (messages.order_console)
vi.unmock('~ui-icon')
vi.mock('react-hook-form', () => ({
  useForm: () => ({ handleSubmit: (fn) => fn, register: () => null, errors: {}, formState: { errors: {} }, setValue: vi.fn() })
}))
vi.mock('../MapMessages', () => ({ MapMessages: () => null }))
vi.mock('~components/components/Messages', () => ({
  Messages: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={activeOrder}
      messages={{ loading: false, messages: [] }}
      messagesToShow={{ messages: [] }}
      business
      driver={false}
      handleSend={vi.fn()}
      readMessages={vi.fn()}
      onClose={vi.fn()}
      onMessages={vi.fn()}
      setCanRead={vi.fn()}
      setImage={vi.fn()}
      setMessage={vi.fn()}
      image={null}
      message=''
      sendMessage={{ error: null }}
      profileMessages={false}
      {...rest}
    />
  )
}))

const hiding = (...keys) => themeWithValues((values) => {
  keys.forEach((key) => { values.visibility[key] = false })
  return values
})
const render = (theme) => renderWithProviders(<Messages orderId={activeOrder.id} />, { theme })
// the input's room at its end for the picture's icon
// (the picture's button is the field's suffix: the piece's end variant makes the room)
const inputRoom = (container) => container.querySelector('#message').getAttribute('class').includes('ui:pe-[') && container.querySelector('[data-slot="input-suffix"] #chat_image') !== null

describe('Messages: visibility messages.*', () => {
  it('the schema defaults: the picture\'s button and the order\'s bubble', () => {
    const { container, getByText, getByRole } = render(themeWithValues())
    expect(container.querySelector('#chat_image')).not.toBeNull()
    // the picture's button carries the name and sits in the same suffix as the file input it opens
    expect(getByRole('button', { name: 'Attach image' }).closest('[data-slot="input-suffix"]')).toContainElement(container.querySelector('#chat_image'))
    expect(getByText(/Order placed for/)).toBeInTheDocument()
  })

  it('messages.image_upload hides the picture\'s button and its room in the input', () => {
    const shown = render(themeWithValues())
    expect(inputRoom(shown.container)).toBe(true)
    shown.unmount()
    const { container } = render(hiding('messages.image_upload'))
    expect(container.querySelector('#chat_image')).toBeNull()
    expect(inputRoom(container)).toBe(false)
  })

  it('messages.order_console hides the order\'s bubble alone', () => {
    const { container, queryByText } = render(hiding('messages.order_console'))
    expect(queryByText(/Order placed for/)).toBeNull()
    expect(container.querySelector('#chat_image')).not.toBeNull()
  })
})
