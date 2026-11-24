import React, { useMemo, useState } from 'react'
import styled, { ThemeProvider, useTheme } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { themeSpace } from '~/utils/themeTokens'
import { CheckboxGroup, RadioGroup } from '../../components/Checkbox'
import { Choice, ChoiceActions, ChoiceIndicator } from '../../components/Choice'
import { Icon } from '../../components/Icon'
import { Caption, Note, Section, SectionTitle } from '../ui'

// The preview's own furniture (styled-components, painted from the theme); the
// options are the design system's. The group is plain: each layout is the screen's.
const Column = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  max-width: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 8);
`

// two columns, as the product modal's sheet design lays a group out
const Columns = styled(Column)`
  grid-template-columns: 1fr 1fr;
  max-width: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 12);
`

// A picture with no color of its own to write here: a plain SVG, in a data URL
const PICTURE = `data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><rect width='8' height='8' fill='tan'/><circle cx='4' cy='4' r='3' fill='peru'/></svg>")}`

// What a store may set on `components.choice` that the preview themes leave as they are:
// no indicator (the selection shows only in the row's background and border).
const withoutIndicator = (theme) => {
  const values = JSON.parse(JSON.stringify(theme.values))
  values.components.choice.base.show_indicator = false
  return { ...buildAppTheme(null, { version: 2, values }), platform: theme.platform }
}
const NoIndicator = ({ children }) => {
  const outer = useTheme()
  const theme = useMemo(() => withoutIndicator(outer), [outer])
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}

// The two layers of a list of cards with actions: the options, and over them the actions, on the same rows
const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: repeat(2, auto);
  max-width: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 8);
`
const Layer = styled.ul`
  display: grid;
  grid-column: 1;
  grid-row: 1 / -1;
  grid-template-rows: subgrid;
  margin: 0;
  padding: 0;
  list-style: none;
`
const ActionsLayer = styled(Layer).attrs({ as: 'div' })`
  pointer-events: none;
`

const Single = ({ where, layout: Layout = Column }) => {
  const [crust, setCrust] = useState('thin')
  return (
    <RadioGroup value={crust} onValueChange={setCrust} aria-label={`Crust ${where}`} data-testid={`choice-single-${where}`}>
      <Layout>
        <Choice value='thin' title='Thin' secondary='+ $1.00' data-testid={`${where}-thin`} />
        <Choice value='thick' title='Thick' data-testid={`${where}-thick`} />
        <Choice value='stuffed' title='Stuffed (disabled)' secondary='+ $2.50' disabled data-testid={`${where}-disabled`} />
        <Choice value='gluten' title='Gluten free (sold out)' secondary='+ $3.00' disabled unavailable data-testid={`${where}-unavailable`} />
      </Layout>
    </RadioGroup>
  )
}

const Multiple = ({ where }) => {
  const [extras, setExtras] = useState(['olives'])
  return (
    <CheckboxGroup value={extras} onValueChange={setExtras} aria-label={`Extras ${where}`} data-testid={`choice-multiple-${where}`}>
      <Column>
        <Choice type='check' value='olives' title='Olives' secondary='+ $0.50' image={PICTURE} data-testid={`${where}-olives`} />
        <Choice type='check' value='cheese' title='Extra cheese' secondary='+ $1.00' image={PICTURE} data-testid={`${where}-cheese`} />
        <Choice type='check' value='plain' title='A very long option name that wraps onto a second line to show the row grows' reserveImage data-testid={`${where}-long`} />
        <Choice type='check' value='closed' title='Closed (read only)' secondary='+ $1.00' image={PICTURE} readOnly unavailable data-testid={`${where}-readonly`} />
      </Column>
    </CheckboxGroup>
  )
}

// A list whose pick is an action (a dialog opens, the page reloads): the arrows do not select
const Actions = () => {
  const [method, setMethod] = useState('card')
  const [opened, setOpened] = useState(0)
  return (
    <Column data-testid='choice-action' role='group' aria-label='Payment method'>
      {[['card', 'Credit card', 'creditCard'], ['cash', 'Cash', 'walletCash']].map(([id, title, icon]) => (
        <Choice
          key={id}
          variant='action'
          selected={method === id}
          title={title}
          icon={<Icon name={icon} size='md' />}
          onClick={() => { setMethod(id); setOpened((count) => count + 1) }}
          data-testid={`action-${id}`}
        />
      ))}
      <Note data-testid='action-count'>{`Opened ${opened} times (also on the current one)`}</Note>
    </Column>
  )
}

// A balance: an icon, a title and the amount at the end; confirmed, it has nothing to tick
const Balance = () => {
  const [credits, setCredits] = useState(true)
  return (
    <CheckboxGroup value={credits ? ['cash'] : []} onValueChange={(value) => setCredits(value.includes('cash'))} aria-label='Wallets'>
      <Column data-testid='choice-balance'>
        <Choice type='check' value='cash' title='Pay with wallet credits' icon={<Icon name='walletCash' size='md' />} trailing='12 Wallet credits' data-testid='balance-cash' />
        <Choice type='check' value='points' title='Pay with loyalty points' icon={<Icon name='walletLoyalty' size='md' />} trailing='0 Points' disabled data-testid='balance-points' />
        <Choice type='check' value='confirmed' title='Wallet credits (confirmed)' icon={<Icon name='walletCash' size='md' />} trailing='12 Wallet credits' checked readOnly indicator={false} data-testid='balance-confirmed' />
      </Column>
    </CheckboxGroup>
  )
}

const Notifications = () => {
  const [news, setNews] = useState(true)
  return (
    <Column data-testid='choice-switch'>
      <Choice type='switch' title='News and offers by email' checked={news} onCheckedChange={setNews} data-testid='switch-news' />
      <Choice type='switch' title='Order updates by text message' defaultChecked={false} data-testid='switch-sms' />
      <Choice type='switch' title='Saving…' checked disabled onCheckedChange={() => {}} data-testid='switch-saving' />
    </Column>
  )
}

// A card whose radio is its text and whose actions are out of the radiogroup: on the same grid
// line, the row hovered while the pointer is on its actions
const Addresses = () => {
  const [hovered, setHovered] = useState(null)
  const [address, setAddress] = useState('home')
  return (
    <Grid data-testid='choice-card-actions'>
      <Layer role='radiogroup' aria-label='Addresses'>
        {[['home', '123 Main St'], ['work', '9 Elm Rd']].map(([id, text]) => (
          <Choice
            key={id}
            variant='card-actions'
            as='li'
            role='none'
            selected={address === id}
            hovered={hovered === id}
            onClick={() => setAddress(id)}
            data-testid={`address-${id}`}
          >
            <span role='radio' aria-checked={address === id} tabIndex={0} data-testid={`address-radio-${id}`} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <ChoiceIndicator checked={address === id} />
              <span>{text}</span>
            </span>
          </Choice>
        ))}
      </Layer>
      <ActionsLayer>
        {[['home', 'Edit home'], ['work', 'Edit work']].map(([id, label]) => (
          <ChoiceActions key={id} data-testid={`address-actions-${id}`} onMouseEnter={() => setHovered(id)} onMouseLeave={() => setHovered(null)}>
            <button type='button' aria-label={label} style={{ pointerEvents: 'auto' }}>{label}</button>
          </ChoiceActions>
        ))}
      </ActionsLayer>
    </Grid>
  )
}

export const ChoiceSection = () => (
  <Section aria-labelledby='choice-title'>
    <SectionTitle id='choice-title'>Choice</SectionTitle>
    <Note>
      An option of a group: the whole row is the radio or the check. Hover, tab to it for the keyboard ring and use
      the arrow keys in the single choice. Disabled dims the row; unavailable (sold out, closed) keeps the row and dims
      only its indicator and price.
    </Note>
    <Caption>Single choice, with the theme&apos;s indicator</Caption>
    <Single where='plain' />
    <Caption>Single choice in two columns</Caption>
    <Single where='columns' layout={Columns} />
    <Caption>Multiple choice, with images and a price</Caption>
    <Multiple where='plain' />
    <Caption>An action list: a click, Enter or Space acts, the arrows neither select nor move</Caption>
    <Actions />
    <Caption>A balance: an icon, the amount at the end, and a confirmed one with no indicator</Caption>
    <Balance />
    <Caption>A switch row: the whole row, text included, is the switch</Caption>
    <Notifications />
    <Caption>A card with actions out of its radiogroup: the indicator, and the hover while the pointer is on the actions</Caption>
    <Addresses />
    <Caption>Without the indicator (the selection is the background and border)</Caption>
    <NoIndicator>
      <Single where='bare' />
      <Multiple where='bare' />
    </NoIndicator>
  </Section>
)
