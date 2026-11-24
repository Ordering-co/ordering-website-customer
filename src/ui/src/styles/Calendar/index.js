import { css } from 'styled-components'
import { getThemeComponent, getThemeCss } from '~/utils/themeCss'
import { themeFontFamily, themeIconSize, themeSpace } from '~/utils/themeTokens'
import { focusRingCss } from '~ui/src/styles/Focus'
import { listChevronMaskCss } from '~ui/src/styles/Chevron'

/* The dates of the theme.
   - components.calendar: a month, one look whatever library draws it
     (react-calendar of WeekCalendarPicker and MomentControl's CustomLayout,
     react-date-range of DatePicker): its box, header, weekdays and days.
   - components.date_strip: a strip of days (the days swiper of MomentControl /
     PreorderDateTimeSteps, BusinessPreorder, ServiceForm). */

const baseOf = (theme, name) => getThemeComponent(theme, name).base

/**
 * The base of components.calendar (`{ background, border, radius, shadow,
 * padding, header_text, header_color, day_size, day_radius, day_background,
 * day_color, day_text, weekday_text, weekday_color, selected_background,
 * selected_color, disabled_background, disabled_color }`).
 */
export const calendarTheme = (theme) => baseOf(theme, 'calendar')

/**
 * The base of components.date_strip (`{ background, color, selected_background,
 * selected_color, radius, border, padding_y, gap, name_text, number_text }`).
 */
export const dateStripTheme = (theme) => baseOf(theme, 'date_strip')

/**
 * The text `key` of a component's base (`name`: calendar, date_strip)
 * without its weight (the weight a text has is kept, decided by Luis): size,
 * line and family (its view's declarations), with the family of its role
 * when the style names none.
 */
export const textWithoutWeight = (theme, name, key, role = 'body') => {
  const css = getThemeCss(theme, name).base[key].css.replace(/font-weight: [^;]*;\n?/, '')
  const family = baseOf(theme, name)[key].family ? '' : `font-family: ${themeFontFamily(theme, role)};`
  return [css, family].filter(Boolean).join('\n')
}

// The calendar's own geometry: the space above and below a day and a weekday,
// the height of its header (a touch target), the space under the header.
const CELL_SPACE = 6
const HEADER_HEIGHT = 44
const HEADER_SPACE = 8

// A declaration
const decl = (prop, value) => `${prop}: ${value};`

/**
 * The calendar of the theme (components.calendar), one look for every month
 * picker, whatever library draws it: react-calendar (`.react-calendar`, the
 * preorder's WeekCalendarPicker and MomentControl's CustomLayout) and
 * react-date-range (`.rdrCalendarWrapper`, the birthday's DatePicker). For the
 * rule of the calendar's wrapper.
 * - its box: background, border, radius, shadow and padding;
 * - its header: the month (header_text, a heading's family, weight 600) in
 *   header_color between two arrows of the icon's lg size, the arrow of an end
 *   it cannot pass in disabled_color;
 * - the weekdays: weekday_text (weight 600) in weekday_color;
 * - each day a box of day_size, day_radius, on day_background in day_color
 *   (day_text, weight 400), CELL_SPACE above and below; selected (or in a
 *   range) on selected_background in selected_color; disabled (or of another
 *   month, react-date-range) on disabled_background in disabled_color; today
 *   and hovered as at rest (the theme has no look for them);
 * - the keyboard focus the theme's ring, on the day's box only (not on the
 *   day's cell around it too).
 */
export const calendarCss = (theme) => {
  const look = getThemeCss(theme, 'calendar').base
  const size = look.day_size
  const cell = `calc(${size} + ${CELL_SPACE * 2}px)`
  const dayRadius = look.day_radius
  // (a number: the arrow is measured from it)
  const icon = theme.values.tokens.icon.lg
  // a chevron as react-date-range's arrow, the size of the icon's one
  const chevron = `${Math.round(icon * 0.32)}px`
  const stroke = `${Math.max(2, Math.round(icon / 12))}px`
  const back = theme?.rtl ? '-45deg' : '135deg'
  const ahead = theme?.rtl ? '135deg' : '-45deg'
  const ring = focusRingCss(theme)
  const box = [
    decl('background', look.background),
    `border: ${look.border};`,
    `border-radius: ${look.radius};`,
    `box-shadow: ${look.shadow.css};`,
    `padding: ${look.padding};`,
    'width: 100%;',
    'max-width: 100%;',
    'box-sizing: border-box;',
    'font-family: inherit;',
    decl('color', look.day_color)
  ].join('\n')
  const header = [textWithoutWeight(theme, 'calendar', 'header_text', 'heading'), 'font-weight: 600;', decl('color', look.header_color)].join('\n')
  const weekday = [textWithoutWeight(theme, 'calendar', 'weekday_text'), 'font-weight: 600;', decl('color', look.weekday_color), 'text-transform: capitalize;'].join('\n')
  const dayText = [textWithoutWeight(theme, 'calendar', 'day_text'), 'font-weight: 400;'].join('\n')
  const day = [decl('background', look.day_background), decl('color', look.day_color)].join('\n')
  const selected = [decl('background', look.selected_background), decl('color', look.selected_color)].join('\n')
  const disabled = [decl('background', look.disabled_background), decl('color', look.disabled_color)].join('\n')
  return css`
    .react-calendar {
      ${box}
      line-height: normal;
      button {
        font-family: inherit;
      }
      abbr {
        text-decoration: none;
      }

      .react-calendar__navigation {
        display: flex;
        align-items: center;
        height: auto;
        min-height: ${HEADER_HEIGHT}px;
        margin: 0 0 ${HEADER_SPACE}px;
      }
      .react-calendar__navigation button,
      .react-calendar__navigation button:enabled:hover,
      .react-calendar__navigation button:enabled:focus,
      .react-calendar__navigation button:disabled {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: ${HEADER_HEIGHT}px;
        min-height: ${HEADER_HEIGHT}px;
        padding: 0;
        border: none;
        background: transparent;
        ${decl('color', look.header_color)}
      }
      .react-calendar__navigation button:disabled {
        ${decl('color', look.disabled_color)}
        cursor: not-allowed;
      }
      .react-calendar__navigation__arrow svg {
        font-size: ${themeIconSize(theme, 'lg')};
        width: 1em;
        height: 1em;
        /* the base Icon's Lucide chevron is an open stroke in the text color: no fill */
        fill: none;
        ${theme?.rtl ? 'transform: rotateZ(180deg);' : ''}
      }
      .react-calendar__navigation__label {
        min-width: 0;
        ${header}
      }
      .react-calendar__navigation__label > span {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .react-calendar__navigation__prev2-button,
      .react-calendar__navigation__next2-button {
        display: none !important;
      }

      .react-calendar__month-view__weekdays {
        ${weekday}
        text-align: center;
      }
      .react-calendar__month-view__weekdays__weekday {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: ${CELL_SPACE}px 0;
      }

      .react-calendar__tile,
      .react-calendar__tile:enabled:hover,
      .react-calendar__tile:enabled:focus,
      .react-calendar__tile--now,
      .react-calendar__tile--now:enabled:hover,
      .react-calendar__tile--now:enabled:focus,
      .react-calendar__tile--active,
      .react-calendar__tile--active:enabled:hover,
      .react-calendar__tile--active:enabled:focus,
      .react-calendar__tile--hasActive,
      .react-calendar__tile:disabled {
        background: transparent;
        border: none;
        margin: 0;
      }
      .react-calendar__month-view__days__day {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: ${CELL_SPACE}px 0;
        ${dayText}
        ${decl('color', look.day_color)}
      }
      .react-calendar__month-view__days__day abbr {
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${size};
        height: ${size};
        border: none;
        border-radius: ${dayRadius};
        ${day}
      }
      .react-calendar__tile--active abbr {
        ${selected}
      }
      /* a month of the year view (the month's label opens it) as a day */
      .react-calendar__year-view .react-calendar__tile,
      .react-calendar__decade-view .react-calendar__tile,
      .react-calendar__century-view .react-calendar__tile {
        ${dayText}
        border-radius: ${dayRadius};
      }
      .react-calendar__tile--hasActive,
      .react-calendar__year-view .react-calendar__tile--active,
      .react-calendar__decade-view .react-calendar__tile--active,
      .react-calendar__century-view .react-calendar__tile--active {
        ${selected}
      }
      .react-calendar__tile:disabled {
        ${decl('color', look.disabled_color)}
        cursor: not-allowed;
      }
      .react-calendar__tile:disabled abbr {
        ${disabled}
      }
      .react-calendar__navigation button:focus-visible,
      .react-calendar__year-view .react-calendar__tile:focus-visible,
      .react-calendar__decade-view .react-calendar__tile:focus-visible,
      .react-calendar__century-view .react-calendar__tile:focus-visible {
        ${ring}
      }
      /* (over the global ring of every button, important) */
      .react-calendar__month-view__days__day:focus-visible {
        outline: none !important;
      }
      .react-calendar__month-view__days__day:focus-visible abbr {
        ${ring}
      }
    }

    .rdrCalendarWrapper {
      ${box}
      display: flex;
      flex-direction: column;
      font-size: inherit;
      button,
      select {
        font-family: inherit;
      }

      .rdrMonthAndYearWrapper {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: auto;
        min-height: ${HEADER_HEIGHT}px;
        padding: 0;
        margin: 0 0 ${HEADER_SPACE}px;
      }
      .rdrNextPrevButton,
      .rdrNextPrevButton:hover {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: ${HEADER_HEIGHT}px;
        height: ${HEADER_HEIGHT}px;
        margin: 0;
        padding: 0;
        border: none;
        border-radius: 0;
        background: transparent;
        ${decl('color', look.header_color)}
        cursor: pointer;
      }
      .rdrNextPrevButton i,
      .rdrPprevButton i,
      .rdrNextButton i {
        display: block;
        width: ${chevron};
        height: ${chevron};
        margin: 0;
        padding: 0;
        border-style: solid;
        border-color: currentColor;
        border-width: 0 ${stroke} ${stroke} 0;
        transform: rotate(${back});
      }
      .rdrNextButton i {
        transform: rotate(${ahead});
      }
      .rdrMonthAndYearPickers {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 0;
      }
      /* the month and year selects: the list chevron of the fields (a mask of
         components.input icon_size) at their end in the header color, not
         the library's background arrow */
      .rdrMonthAndYearPickers select,
      .rdrMonthAndYearPickers select:hover {
        ${header}
        padding-block: 0;
        padding-inline: ${themeSpace(theme, 'sm')} ${themeSpace(theme, 'xxl')};
        background-color: transparent;
        background-image: none;
        border-radius: 0;
      }
      .rdrMonthPicker,
      .rdrYearPicker {
        position: relative;
        display: inline-flex;
        align-items: center;
        ${decl('color', look.header_color)}
      }
      .rdrMonthPicker::after,
      .rdrYearPicker::after {
        content: '';
        position: absolute;
        inset-inline-end: ${themeSpace(theme, 'sm')};
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        ${listChevronMaskCss(theme)}
      }
      .rdrMonths,
      .rdrMonth {
        width: 100%;
      }
      .rdrMonth,
      .rdrMonth .rdrWeekDays {
        padding: 0;
      }

      .rdrWeekDay {
        ${weekday}
        padding: ${CELL_SPACE}px 0;
      }

      .rdrDay {
        height: ${cell};
        line-height: normal;
        padding: 0;
        border: none;
        background: transparent;
        ${dayText}
        ${decl('color', look.day_color)}
      }
      .rdrDayNumber {
        box-sizing: border-box;
        top: ${CELL_SPACE}px;
        bottom: auto;
        left: 50%;
        right: auto;
        width: ${size};
        height: ${size};
        transform: translateX(-50%);
        border-radius: ${dayRadius};
        font-weight: inherit;
        ${day}
      }
      .rdrDayNumber span,
      .rdrDayToday .rdrDayNumber span {
        font-weight: inherit;
        ${decl('color', look.day_color)}
      }
      .rdrDayToday .rdrDayNumber span:after,
      .rdrDay.rdrDayHovered .rdrDayNumber:after {
        display: none;
      }
      .rdrSelected,
      .rdrInRange,
      .rdrStartEdge,
      .rdrEndEdge,
      .rdrDayStartPreview,
      .rdrDayInPreview,
      .rdrDayEndPreview {
        display: none;
      }
      .rdrDay:not(.rdrDayPassive) .rdrSelected ~ .rdrDayNumber,
      .rdrDay:not(.rdrDayPassive) .rdrInRange ~ .rdrDayNumber,
      .rdrDay:not(.rdrDayPassive) .rdrStartEdge ~ .rdrDayNumber,
      .rdrDay:not(.rdrDayPassive) .rdrEndEdge ~ .rdrDayNumber {
        ${selected}
      }
      .rdrDay:not(.rdrDayPassive) .rdrSelected ~ .rdrDayNumber span,
      .rdrDay:not(.rdrDayPassive) .rdrInRange ~ .rdrDayNumber span,
      .rdrDay:not(.rdrDayPassive) .rdrStartEdge ~ .rdrDayNumber span,
      .rdrDay:not(.rdrDayPassive) .rdrEndEdge ~ .rdrDayNumber span {
        ${decl('color', look.selected_color)}
      }
      .rdrDayDisabled {
        background: transparent;
        cursor: not-allowed;
      }
      .rdrDayPassive .rdrDayNumber,
      .rdrDayDisabled .rdrDayNumber {
        ${disabled}
      }
      .rdrDayPassive .rdrDayNumber span,
      .rdrDayDisabled .rdrDayNumber span {
        ${decl('color', look.disabled_color)}
      }
      .rdrNextPrevButton:focus-visible,
      .rdrMonthAndYearPickers select:focus-visible {
        ${ring}
      }
      /* (over the global ring of every button, important) */
      .rdrDay:focus-visible {
        outline: none !important;
      }
      .rdrDay:focus-visible .rdrDayNumber {
        ${ring}
      }
    }
  `
}

/**
 * The color of the selected day of react-date-range (its `color` prop, the
 * color of its own marks under the theme's), selected_background of
 * components.calendar.
 */
export const calendarSelectedColor = (theme) => calendarTheme(theme).selected_background

/**
 * The attributes of a day of a strip of days (`selected`): a button,
 * pressed when selected.
 */
export const dateStripDayAttrs = ({ selected }) => ({ as: 'button', type: 'button', 'aria-pressed': !!selected })

/**
 * A day of a strip of days (a button) in components.date_strip: its colors at
 * rest and selected, rounding, border and the space above and below; hovered it
 * stays as it is (the theme has no hover for it); the keyboard focus the
 * theme's ring.
 */
export const dateStripDayCss = (theme, selected) => {
  const look = getThemeCss(theme, 'date_strip').base
  return css`
    width: 100%;
    font-family: inherit;
    box-sizing: border-box;
    padding: ${look.padding_y} 0;
    border: ${look.border};
    border-radius: ${look.radius};
    &, &:hover {
      opacity: 1;
      background: ${selected ? look.selected_background : look.background};
      color: ${selected ? look.selected_color : look.color};
    }
    &:focus-visible {
      ${focusRingCss(theme)}
    }
  `
}

/**
 * The weekday name of a day of the strip (name_text, its weight kept) and the
 * space under it (gap).
 */
export const dateStripNameCss = (theme) => {
  return [textWithoutWeight(theme, 'date_strip', 'name_text'), `margin-bottom: ${getThemeCss(theme, 'date_strip').base.gap};`].join('\n')
}

/**
 * The number of a day of the strip (number_text, a heading's family, its weight
 * kept).
 */
export const dateStripNumberCss = (theme) => {
  return textWithoutWeight(theme, 'date_strip', 'number_text', 'heading')
}
