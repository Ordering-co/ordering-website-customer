import React, { useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import moment from 'moment'
import { useTheme } from 'styled-components'

import {
  BusinessPreorderContainer,
  LogoWrapper,
  BusinessLogo,
  PreorderTypeWrapper,
  SelectWrapper,
  OrderTimeWrapper,
  Title,
  ButtonWrapper,
  TypeContent,
  Layer,
  ClosedBusinessMsg,
  Divider,
  ScheduleBody
} from './styles'

import { useUtils } from '~components/contexts/UtilsContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { MomentOption } from '~components/components/MomentOption'
import { useConfig } from '~components/contexts/ConfigContext'
import { useOrder } from '~components/contexts/OrderContext'
import { createDayjsWithTimezone, parseBusinessDateTime, getPreorderMaxDate } from '~components/constants/timezones'
import { businessCalendarDate, businessSlotForUser, isProfessionalBusy } from '~/utils/businessTime'

import { Select } from '~ui/src/design-system/components/Select'
import { Button } from '~ui/src/design-system/components/Button'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { SpinnerLoader } from '~ui/src/components/SpinnerLoader'
import { getTimes } from '~ui/utils'
import { BusinessMenuList } from '~ui/src/components/BusinessMenuList'
import { PreorderDateTimeSteps } from '~ui/src/components/PreorderDateTimeSteps'

import { Icon } from '~ui/src/design-system/components/Icon'
import { ModalHeading, ModalTitleContext } from '~ui/src/components/Overlay/ModalHeading'
import { modalSectionLevel } from '~ui/src/components/Overlay/titleLevel'
import { businessLogoPlaceholder } from '~/utils/themeTokens'
import { themeVisible } from '~/utils/themeVisibility'

const BusinessPreorderUI = (props) => {
  const {
    business,
    handleClick,
    datesList,
    dateSelected,
    timeSelected,
    handleChangeDate,
    handleChangeTime,
    showButton,
    isAsap,
    handleAsap,
    isProfessional,
    isDisabled,
    maxDays,
    hoursList,
    cateringPreorder,
    preorderLeadTime,
    getActualSchedule,
    scheduleSelected,
    buttonText
  } = props

  const { pathname } = useLocation()
  const [{ optimizeImage, is12Hours }] = useUtils()
  const theme = useTheme()
  // "Order time" is a section of the modal (its title in the
  // modal's row) or of the preorder (under its h2)
  const inModal = !!useContext(ModalTitleContext)
  const OrderTimeHeading = inModal ? modalSectionLevel(theme) : 'h3'
  const [{ configs }] = useConfig()
  const [orderState] = useOrder()
  const [, t] = useLanguage()
  const windowSize = useWindowSize()

  const [type, setType] = useState(null)
  const [menu, setMenu] = useState(null)
  const [timeList, setTimeList] = useState([])
  const [isEnabled, setIsEnabled] = useState(false)

  const isPreOrderSetting = configs?.preorder_status_enabled?.value === '1'
  // the store's logo and name under the title, off by default (visibility
  // business.preorder.logo)
  const hideBusinessNameLogo = !themeVisible(theme, 'business.preorder.logo')

  const businessTimezone = business?.timezone
  const businessNow = () => businessTimezone ? createDayjsWithTimezone(businessTimezone) : moment()

  const isSlotWithinSchedule = (hour, schedule) => {
    return schedule?.lapses?.some((lapse) => {
      const openHour = lapse.open.hour < 10 ? `0${lapse.open.hour}` : lapse.open.hour
      const openMinute = lapse.open.minute < 10 ? `0${lapse.open.minute}` : lapse.open.minute
      const closeHour = lapse.close.hour < 10 ? `0${lapse.close.hour}` : lapse.close.hour
      const closeMinute = lapse.close.minute < 10 ? `0${lapse.close.minute}` : lapse.close.minute
      const slotStart = businessTimezone
        ? parseBusinessDateTime(dateSelected, hour.startTime, businessTimezone)
        : moment(`${dateSelected} ${hour.startTime}`)
      const slotEnd = businessTimezone
        ? parseBusinessDateTime(dateSelected, hour.endTime, businessTimezone)
        : moment(`${dateSelected} ${hour.endTime}`)
      const openTime = businessTimezone
        ? parseBusinessDateTime(dateSelected, `${openHour}:${openMinute}`, businessTimezone).add(preorderLeadTime, 'minutes')
        : moment(`${dateSelected} ${openHour}:${openMinute}`).add(preorderLeadTime, 'minutes')
      const closeTime = businessTimezone
        ? parseBusinessDateTime(dateSelected, `${closeHour}:${closeMinute}`, businessTimezone)
        : moment(`${dateSelected} ${closeHour}:${closeMinute}`)
      return slotStart.valueOf() >= openTime.valueOf() && slotEnd.valueOf() <= closeTime.valueOf()
    })
  }

  const isFutureSlot = (hour) => {
    const slotStart = businessTimezone
      ? parseBusinessDateTime(dateSelected, hour.startTime, businessTimezone)
      : moment(`${dateSelected} ${hour.startTime}`)
    const earliest = businessNow().add(preorderLeadTime, 'minutes')
    return earliest.isBefore(slotStart) || !cateringPreorder
  }

  const preOrderType = [
    { value: 'business_menu', content: <TypeContent>{t('BUSINESS_MENU', 'Business menu')}</TypeContent> },
    { value: 'business_hours', content: <TypeContent>{t('BUSINESS_HOURS', 'Business hours')}</TypeContent> }
  ]

  const goToBusinessPage = () => {
    handleClick && handleClick(business)
  }

  const validateSelectedDate = (curdate, menu) => {
    const day = businessTimezone
      ? businessCalendarDate(curdate, businessTimezone).day()
      : moment(curdate).format('d')
    setIsEnabled(menu.schedule[day].enabled || false)
  }

  const getMomentTime = (time) => {
    if (businessTimezone) {
      return parseBusinessDateTime(dateSelected, time, businessTimezone).toDate()
    }
    return moment(`${moment(dateSelected).format('YYYY-MM-DD')} ${time}`, 'YYYY-MM-DD HH:mm').toDate()
  }

  // a professional's slot: inside their day (their zone, the
  // `business.timezone` given here) and clear of their busy times (UTC)
  const isBusyTime = (professional, selectedMoment) =>
    isProfessionalBusy(professional, selectedMoment, { timezone: businessTimezone })

  const getTimeList = (curdate, menu) => {
    validateSelectedDate(curdate, menu)
    const dateParts = curdate.split('-')
    const dateSeleted = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
    const times = getTimes(dateSeleted, menu?.schedule, is12Hours, { timezone: businessTimezone })
    return times
  }

  const formatTimeDisplay = (time) => {
    if (!time) return ''
    if (is12Hours) {
      if (time.includes('PM') || time.includes('AM')) {
        const period = time.includes('PM') ? 'PM' : 'AM'
        const timeStr = time.replace(/PM|AM/g, '').trim()
        const [hours, minutes] = timeStr.split(':')
        return {
          hours,
          minutes,
          period
        }
      }
      const [timeStr, period] = time.split(' ')
      const [hours, minutes] = timeStr.split(':')
      return {
        hours,
        minutes,
        period
      }
    }

    const [hours, minutes] = time.split(':')
    return {
      hours,
      minutes,
      period: null
    }
  }

  useEffect(() => {
    if (cateringPreorder) {
      let _timeLists = []
      const schedule = business && getActualSchedule()
      if (!schedule && business) {
        setTimeList([])
        return
      }

      _timeLists = hoursList
        .filter(hour => {
          return (Object.keys(business || {})?.length === 0 || isSlotWithinSchedule(hour, schedule)) &&
            (businessTimezone
              ? parseBusinessDateTime(dateSelected, hour.startTime, businessTimezone).isBefore(parseBusinessDateTime(dateSelected, hour.endTime, businessTimezone))
              : moment(`${dateSelected} ${hour.startTime}`).isBefore(moment(`${dateSelected} ${hour.endTime}`))) &&
            isFutureSlot(hour)
        })
        .map(hour => {
          // the business's wall clock (value, what is sent) shown as that
          // instant in the user's time, with the user's date of it
          const start = businessSlotForUser(dateSelected, hour.startTime, businessTimezone, { is12Hours })
          return {
            value: hour.startTime,
            text: start.text,
            endText: businessSlotForUser(dateSelected, hour.endTime, businessTimezone, { is12Hours }).text,
            userDate: start.date
          }
        })
      if (_timeLists?.length > 0) {
        setTimeList(_timeLists)
      }
    } else {
      const selectedMenu = menu ? (menu?.use_business_schedule ? business : menu) : business
      const _times = getTimeList(dateSelected, selectedMenu)
      setTimeList(_times)
    }
  }, [dateSelected, menu, JSON.stringify(business), cateringPreorder, JSON.stringify(hoursList), dateSelected])

  useEffect(() => {
    if (type === 'business_hours') setMenu(null)
  }, [type])

  useEffect(() => {
    if (pathname.includes('store') || isProfessional || cateringPreorder) return
    handleAsap && handleAsap()
  }, [])

  return (
    <BusinessPreorderContainer
      data-doc-section='business-preorder'
      data-doc-variant={cateringPreorder ? 'catering' : 'standard'}
      data-doc-state={orderState?.loading ? 'loading' : (timeSelected ? 'moment-selected' : (dateSelected ? 'date-ready' : 'initial'))}
    >
      {!isProfessional && <ModalHeading as={Title}>{t('PREORDER', 'Preorder')}</ModalHeading>}
      {!hideBusinessNameLogo && !isProfessional && (
        <LogoWrapper>
          {(business?.logo || businessLogoPlaceholder(theme)) && (
            <BusinessLogo bgimage={optimizeImage(business?.logo || businessLogoPlaceholder(theme), 'h_200,c_limit')} />
          )}
          <p>{business?.name}</p>
        </LogoWrapper>
      )}
      {!isProfessional && isPreOrderSetting && !cateringPreorder && (
        <PreorderTypeWrapper data-doc-section='business-preorder-type'>
          <SelectWrapper>
            <Select
              presentation='mobile-sheet'
              fullWidth
              disabled={orderState?.loading}
              defaultValue={type}
              options={preOrderType}
              placeholder={t('PREORDER_TYPE', 'Preorder type')}
              onChange={(value) => setType(value)}
              keepOpenOnTriggerClick
            />
          </SelectWrapper>
        </PreorderTypeWrapper>
      )}
      {!isProfessional && (type === 'business_menu') && (
        <BusinessMenuList
          businessId={business.id}
          setMenu={setMenu}
        />
      )}
      {(isPreOrderSetting || isProfessional) && (
        <>
          <Divider />
          <OrderTimeWrapper>
            {!isProfessional && (
              // a heading, the section level of a modal (or h3 under the preorder's h2)
              <OrderTimeHeading>{t('ORDER_TIME', 'Order time')}</OrderTimeHeading>
            )}
            <ScheduleBody>
              <PreorderDateTimeSteps
                datesList={datesList}
                dateSelected={dateSelected}
                timeSelected={timeSelected}
                timeList={timeList}
                isEnabled={isEnabled || cateringPreorder}
                handleChangeDate={handleChangeDate}
                handleChangeTime={handleChangeTime}
                configs={configs}
                cateringPreorder={cateringPreorder}
                maxDays={maxDays}
                isProfessional={isProfessional}
                isDisabled={isDisabled}
                formatTimeDisplay={formatTimeDisplay}
                is12Hours={is12Hours}
                hasExistingMoment={!!orderState?.options?.moment}
                scheduleSelected={scheduleSelected}
                business={business}
                getMomentTime={getMomentTime}
                isBusyTime={isBusyTime}
                ClosedBusinessMsg={ClosedBusinessMsg}
              />
            </ScheduleBody>
          </OrderTimeWrapper>
        </>
      )}
      {!isPreOrderSetting && !isProfessional && (
        <ClosedBusinessMsg>{t('ERROR_ADD_PRODUCT_BUSINESS_CLOSED', 'The business is closed at the moment')}</ClosedBusinessMsg>
      )}
      {showButton && dateSelected && timeSelected && (
        <ButtonWrapper>
          <Button
            data-doc-control={buttonText ? 'business-preorder-save' : 'business-preorder-go-to-menu'}
            color='primary'
            size='md'
            fullWidth
            iconEnd={!buttonText ? <Icon name='arrowRight' /> : undefined}
            onClick={goToBusinessPage}
            disabled={isAsap}
          >
            {buttonText || t('GO_TO_MENU', 'Go to menu')}
          </Button>
        </ButtonWrapper>
      )}
      {orderState?.loading && (
        <Layer nobg={!!isProfessional}>
          {(window.location.pathname !== '/search' || orderState?.options?.address?.location) && (
            <SpinnerLoader
              size='md'
              style={{
                top: windowSize.width <= 768 ? '50%' : '40%',
                position: windowSize.width <= 768 ? 'absolute' : 'sticky',
                height: 'auto'
              }}
            />
          )}
        </Layer>
      )}
    </BusinessPreorderContainer>
  )
}

export const BusinessPreorder = (props) => {
  const { maxDays, business } = props
  const [orderState] = useOrder()
  const [{ getMaxPreorderDays }] = useUtils()

  const limitDays = maxDays ?? getMaxPreorderDays(orderState?.options?.type)

  const maxDate = business?.timezone
    ? getPreorderMaxDate(business.timezone, limitDays)
    : (() => {
        const currentDate = new Date()
        const time = limitDays > 1
          ? currentDate.getTime() + ((limitDays - 1) * 24 * 60 * 60 * 1000)
          : limitDays === 1 ? currentDate.getTime() : currentDate.getTime() + (6 * 24 * 60 * 60 * 1000)
        currentDate.setTime(time)
        currentDate.setHours(23)
        currentDate.setMinutes(59)
        return currentDate
      })()

  const businessPreorderProps = {
    ...props,
    UIComponent: BusinessPreorderUI,
    maxDate
  }
  return <MomentOption {...businessPreorderProps} />
}
