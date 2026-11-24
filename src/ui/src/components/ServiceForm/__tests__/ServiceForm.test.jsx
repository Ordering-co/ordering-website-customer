import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { serviceProductFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { ServiceForm } from '../index'

vi.mock('~components/components/ProductForm', () => ({
  ProductForm: ({ UIComponent, ...rest }) => (
    <UIComponent
      productObject={{ product: serviceProductFixture, loading: false, error: null }}
      professionalListState={{ loading: false, professionals: [{ id: 1, name: 'Alex', lastname: 'Pro', photo: 'p.jpg', schedule: null }] }}
      professionalSelected={null}
      handleSave={vi.fn()}
      isSoldOut={false}
      maxProductQuantity={99}
      handleCreateGuestUser={vi.fn()}
      business={{ id: 1 }}
      productCart={null}
      actionStatus={{ loading: false }}
      {...rest}
    />
  )
}))

vi.mock('~ui/src/components/LoginForm', () => ({
  LoginForm: () => null
}))

vi.mock('~ui/src/components/SignUpForm', () => ({
  SignUpForm: () => null
}))

vi.mock('~ui/src/components/ForgotPasswordForm', () => ({
  ForgotPasswordForm: () => null
}))

describe('ServiceForm', () => {
  it('renders service name and schedule section', () => {
    const { getByText } = renderWithProviders(<ServiceForm businessSlug='demo-store' />, { theme: themeWithValues() })
    expect(getByText('Haircut')).toBeInTheDocument()
    expect(getByText('Schedule')).toBeInTheDocument()
  })
})

describe('ServiceForm: the login dialog', () => {
  it('"Login / Sign Up" opens the base dialog; its close closes it', async () => {
    const { getByRole, findByRole, queryByRole } = renderWithProviders(<ServiceForm businessSlug='demo-store' />, { theme: themeWithValues() })
    fireEvent.click(getByRole('button', { name: 'Login / Sign Up' }))
    const dialog = await findByRole('dialog')
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })
})

describe('ServiceForm (theme)', () => {
  it('"Required" is a badge and the professional select is reachable by keyboard', () => {
    const { getAllByText, container } = renderWithProviders(<ServiceForm businessSlug='demo-store' />, { theme: themeWithValues() })
    getAllByText('Required').forEach((el) => expect(el.tagName).toBe('DIV'))
    const select = container.querySelector('[data-doc-control="appointment-professional-select"]')
    expect(select.tagName).toBe('BUTTON')
    expect(select.tabIndex).toBe(0)
    expect(select).toHaveAttribute('aria-expanded', 'false')
    fireEvent.keyDown(select, { key: 'Enter' })
    expect(select).toHaveAttribute('aria-expanded', 'true')
    const option = container.querySelector('[role="listbox"] [role="option"]')
    expect(option).toHaveTextContent('Alex Pro')
    expect(option).toHaveTextContent('Not available')
    fireEvent.keyDown(option, { key: 'Enter' })
    expect(select).toHaveAttribute('aria-expanded', 'false')
    expect(select).toHaveTextContent('Alex Pro')
    expect(select).toHaveFocus()
  })
})
