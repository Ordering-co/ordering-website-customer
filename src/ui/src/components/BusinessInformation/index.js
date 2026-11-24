import React, { useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import {
  BusinessInformationContainer,
  BusinessContent,
  SectionTitle,
  Map,
  ScheduleSection,
  ScheduleContainer,
  DeliveryInfo,
  BusinessMediaContent,
  Description,
  ImageContainer,
  BusinessTitle,
  BusinessAddress,
  Divider
} from './styles'

import { BusinessInformation as BusinessInformationController } from '~components/components/BusinessInformation'
import { GoogleMaps as GoogleMapsMap } from '~components/components/GoogleMaps'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { getDateTimeFormats } from '~components/utils/configHelpers'

import { AutoScroll } from '~ui/src/components/AutoScroll'
import { formatUrlVideo, generalUtilities, getGoogleMapImage } from '~ui/utils'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { ScheduleAccordion } from '~ui/src/components/ScheduleAccordion'
import { StaticMap } from '~ui/src/components/StaticMap'
import { useGoogleMapsFailed } from '~ui/hooks/useGoogleMapsFailed'

import { Icon } from '~ui/src/design-system/components/Icon'
import { themeColor } from '~/utils/themeColors'
import { themeVisible } from '~/utils/themeVisibility'
import { formatScheduleTime, scheduleTimezoneFormatter, userWeeklySchedule } from '~/utils/businessTime'
import { mapboxStaticUrl } from '~/utils/mapboxStaticMap'
import { ModalHeading } from '~ui/src/components/Overlay/ModalHeading'

export const BusinessInformationUI = (props) => {
  const {
    business,
    businessLocation,
    businessSchedule,
    businessPhotos,
    businessVideos
  } = props

  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const [modalImage, setModalImage] = useState(false)
  const [image, setImage] = useState('')
  const theme = useTheme()

  const { convertHoursToMinutes } = generalUtilities()

  // the parts the theme hides (visibility business.information.*)
  const hidePart = (part) => !themeVisible(theme, `business.information.${part}`)
  const hideLocation = hidePart('location')
  const hideSchedule = hidePart('schedule')
  const hideDescription = hidePart('description')
  const hideAbout = hidePart('about')
  const hideVideos = hidePart('videos')
  const hideDeliveryTime = hidePart('delivery_time')
  const hidePickupTime = hidePart('pickup_time')
  const hideImages = hidePart('images')
  const hideAddress = hidePart('address')
  const formatTime = getDateTimeFormats(configs?.dates_general_format?.value).timeFormat
  const useAlternativeMap = configs?.use_alternative_to_google_maps?.value === '1'
  const googleMapsApiKey = configs?.google_maps_api_key?.value
  const googleMapsFailed = useGoogleMapsFailed(googleMapsApiKey)
  const mapboxToken = configs?.map_box_token?.value
  const googleMapsWorking = !!googleMapsApiKey && !googleMapsFailed
  // Mapbox static map failover, requested in Map's own 13:5 (styles.js)
  const staticMapSources = [mapboxStaticUrl(getGoogleMapImage(businessLocation.location, '', { size: { w: 640, h: 246 } }), mapboxToken)]
  const wrapMap = (map) => (
    <div className='business-location-container'>
      <Map>{map}</Map>
    </div>
  )

  const fillStyle = {
    fillColor: themeColor(theme, 'primary'),
    strokeColor: themeColor(theme, 'primary'),
    fillOpacity: 0.08,
    strokeWeight: 3,
    strokeOpacity: 1,
    editable: false
  }

  // The weekly schedule in the user's week and time: each lapse on its own
  // date of the business (DST included), under the user's weekday it opens
  const userSchedule = useMemo(
    () => userWeeklySchedule(businessSchedule, business?.timezone),
    [JSON.stringify(businessSchedule), business?.timezone]
  )
  const zoneFormatter = useMemo(() => scheduleTimezoneFormatter(business?.timezone), [business?.timezone])
  const shortDays = [
    t('DAYSHORT7', 'Sun'),
    t('DAYSHORT1', 'Mon'),
    t('DAYSHORT2', 'Tue'),
    t('DAYSHORT3', 'Wed'),
    t('DAYSHORT4', 'Thu'),
    t('DAYSHORT5', 'Fri'),
    t('DAYSHORT6', 'Sat')
  ]
  const formatClock = (instant) => formatScheduleTime(instant, formatTime, zoneFormatter)
  // "22:00 - 02:00 (Wed)" when it closes the next day
  const lapseText = (lapse) => `${formatClock(lapse.open)} - ${formatClock(lapse.close)}` +
    (lapse.closeDay !== null && lapse.closeDay !== undefined ? ` (${shortDays[lapse.closeDay]})` : '')

  const handleModalImage = (src) => {
    setImage(src)
    setModalImage(true)
  }

  // a gallery photo is named by its place in the gallery and the business
  const photoAlt = (index) => t('BUSINESS_PHOTO_ALT', 'Photo _number_ of _business_')
    .replace('_number_', index + 1)
    .replace('_business_', business?.name ?? '')
  const enlargedPhotoIndex = businessPhotos?.findIndex(photo => photo.file === image) ?? -1
  const enlargedPhotoAlt = enlargedPhotoIndex >= 0 ? photoAlt(enlargedPhotoIndex) : (business?.name ?? '')

  return (
    <BusinessInformationContainer>
      <BusinessContent>
        <ModalHeading as={BusinessTitle}>{business?.name}</ModalHeading>
        {!hideAbout && business.about && (
          <>
            <Description>{business.about}</Description>
          </>
        )}
        {!hideDescription && business.description && (
          <>
            <Description>{business.description}</Description>
          </>
        )}
        {
          !hideLocation && !useAlternativeMap && (
            <>
              {businessLocation.location && (
                <>
                  {
                    !hideAddress && business?.address && (
                    <BusinessAddress>
                      <Icon name="mapMarker" />
                      {business?.address}
                    </BusinessAddress>
                    )
                  }
                  {businessLocation.location && (googleMapsWorking
                    ? wrapMap(
                      <GoogleMapsMap
                        apiKey={googleMapsApiKey}
                        location={businessLocation.location}
                        mapControls={businessLocation.googleMapsControls || business.googleMapsControls}
                        businessZones={business?.zones}
                        fillStyle={fillStyle}
                      />
                    )
                    // no key, use_alternative_to_google_maps is handled
                    // above (the whole block is skipped), or Google failed:
                    // a still Mapbox shot of the store, or nothing (not even
                    // its box) without a token
                    : (
                      <StaticMap
                        sources={staticMapSources}
                        alt={t('LOCATION_MAP', 'Location map')}
                        loading='lazy'
                        wrap={wrapMap}
                      />
                      ))}
                </>
              )}
              <Divider />
            </>
          )
        }
        {businessSchedule?.length > 0 && (
          <>
            {!hideSchedule && (
              <>
                <SectionTitle>{t('SCHEDULE', 'Schedule')}</SectionTitle>
                <ScheduleSection>
                  <ScheduleContainer>
                    {userSchedule.map((schedule, i) => (
                      <ScheduleAccordion
                        key={i}
                        weekIndex={i}
                        lapseText={lapseText}
                        schedule={schedule}
                      />
                    ))}
                  </ScheduleContainer>
                </ScheduleSection>
                <Divider />
              </>
            )}
            <DeliveryInfo>
              <div>
                {!hideDeliveryTime && (
                  <div>
                    <p>{t('DELIVERY_TIME', 'Delivery Time')}</p>
                    <div><Icon name="clock" /> {convertHoursToMinutes(business?.delivery_time)}</div>
                  </div>
                )}
                {!hidePickupTime && (
                  <div>
                    <p>{t('PICKUP_TIME', 'Pickup Time')}</p>
                    <div><Icon name="clock" /> {convertHoursToMinutes(business?.pickup_time)}</div>
                  </div>
                )}
              </div>
            </DeliveryInfo>
          </>
        )}
        {!hideImages && businessPhotos?.length > 0 && (
          <>
            <Divider />
            <SectionTitle>{t('PHOTOS', 'Photos')}</SectionTitle>
            <BusinessMediaContent>
              <div>
                <AutoScroll scrollId='business-photos'>
                    {
                      businessPhotos.map((photo, i) => (
                        <img
                          key={i}
                          data-doc-control='business-gallery-image'
                          src={photo.file}
                          alt={photoAlt(i)}
                          onClick={() => handleModalImage(photo.file)}
                          loading='lazy'
                        />
                      ))
                    }
                </AutoScroll>
              </div>
            </BusinessMediaContent>
          </>
        )}
        {!hideVideos && businessVideos?.length > 0 && (
          <>
            <Divider />
            <SectionTitle>{t('VIDEOS', 'Videos')}</SectionTitle>
            <BusinessMediaContent>
              <div>
                <AutoScroll scrollId='business-videos'>
                  {businessVideos.map((video, i) => (
                    <iframe
                      key={i}
                      src={formatUrlVideo(video.video)}
                      width='191'
                      height='128'
                      style={{ border: 'none' }}
                      allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope;'
                      allowFullScreen
                      loading='lazy'
                      referrerPolicy='strict-origin-when-cross-origin'
                    />
                  ))}
                </AutoScroll>
              </div>
            </BusinessMediaContent>
          </>
        )}
      </BusinessContent>
      {modalImage && (
        <DialogOverlay
          onClose={() => setModalImage(false)}
          open={!!modalImage}
          data-doc-section='business-gallery-image-dialog'
          flush
          phone='center'
        >
          <ImageContainer>
            <img src={image} alt={enlargedPhotoAlt} loading='lazy' />
          </ImageContainer>
        </DialogOverlay>
      )}
    </BusinessInformationContainer>
  )
}

export const BusinessInformation = (props) => {
  const googleMapsControls = {
    defaultZoom: 12,
    zoomControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    mapTypeId: 'roadmap', // 'roadmap', 'satellite', 'hybrid', 'terrain'
    mapTypeControl: false,
    mapTypeControlOptions: {
      mapTypeIds: ['roadmap', 'satellite']
    }
  }

  const BusinessInformationProps = {
    ...props,
    UIComponent: BusinessInformationUI,
    googleMapsControls
  }
  return <BusinessInformationController {...BusinessInformationProps} />
}
