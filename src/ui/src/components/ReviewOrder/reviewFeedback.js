import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { getFormApiFeedback } from '~/utils/formApiFeedback'
import { fieldMessageCss } from '~ui/src/styles/Field'

export const orderRatingFields = ['quality', 'delivery', 'service', 'package']
export const orderReviewFields = [...orderRatingFields, 'comment']
export const reviewFields = ['qualification', 'comment']
export const noReviewFields = []

const emptyFeedback = { message: null, fields: {} }

export const FieldError = styled.span.attrs({ role: 'alert' })`
  display: block;
  ${({ theme }) => fieldMessageCss(theme, { error: true })}
`

export const reviewErrorAttributes = (id, message) => ({
  'aria-invalid': message ? true : undefined,
  'aria-describedby': message ? id : undefined
})

export const useReviewFeedback = (t, formState, fields, onSuccess) => {
  const [feedback, setFeedback] = useState(emptyFeedback)
  const submittedState = useRef(null)

  useEffect(() => {
    if (!submittedState.current || formState === submittedState.current || formState.loading) return
    submittedState.current = null

    // OrderReview can put the error on the outer state. The other paths wrap it in result.
    const response = formState.error ? formState : formState.result
    if (response?.error) {
      setFeedback(getFormApiFeedback(t, response, { fields }))
    } else {
      onSuccess()
    }
  }, [formState, fields, onSuccess, t])

  const startSubmission = (send) => {
    submittedState.current = formState
    setFeedback(emptyFeedback)
    send()
  }

  const setMessage = (message) => setFeedback(previous => ({ ...previous, message }))

  const clearFields = (...names) => setFeedback(previous => {
    if (!names.some(name => previous.fields[name])) return previous
    const nextFields = { ...previous.fields }
    names.forEach(name => delete nextFields[name])
    return { ...previous, fields: nextFields }
  })

  return { ...feedback, startSubmission, setMessage, clearFields }
}
