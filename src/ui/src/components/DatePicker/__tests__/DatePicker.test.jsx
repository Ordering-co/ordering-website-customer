import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { useLanguage } from '~components/contexts/LanguageContext'
import { DatePickerUI } from '../index'

// the sheet loads on its first opening (lazyOverlay): the real loader here
vi.unmock('@loadable/component')

vi.mock('react-date-range/dist/styles.css', () => ({}))
vi.mock('react-date-range/dist/theme/default.css', () => ({}))
// the window's width when the picker renders (setupTests fixes it at 1024)
vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ width: window.innerWidth, height: window.innerHeight })
}))
// The languages' date-fns locales, loaded on demand (dynamic import): Spanish
// loads (the real one, counted), French fails to
const localeLoads = vi.hoisted(() => ({ es: 0 }))
vi.mock('date-fns/locale/es', async () => {
  localeLoads.es++
  const actual = await vi.importActual('date-fns/locale/es')
  return { default: actual.default?.localize ? actual.default : actual.default?.default }
})
vi.mock('date-fns/locale/ar', async () => {
  const actual = await vi.importActual('date-fns/locale/ar')
  return { default: actual.default?.localize ? actual.default : actual.default?.default }
})
vi.mock('date-fns/locale/fr', () => {
  throw new Error('chunk failed to load')
})

const BIRTHDAY = new Date(2000, 4, 15) // 2000-05-15

// The frames the picker waits for (the focus of a day, back on the field)
const frames = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)))

const setWidth = (width) => {
  window.innerWidth = width
}

const renderPicker = (props = {}) => {
  const onChange = vi.fn()
  const utils = renderWithProviders(
    <>
      <DatePickerUI id='birthdate' value={BIRTHDAY} onChange={onChange} label='Birthdate' placeholder='Birthdate' {...props} />
      <button type='button'>Outside</button>
    </>
  )
  const field = screen.getAllByRole('button').find((b) => b.getAttribute('aria-haspopup') === 'dialog')
  return { ...utils, onChange, field }
}

// A day of the month shown (not of the months around it)
const day = (dialog, number) => [...dialog.querySelectorAll('.rdrDay:not(.rdrDayPassive)')]
  .find((cell) => cell.textContent.trim() === String(number))

const originalWidth = window.innerWidth

describe('DatePicker', () => {
  beforeEach(() => setWidth(1280))
  afterEach(() => {
    cleanup()
    window.innerWidth = originalWidth
  })

  describe('the field', () => {
    it('a button that opens a dialog, closed, showing the applied date', () => {
      const { field } = renderPicker()
      expect(field.tagName).toBe('BUTTON')
      expect(field).toHaveAttribute('id', 'birthdate')
      expect(field).toHaveAttribute('aria-haspopup', 'dialog')
      expect(field).toHaveAttribute('aria-expanded', 'false')
      // no date format configured: the app's default
      expect(field).toHaveTextContent('2000-05-15')
      expect(field).toHaveAccessibleName('Birthdate, 2000-05-15')
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('without a date, the placeholder', () => {
      const { field } = renderPicker({ value: null })
      expect(field).toHaveTextContent('Birthdate')
      expect(field).toHaveAccessibleName('Birthdate')
    })
  })

  describe('desktop: a popover', () => {
    it('the field toggles it: a dialog named as the field, outside the form (on the body)', () => {
      const { field, container } = renderPicker()
      fireEvent.click(field)
      const dialog = screen.getByRole('dialog', { name: 'Birthdate' })
      expect(field).toHaveAttribute('aria-expanded', 'true')
      expect(field).toHaveAttribute('aria-controls', dialog.id)
      expect(container.contains(dialog)).toBe(false)
      expect(dialog.querySelector('.rdrCalendarWrapper')).not.toBeNull()
      fireEvent.click(field)
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(field).toHaveAttribute('aria-expanded', 'false')
    })

    it('opening it, the focus goes to the selected day', async () => {
      const { field } = renderPicker()
      fireEvent.click(field)
      await frames()
      expect(document.activeElement).toBe(day(screen.getByRole('dialog'), 15))
    })

    it('a day pressed is applied and closes it, the focus back on the field', async () => {
      const { field, onChange } = renderPicker()
      fireEvent.click(field)
      fireEvent.mouseDown(day(screen.getByRole('dialog'), 20))
      expect(onChange).toHaveBeenCalledTimes(1)
      const picked = onChange.mock.calls[0][0]
      expect([picked.getFullYear(), picked.getMonth(), picked.getDate()]).toEqual([2000, 4, 20])
      expect(screen.queryByRole('dialog')).toBeNull()
      await frames()
      expect(document.activeElement).toBe(field)
    })

    it('a day picked with the keyboard (Enter) is applied; the key that opened it picks nothing', async () => {
      const { field, onChange } = renderPicker()
      fireEvent.click(field)
      await frames()
      const focused = document.activeElement
      // the release of the Enter that opened it lands on the focused day
      fireEvent.keyUp(focused, { key: 'Enter', keyCode: 13 })
      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      fireEvent.keyDown(focused, { key: 'Enter', keyCode: 13 })
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('the month and year controls move the calendar and keep it open', () => {
      const { field, onChange } = renderPicker()
      fireEvent.click(field)
      const dialog = screen.getByRole('dialog')
      const next = within(dialog).getByRole('button', { name: 'Next month' })
      fireEvent.mouseDown(next)
      fireEvent.click(next)
      fireEvent.click(within(dialog).getByRole('button', { name: 'Previous month' }))
      fireEvent.change(within(dialog).getByRole('combobox', { name: 'Year' }), { target: { value: '1990' } })
      fireEvent.change(within(dialog).getByRole('combobox', { name: 'Month' }), { target: { value: '0' } })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(onChange).not.toHaveBeenCalled()
      expect(within(dialog).getByRole('combobox', { name: 'Year' })).toHaveValue('1990')
    })

    it('a press outside closes it without a date; one inside does not', async () => {
      const { field, onChange } = renderPicker()
      fireEvent.click(field)
      await frames()
      fireEvent.pointerDown(screen.getByRole('dialog'))
      fireEvent.pointerUp(screen.getByRole('dialog'))
      fireEvent.click(screen.getByRole('dialog'))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      fireEvent.pointerDown(screen.getByText('Outside'))
      fireEvent.click(screen.getByText('Outside'))
      // Base UI's popover leaves with its fade
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(onChange).not.toHaveBeenCalled()
    })

    it('Escape closes it, the focus back on the field, and does not reach a modal around the form', async () => {
      const modalEscape = vi.fn()
      window.addEventListener('keydown', modalEscape)
      const { field, onChange } = renderPicker()
      fireEvent.click(field)
      await frames()
      fireEvent.keyDown(document.activeElement, { key: 'Escape' })
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(modalEscape).not.toHaveBeenCalled()
      expect(onChange).not.toHaveBeenCalled()
      await frames()
      expect(document.activeElement).toBe(field)
      window.removeEventListener('keydown', modalEscape)
    })

    it('the focus leaving it (Tab) closes it', async () => {
      const { field } = renderPicker()
      fireEvent.click(field)
      await frames()
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
      fireEvent.blur(document.activeElement, { relatedTarget: screen.getByText('Outside') })
      fireEvent.focusOut(document.activeElement, { relatedTarget: screen.getByText('Outside') })
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    })

    it('a floating layer of the theme: it declares its background', () => {
      const { field } = renderPicker()
      fireEvent.click(field)
      expect(screen.getByRole('dialog').style.getPropertyValue('--layer-background')).not.toBe('')
    })
  })

  describe('phone: a bottom sheet (the base Sheet)', () => {
    beforeEach(() => setWidth(390))

    // Base UI opens (and closes) its dialog a moment later
    const openSheet = async (props) => {
      const picker = renderPicker(props)
      fireEvent.click(picker.field)
      const sheet = await screen.findByRole('dialog', { name: 'Birthdate' })
      return { ...picker, sheet }
    }
    const closed = () => waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    it('a dialog titled as the field (the base Sheet), with the calendar, Cancel and Apply', async () => {
      const { sheet, field } = await openSheet()
      expect(sheet).toHaveAttribute('data-slot', 'sheet-content')
      expect(sheet).toHaveAttribute('data-side', 'bottom')
      expect(field).toHaveAttribute('aria-expanded', 'true')
      expect(sheet.querySelector('.rdrCalendarWrapper')).not.toBeNull()
      expect(within(sheet).getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(within(sheet).getByRole('button', { name: 'Apply' })).toBeInTheDocument()
    })

    it('opening it, the focus goes to the selected day', async () => {
      const { sheet } = await openSheet()
      await waitFor(() => expect(document.activeElement).toBe(day(sheet, 15)))
    })

    it('a day pressed is only chosen; Apply applies it and closes', async () => {
      const { sheet, onChange, field } = await openSheet()
      fireEvent.mouseDown(day(sheet, 20))
      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      fireEvent.click(within(sheet).getByRole('button', { name: 'Apply' }))
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange.mock.calls[0][0].getDate()).toBe(20)
      expect(field).toHaveAttribute('aria-expanded', 'false')
      await closed()
      await waitFor(() => expect(document.activeElement).toBe(field))
    })

    it('its clicks do not reach the React tree above it (through the portal)', async () => {
      const onParentClick = vi.fn()
      renderWithProviders(
        <div onClick={onParentClick}>
          <DatePickerUI id='birthdate' value={BIRTHDAY} onChange={vi.fn()} label='Birthdate' />
        </div>
      )
      fireEvent.click(screen.getByRole('button', { name: 'Birthdate, 2000-05-15' }))
      onParentClick.mockClear()
      const sheet = await screen.findByRole('dialog', { name: 'Birthdate' })
      fireEvent.click(within(sheet).getByRole('button', { name: 'Next month' }))
      expect(onParentClick).not.toHaveBeenCalled()
    })

    it('Cancel closes it and discards the day chosen', async () => {
      const { sheet, onChange, field } = await openSheet()
      fireEvent.mouseDown(day(sheet, 20))
      fireEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }))
      expect(onChange).not.toHaveBeenCalled()
      expect(field).toHaveAttribute('aria-expanded', 'false')
      await closed()
      // opened again, it shows the applied date, not the discarded one
      fireEvent.click(field)
      const again = await screen.findByRole('dialog', { name: 'Birthdate' })
      expect(day(again, 15).querySelector('.rdrSelected')).not.toBeNull()
      expect(day(again, 20).querySelector('.rdrSelected')).toBeNull()
    })

    it('its close button and Escape close it without a date', async () => {
      const { sheet, onChange, field } = await openSheet()
      fireEvent.mouseDown(day(sheet, 20))
      fireEvent.click(within(sheet).getByRole('button', { name: /close/i }))
      expect(field).toHaveAttribute('aria-expanded', 'false')
      await closed()
      fireEvent.click(field)
      const again = await screen.findByRole('dialog', { name: 'Birthdate' })
      // the focus goes into the sheet a frame after it opens
      await waitFor(() => expect(again.contains(document.activeElement)).toBe(true))
      fireEvent.keyDown(document.activeElement, { key: 'Escape' })
      expect(field).toHaveAttribute('aria-expanded', 'false')
      await closed()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('the month controls keep it open', async () => {
      const { sheet, onChange } = await openSheet()
      fireEvent.click(within(sheet).getByRole('button', { name: 'Next month' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('without a date, Apply waits for one', async () => {
      const { sheet } = await openSheet({ value: null })
      expect(within(sheet).getByRole('button', { name: 'Apply' })).toBeDisabled()
    })
  })

  describe('the site language', () => {
    const languageState = () => useLanguage()[0]
    let originalCode
    beforeEach(() => { originalCode = languageState().language.code })
    afterEach(() => { languageState().language.code = originalCode })

    const weekdays = (dialog) => [...dialog.querySelectorAll('.rdrWeekDay')].map((d) => d.textContent)
    const month = (dialog) => {
      const select = dialog.querySelector('.rdrMonthPicker select')
      return select.options[select.selectedIndex].textContent
    }

    it('English: the month and weekday names in English, the week from Sunday', async () => {
      const { field } = renderPicker()
      fireEvent.click(field)
      await frames()
      const dialog = screen.getByRole('dialog')
      expect(month(dialog)).toBe('May')
      expect(weekdays(dialog)[0]).toBe('Sun')
    })

    it('another language: English until its locale loads (only its own), then its names and first day of the week', async () => {
      languageState().language.code = 'es'
      const before = localeLoads.es
      const { field } = renderPicker()
      fireEvent.click(field)
      const dialog = screen.getByRole('dialog')
      expect(month(dialog)).toBe('May')
      // the locale is a dynamic import: wait for it, not for a fixed time
      await waitFor(() => expect(month(screen.getByRole('dialog'))).toBe('mayo'), { timeout: 3000 })
      expect(weekdays(screen.getByRole('dialog'))).toEqual(['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'])
      expect(localeLoads.es).toBe(before + 1)
    })

    it('Arabic: its names, the narrow weekdays (its short ones are words), the week from Saturday', async () => {
      languageState().language.code = 'ar'
      const { field } = renderPicker()
      fireEvent.click(field)
      await waitFor(() => expect(month(screen.getByRole('dialog'))).toBe('مايو'), { timeout: 3000 })
      const dialog = screen.getByRole('dialog')
      expect(weekdays(dialog)).toEqual(['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'])
    })

    it('a language without a locale here, or whose locale fails to load: English', async () => {
      for (const code of ['xx', 'fr']) {
        languageState().language.code = code
        const { field, unmount } = renderPicker()
        fireEvent.click(field)
        await frames()
        expect(month(screen.getByRole('dialog'))).toBe('May')
        expect(weekdays(screen.getByRole('dialog'))[0]).toBe('Sun')
        unmount()
      }
    })
  })
})
