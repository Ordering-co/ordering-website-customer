import React from 'react'
import {
  AccordionSection,
  ClosedSchedule
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'

// A day of the store's weekly schedule: its name and its hours (or Closed)
export const ScheduleAccordion = (props) => {
  const {
    lapseText,
    schedule,
    weekIndex
  } = props

  const [, t] = useLanguage()

  const daysOfWeek = [
    t('DAY7', 'Sunday'),
    t('DAY1', 'Monday'),
    t('DAY2', 'Tuesday'),
    t('DAY3', 'Wednesday'),
    t('DAY4', 'Thursday'),
    t('DAY5', 'Friday'),
    t('DAY6', 'Saturday')
  ]

  // the day's lapses (as lapseText writes them), or Closed once
  const isOpen = !!schedule?.enabled && schedule?.lapses?.length > 0
  const hours = isOpen
    ? schedule.lapses.map((lapse, i) => <p key={i}>{lapseText(lapse)}</p>)
    : <ClosedSchedule>{t('CLOSED', 'Closed')}</ClosedSchedule>

  return (
    <AccordionSection isClosed={!isOpen}>
      <div className='info-wrapper'>
        <span className='day'>{daysOfWeek[weekIndex]}</span>
        <div className='hours'>
          {hours}
        </div>
      </div>
    </AccordionSection>
  )
}
