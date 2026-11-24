import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { InputPhone } from '../InputPhone'

// setupTests stubs the library for the screens' tests; the piece is the real thing here
vi.unmock('react-phone-number-input')

const defaults = THEMES[0].theme
const draw = (element, theme = defaults) => render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
const vars = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--')).map((name) => [name, el.style.getPropertyValue(name)]))

describe('InputPhone', () => {
  it('is the country control and the number field, the number being the base Input', () => {
    const view = draw(<InputPhone defaultCountry='US' placeholder='Phone number' aria-label='Phone' />)
    const number = view.getByRole('textbox', { name: 'Phone' })
    expect(number.tagName).toBe('INPUT')
    expect(number.getAttribute('type')).toBe('tel')
    expect(number.getAttribute('data-slot')).toBe('input')
    expect(number.getAttribute('placeholder')).toBe('Phone number')
    expect(vars(number)).toEqual(componentVars(defaults, 'input', { variant: 'default', radius: 'md' }))
    expect(number.getAttribute('class')).toContain('ui:h-(--ui-input-height)')
    // never under 16 px on a phone, as the Input
    expect(number.getAttribute('class')).toContain('ui:max-mobile:text-[length:max(var(--ui-input-text-size),var(--ui-field-min-text))]')
    const country = view.container.querySelector('[data-slot=input-phone-country]')
    expect(country).toBeTruthy()
    expect(country.querySelector('select')).toBeTruthy()
  })

  it('the root carries components.input so the country box paints with the field\'s look', () => {
    const view = draw(<InputPhone defaultCountry='US' aria-label='Phone' />)
    const root = view.container.querySelector('[data-slot=input-phone]')
    expect(vars(root)).toMatchObject(componentVars(defaults, 'input', { variant: 'default', radius: 'md' }))
    const classes = view.container.querySelector('[data-slot=input-phone-country]').getAttribute('class')
    expect(classes).toContain('ui:rounded-(--ui-input-radius)')
    expect(classes).toContain('ui:bg-(--ui-input-background)')
    expect(classes).toContain('ui:[border:var(--ui-input-border)]')
    expect(classes).toContain('ui:not-data-invalid:focus-within:[border:var(--ui-input-focus-border,var(--ui-input-border))]')
    expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+px|\d+ms/i)
  })

  it('shows the country\'s flag, hidden from assistive technology, and a globe when there is none', () => {
    const view = draw(<InputPhone defaultCountry='US' aria-label='Phone' />)
    const flag = view.container.querySelector('[data-slot=input-phone-country] img')
    expect(flag.getAttribute('src')).toContain('/US.svg')
    expect(flag.getAttribute('alt')).toBe('')
    view.unmount()
    const none = draw(<InputPhone aria-label='Phone' />)
    expect(none.container.querySelector('[data-slot=input-phone-country] img')).toBeNull()
    expect(none.container.querySelector('[data-slot=input-phone-country] svg[aria-hidden=true]')).toBeTruthy()
  })

  it('the country is a native select named by `countryLabel`, with the chevron after the flag', () => {
    const view = draw(<InputPhone defaultCountry='US' countryLabel='Country' aria-label='Phone' />)
    const select = view.getByRole('combobox', { name: 'Country' })
    expect(select.value).toBe('US')
    expect(select.getAttribute('class')).toContain('ui:opacity-0')
    expect(view.container.querySelector('[data-slot=input-phone-country] svg[aria-hidden=true]')).toBeTruthy()
  })

  it('choosing a country changes it and keeps what was typed as a number of that country', () => {
    const onChange = vi.fn()
    const view = draw(<InputPhone defaultCountry='US' onChange={onChange} countryLabel='Country' aria-label='Phone' />)
    fireEvent.change(view.getByRole('textbox', { name: 'Phone' }), { target: { value: '2133734253' } })
    expect(onChange).toHaveBeenLastCalledWith('+12133734253')
    fireEvent.change(view.getByRole('combobox', { name: 'Country' }), { target: { value: 'FR' } })
    expect(view.getByRole('combobox', { name: 'Country' }).value).toBe('FR')
  })

  it('takes a controlled E.164 value and reports it in E.164', () => {
    const onChange = vi.fn()
    const view = draw(<InputPhone value='+12133734253' onChange={onChange} aria-label='Phone' displayInitialValueAsLocalNumber />)
    const number = view.getByRole('textbox', { name: 'Phone' })
    expect(number.value).toContain('213')
    fireEvent.change(number, { target: { value: '+1 213 373 4254' } })
    expect(onChange).toHaveBeenLastCalledWith('+12133734254')
  })

  it('invalid marks the number with the theme\'s error border and names the message', () => {
    const view = draw(<InputPhone invalid aria-describedby='phone-error' defaultCountry='US' aria-label='Phone' />)
    const number = view.getByRole('textbox', { name: 'Phone' })
    expect(number.getAttribute('aria-invalid')).toBe('true')
    expect(number.getAttribute('aria-describedby')).toBe('phone-error')
    expect(number.getAttribute('class')).toContain('var(--ui-input-error-border,var(--ui-input-border))')
  })

  it('the number starts at the start of the line; align=\'center\' centers it by a class of the piece itself', () => {
    const view = draw(<InputPhone defaultCountry='US' aria-label='Phone' />)
    expect(view.getByRole('textbox', { name: 'Phone' }).getAttribute('class')).not.toContain('ui:text-center')
    view.unmount()
    const centered = draw(<InputPhone align='center' defaultCountry='US' aria-label='Phone' />)
    expect(centered.getByRole('textbox', { name: 'Phone' }).getAttribute('class')).toContain('ui:text-center')
  })

  it('disabled disables the number and the country select and says so on the root', () => {
    const view = draw(<InputPhone disabled defaultCountry='US' countryLabel='Country' aria-label='Phone' />)
    expect(view.getByRole('textbox', { name: 'Phone' })).toBeDisabled()
    expect(view.getByRole('combobox', { name: 'Country' })).toBeDisabled()
    expect(view.container.querySelector('[data-slot=input-phone-country]').hasAttribute('data-disabled')).toBe(true)
    expect(view.container.querySelector('[data-slot=input-phone-country]').getAttribute('class')).toContain('ui:data-disabled:cursor-not-allowed')
  })

  it('the keyboard focus of the invisible select shows as the theme\'s ring on the country box', () => {
    const view = draw(<InputPhone defaultCountry='US' aria-label='Phone' />)
    const classes = view.container.querySelector('[data-slot=input-phone-country]').getAttribute('class')
    expect(classes).toContain('ui:has-[select:focus-visible]:[outline:var(--ot-focus-ring-width)_solid_var(--ot-focus-ring-color)]')
    expect(classes).toContain('ui:has-[select:focus-visible]:[outline-offset:var(--ot-focus-ring-offset)]')
  })

  it('keeps its row right to left with the page (logical properties only)', () => {
    const view = draw(<InputPhone defaultCountry='US' aria-label='Phone' />)
    const all = [view.container.querySelector('[data-slot=input-phone]'), view.container.querySelector('[data-slot=input-phone-country]')].map((el) => el.getAttribute('class')).join(' ')
    expect(all).not.toMatch(/ui:(?:[a-z-]+:)*(?:pl|pr|ml|mr|left|right)-/)
  })

  it('the caller\'s class goes to the root and wins over the piece\'s', () => {
    const view = draw(<InputPhone className='ui:gap-lg' defaultCountry='US' aria-label='Phone' />)
    expect(view.container.querySelector('[data-slot=input-phone]').getAttribute('class')).toContain('ui:gap-lg')
  })
})
