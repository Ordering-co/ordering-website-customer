import moment from 'moment'
import { useLanguage } from '~components/contexts/LanguageContext'

export const getUtils = () => {
  const [, t] = useLanguage()
  const setLocalMoment = () => {
    moment.updateLocale('custom', {
      months: [
        t('MONTH1', 'January'),
        t('MONTH2', 'February'),
        t('MONTH3', 'March'),
        t('MONTH4', 'April'),
        t('MONTH5', 'May'),
        t('MONTH6', 'June'),
        t('MONTH7', 'July'),
        t('MONTH8', 'August'),
        t('MONTH9', 'September'),
        t('MONTH10', 'October'),
        t('MONTH11', 'November'),
        t('MONTH12', 'December')
      ],
      monthsShort: [
        t('MONTHSHORT1', 'Jan'),
        t('MONTHSHORT2', 'Feb'),
        t('MONTHSHORT3', 'Mar'),
        t('MONTHSHORT4', 'Apr'),
        t('MONTHSHORT5', 'May'),
        t('MONTHSHORT6', 'Jun'),
        t('MONTHSHORT7', 'Jul'),
        t('MONTHSHORT8', 'Aug'),
        t('MONTHSHORT9', 'Sep'),
        t('MONTHSHORT10', 'Oct'),
        t('MONTHSHORT11', 'Nov'),
        t('MONTHSHORT12', 'Dec')
      ],
      weekdays: [
        t('DAY7', 'Sunday'),
        t('DAY1', 'Monday'),
        t('DAY2', 'Tuesday'),
        t('DAY3', 'Wednesday'),
        t('DAY4', 'Thursday'),
        t('DAY5', 'Friday'),
        t('DAY6', 'Saturday')
      ],
      weekdaysShort: [
        t('DAYSHORT7', 'Sun'),
        t('DAYSHORT1', 'Mon'),
        t('DAYSHORT2', 'Tue'),
        t('DAYSHORT3', 'Wed'),
        t('DAYSHORT4', 'Thu'),
        t('DAYSHORT5', 'Fri'),
        t('DAYSHORT6', 'Sat')
      ],
      weekdaysMin: [
        t('DAYMIN7', 'Su'),
        t('DAYMIN1', 'Mo'),
        t('DAYMIN2', 'Tu'),
        t('DAYMIN3', 'We'),
        t('DAYMIN4', 'Th'),
        t('DAYMIN5', 'Fr'),
        t('DAYMIN6', 'Sa')
      ],
      meridiem: function (hours) {
        return hours < 12 ? t('AM', 'AM') : t('PM', 'PM')
      }
    })
  }

  return {
    setLocalMoment
  }
}
