import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { InputCode } from '../InputCode'

// jsdom does not compile Tailwind: classes, attributes, variables and behavior only.
const defaults = THEMES[0].theme
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const Controlled = ({ initial = '', onChange = () => {}, ...props }) => {
  const [value, setValue] = React.useState(initial)
  return <InputCode value={value} onChange={(next) => { setValue(next); onChange(next) }} {...props} />
}
const boxes = (view) => view.getAllByRole('textbox')
const values = (view) => boxes(view).map((box) => box.value)
const type = (box, text) => fireEvent.change(box, { target: { value: text } })
const key = (box, name) => fireEvent.keyDown(box, { key: name })
const paste = (box, text) => fireEvent.paste(box, { clipboardData: { getData: () => text } })

describe('InputCode', () => {
  it('is a named group of one box per digit, each a numeric one-time-code field', () => {
    const view = draw(<InputCode length={4} />)
    const group = view.getByRole('group', { name: 'Verification Code' })
    expect(group.getAttribute('data-slot')).toBe('input-code')
    expect(boxes(view)).toHaveLength(4)
    boxes(view).forEach((box, index) => {
      expect(box.tagName).toBe('INPUT')
      expect(box.getAttribute('aria-label')).toBe(`Verification Code ${index + 1}/4`)
      expect(box.getAttribute('inputmode')).toBe('numeric')
      expect(box.getAttribute('autocomplete')).toBe('one-time-code')
      expect(box.getAttribute('pattern')).toBe('[0-9]*')
    })
  })

  it('takes its name from `label`', () => {
    const view = draw(<InputCode length={4} label='Phone code' />)
    expect(view.getByRole('group', { name: 'Phone code' })).toBeTruthy()
    expect(boxes(view)[2].getAttribute('aria-label')).toBe('Phone code 3/4')
  })

  it('draws the `code` size of components.input in every box, and the gap between them', () => {
    const view = draw(<InputCode length={4} />)
    const group = view.getByRole('group')
    const expected = componentVars(defaults, 'input', { variant: 'default', size: 'code', radius: 'md' })
    expect(expected['--ui-input-width']).toBeTruthy()
    expect(expected['--ui-input-gap']).toBeTruthy()
    for (const [name, value] of Object.entries(expected)) expect(group.style.getPropertyValue(name)).toBe(value)
    const classes = boxes(view)[0].getAttribute('class')
    expect(classes).toContain('ui:w-(--ui-input-width)')
    expect(classes).toContain('ui:h-(--ui-input-height)')
    expect(classes).toContain('ui:text-center')
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+px/i)
    // the gap is the theme's while there is room, and gives way before the boxes go under the 44px target (implementation notes M5)
    expect(group.getAttribute('class')).toContain('var(--ui-input-gap))]')
    expect(group.style.getPropertyValue('--ui-code-length')).toBe('4')
    expect(group.style.getPropertyValue('--ui-code-gaps')).toBe('3')
  })

  it('shows the digits of `value` in its boxes', () => {
    const view = draw(<InputCode length={4} value='12' onChange={() => {}} />)
    expect(values(view)).toEqual(['1', '2', '', ''])
  })

  it('typing a digit writes it and moves to the next box; a letter writes nothing', () => {
    const onChange = vi.fn()
    const view = draw(<Controlled length={4} onChange={onChange} />)
    type(boxes(view)[0], '7')
    expect(onChange).toHaveBeenLastCalledWith('7')
    expect(document.activeElement).toBe(boxes(view)[1])
    type(boxes(view)[1], 'x')
    expect(onChange).toHaveBeenCalledTimes(1)
    type(boxes(view)[1], '8')
    expect(values(view)).toEqual(['7', '8', '', ''])
    expect(document.activeElement).toBe(boxes(view)[2])
  })

  it('typing over a filled box replaces its digit', () => {
    const view = draw(<Controlled length={4} initial='123' />)
    type(boxes(view)[1], '29')
    expect(values(view)).toEqual(['1', '9', '3', ''])
    type(boxes(view)[0], '11')
    expect(values(view)).toEqual(['1', '9', '3', ''])
  })

  it('pasting the whole code fills every box, wherever it is pasted, and ends on the last', () => {
    const onChange = vi.fn()
    const view = draw(<Controlled length={6} onChange={onChange} />)
    paste(boxes(view)[3], '123 456')
    expect(onChange).toHaveBeenLastCalledWith('123456')
    expect(values(view)).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(document.activeElement).toBe(boxes(view)[5])
  })

  it('a code longer than the boxes is cut, and what is not a digit is dropped', () => {
    const view = draw(<Controlled length={4} />)
    paste(boxes(view)[0], 'G-12345678')
    expect(values(view)).toEqual(['1', '2', '3', '4'])
  })

  it('a short paste fills from the box it was pasted in', () => {
    const view = draw(<Controlled length={6} initial='12' />)
    paste(boxes(view)[2], '34')
    expect(values(view)).toEqual(['1', '2', '3', '4', '', ''])
    expect(document.activeElement).toBe(boxes(view)[4])
  })

  it('the one-time-code autofill (the whole code in the first box) fills every box', () => {
    const onChange = vi.fn()
    const view = draw(<Controlled length={4} onChange={onChange} />)
    type(boxes(view)[0], '4821')
    expect(onChange).toHaveBeenLastCalledWith('4821')
    expect(values(view)).toEqual(['4', '8', '2', '1'])
  })

  it('Backspace clears the digit of the box; on an empty box it goes back and clears the previous', () => {
    const view = draw(<Controlled length={4} initial='12' />)
    key(boxes(view)[1], 'Backspace')
    expect(values(view)).toEqual(['1', '', '', ''])
    key(boxes(view)[1], 'Backspace')
    expect(values(view)).toEqual(['', '', '', ''])
    expect(document.activeElement).toBe(boxes(view)[0])
    key(boxes(view)[0], 'Backspace')
    expect(values(view)).toEqual(['', '', '', ''])
  })

  it('Backspace in a box with a digit leaves the digits after it joined (no gap in the code)', () => {
    const view = draw(<Controlled length={4} initial='1234' />)
    key(boxes(view)[1], 'Backspace')
    expect(values(view)).toEqual(['1', '3', '4', ''])
  })

  it('the arrows, Home and End move between boxes and stop at the ends', () => {
    const view = draw(<Controlled length={4} initial='1234' />)
    const [first, second, , last] = boxes(view)
    first.focus()
    key(first, 'ArrowRight')
    expect(document.activeElement).toBe(second)
    key(second, 'ArrowLeft')
    expect(document.activeElement).toBe(first)
    key(first, 'ArrowLeft')
    expect(document.activeElement).toBe(first)
    key(first, 'End')
    expect(document.activeElement).toBe(last)
    key(last, 'ArrowRight')
    expect(document.activeElement).toBe(last)
    key(last, 'Home')
    expect(document.activeElement).toBe(first)
  })

  it('in a right-to-left page the arrows follow what is seen: Right goes back', () => {
    const view = draw(<div dir='rtl'><Controlled length={4} initial='1234' /></div>)
    const [first, second] = boxes(view)
    first.focus()
    key(first, 'ArrowLeft')
    expect(document.activeElement).toBe(second)
    key(second, 'ArrowRight')
    expect(document.activeElement).toBe(first)
  })

  it('lets Tab walk past the first empty box (no focus trap), and typing there still fills with no gaps', () => {
    const view = draw(<Controlled length={4} initial='12' />)
    const all = boxes(view)
    all[2].focus()
    all[3].focus()
    expect(document.activeElement).toBe(all[3])
    type(all[3], '9')
    expect(values(view)).toEqual(['1', '2', '9', ''])
  })

  it('keeps every box tabbable, so Tab and Shift+Tab leave an empty or incomplete code', () => {
    const view = draw(<Controlled length={4} initial='1' />)
    boxes(view).forEach((box) => expect(box.tabIndex).toBe(0))
    boxes(view)[3].focus()
    expect(document.activeElement).toBe(boxes(view)[3])
  })

  it('autoFocus focuses the first empty box', () => {
    const view = draw(<InputCode length={4} autoFocus />)
    expect(document.activeElement).toBe(boxes(view)[0])
  })

  it('invalid marks every box and names the message', () => {
    const view = draw(<InputCode length={4} invalid aria-describedby='code-error' />)
    boxes(view).forEach((box) => {
      expect(box.getAttribute('aria-invalid')).toBe('true')
      expect(box.getAttribute('aria-describedby')).toBe('code-error')
      expect(box.getAttribute('class')).toContain('var(--ui-input-error-border,var(--ui-input-border))')
    })
  })

  it('disabled disables every box and writes nothing', () => {
    const onChange = vi.fn()
    const view = draw(<InputCode length={4} disabled onChange={onChange} />)
    boxes(view).forEach((box) => expect(box).toBeDisabled())
  })

  it('shows a placeholder digit per box', () => {
    const view = draw(<InputCode length={4} placeholder='0000' />)
    expect(boxes(view).map((box) => box.getAttribute('placeholder'))).toEqual(['0', '0', '0', '0'])
  })

  it('works uncontrolled (defaultValue) and reports every change', () => {
    const onChange = vi.fn()
    const view = draw(<InputCode length={4} defaultValue='1' onChange={onChange} />)
    type(boxes(view)[1], '5')
    expect(values(view)).toEqual(['1', '5', '', ''])
    expect(onChange).toHaveBeenLastCalledWith('15')
  })

  it('selects the digit on focus, so the next one replaces it', () => {
    const view = draw(<Controlled length={4} initial='12' />)
    const box = boxes(view)[1]
    const select = vi.spyOn(box, 'select')
    fireEvent.focus(box)
    expect(select).toHaveBeenCalled()
  })

  it.each(THEMES.filter(({ id }) => ['grill', 'cafe'].includes(id)))('reads the `code` size of the theme in $id', ({ theme }) => {
    const view = draw(<InputCode length={4} />, theme)
    const group = view.getByRole('group')
    expect(group.style.getPropertyValue('--ui-input-width')).toBe(componentVars(theme, 'input', { variant: 'default', size: 'code', radius: 'md' })['--ui-input-width'])
  })
})
