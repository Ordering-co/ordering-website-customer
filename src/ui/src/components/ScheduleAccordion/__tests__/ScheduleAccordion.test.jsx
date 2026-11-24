import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { ScheduleAccordion } from '../index'

describe('ScheduleAccordion', () => {
  it('the day and its hours', () => {
    const { getByText } = renderWithProviders(
      <ScheduleAccordion
        weekIndex={1}
        schedule={{ enabled: true, lapses: [{ open: { hour: 9, minute: 0 }, close: { hour: 17, minute: 0 } }] }}
        lapseText={(l) => `${l.open.hour}:${String(l.open.minute).padStart(2, '0')} - ${l.close.hour}:${String(l.close.minute).padStart(2, '0')}`}
      />
    )
    expect(getByText('Monday')).toBeInTheDocument()
    expect(getByText('9:00 - 17:00')).toBeInTheDocument()
  })

  it('a plain row: no toggle, no chevron', () => {
    const { container } = renderWithProviders(
      <ScheduleAccordion weekIndex={1} schedule={{ enabled: true, lapses: [{ id: 1 }] }} lapseText={() => '9:00 - 17:00'} />
    )
    expect(container.querySelector('button, [role="button"], [data-testid^="icon-"]')).toBeNull()
  })

  it('shows closed label when schedule is disabled', () => {
    const { getByText } = renderWithProviders(
      <ScheduleAccordion
        weekIndex={0}
        schedule={{ enabled: false, lapses: [{ open: { hour: 9, minute: 0 }, close: { hour: 17, minute: 0 } }] }}
        lapseText={() => 'never shown'}
      />
    )
    expect(getByText('Closed')).toBeInTheDocument()
  })

  it('a day with no lapses (enabled or not) is Closed, once', () => {
    const { getAllByText } = renderWithProviders(
      <ScheduleAccordion
        weekIndex={2}
        schedule={{ enabled: true, lapses: [] }}
        lapseText={() => 'never shown'}
      />
    )
    expect(getAllByText('Closed')).toHaveLength(1)
  })

  it('a day with two lapses shows each as its own paragraph', () => {
    const lapses = [{ id: 1 }, { id: 2 }]
    const texts = ['11:00 AM - 3:00 PM', '5:00 PM - 10:59 PM']
    const { getByText, container } = renderWithProviders(
      <ScheduleAccordion
        weekIndex={1}
        schedule={{ enabled: true, lapses }}
        lapseText={(l) => texts[l.id - 1]}
      />
    )
    expect(getByText(texts[0])).toBeInTheDocument()
    expect(getByText(texts[1])).toBeInTheDocument()
    expect(container.querySelectorAll('.hours p')).toHaveLength(2)
    expect(window.getComputedStyle(container.querySelector('.hours')).flexDirection).toBe('column')
  })

  it('a lapse is written by lapseText (e.g. the day it closes)', () => {
    const { getByText } = renderWithProviders(
      <ScheduleAccordion
        weekIndex={3}
        schedule={{ enabled: true, lapses: [{ id: 1 }] }}
        lapseText={() => '21:00 - 04:00 (Thu)'}
      />
    )
    expect(getByText('Wednesday')).toBeInTheDocument()
    expect(getByText('21:00 - 04:00 (Thu)')).toBeInTheDocument()
  })
})
