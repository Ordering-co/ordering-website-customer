import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { scopedTheme } from '~/utils/themeGroups'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { Textarea } from '../Textarea'

// jsdom does not compile Tailwind: these prove the classes, attributes, variables
// and behavior; how it looks is the preview page's assertions.
const [defaults, grill, cafe] = THEMES.map(({ theme }) => theme)
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))
const FIELD = { variant: 'default', radius: 'md' }
const border = { width: 1, color: '#123456', style: 'solid' }
const themed = (input) => buildAppTheme(null, { version: 2, values: { components: { input } } })

describe('Textarea', () => {
  it('is a native textarea with the piece\'s slot, three rows, and writes components.input on its own element', () => {
    const { getByRole } = draw(<Textarea placeholder='Notes' />)
    const area = getByRole('textbox')
    expect(area.tagName).toBe('TEXTAREA')
    expect(area.getAttribute('data-slot')).toBe('textarea')
    expect(area.getAttribute('rows')).toBe('3')
    expect(vars(area)).toEqual(componentVars(defaults, 'input', FIELD))
  })

  it.each([['grill', grill], ['cafe', cafe]])('%s: the field of its theme, the same variables as Input', (_, theme) => {
    const { getByRole } = draw(<Textarea />, theme)
    expect(vars(getByRole('textbox'))).toEqual(componentVars(theme, 'input', FIELD))
  })

  it('inside a group it is the group\'s field', () => {
    const scoped = buildAppTheme(null, { version: 2, values: { components: { auth_form: { scope: { input: { base: { padding_x: 3 } } } } } } })
    const { getByRole } = render(<ThemeProvider theme={scoped}><ComponentScope group='auth_form'><Textarea /></ComponentScope></ThemeProvider>)
    expect(vars(getByRole('textbox'))).toEqual(componentVars(scopedTheme(scoped, 'auth_form'), 'input', FIELD))
    expect(vars(getByRole('textbox'))['--ui-input-padding-x']).toBe('3px')
  })

  it('is Input\'s look, taller: a minimum of the field height, its side space on every side, no value in the classes', () => {
    const classes = draw(<Textarea />).getByRole('textbox').getAttribute('class')
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+ms/i)
    expect(classes).toContain('ui:min-h-(--ui-input-height)')
    expect(classes).toContain('ui:py-(--ui-input-padding-x)')
    expect(classes).toContain('ui:px-(--ui-input-padding-x)')
    expect(classes).toContain('ui:h-auto')
    expect(classes).not.toContain('ui:h-(--ui-input-height)')
    expect(classes).toContain('var(--ui-input-error-border,var(--ui-input-border))')
    expect(classes).toContain('ui:max-mobile:text-[length:max(var(--ui-input-text-size),var(--ui-field-min-text))]')
  })

  it('does not resize unless it is told to, as the legacy TextArea', () => {
    expect(draw(<Textarea />).getByRole('textbox').getAttribute('class')).toContain('ui:resize-none')
    const free = draw(<Textarea resize='vertical' rows={5} />, defaults).getAllByRole('textbox').pop()
    expect(free.getAttribute('class')).toContain('ui:resize-y')
    expect(free.getAttribute('class')).not.toContain('ui:resize-none')
    expect(free.getAttribute('rows')).toBe('5')
  })

  it('a theme that draws only a line under the field is a bottom border', () => {
    const area = draw(<Textarea />, themed({ base: { border_sides: 'bottom', border } })).getByRole('textbox')
    expect(area.getAttribute('class')).toContain('ui:[border-bottom:var(--ui-input-border)]')
    expect(area.getAttribute('class')).toContain('ui:rounded-b-none')
  })

  it('takes what a controlled field takes: value, onChange, name, maxLength and a ref to the textarea', () => {
    const ref = React.createRef()
    const onChange = vi.fn()
    const { getByRole } = draw(<Textarea ref={ref} value='Ring twice' onChange={onChange} name='comment' maxLength={250} />)
    const area = getByRole('textbox')
    expect(ref.current).toBe(area)
    expect(area.value).toBe('Ring twice')
    fireEvent.change(area, { target: { value: 'Ring once' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(area.getAttribute('name')).toBe('comment')
    expect(area.getAttribute('maxlength')).toBe('250')
  })

  it('invalid is aria-invalid and names its message; disabled and readOnly are the native ones', () => {
    const { getByTestId } = draw(
      <>
        <Textarea invalid aria-describedby='why' data-testid='i' />
        <p id='why'>Too long</p>
        <Textarea disabled data-testid='d' />
        <Textarea readOnly defaultValue='x' data-testid='r' />
        <Textarea data-testid='v' />
      </>
    )
    expect(getByTestId('i').getAttribute('aria-invalid')).toBe('true')
    expect(getByTestId('i').getAttribute('aria-describedby')).toBe('why')
    expect(getByTestId('v').hasAttribute('aria-invalid')).toBe(false)
    expect(getByTestId('d').disabled).toBe(true)
    expect(getByTestId('r').readOnly).toBe(true)
  })

  it('the caller\'s class and style win over the piece\'s', () => {
    const area = draw(<Textarea className='ui:rounded-none' style={{ margin: '1px' }} />).getByRole('textbox')
    expect(area.getAttribute('class')).toContain('ui:rounded-none')
    expect(area.getAttribute('class')).not.toContain('ui:rounded-(--ui-input-radius)')
    expect(area.style.margin).toBe('1px')
  })
})

it.each([['defaults', defaults], ['grill', grill]])('compact resizable uses two native rows without imposing the input height in %s', (name, theme) => {
  const area = draw(<Textarea variant='compact-resizable' />, theme).getByRole('textbox')
  expect(area.rows).toBe(2)
  expect(area.className).toContain('ui:resize-y')
  expect(area.className).toContain('ui:py-(--ui-input-padding-x)')
  expect(area.className).not.toContain('ui:min-h-(--ui-input-height)')
  expect(vars(area)).toMatchObject(componentVars(theme, 'input', FIELD))
})
