import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { Icon } from '../Icon'
import { Input } from '../Input'
import { Select } from '../Select'
import { Textarea } from '../Textarea'
import { fieldIcon } from '../../../styles/__tests__/themeTestUtils'

// jsdom does not compile Tailwind: these prove the classes, attributes, variables
// and behavior; how it looks is the preview page's assertions.
const defaults = THEMES[0].theme
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))
// the class of a piece drawn alone (several draws in one test would share the document)
const classOf = (element, theme = defaults, role = 'textbox') => {
  const view = draw(element, theme)
  const classes = view.getByRole(role).getAttribute('class')
  view.unmount()
  return classes
}
const border = { width: 1, color: '#123456', style: 'solid' }
const themed = (input) => buildAppTheme(null, { version: 2, values: { components: { input } } })

describe('Input', () => {
  it('is a native input with the piece\'s slot and writes components.input on its own element', () => {
    const { getByRole } = draw(<Input placeholder='Name' />)
    const input = getByRole('textbox')
    expect(input.tagName).toBe('INPUT')
    expect(input.getAttribute('data-slot')).toBe('input')
    expect(vars(input)).toEqual(componentVars(defaults, 'input', { variant: 'default', radius: 'md' }))
  })

  it.each(THEMES.filter(({ id }) => ['defaults', 'grill', 'cafe'].includes(id)))(
    'uses the theme control border in $id',
    ({ theme }) => {
      const { getByRole } = draw(<Input />, theme)
      expect(vars(getByRole('textbox'))['--ui-input-border']).toContain(theme.values.tokens.color.border_strong)
    }
  )

  it('honors an explicitly borderless field', () => {
    const { getByRole } = draw(<Input />, themed({ base: { border: null } }))
    expect(vars(getByRole('textbox'))['--ui-input-border']).toBe('none')
  })

  it('another theme gives another field', () => {
    const theme = themed({ base: { radius: 3, padding_x: 7, border }, variants: { default: { states: { focus: { border: { ...border, width: 2 } } } } } })
    const { getByRole } = draw(<Input />, theme)
    expect(vars(getByRole('textbox'))).toMatchObject({ '--ui-input-radius': '3px', '--ui-input-padding-x': '7px', '--ui-input-border': '1px solid #123456', '--ui-input-focus-border': '2px solid #123456' })
  })

  it('no value is written in its classes and every state falls back to the resting look', () => {
    const classes = classOf(<Input />)
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+ms/i)
    expect(classes).toContain('ui:h-(--ui-input-height)')
    expect(classes).toContain('var(--ui-input-error-border,var(--ui-input-border))')
    expect(classes).toContain('var(--ui-input-focus-border,var(--ui-input-border))')
    expect(classes).toContain('ui:motion-safe:duration-(--ui-input-motion-duration)')
    // never under 16px on a phone (iOS zooms the page into a smaller field)
    expect(classes).toContain('ui:max-mobile:text-[length:max(var(--ui-input-text-size),var(--ui-field-min-text))]')
  })

  it('takes what a controlled field takes: value, onChange, type, name and a ref to the input', () => {
    const ref = React.createRef()
    const onChange = vi.fn()
    const { getByRole } = draw(<Input ref={ref} value='Rosa' onChange={onChange} type='text' name='name' />)
    const input = getByRole('textbox')
    expect(ref.current).toBe(input)
    expect(input.value).toBe('Rosa')
    fireEvent.change(input, { target: { value: 'Rosalia' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(input.getAttribute('name')).toBe('name')
  })

  it('the caller\'s class wins over the piece\'s', () => {
    const input = draw(<Input className='ui:rounded-none' />).getByRole('textbox')
    expect(input.getAttribute('class')).toContain('ui:rounded-none')
    expect(input.getAttribute('class')).not.toContain('ui:rounded-(--ui-input-radius)')
  })
})

describe('Input: states', () => {
  it('invalid is aria-invalid and names its message; valid says nothing', () => {
    const { getByRole, getByText } = draw(
      <>
        <Input invalid aria-describedby='why' />
        <p id='why'>Enter a phone number</p>
      </>
    )
    const input = getByRole('textbox')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe('why')
    expect(getByText('Enter a phone number').id).toBe('why')
    expect((() => { const v = draw(<Input />); const r = v.getAllByRole('textbox').pop().hasAttribute('aria-invalid'); v.unmount(); return r })()).toBe(false)
  })

  it('disabled and readOnly are the native ones', () => {
    const { getByTestId } = draw(<><Input disabled data-testid='d' /><Input readOnly defaultValue='x' data-testid='r' /></>)
    expect(getByTestId('d').disabled).toBe(true)
    expect(getByTestId('r').readOnly).toBe(true)
    expect(getByTestId('d').style.getPropertyValue('--ui-input-disabled-background')).toBe('#F8F9FA')
  })

  it('a focus border unlike the resting one is the focus: no ring on top of it; otherwise the app\'s ring shows', () => {
    const own = themed({ base: { border }, variants: { default: { states: { focus: { border: { ...border, width: 2 } } } } } })
    expect(classOf(<Input />, own)).toContain('ui:not-aria-invalid:focus-visible:outline-none!')
    expect(classOf(<Input />, defaults)).not.toContain('outline-none!')
    // the same border as resting is not "its own"
    const same = themed({ base: { border }, variants: { default: { states: { focus: { border } } } } })
    expect(classOf(<Input />, same)).not.toContain('outline-none!')
  })

  it.each([{ ...border, width: 0 }, { ...border, color: 'transparent' }])(
    'keeps the keyboard ring with an invisible configured focus border (%j)',
    (focusBorder) => {
      const theme = themed({ base: { border }, variants: { default: { states: { focus: { border: focusBorder } } } } })
      expect(classOf(<Input />, theme)).not.toContain('outline-none!')
    }
  )

  it('a theme that draws only a line under the field is a bottom border with square bottom corners', () => {
    const line = classOf(<Input />, themed({ base: { border_sides: 'bottom', border } }))
    expect(line).toContain('ui:[border-bottom:var(--ui-input-border)]')
    expect(line).toContain('ui:rounded-b-none')
    expect(classOf(<Input />)).not.toContain('rounded-b-none')
  })
})

describe.each(['all', 'bottom'])('focus indicators with %s borders', (borderSides) => {
  it.each([
    ['zero width', { ...border, width: 0 }, false],
    ['transparent', { ...border, color: 'transparent' }, false],
    ['visible', { ...border, width: 2 }, true]
  ])('uses the same focus indicator for %s across field pieces and legacy rules', (_name, focusBorder, ownFocus) => {
    const theme = themed({
      base: { border, border_sides: borderSides },
      variants: { default: { states: { focus: { border: focusBorder } } } }
    })
    const { getByTestId } = draw(
      <>
        <Input invalid data-testid='input-focus' />
        <Textarea invalid data-testid='textarea-focus' />
        <Select invalid data-testid='select-focus' options={[{ value: 'a', content: 'A' }]} />
      </>, theme
    )
    for (const testId of ['input-focus', 'textarea-focus', 'select-focus']) {
      const field = getByTestId(testId)
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(field.className.includes('outline-none!')).toBe(ownFocus)
      expect(field.className).not.toMatch(/(?:^|\s)ui:focus-visible:outline-none!/)
      if (ownFocus) expect(field.className).toContain('ui:not-aria-invalid:focus-visible:outline-none!')
    }
  })
})

describe('mobile focus border overrides', () => {
  const themeForOverride = (override) => buildAppTheme(null, {
    version: 2,
    values: {
      components: {
        input: {
          base: { border },
          variants: { default: { states: { focus: { border: { ...border, color: '#646464' } } } } }
        }
      },
      platforms: { mobile_web: { components: { input: override } } }
    }
  })

  it.each([
    ['transparent', { ...border, color: 'transparent' }],
    ['zero width', { ...border, width: 0 }],
    ['explicit null', null]
  ])('retains the global ring for a %s mobile override', (_label, focusBorder) => {
    const theme = themeForOverride({ variants: { default: { states: { focus: { border: focusBorder } } } } })
    const phone = { ...theme, platform: 'mobile_web' }
    const { getByTestId } = draw(
      <>
        <Input data-testid='input-mobile' />
        <Textarea data-testid='textarea-mobile' />
        <Select data-testid='select-mobile' options={[{ value: 'a', content: 'A' }]} />
      </>, phone
    )
    for (const testId of ['input-mobile', 'textarea-mobile', 'select-mobile']) {
      expect(getByTestId(testId).className).not.toContain('outline-none!')
    }
  })

  it('inherits the desktop focus border when mobile does not set one', () => {
    const theme = themeForOverride({ base: { padding_x: 12 } })
    expect(classOf(<Input />, { ...theme, platform: 'mobile_web' })).toContain('outline-none!')
  })
})

describe('Input: prefix and suffix', () => {
  it('sits in a wrapper that takes the layout (className, style); the rest and the ref go to the input', () => {
    const ref = React.createRef()
    const { getByRole, container } = draw(
      <Input ref={ref} className='ui:max-w-full' style={{ margin: '1px' }} prefix={<Icon name='search' />} placeholder='Search' />
    )
    const input = getByRole('textbox')
    const group = container.querySelector('[data-slot=input-group]')
    expect(ref.current).toBe(input)
    expect(group.contains(input)).toBe(true)
    expect(group.getAttribute('class')).toContain('ui:max-w-full')
    expect(input.getAttribute('class')).not.toContain('ui:max-w-full')
    expect(group.style.margin).toBe('1px')
    // the variables are on the wrapper: the input and both slots inherit them
    expect(vars(group)).toMatchObject(componentVars(defaults, 'input', { variant: 'default', radius: 'md' }))
  })

  it('the text keeps clear of the icon: the theme\'s side padding, icon size and gap, on the side that has one', () => {
    const both = classOf(<Input prefix={<Icon name='search' />} suffix={<Icon name='user' />} />)
    expect(both).toContain('ui:ps-[calc(var(--ui-input-padding-x)+var(--ui-input-icon-size)+var(--ui-input-icon-gap))]')
    expect(both).toContain('ui:pe-[calc(var(--ui-input-padding-x)+var(--ui-input-icon-size)+var(--ui-input-icon-gap))]')
    const onlyPrefix = classOf(<Input prefix={<Icon name='search' />} />)
    expect(onlyPrefix).toContain('ui:ps-[')
    expect(onlyPrefix).not.toContain('ui:pe-[')
  })

  it('a prefix is decoration (pointer through, hidden icon); a suffix may be a control', () => {
    const onClear = vi.fn()
    const { container, getByRole } = draw(
      <Input prefix={<Icon name='search' />} suffix={<button type='button' aria-label='Clear' onClick={onClear}>x</button>} />
    )
    const prefix = container.querySelector('[data-slot=input-prefix]')
    const suffix = container.querySelector('[data-slot=input-suffix]')
    expect(prefix.getAttribute('class')).toContain('ui:pointer-events-none')
    expect(prefix.querySelector('svg').getAttribute('aria-hidden')).toBe('true')
    expect(suffix.getAttribute('class')).not.toContain('pointer-events-none')
    expect(prefix.getAttribute('class')).toContain('ui:text-(--ui-input-icon-color)')
    expect(prefix.getAttribute('class')).toContain('ui:[&_svg]:size-(--ui-input-icon-size)')
    fireEvent.click(getByRole('button', { name: 'Clear' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('without either it is the bare input: className on the input, no wrapper', () => {
    const { container } = draw(<Input className='ui:max-w-full' />)
    expect(container.querySelector('[data-slot=input-group]')).toBeNull()
    expect(container.querySelector('input').getAttribute('class')).toContain('ui:max-w-full')
  })
})

it.each(THEMES.filter(({ id }) => ['defaults', 'grill'].includes(id)))('file picker stays hidden and exposes the native file input in $id', ({ theme }) => {
  const ref = React.createRef()
  const onChange = vi.fn()
  const { getByTestId } = draw(<Input variant='file-picker' ref={ref} accept='image/png' onChange={onChange} data-testid='file' />, theme)
  const input = getByTestId('file')
  expect(input).toBe(ref.current)
  expect(input.type).toBe('file')
  expect(input.hidden).toBe(true)
  expect(input.tabIndex).toBe(-1)
  expect(input.accept).toBe('image/png')
  expect(vars(input)).toEqual({})
  const file = new File(['test'], 'photo.png', { type: 'image/png' })
  fireEvent.change(input, { target: { files: [file] } })
  expect(onChange).toHaveBeenCalledTimes(1)
})

it.each(THEMES.filter(({ id }) => ['defaults', 'grill'].includes(id)))('search-bar places a decorative magnifier at the start in $id', ({ theme }) => {
  const { container, getByRole } = draw(<Input variant='search-bar' prefix={<Icon name='search' />} aria-label='Search reviews' />, theme)
  const group = container.querySelector('[data-slot=input-group]')
  const icon = container.querySelector('[data-slot=input-prefix]')
  expect(group.style.getPropertyValue('--ui-input-icon-size')).toBe(fieldIcon(theme, 'search_bar').size)
  expect(icon).toHaveAttribute('aria-hidden', 'true')
  expect(icon.className).toContain('ui:start-md')
  expect(getByRole('textbox', { name: 'Search reviews' }).className).toContain('var(--ot-space-md)+var(--ui-input-icon-size)+var(--ot-space-sm)')
})

it.each(THEMES.filter(({ id }) => ['defaults', 'grill'].includes(id)))('clear-textual uses the search theme and a text action in $id', ({ theme }) => {
  const clear = { label: 'Clear search', onClick: vi.fn() }
  const { container, getByRole, rerender } = draw(<Input variant='clear-textual' aria-label='Search stores' />, theme)
  expect(container.querySelector('[data-slot=input-suffix] svg')).toBeTruthy()
  const input = getByRole('textbox', { name: 'Search stores' })
  expect(input.className).toContain('var(--ot-space-md)+var(--ui-input-icon-size)+var(--ot-space-sm)')
  rerender(<ThemeProvider theme={theme}><Input variant='clear-textual' clear={clear} aria-label='Search stores' /></ThemeProvider>)
  const action = getByRole('button', { name: 'Clear search' })
  expect(action.textContent).toBe('Clear search')
  fireEvent.click(action)
  expect(clear.onClick).toHaveBeenCalledOnce()
  expect(input.className).toContain('ui:pe-xxxl')
})

describe('Input: suffixWide (a suffix of several controls, such as a stepper)', () => {
  const stepper = (
    <>
      <button type='button' aria-label='Less'>-</button>
      <span>1</span>
      <button type='button' aria-label='More'>+</button>
    </>
  )
  const observers = []
  const original = globalThis.ResizeObserver
  beforeEach(() => {
    observers.length = 0
    globalThis.ResizeObserver = class {
      constructor (callback) { this.callback = callback; observers.push(this) }
      observe (node) { this.node = node }
      disconnect () { this.node = null }
    }
  })
  afterEach(() => { globalThis.ResizeObserver = original })

  it('the field reserves the suffix\'s own width, not an icon\'s', () => {
    const wide = draw(<Input suffix={stepper} suffixWide aria-label='Item' />)
    const classes = wide.getByRole('textbox').getAttribute('class')
    wide.unmount()
    expect(classes).toContain('ui:pe-[calc(var(--ui-input-suffix-width,var(--ui-input-icon-size))+var(--ui-input-icon-gap)*2)]')
    expect(classes).not.toContain('ui:pe-[calc(var(--ui-input-padding-x)+var(--ui-input-icon-size)')
    const plain = classOf(<Input suffix={<Icon name='user' />} aria-label='Item' />)
    expect(plain).toContain('ui:pe-[calc(var(--ui-input-padding-x)+var(--ui-input-icon-size)')
    expect(plain).not.toContain('--ui-input-suffix-width')
  })

  it('each control of the suffix gets a slot of the field\'s action size (44 px on touch) and none passes pointer through', () => {
    const { container, getByRole } = draw(<Input suffix={stepper} suffixWide aria-label='Item' />)
    const suffix = container.querySelector('[data-slot=input-suffix]')
    expect(suffix.className).toContain('ui:end-(--ui-input-icon-gap)')
    expect(suffix.className).toContain('ui:[&>*]:mx-[calc((var(--ui-input-action-size)-var(--ui-input-action-height))/2)]')
    expect(suffix.className).not.toContain('pointer-events-none')
    const group = container.querySelector('[data-slot=input-group]')
    expect(group.className).toContain('ui:max-mobile:[--ui-input-action-size:max(var(--ui-input-action-height),44px)]')
    expect(group.className).toContain('ui:pointer-coarse:[--ui-input-action-size:max(var(--ui-input-action-height),44px)]')
    expect(group.style.getPropertyValue('--ui-input-action-height')).toBe(componentVars(defaults, 'button', { size: 'xs', shape: 'icon', color: 'neutral', appearance: 'ghost' })['--ui-button-height'])
    expect(getByRole('button', { name: 'More' })).toBeTruthy()
  })

  it('writes the measured width of the suffix on the field and follows it', () => {
    const { container } = draw(<Input suffix={stepper} suffixWide aria-label='Item' />)
    const group = container.querySelector('[data-slot=input-group]')
    expect(observers).toHaveLength(1)
    expect(observers[0].node).toBe(container.querySelector('[data-slot=input-suffix]'))
    act(() => observers[0].callback([{ target: observers[0].node, borderBoxSize: [{ inlineSize: 140 }] }]))
    expect(group.style.getPropertyValue('--ui-input-suffix-width')).toBe('140px')
    act(() => observers[0].callback([{ target: observers[0].node, borderBoxSize: [{ inlineSize: 96 }] }]))
    expect(group.style.getPropertyValue('--ui-input-suffix-width')).toBe('96px')
  })

  it('a plain suffix does not observe anything', () => {
    draw(<Input suffix={<Icon name='user' />} aria-label='Item' />)
    expect(observers).toHaveLength(0)
  })
})

// implementation notesthe field keeps its painted box; on touch a strip behind it (its wrapper's `after`) reaches 44 px
describe('Input: the touch box', () => {
  it('a plain field sits in a wrapper that is a 44px box on touch, in the layout, and has no box off touch; the ref and the focus are the input\'s', () => {
    const ref = React.createRef()
    const { container, getByRole } = draw(<Input ref={ref} aria-label='Item' />)
    const wrapper = container.querySelector('[data-slot=input-touch]')
    expect(wrapper).toContainElement(getByRole('textbox'))
    expect(ref.current).toBe(getByRole('textbox'))
    expect(wrapper.className).toContain('ui:contents')
    // the box centers the field and reserves what a field painted lower than 44px lacks: no touch area over the next field
    for (const touch of ['pointer-coarse', 'max-mobile']) {
      for (const utility of ['flex', 'items-center', 'min-h-[44px]']) expect(wrapper.className).toContain(`ui:${touch}:${utility}`)
    }
    expect(wrapper.className).not.toContain('after:')
    // a tap on the box (the wrapper itself) focuses the field; a tap on the field does not go through it twice
    fireEvent.click(wrapper)
    expect(getByRole('textbox')).toHaveFocus()
  })

  it('a field with a prefix or a suffix has the box on its group, a search keeps its own label', () => {
    const grouped = draw(<Input suffix={<Icon name='user' />} aria-label='Item' />)
    const group = grouped.container.querySelector('[data-slot=input-group]')
    expect(group.className).toContain('ui:pointer-coarse:min-h-[44px]')
    expect(group.className).toContain('ui:max-mobile:items-center')
    fireEvent.click(group)
    expect(grouped.getByRole('textbox')).toHaveFocus()
    grouped.unmount()
    const search = draw(<Input variant='search-bar' prefix={<Icon name='user' />} aria-label='Find' />)
    expect(search.container.querySelector('[data-slot=input-group]').className).not.toContain('after:')
  })
})
