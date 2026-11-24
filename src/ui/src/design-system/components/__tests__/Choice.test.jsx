import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { getThemeCss } from '~/utils/themeCss'
import { themeBorderWidth, themeOpacity } from '~/utils/themeTokens'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { CheckboxGroup, RadioGroup } from '../Checkbox'
import { Choice } from '../Choice'

// jsdom does not compile Tailwind: these prove the classes, attributes, variables
// and behavior; how it looks is the preview page's assertions.
// (jsdom has no PointerEvent, which Base UI builds to click its hidden input)
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}
const theme = (id) => THEMES.find((entry) => entry.id === id).theme
const defaults = theme('defaults')
const draw = (element, current = defaults) => render(<ThemeProvider theme={current}>{element}</ThemeProvider>)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))
const themed = (components) => buildAppTheme(null, { version: 2, values: { components } })

const Single = ({ value = 'thin', onValueChange, ...choice }) => (
  <RadioGroup aria-label='Crust' value={value} onValueChange={onValueChange}>
    <Choice value='thin' title='Thin' secondary='+ $1.00' {...choice} />
    <Choice value='thick' title='Thick' />
    <Choice value='stuffed' title='Stuffed' disabled />
  </RadioGroup>
)

describe.each(['defaults', 'cafe', 'grill'])('Choice in %s', (id) => {
  const current = theme(id)

  it('writes components.choice (its selected state too) and the indicator\'s and the option\'s variables on the row', () => {
    const { getByRole } = draw(<Single />, current)
    const row = vars(getByRole('radio', { name: 'Thin' }))
    const choice = componentVars(current, 'choice', { variant: 'default', radius: 'md' })
    expect(Object.keys(choice)).toContain('--ui-choice-selected-background')
    expect(row).toMatchObject(choice)
    expect(row).toMatchObject(componentVars(current, 'radio'))
    expect(row['--ui-product-option-image-size']).toBe(componentVars(current, 'product_option')['--ui-product-option-image-size'])
    expect(row['--ui-product-option-price-color']).toBe(componentVars(current, 'product_option')['--ui-product-option-price-color'])
    expect(row['--ui-choice-muted-opacity']).toBe(themeOpacity(current, 'disabled'))
  })

  it('the border keeps its width in every state: the resting one\'s, else the selected one\'s', () => {
    const { getByRole } = draw(<Single />, current)
    const row = vars(getByRole('radio', { name: 'Thin' }))
    const { base, variants } = getThemeCss(current, 'choice')
    const selected = variants.default.states.selected.border
    const width = (base.border !== 'none' ? base.border : selected).split(' ')[0]
    // with a border of its own the resting look is it; without, the width is reserved, transparent
    expect(row['--ui-choice-rest-border']).toBe(base.border !== 'none' ? base.border : `${width} solid transparent`)
    expect(row['--ui-choice-chosen-border']).toBe(`${width} ${selected.slice(selected.indexOf(' ') + 1)}`)
  })
})

describe('Choice: a radio of a RadioGroup', () => {
  it('the whole row is the radio: named by its title, described by its secondary text', () => {
    const view = draw(<Single />)
    const row = view.getByRole('radio', { name: 'Thin' })
    expect(row.getAttribute('data-slot')).toBe('choice')
    expect(row.getAttribute('aria-labelledby')).toBe(view.container.querySelector('[data-slot=choice-title]').id)
    expect(view.getByRole('radio', { name: 'Thin', description: '+ $1.00' })).toBe(row)
    expect(view.getByRole('radio', { name: 'Thick' }).hasAttribute('aria-describedby')).toBe(false)
  })

  it('the group\'s value is the selection: aria-checked and data-checked, and a click changes it', () => {
    const onValueChange = vi.fn()
    const { getByRole } = draw(<Single onValueChange={onValueChange} />)
    expect(getByRole('radio', { name: 'Thin' }).getAttribute('aria-checked')).toBe('true')
    expect(getByRole('radio', { name: 'Thin' }).hasAttribute('data-checked')).toBe(true)
    expect(getByRole('radio', { name: 'Thick' }).hasAttribute('data-checked')).toBe(false)
    fireEvent.click(getByRole('radio', { name: 'Thick' }))
    expect(onValueChange).toHaveBeenCalledWith('thick', expect.anything())
  })

  it('the arrows move the focus along the group and skip a disabled option', async () => {
    const { getByRole } = draw(<Single />)
    const press = async (key) => { await act(async () => { fireEvent.keyDown(document.activeElement, { key }) }) }
    getByRole('radio', { name: 'Thin' }).focus()
    await press('ArrowDown')
    expect(document.activeElement).toBe(getByRole('radio', { name: 'Thick' }))
    await press('ArrowDown')
    expect(document.activeElement).toBe(getByRole('radio', { name: 'Thin' }))
  })

  it('in a right-to-left store the arrows follow the eye (the group is Base UI\'s radio group)', async () => {
    const Three = () => (
      <RadioGroup aria-label='Crust' defaultValue='a'>
        <Choice value='a' title='A' />
        <Choice value='b' title='B' />
        <Choice value='c' title='C' />
      </RadioGroup>
    )
    const { getByRole } = draw(<Three />, { ...defaults, rtl: true })
    const press = async (key) => { await act(async () => { fireEvent.keyDown(document.activeElement, { key }) }) }
    getByRole('radio', { name: 'A' }).focus()
    await press('ArrowLeft')
    expect(document.activeElement).toBe(getByRole('radio', { name: 'B' }))
    await press('ArrowRight')
    expect(document.activeElement).toBe(getByRole('radio', { name: 'A' }))
  })

  it('`aria-label` names it instead of the title', () => {
    const { getByRole } = draw(<RadioGroup aria-label='g' defaultValue='a'><Choice value='a' title='Thin' aria-label='Thin crust' /></RadioGroup>)
    expect(getByRole('radio', { name: 'Thin crust' }).hasAttribute('aria-labelledby')).toBe(false)
  })
})

describe('Choice: a check of a CheckboxGroup, or alone', () => {
  it('is a checkbox row that toggles with the pointer and Space and reports the group\'s values', () => {
    const onValueChange = vi.fn()
    const { getByRole } = draw(
      <CheckboxGroup aria-label='Extras' value={['olives']} onValueChange={onValueChange}>
        <Choice type='check' value='olives' title='Olives' secondary='+ $0.50' />
        <Choice type='check' value='cheese' title='Cheese' />
      </CheckboxGroup>
    )
    expect(getByRole('checkbox', { name: 'Olives', description: '+ $0.50' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(getByRole('checkbox', { name: 'Cheese' }))
    expect(onValueChange).toHaveBeenCalledWith(['olives', 'cheese'], expect.anything())
    fireEvent.keyUp(getByRole('checkbox', { name: 'Olives' }), { key: ' ' })
    expect(onValueChange).toHaveBeenLastCalledWith([], expect.anything())
  })

  it('alone it takes `checked` and `onCheckedChange`', () => {
    const onCheckedChange = vi.fn()
    const { getByRole } = draw(<Choice type='check' title='Gift wrap' checked onCheckedChange={onCheckedChange} />)
    expect(getByRole('checkbox').getAttribute('aria-checked')).toBe('true')
    fireEvent.click(getByRole('checkbox'))
    expect(onCheckedChange).toHaveBeenCalledWith(false, expect.anything())
  })
})

describe('Choice: what is drawn', () => {
  it('reads every value from a variable: no literal in its classes; every state falls back to the resting look', () => {
    const { getByRole } = draw(<Single />)
    const classes = getByRole('radio', { name: 'Thin' }).getAttribute('class')
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+ms/i)
    expect(classes).toContain('ui:min-h-(--ui-choice-height)')
    expect(classes).toContain('ui:rounded-(--ui-choice-radius)')
    expect(classes).toContain('ui:[box-shadow:var(--ui-choice-shadow)]')
    expect(classes).toContain('ui:bg-(--ui-choice-background)')
    expect(classes).toContain('ui:not-data-checked:not-data-disabled:not-data-readonly:hover:bg-[color:var(--ui-choice-hover,var(--ui-choice-background))]')
    expect(classes).toContain('ui:data-checked:bg-[color:var(--ui-choice-selected-background,var(--ui-choice-background))]')
    expect(classes).toContain('ui:data-checked:[border:var(--ui-choice-chosen-border)]')
    expect(classes).toContain('ui:data-checked:text-[color:var(--ui-choice-selected-color,var(--ui-choice-color))]')
    expect(classes).toContain('ui:motion-safe:duration-(--ui-choice-motion-duration)')
  })

  it('is at least 44px high to touch on a phone or a coarse pointer, around the row', () => {
    const classes = draw(<Single />).getByRole('radio', { name: 'Thin' }).getAttribute('class')
    expect(classes).toContain('ui:max-mobile:after:min-h-[44px]')
    expect(classes).toContain('ui:pointer-coarse:after:min-h-[44px]')
  })

  it('shows the radio indicator of components.radio, a check indicator for a check, and none when the theme hides it', () => {
    const radio = draw(<Single />)
    expect(radio.container.querySelectorAll('[data-slot=choice-indicator] [data-slot=radio-mark]')).toHaveLength(3)
    radio.unmount()
    const check = draw(<Choice type='check' title='Olives' />)
    expect(check.container.querySelector('[data-slot=choice-indicator] [data-slot=checkbox-mark]')).toBeTruthy()
    check.unmount()
    const hidden = draw(<Single />, themed({ choice: { base: { show_indicator: false } } }))
    expect(hidden.container.querySelector('[data-slot=choice-indicator]')).toBeNull()
    // the row is still the control, selected by its background and border
    expect(hidden.getByRole('radio', { name: 'Thin' }).hasAttribute('data-checked')).toBe(true)
  })

  it('the secondary text takes the option\'s price style; the image is a box of the option\'s size, decoration', () => {
    const { container } = draw(<Single image='https://example.test/crust.jpg' />)
    const secondary = container.querySelector('[data-slot=choice-secondary]')
    expect(secondary.getAttribute('class')).toContain('ui:text-(--ui-product-option-price-color)')
    expect(secondary.getAttribute('class')).toContain('ui:text-(length:--ui-product-option-price-size)')
    const image = container.querySelector('[data-slot=choice-image]')
    expect(image.getAttribute('aria-hidden')).toBe('true')
    expect(image.getAttribute('class')).toContain('ui:size-(--ui-product-option-image-size)')
    expect(image.getAttribute('class')).toContain('ui:rounded-(--ui-product-option-image-radius)')
    expect(image.style.backgroundImage).toContain('https://example.test/crust.jpg')
  })

  it('`reserveImage` keeps an empty box for a row without an image; without either there is none', () => {
    const reserved = draw(<RadioGroup aria-label='g' defaultValue='a'><Choice value='a' title='A' reserveImage /></RadioGroup>)
    expect(reserved.container.querySelector('[data-slot=choice-image]')).toBeTruthy()
    expect(reserved.container.querySelector('[data-slot=choice-image]').style.backgroundImage).toBe('')
    reserved.unmount()
    const none = draw(<RadioGroup aria-label='g' defaultValue='a'><Choice value='a' title='A' /></RadioGroup>)
    expect(none.container.querySelector('[data-slot=choice-image]')).toBeNull()
  })

  it('`size` is the theme\'s minimum height of that size', () => {
    const { getByRole } = draw(<RadioGroup aria-label='g' defaultValue='a'><Choice value='a' title='A' size='lg' /></RadioGroup>)
    expect(vars(getByRole('radio'))['--ui-choice-height']).toBe(componentVars(defaults, 'choice', { size: 'lg' })['--ui-choice-height'])
    expect(vars(getByRole('radio'))['--ui-choice-height']).not.toBe(componentVars(defaults, 'choice', { size: 'sm' })['--ui-choice-height'])
  })

  it('a theme with no border at all still reserves the thin one, transparent', () => {
    const none = themed({ choice: { base: { border: null }, variants: { default: { states: { selected: { border: null } } } } } })
    const { getByRole } = draw(<Single />, none)
    const row = vars(getByRole('radio', { name: 'Thin' }))
    const reserved = `${themeBorderWidth(none, 'thin', { fixed: true })} solid transparent`
    expect(row['--ui-choice-rest-border']).toBe(reserved)
    expect(row['--ui-choice-chosen-border']).toBe(reserved)
  })

  it('inside a group\'s scope it reads the group\'s choice, radio and checkbox', () => {
    const own = themed({ product_option: { scope: { choice: { base: { radius: 3 } }, radio: { base: { size: 28 } } } } })
    const { getByTestId } = draw(
      <>
        <RadioGroup aria-label='a' defaultValue='x'><Choice value='x' title='X' data-testid='global' /></RadioGroup>
        <ComponentScope group='product_option'><RadioGroup aria-label='b' defaultValue='y'><Choice value='y' title='Y' data-testid='scoped' /></RadioGroup></ComponentScope>
      </>,
      own
    )
    expect(vars(getByTestId('scoped'))).toMatchObject({ '--ui-choice-radius': '3px', '--ui-radio-size': '28px' })
    expect(vars(getByTestId('global'))['--ui-choice-radius']).toBe(componentVars(own, 'choice', { radius: 'md' })['--ui-choice-radius'])
  })
})

describe('Choice: states', () => {
  it('disabled does not select, says so, and the row dims by the choice\'s own opacity', () => {
    const onValueChange = vi.fn()
    const { getByRole } = draw(<Single onValueChange={onValueChange} />)
    const stuffed = getByRole('radio', { name: 'Stuffed' })
    fireEvent.click(stuffed)
    expect(onValueChange).not.toHaveBeenCalled()
    expect(stuffed.getAttribute('aria-disabled')).toBe('true')
    expect(stuffed.getAttribute('class')).toContain('ui:data-disabled:opacity-(--ui-choice-disabled-opacity)')
    expect(stuffed.getAttribute('class')).toContain('ui:data-disabled:cursor-not-allowed')
    expect(vars(stuffed)['--ui-choice-disabled-opacity']).toBe(componentVars(defaults, 'choice', { variant: 'default' })['--ui-choice-disabled-opacity'])
  })

  it('unavailable keeps the row\'s look and dims only the indicator and the secondary text', () => {
    const view = draw(<RadioGroup aria-label='g' defaultValue='a'><Choice value='a' title='A' secondary='+ $1' disabled unavailable /></RadioGroup>)
    const row = view.getByRole('radio')
    expect(row.getAttribute('class')).not.toContain('ui:data-disabled:opacity')
    expect(row.getAttribute('aria-disabled')).toBe('true')
    expect(view.container.querySelector('[data-slot=choice-indicator]').getAttribute('class')).toContain('ui:opacity-(--ui-choice-muted-opacity)')
    expect(view.container.querySelector('[data-slot=choice-secondary]').getAttribute('class')).toContain('ui:opacity-(--ui-choice-muted-opacity)')
  })

  it('read only keeps the selection, takes no change and has no hover look', () => {
    const onValueChange = vi.fn()
    const { getByRole } = draw(<RadioGroup aria-label='g' value='a' onValueChange={onValueChange}><Choice value='a' title='A' readOnly /><Choice value='b' title='B' readOnly /></RadioGroup>)
    fireEvent.click(getByRole('radio', { name: 'B' }))
    expect(onValueChange).not.toHaveBeenCalled()
    expect(getByRole('radio', { name: 'A' }).getAttribute('aria-checked')).toBe('true')
    expect(getByRole('radio', { name: 'B' }).hasAttribute('data-readonly')).toBe(true)
  })
})

describe('Choice: the `end` slot', () => {
  const Row = ({ end, onCheckedChange }) => <Choice type='check' title='Olives' checked={false} onCheckedChange={onCheckedChange} end={end} />

  it('paints its content at the end of the row, in the row, and names the row without it', () => {
    const { getByRole, getByText } = draw(<Row end={<button type='button'>More</button>} />)
    const row = getByRole('checkbox', { name: 'Olives' })
    expect(row.querySelector('[data-slot=choice-end]')).toContainElement(getByText('More'))
    expect(row.lastElementChild).toBe(row.querySelector('[data-slot=choice-end]'))
    // the row wraps when its content does not fit, and the slot's items sit above the touch area
    expect(row.getAttribute('class')).toContain('ui:flex-wrap')
    expect(row.querySelector('[data-slot=choice-end]').getAttribute('class')).toContain('ui:[&>*]:z-[1]')
  })

  it('a click, a key or a press inside it does not toggle the row', () => {
    const onCheckedChange = vi.fn()
    const { getByRole } = draw(<Row onCheckedChange={onCheckedChange} end={<button type='button'>More</button>} />)
    const button = getByRole('button', { name: 'More' })
    fireEvent.pointerDown(button)
    fireEvent.mouseDown(button)
    fireEvent.pointerUp(button)
    fireEvent.mouseUp(button)
    fireEvent.click(button)
    fireEvent.keyDown(button, { key: 'Enter' })
    fireEvent.keyUp(button, { key: 'Enter' })
    fireEvent.keyDown(button, { key: ' ' })
    fireEvent.keyUp(button, { key: ' ' })
    expect(onCheckedChange).not.toHaveBeenCalled()
    // the row itself still toggles
    fireEvent.click(getByRole('checkbox', { name: 'Olives' }))
    expect(onCheckedChange).toHaveBeenCalledTimes(1)
  })

  it('its buttons are 44 px high and wide on a phone and with a coarse pointer', () => {
    const { getByRole } = draw(<Row end={<button type='button'>More</button>} />)
    const classes = getByRole('checkbox').querySelector('[data-slot=choice-end]').getAttribute('class')
    expect(classes).toContain('ui:max-mobile:[&_button]:min-h-[44px]!')
    expect(classes).toContain('ui:max-mobile:[&_button]:min-w-[44px]!')
    expect(classes).toContain('ui:pointer-coarse:[&_button]:min-h-[44px]!')
    expect(classes).toContain('ui:pointer-coarse:[&_button]:min-w-[44px]!')
  })

  it('without it the row is as it was: no slot, no wrap, the text grows', () => {
    const { getByRole } = draw(<Row />)
    const row = getByRole('checkbox')
    expect(row.querySelector('[data-slot=choice-end]')).toBeNull()
    expect(row.getAttribute('class')).not.toContain('ui:flex-wrap')
    expect(row.querySelector('[data-slot=choice-text]').getAttribute('class')).toContain('ui:flex-1')
    expect(row.querySelector('[data-slot=choice-text]').getAttribute('class')).not.toContain('flex-[1_1_auto]')
  })
})
