import React, { useState } from 'react'
import styled from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'
import { Button } from '../../components/Button'
import { SliderStopButton } from '../../components/ButtonAppearances'
import { Dot } from '../../components/Dot'
import { Icon } from '../../components/Icon'
import { Stepper, StepperInput } from '../../components/Stepper'
import { TabsAction, TabsNavigation } from '../../components/Tabs'
import { buttonSkinCss } from '../../lib/buttonSkin'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'

// The preview's own furniture (styled-components, painted from the theme); the pieces are the design system's.
const Block = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

// An element React does not render (the smart app banner's links): the Button's look by classes of the page.
const Foreign = styled.a`
  ${({ theme }) => buttonSkinCss(theme, { size: 'sm', color: 'primary', appearance: 'solid' })}
`

const SIZES = ['sm', 'md', 'lg']
const DOTS = [['xs', 'success'], ['sm', 'warning'], ['md', 'danger'], ['sm', 'muted'], ['sm', 'current']]

const Quantities = () => {
  const [count, setCount] = useState(1)
  const [typed, setTyped] = useState('2')
  const limits = { onDecrement: () => setCount((value) => Math.max(0, value - 1)), onIncrement: () => setCount((value) => value + 1), decrementDisabled: count === 0 }
  return (
    <>
      <Caption>Sizes of the stepper (the base Button inside)</Caption>
      <Row>{SIZES.map((size) => <Stepper key={size} size={size} value={count} data-testid={`stepper-${size}`} {...limits} />)}</Row>
      <Caption>Removable: at 1 the − is a trash that removes (the caller removes), above 1 it is the minus</Caption>
      <Row><Stepper removable size='sm' value={count} data-testid='stepper-remove' {...limits} /><output data-testid='stepper-count'>{count}</output></Row>
      <Caption>Compact: inside a row (a sub-option), no frame of its own</Caption>
      <Row><Stepper compact value={count} data-testid='stepper-compact' {...limits} /></Row>
      <Caption>An editable value (the product&apos;s quantity)</Caption>
      <Row>
        <Stepper size='md' data-testid='stepper-input' onDecrement={() => setTyped(String(Math.max(0, Number(typed) - 1)))} onIncrement={() => setTyped(String(Number(typed) + 1))}>
          <StepperInput aria-label='Quantity' inputMode='numeric' value={typed} onChange={(event) => setTyped(event.target.value)} />
        </Stepper>
      </Row>
    </>
  )
}

const HiddenSubmit = () => {
  const [sent, setSent] = useState(0)
  return (
    <form data-testid='sr-form' onSubmit={(event) => { event.preventDefault(); setSent((value) => value + 1) }}>
      <Row>
        <label>Name <input name='name' data-testid='sr-field' /></label>
        <Button srOnly type='submit' tabIndex={-1} aria-hidden='true' data-testid='sr-submit'>Save</Button>
        <output data-testid='sr-sent'>{sent}</output>
      </Row>
    </form>
  )
}

export const ActionsSection = () => (
  <Section aria-labelledby='actions-title'>
    <SectionTitle id='actions-title'>Actions: Stepper, link tabs, icon states, hidden submit, slider stop, Dot, outside-React skin</SectionTitle>
    <Note>
      The quantity control, a tab that is a link to another page, the icon button that is working, a submit nobody sees,
      the stop of a slider, the small round mark and the Button&apos;s look for the links a third party builds in the page.
    </Note>
    <Block><Quantities /></Block>
    <Block>
      <Caption>TabsAction as a link (href, aria-current=page on the active one)</Caption>
      <TabsNavigation aria-label='Profile' data-testid='tabs-link-bar'>
        <TabsAction active href='/profile' icon={<Icon name='person' />}>My account</TabsAction>
        <TabsAction href='/profile/orders' icon={<Icon name='unorderedList' />}>My orders</TabsAction>
      </TabsNavigation>
    </Block>
    <Block>
      <Caption>An icon button at rest and working (disabled, busy, the progress glyph)</Caption>
      <Row>
        <Button shape='icon' appearance='ghost' aria-label='Use my location' data-testid='icon-idle'><Icon name='mapMarker' /></Button>
        <Button shape='icon' appearance='ghost' aria-label='Locating' disabled aria-busy data-testid='icon-working'><Icon name='loaderCircle' /></Button>
        <Button size='xs' shape='icon' appearance='ghost' borderInset aria-label='Information' data-testid='icon-inline'><Icon name='infoCircle' /></Button>
        <Caption>text with an inline action <Button size='xs' shape='icon' appearance='ghost' borderInset aria-label='Info in text' data-testid='icon-in-text'><Icon name='infoCircle' /></Button> in the row</Caption>
      </Row>
    </Block>
    <Block>
      <Caption>A hidden submit: Enter in the field sends the form</Caption>
      <HiddenSubmit />
    </Block>
    <Block>
      <Caption>Stops of a slider (components.slider: the active one in its color and bold)</Caption>
      <Row>
        <SliderStopButton sliderActive aria-pressed data-testid='stop-on'>5 km</SliderStopButton>
        <SliderStopButton aria-pressed={false} data-testid='stop-off'>10 km</SliderStopButton>
      </Row>
    </Block>
    <Block>
      <Caption>Dot: xs, sm, md; success, warning, danger, muted, current</Caption>
      <Row data-testid='dots'>{DOTS.map(([size, color]) => <Dot key={`${size}-${color}`} size={size} color={color} data-testid={`dot-${size}-${color}`} />)}</Row>
    </Block>
    <Block>
      <Caption>The Button&apos;s look on a link the page builds (the smart app banner)</Caption>
      <Row><Foreign href='#view' data-testid='foreign-skin'>View</Foreign></Row>
    </Block>
  </Section>
)
