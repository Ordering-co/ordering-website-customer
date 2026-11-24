import React, { useMemo, useState } from 'react'
import styled, { ThemeProvider, useTheme } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { themeColor } from '~/utils/themeColors'
import { themeSpace, themeText } from '~/utils/themeTokens'
import { Icon } from '../../components/Icon'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Caption, Note, Section, SectionTitle } from '../ui'

// The preview's own furniture (styled-components, painted from the theme); the
// inputs are the design system's.
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

// The three preview themes give the input nothing of its own, so these two
// derive from the active theme what a store may set on `components.input`: a
// border with a focus border of its own, and a line under the field. The
// colors are the active theme's tokens, so they follow the theme switch.
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

const Clear = () => <Button shape='icon' size='xs' appearance='ghost' color='neutral' aria-label='Clear' type='button'><Icon name='close' /></Button>

// A quantity stepper in the suffix: two icon buttons around the number (`suffixWide`)
const Stepper = ({ quantity, setQuantity }) => (
  <>
    <Button shape='icon' size='xs' appearance='ghost' color='neutral' aria-label='Decrease quantity' type='button' onClick={() => setQuantity(Math.max(1, quantity - 1))}><Icon name='dashCircle' /></Button>
    <span aria-live='polite'>{quantity}</span>
    <Button shape='icon' size='xs' appearance='ghost' color='neutral' aria-label='Increase quantity' type='button' onClick={() => setQuantity(quantity + 1)}><Icon name='plusCircle' /></Button>
  </>
)

const Fields = ({ where }) => {
  const [value, setValue] = useState('Rosa')
  const [quantity, setQuantity] = useState(1)
  return (
    <Stack data-testid={`inputs-${where}`}>
      <Field>Name<Input placeholder='Your name' data-testid={`${where}-default`} /></Field>
      <Field>With a value<Input value={value} onChange={(event) => setValue(event.target.value)} data-testid={`${where}-value`} /></Field>
      <Field>Search<Input prefix={<Icon name='search' />} placeholder='Search stores' data-testid={`${where}-prefix`} /></Field>
      <Field>Email<Input type='email' suffix={<Icon name='user' />} placeholder='you@example.com' data-testid={`${where}-suffix`} /></Field>
      <Field>Both<Input prefix={<Icon name='search' />} suffix={<Clear />} defaultValue='pizza' data-testid={`${where}-both`} /></Field>
      <Field>Item<Input suffixWide suffix={<Stepper quantity={quantity} setQuantity={setQuantity} />} placeholder='Describe the product' data-testid={`${where}-wide-suffix`} /></Field>
      <Field>
        Phone
        <Input invalid aria-describedby={`${where}-phone-error`} defaultValue='12' data-testid={`${where}-invalid`} />
        <Message id={`${where}-phone-error`}>Enter a phone number with the area code.</Message>
      </Field>
      <Field>Disabled<Input disabled defaultValue='Not editable' data-testid={`${where}-disabled`} /></Field>
      <Field>Read only<Input readOnly defaultValue='Order 1042' data-testid={`${where}-readonly`} /></Field>
    </Stack>
  )
}

export const InputSection = () => (
  <Section aria-labelledby='input-title'>
    <SectionTitle id='input-title'>Input</SectionTitle>
    <Note>
      The theme&apos;s field in its states, with an icon before or after, and with an error that names its message.
      Click a field to see the focus; tab to it for the keyboard ring.
    </Note>
    <Caption>As the theme gives it</Caption>
    <Fields where='plain' />
    <Caption>With a border and a focus border of its own</Caption>
    <Themed patch={outlined}><Fields where='outlined' /></Themed>
    <Caption>As a line under the field</Caption>
    <Themed patch={underlined}><Fields where='underlined' /></Themed>
  </Section>
)
