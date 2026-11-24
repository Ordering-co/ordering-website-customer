import React from 'react'
import styled, { useTheme } from 'styled-components'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { componentVars } from '../../lib/componentVars'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'
import { PortalDemo } from './portal-demo'

const SELECTION = { size: 'md', color: 'primary', appearance: 'solid' }

// What a piece does with `componentVars`: the variables on its own element, its
// classes (here, plain CSS) read them. It stands in for the button until it exists.
const Sample = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: var(--ui-button-height);
  padding: 0 var(--ui-button-padding-x);
  border-radius: var(--ui-button-radius);
  background: var(--ui-button-background);
  color: var(--ui-button-color);
  border: var(--ui-button-border);
  box-shadow: var(--ui-button-shadow);
  font-family: var(--ui-button-text-family);
  font-size: var(--ui-button-text-size);
  line-height: var(--ui-button-text-line);
  font-weight: var(--ui-button-text-weight);
`

const Probe = ({ children, where }) => {
  const theme = useTheme()
  const vars = componentVars(theme, 'button', SELECTION)
  return (
    <Row>
      <Sample style={vars} data-testid={`vars-${where}`}>{children}</Sample>
      <Caption>{where}: {vars['--ui-button-height']} high, radius {vars['--ui-button-radius']}, {vars['--ui-button-padding-x']} sides</Caption>
    </Row>
  )
}

export const ComponentVarsSection = () => (
  <Section aria-labelledby='vars-title'>
    <SectionTitle id='vars-title'>Component variables and scope</SectionTitle>
    <Note>
      A piece reads its component from the theme (<code>components.button</code>, the group&apos;s scope, the phone&apos;s
      overrides) and writes it on its own element. These stand in for the button.
    </Note>
    <Probe where='global'>Add to cart</Probe>
    <ComponentScope group='header'>
      <Probe where='header scope'>Add to cart</Probe>
      <Row>
        <PortalDemo id='portal' translateTitle={t => t('DS_PREVIEW_PORTAL_VARIABLES', 'Component variables')}>
          <Probe where='portal in header'>Checkout</Probe>
        </PortalDemo>
      </Row>
    </ComponentScope>
  </Section>
)
