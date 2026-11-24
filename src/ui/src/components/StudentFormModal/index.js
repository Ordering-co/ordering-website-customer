import React, { useState, useEffect, useId } from 'react'
import PropTypes from 'prop-types'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSchools } from '~components/hooks/useSchools'
import { useSchoolStudents } from '~components/hooks/useSchoolStudents'
import { useToast, ToastType } from '~components/contexts/ToastContext'
import { SCHOOL_ALLERGENS, SCHOOL_DIETARY_TAGS } from '~components/constants/school'
import { Select } from '~ui/src/design-system/components/Select'
import { Input } from '~ui/src/design-system/components/Input'
import { LabeledField } from '~ui/src/styles/Field'
import { Button } from '~ui/src/design-system/components/Button'
import { Chip } from '~ui/src/design-system/components/Chip'
import { DialogOverlay } from '../Overlay/overlays'
import { Form, Field, ChipGroup, ChipCell, Actions } from './styles'

const emptyForm = { schoolId: null, name: '', lastname: '', classroomId: null, gradeId: null, allergies: [], dietaryTags: [] }
const generateCode = () => `STU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

export const StudentFormModal = (props) => {
  const { open, onClose, onSaved, defaultSchoolId, student } = props
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const filterSchoolId = student ? (student.school?.id ?? student.school_id) : defaultSchoolId
  const { schools, loading: loadingSchools } = useSchools(filterSchoolId, open)
  const { createStudent, updateStudent } = useSchoolStudents()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const isEdit = !!student

  useEffect(() => {
    if (!open) return
    if (student) {
      setForm({
        schoolId: student.school?.id ?? student.school_id ?? null,
        name: student.name || '',
        lastname: student.lastname || '',
        classroomId: student.classroom?.id ?? student.classroom_id ?? null,
        gradeId: student.grade?.id ?? student.grade_id ?? null,
        allergies: Array.isArray(student.allergies) ? student.allergies : [],
        dietaryTags: Array.isArray(student.dietary_tags) ? student.dietary_tags : []
      })
    } else {
      setForm({ ...emptyForm, schoolId: defaultSchoolId ?? null })
    }
  }, [open, student, defaultSchoolId])

  useEffect(() => {
    if (!open || isEdit || form.schoolId) return
    if (schools.length === 1) setForm((f) => ({ ...f, schoolId: schools[0].id }))
  }, [open, isEdit, schools, form.schoolId])

  const selectedSchool = schools.find((s) => s.id === Number(form.schoolId))
  const schoolOptions = schools.map((s) => ({ value: s.id, content: s.name }))
  const classroomOptions = (selectedSchool?.classrooms || []).map((c) => ({ value: c.id, content: c.name }))
  const gradeOptions = [...(selectedSchool?.grades || [])]
    .sort((a, b) => a.id - b.id)
    .map((g) => ({ value: g.id, content: g.name }))

  const toggle = (key, value) => {
    setForm((f) => {
      const current = f[key] || []
      return { ...f, [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] }
    })
  }

  const allergiesId = useId()
  const dietaryId = useId()
  // the labels above the fields: the id each label points at
  const fieldsId = useId()

  const handleSave = async () => {
    if (!form.schoolId) { showToast(ToastType.Error, t('SCHOOL_SELECT_SCHOOL', 'Select a school')); return }
    if (!form.name || !form.lastname) { showToast(ToastType.Error, t('SCHOOL_NAME_REQUIRED', 'Name is required')); return }
    if (!form.classroomId) { showToast(ToastType.Error, t('SCHOOL_CLASSROOM_REQUIRED', 'Classroom is required')); return }
    if (gradeOptions.length > 0 && !form.gradeId) { showToast(ToastType.Error, t('SCHOOL_GRADE_REQUIRED', 'Grade is required')); return }
    setSaving(true)
    const payload = {
      classroom_id: form.classroomId,
      grade_id: form.gradeId || undefined,
      name: form.name,
      lastname: form.lastname,
      allergies: form.allergies,
      dietary_tags: form.dietaryTags
    }
    const { error, result } = isEdit
      ? await updateStudent(student.id, payload)
      : await createStudent({ ...payload, school_id: form.schoolId, code: generateCode() })
    setSaving(false)
    if (error) { showToast(ToastType.Error, Array.isArray(result) ? result[0] : result); return }
    showToast(ToastType.Success, t('SCHOOL_CHANGES_SAVED', 'Changes saved'))
    onSaved && onSaved(result)
    onClose && onClose()
  }

  return (
    <DialogOverlay
      size='sm'
      open={open}
      onClose={onClose}
      title={isEdit ? t('SCHOOL_EDIT_STUDENT', 'Edit student') : t('SCHOOL_ADD_STUDENT', 'Add student')}
      data-doc-section='school-student-dialog'
    >
      <Form data-doc-section='school-student-form' data-doc-state={isEdit ? 'edit' : 'add'}>
        <Select
          presentation='mobile-sheet'
          fullWidth
          listBorderBox
          placeholder={t('SCHOOL_SELECT_SCHOOL', 'Select a school')}
          options={schoolOptions}
          defaultValue={form.schoolId ? Number(form.schoolId) : null}
          onChange={(value) => setForm((f) => ({ ...f, schoolId: value, classroomId: null, gradeId: null }))}
          disabled={isEdit}
        />
        <LabeledField label={t('NAME', 'Name')} htmlFor={`${fieldsId}-name`}>
          <Input
            id={`${fieldsId}-name`}
            value={form.name}
            placeholder={t('NAME', 'Name')}
            aria-label={t('NAME', 'Name')}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </LabeledField>
        <LabeledField label={t('LASTNAME', 'Lastname')} htmlFor={`${fieldsId}-lastname`}>
          <Input
            id={`${fieldsId}-lastname`}
            value={form.lastname}
            placeholder={t('LASTNAME', 'Lastname')}
            aria-label={t('LASTNAME', 'Lastname')}
            onChange={(e) => setForm((f) => ({ ...f, lastname: e.target.value }))}
          />
        </LabeledField>
        <Select
          presentation='mobile-sheet'
          fullWidth
          listBorderBox
          placeholder={form.schoolId ? t('SCHOOL_SELECT_CLASSROOM', 'Select a classroom') : t('SCHOOL_SELECT_SCHOOL_FIRST', 'Select a school first')}
          options={classroomOptions}
          defaultValue={form.classroomId ? Number(form.classroomId) : null}
          onChange={(value) => setForm((f) => ({ ...f, classroomId: value }))}
          disabled={!form.schoolId}
        />
        <Select
          presentation='mobile-sheet'
          fullWidth
          listBorderBox
          placeholder={form.schoolId ? t('SCHOOL_SELECT_GRADE', 'Select a grade') : t('SCHOOL_SELECT_SCHOOL_FIRST', 'Select a school first')}
          options={gradeOptions}
          defaultValue={form.gradeId ? Number(form.gradeId) : null}
          onChange={(value) => setForm((f) => ({ ...f, gradeId: value }))}
          disabled={!form.schoolId}
        />
        {/* each group of chips is named by its label */}
        <Field>
          <label id={allergiesId}>{t('SCHOOL_ALLERGIES', 'Allergies')}</label>
          <ChipGroup role='group' aria-labelledby={allergiesId}>
            {SCHOOL_ALLERGENS.map((a) => (
              <ChipCell key={a.value}>
                <Chip type='button' selected={form.allergies.includes(a.value)} onClick={() => toggle('allergies', a.value)}>
                  {t(`SCHOOL_ALLERGEN_${a.value.toUpperCase()}`, a.name)}
                </Chip>
              </ChipCell>
            ))}
          </ChipGroup>
        </Field>
        <Field>
          <label id={dietaryId}>{t('SCHOOL_DIETARY_TAGS', 'Dietary tags')}</label>
          <ChipGroup role='group' aria-labelledby={dietaryId}>
            {SCHOOL_DIETARY_TAGS.map((d) => (
              <ChipCell key={d.value}>
                <Chip type='button' selected={form.dietaryTags.includes(d.value)} onClick={() => toggle('dietaryTags', d.value)}>
                  {t(`SCHOOL_DIETARY_${d.value.toUpperCase()}`, d.name)}
                </Chip>
              </ChipCell>
            ))}
          </ChipGroup>
        </Field>
        <Actions>
          <Button data-doc-control='school-student-save' color='primary' size='md' fullWidth type='button' onClick={handleSave} disabled={saving || loadingSchools}>
            {saving ? t('LOADING', 'Loading') : t('SAVE', 'Save')}
          </Button>
        </Actions>
      </Form>
    </DialogOverlay>
  )
}

StudentFormModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSaved: PropTypes.func,
  defaultSchoolId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  student: PropTypes.object
}
