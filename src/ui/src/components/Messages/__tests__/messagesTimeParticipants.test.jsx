import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { schemaDefault } from '~/utils/themeSchema'
import { MapMessages } from '../MapMessages'
import { Messages } from '../index'

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ user: { id: 7 } }]
}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parseDate: () => 'Jun 28, 2026', parseTime: () => '10:30 AM', optimizeImage: (src) => src }]
}))
vi.mock('react-hook-form', () => ({
  useForm: () => ({ handleSubmit: (fn) => fn, register: () => null, errors: {}, formState: { errors: {} }, setValue: vi.fn() })
}))

const withVisibility = (visibility) => themeWithValues((values) => {
  Object.assign(values.visibility, visibility)
  return values
})

// visibility.messages.time: the time under each message (off by default)
describe('MapMessages: visibility messages.time', () => {
  const messages = {
    messages: [
      { id: 1, type: 2, author_id: 7, author: { id: 7, name: 'Ana', level: 3 }, comment: 'mine', created_at: '2026-06-28 10:30:00', can_see: '0,2,3' },
      { id: 2, type: 2, author_id: 9, author: { id: 9, name: 'Store', level: 2 }, comment: 'theirs', created_at: '2026-06-28 10:31:00', can_see: '0,2,3' }
    ]
  }
  const renderList = (theme) => renderWithProviders(
    <MapMessages order={{ ...activeOrder, customer_id: 7 }} messages={messages} messagesToShow={messages} business driver={false} getLevel={() => 'Customer'} />,
    { theme }
  )

  it('the schema: hidden by default', () => {
    expect(schemaDefault('visibility.messages.time')).toBe(false)
    const { getByText, queryAllByText } = renderList(themeWithValues())
    expect(getByText('mine')).toBeInTheDocument()
    expect(getByText('theirs')).toBeInTheDocument()
    expect(queryAllByText('10:30 AM')).toHaveLength(0)
  })

  it('on: the time under the customer\'s and the others\' messages', () => {
    const { getAllByText } = renderList(withVisibility({ 'messages.time': true }))
    expect(getAllByText('10:30 AM')).toHaveLength(2)
  })
})

// visibility.messages.participants: in the inbox, chatting with the store or
// the driver (off by default)
describe('Messages: visibility messages.participants', () => {
  vi.mock('~components/components/Messages', () => ({
    Messages: ({ UIComponent, ...rest }) => (
      <UIComponent
        messages={{ loading: false, messages: [] }}
        messagesToShow={{ messages: [] }}
        business
        driver={false}
        handleSend={vi.fn()}
        readMessages={vi.fn()}
        onClose={vi.fn()}
        setCanRead={vi.fn()}
        setImage={vi.fn()}
        setMessage={vi.fn()}
        image={null}
        message=''
        sendMessage={{ error: null }}
        profileMessages
        {...rest}
      />
    )
  }))
  const order = { ...activeOrder, driver: { id: 3, name: 'Luis', photo: null } }
  const renderInbox = (theme, onMessages = vi.fn()) => renderWithProviders(<Messages order={order} onMessages={onMessages} />, { theme })
  const choices = (container) => container.querySelectorAll('[aria-pressed]')

  it('the schema: hidden by default, the store\'s chat alone', () => {
    expect(schemaDefault('visibility.messages.participants')).toBe(false)
    expect(choices(renderInbox(themeWithValues()).container)).toHaveLength(0)
  })

  it('on: the store and the driver, each opening its chat', () => {
    const onMessages = vi.fn()
    const { container } = renderInbox(withVisibility({ 'messages.participants': true }), onMessages)
    const [store, driver] = choices(container)
    expect(store).toHaveAttribute('role', 'button')
    expect(driver).toHaveAttribute('role', 'button')
    expect(store).toHaveAttribute('aria-pressed', 'true')
    expect(driver).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(driver)
    expect(onMessages).toHaveBeenLastCalledWith({ business: false, driver: true })
    fireEvent.click(store.firstChild)
    expect(onMessages).toHaveBeenLastCalledWith({ business: true, driver: false })
  })

  describe('the chat opened from an order (standalone)', () => {
    const renderOrderChat = (theme, chatOrder = order, onMessages = vi.fn()) => renderWithProviders(
      <Messages order={chatOrder} onMessages={onMessages} standalone />,
      { theme }
    )

    it('offers the store and the driver by default, each opening its chat', () => {
      const onMessages = vi.fn()
      const { container } = renderOrderChat(themeWithValues(), order, onMessages)
      const [store, driver] = choices(container)
      expect(choices(container)).toHaveLength(2)
      expect(store).toHaveAttribute('aria-pressed', 'true')
      expect(driver).toHaveAttribute('aria-pressed', 'false')
      fireEvent.click(driver)
      expect(onMessages).toHaveBeenLastCalledWith({ business: false, driver: true })
      fireEvent.click(store)
      expect(onMessages).toHaveBeenLastCalledWith({ business: true, driver: false })
    })

    it('without a driver there is nobody to switch to', () => {
      const { container } = renderOrderChat(themeWithValues(), { ...order, driver: null })
      expect(choices(container)).toHaveLength(0)
    })

    it('the close button comes after the participants, at the end of the header', () => {
      const { container, getByRole } = renderOrderChat(themeWithValues())
      const close = getByRole('button', { name: 'Close' })
      const [, driver] = choices(container)
      expect(driver.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(close.parentElement.lastElementChild).toBe(close)
      expect(cssFor(driver.parentElement).replace(/\s+/g, '')).toContain('margin-inline-start:auto')
    })
  })
})
