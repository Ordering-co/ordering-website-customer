import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { themeColor } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeOpacity } from '~/utils/themeTokens'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { Checkbox, CheckboxGroup, Radio, RadioGroup } from '../Checkbox'

// jsdom does not compile Tailwind: these prove the classes, attributes, variables
// and behavior; how it looks is the preview page's assertions.
// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}
const theme = (id) => THEMES.find((entry) => entry.id === id).theme
const defaults = theme('defaults')
const draw = (element, current = defaults) => render(<ThemeProvider theme={current}>{element}</ThemeProvider>)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))
const themed = (components) => buildAppTheme(null, { version: 2, values: { components } })

describe.each(['defaults', 'cafe', 'grill'])('Checkbox in %s', (id) => {
  const current = theme(id)

  it('is a checkbox that writes components.checkbox and the disabled opacity on its own element', () => {
    const { getByRole } = draw(<Checkbox aria-label='Accept' />, current)
    const box = getByRole('checkbox')
    expect(box.getAttribute('data-slot')).toBe('checkbox')
    expect(vars(box)).toEqual({ ...componentVars(current, 'checkbox'), '--ui-checkbox-disabled-opacity': themeOpacity(current, 'disabled') })
  })

  it('its radio writes components.radio', () => {
    const { getByRole } = draw(<RadioGroup><Radio value='a' aria-label='A' /></RadioGroup>, current)
    expect(vars(getByRole('radio'))).toEqual({ ...componentVars(current, 'radio'), '--ui-radio-disabled-opacity': themeOpacity(current, 'disabled') })
  })
})

describe('Checkbox', () => {
  it('reads every value from a variable: no literal in its classes', () => {
    const { getByRole, container } = draw(<Checkbox aria-label='Accept' invalid />)
    const classes = [getByRole('checkbox'), container.querySelector('[data-slot=checkbox-mark]')].map((el) => el.getAttribute('class')).join(' ')
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+ms/i)
    expect(classes).toContain('ui:size-(--ui-checkbox-size)')
    expect(classes).toContain('ui:[border:var(--ui-checkbox-border)]')
    expect(classes).toContain('ui:in-data-checked:bg-(--ui-checkbox-checked)')
    expect(classes).toContain('ui:motion-safe:duration-(--ui-checkbox-motion-duration)')
    // the corners are an eighth of the size, as the legacy icon's (no radius in the theme)
    expect(classes).toContain('ui:rounded-[calc(var(--ui-checkbox-size)/8)]')
  })

  it('toggles with the pointer and with Space, and says so', () => {
    const onCheckedChange = vi.fn()
    const { getByRole } = draw(<Checkbox aria-label='Accept' onCheckedChange={onCheckedChange} />)
    const box = getByRole('checkbox')
    expect(box.getAttribute('aria-checked')).toBe('false')
    expect(box.hasAttribute('data-checked')).toBe(false)
    fireEvent.click(box)
    expect(box.getAttribute('aria-checked')).toBe('true')
    expect(box.hasAttribute('data-checked')).toBe(true)
    expect(onCheckedChange).toHaveBeenLastCalledWith(true, expect.anything())
    fireEvent.keyUp(box, { key: ' ' })
    expect(onCheckedChange).toHaveBeenLastCalledWith(false, expect.anything())
    expect(box.tabIndex).toBe(0)
  })

  it('is controlled by `checked`', () => {
    const { getByRole } = draw(<Checkbox aria-label='Accept' checked onCheckedChange={() => {}} />)
    expect(getByRole('checkbox').getAttribute('aria-checked')).toBe('true')
  })

  it('draws the check always and shows it with the state; it is decoration', () => {
    const { container } = draw(<Checkbox aria-label='Accept' />)
    const mark = container.querySelector('[data-slot=checkbox-mark]')
    expect(mark.getAttribute('aria-hidden')).toBe('true')
    expect(mark.querySelector('svg').getAttribute('class')).toContain('ui:in-data-checked:visible')
  })

  it('a label is the name and one hit area: its text toggles; className and style go to the label', () => {
    const onCheckedChange = vi.fn()
    const { getByRole, getByText, container } = draw(<Checkbox label='I agree' className='ui:max-w-full' style={{ margin: '1px' }} onCheckedChange={onCheckedChange} />)
    const label = container.querySelector('[data-slot=control-label]')
    expect(getByRole('checkbox', { name: 'I agree' })).toBeTruthy()
    expect(label.getAttribute('class')).toContain('ui:max-w-full')
    expect(label.style.margin).toBe('1px')
    expect(getByRole('checkbox').getAttribute('class')).not.toContain('ui:max-w-full')
    fireEvent.click(getByText('I agree'))
    expect(onCheckedChange).toHaveBeenCalledTimes(1)
    expect(getByRole('checkbox').getAttribute('aria-checked')).toBe('true')
  })

  it('an outside <label htmlFor> names it through `id` (and `inputRef` reaches the hidden input)', () => {
    const inputRef = React.createRef()
    const { getByRole } = draw(<><Checkbox id='terms' inputRef={inputRef} name='terms' /><label htmlFor='terms'>Terms</label></>)
    expect(getByRole('checkbox', { name: 'Terms' })).toBeTruthy()
    expect(inputRef.current.tagName).toBe('INPUT')
    expect(inputRef.current.getAttribute('name')).toBe('terms')
  })

  it('the touch target is at least 44px on a phone or a coarse pointer: around the box, or around the label with one', () => {
    const alone = draw(<Checkbox aria-label='Accept' />)
    expect(alone.getByRole('checkbox').getAttribute('class')).toContain('ui:max-mobile:after:min-h-[44px]')
    expect(alone.getByRole('checkbox').getAttribute('class')).toContain('ui:pointer-coarse:after:min-w-[44px]')
    alone.unmount()
    const labelled = draw(<Checkbox label='Accept' />)
    const label = labelled.container.querySelector('[data-slot=control-label]')
    expect(label.getAttribute('class')).toContain('ui:pointer-coarse:after:min-h-[44px]')
    expect(label.getAttribute('class')).toContain('ui:max-mobile:after:min-w-[44px]')
    expect(labelled.getByRole('checkbox').getAttribute('class')).not.toContain('after:min-h')
  })
})

describe('Checkbox: states', () => {
  it('disabled does not toggle, says so and dims by the theme\'s opacity', () => {
    const onCheckedChange = vi.fn()
    const { getByRole } = draw(<Checkbox aria-label='Accept' disabled onCheckedChange={onCheckedChange} />)
    const box = getByRole('checkbox')
    fireEvent.click(box)
    expect(onCheckedChange).not.toHaveBeenCalled()
    expect(box.getAttribute('aria-disabled')).toBe('true')
    expect(box.hasAttribute('data-disabled')).toBe(true)
    expect(box.getAttribute('class')).toContain('ui:data-disabled:opacity-(--ui-checkbox-disabled-opacity)')
    expect(box.getAttribute('class')).toContain('ui:data-disabled:cursor-not-allowed')
  })

  it('invalid is aria-invalid and the danger border while unchecked; valid says nothing', () => {
    const invalid = draw(<><Checkbox aria-label='Accept' invalid aria-describedby='why' /><p id='why'>You must accept</p></>)
    expect(invalid.getByRole('checkbox').getAttribute('aria-invalid')).toBe('true')
    expect(invalid.getByRole('checkbox').getAttribute('aria-describedby')).toBe('why')
    expect(invalid.container.querySelector('[data-slot=checkbox-mark]').getAttribute('class')).toContain('ui:in-data-unchecked:border-destructive')
    invalid.unmount()
    const valid = draw(<Checkbox aria-label='Accept' />)
    expect(valid.getByRole('checkbox').hasAttribute('aria-invalid')).toBe(false)
    expect(valid.container.querySelector('[data-slot=checkbox-mark]').getAttribute('class')).not.toContain('destructive')
  })

  it('a theme with no border on the checkbox draws it in border_strong, as the legacy icon did', () => {
    const none = themed({ checkbox: { base: { border: null } } })
    const { getByRole } = draw(<Checkbox aria-label='Accept' />, none)
    expect(vars(getByRole('checkbox'))['--ui-checkbox-border']).toBe(`${themeBorderWidth(none, 'thin', { fixed: true })} ${themeBorderStyle(none)} ${themeColor(none, 'border_strong')}`)
  })

  it('a store\'s own size, border and checked color come through', () => {
    const own = themed({ checkbox: { base: { size: 26, checked: '#123456', border: { width: 2, color: '#654321', style: 'dashed' } } } })
    const { getByRole } = draw(<Checkbox aria-label='Accept' />, own)
    expect(vars(getByRole('checkbox'))).toMatchObject({ '--ui-checkbox-size': '26px', '--ui-checkbox-checked': '#123456', '--ui-checkbox-border': '2px dashed #654321' })
  })

  it('inside a group\'s scope it reads the group\'s checkbox', () => {
    const own = themed({ product_option: { scope: { checkbox: { base: { size: 28 } } } } })
    const { getByTestId } = draw(<><Checkbox aria-label='A' data-testid='global' /><ComponentScope group='product_option'><Checkbox aria-label='B' data-testid='scoped' /></ComponentScope></>, own)
    expect(getByTestId('scoped').style.getPropertyValue('--ui-checkbox-size')).toBe('28px')
    expect(getByTestId('global').style.getPropertyValue('--ui-checkbox-size')).toBe(componentVars(own, 'checkbox')['--ui-checkbox-size'])
  })
})

describe('CheckboxGroup', () => {
  it('holds the values checked and reports a change', () => {
    const onValueChange = vi.fn()
    const { getByRole } = draw(
      <CheckboxGroup value={['a']} onValueChange={onValueChange} aria-label='Toppings'>
        <Checkbox value='a' label='Cheese' />
        <Checkbox value='b' label='Olives' />
      </CheckboxGroup>
    )
    expect(getByRole('checkbox', { name: 'Cheese' }).getAttribute('aria-checked')).toBe('true')
    expect(getByRole('checkbox', { name: 'Olives' }).getAttribute('aria-checked')).toBe('false')
    fireEvent.click(getByRole('checkbox', { name: 'Olives' }))
    expect(onValueChange).toHaveBeenCalledWith(['a', 'b'], expect.anything())
    expect(getByRole('group', { name: 'Toppings' }).getAttribute('data-slot')).toBe('checkbox-group')
  })
})

describe('Radio', () => {
  const Group = (props) => (
    <RadioGroup aria-label='Size' defaultValue='m' {...props}>
      <Radio value='s' label='Small' />
      <Radio value='m' label='Medium' />
      <Radio value='l' label='Large' disabled />
    </RadioGroup>
  )

  it('is a radio in a radiogroup, named by its label, selected by the group\'s value', () => {
    const { getByRole } = draw(<Group />)
    expect(getByRole('radiogroup', { name: 'Size' }).getAttribute('data-slot')).toBe('radio-group')
    expect(getByRole('radio', { name: 'Medium' }).getAttribute('aria-checked')).toBe('true')
    expect(getByRole('radio', { name: 'Small' }).getAttribute('aria-checked')).toBe('false')
    expect(getByRole('radio', { name: 'Large' }).getAttribute('aria-disabled')).toBe('true')
  })

  it('selects with the pointer', () => {
    const onValueChange = vi.fn()
    const { getByRole } = draw(<Group onValueChange={onValueChange} />)
    fireEvent.click(getByRole('radio', { name: 'Small' }))
    expect(onValueChange).toHaveBeenLastCalledWith('s', expect.anything())
    expect(getByRole('radio', { name: 'Small' }).getAttribute('aria-checked')).toBe('true')
  })

  it('the arrows move the focus along the group, skip the disabled radio and loop', async () => {
    const { getByRole } = draw(<Group />)
    const press = async (key) => { await act(async () => { fireEvent.keyDown(document.activeElement, { key }) }) }
    getByRole('radio', { name: 'Medium' }).focus()
    // the group is one tab stop: the one the focus is on
    await press('ArrowDown')
    expect(document.activeElement).toBe(getByRole('radio', { name: 'Small' }))
    expect(getByRole('radio', { name: 'Small' }).tabIndex).toBe(0)
    expect(getByRole('radio', { name: 'Medium' }).tabIndex).toBe(-1)
    await press('ArrowUp')
    expect(document.activeElement).toBe(getByRole('radio', { name: 'Medium' }))
  })

  it('in a right-to-left store the arrows follow the eye: Right goes to the previous radio, Left to the next', async () => {
    const rtl = { ...defaults, rtl: true }
    const Three = () => (
      <RadioGroup aria-label='Size' defaultValue='a'>
        <Radio value='a' label='A' />
        <Radio value='b' label='B' />
        <Radio value='c' label='C' />
      </RadioGroup>
    )
    const press = async (key) => { await act(async () => { fireEvent.keyDown(document.activeElement, { key }) }) }
    const ltr = draw(<Three />)
    ltr.getByRole('radio', { name: 'A' }).focus()
    await press('ArrowRight')
    expect(document.activeElement).toBe(ltr.getByRole('radio', { name: 'B' }))
    ltr.unmount()
    const flipped = draw(<Three />, rtl)
    flipped.getByRole('radio', { name: 'A' }).focus()
    await press('ArrowLeft')
    expect(document.activeElement).toBe(flipped.getByRole('radio', { name: 'B' }))
    await press('ArrowRight')
    expect(document.activeElement).toBe(flipped.getByRole('radio', { name: 'A' }))
  })

  it('a disabled radio does not take the pointer', () => {
    const onValueChange = vi.fn()
    const { getByRole } = draw(<Group onValueChange={onValueChange} />)
    fireEvent.click(getByRole('radio', { name: 'Large' }))
    expect(onValueChange).not.toHaveBeenCalled()
    expect(getByRole('radio', { name: 'Large' }).getAttribute('class')).toContain('ui:data-disabled:opacity-(--ui-radio-disabled-opacity)')
  })

  it('draws the ring and the dot from the theme\'s colors and size, as decoration, and 44px to touch', () => {
    const { container, getByRole } = draw(<Group />)
    const mark = container.querySelector('[data-slot=radio-mark]')
    expect(mark.getAttribute('aria-hidden')).toBe('true')
    expect(mark.getAttribute('class')).toContain('ui:size-(--ui-radio-size)')
    expect(mark.getAttribute('class')).toContain('ui:text-(--ui-radio-unchecked)')
    expect(mark.getAttribute('class')).toContain('ui:in-data-checked:text-(--ui-radio-checked)')
    expect(mark.querySelectorAll('svg')).toHaveLength(2)
    expect(container.querySelector('[data-slot=control-label]').getAttribute('class')).toContain('ui:pointer-coarse:after:min-h-[44px]')
    expect(getByRole('radio', { name: 'Small' }).getAttribute('class')).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+ms/i)
  })
})

describe('RadioGroup segmented / Radio appearance="segment"', () => {
  const Bar = ({ value = 'whole', onValueChange, ...group }) => (
    <RadioGroup segmented aria-label='Halves' value={value} onValueChange={onValueChange} {...group}>
      <Radio appearance='segment' value='left' icon={<svg data-testid='left-icon' />} label='Left' />
      <Radio appearance='segment' value='whole' icon={<svg />} label='Whole' />
      <Radio appearance='segment' value='right' label='Right' disabled />
    </RadioGroup>
  )

  describe.each(['defaults', 'cafe', 'grill'])('in %s', (id) => {
    const current = theme(id)

    it('the bar writes components.tabs (its variant and size); the capsules are radios that read it', () => {
      const { getByRole, getAllByRole } = draw(<Bar variant='pill' />, current)
      const bar = getByRole('radiogroup', { name: 'Halves' })
      expect(vars(bar)).toEqual(componentVars(current, 'tabs', { variant: 'pill', size: 'md' }))
      expect(bar.getAttribute('data-variant')).toBe('pill')
      expect(bar.getAttribute('class')).toContain('ui:h-(--ui-tabs-height)')
      expect(bar.getAttribute('class')).toContain('ui:gap-(--ui-tabs-gap)')
      const radios = getAllByRole('radio')
      expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false'])
      expect(radios[1].getAttribute('class')).toContain('ui:data-checked:bg-(--ui-tabs-active-background)')
      expect(radios[1].getAttribute('class')).toContain('ui:data-checked:text-(--ui-tabs-active)')
      // the capsule's look is the bar's variables, not its own
      expect(vars(radios[1])).toEqual({})
    })
  })

  it('a capsule shows its icon and its label and no radio mark; it is named by its label', () => {
    const { getByRole, container } = draw(<Bar />)
    const left = getByRole('radio', { name: 'Left' })
    expect(left.querySelector('[data-testid=left-icon]')).not.toBeNull()
    expect(left.querySelector('span').textContent).toBe('Left')
    expect(left.getAttribute('data-appearance')).toBe('segment')
    expect(container.querySelector('[data-slot=radio-mark]')).toBeNull()
  })

  it('the size and the variant are the caller\'s (a theme slot\'s): the height and the underline\'s line follow', () => {
    const small = draw(<Bar size='sm' variant='underline' />)
    const bar = small.getByRole('radiogroup')
    expect(bar.getAttribute('data-variant')).toBe('underline')
    expect(vars(bar)).toEqual(componentVars(defaults, 'tabs', { variant: 'underline', size: 'sm' }))
    expect(small.getAllByRole('radio')[0].getAttribute('class')).toContain('ui:data-checked:before:bg-(--ui-tabs-indicator)')
    small.unmount()
    const md = draw(<Bar variant='underline' />)
    expect(vars(md.getByRole('radiogroup'))['--ui-tabs-height']).not.toBe(vars(bar)['--ui-tabs-height'])
  })

  it('without a variant it is the theme\'s default style of the tabs; `group` takes the group\'s', () => {
    const own = themed({ tabs: { base: { variant: 'plain' } }, product_option: { scope: { tabs: { base: { variant: 'underline' } } } } })
    expect(draw(<Bar />, own).getByRole('radiogroup').getAttribute('data-variant')).toBe('plain')
    document.body.innerHTML = ''
    expect(draw(<Bar group='product_option' />, own).getByRole('radiogroup').getAttribute('data-variant')).toBe('underline')
  })

  it('a click and the arrows choose; a disabled capsule dims, says so and is skipped', async () => {
    const onValueChange = vi.fn()
    const { getByRole } = draw(<Bar onValueChange={onValueChange} />)
    fireEvent.click(getByRole('radio', { name: 'Left' }))
    expect(onValueChange).toHaveBeenLastCalledWith('left', expect.anything())
    const right = getByRole('radio', { name: 'Right' })
    expect(right.getAttribute('aria-disabled')).toBe('true')
    expect(right.getAttribute('class')).toContain('ui:data-disabled:opacity-(--ot-opacity-disabled)')
    fireEvent.click(right)
    expect(onValueChange).toHaveBeenCalledTimes(1)
    getByRole('radio', { name: 'Whole' }).focus()
    await act(async () => { fireEvent.keyDown(document.activeElement, { key: 'ArrowRight' }) })
    expect(document.activeElement).toBe(getByRole('radio', { name: 'Left' }))
  })

  // M3: a bar inside a capsule paints no box of its own, and keeps its size, inset and gap
  it('capsule: the bar paints no background nor shadow and its line is clear, and keeps its height, inset and gap', () => {
    const own = draw(<Bar />).getByRole('radiogroup').getAttribute('class')
    expect(own).toContain('ui:bg-(--ui-tabs-background)')
    expect(own).toContain('ui:[box-shadow:var(--ui-tabs-shadow)]')
    document.body.innerHTML = ''
    const inside = draw(<Bar capsule />).getByRole('radiogroup').getAttribute('class')
    expect(inside).not.toContain('ui:bg-(--ui-tabs-background)')
    expect(inside).not.toContain('--ui-tabs-shadow')
    expect(inside).toContain('ui:[border-color:transparent]!')
    ;['ui:h-(--ui-tabs-height)', 'ui:gap-(--ui-tabs-gap)', 'ui:p-(--ui-tabs-inset)', 'ui:[border:var(--ui-tabs-border)]'].forEach((name) => expect(inside).toContain(name))
  })

  // M1: choosing is deliberate
  it('activation="manual": the arrows only move the focus (in the order seen), Enter and Space choose', async () => {
    const onValueChange = vi.fn()
    const view = draw(<RadioGroup segmented aria-label='Halves' activation='manual' defaultValue='left' onValueChange={onValueChange}>
      <Radio appearance='segment' value='left' label='Left' />
      <Radio appearance='segment' value='whole' label='Whole' />
      <Radio appearance='segment' value='right' label='Right' />
    </RadioGroup>)
    const [left, whole, right] = view.getAllByRole('radio')
    left.focus()
    await act(async () => { fireEvent.keyDown(left, { key: 'ArrowRight' }) })
    expect(document.activeElement).toBe(whole)
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
    expect(onValueChange).not.toHaveBeenCalled()
    await act(async () => { fireEvent.keyDown(whole, { key: 'Enter' }) })
    expect(onValueChange).toHaveBeenLastCalledWith('whole', expect.anything())
    await act(async () => { fireEvent.keyDown(whole, { key: 'ArrowLeft' }) })
    expect(document.activeElement).toBe(left)
    right.focus()
    await act(async () => {
      fireEvent.keyDown(right, { key: ' ' })
      fireEvent.keyUp(right, { key: ' ' })
    })
    expect(onValueChange).toHaveBeenLastCalledWith('right', expect.anything())
    expect(onValueChange).toHaveBeenCalledTimes(2)
  })

  it('the touch target is 44 px on a phone and with a coarse pointer', () => {
    const classes = draw(<Bar />).getAllByRole('radio')[0].getAttribute('class')
    expect(classes).toContain('ui:max-mobile:after:min-h-[44px]')
    expect(classes).toContain('ui:pointer-coarse:after:min-h-[44px]')
  })

  it('without the props a radio group and a radio are what they were', () => {
    const { getByRole, container } = draw(<RadioGroup aria-label='Size' defaultValue='a'><Radio value='a' label='A' /></RadioGroup>)
    const group = getByRole('radiogroup')
    expect(group.getAttribute('data-variant')).toBeNull()
    expect(group.getAttribute('class')).toBeNull()
    expect(vars(group)).toEqual({})
    const radio = getByRole('radio')
    expect(radio.getAttribute('data-appearance')).toBeNull()
    expect(container.querySelector('[data-slot=radio-mark]')).not.toBeNull()
  })
})
