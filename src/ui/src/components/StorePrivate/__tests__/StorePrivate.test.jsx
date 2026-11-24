import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { StorePrivate } from '../index'

const setup = (onUnlock = vi.fn(), name = 'Casa Lupita') => {
  const view = renderWithProviders(<StorePrivate name={name} onUnlock={onUnlock} />)
  const toggle = view.getByRole('button', { name: 'I have a password' })
  const form = () => view.container.querySelector('form')
  const input = () => view.container.querySelector('input[type=password]')
  const type = (value) => fireEvent.change(input(), { target: { value } })
  const submit = () => fireEvent.submit(form())
  return { ...view, toggle, form, input, type, submit, onUnlock }
}

describe('StorePrivate', () => {
  it('shows the coming-soon screen with the name, initials, title and text, and the form closed', () => {
    const { getByRole, getByText, toggle, form } = setup()

    expect(getByRole('heading', { level: 1 })).toHaveTextContent('We are getting ready to open')
    expect(getByText('Casa Lupita')).toBeInTheDocument()
    expect(getByText('CL')).toBeInTheDocument()
    expect(getByText('Casa Lupita is preparing its online menu. Come back soon to order.')).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', form().id)
    expect(form()).toHaveAttribute('hidden')
  })

  it('says "This store" and shows no logo when the site has no name', () => {
    const { getByText, queryByText } = setup(vi.fn(), '')
    expect(getByText('This store is preparing its online menu. Come back soon to order.')).toBeInTheDocument()
    expect(queryByText('CL')).not.toBeInTheDocument()
  })

  it("shows the store's logo instead of its initials when the theme has one", () => {
    const theme = themeWithValues((values) => { values.images.logotype = 'https://cdn.example.com/lupita.png' })
    const { container, queryByText } = renderWithProviders(<StorePrivate name='Casa Lupita' onUnlock={vi.fn()} />, { theme })
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.example.com/lupita.png')
    expect(queryByText('CL')).not.toBeInTheDocument()
  })

  it('opens the form on the link, labels the password field and focuses it', () => {
    const { toggle, form, input, getByLabelText, getByRole } = setup()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(form()).not.toHaveAttribute('hidden')
    expect(getByLabelText('Password')).toBe(input())
    expect(input()).toHaveAttribute('autocomplete', 'current-password')
    expect(document.activeElement).toBe(input())
    expect(getByRole('button', { name: 'Enter store' })).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(form()).toHaveAttribute('hidden')
  })

  it('does not send an empty password: it marks the field and focuses it, with no message', () => {
    const { toggle, submit, onUnlock, input, type, queryByRole, getByRole } = setup()
    fireEvent.click(toggle)
    getByRole('button', { name: 'I have a password' }).focus()
    submit()
    expect(onUnlock).not.toHaveBeenCalled()
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(input()).not.toHaveAttribute('aria-describedby')
    expect(document.activeElement).toBe(input())
    expect(queryByRole('alert')).not.toBeInTheDocument()
    type('a')
    // the base Input drops aria-invalid when the field is valid (absent = not invalid)
    expect(input()).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('puts the name in the text as it is, even with replacement patterns', () => {
    const { getByText } = setup(vi.fn(), "Pepe's $& $' Grill")
    expect(getByText("Pepe's $& $' Grill is preparing its online menu. Come back soon to order.")).toBeInTheDocument()
  })

  it('sends the password and stays busy while it waits (a reload follows a success)', async () => {
    const onUnlock = vi.fn(() => new Promise(() => {}))
    const { toggle, type, submit, getByRole } = setup(onUnlock)
    fireEvent.click(toggle)
    type('lupita24')
    submit()

    expect(onUnlock).toHaveBeenCalledWith('lupita24')
    // the base Button's busy state: aria-busy, stays focusable (keeps the keyboard where it was) and answers no click
    await waitFor(() => expect(getByRole('button', { name: 'Loading...' })).toHaveAttribute('aria-busy', 'true'))
    fireEvent.click(getByRole('button', { name: 'Loading...' }))
    submit()
    expect(onUnlock).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['wrong', "That password didn't work. Check it and try again."],
    ['rate', 'Too many attempts. Wait a minute and try again.'],
    ['network', "We couldn't check the password. Try again."]
  ])('shows the %s error inline, tied to the field, and lets the visitor try again', async (reason, message) => {
    const onUnlock = vi.fn().mockRejectedValue({ reason })
    const { toggle, type, submit, input, findByRole, getByRole } = setup(onUnlock)
    fireEvent.click(toggle)
    type('nope')
    submit()

    const alert = await findByRole('alert')
    expect(alert).toHaveTextContent(message)
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(input()).toHaveAttribute('aria-describedby', alert.id)
    expect(getByRole('button', { name: 'Enter store' })).toBeEnabled()
    expect(document.activeElement).toBe(input())
  })

  it('treats a rejection without a reason as a network error', async () => {
    const { toggle, type, submit, findByRole } = setup(vi.fn().mockRejectedValue(new Error('boom')))
    fireEvent.click(toggle)
    type('x')
    submit()
    expect(await findByRole('alert')).toHaveTextContent("We couldn't check the password. Try again.")
  })
})
