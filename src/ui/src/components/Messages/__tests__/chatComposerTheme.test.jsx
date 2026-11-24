import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { SendForm } from '../styles'
import { UnreadMessageCounter } from '../../MessagesListing/styles'
import { Messages } from '../index'

// components.chat_bubble: the composer's background, its send piece
// (slots.send) and the unread count of the list (slots.unread)
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

// the piece writes components.button on its own element (jsdom does not compile Tailwind)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))

const chatTheme = (mutate) => themeWithValues((values) => {
  mutate(values.components.chat_bubble)
  return values
})

describe('components.chat_bubble: the composer and the unread count', () => {
  it('the composer\'s background at every width', () => {
    const theme = chatTheme((chat) => { chat.base.composer_background = '#ABABAB' })
    const { getByText } = renderWith(theme, <SendForm>composer</SendForm>)
    expect(cssFor(getByText('composer')).replace(/\s+/g, '')).toMatch(/\.([\w-]+)\.\1\{background-color:#ABABAB;/)
  })

  it('the send button of its slot, named', () => {
    const theme = chatTheme((chat) => { chat.slots.send = { component: 'button', size: 'lg', appearance: 'outline', color: 'secondary', shape: 'icon' } })
    const { getByRole } = renderWithProviders(<Messages orderId={activeOrder.id} />, { theme })
    const send = getByRole('button', { name: 'Send message' })
    expect(send).toHaveAttribute('data-slot', 'button')
    expect(send).toHaveAttribute('type', 'submit')
    // the icon shape of the lg outline secondary: the theme's variables, written on the piece
    expect(vars(send)).toEqual(componentVars(theme, 'button', { size: 'lg', shape: 'icon', color: 'secondary', appearance: 'outline' }))
  })

  it('with the schema defaults: the send button is the primary solid md of today', () => {
    const theme = themeWithValues()
    // (a message typed: the button is enabled)
    const { getByRole } = renderWithProviders(<Messages orderId={activeOrder.id} message='Hi' />, { theme })
    const send = getByRole('button', { name: 'Send message' })
    expect(send).not.toBeDisabled()
    expect(vars(send)).toEqual(componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'solid' }))
  })

  it('the unread count of its slot\'s variant and size', () => {
    const theme = chatTheme((chat) => { chat.slots.unread = { component: 'badge', variant: 'danger', size: 'sm' } })
    const { getByText } = renderWith(theme, <UnreadMessageCounter>3</UnreadMessageCounter>)
    const badge = theme.values.components.badge
    expect(getByText('3')).toHaveStyle({ backgroundColor: badge.variants.danger.background, height: `${badge.sizes.sm.height}px` })
  })
})
