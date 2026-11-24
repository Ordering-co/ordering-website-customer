import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import moment from 'moment'
import { useTheme } from 'styled-components'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'

import { nanoid } from 'nanoid'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import {
  Container,
  ImageWrapper,
  SwiperWrapper,
  ServiceGalleryArrow,
  HeaderInfoWrapper,
  PriceAndDuration,
  Divider,
  ProfessionalInfoWrapper,
  SectionHeader,
  ScheduleWrapper,
  ButtonWrapper,
  InfoWrapper,
  NameWrapper,
  StatusInfo,
  EmptyProfessional,
  SkeletonBlock,
  OrderTimeWrapper,
  DateWrapper,
  MonthYearLayer,
  DaysSwiper,
  Day,
  DayName,
  DayNumber,
  TimeListWrapper,
  TimeGrid,
  TimeCell,
  TimeAvailability,
  ClosedBusinessMsg,
  GuestUserLink,
  BookingAction
} from './styles'

import { useUtils } from '~components/contexts/UtilsContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useSession } from '~components/contexts/SessionContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useOrder } from '~components/contexts/OrderContext'
import { ProductForm as ProductFormController } from '~components/components/ProductForm'
import { Alert } from '~ui/src/components/Confirm'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { LoginForm } from '~ui/src/components/LoginForm'
import { SignUpForm } from '~ui/src/components/SignUpForm'
import { Chip } from '~ui/src/design-system/components/Chip'
import { Button } from '~ui/src/design-system/components/Button'
import { getTimes } from '~ui/utils'
import { ForgotPasswordForm } from '~ui/src/components/ForgotPasswordForm'
import { useSite } from '~components/contexts/SiteContext'
import { isGuestCheckoutAllowed } from '~/utils/guestCheckout'
import { isGuestStore } from '~/utils/singleStore'
import { isFullWebsite, singleStoreSlug } from '~/utils/siteSettings'
import settings from '../../../../config'

import { RequiredBadge } from '~ui/src/components/ProductOption/styles'
import { galleryArrowOptions } from '~ui/src/components/ProductForm/styles'
import { Avatar } from '~ui/src/design-system/components/Avatar'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Select } from '~ui/src/design-system/components/Select'
import { swiperSpeed } from '~/utils/themeMotion'
import { themeImage } from '~/utils/themeTokens'
import { themeHidden } from '~/utils/themeVisibility'
import { themeSlot } from '~/utils/themeGroups'
import {
  businessCalendarDate,
  isProfessionalBusy,
  professionalTimezone,
  slotUserDate,
  utcInZone,
  utcWallClock,
  zonedDatesFrom,
  zonedSlotInstant
} from '~/utils/businessTime'

const maxDate = 40

const ServiceFormUI = (props) => {
  const {
    productObject,
    professionalSelected,
    handleSave,
    isSoldOut,
    maxProductQuantity,
    productCart,
    isCartProduct,
    professionalListState,
    handleCreateGuestUser,
    actionStatus,
    businessTimezone,
    business,
    businessSlug
  } = props

  const { product, loading, error } = productObject
  const theme = useTheme()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const [orderState] = useOrder()
  const [{ parsePrice, parseDate, is12Hours }] = useUtils()
  const [{ auth }, { login }] = useSession()
  const [{ site }] = useSite()
  // implementation notesOne store, or entered directly on this store, lets a guest
  // check out ignoring the guest checkout settings
  const guestStore = isGuestStore({ singleStore: !!singleStoreSlug(theme, settings), site, fullWebsite: isFullWebsite(theme), slug: business?.slug || businessSlug })
  const [modalPageToShow, setModalPageToShow] = useState('login')
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [currentProfessional, setCurrentProfessional] = useState(null)
  const [timeList, setTimeList] = useState([])
  const busyTimeDescriptionId = useId()
  // the day picked, a date (YYYY-MM-DD) of the professional's zone; its
  // slots are the professional's wall clock, shown in the user's time
  const [selectDate, setSelectedDate] = useState(null)
  const [isEnabled, setIsEnabled] = useState(false)

  const guestCheckoutEnabled = isGuestCheckoutAllowed(configs, orderState?.options?.type, { guestStore })

  const closeModal = () => {
    setModalIsOpen(false)
    setModalPageToShow('login')
  }

  const handleUpdateGuest = () => {
    if (!guestCheckoutEnabled || actionStatus?.loading) return
    handleCreateGuestUser({ guest_token: nanoid() })
  }

  const handleSuccessLogin = (user) => {
    if (user) {
      closeModal()
    }
  }

  const handleCustomModalClick = (e, { page }) => {
    e.preventDefault()
    setModalPageToShow(page)
  }

  const handleSuccessSignup = (user) => {
    login({
      user,
      token: user?.session?.access_token
    })
    closeModal()
  }

  const [gallery, setGallery] = useState([])
  // the photo's arrows are the product gallery's (icon buttons of the theme,
  // product_modal.slots.gallery_arrow, with a name) handed to Swiper as its
  // navigation
  const [galleryEdges, setGalleryEdges] = useState({ beginning: true, end: false })
  const syncGalleryEdges = ({ isBeginning, isEnd }) => {
    setGalleryEdges((previous) => previous.beginning === isBeginning && previous.end === isEnd
      ? previous
      : { beginning: isBeginning, end: isEnd })
  }
  const galleryPrevRef = useRef(null)
  const galleryNextRef = useRef(null)
  const showGalleryArrows = (gallery?.length || 0) > 1
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  // the instant picked (a Date), sent as service_start in UTC
  const [dateSelected, setDateSelected] = useState(null)

  // a professional's schedule is in their zone, else the business's
  const zoneOf = (professional) => professionalTimezone(professional, businessTimezone)
  const timezone = zoneOf(currentProfessional)
  const datesList = useMemo(() => zonedDatesFrom(timezone, { count: maxDate + 1 }), [timezone])
  const selectedDay = selectDate || datesList[0]

  const handleAddProduct = () => {
    if (!currentProfessional?.id) {
      setAlertState({
        open: true,
        content: [t('VALIDATION_ERROR_PROFESSIONAL_REQUIRED', 'The field professional is required')]
      })
      return
    }
    if (!dateSelected) {
      setAlertState({
        open: true,
        content: [t('VALIDATION_ERROR_SCHEDULE_REQUIRED', 'The field schedule is required')]
      })
      return
    }
    const values = {
      // the instant in UTC: api-core reads service_start as UTC
      serviceTime: utcWallClock(dateSelected),
      professional: currentProfessional
    }
    handleSave(values)
  }

  // a slot (the professional's wall clock on the selected day) as an instant
  const getMomentTime = (time) => zonedSlotInstant(selectedDay, time, timezone).toDate()

  const isSelectedTime = (time) => !!dateSelected && getMomentTime(time).getTime() === dateSelected.getTime()

  const handleChangeTime = (time) => {
    if (!time || isSelectedTime(time)) return
    setDateSelected(getMomentTime(time))
  }

  // as api-core checks it: the whole service inside a lapse of the
  // professional's day (their zone) and clear of their busy times
  const isBusyTime = (professional, selectedMoment) => isProfessionalBusy(professional, selectedMoment, {
    timezone: zoneOf(professional),
    duration: product?.duration ?? 0,
    // editing a booked service: its own time is not busy
    ignoreBusy: isCartProduct
      ? (item) => item?.start === productCart?.calendar_event?.start && item?.end === productCart?.calendar_event?.end
      : undefined
  })

  // a slot under a day of the professional that is another day of the
  // user's names the user's day, e.g. "02:00 · Wed 21"
  const slotDayTag = (slot) => {
    const userDate = slotUserDate(slot, selectedDay)
    return userDate ? ` · ${moment(userDate, 'YYYY-MM-DD').format('ddd D')}` : ''
  }

  // "Required" is the badge of the product options' `required` slot
  const requiredLabel = <RequiredBadge as='div' $variant={themeSlot(theme, 'product_option', 'required')?.variant || 'danger'}>{t('REQUIRED', 'Required')}</RequiredBadge>

  const handleChangeProfessional = (id) => {
    const professional = professionalListState?.professionals?.find((item) => item.id === id)
    if (!professional) return
    setCurrentProfessional(professional)
    // the picked instant stays; its day is read in the new professional's zone
    const zone = zoneOf(professional)
    if (dateSelected && zone !== timezone) setSelectedDate(utcInZone(utcWallClock(dateSelected), zone)?.date ?? null)
  }

  const professionalContent = (professional) => {
    const busy = isBusyTime(professional, dateSelected)
    const status = !professional.schedule
      ? t('NOT_AVAILABLE', 'Not available')
      : busy ? t('BUSY_ON_SELECTED_TIME', 'Busy on selected time') : t('AVAILABLE', 'Available')
    return (
      <InfoWrapper>
        <Avatar src={professional.photo} size='md' />
        <NameWrapper>
          <span className='professional-name'>{professional.name} {professional.lastname}</span>
          <StatusInfo available={!busy}><span className='status'>{status}</span></StatusInfo>
        </NameWrapper>
      </InfoWrapper>
    )
  }

  // the day's slots: the professional's schedule on that date of their zone
  const getTimeList = (curdate, menu) => {
    const day = timezone ? businessCalendarDate(curdate, timezone).day() : moment(curdate, 'YYYY-MM-DD').day()
    setIsEnabled(menu?.schedule?.[day]?.enabled || false)
    const [year, month, date] = curdate.split('-').map(Number)
    return getTimes(new Date(year, month - 1, date), menu?.schedule, is12Hours, { timezone })
  }

  const handleChangeDate = (date) => {
    setSelectedDate(date)
    setDateSelected(null)
  }

  useEffect(() => {
    const imageList = []
    // a product without a photo shows the theme's placeholder, unless the
    // theme hides it (visibility product.dummy_image)
    const defaultImage = product?.images || (!themeHidden(theme, 'product.dummy_image') ? themeImage(theme, 'placeholder.product') : null)
    if (defaultImage) imageList.push(defaultImage)
    if (product?.gallery && product?.gallery?.length > 0) {
      for (const galleryItem of product?.gallery) {
        if (galleryItem?.file) {
          imageList.push(galleryItem?.file)
        }
      }
    }
    setGallery(imageList)
  }, [product])

  useEffect(() => {
    if (!professionalSelected?.schedule) return
    setCurrentProfessional(professionalSelected)
  }, [professionalSelected])

  useEffect(() => {
    if (isCartProduct && professionalListState?.professionals?.length > 0) {
      const professional = professionalListState?.professionals?.find(item => item.id === professionalSelected?.id)
      setCurrentProfessional(professional)
    }
  }, [isCartProduct, professionalListState?.professionals])

  useEffect(() => {
    if (!selectedDay || !currentProfessional) return
    const _times = currentProfessional?.schedule ? getTimeList(selectedDay, currentProfessional) : []
    setTimeList(_times)
  }, [selectedDay, currentProfessional, timezone])

  useEffect(() => {
    // a booked service (UTC from the API) opens on its day of the
    // professional's zone, with its time picked
    const start = productCart?.calendar_event?.start
    if (!start) return
    const zone = professionalTimezone(productCart?.calendar_event?.professional, businessTimezone)
    setSelectedDate(utcInZone(start, zone)?.date ?? null)
    setDateSelected(moment.utc(start).toDate())
  }, [productCart])

  return (
    <>
      <Container data-doc-section='appointment-service-form' data-doc-state={loading ? 'loading' : error ? 'error' : product ? 'ready' : 'empty'}>
        {loading && !error && (
          <SkeletonBlock width={90}>
            <Skeleton variant='rect' height={50} />
            <Skeleton variant='rect' height={50} />
            <Skeleton variant='rect' height={200} />
          </SkeletonBlock>
        )}
        {product && !loading && (
          <>
            {gallery?.length > 0 && (
            <ImageWrapper>
              <SwiperWrapper>
                <Swiper
                  // Swiper starts again when the arrows show up
                  // (the gallery loads after the first render)
                  key={showGalleryArrows ? 'gallery-arrows' : 'gallery'}
                  speed={swiperSpeed(theme)}
                  spaceBetween={0}
                  slidesPerView={1}
                  watchSlidesProgress
                  className='mySwiper2'
                  modules={[Navigation]}
                  preventClicksPropagation={false}
                  navigation={showGalleryArrows && { prevEl: galleryPrevRef.current, nextEl: galleryNextRef.current }}
                  onSwiper={syncGalleryEdges}
                  onSlideChange={syncGalleryEdges}
                  onUpdate={syncGalleryEdges}
                  onResize={syncGalleryEdges}
                  onObserverUpdate={syncGalleryEdges}
                  onBeforeInit={(swiper) => {
                    // the arrows exist before Swiper starts: they are its navigation
                    if (showGalleryArrows && typeof swiper.params.navigation === 'object') {
                      swiper.params.navigation.prevEl = galleryPrevRef.current
                      swiper.params.navigation.nextEl = galleryNextRef.current
                    }
                  }}
                >
                  {gallery?.map((photo, i) => (
                    <SwiperSlide key={i}>
                      <img src={photo} alt='' />
                    </SwiperSlide>
                  ))}
                  {showGalleryArrows && (
                    <ServiceGalleryArrow slot='container-end' $side='prev'>
                      <Button ref={galleryPrevRef} disabled={galleryEdges.beginning} {...galleryArrowOptions(theme)} shape='icon' type='button' aria-label={t('PREVIOUS', 'Previous')}>
                        <Icon name={theme.rtl ? 'keyboardArrowRight' : 'keyboardArrowLeft'} aria-hidden='true' />
                      </Button>
                    </ServiceGalleryArrow>
                  )}
                  {showGalleryArrows && (
                    <ServiceGalleryArrow slot='container-end' $side='next'>
                      <Button ref={galleryNextRef} disabled={galleryEdges.end} {...galleryArrowOptions(theme)} shape='icon' type='button' aria-label={t('NEXT', 'Next')}>
                        <Icon name={theme.rtl ? 'keyboardArrowLeft' : 'keyboardArrowRight'} aria-hidden='true' />
                      </Button>
                    </ServiceGalleryArrow>
                  )}
                </Swiper>
              </SwiperWrapper>
            </ImageWrapper>
            )}
            <HeaderInfoWrapper>
              <h2>{product?.name}</h2>
              <PriceAndDuration>
                <span>{parsePrice(product?.price)}</span>
                <span className='dot'>•</span>
                <span>{product?.duration}min</span>
              </PriceAndDuration>
              <p>{product?.description}</p>
            </HeaderInfoWrapper>
            <Divider />
            <ProfessionalInfoWrapper>
              <SectionHeader>
                <h3>{t('PROFESSIONALS', 'Professionals')}</h3>
                {requiredLabel}
              </SectionHeader>
              <Select
                presentation='anchored-professional'
                data-doc-control='appointment-professional-select'
                aria-label={t('SELECT_PROFESSIONAL', 'Select professional')}
                placeholder={t('SELECT_PROFESSIONAL', 'Select professional')}
                value={currentProfessional?.id ?? null}
                valueContent={currentProfessional ? professionalContent(currentProfessional) : undefined}
                options={(professionalListState?.professionals ?? []).map(professional => ({
                  value: professional.id,
                  content: professionalContent(professional)
                }))}
                onChange={handleChangeProfessional}
              />
            </ProfessionalInfoWrapper>
            <ScheduleWrapper>
              <SectionHeader>
                <h3>{t('SCHEDULE', 'Schedule')}</h3>
                {requiredLabel}
              </SectionHeader>
              {currentProfessional?.schedule
                ? (
                <OrderTimeWrapper>
                  <DateWrapper>
                    <MonthYearLayer>
                      <span>{dateSelected && moment(selectedDay, 'YYYY-MM-DD').format('MMMM, yyyy')}</span>
                    </MonthYearLayer>
                    <DaysSwiper left={<Icon name="caretLeftFill" />}>
                      <Swiper
                        speed={swiperSpeed(theme)}
                        spaceBetween={0}
                        navigation
                        modules={[Navigation]}
                        breakpoints={{
                          0: {
                            slidesPerView: 4,
                            spaceBetween: 0
                          },
                          400: {
                            slidesPerView: 5,
                            spaceBetween: 0
                          },
                          550: {
                            slidesPerView: 6,
                            spaceBetween: 0
                          },
                          769: {
                            slidesPerView: 7,
                            spaceBetween: 0
                          }
                        }}
                        freeMode
                        watchSlidesProgress
                        className='swiper-datelist'
                        preventClicksPropagation={false}
                      >
                        {
                          datesList.slice(0, Number(maxDate - 1, 10)).map((date, i) => {
                            const dateParts = date.split('-')
                            const _date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
                            const dayName = t('DAY' + (_date.getDay() >= 1 ? _date.getDay() : 7)).substring(0, 2)
                            const dayNumber = (_date.getDate() < 10 ? '0' : '') + _date.getDate()
                            return (
                              <SwiperSlide key={i}>
                                <Day
                                  selected={selectedDay === date}
                                  onClick={() => handleChangeDate(date)}
                                >
                                  <DayName>{dayName}</DayName>
                                  <DayNumber>{dayNumber}</DayNumber>
                                </Day>
                              </SwiperSlide>
                            )
                          })
                        }
                      </Swiper>
                    </DaysSwiper>
                  </DateWrapper>
                  {isEnabled && timeList?.length > 0
                    ? (
                    <TimeGrid>
                      {timeList.map((time, i) => {
                        const busy = isBusyTime(currentProfessional, getMomentTime(time.value))
                        const descriptionId = busy ? `${busyTimeDescriptionId}-${i}` : undefined
                        return (
                          <TimeCell key={i}>
                            <Chip
                              data-doc-control='appointment-time'
                              size='sm'
                              selected={isSelectedTime(time.value)}
                              aria-describedby={descriptionId}
                              onClick={() => handleChangeTime(time.value)}
                            >
                              {time.text + slotDayTag(time)}
                            </Chip>
                            {busy && <TimeAvailability id={descriptionId}>{t('NOT_AVAILABLE', 'Not available')}</TimeAvailability>}
                          </TimeCell>
                        )
                      })}
                    </TimeGrid>
                      )
                    : (
                    <TimeListWrapper>
                      <ClosedBusinessMsg>
                        {t('PROFESSIONAL_NOT_AVAILABLE', 'Professional is not available at the moment')}
                      </ClosedBusinessMsg>
                    </TimeListWrapper>
                      )}
                </OrderTimeWrapper>
                  )
                : (
                <EmptyProfessional>
                  {t('NO_SCHEDULE', 'No schedule')}
                </EmptyProfessional>
                  )}
            </ScheduleWrapper>
            <ButtonWrapper>
              <span>{dateSelected
                ? parseDate(dateSelected, { outputFormat: 'hh:mm a' })
                : t('ASAP_ABBREVIATION', 'ASAP')}
              </span>
              {!isSoldOut && maxProductQuantity > 0 && auth && (
                <BookingAction>
                  <Button
                    data-doc-control='appointment-book'
                    onClick={() => handleAddProduct()}
                    size='md'
                    fullWidth
                    loading={!!orderState?.loading}
                    disabled={isBusyTime(currentProfessional, dateSelected)}
                  >
                    {t('BOOK', 'Book')}
                  </Button>
                </BookingAction>
              )}
              {!auth && guestCheckoutEnabled && !actionStatus?.loading && (
                <BookingAction>
                  <GuestUserLink fullWidth onClick={handleUpdateGuest}>
                    {t('AS_GUEST_USER', 'As guest user')}
                  </GuestUserLink>
                </BookingAction>
              )}
              {(!auth || isSoldOut || maxProductQuantity <= 0) && (
                <BookingAction $soldout={!(productCart && !isSoldOut && maxProductQuantity > 0)}>
                  <Button
                    appearance='outline'
                    size='md'
                    fullWidth
                    loading={!!actionStatus?.loading}
                    disabled={isSoldOut || maxProductQuantity <= 0}
                    onClick={() => setModalIsOpen(true)}
                  >
                    {isSoldOut || maxProductQuantity <= 0
                      ? t('SOLD_OUT', 'Sold out')
                      : t('LOGIN_SIGNUP', 'Login / Sign Up')}
                  </Button>
                </BookingAction>
              )}
            </ButtonWrapper>
          </>
        )}

        {modalIsOpen && !auth && (
          <DialogOverlay
            open={modalIsOpen}
            onClose={() => closeModal()}
            size='xl'
          >
            {modalPageToShow === 'login' && (
              <LoginForm
                handleSuccessLogin={handleSuccessLogin}
                elementLinkToSignup={
                  <a
                    onClick={
                      (e) => handleCustomModalClick(e, { page: 'signup' })
                    } href='#'
                  >{t('CREATE_ACCOUNT', 'Create account')}
                  </a>
                }
                elementLinkToForgotPassword={
                  <a
                    onClick={
                      (e) => handleCustomModalClick(e, { page: 'forgotpassword' })
                    } href='#'
                  >{t('RESET_PASSWORD', 'Reset password')}
                  </a>
                }
                useLoginByCellphone
                isPopup
              />
            )}
            {modalPageToShow === 'signup' && (
              <SignUpForm
                elementLinkToLogin={
                  <a
                    onClick={
                      (e) => handleCustomModalClick(e, { page: 'login' })
                    } href='#'
                  >{t('LOGIN', 'Login')}
                  </a>
                }
                useLoginByCellphone
                useChekoutFileds
                handleSuccessSignup={handleSuccessSignup}
                isPopup
              />
            )}
            {modalPageToShow === 'forgotpassword' && (
              <ForgotPasswordForm
                elementLinkToLogin={
                  <a
                    onClick={
                      (e) => handleCustomModalClick(e, { page: 'login' })
                    } href='#'
                  >{t('LOGIN', 'Login')}
                  </a>
                }
                isPopup
              />
            )}
          </DialogOverlay>
        )}
      </Container>
      <Alert
        title={t('SEARCH', 'Search')}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => setAlertState({ open: false, content: [] })}
        onAccept={() => setAlertState({ open: false, content: [] })}
        closeOnBackdrop={false}
      />
    </>
  )
}

export const ServiceForm = (props) => {
  const serviceFormProps = {
    ...props,
    UIComponent: ServiceFormUI,
    isService: true
  }
  return <ProductFormController {...serviceFormProps} />
}
