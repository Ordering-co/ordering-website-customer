import React, { useState, useEffect } from 'react'
import moment from 'moment'
import 'react-calendar/dist/Calendar.css'
import Calendar from 'react-calendar'
import {
  LayoutContainer,
  CalendarWrapper,
  TimeListWrapper,
  TimeItem,
  ClosedBusinessMsg
} from './styles'

import { useConfig } from '~components/contexts/ConfigContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { getMaxPreorderDays } from '~components/utils/configHelpers'
import { intlLocaleOf } from '~ui/hooks/useDateFnsLocale'
import { slotUserDate } from '~/utils/businessTime'

import { Icon } from '~ui/src/design-system/components/Icon'

export const CustomLayout = (props) => {
  const {
    datesList,
    dateSelected,
    handleChangeDate,

    isEnabled,
    timeList,
    timeSelected,
    handleChangeTime
  } = props

  const [{ configs }] = useConfig()
  const [orderState] = useOrder()
  const [languageState, t] = useLanguage()
  const maxPreorderDays = getMaxPreorderDays(configs, orderState?.options?.type)
  const [value, onChange] = useState(new Date())
  const [minDate, setMinDate] = useState(new Date())
  const [maxDate, setMaxDate] = useState(new Date())

  const onDateChange = (value) => {
    onChange(value)
    if (handleChangeDate) {
      const date = (value.getDate() < 10 ? '0' : '') + value.getDate()
      const month = ((value.getMonth() + 1) < 10 ? '0' : '') + (value.getMonth() + 1)
      const year = value.getFullYear()
      const fullDate = `${year}-${month}-${date}`
      handleChangeDate(fullDate)
    }
  }

  const formatMonthYear = (date) => {
    return moment(date).format('MMMM')
  }

  const formatShortWeekday = (date) => {
    return moment(date).format('dd')
  }

  const formatDay = (date) => {
    const minMon = moment(minDate).format('MM')
    const maxMon = moment(maxDate).format('MM')
    const currMon = moment(date).format('MM')
    return ((minMon === currMon) || (maxMon === currMon)) ? moment(date).format('D') : ''
  }

  useEffect(() => {
    if (datesList?.length > 0) {
      const _datesList = datesList.slice(0, maxPreorderDays > 0 ? maxPreorderDays : 0)
      if (_datesList.length === 0) return
      const minDateParts = _datesList[0].split('-')
      const maxDateParts = _datesList[_datesList.length - 1].split('-')
      const _minDate = new Date(minDateParts[0], minDateParts[1] - 1, minDateParts[2])
      const _maxDate = new Date(maxDateParts[0], maxDateParts[1] - 1, maxDateParts[2])
      setMinDate(_minDate)
      setMaxDate(_maxDate)
    }
  }, [datesList, maxPreorderDays])

  return (
    <LayoutContainer>
      <CalendarWrapper>
        <Calendar
          onChange={(val) => onDateChange(val)}
          value={value}
          next2Label=''
          prev2Label=''
          prevLabel={<Icon name='keyboardArrowLeft' />}
          nextLabel={<Icon name='keyboardArrowRight' />}
          prevAriaLabel={t('PREVIOUS', 'Previous')}
          nextAriaLabel={t('NEXT', 'Next')}
          minDate={minDate}
          maxDate={maxDate}
          formatMonthYear={(locale, date) => formatMonthYear(date)}
          formatShortWeekday={(locale, date) => formatShortWeekday(date)}
          formatDay={(locale, date) => formatDay(date)}
          // react-calendar's own texts (the days' labels) in the site's language
          locale={intlLocaleOf(languageState?.language?.code)}
          calendarType='US'
        />
      </CalendarWrapper>
      <TimeListWrapper>
        {(isEnabled && timeList?.length > 0)
          ? (
          <>
            {timeList.map((time, i) => (
              <TimeItem
                key={i}
                active={timeSelected === time.value}
                onClick={() => handleChangeTime(time.value)}
              >
                {/* the user's time; the user's day when it is another one than the business's */}
                <span>{time.text}{slotUserDate(time, dateSelected) ? ` · ${moment(time.userDate, 'YYYY-MM-DD').format('ddd D')}` : ''}</span>
              </TimeItem>
            ))}
          </>
            )
          : (
          <ClosedBusinessMsg>{t('ERROR_ADD_PRODUCT_BUSINESS_CLOSED', 'The business is closed at the moment')}</ClosedBusinessMsg>
            )}
      </TimeListWrapper>
    </LayoutContainer>
  )
}
