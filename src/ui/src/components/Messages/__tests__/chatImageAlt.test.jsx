import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { Messages } from '../index'

// An image sent in the chat and its enlarged view are named (translatable),
// not 'chat-image' nor without an alt
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    handleSubmit: (fn) => fn,
    register: () => null,
    errors: {},
    formState: { errors: {} },
    setValue: vi.fn()
  })
}))

const imageMessage = {
  id: 1,
  type: 3,
  source: '/pic.jpg',
  author_id: undefined,
  author: { id: 5, name: 'Me', level: 3 },
  created_at: '2026-01-01 10:00:00'
}

vi.mock('~components/components/Messages', () => ({
  Messages: ({ UIComponent, ...rest }) => (
    <UIComponent
      order={activeOrder}
      messages={{ loading: false, messages: [imageMessage] }}
      messagesToShow={{ messages: [imageMessage] }}
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

describe('Messages: chat images', () => {
  it('the image in the chat and its enlarged view are named', async () => {
    const { getByAltText, findByRole } = renderWithProviders(<Messages orderId={activeOrder.id} />)
    const img = getByAltText('Image sent in the chat')
    expect(img).toHaveAttribute('src', '/pic.jpg')
    // the box is the CSS's (fluid), not intrinsic px attributes
    expect(img).not.toHaveAttribute('width')
    expect(img).not.toHaveAttribute('height')
    fireEvent.click(img)
    const enlarged = (await findByRole('dialog')).querySelector('img[src="/pic.jpg"]')
    expect(enlarged).not.toHaveAttribute('width')
    expect(enlarged).not.toHaveAttribute('height')
    expect(enlarged).toHaveAttribute('alt', 'Image sent in the chat')
  })

  it('the enlarged view is the base Dialog: flush, a centered card on a phone, its own close only', async () => {
    const { getByRole, findByRole, queryByRole } = renderWithProviders(<Messages orderId={activeOrder.id} />)
    fireEvent.click(getByRole('button', { name: 'View the image sent in the chat' }))
    const dialog = await findByRole('dialog')
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    expect(dialog.querySelector('.ui\\:p-none')).toBeTruthy()
    expect(dialog.querySelector('[data-slot="dialog-close-button"]')).toBeNull()
    expect(dialog.parentElement.className).toContain('ui:max-mobile:p-lg')
    const closes = dialog.querySelectorAll('button[aria-label="Close"]')
    expect(closes).toHaveLength(1)
    fireEvent.click(closes[0])
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  it('the image opens its enlarged view from a button (keyboard too), named, without a box of its own', async () => {
    const { getByRole, findByRole, queryByRole } = renderWithProviders(<Messages orderId={activeOrder.id} />)
    expect(queryByRole('dialog')).toBeNull()
    const button = getByRole('button', { name: 'View the image sent in the chat' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button.querySelector('img')).toHaveAttribute('alt', 'Image sent in the chat')
    expect(button.querySelector('img')).not.toHaveAttribute('onclick')
    fireEvent.click(button)
    expect((await findByRole('dialog')).querySelector('img[src="/pic.jpg"]')).toBeInTheDocument()
  })
})
