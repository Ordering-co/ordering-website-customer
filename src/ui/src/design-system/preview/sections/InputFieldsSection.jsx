import React, { useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeSpace, themeText } from '~/utils/themeTokens'
import { InputCode } from '../../components/InputCode'
import { InputPhone } from '../../components/InputPhone'
import { SdkField } from '../../components/SdkField'
import { stripeElementOptions } from '../../lib/sdkStyle'
import { Caption, Note, Section, SectionTitle } from '../ui'

// The preview's own furniture (styled-components, painted from the theme); the
// fields are the design system's.
const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  max-width: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 8);
`

const Message = styled.p`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'danger_text')};
  ${({ theme }) => themeText(theme, 'caption')}
`

const Code = styled.pre`
  margin: 0;
  overflow: auto;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'caption')}
`

// What a third party's iframe is to the page: a box with its own text, which only its own options style
const Frame = ({ text }) => <div data-testid='sdk-frame' tabIndex={0} aria-label={text}>{text}</div>

export const InputCodeSection = () => {
  const [code, setCode] = useState('')
  return (
    <Section aria-labelledby='input-code-title'>
      <SectionTitle id='input-code-title'>Input code</SectionTitle>
      <Note>
        One box per digit. Paste the whole code in any box, type to move on, Backspace to go back, the arrows to move.
        A phone offers the code it received in the first box.
      </Note>
      <Stack data-testid='input-code'>
        <Caption>Four digits, typed so far: <output data-testid='input-code-value'>{code || 'nothing'}</output></Caption>
        <InputCode length={4} value={code} onChange={setCode} data-testid='code-default' />
        <Caption>Six digits, with an error</Caption>
        <InputCode length={6} invalid aria-describedby='code-error' defaultValue='12' data-testid='code-invalid' />
        <Message id='code-error'>That code is not right. Try again.</Message>
        <Caption>Disabled</Caption>
        <InputCode length={4} disabled defaultValue='4821' data-testid='code-disabled' />
      </Stack>
    </Section>
  )
}

export const InputPhoneSection = () => {
  const [phone, setPhone] = useState('+12133734253')
  return (
    <Section aria-labelledby='input-phone-title'>
      <SectionTitle id='input-phone-title'>Input phone</SectionTitle>
      <Note>
        The country control and the number, as the theme&apos;s field. The country is the platform&apos;s own list.
      </Note>
      <Stack data-testid='input-phone'>
        <Caption>With a number: <output data-testid='input-phone-value'>{phone || 'empty'}</output></Caption>
        <InputPhone value={phone} onChange={setPhone} defaultCountry='US' countryLabel='Country' aria-label='Phone number' placeholder='Phone number' data-testid='phone-default' />
        <Caption>Empty, with a placeholder</Caption>
        <InputPhone value='' onChange={() => {}} defaultCountry='US' countryLabel='Country' aria-label='Phone number' placeholder='Phone number' data-testid='phone-empty' />
        <Caption>Number centered (align)</Caption>
        <InputPhone align='center' value='+12133734253' onChange={() => {}} defaultCountry='US' countryLabel='Country' aria-label='Phone number' data-testid='phone-centered' />
        <Caption>With an error</Caption>
        <InputPhone invalid aria-describedby='phone-error' value='+1213' onChange={() => {}} defaultCountry='US' countryLabel='Country' aria-label='Phone number' data-testid='phone-invalid' />
        <Message id='phone-error'>Enter a phone number with the area code.</Message>
        <Caption>Disabled</Caption>
        <InputPhone disabled value='+12133734253' onChange={() => {}} defaultCountry='US' countryLabel='Country' aria-label='Phone number' data-testid='phone-disabled' />
      </Stack>
    </Section>
  )
}

export const SdkFieldSection = () => {
  const theme = useTheme()
  return (
    <Section aria-labelledby='sdk-field-title'>
      <SectionTitle id='sdk-field-title'>SDK field</SectionTitle>
      <Note>
        The box, label, focus and error of the field around a control a third party draws, and the theme translated
        to the options of that SDK.
      </Note>
      <Stack data-testid='sdk-field'>
        <Caption>An iframe (Stripe card element): the piece draws the box around it</Caption>
        <SdkField label='Card number' id='sdk-card'><Frame text='4242 4242 4242 4242' /></SdkField>
        <SdkField label='Card number' id='sdk-card-error' error='Your card number is incomplete.'><Frame text='4242 42' /></SdkField>
        <SdkField label='Card number' disabled><Frame text='Not editable' /></SdkField>
        <Caption>An input the SDK creates (Google Places): it takes the field&apos;s classes</Caption>
        <SdkField label='Address' id='sdk-address' error='Pick an address from the list.'>
          {(field) => <input {...field} placeholder='Address' data-testid='sdk-places' />}
        </SdkField>
        <Caption>What Stripe gets for this theme (<code>stripeElementOptions</code>)</Caption>
        <Code data-testid='sdk-stripe-options'>{JSON.stringify(stripeElementOptions(theme), null, 2)}</Code>
      </Stack>
    </Section>
  )
}
