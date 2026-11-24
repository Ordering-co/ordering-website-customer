import React from 'react'
import styled, { useTheme } from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'

/**
 * `components.field.base` as CSS (its view), the parts of a form around its
 * controls (label, helper and error texts) and its rhythm (the space between
 * fields and before the actions).
 */
export const fieldTheme = (theme) => getThemeCss(theme, 'field').base

/**
 * The space between two fields of a form (`gap`: the same rhythm in every
 * form).
 */
export const fieldGap = (theme) => fieldTheme(theme).gap

/** The space between the last field and the form's actions (`actions_gap`). */
export const fieldActionsGap = (theme) => fieldTheme(theme).actions_gap

/** The space between a label and its control (`label_gap`). */
export const fieldLabelGap = (theme) => fieldTheme(theme).label_gap

/** The space between a control and its helper or error text (`message_gap`). */
export const fieldMessageGap = (theme) => fieldTheme(theme).message_gap

const textCss = (text, color) => `${text.css}\ncolor: ${color};`

/**
 * A field's label: its text and color, `label_gap` above its control.
 */
export const fieldLabelCss = (theme) => {
  const field = fieldTheme(theme)
  return `${textCss(field.label, field.label_color)}\nmargin: 0 0 ${fieldLabelGap(theme)};`
}

/**
 * A text under a control, its helper (a hint) or its error (`error`): its text
 * and color, `message_gap` under the control.
 */
export const fieldMessageCss = (theme, { error = false } = {}) => {
  const field = fieldTheme(theme)
  return [
    error ? textCss(field.error, field.error_color) : textCss(field.helper, field.helper_color),
    `margin: ${fieldMessageGap(theme)} 0 0;`
  ].join('\n')
}

/**
 * An error text placed ABOVE its control inside a form whose fields are `gap`
 * apart (the login, the password recovery): its text and color, `message_gap`
 * from the control below.
 */
export const fieldErrorAboveCss = (theme) => {
  const field = fieldTheme(theme)
  return [
    textCss(field.error, field.error_color),
    `margin: 0 0 calc(${fieldMessageGap(theme)} - ${fieldGap(theme)});`
  ].join('\n')
}

/**
 * Only the text and color of a field's error (for an error whose place the form
 * already sets).
 */
export const fieldErrorTextCss = (theme) => {
  const field = fieldTheme(theme)
  return textCss(field.error, field.error_color)
}

/**
 * Whether the forms show each field's label above it (`label_position: above`);
 * with `placeholder` (the default) a field is named by its placeholder (and its
 * aria-label).
 */
export const fieldLabelAbove = (theme) => fieldTheme(theme).label_position === 'above'

/** A field's label above its control: `components.field`'s label (fieldLabelCss). */
export const FieldLabel = styled.label`
  display: block;
  width: 100%;
  text-align: start;
  ${({ theme }) => fieldLabelCss(theme)}
`

// The label and its control, one item of the form (its gap, its grid cell)
export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  min-width: 0;
`

/**
 * A control of a form with its label above it (`<label for>`), when the
 * theme puts the labels above (fieldLabelAbove); otherwise the control alone,
 * as it is.
 */
export const LabeledField = ({ label, htmlFor, children, ...props }) => {
  const theme = useTheme()
  if (!label || !fieldLabelAbove(theme)) return children ?? null
  return (
    <FieldGroup {...props}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
    </FieldGroup>
  )
}
