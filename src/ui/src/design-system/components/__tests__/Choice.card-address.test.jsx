import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { THEMES } from '../../preview/themes'
import { RadioGroup } from '../Checkbox'
import { Choice, ChoiceActions, ChoiceIndicator } from '../Choice'

const defaults = THEMES.find(({ id }) => id === 'defaults').theme
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const hidden = buildAppTheme(null, { version: 2, values: { components: { choice: { base: { show_indicator: false } } } } })
const borderless = buildAppTheme(null, { version: 2, values: { components: { choice: { base: { border: null }, variants: { default: { states: { selected: { border: null } } } } } } } })
const bordered = buildAppTheme(null, { version: 2, values: { components: { choice: { base: { border: { width: 3, style: 'solid', color: '#445566' } } } } } })

describe('Choice card-actions: what a card with actions of its own needs', () => {
  it('`hovered` paints the hover of an enabled, unselected row while the pointer is on its actions', () => {
    const { getByTestId } = draw(<Choice variant='card-actions' as='li' hovered data-testid='card' />)
    const card = getByTestId('card')
    expect(card).toHaveAttribute('data-hovered')
    expect(card.className).toContain('ui:fine-hover:not-data-checked:not-data-disabled:not-data-readonly:data-hovered:bg-[color:var(--ui-choice-hover,var(--ui-choice-background))]')
    expect(draw(<Choice variant='card-actions' data-testid='plain' />).getByTestId('plain')).not.toHaveAttribute('data-hovered')
  })

  it('`interactive={false}` keeps the arrow for a row that picks nothing', () => {
    const { getByTestId } = draw(<><Choice variant='card-actions' interactive={false} data-testid='still' /><Choice variant='card-actions' data-testid='live' /></>)
    expect(getByTestId('still').className).toContain('ui:cursor-default')
    expect(getByTestId('still').className).not.toContain('ui:cursor-pointer')
    expect(getByTestId('live').className).toContain('ui:cursor-pointer')
  })

  it('does not leak `hovered` or `interactive` to the element as unknown attributes', () => {
    const { getByTestId } = draw(<Choice variant='card-actions' hovered interactive={false} data-testid='card' />)
    expect(getByTestId('card')).not.toHaveAttribute('interactive')
    expect(getByTestId('card')).not.toHaveAttribute('hovered')
  })
})

describe('ChoiceIndicator: the radio mark, presentational', () => {
  it('draws the radio of components.radio from `checked`, with no radio role and hidden from assistive technology', () => {
    const { container, queryByRole } = draw(<ChoiceIndicator checked />)
    const slot = container.querySelector('[data-slot=choice-indicator]')
    expect(slot).toHaveAttribute('data-checked')
    expect(slot.style.getPropertyValue('--ui-radio-size')).toBe(defaults.css.components.radio.base.size)
    expect(slot.querySelector('[data-slot=radio-mark]')).toHaveAttribute('aria-hidden', 'true')
    expect(queryByRole('radio')).toBeNull()
    expect(draw(<ChoiceIndicator />).container.querySelector('[data-slot=choice-indicator]')).not.toHaveAttribute('data-checked')
  })

  it('shows what the theme\'s `show_indicator` says, and `indicator={false}` turns it off', () => {
    expect(draw(<ChoiceIndicator />, hidden).container.querySelector('[data-slot=choice-indicator]')).toBeNull()
    expect(draw(<ChoiceIndicator indicator={false} />).container.querySelector('[data-slot=choice-indicator]')).toBeNull()
  })

  it('without `checked` it leaves the state to the row around it (the mark reads its `data-checked`)', () => {
    const { getByTestId } = draw(<Choice variant='card-actions' as='li' selected data-testid='card'><ChoiceIndicator /></Choice>)
    const card = getByTestId('card')
    expect(card).toHaveAttribute('data-checked')
    const slot = card.querySelector('[data-slot=choice-indicator]')
    expect(slot).not.toHaveAttribute('data-checked')
    expect(slot.querySelector('[data-slot=radio-mark]').className).toContain('ui:in-data-checked:text-(--ui-radio-checked)')
  })
})

describe('ChoiceActions: the room of a row\'s actions, out of its radiogroup', () => {
  it('is the row\'s box: its padding and the room of its border, transparent, on the same rows', () => {
    const { getByTestId } = draw(<ChoiceActions as='div' data-testid='actions'><button>Edit</button></ChoiceActions>)
    const slot = getByTestId('actions')
    expect(slot).toHaveAttribute('data-slot', 'choice-actions')
    ;['ui:px-lg', 'ui:py-sm', 'ui:flex', 'ui:items-center', 'ui:justify-end', 'ui:self-stretch', 'ui:border-transparent', 'ui:border-solid', 'ui:[border-width:var(--ui-choice-border-width)]'].forEach((name) => expect(slot.className).toContain(name))
  })

  it.each([['defaults', defaults], ['bordered', bordered], ['borderless', borderless]])('the border room equals the row\'s in %s', (_, theme) => {
    const { getByTestId } = draw(<><Choice variant='card-actions' data-testid='row' /><ChoiceActions data-testid='actions' /></>, theme)
    const room = getByTestId('actions').style.getPropertyValue('--ui-choice-border-width')
    expect(room).toBe(getByTestId('row').style.getPropertyValue('--ui-choice-rest-border').split(' ')[0])
    expect(room).toMatch(/^[\d.]+(px)?$|^var\(/)
  })

  it('its buttons stay outside a radiogroup that holds only radios', () => {
    const { getByRole, getAllByRole } = draw(
      <div>
        <RadioGroup aria-label='Addresses' value='a'>
          <Choice value='a' title='Home' />
        </RadioGroup>
        <ChoiceActions><button type='button'>Edit</button></ChoiceActions>
      </div>
    )
    expect(getAllByRole('radio')).toHaveLength(1)
    expect(getByRole('radiogroup').contains(getByRole('button', { name: 'Edit' }))).toBe(false)
  })
})
