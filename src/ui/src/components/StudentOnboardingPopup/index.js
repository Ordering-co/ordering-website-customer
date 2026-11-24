import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { useSchoolStudents } from '~components/hooks/useSchoolStudents'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSelectedStudent } from '~components/hooks/useSelectedStudent'
import { useSession } from '~components/contexts/SessionContext'
import { DialogOverlay } from '../Overlay/overlays'
import { StudentFormModal } from '../StudentFormModal'
import { Content, CreateAction } from './styles'
import { NotFoundSource } from '../NotFoundSource'
import { Button } from '~ui/src/design-system/components/Button'

export const StudentOnboardingPopup = (props) => {
  const { business, forceOpen, onForceClose } = props
  const [, t] = useLanguage()
  const [{ auth }] = useSession()
  const { students, loading, refresh } = useSchoolStudents()
  const { studentId: selected, setStudentId } = useSelectedStudent(business?.slug)
  const [dismissed, setDismissed] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  const controlled = forceOpen !== undefined
  const isSchool = business?.vertical === 'school'
  const schoolStudents = students.filter((s) => Number(s.school_id ?? s.school?.id) === Number(business?.id))
  const open = isSchool && auth && !formOpen &&
    (controlled ? forceOpen : (!selected && !dismissed && !loading && schoolStudents.length > 1))

  const handleClose = () => {
    if (controlled) onForceClose && onForceClose()
    else setDismissed(true)
  }

  const pick = (studentId) => {
    setStudentId(studentId)
    setDismissed(true)
    if (controlled) onForceClose && onForceClose()
  }

  const handleSaved = (createdStudent) => {
    refresh()
    if (createdStudent?.id) pick(createdStudent.id)
  }

  return (
    <>
      <DialogOverlay
        size='sm'
        open={open}
        onClose={handleClose}
        title={t('SCHOOL_WHO_ORDERING_FOR', 'Who are you ordering for?')}
      >
        <Content>
          {schoolStudents.length === 0
            /* the compact empty state of the app under the modal's title,
               with Add student as its action (the box of a page's empty
               state does not fit the small modal) */
            ? (
              <NotFoundSource variant='empty' headingLevel='h3' compact icon='userAdd' content={t('SCHOOL_NO_STUDENTS_REGISTERED', 'You have no registered students for this school yet. Add one to start ordering.')}>
                <Button type='button' color='primary' size='md' onClick={() => setFormOpen(true)}>
                  {t('SCHOOL_ADD_STUDENT', 'Add student')}
                </Button>
              </NotFoundSource>
              )
            : schoolStudents.map((student) => (
              <Button key={student.id} type='button' appearance='outline' color='neutral' size='md' fullWidth align='start' onClick={() => pick(student.id)}>
                {`${student.name} ${student.lastname}`}
              </Button>
            ))}
          {schoolStudents.length > 0 && (
            <CreateAction>
              <Button type='button' appearance='ghost' color='primary' onClick={() => setFormOpen(true)}>
                {t('SCHOOL_ADD_STUDENT', 'Add student')}
              </Button>
            </CreateAction>
          )}
        </Content>
      </DialogOverlay>
      {formOpen && (
        <StudentFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          defaultSchoolId={business?.id}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

StudentOnboardingPopup.propTypes = {
  business: PropTypes.object,
  forceOpen: PropTypes.bool,
  onForceClose: PropTypes.func
}
