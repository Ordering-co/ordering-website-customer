import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import {
  sampleStudent,
  schoolBusinessFixture,
  schoolStudentsHookFixture
} from '../../__tests__/helpers/giftCardStudentTestMocks'
import { StudentOnboardingPopup } from '../index'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { getThemeCss } from '~/utils/themeCss'

const setStudentId = vi.hoisted(() => vi.fn())

vi.mock('~components/hooks/useSchoolStudents', () => ({
  useSchoolStudents: () => schoolStudentsHookFixture
}))
vi.mock('~components/hooks/useSelectedStudent', () => ({
  useSelectedStudent: () => ({ studentId: null, setStudentId })
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: true, user: { id: 1 }, token: 'token' }, { login: vi.fn() }]
}))
vi.mock('~ui/src/components/StudentFormModal', () => ({
  StudentFormModal: ({ open }) => (open ? <div data-testid='student-form-modal' /> : null)
}))

describe('StudentOnboardingPopup', () => {
  it('renders student picker when forced open', () => {
    const { getByText } = renderWithProviders(
      <StudentOnboardingPopup
        business={schoolBusinessFixture}
        forceOpen
        onForceClose={vi.fn()}
      />
    )
    expect(getByText('Who are you ordering for?')).toBeInTheDocument()
    expect(getByText('Ada Lovelace')).toBeInTheDocument()
    expect(getByText('Grace Hopper')).toBeInTheDocument()
  })

  it('is a base dialog named by its title; its close calls onForceClose', async () => {
    const onForceClose = vi.fn()
    renderWithProviders(<StudentOnboardingPopup business={schoolBusinessFixture} forceOpen onForceClose={onForceClose} />)
    const dialog = await screen.findByRole('dialog', { name: 'Who are you ordering for?' })
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(onForceClose).toHaveBeenCalled()
  })

  it('selects student and closes popup', () => {
    const onForceClose = vi.fn()
    const { getByText } = renderWithProviders(
      <StudentOnboardingPopup
        business={schoolBusinessFixture}
        forceOpen
        onForceClose={onForceClose}
      />
    )
    fireEvent.click(getByText('Ada Lovelace'))
    expect(setStudentId).toHaveBeenCalledWith(sampleStudent.id)
    expect(onForceClose).toHaveBeenCalled()
  })

  it('opens create form from popup', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <StudentOnboardingPopup
        business={schoolBusinessFixture}
        forceOpen
        onForceClose={vi.fn()}
      />
    )
    fireEvent.click(getByText('Add student'))
    expect(getByTestId('student-form-modal')).toBeInTheDocument()
  })
})

describe('StudentOnboardingPopup dialog', () => {
  it('its width is the theme\'s small modal, not a width of its own', async () => {
    const theme = themeWithValues()
    renderWithProviders(
      <StudentOnboardingPopup business={schoolBusinessFixture} forceOpen onForceClose={vi.fn()} />,
      { theme }
    )
    const dialog = await screen.findByRole('dialog')
    expect(dialog.closest('[data-base-ui-portal]').style.getPropertyValue('--ui-modal-width')).toBe(getThemeCss(theme, 'modal').sizes.sm.width)
  })
})

describe('StudentOnboardingPopup base buttons', () => {
  it('each student and Add student are base buttons; a student is a full width outline that starts its text', () => {
    const { getByText } = renderWithProviders(
      <StudentOnboardingPopup business={schoolBusinessFixture} forceOpen onForceClose={vi.fn()} />,
      { theme: themeWithValues() }
    )
    const student = getByText('Ada Lovelace').closest('button')
    expect(student).toHaveAttribute('data-slot', 'button')
    expect(student).toHaveAttribute('type', 'button')
    expect(student.className).toContain('ui:w-full')
    expect(student.className).toContain('ui:justify-start')
    const add = getByText('Add student').closest('button')
    expect(add).toHaveAttribute('data-slot', 'button')
    expect(add).toHaveAttribute('type', 'button')
  })

  it('the empty state action is the base button', () => {
    const students = schoolStudentsHookFixture.students
    schoolStudentsHookFixture.students = []
    try {
      const { getByRole } = renderWithProviders(
        <StudentOnboardingPopup business={schoolBusinessFixture} forceOpen onForceClose={vi.fn()} />,
        { theme: themeWithValues() }
      )
      expect(getByRole('button', { name: 'Add student' })).toHaveAttribute('data-slot', 'button')
    } finally { schoolStudentsHookFixture.students = students }
  })
})

describe('StudentOnboardingPopup without students of the school', () => {
  const withoutStudents = (fn) => {
    const students = schoolStudentsHookFixture.students
    schoolStudentsHookFixture.students = []
    try { fn() } finally { schoolStudentsHookFixture.students = students }
  }
  const renderPopup = (theme) => renderWithProviders(
    <StudentOnboardingPopup business={schoolBusinessFixture} forceOpen onForceClose={vi.fn()} />,
    { theme }
  )

  it('the empty state of the app (NotFoundSource), an h3 under the modal\'s title', () => withoutStudents(() => {
    const { getByRole } = renderPopup(themeWithValues())
    expect(getByRole('heading', { level: 3, name: /no registered students for this school/ })).toBeInTheDocument()
  }))

  it('the compact empty state (no page box in the modal), Add student as its action', () => withoutStudents(() => {
    const { container, getAllByRole, getByTestId } = renderPopup(themeWithValues())
    const empty = container.ownerDocument.getElementById('not-found-source')
    // compact: no least height of a page's empty state
    expect(empty).toHaveStyle({ minHeight: '0px' })
    const add = getAllByRole('button', { name: 'Add student' })
    expect(add).toHaveLength(1)
    expect(empty).toContainElement(add[0])
    fireEvent.click(add[0])
    expect(getByTestId('student-form-modal')).toBeInTheDocument()
  }))
})
