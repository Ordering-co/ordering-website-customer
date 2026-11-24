import { describe, expect, it } from 'vitest'
import { hoursRows } from '../hours'

const open = (text) => ({ enabled: true, lapses: [text] })
const closedDay = { enabled: false, lapses: [] }
const names = {
  full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
}
const text = (lapse) => lapse

describe('hoursRows', () => {
  it('groups the consecutive days with the same hours, starting on Monday', () => {
    const week = [open('8 - 19'), open('7 - 21'), open('7 - 21'), open('7 - 21'), open('7 - 21'), open('7 - 21'), open('8 - 21')]
    expect(hoursRows(week, text, names, 'Closed')).toEqual([
      { days: 'Mon - Fri', hours: '7 - 21' },
      { days: 'Saturday', hours: '8 - 21' },
      { days: 'Sunday', hours: '8 - 19' }
    ])
  })

  it('a closed day reads Closed, several lapses are joined, and equal hours apart stay apart', () => {
    const split = { enabled: true, lapses: ['9 - 14', '17 - 22'] }
    const week = [closedDay, split, closedDay, split, split, split, closedDay]
    expect(hoursRows(week, text, names, 'Closed')).toEqual([
      { days: 'Monday', hours: '9 - 14, 17 - 22' },
      { days: 'Tuesday', hours: 'Closed' },
      { days: 'Wed - Fri', hours: '9 - 14, 17 - 22' },
      { days: 'Sat - Sun', hours: 'Closed' }
    ])
  })

  it('no day open: no rows', () => {
    expect(hoursRows(Array.from({ length: 7 }, () => closedDay), text, names, 'Closed')).toEqual([])
  })
})
