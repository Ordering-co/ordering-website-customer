import { AccordionTrigger } from '~ui/src/design-system/components/Accordion'
import React, { useId, useState, useEffect, useLayoutEffect, useRef } from 'react'
import moment from 'moment'

import {
  StepsContainer,
  AccordionStep,
  AccordionBody,
  AccordionBodyInner,
  StepBadge,
  HeaderText,
  StepTitle,
  StepSubtitle,
  StepSelectedValue,
  StepHint,
  TimeGrid,
  TimeGridLabel
} from './styles'

import { RadioGroup } from '~ui/src/design-system/components/Checkbox'
import { Choice } from '~ui/src/design-system/components/Choice'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { getMaxPreorderDays } from '~components/utils/configHelpers'
import { DayStrip, firstAvailableDate, fullDateLabel, dayIsClosed } from './DayStrip'
import { useDateFnsLocale } from '~ui/hooks/useDateFnsLocale'

import { ChevronIcon } from '~ui/src/styles/Chevron'
import { slotUserDate } from '~/utils/businessTime'

const STEP_DATE = 'date'
const STEP_TIME = 'time'

export const PreorderDateTimeSteps = (props) => {
  const {
    datesList,
    dateSelected,
    timeSelected,
    timeList,
    isEnabled,
    handleChangeDate,
    handleChangeTime,
    configs,
    cateringPreorder,
    preorderMinimumDays,
    preorderMaximumDays,
    maxDays,
    isProfessional,
    isDisabled,
    formatTimeDisplay,
    is12Hours,
    showTimeRange,
    business,
    getMomentTime,
    isBusyTime,
    closedMessage,
    hasExistingMoment,
    scheduleSelected,
    selectedSlot,
    ClosedBusinessMsg
  } = props

  const [, t] = useLanguage()
  const [orderState] = useOrder()
  const dateLocale = useDateFnsLocale()
  const maxPreorderDays = getMaxPreorderDays(configs, orderState?.options?.type)

  const hasScheduledMoment = !!(hasExistingMoment || scheduleSelected || timeSelected)

  const [dateConfirmed, setDateConfirmed] = useState(hasScheduledMoment)
  const [timeDraft, setTimeDraft] = useState(null)
  const [expandedStep, setExpandedStep] = useState(hasScheduledMoment ? null : STEP_DATE)
  const timeTrigger = useRef(null)
  const focusTimeAfterSelection = useRef(false)

  useLayoutEffect(() => {
    if (focusTimeAfterSelection.current) {
      focusTimeAfterSelection.current = false
      timeTrigger.current?.focus()
    }
  }, [expandedStep])

  useEffect(() => {
    if (hasExistingMoment || scheduleSelected) {
      setDateConfirmed(true)
      // An earlier confirmation can arrive while the time group is open.
      // Keep the user's current exploration and focus in place.
      setExpandedStep(current => current === STEP_TIME ? current : null)
    }
  }, [hasExistingMoment, scheduleSelected])

  // Arrows preview a time in the group. Only activation confirms it.
  const currentTime = timeDraft?.date === dateSelected && timeList?.some(time => time.value === timeDraft?.value)
    ? timeDraft.value
    : timeSelected ?? null

  const onSelectDate = (date) => {
    setTimeDraft(null)
    handleChangeDate(date)
    focusTimeAfterSelection.current = true
    setDateConfirmed(true)
    setExpandedStep(STEP_TIME)
  }

  const onSelectTime = (time) => {
    timeTrigger.current?.focus({ preventScroll: true })
    setTimeDraft(null)
    handleChangeTime(time)
    focusTimeAfterSelection.current = true
    setExpandedStep(null)
  }

  const toggleDateStep = () => {
    if (!dateConfirmed) return
    setExpandedStep(expandedStep === STEP_DATE ? null : STEP_DATE)
  }

  const toggleTimeStep = () => {
    if (!dateConfirmed) return
    setTimeDraft(null)
    setExpandedStep(expandedStep === STEP_TIME ? null : STEP_TIME)
  }

  const datesSliceStart = (cateringPreorder && preorderMinimumDays) || 0
  const resolvedDays = cateringPreorder ? preorderMaximumDays : (maxDays ?? maxPreorderDays)
  const datesSliceEnd = resolvedDays > 0 ? Number(resolvedDays) : 0
  const visibleDates = datesList.slice(datesSliceStart, datesSliceEnd)

  // Today (or the window's first day) closed, or the first few days
  // closed: name the first open one instead of preselecting anything.
  const firstAvailable = visibleDates.length > 0 && dayIsClosed(visibleDates[0], business)
    ? firstAvailableDate(visibleDates, business)
    : null

  const formattedSelectedDate = dateSelected
    ? moment(dateSelected).format('dddd, MMM D')
    : ''

  // The days are the business's and a slot's time is the user's: a slot
  // that falls on another day of the user's than the day it is under (zones
  // hours apart) names the user's day, e.g. "02:00 · Wed 21"
  const slotDayTag = (slot) => {
    const userDate = slotUserDate(slot, dateSelected)
    return userDate ? ` · ${moment(userDate, 'YYYY-MM-DD').format('ddd D')}` : ''
  }

  const formattedSelectedTime = timeSelected && formatTimeDisplay
    ? (() => {
        // the picked slot, or the one given when it is no longer listed (a
        // stored time already past or inside the lead time)
        const slot = timeList?.find(item => item.value === timeSelected) || (selectedSlot?.value === timeSelected ? selectedSlot : null)
        if (!slot) return timeSelected
        const parts = formatTimeDisplay(slot.text)
        if (!parts) return timeSelected
        return (parts.period ? `${parts.hours}:${parts.minutes} ${parts.period}` : `${parts.hours}:${parts.minutes}`) + slotDayTag(slot)
      })()
    : ''

  const isDateExpanded = expandedStep === STEP_DATE
  const isTimeExpanded = expandedStep === STEP_TIME
  const isDateCollapsed = dateConfirmed && !isDateExpanded
  const isTimeCollapsed = !!timeSelected && !isTimeExpanded

  const renderDatePicker = () => (
    <>
      <DayStrip
        dates={visibleDates}
        dateSelected={dateSelected}
        dateConfirmed={dateConfirmed}
        business={business}
        onSelectDate={onSelectDate}
      />
      {firstAvailable && (
        <StepHint>
          {t('PREORDER_FIRST_AVAILABLE_DATE', 'First available day: _date_').replace('_date_', fullDateLabel(firstAvailable, dateLocale))}
        </StepHint>
      )}
    </>
  )

  const stepId = useId()

  return (
    <StepsContainer data-doc-section='business-preorder-date-time'>
      <AccordionStep data-doc-section='business-preorder-date-step' data-doc-state={isDateExpanded ? 'expanded' : 'collapsed'}>
        <AccordionTrigger
          data-doc-control='business-preorder-date-step-toggle'
          variant='step-header'
          expanded={isDateExpanded}
          aria-controls={`${stepId}-date`}
          onClick={dateConfirmed ? toggleDateStep : undefined}
          disabled={!dateConfirmed}
        >
          <StepBadge completed={dateConfirmed} active={!dateConfirmed || isDateExpanded}>1</StepBadge>
          <HeaderText>
            <StepTitle>{t('CHOOSE_DATE', 'Choose Date')}</StepTitle>
            {isDateCollapsed
              ? (
                <StepSelectedValue>{formattedSelectedDate}</StepSelectedValue>
                )
              : (
                <StepSubtitle>
                  {t('PREORDER_DATE_HINT', 'Only available days can be selected')}
                </StepSubtitle>
                )}
          </HeaderText>
          {dateConfirmed && (
            <ChevronIcon kind='disclose' open={isDateExpanded} />
          )}
        </AccordionTrigger>
        <AccordionBody id={`${stepId}-date`} inert={isDateExpanded || !dateConfirmed ? undefined : ''} aria-hidden={!(isDateExpanded || !dateConfirmed) || undefined} isExpanded={isDateExpanded || !dateConfirmed}>
          <AccordionBodyInner>
            {renderDatePicker()}
          </AccordionBodyInner>
        </AccordionBody>
      </AccordionStep>

      <AccordionStep
        data-doc-section='business-preorder-time-step'
        data-doc-state={!dateConfirmed ? 'locked' : (isTimeExpanded ? 'expanded' : 'collapsed')}
        isLocked={!dateConfirmed}
      >
        <AccordionTrigger
          ref={timeTrigger}
          data-doc-control='business-preorder-time-step-toggle'
          variant='step-header'
          expanded={isTimeExpanded}
          aria-controls={`${stepId}-time`}
          onClick={dateConfirmed ? toggleTimeStep : undefined}
          disabled={!dateConfirmed}
        >
          <StepBadge completed={!!timeSelected} active={dateConfirmed && (!timeSelected || isTimeExpanded)}>2</StepBadge>
          <HeaderText>
            <StepTitle>{t('CHOOSE_TIME', 'Choose Time')}</StepTitle>
            {isTimeCollapsed
              ? (
                <StepSelectedValue>{formattedSelectedTime}</StepSelectedValue>
                )
              : (
                <StepSubtitle>
                  {!dateConfirmed
                    ? t('PREORDER_SELECT_DATE_FIRST', 'Select a day first to see available times')
                    : t('PREORDER_TIME_HINT', 'Pick a time slot for your order')}
                </StepSubtitle>
                )}
          </HeaderText>
          {dateConfirmed && (
            <ChevronIcon kind='disclose' open={isTimeExpanded} />
          )}
        </AccordionTrigger>
        <AccordionBody id={`${stepId}-time`} inert={isTimeExpanded ? undefined : ''} aria-hidden={!isTimeExpanded || undefined} isExpanded={isTimeExpanded}>
          <AccordionBodyInner>
            {!dateConfirmed && (
              <StepHint>{t('PREORDER_SELECT_DATE_FIRST', 'Select a day first to see available times')}</StepHint>
            )}
            {dateConfirmed && (isEnabled && timeList?.length > 0)
              ? (
                <RadioGroup
                  render={<TimeGrid />}
                  aria-label={t('ORDER_TIME', 'Order time')}
                  value={currentTime}
                  onValueChange={value => setTimeDraft({ date: dateSelected, value })}
                >
                  {timeList.map((time, i) => {
                    const startParts = formatTimeDisplay(time.text) || {}
                    const startLabel = `${startParts.hours}:${startParts.minutes}${startParts.period ? ` ${startParts.period}` : ''}`
                    // For delivery, show a window (e.g. "9:00 AM – 9:30 AM"); for
                    // pickup keep the exact start time. Display-only — the stored
                    // value is still time.value.
                    const endParts = (showTimeRange && time.endText) ? (formatTimeDisplay(time.endText) || null) : null
                    const endLabel = endParts ? `${endParts.hours}:${endParts.minutes}${endParts.period ? ` ${endParts.period}` : ''}` : ''
                    const busy = isProfessional && isBusyTime?.(business, getMomentTime?.(time.value))
                    return (
                      // an option of components.choice
                      <Choice
                        variant='time-slot'
                        data-doc-control='business-preorder-time-slot'
                        data-doc-time={time.value}
                        data-doc-selected={currentTime === time.value ? 'true' : 'false'}
                        key={i}
                        value={time.value}
                        disabled={isDisabled || busy}
                        busy={busy}
                        onActivate={() => onSelectTime(time.value)}
                      >
                        <TimeGridLabel is12Hours={is12Hours}>
                          {(endLabel ? `${startLabel} – ${endLabel}` : startLabel) + slotDayTag(time)}
                        </TimeGridLabel>
                      </Choice>
                    )
                  })}
                </RadioGroup>
                )
              : dateConfirmed && (
                <ClosedBusinessMsg>
                  {closedMessage || (!isProfessional
                    ? t('ERROR_ADD_PRODUCT_BUSINESS_CLOSED', 'The business is closed at the moment')
                    : t('PROFESSIONAL_NOT_AVAILABLE', 'Professional is not available at the moment'))}
                </ClosedBusinessMsg>
              )}
          </AccordionBodyInner>
        </AccordionBody>
      </AccordionStep>
    </StepsContainer>
  )
}
