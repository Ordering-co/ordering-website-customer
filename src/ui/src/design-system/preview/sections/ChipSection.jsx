import React, { useMemo, useState } from 'react'
import styled, { ThemeProvider, useTheme } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { themeSpace } from '~/utils/themeTokens'
import { Chip } from '../../components/Chip'
import { Icon } from '../../components/Icon'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'

// The preview's own furniture (styled-components, painted from the theme); the
// chips are the design system's.
const SIZES = ['sm', 'md', 'lg']

const Block = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

// A row of option groups that scrolls sideways (the product modal's `sheet` layout)
const Scroller = styled.div`
  display: flex;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  overflow-x: auto;
  max-width: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 5);
  padding-bottom: ${({ theme }) => themeSpace(theme, 'xs')};
`

// A list of steps, one under another (its `steps` layout): the container stretches the chips
const Steps = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  width: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 4);
`

// What a store may set on `components.chip` that the three preview themes leave null:
// a contour of its own, and a selected state with its own contour. The colors are the
// active theme's tokens, so they follow the theme switch.
const patchChip = (theme, patch) => {
  const values = JSON.parse(JSON.stringify(theme.values))
  patch(values.components.chip, values.tokens.color)
  return { ...buildAppTheme(null, { version: 2, values }), platform: theme.platform }
}
const outlined = (chip, color) => {
  chip.base.border = { width: 1, color: color.border_strong, style: 'solid' }
}
const outlinedBoth = (chip, color) => {
  outlined(chip, color)
  chip.variants.default.states.selected.border = { width: 1, color: color.text, style: 'solid' }
}

const Themed = ({ patch, children }) => {
  const outer = useTheme()
  const theme = useMemo(() => patchChip(outer, patch), [outer, patch])
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}

const Sizes = ({ where }) => (
  <Block>
    {SIZES.map((size) => (
      <Row key={size}>
        <Chip size={size} data-testid={`${where}-${size}`}>{size} resting</Chip>
        <Chip size={size} selected data-testid={`${where}-${size}-selected`}>{size} selected</Chip>
        <Chip size={size} disabled data-testid={`${where}-${size}-disabled`}>{size} disabled</Chip>
        <Chip size={size} selected disabled>{size} selected, disabled</Chip>
      </Row>
    ))}
  </Block>
)

const PRICES = ['$', '$$', '$$$', '$$$$']
const Filters = ({ where }) => {
  const [price, setPrice] = useState('$$')
  const [types, setTypes] = useState(['Pizza'])
  const toggle = (type) => setTypes((current) => (current.includes(type) ? current.filter((one) => one !== type) : [...current, type]))
  return (
    <Block>
      <Row data-testid={`${where}-price`}>
        {PRICES.map((one) => <Chip key={one} size='sm' selected={price === one} onClick={() => setPrice(one)}>{one}</Chip>)}
      </Row>
      <Row data-testid={`${where}-types`}>
        {['Pizza', 'Burgers', 'Sushi', 'Vegan'].map((type) => (
          <Chip key={type} selected={types.includes(type)} onClick={() => toggle(type)}>
            {type}{types.includes(type) && <Icon name='close' />}
          </Chip>
        ))}
        <Chip data-testid={`${where}-action`}>On my way</Chip>
      </Row>
    </Block>
  )
}

const Pages = () => {
  const [page, setPage] = useState(2)
  return (
    <Row>
      {[1, 2, 3, 4, 5].map((one) => <Chip key={one} size='sm' selected={page === one} onClick={() => setPage(one)} aria-label={`Page ${one}`}>{one}</Chip>)}
    </Row>
  )
}

const GROUPS = [['Sauce', 'complete'], ['Drink', 'missing'], ['Extras', 'complete'], ['Side', 'missing'], ['Dessert', undefined]]
const StatusChips = ({ where }) => {
  const [current, setCurrent] = useState('Drink')
  const chips = (extra) => GROUPS.map(([name, status]) => (
    <Chip key={name} size='sm' status={status} selected={current === name} onClick={() => setCurrent(name)} {...extra}>{name}</Chip>
  ))
  return (
    <Block>
      <Caption>A row that scrolls sideways</Caption>
      <Scroller data-testid={`${where}-scroller`}>{chips()}</Scroller>
      <Caption>A list of steps</Caption>
      <Steps data-testid={`${where}-steps`}>{chips()}</Steps>
      <Caption>Not picked, each status</Caption>
      <Row>
        <Chip status='complete' size='sm' data-testid={`${where}-complete`}>Sauce</Chip>
        <Chip status='missing' size='sm' data-testid={`${where}-missing`}>Drink</Chip>
        <Chip status='complete' size='sm' interactive={false}>Sauce (label)</Chip>
        <Chip status='missing' size='sm' interactive={false}>Drink (label)</Chip>
      </Row>
    </Block>
  )
}

const Contours = () => (
  <Block>
    <Chip size='sm'>Resting</Chip>
    <Chip size='sm' selected>Selected</Chip>
    <Chip size='sm' status='missing'>Status</Chip>
  </Block>
)

export const ChipSection = () => (
  <Section aria-labelledby='chip-title'>
    <SectionTitle id='chip-title'>Chip</SectionTitle>
    <Note>
      An option of a filter or a choice, a quick reply, a page number, a step of a form. A toggle says whether it is picked;
      an action does not. The look is the theme&apos;s; the layout is the container&apos;s. Press, tab and hover to see each state.
    </Note>
    <Caption>Sizes and states</Caption>
    <Sizes where='chip' />
    <Caption>As filters (a toggle with the × of a picked one) and as an action</Caption>
    <Filters where='chip' />
    <Caption>Page numbers</Caption>
    <Pages />
    <Caption>A label: not a button, no hover</Caption>
    <Row>
      <Chip interactive={false} data-testid='chip-label'>Open now</Chip>
      <Chip interactive={false} selected data-testid='chip-label-selected'>Free delivery</Chip>
    </Row>
    <Caption>The groups of the product modal, with their status</Caption>
    <StatusChips where='chip' />
    <Caption>With a border of its own</Caption>
    <Themed patch={outlined}><Contours /></Themed>
    <Caption>With a border of its own, and another when picked</Caption>
    <Themed patch={outlinedBoth}><Contours /></Themed>
  </Section>
)
