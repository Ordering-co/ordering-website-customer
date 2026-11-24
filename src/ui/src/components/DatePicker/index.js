import React, { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'

import { SheetActions, SheetBody } from './styles'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { Button } from '~ui/src/design-system/components/Button'
import { DateCalendar, DateField } from '~ui/src/design-system/components/DateField'
import { LazySheet } from '~ui/src/components/Overlay/lazyOverlay'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { useDateFnsLocale, weekdayWidthOf } from '~ui/hooks/useDateFnsLocale'

// The day the sheet's calendar gives the focus when it opens: the selected one, else
// today, else the first one that can be picked (of the month shown)
const dayToFocus = (container) => {
  if (!container) return null
  const selected = container.querySelector('.rdrDay:not(.rdrDayPassive) .rdrSelected')
  return selected?.closest('.rdrDay') ||
    container.querySelector('.rdrDayToday:not(.rdrDayPassive):not(.rdrDayDisabled)') ||
    container.querySelector('.rdrDay:not(.rdrDayPassive):not(.rdrDayDisabled)')
}

/**
 * A date field (the birthday of the profile): the base DateField, a button showing the applied
 * date in the app's date format that opens the theme's calendar
 * - on a desktop, in its popover under the field: a day pressed is applied and closes it; the
 *   month and year controls only move the calendar;
 * - on a phone (below MOBILE_WEB_MAX_WIDTH), in a bottom sheet titled `label` with the same
 *   DateCalendar: a day pressed is chosen, Apply applies it and closes, Cancel (the overlay,
 *   Escape, dragged down) closes without it.
 * Both close with Escape (not reaching a modal around the form), a press outside; the field
 * toggles them; on close the focus is back on the field.
 * `value` a Date (or null), `onChange(date)` with the applied Date.
 */
export const DatePickerUI = (props) => {
  const { value, onChange, id, label, placeholder, minDate, disabled, layer, invalid } = props
  const [, t] = useLanguage()
  const [{ dateFormat }] = useUtils()
  const { width } = useWindowSize()
  // en-US until the language's locale loads
  const locale = useDateFnsLocale()
  const asSheet = width < MOBILE_WEB_MAX_WIDTH
  const [open, setOpen] = useState(false)
  // The date chosen in the sheet, applied with Apply
  const [draft, setDraft] = useState(value || null)
  // Today, the last day that can be picked (fixed while the field lives)
  const [maxDate] = useState(() => props.maxDate || new Date())
  const rootRef = useRef(null)
  const sheetRef = useRef(null)
  const title = label || placeholder

  const focusField = () => {
    requestAnimationFrame(() => rootRef.current?.querySelector('[data-slot="date-field"]')?.focus({ preventScroll: true }))
  }

  // The popover closes itself and returns the focus; the sheet is ours
  const close = useCallback(() => {
    setOpen(false)
    focusField()
  }, [])

  // On a phone the field only asks to open: the sheet closes itself (a press in the sheet is
  // "outside" the field's popover and must not close it)
  const handleOpenChange = (next) => {
    if (asSheet) {
      if (!next) return
      setDraft(value || null)
    }
    setOpen(next)
  }

  // Escape closes only the calendar: a modal around the form stays open
  const handleEscape = (e) => {
    if (e.key !== 'Escape' || !open) return
    e.stopPropagation()
    if (asSheet) close()
  }

  // "Sun", "lun"…; the narrow ones when they are words (Arabic)
  const calendar = {
    locale,
    weekdayDisplayFormat: weekdayWidthOf(locale, 'abbreviated') === 'narrow' ? 'EEEEE' : 'E',
    labels: {
      previous: t('PREVIOUS_MONTH', 'Previous month'),
      next: t('NEXT_MONTH', 'Next month'),
      month: t('MONTH', 'Month'),
      year: t('YEAR', 'Year')
    },
    minDate,
    maxDate
  }

  // The focus goes to a day of the sheet's calendar when it opens
  useEffect(() => {
    if (!open || !asSheet) return
    // (the sheet mounts its content a moment after it opens)
    let tries = 10
    let frame = requestAnimationFrame(function focusDay () {
      const day = dayToFocus(sheetRef.current)
      if (day) day.focus({ preventScroll: true })
      else if (--tries > 0) frame = requestAnimationFrame(focusDay)
    })
    return () => cancelAnimationFrame(frame)
  }, [open, asSheet])

  const format = (date) => (dayjs(date).isValid() ? dayjs(date).format(dateFormat || 'YYYY-MM-DD') : '')

  return (
    <div ref={rootRef} onKeyDown={handleEscape}>
      <DateField
        id={id}
        value={value}
        onChange={onChange}
        format={format}
        label={title}
        placeholder={placeholder}
        disabled={disabled}
        invalid={invalid}
        aria-describedby={props['aria-describedby']}
        layer={layer}
        open={open}
        onOpenChange={handleOpenChange}
        popover={!asSheet}
        {...calendar}
      />
      {asSheet && (
        <LazySheet open={open} onClose={close} title={title}>
          {/* its clicks stay in it: the React tree above the portal would get them too */}
          <SheetBody ref={sheetRef} onKeyDown={handleEscape} onClick={(e) => e.stopPropagation()}>
            <DateCalendar
              date={draft}
              onChange={setDraft}
              {...calendar}
            />
            <SheetActions>
              <Button color='neutral' appearance='outline' size='md' onClick={close}>
                {t('CANCEL', 'Cancel')}
              </Button>
              <Button
                size='md'
                disabled={!draft}
                onClick={() => {
                  onChange?.(draft)
                  close()
                }}
              >
                {t('APPLY', 'Apply')}
              </Button>
            </SheetActions>
          </SheetBody>
        </LazySheet>
      )}
    </div>
  )
}
