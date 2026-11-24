import React, { useState } from 'react'
import styled from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'
import { PortalDemo } from './portal-demo'
import { ForwardArrow } from './forward-arrow'

// The preview's own furniture (styled-components, painted from the theme); the
// buttons are the design system's.
const COLORS = ['primary', 'secondary', 'danger', 'success', 'neutral', 'inverse']
const APPEARANCES = ['solid', 'outline', 'tonal', 'ghost']
const SIZES = ['xs', 'sm', 'md', 'lg']

const Block = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

const Narrow = styled.div`
  width: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 3);
`

const Group = ({ title, children }) => (
  <Block>
    <Caption>{title}</Caption>
    <Row>{children}</Row>
  </Block>
)

const Loader = () => {
  const [loading, setLoading] = useState(false)
  const start = () => {
    setLoading(true)
    window.setTimeout(() => setLoading(false), 2000)
  }
  return <Button loading={loading} onClick={start} data-testid='button-loading-demo'><Icon name='bag' /> Place order</Button>
}

const Inside = ({ where }) => (
  <Row>
    <Button data-testid={`button-${where}`}>Checkout</Button>
    <Button appearance='outline' data-testid={`button-${where}-outline`}>Sign in</Button>
    <Button shape='icon' appearance='ghost' color='neutral' aria-label='Search' data-testid={`button-${where}-icon`}><Icon name='search' /></Button>
  </Row>
)

export const ButtonSection = () => (
  <Section aria-labelledby='button-title'>
    <SectionTitle id='button-title'>Button</SectionTitle>
    <Note>
      Every color and appearance of <code>components.button</code>, its sizes, the icon shape, loading and disabled; the
      same buttons in the header group&apos;s scope and in a portal.
    </Note>
    {COLORS.map((color) => (
      <Group key={color} title={color}>
        {APPEARANCES.map((appearance) => (
          <Button key={appearance} color={color} appearance={appearance} data-testid={`button-${color}-${appearance}`}>{appearance}</Button>
        ))}
        {APPEARANCES.map((appearance) => (
          <Button key={`d-${appearance}`} color={color} appearance={appearance} disabled data-testid={`button-${color}-${appearance}-disabled`}>disabled</Button>
        ))}
      </Group>
    ))}
    <Group title='sizes'>
      {SIZES.map((size) => (
        <Button key={size} size={size} data-testid={`button-size-${size}`}><Icon name='bag' /> {size}</Button>
      ))}
    </Group>
    <Group title='icon shape (aria-label required)'>
      {SIZES.map((size) => (
        <Button key={size} shape='icon' size={size} appearance='tonal' aria-label={`Search ${size}`} data-testid={`button-icon-${size}`}><Icon name='search' /></Button>
      ))}
      <Button shape='icon' appearance='ghost' color='neutral' aria-label='Notifications' data-testid='button-icon-ghost'><Icon name='bell' /></Button>
      <Button shape='icon' appearance='ghost' color='neutral' disabled aria-label='Notifications (off)' data-testid='button-icon-disabled'><Icon name='bell' /></Button>
    </Group>
    <Group title='loading (click it), and loading by default'>
      <Loader />
      <Button loading data-testid='button-loading'><Icon name='bag' /> Place order</Button>
      <Button loading appearance='outline' data-testid='button-loading-outline'>Place order</Button>
      <Button loading shape='icon' appearance='tonal' aria-label='Loading' data-testid='button-loading-icon'><Icon name='search' /></Button>
    </Group>
    <Group title='link (render + nativeButton={false}) and a label that does not fit'>
      <Button render={<a href='#orders' />} nativeButton={false} appearance='outline' data-testid='button-link'>My orders <ForwardArrow /></Button>
      <Narrow><Button data-testid='button-long'>A very long label that does not fit its box and ends in an ellipsis</Button></Narrow>
    </Group>
    <Group title='cta (full width when the theme says so)'>
      <Narrow>
        <Button cta data-testid='button-cta'>Continue</Button>
      </Narrow>
    </Group>
    <Block>
      <Caption>inside the header group (scope) and its portal</Caption>
      <ComponentScope group='header'>
        <Inside where='header' />
        <Row>
          <PortalDemo id='button-portal-box' translateTitle={t => t('DS_PREVIEW_PORTAL_BUTTON_SCOPE', 'Button scope')}>
            <Inside where='portal' />
          </PortalDemo>
        </Row>
      </ComponentScope>
    </Block>
  </Section>
)
