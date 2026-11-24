import React, { useMemo, useState } from 'react'
import styled, { ThemeProvider, useTheme } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { themeColor } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeControlHeight, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { fieldBoxProps } from '../../components/SdkField'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/Dialog'
import { Icon } from '../../components/Icon'
import { Select } from '../../components/Select'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'

// The preview's own furniture (styled-components, painted from the theme); the
// selects are the design system's.
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

// The header's capsule is painted by its container (the box of `components.input`,
// as `OrderContextCapsule` does with the same helper); its items have none.
const Capsule = styled.div.attrs(({ theme }) => ({ role: 'group', ...fieldBoxProps(theme) }))`
  display: flex;
  align-items: center;
  box-sizing: border-box;
  max-width: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 8);
  padding: 0 ${({ theme }) => themeSpace(theme, 'xs')};
  gap: ${({ theme }) => themeSpace(theme, 'xxs')};
  height: calc(${({ theme }) => themeSpace(theme, 'xxxl')} + ${({ theme }) => themeSpace(theme, 'xs')});
`

const Action = styled.button`
  cursor: pointer;
  box-sizing: border-box;
  min-height: ${({ theme }) => `${themeControlHeight(theme, 'button', 'md')}px`};
  padding: 0 ${({ theme }) => themeSpace(theme, 'lg')};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border_strong')}`};
  background: ${({ theme }) => themeColor(theme, 'surface')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'button')}
`

const Dot = styled.span`
  align-self: stretch;
  border-inline-start: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border')}`};
`

// What a store may set on `components.input` that a select shows: a border with a
// focus border of its own, and a line under the field.
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

const LANGUAGES = [
  { value: 'en', content: 'English', showOnSelected: 'EN' },
  { value: 'es', content: 'Español', showOnSelected: 'ES' },
  { value: 'fr', content: 'Français', showOnSelected: 'FR', disabled: true },
  { value: 'pt', content: 'Português', showOnSelected: 'PT' }
]
const ORDER_TYPES = [
  { value: 'delivery', content: <><Icon name='truckDelivery' /><span>Delivery</span></> },
  { value: 'pickup', content: <><Icon name='shoppingBag' /><span>Pickup</span></> },
  { value: 'eatin', content: <><Icon name='store' /><span>Eat in</span></> }
]
const MANY = Array.from({ length: 24 }, (_, i) => ({ value: `option-${i + 1}`, content: `Option ${i + 1}` }))

const Selects = ({ where }) => {
  const [value, setValue] = useState('es')
  return (
    <Stack data-testid={`selects-${where}`}>
      <Field>Language<Select aria-label='Language' placeholder='Choose a language' options={LANGUAGES} fullWidth data-testid={`${where}-default`} /></Field>
      <Field>With a value (controlled)<Select aria-label='Controlled' options={LANGUAGES} value={value} onChange={setValue} fullWidth data-testid={`${where}-value`} /></Field>
      <Field>With an icon<Select aria-label='Order type' options={ORDER_TYPES} defaultValue='pickup' fullWidth data-testid={`${where}-icons`} /></Field>
      <Field>Many options (the list scrolls)<Select aria-label='Many' options={MANY} placeholder='Pick one' fullWidth data-testid={`${where}-many`} /></Field>
      <Field>
        Language, with an error
        <Select aria-label='With an error' invalid aria-describedby={`${where}-select-error`} options={LANGUAGES} placeholder='Choose a language' fullWidth data-testid={`${where}-invalid`} />
        <Message id={`${where}-select-error`}>Choose a language to continue.</Message>
      </Field>
      <Field>Disabled<Select aria-label='Disabled' disabled options={LANGUAGES} defaultValue='en' fullWidth data-testid={`${where}-disabled`} /></Field>
      <Field>One option (only shown)<Select aria-label='One option' options={[LANGUAGES[0]]} defaultValue='en' fullWidth data-testid={`${where}-single`} /></Field>
    </Stack>
  )
}

const Capsules = ({ where }) => (
  <Stack data-testid={`capsules-${where}`}>
    <Capsule>
      <Select variant='capsule' aria-label='Order type' options={ORDER_TYPES} defaultValue='delivery' data-testid={`${where}-capsule-type`} />
      <Dot />
      <Select variant='capsule' aria-label='Moment' options={[{ value: 'asap', content: 'ASAP' }, { value: 'later', content: 'Schedule for later' }]} defaultValue='asap' data-testid={`${where}-capsule-moment`} />
    </Capsule>
  </Stack>
)

export const SelectSection = () => (
  <Section aria-labelledby='select-title'>
    <SectionTitle id='select-title'>Select</SectionTitle>
    <Note>
      The theme&apos;s field that opens a list: the field is components.input, the list components.menu (item height,
      side space, text, hover and selected). Tab to it and press the down arrow, Enter or Space; arrows move, Enter
      picks, Escape closes (an open list makes the rest of the page inert, so open one at a time). It has no check mark: the selected option has its own background, as the legacy select.
    </Note>
    <Caption>As the theme gives it</Caption>
    <Selects where='plain' />
    <Caption>With a border and a focus border of its own</Caption>
    <Themed patch={outlined}><Selects where='outlined' /></Themed>
    <Caption>As a line under the field</Caption>
    <Themed patch={underlined}><Selects where='underlined' /></Themed>
    <Caption>The header capsule&apos;s items (no box of their own: the capsule paints it; the text and icon are the header&apos;s tabs)</Caption>
    <Capsules where='plain' />
    <Caption>Over a dialog: the list opens above it</Caption>
    <Row>
      <Dialog>
        <DialogTrigger render={<Action type='button' />}>Open a dialog with a select</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Language</DialogTitle>
            <DialogDescription>The list draws over this dialog.</DialogDescription>
          </DialogHeader>
          <Select aria-label='Language in a dialog' options={LANGUAGES} defaultValue='en' fullWidth data-testid='dialog-select' />
        </DialogContent>
      </Dialog>
    </Row>
  </Section>
)
