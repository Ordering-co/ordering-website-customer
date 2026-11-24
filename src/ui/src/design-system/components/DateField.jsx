import React from 'react'
import styled, { useTheme } from 'styled-components'
import { Calendar } from 'react-date-range'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'
import { CHEVRON_GLYPHS } from '~ui/src/components/Icon/chevronGlyphs'
import { calendarCss, calendarSelectedColor } from '~ui/src/styles/Calendar'
import { cn } from '../lib/cn'
import { createIcon } from './createIcon'
import { MENU_SCROLLBAR, menuScrollbarVars } from './menuScrollbar'
import { Popover, PopoverContent, PopoverTrigger, popoverVars } from './Popover'
import { fieldTriggerLook } from './Select'
import '../styles.css'

// TOKEN-GAP(implementation notes): the schema has no `components.date_field`: the field is `components.input` (as the
// select's trigger), the calendar is `components.calendar`, its box `components.menu`. Nothing new to publish.

const Chevron = createIcon(CHEVRON_GLYPHS)

// The month of the theme's calendar (react-date-range, `components.calendar`), the same look the preorder's calendar has
const Month = styled.div`
  display: flex;
  align-items: center;
  text-align: initial;
  ${({ theme }) => calendarCss(theme)}
`

// The day the calendar gives the focus when it opens: the selected one, else today, else the first one that can be picked
const dayToFocus = (container) => {
  if (!container) return null
  const selected = container.querySelector('.rdrDay:not(.rdrDayPassive) .rdrSelected')
  return selected?.closest('.rdrDay') ||
    container.querySelector('.rdrDayToday:not(.rdrDayPassive):not(.rdrDayDisabled)') ||
    container.querySelector('.rdrDay:not(.rdrDayPassive):not(.rdrDayDisabled)')
}

// A day pressed with the mouse keeps the focus where it is (the calendar closes on it)
const keepFocusOnDay = (event) => {
  if (event.target.closest?.('.rdrDay')) event.preventDefault()
}

/**
 * A month of the theme's calendar by itself (for a sheet on a phone, around `DateField popover={false}`).
 *
 * - `date` (a Date or null), `onChange(date)`, `minDate`, `maxDate`: a day is picked when it is pressed
 *   (mouse down, Enter, Space).
 * - `locale` (a date-fns v2 locale) gives the month and weekday names and the first day of the week;
 *   `weekdayDisplayFormat` (`'E'` default, `'EEEEE'` for the narrow names of some languages).
 * - `labels`: `{ previous, next, month, year }`, the names of its controls, already translated.
 */
const DateCalendar = ({ date, onChange, minDate, maxDate, locale, weekdayDisplayFormat = 'E', labels = {}, ...props }) => {
  const theme = useTheme()
  return (
    <Month {...props}>
      <Calendar
        locale={locale}
        weekdayDisplayFormat={weekdayDisplayFormat}
        date={date || undefined}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        dragSelectionEnabled={false}
        showDateDisplay={false}
        // the selected day in components.calendar selected_background
        color={calendarSelectedColor(theme)}
        ariaLabels={{ prevButton: labels.previous, nextButton: labels.next, monthPicker: labels.month, yearPicker: labels.year }}
      />
    </Month>
  )
}

/**
 * A date field: a button that looks like the theme's field (`components.input`, as the select's
 * trigger) showing the applied date, which opens a popover with the theme's calendar
 * (`components.calendar`, in a box of `components.menu`) under it.
 *
 * - `value` (a Date or null), `onChange(date)` with the day pressed: it applies and closes, and
 *   the focus goes back to the field. The month and year controls only move the calendar.
 * - `format(date)`: the text the field shows (the app's date format); `placeholder` while empty.
 * - `label`: names the field (`label, date`) and the dialog. `id`, `invalid` (`aria-invalid`, name the
 *   message with `aria-describedby`), `disabled`, `className`; the rest goes to the button.
 * - `minDate`, `maxDate`, `locale`, `weekdayDisplayFormat`, `labels`: as `DateCalendar`.
 * - It opens with a press or ArrowDown; it closes with Escape, a day, a press outside or leaving it
 *   with Tab; the focus goes in to the selected day (else today, else the first day that can be picked).
 * - `open` / `onOpenChange(open)` hold its state from outside. `popover={false}` leaves the popover out: the
 *   field only asks (`onOpenChange(true)`), so a phone can show `DateCalendar` in a `Sheet`.
 * - `layer`: `'page'` (default) or `'modal'` for a field inside a dialog or a sheet.
 */
const DateField = ({
  value, onChange, format, placeholder, label, id, invalid, disabled, className, style,
  minDate, maxDate, locale, weekdayDisplayFormat, labels, open: openProp, onOpenChange, popover = true, layer, ...props
}) => {
  const theme = useTheme()
  const [own, setOwn] = React.useState(false)
  const calendarId = React.useId()
  const open = openProp ?? own
  const setOpen = (next) => {
    if (openProp === undefined) setOwn(next)
    onOpenChange?.(next)
  }
  const { classes, vars } = fieldTriggerLook(theme)
  const text = value ? format?.(value) ?? String(value) : ''
  const popup = popoverVars(theme)
  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger
        data-slot='date-field'
        id={id}
        disabled={disabled}
        aria-label={label ? (text ? `${label}, ${text}` : label) : undefined}
        aria-invalid={invalid || undefined}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' || open || disabled) return
          event.preventDefault()
          setOpen(true)
        }}
        {...props}
        style={{ ...vars, ...style }}
        className={cn(classes, 'ui:w-full', className)}
      >
        <span data-slot='date-field-value' className={cn('ui:min-w-[0] ui:flex-1 ui:truncate', !text && 'ui:text-(--ui-input-placeholder)')}>{text || placeholder}</span>
        <span className='ui:flex ui:shrink-0 ui:items-center ui:in-disabled:hidden ui:[&_svg]:size-(--ui-input-icon-size) ui:motion-safe:transition-transform ui:motion-safe:duration-(--ui-menu-motion-duration) ui:motion-safe:ease-(--ui-menu-motion-easing) ui:in-data-popup-open:rotate-180'>
          <Chevron name='chevronDown' />
        </span>
      </PopoverTrigger>
      {popover && (
        <PopoverContent
          layer={layer}
          side='bottom'
          align='start'
          aria-label={label}
          initialFocus={() => dayToFocus(document.getElementById(calendarId))}
          onMouseDownCapture={keepFocusOnDay}
          style={{ ...menuScrollbarVars(theme, popup['--ui-menu-radius']), '--layer-background': popup['--ui-menu-background'] }}
          className={cn('ui:w-max ui:max-w-(--available-width) ui:p-(--ui-menu-padding-x) ui:overflow-y-auto ui:overscroll-contain', MENU_SCROLLBAR)}
        >
          <DateCalendar
            id={calendarId}
            date={value}
            onChange={(date) => {
              if (date) onChange?.(date)
              setOpen(false)
            }}
            minDate={minDate}
            maxDate={maxDate}
            locale={locale}
            weekdayDisplayFormat={weekdayDisplayFormat}
            labels={labels}
          />
        </PopoverContent>
      )}
    </Popover>
  )
}

export { DateCalendar, DateField }
