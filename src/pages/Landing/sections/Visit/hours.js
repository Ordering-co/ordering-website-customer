// The week of the store's hours as rows: the days that share the same hours, in a row, are one row
// ("Mon - Fri"). `week` is userWeeklySchedule (index 0-6, Sunday first); the rows start on Monday.
const FROM_MONDAY = [1, 2, 3, 4, 5, 6, 0]

/**
 * @param {Array} week userWeeklySchedule(...)
 * @param {(lapse) => string} lapseText how a lapse reads ("9:00 - 21:00")
 * @param {{ full: string[], short: string[] }} names day names by index (Sunday first)
 * @param {string} closed
 * @returns {{ days: string, hours: string }[]} none when no day is open (a store with no schedule)
 */
export const hoursRows = (week, lapseText, names, closed) => {
  if (!week.some((day) => day?.enabled && day.lapses.length)) return []
  const days = FROM_MONDAY.map((index) => {
    const day = week[index]
    return { index, hours: day?.enabled && day.lapses.length ? day.lapses.map(lapseText).join(', ') : closed }
  })
  const rows = []
  days.forEach((day) => {
    const last = rows[rows.length - 1]
    if (last && last.hours === day.hours) last.indexes.push(day.index)
    else rows.push({ hours: day.hours, indexes: [day.index] })
  })
  return rows.map(({ hours, indexes }) => ({
    hours,
    days: indexes.length === 1 ? names.full[indexes[0]] : `${names.short[indexes[0]]} - ${names.short[indexes[indexes.length - 1]]}`
  }))
}
