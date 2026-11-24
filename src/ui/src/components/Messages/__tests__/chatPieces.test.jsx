import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { activeOrder } from '../../__tests__/helpers/ordersTestMocks'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { Messages } from '../index'

// The controls of the chat that have a piece: the closes, the message field,
// the picture's remove and send (the base Button and Input)
vi.mock('react-hook-form', () => ({
  useForm: () => ({ handleSubmit: (fn) => fn, register: () => null, errors: {}, formState: { errors: {} }, setValue: vi.fn() })
}))
vi.mock('../MapMessages', () => ({
  MapMessages: ({ handleModalImage }) => <button type='button' onClick={() => handleModalImage('chat.png')}>open picture</button>
}))
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

const theme = themeWithValues()
const draw = (props = {}) => renderWithProviders(<Messages orderId={activeOrder.id} {...props} />, { theme })
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))
// the icon shape is a square of the size's height (a class: jsdom does not compile it)
const isIcon = (el) => expect(el.getAttribute('class')).toContain('ui:w-(--ui-button-height)')
const iconGhost = componentVars(theme, 'button', { size: 'md', shape: 'icon', color: 'neutral', appearance: 'ghost' })

describe('Messages: the base pieces', () => {
  it('the close of the panel and of the standalone header: an icon Button, neutral ghost md, named, closes', () => {
    ;[{}, { standalone: true, profileMessages: true }].forEach((props) => {
      const onClose = vi.fn()
      const { getByRole, unmount } = draw({ onClose, ...props })
      const close = getByRole('button', { name: 'Close' })
      expect(close).toHaveAttribute('data-slot', 'button')
      expect(close).toHaveAttribute('type', 'button')
      isIcon(close)
      expect(vars(close)).toEqual(iconGhost)
      fireEvent.click(close)
      expect(onClose).toHaveBeenCalledTimes(1)
      unmount()
    })
  })

  it('the message field is the base Input and keeps its name, id and placeholder', () => {
    const { getByPlaceholderText } = draw()
    const input = getByPlaceholderText('Type your message here')
    expect(input).toHaveAttribute('data-slot', 'input')
    expect(input).toHaveAttribute('name', 'message')
    expect(input).toHaveAttribute('id', 'message')
    expect(input).toHaveAttribute('autocomplete', 'off')
  })

  it('send is a submit Button, disabled until there is something to send', () => {
    const empty = draw()
    const send = empty.getByRole('button', { name: 'Send message' })
    expect(send).toHaveAttribute('data-slot', 'button')
    expect(send).toHaveAttribute('type', 'submit')
    expect(send).toBeDisabled()
    empty.unmount()
    const typed = draw({ message: 'Hi' })
    expect(typed.getByRole('button', { name: 'Send message' })).toBeEnabled()
  })

  it('removing the picture is a named reset icon Button that clears it', () => {
    const setImage = vi.fn()
    const { getByRole, container } = draw({ image: 'data:image/png;base64,AAAA', setImage })
    const remove = getByRole('button', { name: 'Remove image' })
    expect(remove).toHaveAttribute('data-slot', 'button')
    expect(remove).toHaveAttribute('type', 'reset')
    isIcon(remove)
    expect(vars(remove)).toEqual(iconGhost)
    // its place is the container's: the piece carries only the theme's variables
    expect(Array.from({ length: remove.style.length }, (_, i) => remove.style.item(i)).every((name) => name.startsWith('--'))).toBe(true)
    // the thumbnail's box holds the button, and the box sits in the message field's wrapper
    expect(remove.parentElement.querySelector('img')).not.toBeNull()
    expect(remove.parentElement.parentElement.parentElement.querySelector('#message')).not.toBeNull()
    expect(container.querySelector('#chat_image')).not.toBeNull()
    fireEvent.click(remove)
    expect(setImage).toHaveBeenCalledWith(null)
  })

  it('the picture\'s modal closes with an inverse solid sm icon Button', () => {
    const { getByText, getAllByRole, queryByRole } = draw()
    fireEvent.click(getByText('open picture'))
    const close = getAllByRole('button', { name: 'Close' }).find((button) => vars(button)['--ui-button-height'] === componentVars(theme, 'button', { size: 'sm', shape: 'icon', color: 'inverse' })['--ui-button-height'])
    isIcon(close)
    expect(vars(close)).toEqual(componentVars(theme, 'button', { size: 'sm', shape: 'icon', color: 'inverse', appearance: 'solid' }))
    fireEvent.click(close)
    expect(queryByRole('img', { name: 'Image sent in the chat' })).toBeNull()
  })
})

describe('Messages: attach image', () => {
  // the order the browser's Tab walks: what is not -1 and not disabled, in document order
  const tabStops = (root) => Array.from(root.querySelectorAll('a[href],button,input,textarea,select,[tabindex]'))
    .filter((el) => el.getAttribute('tabindex') !== '-1' && !el.disabled && !el.hidden && el.type !== 'hidden')

  it('is an icon Button (neutral ghost) with a name, between the field and send in the Tab order', () => {
    const { getByRole, getByPlaceholderText, container } = draw()
    const attach = getByRole('button', { name: 'Attach image' })
    expect(attach.tagName).toBe('BUTTON')
    expect(attach).toHaveAttribute('data-slot', 'button')
    expect(attach).toHaveAttribute('type', 'button')
    isIcon(attach)
    // xs is the one size that fits the room the field keeps for its suffix
    expect(vars(attach)).toEqual(componentVars(theme, 'button', { size: 'xs', shape: 'icon', color: 'neutral', appearance: 'ghost' }))
    expect(Array.from({ length: attach.style.length }, (_, i) => attach.style.item(i)).every((name) => name.startsWith('--'))).toBe(true)
    expect(attach.querySelector('svg')).not.toBeNull()
    const stops = tabStops(container)
    const field = getByPlaceholderText('Type your message here')
    expect(stops.indexOf(attach)).toBe(stops.indexOf(field) + 1)
  })

  it('keeps the file input outside the button, hidden and out of the Tab order', () => {
    const { getByRole, container } = draw()
    const file = container.querySelector('#chat_image')
    expect(file).toHaveAttribute('type', 'file')
    expect(file).toHaveAttribute('name', 'image')
    expect(file).toHaveAttribute('accept', 'image/png,image/jpg,image/jpeg')
    expect(file).toHaveAttribute('tabindex', '-1')
    expect(file.hidden).toBe(true)
    expect(getByRole('button', { name: 'Attach image' }).contains(file)).toBe(false)
    expect(tabStops(container)).not.toContain(file)
  })

  it('a click opens the file chooser (Enter and Space are the native button click: proven in the browser)', () => {
    const { getByRole, container } = draw()
    const attach = getByRole('button', { name: 'Attach image' })
    const open = vi.fn()
    container.querySelector('#chat_image').click = open
    attach.focus()
    expect(attach).toHaveFocus()
    fireEvent.keyDown(attach, { key: 'Enter' })
    fireEvent.click(attach)
    fireEvent.keyUp(attach, { key: ' ' })
    fireEvent.click(attach)
    expect(open).toHaveBeenCalledTimes(2)
  })

  it('goes once there is a picture (the theme\'s own hiding is in messagesVisibility)', () => {
    const { queryByRole } = draw({ image: 'data:image/png;base64,AAAA' })
    expect(queryByRole('button', { name: 'Attach image' })).toBeNull()
  })
})
