import React from 'react'
import styled from 'styled-components'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import {
  calendarCss,
  calendarSelectedColor,
  calendarTheme,
  dateStripDayAttrs,
  dateStripDayCss,
  dateStripNameCss,
  dateStripNumberCss,
  dateStripTheme
} from '../index'
import { CalendarWrapper as CustomLayoutCalendar } from '~ui/src/components/MomentControl/layouts/CustomLayout/styles'
import { Day as MomentDay, DayName as MomentDayName, DayNumber as MomentDayNumber } from '~ui/src/components/MomentControl/styles'
import { Day as PreorderDay, DayNumber as PreorderDayNumber } from '~ui/src/components/BusinessPreorder/styles'
import { Day as ServiceDay } from '~ui/src/components/ServiceForm/styles'
import { cssFor, injectedCss, renderWith, themeWithValues } from '../../__tests__/themeTestUtils'
import { focusRingCss } from '~ui/src/styles/Focus'

afterEach(cleanup)

const CALENDAR = {
  day_size: 30,
  day_radius: 6,
  day_background: '#F1F1F1',
  day_color: '#111111',
  day_text: { size: 14, line: 1.71, weight: 400 },
  weekday_text: { size: 16, line: 1.5, weight: 400 },
  weekday_color: '#222222',
  selected_background: '#AA0000',
  selected_color: '#FFFFFF',
  disabled_background: 'transparent',
  disabled_color: '#CBCBCB'
}

const STRIP = {
  background: 'transparent',
  color: '#111111',
  selected_background: '#FFEEEE',
  selected_color: '#AA0000',
  radius: 8,
  border: null,
  padding_y: 12,
  gap: 4,
  name_text: { size: 13, line: 1.54, weight: 400 },
  number_text: { size: 22, line: 1.36, weight: 600 }
}

const theme = () => themeWithValues((values) => {
  values.components.calendar.base = { ...CALENDAR }
  values.components.date_strip.base = { ...STRIP }
  return values
})

// A month of react-calendar as it renders its tiles
const Month = () => (
  <div className='react-calendar'>
    <div className='react-calendar__month-view__weekdays'><div><abbr>Mo</abbr></div></div>
    <button className='react-calendar__tile react-calendar__month-view__days__day'><abbr>1</abbr></button>
    <button className='react-calendar__tile react-calendar__tile--active react-calendar__month-view__days__day'><abbr>2</abbr></button>
    <button className='react-calendar__tile react-calendar__month-view__days__day' disabled><abbr>3</abbr></button>
  </div>
)

// The box of the birthday's calendar (the `Month` of the base DateField: calendarCss over the library's DOM)
const DateContainer = styled.div`
  ${({ theme }) => calendarCss(theme)}
`

// A month of react-date-range as it renders its days (the birthday's)
const DateRangeMonth = () => (
  <div className='rdrCalendarWrapper'>
    <div className='rdrMonthAndYearWrapper'>
      <button className='rdrNextPrevButton rdrPprevButton'><i /></button>
      <span className='rdrMonthAndYearPickers'><span className='rdrMonthPicker'><select><option>May</option></select></span></span>
      <button className='rdrNextPrevButton rdrNextButton'><i /></button>
    </div>
    <div className='rdrMonths'>
      <div className='rdrMonth'>
        <div className='rdrWeekDays'><span className='rdrWeekDay'>Mo</span></div>
        <div className='rdrDays'>
          <button className='rdrDay'><span className='rdrDayNumber'><span>1</span></span></button>
          <button className='rdrDay'><span className='rdrSelected' /><span className='rdrDayNumber'><span>2</span></span></button>
          <button className='rdrDay rdrDayDisabled'><span className='rdrDayNumber'><span>3</span></span></button>
        </div>
      </div>
    </div>
  </div>
)

// The rules of a calendar's wrapper whose selector ends in `selector` (no
// spaces, as styled-components writes them)
const rulesAt = (el, selector) => {
  const cls = el.className.split(' ').pop()
  return injectedCss().split('}').filter((rule) => {
    const [selectors] = rule.split('{')
    return selectors.includes(`.${cls}`) && selectors.split(',').some((one) => one.trim().endsWith(selector))
  }).join('}')
}

const preorder = (themed) => renderWith(themed, <CustomLayoutCalendar><Month /></CustomLayoutCalendar>).container.firstChild
const birthday = (themed) => renderWith(themed, <DateContainer><DateRangeMonth /></DateContainer>).container.firstChild

// Each part of the calendar in both libraries: [react-calendar, react-date-range]
const PARTS = {
  box: ['.react-calendar', '.rdrCalendarWrapper'],
  header: ['.react-calendar__navigation__label', '.rdrMonthAndYearPickers select'],
  arrow: ['.react-calendar__navigation button', '.rdrNextPrevButton'],
  weekday: ['.react-calendar__month-view__weekdays', '.rdrWeekDay'],
  day: ['.react-calendar__month-view__days__day abbr', '.rdrDayNumber'],
  selected: ['.react-calendar__tile--active abbr', '.rdrDay:not(.rdrDayPassive) .rdrSelected ~ .rdrDayNumber'],
  disabled: ['.react-calendar__tile:disabled abbr', '.rdrDayDisabled .rdrDayNumber'],
  focus: ['.react-calendar__month-view__days__day:focus-visible abbr', '.rdrDay:focus-visible .rdrDayNumber'],
  cellFocus: ['.react-calendar__month-view__days__day:focus-visible', '.rdrDay:focus-visible']
}

const BOX = {
  background: '#FAFAFA',
  border: { width: 1, style: 'solid', color: '#DDDDDD' },
  radius: 12,
  shadow: { x: 0, y: 2, blur: 8, spread: 0, color: '#000000', opacity: 0.1 },
  padding: 16,
  header_text: { size: 18, line: 1.44, weight: 700 },
  header_color: '#333333'
}

const boxTheme = (more = {}) => themeWithValues((values) => {
  values.components.calendar.base = { ...CALENDAR, ...BOX, ...more }
  return values
})

describe('components.calendar', () => {
  it('the schema defaults: today\'s preorder month (no box, an h3 header, light fill days, the Identity\'s radius, primary selected)', () => {
    const themed = themeWithValues()
    const look = calendarTheme(themed)
    const { tokens } = themed.values
    expect(look.background).toBe('transparent')
    expect(look.border).toBeNull()
    expect(look.radius).toBe(0)
    expect(look.shadow).toBeNull()
    expect(look.padding).toBe(0)
    expect(look.header_text).toMatchObject({ size: tokens.typography.h3.size, line: tokens.typography.h3.line })
    expect(look.header_color).toBe(tokens.color.text)
    expect(look.day_size).toBe(32)
    // the defaults' Identity rounding (tokens.border_style.radius) over sm
    expect(look.day_radius).toBe(tokens.radius[tokens.border_style.radius])
    expect(look.day_background).toBe(tokens.color.surface_alt)
    expect(look.selected_background).toBe(tokens.color.primary)
    expect(look.selected_color).toBe(tokens.color.on_primary)
    expect(look.disabled_color).toBe(tokens.color.disabled)
  })

  it('the preorder (react-calendar) and the birthday (react-date-range) calendars get the same rules', () => {
    const themed = boxTheme()
    const ring = focusRingCss(themed).replace(/: /g, ':').replace(/; /g, ';')
    for (const wrapper of [preorder(themed), birthday(themed)]) {
      const lib = wrapper.querySelector('.react-calendar') ? 0 : 1
      const at = (part) => rulesAt(wrapper, PARTS[part][lib])
      // the box
      expect(at('box')).toContain('background:#FAFAFA')
      expect(at('box')).toContain('border:1px solid #DDDDDD')
      expect(at('box')).toContain('border-radius:12px')
      expect(at('box')).toContain('box-shadow:0px 2px 8px 0px rgba(0,0,0,0.1)')
      expect(at('box')).toContain('padding:16px')
      // the header: the month and its arrows
      expect(at('header')).toContain('font-size:18px')
      expect(at('header')).toContain('line-height:1.44')
      expect(at('header')).toContain('font-weight:600')
      expect(at('header')).toContain('color:#333333')
      expect(at('arrow')).toContain('background:transparent')
      expect(at('arrow')).toContain('color:#333333')
      expect(at('arrow')).toContain('height:44px')
      // the weekdays
      expect(at('weekday')).toContain('font-size:16px')
      expect(at('weekday')).toContain('font-weight:600')
      expect(at('weekday')).toContain('color:#222222')
      // a day, the selected one, a disabled one
      expect(at('day')).toContain('width:30px;height:30px')
      expect(at('day')).toContain('border-radius:6px')
      expect(at('day')).toContain('background:#F1F1F1')
      expect(at('day')).toContain('color:#111111')
      expect(at('selected')).toContain('background:#AA0000')
      expect(at('selected')).toContain('color:#FFFFFF')
      expect(at('disabled')).toContain('background:transparent')
      expect(at('disabled')).toContain('color:#CBCBCB')
      // the keyboard focus: the theme's ring on the day's box
      expect(ring).not.toBe('')
      expect(at('focus')).toContain(ring.replace(/;$/, ''))
      // only there: the day's cell drops the global ring of the buttons
      expect(at('cellFocus')).toContain('outline:none !important')
      cleanup()
    }
  })

  it('a value of the theme changes both calendars', () => {
    const themed = boxTheme({ day_radius: 3, selected_background: '#00AA00', header_color: '#123456', padding: 4 })
    for (const wrapper of [preorder(themed), birthday(themed)]) {
      const lib = wrapper.querySelector('.react-calendar') ? 0 : 1
      const at = (part) => rulesAt(wrapper, PARTS[part][lib])
      expect(at('day')).toContain('border-radius:3px')
      expect(at('selected')).toContain('background:#00AA00')
      expect(at('header')).toContain('color:#123456')
      expect(at('box')).toContain('padding:4px')
      cleanup()
    }
  })

  it('the birthday\'s own marks are gone: no today underline, no hover outline, the library\'s selection under the day\'s box', () => {
    const wrapper = birthday(boxTheme())
    expect(rulesAt(wrapper, '.rdrDayToday .rdrDayNumber span:after')).toContain('display:none')
    expect(rulesAt(wrapper, '.rdrDay.rdrDayHovered .rdrDayNumber:after')).toContain('display:none')
    expect(rulesAt(wrapper, '.rdrSelected')).toContain('display:none')
    expect(rulesAt(wrapper, '.rdrDayDisabled')).toContain('background:transparent')
  })

  it('the arrows point the way they go right to left', () => {
    const themed = themeWithValues()
    const ltr = birthday(themed)
    expect(rulesAt(ltr, '.rdrNextButton i')).toContain('transform:rotate(-45deg)')
    cleanup()
    const rtl = { ...themed, rtl: true }
    expect(rulesAt(birthday(rtl), '.rdrNextButton i')).toContain('transform:rotate(135deg)')
    cleanup()
    expect(rulesAt(preorder(rtl), '.react-calendar__navigation__arrow svg')).toContain('transform:rotateZ(180deg)')
    // the base Icon's open Lucide chevron is not filled
    expect(rulesAt(preorder(rtl), '.react-calendar__navigation__arrow svg')).toContain('fill:none')
  })

  it('CustomLayout: the same calendar', () => {
    const { container } = renderWith(boxTheme(), <CustomLayoutCalendar><Month /></CustomLayoutCalendar>)
    expect(rulesAt(container.firstChild, PARTS.day[0])).toContain('background:#F1F1F1')
    expect(rulesAt(container.firstChild, PARTS.selected[0])).toContain('background:#AA0000')
    expect(rulesAt(container.firstChild, PARTS.box[0])).toContain('padding:16px')
  })

  it('the helpers paint with the defaults; the selected color of react-date-range', () => {
    const t = themeWithValues()
    expect(calendarCss(t)).not.toBe('')
    expect(calendarSelectedColor(t)).toBe(t.values.tokens.color.primary)
    expect(calendarSelectedColor(theme())).toBe('#AA0000')
  })
})

describe('components.date_strip', () => {
  it('the schema defaults: today\'s strip (no fill, the primary\'s light fill selected, md above and below)', () => {
    const themed = themeWithValues()
    const look = dateStripTheme(themed)
    expect(look.background).toBe('transparent')
    expect(look.selected_background).toBe(themed.values.tokens.color.primary_subtle)
    expect(look.selected_color).toBe(themed.values.tokens.color.primary_text)
    expect(look.padding_y).toBe(themed.values.tokens.space.md)
    expect(look.gap).toBe(themed.values.tokens.space.xs)
  })

  it('MomentControl / BusinessPreorder / ServiceForm: a day is a button of the strip, pressed when selected', () => {
    for (const Day of [MomentDay, PreorderDay, ServiceDay]) {
      const { getByRole, unmount } = renderWith(theme(), (
        <>
          <Day selected>12</Day>
          <Day>13</Day>
        </>
      ))
      const selected = getByRole('button', { name: '12' })
      const rest = getByRole('button', { name: '13' })
      expect(selected).toHaveAttribute('aria-pressed', 'true')
      expect(rest).toHaveAttribute('aria-pressed', 'false')
      expect(cssFor(selected)).toContain('background:#FFEEEE')
      expect(cssFor(selected)).toContain('color:#AA0000')
      expect(cssFor(rest)).toContain('background:transparent')
      expect(cssFor(rest)).toContain('color:#111111')
      expect(cssFor(rest)).toContain('padding:12px 0')
      expect(cssFor(rest)).toContain('border-radius:8px')
      unmount()
    }
  })

  it('the name and the number of a day take name_text / number_text (their weight kept)', () => {
    const { getByText } = renderWith(theme(), (
      <>
        <MomentDayName>Mo</MomentDayName>
        <MomentDayNumber>12</MomentDayNumber>
        <PreorderDayNumber>13</PreorderDayNumber>
      </>
    ))
    expect(cssFor(getByText('Mo'))).toContain('font-size:13px')
    expect(cssFor(getByText('Mo'))).toContain('margin-bottom:4px')
    expect(cssFor(getByText('12'))).toContain('font-size:22px')
    expect(cssFor(getByText('13'))).toContain('font-size:22px')
    expect(dateStripNumberCss(theme())).not.toContain('font-weight')
  })

  it('an appointment keeps its own name and number', () => {
    const { getByText } = renderWith(theme(), <MomentDayNumber isAppoint>12</MomentDayNumber>)
    expect(cssFor(getByText('12'))).not.toContain('font-size:22px')
  })

  it('the helpers paint with the defaults; a day is a button pressed when selected', () => {
    const t = themeWithValues()
    expect(dateStripDayAttrs({ theme: t, selected: true })).toEqual({ as: 'button', type: 'button', 'aria-pressed': true })
    expect(dateStripDayCss(t, true)).not.toBe('')
    expect(dateStripNameCss(t)).not.toBe('')
  })
})
