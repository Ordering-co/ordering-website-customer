import React, { useState } from 'react'
import { useSchoolStudents } from '~components/hooks/useSchoolStudents'
import { useLanguage } from '~components/contexts/LanguageContext'
import { StudentFormModal } from '../StudentFormModal'
import { Button } from '~ui/src/design-system/components/Button'
import { Wrapper, Header, StudentCard, StudentName, StudentDetails, Empty } from './styles'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'

export const StudentsList = () => {
  const [, t] = useLanguage()
  // /profile?view=students: the list's title is the page's h1 (the title of
  // the account pages)
  const { students, loading, refresh } = useSchoolStudents()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const openCreate = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (student) => { setEditing(student); setFormOpen(true) }

  return (
    <Wrapper data-doc-section='school-students' data-doc-state={loading ? 'loading' : students.length === 0 ? 'empty' : 'list'}>
      <Header>
        <h1>{t('SCHOOL_MY_STUDENTS', 'My students')}</h1>
        <Button data-doc-control='school-add-student' type='button' onClick={openCreate}>{t('SCHOOL_ADD_STUDENT', 'Add student')}</Button>
      </Header>

      {loading
        ? <Empty>{t('LOADING', 'Loading')}</Empty>
        : students.length === 0
          /* the empty state of the app (the theme's empty.not_found), a
             section of the page's h1 */
          ? <NotFoundSource variant='empty' headingLevel='h2' icon='userAdd' content={t('SCHOOL_NO_STUDENTS_YET', 'You have no registered students yet. Add one to start ordering for them.')} />
          : students.map((student) => (
            <StudentCard data-doc-control='school-edit-student' key={student.id} onClick={() => openEdit(student)}>
              <StudentName>{student.name} {student.lastname}</StudentName>
              <StudentDetails>{[student.school?.name, student.classroom?.name, student.grade?.name].filter(Boolean).join(' · ') || '-'}</StudentDetails>
            </StudentCard>
          ))}

      {formOpen && (
        <StudentFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          student={editing}
          onSaved={() => refresh()}
        />
      )}
    </Wrapper>
  )
}
