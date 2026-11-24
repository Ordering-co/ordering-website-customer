import React, { useState } from 'react'
import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeSpace } from '~/utils/themeTokens'
import { OrderIcon } from '~ui/src/components/AddressOrderType/OrderIcon'
import { MenuSurface } from '../../components/Menu'
import { PopoverArrow, PopoverPanel } from '../../components/Popover'
import { Radio, RadioGroup } from '../../components/Checkbox'
import { Select, SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValue } from '../../components/Select'
import { DateField } from '../../components/DateField'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/Tooltip'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'

// The preview's own furniture (styled-components, painted from the theme); the pieces are the design system's.
const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  max-width: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 8);
`

const Anchor = styled.div`
  position: relative;
  min-height: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 4);
  color: ${({ theme }) => themeColor(theme, 'text')};
`

// where the caller puts the box: under the field, as wide as it, its height capped (the box scrolls)
const Hang = styled.div`
  position: absolute;
  inset-inline: 0;
  top: 100%;
  display: flex;
  flex-direction: column;
  max-height: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 2);
`

const Text = styled.p`
  margin: 0;
  padding: ${({ theme }) => themeSpace(theme, 'md')};
`

const Row2 = styled.button`
  display: block;
  width: 100%;
  margin: 0;
  padding: ${({ theme }) => themeSpace(theme, 'sm')} ${({ theme }) => themeSpace(theme, 'md')};
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
`

const Cart = styled.div`
  position: relative;
  margin-top: ${({ theme }) => themeSpace(theme, 'xl')};
  background: ${({ theme }) => themeColor(theme, 'surface')};
`

const Pointed = styled.div`
  position: relative;
  margin-top: ${({ theme }) => themeSpace(theme, 'lg')};
  max-width: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 5);
`

const LANGUAGES = [
  { value: 'en', content: 'English', showOnSelected: 'EN' },
  { value: 'es', content: 'Español', showOnSelected: 'ES' },
  { value: 'pt', content: 'Português', showOnSelected: 'PT' }
]
const ORDER_TYPES = [
  { value: 'delivery', content: 'Delivery', icon: 'truckOutline' },
  { value: 'pickup', content: 'Pickup', icon: 'bag' }
]
const PICKUP = [
  { value: 2, name: 'Pickup', description: 'Ready for you to pick up', icon: 'bag' },
  { value: 3, name: 'Eat in', description: 'Sit down and eat at the store', icon: 'shop' },
  { value: 4, name: 'Curbside', description: 'We bring it out to your car', icon: 'carFront' }
]
const SUGGESTIONS = ['Main Street 12, Springfield', 'Main Avenue 340, Springfield', 'Main Square 1, Shelbyville', 'Main Road 7, Capital City', 'Main Lane 90, Ogdenville']

const LABELS = { previous: 'Previous month', next: 'Next month', month: 'Month', year: 'Year' }
const format = (date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

const Suggestions = () => (
  <Anchor data-testid='overlay-suggestions-anchor'>
    <Text>Main</Text>
    <Hang>
      <MenuSurface role='listbox' aria-label='Address suggestions' data-testid='overlay-menu-surface' style={{ minHeight: 0 }}>
        {SUGGESTIONS.map((text) => <Row2 key={text} type='button' role='option' aria-selected='false'>{text}</Row2>)}
      </MenuSurface>
    </Hang>
  </Anchor>
)

const RichBar = () => {
  const [type, setType] = useState('delivery')
  const [pickup, setPickup] = useState(2)
  const group = PICKUP.some((item) => item.value === pickup)
  const delivery = type === 'delivery'
  return (
    <RadioGroup segmented aria-label='Order type' value={delivery ? 'delivery' : ''} onValueChange={(value) => setType(value)} data-testid='overlay-segmented'>
      <Radio appearance='segment' value='delivery' data-testid='overlay-segment-delivery' icon={<OrderIcon name='truckOutline' />} label='Delivery' />
      <SelectRoot
        value={pickup}
        onValueChange={(value) => { setPickup(value); setType('pickup') }}
        items={PICKUP.map((item) => ({ value: item.value, label: <><OrderIcon name={item.icon} />{item.name}</> }))}
      >
        <SelectTrigger variant='segment' active={!delivery && group} aria-label='Pickup types' data-testid='overlay-segment-select'><SelectValue /></SelectTrigger>
        <SelectContent variant='rich' data-testid='overlay-rich-list'>
          {PICKUP.map((item) => (
            <SelectItem key={item.value} value={item.value} icon={<OrderIcon name={item.icon} />} description={item.description} indicator>{item.name}</SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
    </RadioGroup>
  )
}

const Dates = () => {
  const [date, setDate] = useState(null)
  return (
    <Stack>
      <DateField label='Birthdate' placeholder='Birthdate' value={date} onChange={setDate} format={format} labels={LABELS} data-testid='overlay-date' />
    </Stack>
  )
}

export const OverlaySection = () => {
  return (
    <Section aria-labelledby='overlay-title'>
      <SectionTitle id='overlay-title'>Layers and selection</SectionTitle>
      <Note>
        The boxes that hang from something else and the controls that choose from them: the menu box with no trigger,
        the tooltip, the select in the sizes a slot asks for, the rich list, a segment of the order-type bar that opens a
        list, the pointer of a popover and the date field. Each one reads the theme&apos;s component (menu, tooltip, input, tabs, calendar).
      </Note>
      <Caption>MenuSurface: the box and scrollbar of a list that hangs from a field (it scrolls when its height is capped)</Caption>
      <Stack><Suggestions /></Stack>
      <Caption>Tooltip: hover or focus the button; Escape or a press closes it</Caption>
      <Row>
        <Tooltip>
          <TooltipTrigger delay={0} data-testid='overlay-tooltip-trigger'>Connection status</TooltipTrigger>
          <TooltipContent data-testid='overlay-tooltip'>Verify the server connection by date and time. Need help? Contact our support team.</TooltipContent>
        </Tooltip>
      </Row>
      <Caption>Select: the language slot (a field of the slot&apos;s size; the code closed, the name in the list) and a cap in fluid units on narrow phones</Caption>
      <Row>
        <Select aria-label='Language' size='lg' options={LANGUAGES} defaultValue='en' data-testid='overlay-language' />
        <Select aria-label='Order type' narrowCap options={ORDER_TYPES.map(({ value, content }) => ({ value, content }))} defaultValue='delivery' data-testid='overlay-narrow' />
      </Row>
      <Caption>Select with a rich list inside a segmented bar (the order types)</Caption>
      <Stack><RichBar /></Stack>
      <Caption>PopoverArrow: the pointer of a panel that something else places (14 by 8, whatever the store&apos;s spacing)</Caption>
      <Pointed>
        <PopoverPanel variant='arrow' arrow={{ style: { insetInlineStart: '25%' } }} style={{ maxWidth: '100%' }} data-testid='overlay-arrow-panel'>
          <Text>Categories</Text>
        </PopoverPanel>
        <Cart>
          <PopoverArrow data-testid='overlay-arrow' background='var(--ot-color-surface)' style={{ insetInlineStart: '75%' }} />
          <Text>Another surface (the cart): the arrow takes its color</Text>
        </Cart>
      </Pointed>
      <Caption>DateField: the field of the theme that opens the theme&apos;s calendar</Caption>
      <Dates />
    </Section>
  )
}
