import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import { format } from 'date-fns'
import { scrollBehavior } from '~/utils/themeMotion'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useDateFnsLocale } from '~ui/hooks/useDateFnsLocale'
import { businessCalendarDate, businessToday, businessWallClock } from '~/utils/businessTime'
import { Icon } from '~ui/src/design-system/components/Icon'
import { TouchSlot } from '~ui/src/styles/TouchSlot'
import { Radio } from '~ui/src/design-system/components/Checkbox'
import { Button } from '~ui/src/design-system/components/Button'

import {
  DayStripRow,
  DayStripViewport,
  DayStripTrack,
  DayCell,
  DayTag,
  DayName,
  DayNumber,
  DayMonth,
  DayClosedLabel
} from './styles'

// A date (YYYY-MM-DD) as a local Date at midnight — the same reading
// datesList's own entries already get elsewhere in this component.
const dateOf = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Whether a business day is closed on `date`: its weekly schedule says so
 * (`business.schedule[weekday].enabled === false`), or — today only —
 * every lapse it has is already over at `now` (default: now). Without a
 * business or a schedule, nothing is closed (BusinessReservation,
 * MomentControl without one): a day is only ever closed once the data to
 * know that exists.
 */
export const dayIsClosed = (date, business, now) => {
  const schedule = business?.schedule
  if (!Array.isArray(schedule)) return false
  const timezone = business?.timezone
  const day = businessCalendarDate(date, timezone).day()
  const daySchedule = schedule[day]
  if (!daySchedule?.enabled) return true
  if (date !== businessToday(timezone, now)) return false
  const lapses = daySchedule.lapses || []
  if (!lapses.length) return false
  const nowMs = now === undefined ? Date.now() : new Date(now).valueOf()
  const minutes = (time) => (time?.hour ?? 0) * 60 + (time?.minute ?? 0)
  // a lapse closing at or before it opens runs past midnight: still open today
  return lapses.every((lapse) => minutes(lapse.close) > minutes(lapse.open) &&
    businessWallClock(date, lapse.close, timezone).valueOf() <= nowMs)
}

/** The first of `dates` that is not closed, or `null` when every one is. */
export const firstAvailableDate = (dates, business, now) =>
  dates.find((date) => !dayIsClosed(date, business, now)) ?? null

/** `date` in the site's language, long form ("Thursday, November 19th, 2026"). */
export const fullDateLabel = (date, locale) => format(dateOf(date), 'PPPP', { locale })

/**
 * The day strip of PreorderDateTimeSteps: a horizontal,
 * natively-scrolling `radiogroup` of `dates`, selected only while
 * `dateConfirmed`. Each day names today (business.timezone, else the
 * user's) and whether the business is closed that day (`business`); closed
 * days are not selectable. Roving tabindex: the selected day, else the
 * first open one; arrows move the focus (skipping closed days) without
 * selecting, Space/Enter select the focused day.
 */
export const DayStrip = ({ dates, dateSelected, dateConfirmed, business, onSelectDate }) => {
  const [, t] = useLanguage()
  const locale = useDateFnsLocale()
  const theme = useTheme()
  const viewportRef = useRef(null)
  // the arrows only when the days overflow the strip
  const [overflows, setOverflows] = useState(false)
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || typeof ResizeObserver === 'undefined') return
    const measure = () => setOverflows(viewport.scrollWidth > viewport.clientWidth + 1)
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    measure()
    return () => observer.disconnect()
  }, [dates.length])
  const dayRefs = useRef({})
  const today = businessToday(business?.timezone)

  const closedByDate = useMemo(
    () => Object.fromEntries(dates.map((date) => [date, dayIsClosed(date, business)])),
    [dates, business]
  )
  const firstOpenDate = dates.find((date) => !closedByDate[date])
  const [focusedDate, setFocusedDate] = useState(() => (dateConfirmed && dateSelected) || firstOpenDate || dates[0])
  // the controller fills `dates` after mount: the tab stop falls back to the
  // selected / first open day whenever the remembered one is not listed
  const tabStop = dates.includes(focusedDate) ? focusedDate : ((dateConfirmed && dateSelected) || firstOpenDate || dates[0])

  useEffect(() => {
    if (dateConfirmed && dateSelected) setFocusedDate(dateSelected)
  }, [dateConfirmed, dateSelected])

  // The selected day stays visible when the strip opens already confirmed
  // (mount only — it should not re-scroll on every later selection).
  useEffect(() => {
    if (!dateConfirmed || !dateSelected) return
    dayRefs.current[dateSelected]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, []) // eslint-disable-line

  const moveFocus = (fromDate, direction) => {
    let i = dates.indexOf(fromDate) + direction
    while (dates[i] !== undefined && closedByDate[dates[i]]) i += direction
    const date = dates[i]
    if (date === undefined) return
    setFocusedDate(date)
    dayRefs.current[date]?.focus()
    dayRefs.current[date]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }

  const onDayKeyDown = (event, date) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const forward = event.key === 'ArrowRight'
      moveFocus(date, (theme?.rtl ? !forward : forward) ? 1 : -1)
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (!closedByDate[date]) onSelectDate(date)
    }
  }

  const scrollBy = (amount) => {
    viewportRef.current?.scrollBy?.({ left: theme?.rtl ? -amount : amount, behavior: scrollBehavior(theme) })
  }

  return (
    <DayStripRow>
      {overflows && (
      <TouchSlot>
        <Button shape='icon' color='neutral' appearance='ghost' type='button' coarseTouch onClick={() => scrollBy(-200)} aria-label={t('PREVIOUS', 'Previous')}>
          <Icon name='keyboardArrowLeft' />
        </Button>
      </TouchSlot>
      )}
      <DayStripViewport ref={viewportRef}>
        <DayStripTrack role='radiogroup' aria-label={t('CHOOSE_DATE', 'Choose Date')}>
          {dates.map((date) => {
            const closed = closedByDate[date]
            const isToday = date === today
            const selected = dateConfirmed && dateSelected === date
            const label = `${fullDateLabel(date, locale)}${isToday ? `, ${t('TODAY', 'Today')}` : ''}${closed ? `, ${t('CLOSED', 'Closed')}` : ''}`
            return (
              <DayCell key={date}>
                {isToday && <DayTag>{t('TODAY', 'Today')}</DayTag>}
                <Radio
                  appearance='date-strip'
                  ref={(el) => { dayRefs.current[date] = el }}
                  data-doc-control='business-preorder-date-day'
                  data-doc-date={date}
                  aria-label={label}
                  tabIndex={date === tabStop ? 0 : -1}
                  selected={selected}
                  closed={closed}
                  onClick={() => onSelectDate(date)}
                  onKeyDown={(event) => onDayKeyDown(event, date)}
                >
                  <DayName>{format(dateOf(date), 'EEE', { locale })}</DayName>
                  <DayNumber>{dateOf(date).getDate()}</DayNumber>
                  {closed ? <DayClosedLabel>{t('CLOSED', 'Closed')}</DayClosedLabel> : <DayMonth>{format(dateOf(date), 'MMM', { locale })}</DayMonth>}
                </Radio>
              </DayCell>
            )
          })}
        </DayStripTrack>
      </DayStripViewport>
      {overflows && (
      <TouchSlot>
        <Button shape='icon' color='neutral' appearance='ghost' type='button' coarseTouch onClick={() => scrollBy(200)} aria-label={t('NEXT', 'Next')}>
          <Icon name='keyboardArrowRight' />
        </Button>
      </TouchSlot>
      )}
    </DayStripRow>
  )
}
