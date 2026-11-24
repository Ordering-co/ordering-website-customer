import React, { useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themePart, themeSpace, themeText } from '~/utils/themeTokens'
import { Icon } from '../../components/Icon'
import { Tabs, TabsContent, TabsList, TabsTrigger, slotTabsOptions } from '../../components/Tabs'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'

// The preview's own furniture (styled-components, painted from the theme); the
// tabs are the design system's.
const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  justify-items: start;
`

// a container narrower than its tabs: the bar scrolls inside it, the page does not
const Narrow = styled.div`
  box-sizing: border-box;
  width: ${({ theme }) => `calc(${themeSpace(theme, 'xxxl')} * 4)`};
  max-width: 100%;
`

// a phone's width (the control must fit a 320px screen)
const Phone = styled.div`
  box-sizing: border-box;
  width: ${({ theme }) => `calc(${themeSpace(theme, 'xxxl')} * 5)`};
  max-width: 100%;
`

const Panel = styled.p`
  margin: ${({ theme }) => themeSpace(theme, 'sm')} 0 0;
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'body')}
`

// The header's capsule is one surface with the look of the field: its tabs draw none of their own.
const Capsule = styled.div`
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  padding: 0 ${({ theme }) => themeSpace(theme, 'xs')};
  ${({ theme }) => themePart(theme, 'input', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius' })}
`

const STYLES = ['pill', 'underline', 'plain']
const SIZES = ['sm', 'md', 'lg']
const ORDER_TYPES = [['delivery', 'Delivery', 'truckDelivery'], ['pickup', 'Pickup', 'store'], ['eat_here', 'Eat here', 'user']]
const HALVES = [['left', 'Left half', 'circleHalf'], ['whole', 'Whole', 'circleFill'], ['right', 'Right half', 'circleHalf']]
const MANY = ['Pizzas', 'Burgers', 'Salads', 'Pasta', 'Sushi', 'Desserts', 'Drinks', 'Sides', 'Combos', 'Kids']

const Items = ({ items, flip }) => items.map(([value, label, icon]) => (
  <TabsTrigger key={value} value={value}>
    {icon && <Icon name={icon} style={flip && value === 'right' ? { transform: 'rotate(180deg)' } : undefined} />}
    {label}
  </TabsTrigger>
))

const WithPanels = ({ where, ...root }) => (
  <Tabs defaultValue='delivery' {...root}>
    <TabsList aria-label='Order type' data-testid={`tabs-${where}`}>
      <Items items={ORDER_TYPES} />
    </TabsList>
    <TabsContent value='delivery'><Panel>We bring it to your door.</Panel></TabsContent>
    <TabsContent value='pickup'><Panel>Ready in the store.</Panel></TabsContent>
    <TabsContent value='eat_here'><Panel>A table is waiting.</Panel></TabsContent>
  </Tabs>
)

const Halves = ({ where, ...root }) => {
  const [half, setHalf] = useState('whole')
  return (
    <Tabs value={half} onValueChange={setHalf} layout='fill' {...root}>
      <TabsList aria-label='Half' activateOnFocus data-testid={`halves-${where}`}>
        <Items items={HALVES} flip />
      </TabsList>
    </Tabs>
  )
}

const Many = ({ where }) => (
  <Tabs defaultValue='Pizzas'>
    <TabsList aria-label='Categories' data-testid={`scroll-${where}`}>
      {MANY.map((name) => <TabsTrigger key={name} value={name}>{name}</TabsTrigger>)}
    </TabsList>
  </Tabs>
)

// the header's tabs: the header group's own tabs and the order type slot's size and style
const HeaderCapsule = () => {
  const theme = useTheme()
  return (
    <Capsule data-testid='tabs-capsule'>
      <Tabs group='header' defaultValue='delivery' {...slotTabsOptions(theme, 'header', 'order_type')}>
        <TabsList aria-label='Order type' bare>
          <Items items={ORDER_TYPES.slice(0, 2)} />
        </TabsList>
      </Tabs>
    </Capsule>
  )
}

export const TabsSection = () => (
  <Section aria-labelledby='tabs-title'>
    <SectionTitle id='tabs-title'>Tabs</SectionTitle>
    <Note>
      The theme&apos;s tabs (<code>components.tabs</code>): the default style decides, and a screen can ask for another.
      Arrow keys move between tabs, Home and End go to the first and last, Enter or Space selects (the halves select as
      they move). Switch the theme above to see the pill, the underline and the plain style follow it. On a phone or with a touch screen each tab answers at least 44px: a scrolling bar grows to it, the halves keep their box and grow only the touch area.
    </Note>
    <Caption>As the theme gives it (its default style, with panels)</Caption>
    <WithPanels where='default' />
    <Caption>Each style at each size</Caption>
    <Stack>
      {STYLES.map((variant) => (
        <Row key={variant}>
          {SIZES.map((size) => (
            <Tabs key={size} variant={variant} size={size} defaultValue='delivery'>
              <TabsList aria-label={`${variant} ${size}`} data-testid={`tabs-${variant}-${size}`}>
                <Items items={ORDER_TYPES.slice(0, 2)} />
              </TabsList>
            </Tabs>
          ))}
        </Row>
      ))}
    </Stack>
    <Caption>A disabled tab and a text-only bar</Caption>
    <Tabs defaultValue='a'>
      <TabsList aria-label='With a disabled tab' data-testid='tabs-disabled'>
        <TabsTrigger value='a'>Open now</TabsTrigger>
        <TabsTrigger value='b' disabled>Closed</TabsTrigger>
        <TabsTrigger value='c'>Scheduled</TabsTrigger>
      </TabsList>
    </Tabs>
    <Caption>The pizza halves: a segmented control that shares its row and fits a phone (layout fill)</Caption>
    <Phone><Halves where='phone' size='sm' /></Phone>
    <Caption>Too many tabs for their container: the bar scrolls inside it, never the page (layout scroll)</Caption>
    <Narrow><Many where='narrow' /></Narrow>
    <Caption>The header&apos;s order type: the header group&apos;s tabs, the slot&apos;s size and style, no box of their own inside the field&apos;s capsule</Caption>
    <HeaderCapsule />
    <Caption>Asking for another style on a screen (underline, whatever the theme says)</Caption>
    <WithPanels where='asked' variant='underline' />
  </Section>
)
