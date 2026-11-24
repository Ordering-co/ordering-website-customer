import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { DateCalendar, DateField } from '../DateField'

// jsdom lays nothing out and does not compile Tailwind: these prove the parts, the attributes, the
// variables and the behavior; where it sits and how it looks is the browser's.
vi.mock('react-date-range/dist/styles.css', () => ({}))
vi.mock('react-date-range/dist/theme/default.css', () => ({}))

const [defaults, grill] = THEMES.map(({ theme }) => theme)
const LABELS = { previous: 'Previous month', next: 'Next month', month: 'Month', year: 'Year' }
const FIXED = new Date(2026, 10, 18)
const format = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const draw = (props, theme = defaults) => render(
  <ThemeProvider theme={theme}>
    <button type='button'>Elsewhere</button>
    <DateField label='Birthdate' placeholder='Pick a date' labels={LABELS} format={format} maxDate={new Date(2026, 11, 31)} {...props} />
  </ThemeProvider>
)
const field = () => screen.getByRole('button', { name: /Birthdate/ })
const dialog = () => screen.findByRole('dialog', { name: 'Birthdate' })
const days = (root) => [...root.querySelectorAll('.rdrDay:not(.rdrDayPassive):not(.rdrDayDisabled)')]
const gone = () => waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

describe('DateField: the calendar opens on the field\'s start side', () => {
  // Floating UI already mirrors start/end in RTL: asking for 'end' there put the calendar on the wrong side
  it.each([['ltr', defaults], ['rtl', { ...defaults, rtl: true }]])('%s: the positioner asks for align start', async (_dir, theme) => {
    draw({}, theme)
    fireEvent.click(field())
    await dialog()
    expect(document.querySelector('[data-slot=popover-positioner]').getAttribute('data-align')).toBe('start')
  })
})

describe('DateField: the trigger is the theme\'s field', () => {
  it.each([['defaults', defaults], ['grill', grill]])('%s: it writes components.input on itself, says it opens a dialog and shows the placeholder muted', (_id, theme) => {
    draw({}, theme)
    const button = field()
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('data-slot')).toBe('date-field')
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    const expected = componentVars(theme, 'input', { variant: 'default', radius: 'md' })
    Object.entries(expected).forEach(([name, value]) => expect(button.style.getPropertyValue(name)).toBe(value))
    expect(button.className).toContain('ui:h-(--ui-input-height)')
    expect(button.className).toContain('ui:data-popup-open:not-aria-invalid:[border:var(--ui-input-focus-border,var(--ui-input-border))]!')
    expect(button.textContent).toBe('Pick a date')
    expect(button.querySelector('[data-slot=date-field-value]').className).toContain('ui:text-(--ui-input-placeholder)')
    expect(getThemeCss(theme, 'input').base.padding_x).toBeTruthy()
  })

  it('shows the applied date in the format the caller gives, and names the field with it', () => {
    draw({ value: FIXED })
    expect(field().textContent).toBe('2026-11-18')
    expect(field()).toHaveAccessibleName('Birthdate, 2026-11-18')
    expect(field().querySelector('[data-slot=date-field-value]').className).not.toContain('ui:text-(--ui-input-placeholder)')
  })

  it('invalid is aria-invalid; disabled does not open', async () => {
    const { unmount } = draw({ invalid: true, 'aria-describedby': 'why' })
    expect(field().getAttribute('aria-invalid')).toBe('true')
    expect(field().getAttribute('aria-describedby')).toBe('why')
    unmount()
    draw({ disabled: true })
    fireEvent.click(field())
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(field().hasAttribute('disabled') || field().getAttribute('aria-disabled') === 'true').toBe(true)
  })

  it('keeps a touch target of 44 px around the field on a phone and with a coarse pointer', () => {
    draw({})
    expect(field().className).toContain('ui:max-mobile:after:min-h-[44px]')
    expect(field().className).toContain('ui:pointer-coarse:after:min-h-[44px]')
  })
})

describe('DateField: the calendar', () => {
  it('opens a dialog named by the label with the calendar, the focus on the selected day, and the field says so', async () => {
    draw({ value: FIXED })
    fireEvent.click(field())
    const popup = await dialog()
    expect(field().getAttribute('aria-expanded')).toBe('true')
    expect(popup.querySelector('.rdrCalendarWrapper')).toBeTruthy()
    expect(popup.getAttribute('data-slot')).toBe('popover-content')
    await waitFor(() => expect(popup.contains(document.activeElement)).toBe(true))
    await waitFor(() => expect(document.activeElement.closest('.rdrDay')?.textContent).toBe('18'))
  })

  it('opens with ArrowDown on the field', async () => {
    draw({})
    field().focus()
    fireEvent.keyDown(field(), { key: 'ArrowDown' })
    expect(await dialog()).toBeTruthy()
  })

  it('a day pressed is applied, closes the calendar and gives the focus back to the field', async () => {
    const onChange = vi.fn()
    draw({ value: FIXED, onChange })
    field().focus()
    fireEvent.click(field())
    const popup = await dialog()
    const day = days(popup).find((node) => node.textContent === '20')
    fireEvent.mouseDown(day)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toBeInstanceOf(Date)
    expect(format(onChange.mock.calls[0][0])).toBe('2026-11-20')
    await gone()
    await waitFor(() => expect(document.activeElement).toBe(field()))
  })

  it('the month and year controls only move the calendar', async () => {
    const onChange = vi.fn()
    draw({ value: FIXED, onChange })
    fireEvent.click(field())
    const popup = await dialog()
    fireEvent.click(within(popup).getByRole('button', { name: 'Previous month' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('Escape closes it and a press outside too, the focus back on the field', async () => {
    draw({ value: FIXED })
    field().focus()
    fireEvent.click(field())
    const popup = await dialog()
    await waitFor(() => expect(popup.contains(document.activeElement)).toBe(true))
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    await gone()
    await waitFor(() => expect(document.activeElement).toBe(field()))
    fireEvent.click(field())
    await dialog()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }))
    fireEvent.click(screen.getByRole('button', { name: 'Elsewhere' }))
    await gone()
  })

  it('days after maxDate and before minDate cannot be picked', async () => {
    const onChange = vi.fn()
    draw({ value: FIXED, onChange, minDate: new Date(2026, 10, 10), maxDate: new Date(2026, 10, 25) })
    fireEvent.click(field())
    const popup = await dialog()
    const open = days(popup).map((node) => Number(node.textContent))
    expect(Math.min(...open)).toBe(10)
    expect(Math.max(...open)).toBe(25)
  })

  it('the month names and the labels of its controls are the caller\'s', async () => {
    draw({ value: FIXED, labels: { ...LABELS, next: 'Mes siguiente' } })
    fireEvent.click(field())
    expect(within(await dialog()).getByRole('button', { name: 'Mes siguiente' })).toBeTruthy()
  })

  it('sits in a portal that carries components.menu, over the page, or over a modal on layer=modal', async () => {
    const { unmount } = draw({ value: FIXED })
    fireEvent.click(field())
    const popup = await dialog()
    expect(popup.closest('[data-base-ui-portal]').style.getPropertyValue('--ui-menu-background')).toBe(getThemeCss(defaults, 'menu').base.background)
    expect(popup.parentElement.className).toContain('ui:z-10002')
    unmount()
    draw({ value: FIXED, layer: 'modal' })
    fireEvent.click(field())
    expect((await dialog()).parentElement.className).toContain('ui:z-20602')
  })

  it('is as wide as the calendar, up to the screen, with room and a scrollbar of the menu', async () => {
    draw({ value: FIXED })
    fireEvent.click(field())
    const { className } = await dialog()
    expect(className).toContain('ui:w-max')
    expect(className).toContain('ui:max-w-(--available-width)')
    expect(className).toContain('ui:p-(--ui-menu-padding-x)')
    expect(className).toContain('ui:overflow-y-auto')
    expect(className).toContain('ui:[&::-webkit-scrollbar]:w-(--ui-select-scrollbar-size)')
    expect(className).not.toMatch(/\d+px\]/)
  })

  it('without a popover of its own (popover={false}) it only asks, so a sheet can show DateCalendar', () => {
    const onOpenChange = vi.fn()
    draw({ popover: false, open: false, onOpenChange })
    fireEvent.click(field())
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('DateCalendar: the theme\'s calendar by itself', () => {
  it('draws a month with the caller\'s labels, takes the picked day and has no popover around it', () => {
    const onChange = vi.fn()
    render(<ThemeProvider theme={defaults}><DateCalendar date={FIXED} onChange={onChange} maxDate={new Date(2026, 11, 31)} labels={LABELS} /></ThemeProvider>)
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeTruthy()
    const day = days(document.body).find((node) => node.textContent === '21')
    fireEvent.mouseDown(day)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(format(onChange.mock.calls[0][0])).toBe('2026-11-21')
  })
})
