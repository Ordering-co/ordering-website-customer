import React, { useState } from 'react'
import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeSpace, themeText } from '~/utils/themeTokens'
import { Checkbox, CheckboxGroup, Radio, RadioGroup } from '../../components/Checkbox'
import { Switch } from '../../components/Switch'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'

// The preview's own furniture (styled-components, painted from the theme); the
// controls are the design system's.
const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  justify-items: start;
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'body')}
`

const Message = styled.p`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'danger_text')};
  ${({ theme }) => themeText(theme, 'caption')}
`

const Boxes = () => {
  const [accepted, setAccepted] = useState(false)
  const [toppings, setToppings] = useState(['cheese'])
  return (
    <Stack data-testid='checkboxes'>
      <Row>
        <Checkbox aria-label='Unchecked' data-testid='checkbox-off' />
        <Checkbox aria-label='Checked' defaultChecked data-testid='checkbox-on' />
        <Checkbox aria-label='Disabled' disabled data-testid='checkbox-disabled' />
        <Checkbox aria-label='Disabled and checked' disabled defaultChecked data-testid='checkbox-disabled-on' />
        <Checkbox aria-label='Invalid' invalid aria-describedby='checkbox-error' data-testid='checkbox-invalid' />
      </Row>
      <Message id='checkbox-error'>You must accept the terms to continue.</Message>
      <Checkbox label='With a label: one hit area with its text' data-testid='checkbox-label' />
      <Checkbox label={accepted ? 'Controlled, checked' : 'Controlled, unchecked'} checked={accepted} onCheckedChange={setAccepted} />
      <Caption>In a group</Caption>
      <CheckboxGroup value={toppings} onValueChange={setToppings} aria-label='Toppings'>
        <Stack>
          <Checkbox value='cheese' label='Cheese' />
          <Checkbox value='olives' label='Olives' />
          <Checkbox value='peppers' label='Peppers' disabled />
        </Stack>
      </CheckboxGroup>
    </Stack>
  )
}

const Radios = () => {
  const [size, setSize] = useState('m')
  return (
    <Stack data-testid='radios'>
      <RadioGroup value={size} onValueChange={setSize} aria-label='Size'>
        <Stack>
          <Radio value='s' label='Small' data-testid='radio-off' />
          <Radio value='m' label='Medium' data-testid='radio-on' />
          <Radio value='l' label='Large (unavailable)' disabled data-testid='radio-disabled' />
        </Stack>
      </RadioGroup>
      <Caption>Arrow keys move along the group.</Caption>
    </Stack>
  )
}

const Switches = () => {
  const [on, setOn] = useState(true)
  return (
    <Stack data-testid='switches'>
      <Row>
        <Switch aria-label='Off' data-testid='switch-off' />
        <Switch aria-label='On' defaultChecked data-testid='switch-on' />
        <Switch aria-label='Disabled' disabled data-testid='switch-disabled' />
        <Switch aria-label='Disabled and on' disabled defaultChecked data-testid='switch-disabled-on' />
      </Row>
      <Row>
        <Switch aria-label='Small' size='sm' defaultChecked data-testid='switch-sm' />
        <Switch aria-label='Large' size='lg' defaultChecked data-testid='switch-lg' />
      </Row>
      <Switch label={on ? 'Controlled, on' : 'Controlled, off'} checked={on} onCheckedChange={setOn} data-testid='switch-label' />
    </Stack>
  )
}

export const CheckboxSection = () => (
  <Section aria-labelledby='checkbox-title'>
    <SectionTitle id='checkbox-title'>Checkbox, radio and switch</SectionTitle>
    <Note>
      The theme&apos;s checkbox and radio (size, border, checked color) in their states, with a label that is one
      hit area with the control, and inside a group. Tab to a control for the keyboard ring.
    </Note>
    <Boxes />
    <Radios />
    <Caption>Switch (components.switch): sizes, states and a label that is one hit area</Caption>
    <Switches />
  </Section>
)
