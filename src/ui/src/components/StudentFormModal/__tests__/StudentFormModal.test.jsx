import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import {
  sampleSchool,
  sampleStudent,
  schoolsHookFixture,
  schoolStudentsHookFixture
} from '../../__tests__/helpers/giftCardStudentTestMocks'
import { StudentFormModal } from '../index'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { getThemeCss } from '~/utils/themeCss'

const mocks = vi.hoisted(() => ({
  schools: null,
  showToast: vi.fn()
}))

vi.mock('~components/hooks/useSchools', () => ({
  useSchools: () => mocks.schools
}))
vi.mock('~components/hooks/useSchoolStudents', () => ({
  useSchoolStudents: () => schoolStudentsHookFixture
}))
vi.mock('~components/contexts/ToastContext', () => ({
  ToastType: { Error: 'error', Success: 'success' },
  useToast: () => [{}, { showToast: mocks.showToast }]
}))
vi.mock('~ui/src/design-system/components/Select', () => ({
  Select: ({ placeholder, options = [], onChange }) => (
    <div data-testid='select'>
      <span>{placeholder}</span>
      {options.map((opt) => (
        <button key={opt.value} type='button' onClick={() => onChange(opt.value)}>{opt.content}</button>
      ))}
    </div>
  )
}))

const fillRequiredFields = (utils) => {
  fireEvent.change(utils.getByPlaceholderText('Name'), { target: { value: 'Ada' } })
  fireEvent.change(utils.getByPlaceholderText('Lastname'), { target: { value: 'Lovelace' } })
  fireEvent.click(utils.getByText('Room A'))
}

describe('StudentFormModal', () => {
  beforeEach(() => {
    mocks.schools = schoolsHookFixture
    mocks.showToast.mockReset()
    schoolStudentsHookFixture.createStudent.mockClear()
  })

  it('renders add student form fields', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <StudentFormModal open onClose={vi.fn()} onSaved={vi.fn()} defaultSchoolId={sampleSchool.id} />
    )
    expect(getByText('Add student')).toBeInTheDocument()
    expect(getByText('Select a school')).toBeInTheDocument()
    expect(getByPlaceholderText('Name')).toBeInTheDocument()
    expect(getByText('Save')).toBeInTheDocument()
  })

  it('is a base dialog named by its title, on the school-student-dialog section; its close calls onClose', async () => {
    const onClose = vi.fn()
    renderWithProviders(<StudentFormModal open onClose={onClose} onSaved={vi.fn()} defaultSchoolId={sampleSchool.id} />)
    const dialog = await screen.findByRole('dialog', { name: 'Add student' })
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(dialog.getAttribute('data-doc-section')).toBe('school-student-dialog')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('its width is the theme\'s small modal, not a width of its own', async () => {
    const theme = themeWithValues()
    renderWithProviders(<StudentFormModal open onClose={vi.fn()} onSaved={vi.fn()} defaultSchoolId={sampleSchool.id} />, { theme })
    const dialog = await screen.findByRole('dialog', { name: 'Add student' })
    expect(dialog.closest('[data-base-ui-portal]').style.getPropertyValue('--ui-modal-width')).toBe(getThemeCss(theme, 'modal').sizes.sm.width)
  })

  it('requires a grade before creating the student', async () => {
    const utils = renderWithProviders(
      <StudentFormModal open onClose={vi.fn()} onSaved={vi.fn()} defaultSchoolId={sampleSchool.id} />
    )
    fillRequiredFields(utils)
    fireEvent.click(utils.getByText('Save'))
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith('error', 'Grade is required'))
    expect(schoolStudentsHookFixture.createStudent).not.toHaveBeenCalled()
  })

  it('creates the student with the picked grade', async () => {
    const utils = renderWithProviders(
      <StudentFormModal open onClose={vi.fn()} onSaved={vi.fn()} defaultSchoolId={sampleSchool.id} />
    )
    fillRequiredFields(utils)
    fireEvent.click(utils.getByText('5th'))
    fireEvent.click(utils.getByText('Save'))
    await waitFor(() => expect(schoolStudentsHookFixture.createStudent).toHaveBeenCalledWith(expect.objectContaining({ grade_id: 5, classroom_id: 10 })))
    expect(mocks.showToast).not.toHaveBeenCalledWith('error', 'Grade is required')
  })

  it('does not require a grade when the school has none configured', async () => {
    mocks.schools = { ...schoolsHookFixture, schools: [{ ...sampleSchool, grades: [] }] }
    const utils = renderWithProviders(
      <StudentFormModal open onClose={vi.fn()} onSaved={vi.fn()} defaultSchoolId={sampleSchool.id} />
    )
    fillRequiredFields(utils)
    fireEvent.click(utils.getByText('Save'))
    await waitFor(() => expect(schoolStudentsHookFixture.createStudent).toHaveBeenCalled())
    expect(mocks.showToast).not.toHaveBeenCalledWith('error', 'Grade is required')
  })

  it('renders edit mode when student is provided', () => {
    const { getByText } = renderWithProviders(
      <StudentFormModal
        open
        onClose={vi.fn()}
        onSaved={vi.fn()}
        student={sampleStudent}
      />
    )
    expect(getByText('Edit student')).toBeInTheDocument()
    expect(getByText('Test School')).toBeInTheDocument()
  })

  it('names its fields and its groups of chips', () => {
    const utils = renderWithProviders(
      <StudentFormModal open onClose={vi.fn()} onSaved={vi.fn()} defaultSchoolId={sampleSchool.id} />
    )
    expect(utils.getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
    expect(utils.getByRole('textbox', { name: 'Lastname' })).toBeInTheDocument()
    expect(utils.getByRole('group', { name: 'Allergies' })).toBeInTheDocument()
    expect(utils.getByRole('group', { name: 'Dietary tags' })).toBeInTheDocument()
  })

  it('its fields and its save action are the base pieces and keep their behavior', async () => {
    const utils = renderWithProviders(
      <StudentFormModal open onClose={vi.fn()} onSaved={vi.fn()} defaultSchoolId={sampleSchool.id} />
    )
    const name = utils.getByRole('textbox', { name: 'Name' })
    const lastname = utils.getByRole('textbox', { name: 'Lastname' })
    expect(name).toHaveAttribute('data-slot', 'input')
    expect(lastname).toHaveAttribute('data-slot', 'input')
    fireEvent.change(name, { target: { value: 'Ada' } })
    expect(name).toHaveValue('Ada')
    const save = utils.getByText('Save').closest('button')
    expect(save).toHaveAttribute('data-slot', 'button')
    expect(save).toHaveAttribute('type', 'button')
    expect(save).toHaveAttribute('data-doc-control', 'school-student-save')
    expect(save.className).toContain('ui:w-full')
    fillRequiredFields(utils)
    fireEvent.click(utils.getByText('5th'))
    fireEvent.click(save)
    await waitFor(() => expect(schoolStudentsHookFixture.createStudent).toHaveBeenCalled())
  })
})
