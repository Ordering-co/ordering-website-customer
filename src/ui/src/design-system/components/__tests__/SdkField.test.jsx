import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { Input } from '../Input'
import { SdkField, fieldBoxProps } from '../SdkField'

// jsdom does not compile Tailwind: classes, attributes and variables only.
const defaults = THEMES[0].theme
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))
const classOf = (element) => draw(element).container.querySelector('[data-slot=sdk-field-box]').getAttribute('class')

describe('SdkField: an element the SDK draws (Stripe)', () => {
  it('frames it with the field\'s box and leaves the hole for the SDK', () => {
    const view = draw(<SdkField label='Card number' id='card'><div data-testid='sdk' id='card' /></SdkField>)
    const box = view.container.querySelector('[data-slot=sdk-field-box]')
    expect(box.contains(view.getByTestId('sdk'))).toBe(true)
    expect(view.getByText('Card number').tagName).toBe('LABEL')
    expect(view.getByText('Card number').getAttribute('for')).toBe('card')
    const classes = box.getAttribute('class')
    for (const expected of ['ui:min-h-(--ui-input-height)', 'ui:px-(--ui-input-padding-x)', 'ui:rounded-(--ui-input-radius)', 'ui:bg-(--ui-input-background)', 'ui:[border:var(--ui-input-border)]']) expect(classes).toContain(expected)
  })

  it('writes components.input and components.field on its wrapper', () => {
    const view = draw(<SdkField label='Card number'><div /></SdkField>)
    const root = view.container.querySelector('[data-slot=sdk-field]')
    expect(vars(root)).toMatchObject(componentVars(defaults, 'input', { variant: 'default', radius: 'md' }))
    expect(vars(root)).toMatchObject(componentVars(defaults, 'field'))
  })

  it('the box has the states of the field: focus border while the SDK has the focus, hover, error and disabled', () => {
    const classes = classOf(<SdkField><div /></SdkField>)
    expect(classes).toContain('ui:not-data-invalid:focus-within:[border:var(--ui-input-focus-border,var(--ui-input-border))]')
    expect(classes).toContain('ui:not-data-disabled:not-data-invalid:not-focus-within:not-data-focused:hover:[border:var(--ui-input-hover-border,var(--ui-input-border))]')
    expect(classes).toContain('ui:not-data-invalid:data-focused:[border:var(--ui-input-focus-border,var(--ui-input-border))]')
    expect(classes).toContain('ui:data-invalid:[border:var(--ui-input-error-border,var(--ui-input-border))]')
    expect(classes).toContain('ui:data-disabled:[border:var(--ui-input-disabled-border,var(--ui-input-border))]')
    expect(classes).toContain('ui:motion-safe:duration-(--ui-input-motion-duration)')
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+px|\d+ms/i)
  })

  it('shows the app\'s focus ring around the box when the theme has no focus border of its own, and not when it has', () => {
    const ring = 'ui:focus-within:[outline:var(--ot-focus-ring-width)_solid_var(--ot-focus-ring-color)]'
    expect(classOf(<SdkField><div /></SdkField>)).toContain(ring)
    const border = { width: 1, style: 'solid', color: '#123456' }
    const own = buildAppTheme(null, { version: 2, values: { components: { input: { base: { border }, variants: { default: { states: { focus: { border: { ...border, width: 2 } } } } } } } } })
    const ownClass = draw(<SdkField><div /></SdkField>, own).container.querySelector('[data-slot=sdk-field-box]').getAttribute('class')
    expect(ownClass).not.toContain(ring)
    // an error keeps its border over the theme's focus border: the ring is then the indicator
    expect(ownClass).toContain('ui:data-invalid:focus-within:[outline:var(--ot-focus-ring-width)_solid_var(--ot-focus-ring-color)]')
    expect(ownClass).toContain('ui:data-invalid:data-focused:[outline:var(--ot-focus-ring-width)_solid_var(--ot-focus-ring-color)]')
    expect(classOf(<SdkField><div /></SdkField>)).toContain('ui:data-focused:[outline:var(--ot-focus-ring-width)_solid_var(--ot-focus-ring-color)]')
  })

  it('the box is focused while the SDK element says so (onFocus, onBlur), and the element\'s own handlers still run', () => {
    const onFocus = vi.fn()
    const onBlur = vi.fn()
    const view = draw(<SdkField><input data-testid='sdk' onFocus={onFocus} onBlur={onBlur} /></SdkField>)
    const box = view.container.querySelector('[data-slot=sdk-field-box]')
    expect(box.hasAttribute('data-focused')).toBe(false)
    fireEvent.focus(view.getByTestId('sdk'))
    expect(box.hasAttribute('data-focused')).toBe(true)
    expect(onFocus).toHaveBeenCalledTimes(1)
    fireEvent.blur(view.getByTestId('sdk'))
    expect(box.hasAttribute('data-focused')).toBe(false)
    expect(onBlur).toHaveBeenCalledTimes(1)
  })

  it('an error says it under the field, marks the box invalid and is named by the field', () => {
    const view = draw(<SdkField label='Card number' error='Your card number is incomplete.'><div /></SdkField>)
    const error = view.getByRole('alert')
    expect(error.textContent).toBe('Your card number is incomplete.')
    expect(view.container.querySelector('[data-slot=sdk-field-box]').hasAttribute('data-invalid')).toBe(true)
    expect(error.getAttribute('class')).toContain('ui:mt-(--ui-field-message-gap)')
    expect(error.getAttribute('class')).toContain('ui:text-(--ui-field-error-color)')
  })

  it('no error, no alert and no invalid mark; `invalid` marks without a message', () => {
    const quiet = draw(<SdkField label='Card number'><div /></SdkField>)
    expect(quiet.queryByRole('alert')).toBeNull()
    expect(quiet.container.querySelector('[data-slot=sdk-field-box]').hasAttribute('data-invalid')).toBe(false)
    quiet.unmount()
    const marked = draw(<SdkField invalid><div /></SdkField>)
    expect(marked.container.querySelector('[data-slot=sdk-field-box]').hasAttribute('data-invalid')).toBe(true)
  })

  it('disabled says so on the box', () => {
    const view = draw(<SdkField disabled><div /></SdkField>)
    expect(view.container.querySelector('[data-slot=sdk-field-box]').hasAttribute('data-disabled')).toBe(true)
  })

  it('the label has the field\'s label text and gap', () => {
    const classes = draw(<SdkField label='Expire date'><div /></SdkField>).getByText('Expire date').getAttribute('class')
    expect(classes).toContain('ui:mb-(--ui-field-label-gap)')
    expect(classes).toContain('ui:text-(--ui-field-label-color)')
    expect(classes).toContain('ui:text-(length:--ui-field-label-size)')
  })

  it('a line under the field (border_sides: bottom) is the box\'s too', () => {
    const theme = buildAppTheme(null, { version: 2, values: { components: { input: { base: { border_sides: 'bottom' } } } } })
    const view = draw(<SdkField><div /></SdkField>, theme)
    expect(view.container.querySelector('[data-slot=sdk-field-box]').getAttribute('class')).toContain('ui:[border-bottom:var(--ui-input-border)]')
  })

  it.each(THEMES.filter(({ id }) => ['grill', 'cafe'].includes(id)))('reads the theme in $id', ({ theme }) => {
    const view = draw(<SdkField label='Card'><div /></SdkField>, theme)
    expect(vars(view.container.querySelector('[data-slot=sdk-field]'))['--ui-input-border']).toBe(componentVars(theme, 'input', { variant: 'default', radius: 'md' })['--ui-input-border'])
  })
})

describe('SdkField: an input the SDK creates (Google Places)', () => {
  // the SDK's own input: a plain element that takes className and style, as the Places one does
  const Sdk = (props) => <input data-testid='places' {...props} />

  it('hands the SDK the field\'s props: the input becomes the box, as an Input would', () => {
    const alone = draw(<Input />)
    const reference = alone.getByRole('textbox')
    const [referenceClass, referenceVars] = [reference.getAttribute('class'), vars(reference)]
    alone.unmount()
    const view = draw(<SdkField label='Address' id='address'>{(field) => <Sdk {...field} />}</SdkField>)
    const sdk = view.getByTestId('places')
    expect(sdk.getAttribute('id')).toBe('address')
    expect(sdk.getAttribute('class')).toBe(referenceClass)
    expect(vars(sdk)).toEqual(referenceVars)
    expect(view.getByText('Address').getAttribute('for')).toBe('address')
    expect(view.container.querySelector('[data-slot=sdk-field-box]')).toBeNull()
  })

  it('an error is named by the input and marks it invalid', () => {
    const view = draw(<SdkField label='Address' error='Pick an address from the list.'>{(field) => <Sdk {...field} />}</SdkField>)
    const sdk = view.getByTestId('places')
    expect(sdk.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(sdk.getAttribute('aria-describedby')).textContent).toBe('Pick an address from the list.')
  })

  it('without an error the input has neither mark', () => {
    const sdk = draw(<SdkField>{(field) => <Sdk {...field} />}</SdkField>).getByTestId('places')
    expect(sdk.hasAttribute('aria-invalid')).toBe(false)
    expect(sdk.hasAttribute('aria-describedby')).toBe(false)
  })

  it('generates an id the label points to when there is none', () => {
    const view = draw(<SdkField label='Address'>{(field) => <Sdk {...field} />}</SdkField>)
    expect(view.getByText('Address').getAttribute('for')).toBe(view.getByTestId('places').getAttribute('id'))
  })
})

describe('fieldBoxProps: the field box of the theme for a container', () => {
  it('gives the box classes and components.input as style, to spread on any element', () => {
    const view = draw(<div data-testid='box' {...fieldBoxProps(defaults)} />)
    const box = view.getByTestId('box')
    expect(vars(box)).toMatchObject(componentVars(defaults, 'input', { variant: 'default', radius: 'md' }))
    const classes = box.getAttribute('class')
    for (const expected of ['ui:rounded-(--ui-input-radius)', 'ui:bg-(--ui-input-background)', 'ui:[border:var(--ui-input-border)]', 'ui:not-data-invalid:focus-within:[border:var(--ui-input-focus-border,var(--ui-input-border))]']) expect(classes).toContain(expected)
    // a container has no ring of its own: the items inside have theirs
    expect(classes).not.toContain('has-[select:focus-visible]')
  })

  it('the ring can be asked for', () => {
    expect(fieldBoxProps(defaults, { ring: true }).className).toContain('has-[select:focus-visible]')
  })
})
