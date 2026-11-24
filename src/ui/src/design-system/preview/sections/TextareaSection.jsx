import React, { useMemo, useState } from 'react'
import styled, { ThemeProvider, useTheme } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { themeColor } from '~/utils/themeColors'
import { themeSpace, themeText } from '~/utils/themeTokens'
import { Textarea } from '../../components/Textarea'
import { Caption, Note, Section, SectionTitle } from '../ui'

// The preview's own furniture (styled-components, painted from the theme); the
// text areas are the design system's.
const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  max-width: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 8);
`

const Field = styled.label`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'xxs')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'label')}
`

const Message = styled.p`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'danger_text')};
  ${({ theme }) => themeText(theme, 'caption')}
`

// What a store may set on `components.input` that a text area shows: a border
// with a focus border of its own, and a line under the field (the active
// theme's colors, so they follow the theme switch).
const patchInput = (theme, patch) => {
  const values = JSON.parse(JSON.stringify(theme.values))
  patch(values.components.input, values.tokens.color)
  return { ...buildAppTheme(null, { version: 2, values }), platform: theme.platform }
}
const outlined = (input, color) => {
  input.base.border = { width: 1, color: color.border_strong, style: 'solid' }
  input.base.shadow = null
  input.variants.default.states.hover = { border: { width: 1, color: color.text_muted, style: 'solid' } }
  input.variants.default.states.focus = { border: { width: 2, color: color.primary, style: 'solid' } }
}
const underlined = (input, color) => {
  outlined(input, color)
  input.base.border_sides = 'bottom'
}

const Themed = ({ patch, children }) => {
  const outer = useTheme()
  const theme = useMemo(() => patchInput(outer, patch), [outer, patch])
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}

const Areas = ({ where }) => {
  const [value, setValue] = useState('Ring the bell twice, please.')
  return (
    <Stack data-testid={`textareas-${where}`}>
      <Field>Comment<Textarea placeholder='Anything we should know?' data-testid={`${where}-default`} /></Field>
      <Field>With a value, five rows<Textarea rows={5} value={value} onChange={(event) => setValue(event.target.value)} data-testid={`${where}-value`} /></Field>
      <Field>Resizable<Textarea resize='vertical' placeholder='Drag the corner' data-testid={`${where}-fixed`} /></Field>
      <Field>
        Notes
        <Textarea invalid aria-describedby={`${where}-notes-error`} defaultValue='Too long' data-testid={`${where}-invalid`} />
        <Message id={`${where}-notes-error`}>Keep it under 250 characters.</Message>
      </Field>
      <Field>Disabled<Textarea disabled defaultValue='Not editable' data-testid={`${where}-disabled`} /></Field>
      <Field>Read only<Textarea readOnly defaultValue='Order 1042' data-testid={`${where}-readonly`} /></Field>
    </Stack>
  )
}

export const TextareaSection = () => (
  <Section aria-labelledby='textarea-title'>
    <SectionTitle id='textarea-title'>Textarea</SectionTitle>
    <Note>
      Input&apos;s field, taller: the theme&apos;s field height is its minimum and its rows set the rest. It takes
      the field&apos;s side space on every side. Only the resizable one can be dragged taller.
    </Note>
    <Caption>As the theme gives it</Caption>
    <Areas where='plain' />
    <Caption>With a border and a focus border of its own</Caption>
    <Themed patch={outlined}><Areas where='outlined' /></Themed>
    <Caption>As a line under the field</Caption>
    <Themed patch={underlined}><Areas where='underlined' /></Themed>
  </Section>
)
