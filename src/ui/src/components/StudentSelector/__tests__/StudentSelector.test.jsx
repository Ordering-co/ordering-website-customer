import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import {
  sampleStudent,
  schoolBusinessFixture,
  schoolStudentsHookFixture
} from '../../__tests__/helpers/giftCardStudentTestMocks'
import { StudentSelector } from '../index'
import { cssFor } from '../../../styles/__tests__/themeTestUtils'

const setStudentId = vi.hoisted(() => vi.fn())
const assignStudent = vi.hoisted(() => vi.fn())
const sessionState = vi.hoisted(() => ({ auth: true, user: { id: 1 }, token: 'token' }))
const orderMocks = vi.hoisted(() => ({
  cart: { uuid: 'cart-1', student_id: 7 }
}))

vi.mock('~components/hooks/useSchoolStudents', () => ({
  useSchoolStudents: () => schoolStudentsHookFixture
}))
vi.mock('~components/hooks/useCartStudent', () => ({
  useCartStudent: () => ({ assignStudent })
}))
vi.mock('~components/hooks/useSelectedStudent', () => ({
  useSelectedStudent: () => ({ studentId: sampleStudent.id, setStudentId })
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [
    {
      options: { type: 1 },
      carts: {
        'businessId:1': orderMocks.cart
      }
    },
    { refreshOrderOptions: vi.fn() }
  ]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [sessionState, { login: vi.fn() }]
}))
vi.mock('~ui/src/design-system/components/Select', () => ({
  Select: ({ placeholder, options = [] }) => (
    <div data-testid='student-select'>
      <span>{placeholder}</span>
      {options.map((opt) => <span key={opt.value}>{opt.content}</span>)}
    </div>
  )
}))
vi.mock('~ui/src/components/StudentFormModal', () => ({
  StudentFormModal: ({ open }) => (open ? <div data-testid='student-form-modal' /> : null)
}))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => <div>Login</div> }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))

describe('StudentSelector', () => {
  beforeEach(() => {
    orderMocks.cart = { uuid: 'cart-1', student_id: sampleStudent.id }
    setStudentId.mockReset()
    assignStudent.mockReset()
  })

  it('renders student dropdown for school businesses', () => {
    const { getByText, getAllByText, getByTestId } = renderWithProviders(
      <StudentSelector business={schoolBusinessFixture} />
    )
    expect(getByText('Ordering for')).toBeInTheDocument()
    expect(getByTestId('student-select')).toBeInTheDocument()
    expect(getAllByText('Ada Lovelace').length).toBeGreaterThan(0)
    expect(getByText('Add student')).toBeInTheDocument()
  })

  it('Add student is the base ghost button (type button)', () => {
    const { getByText } = renderWithProviders(<StudentSelector business={schoolBusinessFixture} />)
    const add = getByText('Add student').closest('button')
    expect(add).toHaveAttribute('data-slot', 'button')
    expect(add).toHaveAttribute('type', 'button')
  })

  it('opens student form when adding student while authenticated', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <StudentSelector business={schoolBusinessFixture} />
    )
    fireEvent.click(getByText('Add student'))
    expect(getByTestId('student-form-modal')).toBeInTheDocument()
  })

  it('opens auth modal when adding student while logged out', () => {
    sessionState.auth = false
    sessionState.user = null
    sessionState.token = null
    const { getByText } = renderWithProviders(
      <StudentSelector business={schoolBusinessFixture} />
    )
    fireEvent.click(getByText('Add student'))
    expect(getByText('Login')).toBeInTheDocument()
    sessionState.auth = true
    sessionState.user = { id: 1 }
    sessionState.token = 'token'
  })

  it('the auth modal is a base dialog; its close closes it', async () => {
    sessionState.auth = false
    sessionState.user = null
    sessionState.token = null
    try {
      renderWithProviders(<StudentSelector business={schoolBusinessFixture} />)
      fireEvent.click(screen.getByText('Add student'))
      const dialog = await screen.findByRole('dialog')
      expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
      expect(document.querySelector('#app-modals .popup-component')).toBeNull()
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
      await waitFor(() => expect(screen.queryByText('Login')).toBeNull())
    } finally {
      sessionState.auth = true
      sessionState.user = { id: 1 }
      sessionState.token = 'token'
    }
  })

  it('follows the cart when the same cart arrives without a student', async () => {
    const { rerender } = renderWithProviders(<StudentSelector business={schoolBusinessFixture} />)
    expect(assignStudent).not.toHaveBeenCalled()
    orderMocks.cart = { uuid: 'cart-1', student_id: null }
    rerender(<StudentSelector business={schoolBusinessFixture} />)
    await waitFor(() => expect(setStudentId).toHaveBeenCalledWith(null))
    expect(assignStudent).not.toHaveBeenCalled()
  })

  it('assigns the remembered student to a new cart instead of clearing it', async () => {
    assignStudent.mockResolvedValue({ error: false, result: {} })
    const { rerender } = renderWithProviders(<StudentSelector business={schoolBusinessFixture} />)
    orderMocks.cart = { uuid: 'cart-2', student_id: null }
    rerender(<StudentSelector business={schoolBusinessFixture} />)
    await waitFor(() => expect(assignStudent).toHaveBeenCalledWith('cart-2', sampleStudent.id))
    expect(setStudentId).not.toHaveBeenCalledWith(null)
  })

  it('its column reads at most 35ch and never wider than its container (no fixed px)', () => {
    const { getByText } = renderWithProviders(<StudentSelector business={schoolBusinessFixture} />)
    const css = cssFor(getByText('Ordering for').parentElement).replace(/\s+/g, ' ')
    expect(css).toMatch(/max-width: ?min\(100%, ?35ch\);/)
  })

  it('returns null for non-school businesses', () => {
    const { queryByText } = renderWithProviders(
      <StudentSelector business={{ ...schoolBusinessFixture, vertical: 'food' }} />
    )
    expect(queryByText('Ordering for')).not.toBeInTheDocument()
  })
})
