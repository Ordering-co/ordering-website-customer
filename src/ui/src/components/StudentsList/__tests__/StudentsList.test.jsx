import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { schoolStudentsHookFixture } from '../../__tests__/helpers/giftCardStudentTestMocks'
import { StudentsList } from '../index'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

vi.mock('~components/hooks/useSchoolStudents', () => ({
  useSchoolStudents: () => schoolStudentsHookFixture
}))
vi.mock('~ui/src/components/StudentFormModal', () => ({
  StudentFormModal: ({ open }) => (open ? <div data-testid='student-form-modal'>Add student</div> : null)
}))

describe('StudentsList', () => {
  it('renders registered students', () => {
    const { getByText } = renderWithProviders(<StudentsList />)
    expect(getByText('My students')).toBeInTheDocument()
    expect(getByText('Add student')).toBeInTheDocument()
    expect(getByText(/Ada Lovelace/)).toBeInTheDocument()
  })

  it('opens create form when add student is pressed', () => {
    const { getByText, getByTestId } = renderWithProviders(<StudentsList />)
    fireEvent.click(getByText('Add student'))
    expect(getByTestId('student-form-modal')).toBeInTheDocument()
  })

  it('Add student is the base button and keeps its data-doc-control', () => {
    const { getByText } = renderWithProviders(<StudentsList />, { theme: themeWithValues() })
    const add = getByText('Add student').closest('button')
    expect(add).toHaveAttribute('data-slot', 'button')
    expect(add).toHaveAttribute('type', 'button')
    expect(add).toHaveAttribute('data-doc-control', 'school-add-student')
  })

  it('opens edit form when student card is clicked', () => {
    const { getByText, getByTestId } = renderWithProviders(<StudentsList />)
    fireEvent.click(getByText(/Ada Lovelace/))
    expect(getByTestId('student-form-modal')).toBeInTheDocument()
  })
})

describe('StudentsList: /profile?view=students as an account page', () => {
  it('its title the page\'s h1 (section_header page title color), one title gap over the students; no box of its own', () => {
    const theme = themeWithValues((values) => {
      values.components.section_header.base = { ...values.components.section_header.base, title_color: '#0D0E0F' }
      values.components.section_header.variants.page = { ...values.components.section_header.variants.page, margin_bottom: 31 }
      return values
    })
    const { container, getByRole } = renderWithProviders(<StudentsList />, { theme })
    const title = getByRole('heading', { level: 1, name: 'My students' })
    expect(title).toHaveStyle({ color: '#0D0E0F' })
    expect(title.parentElement).toHaveStyle({ marginBottom: '31px' })
    const wrapper = container.querySelector('[data-doc-section="school-students"]')
    expect(cssFor(wrapper).replace(/\s+/g, '')).toMatch(/\{width:100%;margin:0;gap:0;\}/)
  })
})

describe('StudentsList without students', () => {
  const withoutStudents = (fn) => {
    const students = schoolStudentsHookFixture.students
    schoolStudentsHookFixture.students = []
    try { fn() } finally { schoolStudentsHookFixture.students = students }
  }

  it('the empty state of the app (NotFoundSource, empty.not_found), an h2 under the page\'s h1', () => withoutStudents(() => {
    const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, 'empty.not_found': 'https://cdn.test/nf.png' } }))
    const { container, getByRole } = renderWithProviders(<StudentsList />, { theme })
    expect(getByRole('heading', { level: 1, name: 'My students' })).toBeInTheDocument()
    expect(getByRole('heading', { level: 2, name: /no registered students yet/ })).toBeInTheDocument()
    expect(container.querySelector('#not-found-source img')).toHaveAttribute('src', 'https://cdn.test/nf.png')
  }))
})
